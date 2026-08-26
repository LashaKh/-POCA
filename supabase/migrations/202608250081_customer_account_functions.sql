create or replace function public.initialize_customer_profile(
  p_display_name text default null,
  p_locale public.app_locale default 'en',
  p_currency public.currency_code default 'GEL'
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_record public.profiles;
begin
  if auth.uid() is null or not public.has_auth_assurance('aal1') then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_display_name is not null and char_length(btrim(p_display_name)) not between 1 and 160 then
    raise exception 'INVALID_PROFILE' using errcode = '22023';
  end if;

  insert into public.profiles (id, profile_kind, display_name, locale, display_currency)
  values (auth.uid(), 'customer', nullif(btrim(p_display_name), ''), p_locale, p_currency)
  on conflict (id) do nothing;

  select * into profile_record from public.profiles where id = auth.uid();
  if profile_record.profile_kind <> 'customer' and not public.is_active_staff() then
    raise exception 'PROFILE_KIND_MISMATCH' using errcode = '42501';
  end if;
  if profile_record.profile_kind = 'customer' then
    insert into public.customer_accounts (profile_id, verified_at)
    values (profile_record.id, statement_timestamp())
    on conflict (profile_id) do update set
      verified_at = coalesce(public.customer_accounts.verified_at, excluded.verified_at);
  end if;
  return profile_record;
end;
$$;

create or replace function public.ensure_guest_wishlist(p_secret_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_id uuid;
  v_wishlist_id uuid;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select id into guest_id from public.guest_sessions
  where secret_hash = p_secret_hash and revoked_at is null
    and expires_at > statement_timestamp() for update;
  if guest_id is null then raise exception 'GUEST_CONTEXT_NOT_FOUND' using errcode = '28000'; end if;
  select id into v_wishlist_id from public.wishlists
  where guest_session_id = guest_id and status = 'active' for update;
  if v_wishlist_id is null then
    insert into public.wishlists (guest_session_id) values (guest_id)
    returning id into v_wishlist_id;
  end if;
  return v_wishlist_id;
end;
$$;

create or replace function public.toggle_guest_wishlist_item(
  p_secret_hash text,
  p_product_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wishlist_id uuid;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.products
    where id = p_product_id and status = 'published' and search_visible
  ) then raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0002'; end if;
  v_wishlist_id := public.ensure_guest_wishlist(p_secret_hash);
  delete from public.wishlist_items
  where wishlist_items.wishlist_id = v_wishlist_id
    and product_id = p_product_id;
  if found then return false; end if;
  insert into public.wishlist_items (wishlist_id, product_id)
  values (v_wishlist_id, p_product_id) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.read_guest_wishlist(p_secret_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select jsonb_build_object(
    'id', wishlist.id,
    'productIds', coalesce(jsonb_agg(item.product_id order by item.added_at desc)
      filter (where item.id is not null), '[]'::jsonb)
  ) into result
  from public.guest_sessions guest
  join public.wishlists wishlist on wishlist.guest_session_id = guest.id and wishlist.status = 'active'
  left join public.wishlist_items item on item.wishlist_id = wishlist.id
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp()
  group by wishlist.id;
  return coalesce(result, jsonb_build_object('id', null, 'productIds', '[]'::jsonb));
end;
$$;

create or replace function public.toggle_customer_wishlist_item(p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wishlist_id uuid;
begin
  if auth.uid() is null or not public.has_auth_assurance('aal1')
    or not exists (
      select 1 from public.customer_accounts
      where profile_id = auth.uid() and status in ('active', 'deletion_requested')
    ) then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.products
    where id = p_product_id and status = 'published' and search_visible
  ) then raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0002'; end if;

  select id into v_wishlist_id from public.wishlists
  where customer_profile_id = auth.uid() and status = 'active' for update;
  if v_wishlist_id is null then
    insert into public.wishlists (customer_profile_id) values (auth.uid())
    returning id into v_wishlist_id;
  end if;
  delete from public.wishlist_items
  where wishlist_items.wishlist_id = v_wishlist_id
    and product_id = p_product_id;
  if found then return false; end if;
  insert into public.wishlist_items (wishlist_id, product_id)
  values (v_wishlist_id, p_product_id) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.merge_customer_guest_data(
  p_secret_hash text,
  p_new_secret_hash text,
  p_customer_profile_id uuid,
  p_idempotency_key_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_record public.guest_sessions;
  guest_cart public.carts;
  customer_cart public.carts;
  guest_wishlist public.wishlists;
  customer_wishlist public.wishlists;
  merge_record public.customer_merge_records;
  cart_count integer := 0;
  wishlist_count integer := 0;
  order_count integer := 0;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_secret_hash !~ '^[a-f0-9]{64}$' or p_new_secret_hash !~ '^[a-f0-9]{64}$'
    or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' or p_secret_hash = p_new_secret_hash then
    raise exception 'INVALID_MERGE_IDENTITY' using errcode = '22023';
  end if;
  select * into merge_record from public.customer_merge_records
  where customer_profile_id = p_customer_profile_id
    and idempotency_key_hash = p_idempotency_key_hash;
  if merge_record.id is not null then
    return jsonb_build_object(
      'mergeId', merge_record.id, 'cartItemsMerged', merge_record.cart_items_merged,
      'wishlistItemsMerged', merge_record.wishlist_items_merged,
      'ordersClaimed', merge_record.orders_claimed, 'replayed', true
    );
  end if;
  if not exists (
    select 1 from public.customer_accounts account
    join public.profiles profile on profile.id = account.profile_id
    where account.profile_id = p_customer_profile_id and profile.profile_kind = 'customer'
      and account.status in ('active', 'deletion_requested')
  ) then raise exception 'CUSTOMER_ACCOUNT_UNAVAILABLE' using errcode = '42501'; end if;
  select * into guest_record from public.guest_sessions
  where secret_hash = p_secret_hash and revoked_at is null
    and expires_at > statement_timestamp() for update;
  if guest_record.id is null then raise exception 'GUEST_CONTEXT_NOT_FOUND' using errcode = '28000'; end if;

  select * into guest_cart from public.carts
  where guest_session_id = guest_record.id and status = 'active' for update;
  select * into customer_cart from public.carts
  where customer_profile_id = p_customer_profile_id and status = 'active' for update;
  if customer_cart.id is null then
    insert into public.carts (customer_profile_id, currency, expires_at)
    values (p_customer_profile_id, coalesce(guest_cart.currency, guest_record.currency),
      statement_timestamp() + interval '30 days') returning * into customer_cart;
  end if;
  if guest_cart.id is not null then
    insert into public.cart_items (
      cart_id, product_id, quantity, observed_unit_amount_minor,
      observed_currency, observed_product_version
    )
    select customer_cart.id, item.product_id,
      least(item.quantity, inventory.available_quantity, 20),
      price.amount_minor, customer_cart.currency, product.version
    from public.cart_items item
    join public.products product on product.id = item.product_id and product.status = 'published'
    join public.inventory_items inventory on inventory.product_id = item.product_id
      and inventory.available_quantity > 0
    left join public.product_prices price on price.product_id = item.product_id
      and price.currency = customer_cart.currency and price.enabled
      and price.active_from <= statement_timestamp() and price.active_until > statement_timestamp()
    where item.cart_id = guest_cart.id
    on conflict (cart_id, product_id) do update set
      quantity = least(public.cart_items.quantity + excluded.quantity,
        (select available_quantity from public.inventory_items where product_id = excluded.product_id), 20),
      observed_unit_amount_minor = excluded.observed_unit_amount_minor,
      observed_currency = excluded.observed_currency,
      observed_product_version = excluded.observed_product_version;
    get diagnostics cart_count = row_count;

    insert into public.cart_items (
      cart_id, product_id, quantity, observed_unit_amount_minor,
      observed_currency, observed_product_version
    )
    select guest_cart.id, item.product_id, item.quantity,
      item.observed_unit_amount_minor, item.observed_currency, item.observed_product_version
    from public.cart_items item where item.cart_id = customer_cart.id
    on conflict (cart_id, product_id) do update set
      quantity = excluded.quantity,
      observed_unit_amount_minor = excluded.observed_unit_amount_minor,
      observed_currency = excluded.observed_currency,
      observed_product_version = excluded.observed_product_version;
  end if;

  select * into guest_wishlist from public.wishlists
  where guest_session_id = guest_record.id and status = 'active' for update;
  select * into customer_wishlist from public.wishlists
  where customer_profile_id = p_customer_profile_id and status = 'active' for update;
  if customer_wishlist.id is null then
    insert into public.wishlists (customer_profile_id) values (p_customer_profile_id)
    returning * into customer_wishlist;
  end if;
  if guest_wishlist.id is not null then
    insert into public.wishlist_items (wishlist_id, product_id, added_at)
    select customer_wishlist.id, product_id, added_at
    from public.wishlist_items where wishlist_id = guest_wishlist.id
    on conflict (wishlist_id, product_id) do nothing;
    get diagnostics wishlist_count = row_count;
    update public.wishlists set status = 'merged', merged_into_id = customer_wishlist.id
    where id = guest_wishlist.id;
  end if;

  perform set_config('app.customer_claim', 'allowed', true);
  update public.orders set customer_profile_id = p_customer_profile_id,
    guest_session_id = null, guest_proof_hash = null, guest_proof_expires_at = null
  where guest_session_id = guest_record.id and customer_profile_id is null;
  get diagnostics order_count = row_count;
  update public.discount_redemptions set customer_profile_id = p_customer_profile_id,
    guest_session_id = null
  where guest_session_id = guest_record.id;
  perform set_config('app.customer_claim', '', true);

  update public.guest_sessions set
    previous_secret_hash = secret_hash, secret_hash = p_new_secret_hash,
    customer_profile_id = p_customer_profile_id, rotated_at = statement_timestamp(),
    last_seen_at = statement_timestamp()
  where id = guest_record.id;

  insert into public.customer_merge_records (
    customer_profile_id, guest_session_id, idempotency_key_hash,
    cart_items_merged, wishlist_items_merged, orders_claimed, correlation_id
  ) values (
    p_customer_profile_id, guest_record.id, p_idempotency_key_hash,
    cart_count, wishlist_count, order_count, correlation
  ) returning * into merge_record;
  insert into public.wishlist_merge_events (
    merge_record_id, source_wishlist_id, target_wishlist_id, item_count
  ) values (merge_record.id, guest_wishlist.id, customer_wishlist.id, wishlist_count);
  return jsonb_build_object(
    'mergeId', merge_record.id, 'cartItemsMerged', cart_count,
    'wishlistItemsMerged', wishlist_count, 'ordersClaimed', order_count,
    'replayed', false
  );
end;
$$;

create or replace function public.sync_customer_cart_from_guest(
  p_secret_hash text,
  p_customer_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_cart_id uuid;
  customer_cart_id uuid;
  affected integer;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select cart.id into guest_cart_id from public.carts cart
  join public.guest_sessions guest on guest.id = cart.guest_session_id
  where guest.secret_hash = p_secret_hash and guest.customer_profile_id = p_customer_profile_id
    and guest.revoked_at is null and guest.expires_at > statement_timestamp()
    and cart.status = 'active' for update of cart;
  if guest_cart_id is null then raise exception 'GUEST_CONTEXT_NOT_FOUND' using errcode = '28000'; end if;
  select id into customer_cart_id from public.carts
  where customer_profile_id = p_customer_profile_id and status = 'active' for update;
  if customer_cart_id is null then
    insert into public.carts (customer_profile_id, currency, expires_at)
    select p_customer_profile_id, currency, statement_timestamp() + interval '30 days'
    from public.carts where id = guest_cart_id returning id into customer_cart_id;
  end if;
  delete from public.cart_items where cart_id = customer_cart_id;
  insert into public.cart_items (
    cart_id, product_id, quantity, observed_unit_amount_minor,
    observed_currency, observed_product_version
  ) select customer_cart_id, product_id, quantity, observed_unit_amount_minor,
      observed_currency, observed_product_version
    from public.cart_items where cart_id = guest_cart_id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.claim_guest_order_for_customer(
  p_order_id uuid,
  p_secret_hash text,
  p_customer_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_id uuid;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select id into guest_id from public.guest_sessions
  where secret_hash = p_secret_hash and customer_profile_id = p_customer_profile_id
    and revoked_at is null and expires_at > statement_timestamp();
  if guest_id is null then raise exception 'GUEST_CONTEXT_NOT_FOUND' using errcode = '28000'; end if;
  perform set_config('app.customer_claim', 'allowed', true);
  update public.orders set customer_profile_id = p_customer_profile_id,
    guest_session_id = null, guest_proof_hash = null, guest_proof_expires_at = null
  where id = p_order_id and guest_session_id = guest_id and customer_profile_id is null;
  perform set_config('app.customer_claim', '', true);
  return found;
end;
$$;

create or replace function public.request_customer_privacy(
  p_request_type public.privacy_request_type,
  p_reason text
)
returns public.privacy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.privacy_requests;
  correlation uuid := extensions.gen_random_uuid();
begin
  if auth.uid() is null or not public.has_auth_assurance('aal1')
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_PRIVACY_REQUEST' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.privacy_requests where subject_profile_id = auth.uid()
      and request_type = p_request_type and status in ('requested', 'verified', 'processing')
  ) then raise exception 'PRIVACY_REQUEST_ALREADY_OPEN' using errcode = '23505'; end if;
  insert into public.privacy_requests (
    subject_profile_id, request_type, requested_by, reason, correlation_id
  ) values (auth.uid(), p_request_type, auth.uid(), btrim(p_reason), correlation)
  returning * into request_record;
  if p_request_type = 'deletion' then
    update public.customer_accounts set status = 'deletion_requested',
      deletion_requested_at = statement_timestamp(), version = version + 1
    where profile_id = auth.uid() and status = 'active';
  end if;
  perform app_private.write_audit_event(
    'customer', 'privacy.request', 'profile', auth.uid()::text, 'succeeded',
    'privacy', correlation, jsonb_build_object('requestType', p_request_type)
  );
  return request_record;
end;
$$;

create or replace function public.save_customer_address(
  p_address_id uuid,
  p_label text,
  p_full_name text,
  p_organization text,
  p_line1 text,
  p_line2 text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_country_code text,
  p_phone text,
  p_instructions text,
  p_is_default boolean,
  p_expected_version bigint
)
returns public.customer_addresses
language plpgsql
security definer
set search_path = ''
as $$
declare
  address_record public.customer_addresses;
  make_default boolean;
begin
  if auth.uid() is null or not public.has_auth_assurance('aal1')
    or char_length(btrim(p_label)) not between 1 and 80
    or char_length(btrim(p_full_name)) not between 1 and 160
    or char_length(btrim(p_line1)) not between 1 and 200
    or char_length(btrim(p_city)) not between 1 and 120
    or coalesce(p_country_code, '') !~ '^[A-Z]{2}$' then
    raise exception 'INVALID_ADDRESS' using errcode = '22023';
  end if;
  make_default := p_is_default or not exists (
    select 1 from public.customer_addresses where profile_id = auth.uid()
  );
  if make_default then
    update public.customer_addresses set is_default = false
    where profile_id = auth.uid() and is_default
      and (p_address_id is null or p_address_id = '00000000-0000-0000-0000-000000000000' or id <> p_address_id);
  end if;
  if p_address_id is null or p_address_id = '00000000-0000-0000-0000-000000000000' then
    insert into public.customer_addresses (
      profile_id, label, full_name, organization, line1, line2, city, region,
      postal_code, country_code, phone, instructions, is_default
    ) values (
      auth.uid(), btrim(p_label), btrim(p_full_name), nullif(btrim(p_organization), ''),
      btrim(p_line1), nullif(btrim(p_line2), ''), btrim(p_city), nullif(btrim(p_region), ''),
      nullif(btrim(p_postal_code), ''), p_country_code, nullif(btrim(p_phone), ''),
      nullif(btrim(p_instructions), ''), make_default
    ) returning * into address_record;
  else
    update public.customer_addresses set
      label = btrim(p_label), full_name = btrim(p_full_name),
      organization = nullif(btrim(p_organization), ''), line1 = btrim(p_line1),
      line2 = nullif(btrim(p_line2), ''), city = btrim(p_city),
      region = nullif(btrim(p_region), ''), postal_code = nullif(btrim(p_postal_code), ''),
      country_code = p_country_code, phone = nullif(btrim(p_phone), ''),
      instructions = nullif(btrim(p_instructions), ''), is_default = make_default,
      version = version + 1
    where id = p_address_id and profile_id = auth.uid() and version = p_expected_version
    returning * into address_record;
    if address_record.id is null then raise exception 'ADDRESS_VERSION_CONFLICT' using errcode = '40001'; end if;
  end if;
  return address_record;
end;
$$;

create or replace function public.delete_customer_address(
  p_address_id uuid,
  p_expected_version bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_default boolean;
begin
  if auth.uid() is null or not public.has_auth_assurance('aal1') then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  delete from public.customer_addresses
  where id = p_address_id and profile_id = auth.uid() and version = p_expected_version
  returning is_default into was_default;
  if not found then raise exception 'ADDRESS_VERSION_CONFLICT' using errcode = '40001'; end if;
  if was_default then
    update public.customer_addresses set is_default = true
    where id = (
      select id from public.customer_addresses where profile_id = auth.uid()
      order by created_at, id limit 1
    );
  end if;
  return true;
end;
$$;

create or replace function app_private.protect_order_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.customer_claim', true) = 'allowed'
    and old.guest_session_id is not null and old.customer_profile_id is null
    and new.guest_session_id is null and new.customer_profile_id is not null
    and new.reference = old.reference and new.checkout_session_id = old.checkout_session_id
    and new.payment_method = old.payment_method and new.locale = old.locale
    and new.currency = old.currency and new.contact_email = old.contact_email
    and new.contact_phone is not distinct from old.contact_phone
    and new.subtotal_minor = old.subtotal_minor and new.discount_minor = old.discount_minor
    and new.tax_minor = old.tax_minor and new.delivery_minor = old.delivery_minor
    and new.total_minor = old.total_minor and new.pricing_version = old.pricing_version
    and new.terms_version = old.terms_version and new.accepted_at = old.accepted_at then
    return new;
  end if;
  if new.reference <> old.reference
    or new.guest_session_id is distinct from old.guest_session_id
    or new.customer_profile_id is distinct from old.customer_profile_id
    or new.checkout_session_id <> old.checkout_session_id
    or new.payment_method <> old.payment_method
    or new.locale <> old.locale or new.currency <> old.currency
    or new.contact_email <> old.contact_email or new.contact_phone is distinct from old.contact_phone
    or new.subtotal_minor <> old.subtotal_minor or new.discount_minor <> old.discount_minor
    or new.tax_minor <> old.tax_minor or new.delivery_minor <> old.delivery_minor
    or new.total_minor <> old.total_minor or new.pricing_version <> old.pricing_version
    or new.terms_version <> old.terms_version or new.accepted_at <> old.accepted_at then
    raise exception 'IMMUTABLE_ORDER_SNAPSHOT' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function public.initialize_customer_profile(text, public.app_locale, public.currency_code) from public, anon;
revoke all on function public.ensure_guest_wishlist(text) from public, anon, authenticated;
revoke all on function public.toggle_guest_wishlist_item(text, uuid) from public, anon, authenticated;
revoke all on function public.read_guest_wishlist(text) from public, anon, authenticated;
revoke all on function public.toggle_customer_wishlist_item(uuid) from public, anon;
revoke all on function public.merge_customer_guest_data(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.sync_customer_cart_from_guest(text, uuid) from public, anon, authenticated;
revoke all on function public.claim_guest_order_for_customer(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.request_customer_privacy(public.privacy_request_type, text) from public, anon;
revoke all on function public.save_customer_address(uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, bigint) from public, anon;
revoke all on function public.delete_customer_address(uuid, bigint) from public, anon;
grant execute on function public.initialize_customer_profile(text, public.app_locale, public.currency_code) to authenticated, service_role;
grant execute on function public.toggle_customer_wishlist_item(uuid) to authenticated, service_role;
grant execute on function public.request_customer_privacy(public.privacy_request_type, text) to authenticated, service_role;
grant execute on function public.save_customer_address(uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, bigint) to authenticated, service_role;
grant execute on function public.delete_customer_address(uuid, bigint) to authenticated, service_role;
grant execute on function public.ensure_guest_wishlist(text) to service_role;
grant execute on function public.toggle_guest_wishlist_item(text, uuid) to service_role;
grant execute on function public.read_guest_wishlist(text) to service_role;
grant execute on function public.merge_customer_guest_data(text, text, uuid, text) to service_role;
grant execute on function public.sync_customer_cart_from_guest(text, uuid) to service_role;
grant execute on function public.claim_guest_order_for_customer(uuid, text, uuid) to service_role;
