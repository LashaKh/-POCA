create or replace function public.quote_guest_cart(
  p_secret_hash text,
  p_country_code text,
  p_method_code text default null
)
returns public.delivery_quotes
language plpgsql
security definer
set search_path = ''
as $$
declare
  cart_record public.carts;
  guest_record public.guest_sessions;
  discount_record public.discounts;
  method_record public.shipping_methods;
  rate_record public.shipping_rate_rules;
  tax_record public.tax_rules;
  quote_record public.delivery_quotes;
  subtotal bigint;
  eligible_subtotal bigint;
  discount_amount bigint := 0;
  taxable_amount bigint;
  tax_amount bigint := 0;
  included_tax_amount bigint := 0;
  delivery_amount bigint := 0;
  changed boolean := false;
  lines jsonb;
  selected_method_id uuid;
  selected_rate_id uuid;
  pricing_version text;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_country_code !~ '^[A-Z]{2}$' then raise exception 'INVALID_COUNTRY' using errcode = '22023'; end if;

  select cart.* into cart_record
  from public.carts cart
  join public.guest_sessions guest on guest.id = cart.guest_session_id
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp() and cart.status = 'active'
  for update of cart;
  if cart_record.id is null then raise exception 'CART_NOT_FOUND' using errcode = 'P0002'; end if;
  select guest.* into guest_record from public.guest_sessions guest where guest.id = cart_record.guest_session_id;

  select
    coalesce(sum(price.amount_minor * item.quantity), 0),
    coalesce(bool_or(
      product.status <> 'published' or not product.search_visible
      or inventory.available_quantity < item.quantity
      or item.observed_unit_amount_minor is distinct from price.amount_minor
      or item.observed_currency is distinct from cart_record.currency
      or item.observed_product_version is distinct from product.version
    ), false),
    coalesce(jsonb_agg(jsonb_build_object(
      'cartItemId', item.id,
      'productId', product.id,
      'sku', product.sku::text,
      'slug', translation.slug,
      'name', translation.name,
      'quantity', item.quantity,
      'unitAmountMinor', price.amount_minor,
      'previousUnitAmountMinor', item.observed_unit_amount_minor,
      'availableQuantity', inventory.available_quantity,
      'deliveryClass', product.delivery_class,
      'widthMm', product.width_mm,
      'lengthMm', product.length_mm,
      'materials', product.materials,
      'colors', product.colors
    ) order by item.created_at), '[]'::jsonb)
  into subtotal, changed, lines
  from public.cart_items item
  join public.products product on product.id = item.product_id
  join public.product_prices price on price.product_id = product.id
    and price.currency = cart_record.currency and price.enabled
    and price.active_from <= statement_timestamp() and price.active_until > statement_timestamp()
  join public.inventory_items inventory on inventory.product_id = product.id
  join lateral (
    select translated.* from public.product_translations translated
    where translated.product_id = product.id and translated.status = 'published'
    order by case when translated.locale = guest_record.locale then 0
      when translated.locale = 'en' then 1 when translated.locale = 'ka' then 2 else 3 end,
      translated.locale limit 1
  ) translation on true
  where item.cart_id = cart_record.id;

  if jsonb_array_length(lines) = 0 then raise exception 'EMPTY_CART' using errcode = 'P0001'; end if;
  if jsonb_array_length(lines) <> (select count(*) from public.cart_items item where item.cart_id = cart_record.id) then
    raise exception 'CART_ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.cart_items item
    join public.products product on product.id = item.product_id
    join public.inventory_items inventory on inventory.product_id = product.id
    where item.cart_id = cart_record.id
      and (product.status <> 'published' or not product.search_visible or inventory.available_quantity < item.quantity)
  ) then raise exception 'CART_ITEM_UNAVAILABLE' using errcode = 'P0001'; end if;

  if cart_record.discount_code is not null then
    select * into discount_record from public.discounts discount
    where discount.code = cart_record.discount_code and discount.enabled
      and discount.starts_at <= statement_timestamp() and discount.ends_at > statement_timestamp()
      and (discount.usage_limit is null or discount.used_count < discount.usage_limit)
      and (discount.currency is null or discount.currency = cart_record.currency);
    if discount_record.id is null then raise exception 'DISCOUNT_UNAVAILABLE' using errcode = 'P0001'; end if;
    if subtotal < discount_record.minimum_subtotal_minor then raise exception 'DISCOUNT_MINIMUM_NOT_MET' using errcode = 'P0001'; end if;
    select case when exists (select 1 from public.discount_scopes scope where scope.discount_id = discount_record.id)
      then coalesce(sum(price.amount_minor * item.quantity) filter (where exists (
        select 1 from public.discount_scopes scope
        where scope.discount_id = discount_record.id
          and (scope.product_id = item.product_id or exists (
            select 1 from public.collection_products cp
            where cp.collection_id = scope.collection_id and cp.product_id = item.product_id
              and cp.active_from <= statement_timestamp() and cp.active_until > statement_timestamp()
          ))
      )), 0)
      else subtotal end into eligible_subtotal
    from public.cart_items item
    join public.product_prices price on price.product_id = item.product_id
      and price.currency = cart_record.currency and price.enabled
      and price.active_from <= statement_timestamp() and price.active_until > statement_timestamp()
    where item.cart_id = cart_record.id;
    if eligible_subtotal = 0 then raise exception 'DISCOUNT_NOT_APPLICABLE' using errcode = 'P0001'; end if;
    if discount_record.kind = 'percentage' then
      discount_amount := (eligible_subtotal * discount_record.percentage_basis_points + 5000) / 10000;
    else
      discount_amount := least(eligible_subtotal, discount_record.fixed_amount_minor);
    end if;
  end if;

  taxable_amount := subtotal - discount_amount;
  select * into tax_record from public.tax_rules tax
  where tax.country_code = p_country_code and tax.currency = cart_record.currency and tax.enabled
    and tax.starts_at <= statement_timestamp() and tax.ends_at > statement_timestamp()
  order by tax.priority desc limit 1;
  if tax_record.id is not null then
    if tax_record.prices_include_tax then
      included_tax_amount := (taxable_amount * tax_record.rate_basis_points + 5000) / (10000 + tax_record.rate_basis_points);
    else
      tax_amount := (taxable_amount * tax_record.rate_basis_points + 5000) / 10000;
    end if;
  end if;

  select method.id, rate.id into selected_method_id, selected_rate_id
  from public.shipping_zone_countries country
  join public.shipping_zones zone on zone.id = country.zone_id and zone.enabled
  join public.shipping_rate_rules rate on rate.zone_id = zone.id and rate.enabled
    and rate.currency = cart_record.currency
    and rate.starts_at <= statement_timestamp() and rate.ends_at > statement_timestamp()
    and taxable_amount >= rate.minimum_subtotal_minor
    and (rate.maximum_subtotal_minor is null or taxable_amount <= rate.maximum_subtotal_minor)
  join public.shipping_methods method on method.id = rate.method_id and method.enabled
  where country.country_code = p_country_code
    and (p_method_code is null or method.code = p_method_code)
    and (
      cardinality(rate.delivery_classes) = 0
      or not exists (
        select 1 from jsonb_array_elements(lines) line
        where not ((line ->> 'deliveryClass') = any(rate.delivery_classes))
      )
    )
  order by zone.priority desc, rate.priority desc, method.code
  limit 1;
  select method.* into method_record from public.shipping_methods method where method.id = selected_method_id;
  select rate.* into rate_record from public.shipping_rate_rules rate where rate.id = selected_rate_id;
  if method_record.id is null then raise exception 'DELIVERY_QUOTE_REQUIRED' using errcode = 'P0001'; end if;
  pricing_version := 'checkout-v1:' || substr(encode(extensions.digest(concat_ws(':',
    method_record.id::text, method_record.version::text,
    rate_record.id::text, rate_record.version::text,
    coalesce(tax_record.id::text, 'no-tax'), coalesce(tax_record.version::text, '0'),
    coalesce(discount_record.id::text, 'no-discount'), coalesce(discount_record.version::text, '0')
  )::bytea, 'sha256'), 'hex'), 1, 48);
  delivery_amount := case
    when method_record.manual_quote then 0
    when rate_record.free_threshold_minor is not null and taxable_amount >= rate_record.free_threshold_minor then 0
    else rate_record.amount_minor end;

  insert into public.delivery_quotes (
    cart_id, cart_version, country_code, method_id, currency, subtotal_minor,
    discount_minor, tax_minor, delivery_minor, total_minor, manual_quote,
    pricing_version, breakdown, expires_at
  ) values (
    cart_record.id, cart_record.version + 1, p_country_code, method_record.id, cart_record.currency, subtotal,
    discount_amount, tax_amount, delivery_amount, subtotal - discount_amount + tax_amount + delivery_amount,
    method_record.manual_quote, pricing_version, jsonb_build_object(
      'lines', lines,
      'changed', changed,
      'includedTaxMinor', included_tax_amount,
      'taxRateBasisPoints', coalesce(tax_record.rate_basis_points, 0),
      'taxIncluded', coalesce(tax_record.prices_include_tax, false),
      'discountCode', cart_record.discount_code,
      'deliveryMethodCode', method_record.code,
      'deliveryMethodName', method_record.name_i18n,
      'estimateMinDays', method_record.estimate_min_days,
      'estimateMaxDays', method_record.estimate_max_days,
      'customsResponsibility', 'buyer-unless-confirmed-otherwise'
    ), statement_timestamp() + interval '15 minutes'
  ) returning * into quote_record;

  update public.cart_items item set
    observed_unit_amount_minor = price.amount_minor,
    observed_currency = cart_record.currency,
    observed_product_version = product.version
  from public.products product, public.product_prices price
  where item.cart_id = cart_record.id and product.id = item.product_id
    and price.product_id = product.id and price.currency = cart_record.currency and price.enabled
    and price.active_from <= statement_timestamp() and price.active_until > statement_timestamp();
  update public.carts set reconciled_at = statement_timestamp() where id = cart_record.id;
  return quote_record;
end;
$$;

revoke all on function public.quote_guest_cart(text, text, text) from public, anon, authenticated;
grant execute on function public.quote_guest_cart(text, text, text) to service_role;
