create or replace function public.create_guest_context(
  p_secret_hash text,
  p_locale public.app_locale,
  p_currency public.currency_code,
  p_ttl interval default interval '30 days'
)
returns table (guest_session_id uuid, cart_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_guest public.guest_sessions;
  created_cart public.carts;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_secret_hash !~ '^[a-f0-9]{64}$'
    or p_ttl < interval '1 hour'
    or p_ttl > interval '90 days' then
    raise exception 'INVALID_GUEST_CONTEXT' using errcode = '22023';
  end if;

  select * into created_guest
  from public.guest_sessions guest
  where guest.secret_hash = p_secret_hash
  for update;

  if created_guest.id is not null then
    if created_guest.revoked_at is not null or created_guest.expires_at <= statement_timestamp() then
      raise exception 'GUEST_CONTEXT_EXPIRED' using errcode = '28000';
    end if;
    update public.guest_sessions
    set last_seen_at = statement_timestamp(), locale = p_locale, currency = p_currency
    where id = created_guest.id
    returning * into created_guest;
    select * into created_cart
    from public.carts cart
    where cart.guest_session_id = created_guest.id and cart.status = 'active';
    if created_cart.id is null then
      insert into public.carts (guest_session_id, currency, expires_at)
      values (created_guest.id, p_currency, created_guest.expires_at)
      returning * into created_cart;
    end if;
  else
    insert into public.guest_sessions (secret_hash, locale, currency, expires_at)
    values (p_secret_hash, p_locale, p_currency, statement_timestamp() + p_ttl)
    returning * into created_guest;
    insert into public.carts (guest_session_id, currency, expires_at)
    values (created_guest.id, p_currency, created_guest.expires_at)
    returning * into created_cart;
  end if;

  return query select created_guest.id, created_cart.id, created_guest.expires_at;
end;
$$;

create or replace function public.rotate_guest_context(
  p_current_secret_hash text,
  p_new_secret_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_id uuid;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_current_secret_hash !~ '^[a-f0-9]{64}$'
    or p_new_secret_hash !~ '^[a-f0-9]{64}$'
    or p_current_secret_hash = p_new_secret_hash then
    raise exception 'INVALID_GUEST_ROTATION' using errcode = '22023';
  end if;

  update public.guest_sessions
  set previous_secret_hash = secret_hash,
      secret_hash = p_new_secret_hash,
      rotated_at = statement_timestamp(),
      last_seen_at = statement_timestamp()
  where secret_hash = p_current_secret_hash
    and revoked_at is null
    and expires_at > statement_timestamp()
  returning id into guest_id;

  if guest_id is null then
    raise exception 'GUEST_CONTEXT_NOT_FOUND' using errcode = '28000';
  end if;
  return guest_id;
end;
$$;

create or replace function public.read_guest_cart(p_secret_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cart_record public.carts;
  result jsonb;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select cart.* into cart_record
  from public.carts cart
  join public.guest_sessions guest on guest.id = cart.guest_session_id
  where guest.secret_hash = p_secret_hash
    and guest.revoked_at is null
    and guest.expires_at > statement_timestamp()
    and cart.status = 'active';

  if cart_record.id is null then
    raise exception 'CART_NOT_FOUND' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'id', cart_record.id,
    'currency', cart_record.currency,
    'discountCode', cart_record.discount_code,
    'version', cart_record.version,
    'expiresAt', cart_record.expires_at,
    'items', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', item.id,
        'productId', item.product_id,
        'quantity', item.quantity,
        'sku', product.sku::text,
        'slug', translation.slug,
        'name', translation.name,
        'locale', translation.locale,
        'unitAmountMinor', price.amount_minor,
        'observedUnitAmountMinor', item.observed_unit_amount_minor,
        'availableQuantity', inventory.available_quantity,
        'productStatus', product.status,
        'productVersion', product.version
      ) order by item.created_at, item.id
    ) filter (where item.id is not null), '[]'::jsonb)
  ) into result
  from (select 1) anchor
  left join public.cart_items item on item.cart_id = cart_record.id
  left join public.products product on product.id = item.product_id
  left join lateral (
    select translated.*
    from public.product_translations translated
    where translated.product_id = product.id
      and translated.status = 'published'
    order by
      case when translated.locale = (select locale from public.guest_sessions where id = cart_record.guest_session_id) then 0
        when translated.locale = 'en' then 1 when translated.locale = 'ka' then 2 else 3 end,
      translated.locale
    limit 1
  ) translation on true
  left join public.product_prices price on price.product_id = product.id
    and price.currency = cart_record.currency and price.enabled
    and price.active_from <= statement_timestamp() and price.active_until > statement_timestamp()
  left join public.inventory_items inventory on inventory.product_id = product.id;

  return result;
end;
$$;

create or replace function public.add_guest_cart_item(
  p_secret_hash text,
  p_product_id uuid,
  p_quantity integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cart_record public.carts;
  product_record public.products;
  price_record public.product_prices;
  available integer;
  current_quantity integer;
  item_id uuid;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_quantity not between 1 and 20 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;

  select cart.* into cart_record
  from public.carts cart
  join public.guest_sessions guest on guest.id = cart.guest_session_id
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp() and cart.status = 'active'
  for update of cart;
  if cart_record.id is null then raise exception 'CART_NOT_FOUND' using errcode = 'P0002'; end if;

  select * into product_record from public.products
  where id = p_product_id and status = 'published' and search_visible;
  if product_record.id is null then raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0002'; end if;
  select * into price_record from public.product_prices
  where product_id = p_product_id and currency = cart_record.currency and enabled
    and active_from <= statement_timestamp() and active_until > statement_timestamp();
  if price_record.id is null then raise exception 'PRICE_UNAVAILABLE' using errcode = 'P0002'; end if;
  select available_quantity into available from public.inventory_items where product_id = p_product_id;
  select quantity into current_quantity from public.cart_items
  where cart_id = cart_record.id and product_id = p_product_id;
  current_quantity := coalesce(current_quantity, 0) + p_quantity;
  if current_quantity > coalesce(available, 0) then raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001'; end if;

  insert into public.cart_items (
    cart_id, product_id, quantity, observed_unit_amount_minor, observed_currency, observed_product_version
  ) values (
    cart_record.id, p_product_id, current_quantity, price_record.amount_minor, cart_record.currency, product_record.version
  )
  on conflict (cart_id, product_id) do update
  set quantity = excluded.quantity,
      observed_unit_amount_minor = excluded.observed_unit_amount_minor,
      observed_currency = excluded.observed_currency,
      observed_product_version = excluded.observed_product_version
  returning id into item_id;
  return item_id;
end;
$$;

create or replace function public.set_guest_cart_item_quantity(
  p_secret_hash text,
  p_item_id uuid,
  p_quantity integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_cart_id uuid;
  owned_product_id uuid;
  available integer;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_quantity not between 0 and 20 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
  select cart.id, item.product_id into owned_cart_id, owned_product_id
  from public.carts cart
  join public.guest_sessions guest on guest.id = cart.guest_session_id
  join public.cart_items item on item.cart_id = cart.id and item.id = p_item_id
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp() and cart.status = 'active'
  for update of cart, item;
  if owned_cart_id is null then raise exception 'CART_ITEM_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_quantity = 0 then delete from public.cart_items where id = p_item_id; return true; end if;
  select available_quantity into available from public.inventory_items where inventory_items.product_id = owned_product_id;
  if p_quantity > coalesce(available, 0) then raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001'; end if;
  update public.cart_items set quantity = p_quantity where id = p_item_id;
  return true;
end;
$$;

create or replace function public.apply_guest_cart_discount(
  p_secret_hash text,
  p_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  cart_record public.carts;
  discount_record public.discounts;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select cart.* into cart_record from public.carts cart
  join public.guest_sessions guest on guest.id = cart.guest_session_id
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp() and cart.status = 'active'
  for update of cart;
  if cart_record.id is null then raise exception 'CART_NOT_FOUND' using errcode = 'P0002'; end if;
  if nullif(trim(p_code), '') is null then
    update public.carts set discount_code = null where id = cart_record.id;
    return true;
  end if;
  select * into discount_record from public.discounts
  where code = trim(p_code) and enabled and starts_at <= statement_timestamp() and ends_at > statement_timestamp();
  if discount_record.id is null
    or (discount_record.currency is not null and discount_record.currency <> cart_record.currency)
    or (discount_record.usage_limit is not null and discount_record.used_count >= discount_record.usage_limit) then
    raise exception 'DISCOUNT_UNAVAILABLE' using errcode = 'P0001';
  end if;
  update public.carts set discount_code = discount_record.code where id = cart_record.id;
  return true;
end;
$$;

create or replace function public.verify_guest_order_proof(
  p_reference text,
  p_proof_hash text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_service_context() and exists (
    select 1 from public.orders order_record
    where order_record.reference = p_reference
      and order_record.guest_proof_hash = p_proof_hash
      and order_record.guest_proof_expires_at > statement_timestamp()
  );
$$;

revoke all on function public.create_guest_context(text, public.app_locale, public.currency_code, interval) from public, anon, authenticated;
revoke all on function public.rotate_guest_context(text, text) from public, anon, authenticated;
revoke all on function public.read_guest_cart(text) from public, anon, authenticated;
revoke all on function public.add_guest_cart_item(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.set_guest_cart_item_quantity(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.apply_guest_cart_discount(text, text) from public, anon, authenticated;
revoke all on function public.verify_guest_order_proof(text, text) from public, anon, authenticated;
grant execute on function public.create_guest_context(text, public.app_locale, public.currency_code, interval) to service_role;
grant execute on function public.rotate_guest_context(text, text) to service_role;
grant execute on function public.read_guest_cart(text) to service_role;
grant execute on function public.add_guest_cart_item(text, uuid, integer) to service_role;
grant execute on function public.set_guest_cart_item_quantity(text, uuid, integer) to service_role;
grant execute on function public.apply_guest_cart_discount(text, text) to service_role;
grant execute on function public.verify_guest_order_proof(text, text) to service_role;
