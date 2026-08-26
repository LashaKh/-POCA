create or replace function app_private.worldwide_actor_class()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'service'
    else coalesce(
      (select staff.role::text from public.staff_members staff
       where staff.profile_id = auth.uid() and staff.active),
      (select case when profile.profile_kind = 'customer' then 'customer' else 'service' end
       from public.profiles profile where profile.id = auth.uid()),
      'service'
    )
  end;
$$;

create or replace function app_private.record_commerce_revision(
  p_area text,
  p_subject_key text,
  p_version bigint,
  p_snapshot jsonb,
  p_reason text,
  p_correlation_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision_id bigint;
begin
  perform app_private.assert_manager();
  if auth.uid() is null
    or p_area not in ('currency', 'price', 'promotion', 'delivery', 'market')
    or char_length(btrim(p_subject_key)) not between 1 and 200
    or p_version < 1
    or jsonb_typeof(p_snapshot) <> 'object'
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_COMMERCE_REVISION' using errcode = '22023';
  end if;
  insert into public.commerce_configuration_revisions (
    area, subject_key, version, snapshot, changed_by, reason, correlation_id
  ) values (
    p_area, btrim(p_subject_key), p_version, p_snapshot, auth.uid(), btrim(p_reason), p_correlation_id
  ) returning id into revision_id;
  return revision_id;
end;
$$;

create or replace function public.configure_currency_setting(
  p_currency public.currency_code,
  p_enabled boolean,
  p_checkout_enabled boolean,
  p_is_default boolean,
  p_display_order integer,
  p_price_source_mode public.price_source_mode,
  p_approved_rate_reference text,
  p_configuration_status text,
  p_expected_version bigint,
  p_reason text
)
returns public.currency_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.currency_settings;
  next_record public.currency_settings;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_checkout_enabled and not p_enabled
    or p_is_default and not p_enabled
    or p_display_order not between 0 and 1000
    or p_configuration_status not in ('draft', 'published', 'disabled')
    or (p_price_source_mode = 'approved_rate_snapshot'
      and char_length(btrim(coalesce(p_approved_rate_reference, ''))) not between 2 and 200)
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_CURRENCY_CONFIGURATION' using errcode = '22023';
  end if;
  select * into current_record from public.currency_settings
  where currency = p_currency for update;
  if not found then raise exception 'CURRENCY_NOT_FOUND' using errcode = 'P0002'; end if;
  if current_record.version <> p_expected_version then
    raise exception 'CURRENCY_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if p_is_default then
    update public.currency_settings
    set is_default = false, version = version + 1
    where is_default and currency <> p_currency;
  end if;
  update public.currency_settings set
    enabled = p_enabled,
    checkout_enabled = p_checkout_enabled,
    is_default = p_is_default,
    display_order = p_display_order,
    price_source_mode = p_price_source_mode,
    approved_rate_reference = nullif(btrim(p_approved_rate_reference), ''),
    configuration_status = p_configuration_status,
    version = version + 1
  where currency = p_currency returning * into next_record;
  perform app_private.record_commerce_revision(
    'currency', p_currency::text, next_record.version, to_jsonb(next_record), p_reason, correlation
  );
  perform app_private.write_audit_event(
    app_private.worldwide_actor_class(), 'commerce.currency.configure', 'currency_setting',
    p_currency::text, 'succeeded', 'worldwide-selling', correlation,
    jsonb_build_object('version', next_record.version, 'status', next_record.configuration_status)
  );
  return next_record;
end;
$$;

create or replace function public.resolve_product_price(
  p_product_id uuid,
  p_currency public.currency_code,
  p_market_code text default null
)
returns public.product_prices
language sql
stable
security definer
set search_path = ''
as $$
  select price.*
  from public.product_prices price
  join public.currency_settings currency_setting
    on currency_setting.currency = price.currency
   and currency_setting.enabled
   and currency_setting.configuration_status = 'published'
  where price.product_id = p_product_id
    and price.currency = p_currency
    and price.enabled
    and price.active_from <= statement_timestamp()
    and price.active_until > statement_timestamp()
    and (price.market_code is null or price.market_code = p_market_code)
    and (
      price.source = 'explicit'
      or (
        price.source = 'approved_rate_snapshot'
        and currency_setting.price_source_mode = 'approved_rate_snapshot'
        and price.source_reference is not null
      )
    )
  order by case when price.market_code = p_market_code then 0 else 1 end,
    price.active_from desc, price.id
  limit 1;
$$;

create or replace function public.save_product_market_price(
  p_product_id uuid,
  p_currency public.currency_code,
  p_market_code text default null,
  p_amount_minor bigint default null,
  p_active_from timestamptz default null,
  p_active_until timestamptz default null,
  p_enabled boolean default false,
  p_source text default null,
  p_source_reference text default null,
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.product_prices
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.product_prices;
  next_record public.product_prices;
  subject_key text;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_amount_minor < 0 or p_active_until <= p_active_from
    or (p_market_code is not null and p_market_code !~ '^[A-Z0-9-]{2,20}$')
    or p_source not in ('explicit', 'approved_rate_snapshot')
    or (p_source = 'approved_rate_snapshot'
      and char_length(btrim(coalesce(p_source_reference, ''))) not between 2 and 200)
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_MARKET_PRICE' using errcode = '22023';
  end if;
  if p_source = 'approved_rate_snapshot' and not exists (
    select 1 from public.currency_settings setting
    where setting.currency = p_currency
      and setting.price_source_mode = 'approved_rate_snapshot'
      and setting.approved_rate_reference is not null
  ) then raise exception 'UNAPPROVED_PRICE_SOURCE' using errcode = '42501'; end if;
  select * into current_record from public.product_prices price
  where price.product_id = p_product_id and price.currency = p_currency
    and price.market_code is not distinct from p_market_code
  order by price.updated_at desc limit 1 for update;
  if current_record.id is not null and current_record.version <> p_expected_version then
    raise exception 'PRICE_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if current_record.id is null and p_expected_version <> 0 then
    raise exception 'PRICE_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if p_enabled then
    update public.product_prices set enabled = false, version = version + 1
    where product_id = p_product_id and currency = p_currency
      and id is distinct from current_record.id and enabled;
  end if;
  if current_record.id is null then
    insert into public.product_prices (
      product_id, currency, market_code, amount_minor, active_from, active_until,
      enabled, source, source_reference
    ) values (
      p_product_id, p_currency, p_market_code, p_amount_minor, p_active_from, p_active_until,
      p_enabled, p_source, nullif(btrim(p_source_reference), '')
    ) returning * into next_record;
  else
    update public.product_prices set
      amount_minor = p_amount_minor, active_from = p_active_from, active_until = p_active_until,
      enabled = p_enabled, source = p_source,
      source_reference = nullif(btrim(p_source_reference), ''), version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  subject_key := p_product_id::text || ':' || p_currency::text || ':' || coalesce(p_market_code, 'global');
  perform app_private.record_commerce_revision(
    'price', subject_key, next_record.version, to_jsonb(next_record), p_reason, correlation
  );
  perform app_private.write_audit_event(
    app_private.worldwide_actor_class(), 'commerce.price.configure', 'product_price',
    next_record.id::text, 'succeeded', 'worldwide-selling', correlation,
    jsonb_build_object('version', next_record.version, 'currency', p_currency::text)
  );
  return next_record;
end;
$$;

create or replace function public.configure_promotion(
  p_discount_id uuid default null,
  p_code text default null,
  p_kind public.discount_kind default null,
  p_percentage_basis_points integer default null,
  p_fixed_amount_minor bigint default null,
  p_currency public.currency_code default null,
  p_minimum_subtotal_minor bigint default 0,
  p_maximum_discount_minor bigint default null,
  p_usage_limit integer default null,
  p_per_subject_limit integer default 1,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_combinability text default 'exclusive',
  p_stacking_group text default null,
  p_priority integer default 0,
  p_public_name_i18n jsonb default null,
  p_description_i18n jsonb default null,
  p_configuration_status text default 'draft',
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.discounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.discounts;
  next_record public.discounts;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_code !~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$'
    or p_starts_at >= p_ends_at
    or p_minimum_subtotal_minor < 0
    or p_per_subject_limit not between 1 and 100
    or p_priority not between -1000 and 1000
    or p_combinability not in ('exclusive', 'same_group', 'stackable')
    or (p_combinability = 'same_group' and p_stacking_group is null)
    or p_configuration_status not in ('draft', 'published', 'disabled')
    or jsonb_typeof(p_public_name_i18n) <> 'object'
    or not (p_public_name_i18n ?& array['ka', 'en', 'de', 'ru'])
    or (p_description_i18n is not null and (
      jsonb_typeof(p_description_i18n) <> 'object'
      or not (p_description_i18n ?& array['ka', 'en', 'de', 'ru'])
    ))
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_PROMOTION' using errcode = '22023';
  end if;
  if (p_kind = 'percentage' and (
      p_percentage_basis_points not between 1 and 10000
      or p_fixed_amount_minor is not null or p_currency is not null
    )) or (p_kind = 'fixed' and (
      p_percentage_basis_points is not null or p_fixed_amount_minor is null or p_currency is null
    )) then raise exception 'INVALID_PROMOTION_VALUE' using errcode = '22023'; end if;
  if p_discount_id is not null then
    select * into current_record from public.discounts where id = p_discount_id for update;
    if not found then raise exception 'PROMOTION_NOT_FOUND' using errcode = 'P0002'; end if;
    if current_record.version <> p_expected_version then
      raise exception 'PROMOTION_VERSION_CONFLICT' using errcode = '40001';
    end if;
  elsif p_expected_version <> 0 then
    raise exception 'PROMOTION_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if current_record.id is null then
    insert into public.discounts (
      code, kind, percentage_basis_points, fixed_amount_minor, currency,
      minimum_subtotal_minor, maximum_discount_minor, usage_limit, per_subject_limit,
      starts_at, ends_at, enabled, public_name_i18n, description_i18n,
      combinability, stacking_group, priority, configuration_status
    ) values (
      p_code, p_kind, p_percentage_basis_points, p_fixed_amount_minor, p_currency,
      p_minimum_subtotal_minor, p_maximum_discount_minor, p_usage_limit, p_per_subject_limit,
      p_starts_at, p_ends_at, p_configuration_status = 'published',
      p_public_name_i18n, p_description_i18n, p_combinability,
      p_stacking_group, p_priority, p_configuration_status
    ) returning * into next_record;
  else
    update public.discounts set
      code = p_code, kind = p_kind,
      percentage_basis_points = p_percentage_basis_points,
      fixed_amount_minor = p_fixed_amount_minor, currency = p_currency,
      minimum_subtotal_minor = p_minimum_subtotal_minor,
      maximum_discount_minor = p_maximum_discount_minor,
      usage_limit = p_usage_limit, per_subject_limit = p_per_subject_limit,
      starts_at = p_starts_at, ends_at = p_ends_at,
      enabled = p_configuration_status = 'published',
      public_name_i18n = p_public_name_i18n, description_i18n = p_description_i18n,
      combinability = p_combinability, stacking_group = p_stacking_group,
      priority = p_priority, configuration_status = p_configuration_status,
      version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  perform app_private.record_commerce_revision(
    'promotion', next_record.id::text, next_record.version, to_jsonb(next_record), p_reason, correlation
  );
  perform app_private.write_audit_event(
    app_private.worldwide_actor_class(), 'commerce.promotion.configure', 'discount',
    next_record.id::text, 'succeeded', 'worldwide-selling', correlation,
    jsonb_build_object('version', next_record.version, 'status', next_record.configuration_status)
  );
  return next_record;
end;
$$;

create or replace function public.configure_market_setting(
  p_market_code text,
  p_country_code text,
  p_default_currency public.currency_code,
  p_tax_display_mode public.tax_display_mode,
  p_tax_registration_reference text,
  p_customs_responsibility text,
  p_customs_copy_i18n jsonb,
  p_legal_status text,
  p_enabled boolean,
  p_expected_version bigint,
  p_reason text
)
returns public.market_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.market_settings;
  next_record public.market_settings;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_market_code !~ '^[A-Z0-9-]{2,20}$' or p_country_code !~ '^[A-Z]{2}$'
    or p_customs_responsibility not in (
      'buyer_unless_confirmed', 'seller', 'included_by_carrier', 'pending_legal_review'
    )
    or p_legal_status not in ('draft_unapproved', 'approved')
    or jsonb_typeof(p_customs_copy_i18n) <> 'object'
    or not (p_customs_copy_i18n ?& array['ka', 'en', 'de', 'ru'])
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_MARKET_CONFIGURATION' using errcode = '22023';
  end if;
  if p_enabled and not exists (
    select 1 from public.currency_settings setting
    where setting.currency = p_default_currency and setting.enabled
      and setting.configuration_status = 'published'
  ) then raise exception 'MARKET_CURRENCY_DISABLED' using errcode = '55000'; end if;
  select * into current_record from public.market_settings
  where market_code = p_market_code for update;
  if current_record.id is not null and current_record.version <> p_expected_version then
    raise exception 'MARKET_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if current_record.id is null and p_expected_version <> 0 then
    raise exception 'MARKET_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if current_record.id is null then
    insert into public.market_settings (
      market_code, country_code, default_currency, tax_display_mode,
      tax_registration_reference, customs_responsibility, customs_copy_i18n,
      legal_status, enabled
    ) values (
      p_market_code, p_country_code, p_default_currency, p_tax_display_mode,
      nullif(btrim(p_tax_registration_reference), ''), p_customs_responsibility,
      p_customs_copy_i18n, p_legal_status, p_enabled
    ) returning * into next_record;
  else
    update public.market_settings set
      country_code = p_country_code, default_currency = p_default_currency,
      tax_display_mode = p_tax_display_mode,
      tax_registration_reference = nullif(btrim(p_tax_registration_reference), ''),
      customs_responsibility = p_customs_responsibility,
      customs_copy_i18n = p_customs_copy_i18n, legal_status = p_legal_status,
      enabled = p_enabled, version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  perform app_private.record_commerce_revision(
    'market', p_market_code, next_record.version, to_jsonb(next_record), p_reason, correlation
  );
  perform app_private.write_audit_event(
    app_private.worldwide_actor_class(), 'commerce.market.configure', 'market_setting',
    next_record.id::text, 'succeeded', 'worldwide-selling', correlation,
    jsonb_build_object('version', next_record.version, 'legalStatus', next_record.legal_status)
  );
  return next_record;
end;
$$;

create or replace function public.configure_shipping_zone(
  p_zone_id uuid default null,
  p_code text default null,
  p_name text default null,
  p_priority integer default 0,
  p_country_codes text[] default '{}',
  p_configuration_status text default 'draft',
  p_legal_status text default 'draft_unapproved',
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.shipping_zones
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.shipping_zones;
  next_record public.shipping_zones;
  country_code text;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(btrim(p_name)) not between 1 and 120
    or cardinality(p_country_codes) not between 1 and 249
    or p_configuration_status not in ('draft', 'published', 'disabled')
    or p_legal_status not in ('draft_unapproved', 'approved')
    or char_length(btrim(p_reason)) not between 2 and 500
    or exists (select 1 from unnest(p_country_codes) code where code !~ '^[A-Z]{2}$') then
    raise exception 'INVALID_SHIPPING_ZONE' using errcode = '22023';
  end if;
  if p_zone_id is not null then
    select * into current_record from public.shipping_zones where id = p_zone_id for update;
    if not found then raise exception 'SHIPPING_ZONE_NOT_FOUND' using errcode = 'P0002'; end if;
    if current_record.version <> p_expected_version then
      raise exception 'SHIPPING_ZONE_VERSION_CONFLICT' using errcode = '40001';
    end if;
  elsif p_expected_version <> 0 then
    raise exception 'SHIPPING_ZONE_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if current_record.id is null then
    insert into public.shipping_zones (
      code, name, priority, enabled, configuration_status, legal_status
    ) values (
      p_code, btrim(p_name), p_priority, p_configuration_status = 'published',
      p_configuration_status, p_legal_status
    ) returning * into next_record;
  else
    update public.shipping_zones set
      code = p_code, name = btrim(p_name), priority = p_priority,
      enabled = p_configuration_status = 'published',
      configuration_status = p_configuration_status, legal_status = p_legal_status,
      version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  delete from public.shipping_zone_countries where zone_id = next_record.id;
  foreach country_code in array p_country_codes loop
    insert into public.shipping_zone_countries (zone_id, country_code)
    values (next_record.id, country_code) on conflict do nothing;
  end loop;
  perform app_private.record_commerce_revision(
    'delivery', 'zone:' || next_record.id::text, next_record.version,
    to_jsonb(next_record) || jsonb_build_object('countryCodes', p_country_codes), p_reason, correlation
  );
  return next_record;
end;
$$;

create or replace function public.configure_shipping_method(
  p_method_id uuid default null,
  p_code text default null,
  p_name_i18n jsonb default null,
  p_service_level_i18n jsonb default null,
  p_customs_copy_i18n jsonb default null,
  p_estimate_min_days integer default null,
  p_estimate_max_days integer default null,
  p_manual_quote boolean default false,
  p_configuration_status text default 'draft',
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.shipping_methods
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.shipping_methods;
  next_record public.shipping_methods;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or jsonb_typeof(p_name_i18n) <> 'object' or not (p_name_i18n ?& array['ka', 'en', 'de', 'ru'])
    or jsonb_typeof(p_service_level_i18n) <> 'object'
    or not (p_service_level_i18n ?& array['ka', 'en', 'de', 'ru'])
    or (p_customs_copy_i18n is not null and (
      jsonb_typeof(p_customs_copy_i18n) <> 'object'
      or not (p_customs_copy_i18n ?& array['ka', 'en', 'de', 'ru'])
    ))
    or p_estimate_min_days < 0 or p_estimate_max_days < p_estimate_min_days
    or p_estimate_max_days > 365
    or p_configuration_status not in ('draft', 'published', 'disabled')
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_SHIPPING_METHOD' using errcode = '22023';
  end if;
  if p_method_id is not null then
    select * into current_record from public.shipping_methods where id = p_method_id for update;
    if not found then raise exception 'SHIPPING_METHOD_NOT_FOUND' using errcode = 'P0002'; end if;
    if current_record.version <> p_expected_version then
      raise exception 'SHIPPING_METHOD_VERSION_CONFLICT' using errcode = '40001';
    end if;
  elsif p_expected_version <> 0 then
    raise exception 'SHIPPING_METHOD_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if current_record.id is null then
    insert into public.shipping_methods (
      code, name_i18n, service_level_i18n, customs_copy_i18n,
      estimate_min_days, estimate_max_days, manual_quote, enabled, configuration_status
    ) values (
      p_code, p_name_i18n, p_service_level_i18n, p_customs_copy_i18n,
      p_estimate_min_days, p_estimate_max_days, p_manual_quote,
      p_configuration_status = 'published', p_configuration_status
    ) returning * into next_record;
  else
    update public.shipping_methods set
      code = p_code, name_i18n = p_name_i18n,
      service_level_i18n = p_service_level_i18n, customs_copy_i18n = p_customs_copy_i18n,
      estimate_min_days = p_estimate_min_days, estimate_max_days = p_estimate_max_days,
      manual_quote = p_manual_quote, enabled = p_configuration_status = 'published',
      configuration_status = p_configuration_status, version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  perform app_private.record_commerce_revision(
    'delivery', 'method:' || next_record.id::text, next_record.version,
    to_jsonb(next_record), p_reason, correlation
  );
  return next_record;
end;
$$;

create or replace function public.configure_shipping_rate(
  p_rate_id uuid default null,
  p_zone_id uuid default null,
  p_method_id uuid default null,
  p_currency public.currency_code default null,
  p_amount_minor bigint default null,
  p_free_threshold_minor bigint default null,
  p_minimum_subtotal_minor bigint default 0,
  p_maximum_subtotal_minor bigint default null,
  p_delivery_classes text[] default '{}',
  p_priority integer default 0,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_enabled boolean default false,
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.shipping_rate_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.shipping_rate_rules;
  next_record public.shipping_rate_rules;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_amount_minor < 0 or p_minimum_subtotal_minor < 0
    or (p_maximum_subtotal_minor is not null and p_maximum_subtotal_minor < p_minimum_subtotal_minor)
    or p_starts_at >= p_ends_at or p_priority not between -1000 and 1000
    or char_length(btrim(p_reason)) not between 2 and 500
    or not exists (select 1 from public.shipping_zones where id = p_zone_id)
    or not exists (select 1 from public.shipping_methods where id = p_method_id) then
    raise exception 'INVALID_SHIPPING_RATE' using errcode = '22023';
  end if;
  if p_rate_id is not null then
    select * into current_record from public.shipping_rate_rules where id = p_rate_id for update;
    if not found then raise exception 'SHIPPING_RATE_NOT_FOUND' using errcode = 'P0002'; end if;
    if current_record.version <> p_expected_version then
      raise exception 'SHIPPING_RATE_VERSION_CONFLICT' using errcode = '40001';
    end if;
  elsif p_expected_version <> 0 then
    raise exception 'SHIPPING_RATE_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if current_record.id is null then
    insert into public.shipping_rate_rules (
      zone_id, method_id, currency, amount_minor, free_threshold_minor,
      minimum_subtotal_minor, maximum_subtotal_minor, delivery_classes,
      priority, starts_at, ends_at, enabled
    ) values (
      p_zone_id, p_method_id, p_currency, p_amount_minor, p_free_threshold_minor,
      p_minimum_subtotal_minor, p_maximum_subtotal_minor, coalesce(p_delivery_classes, '{}'),
      p_priority, p_starts_at, p_ends_at, p_enabled
    ) returning * into next_record;
  else
    update public.shipping_rate_rules set
      zone_id = p_zone_id, method_id = p_method_id, currency = p_currency,
      amount_minor = p_amount_minor, free_threshold_minor = p_free_threshold_minor,
      minimum_subtotal_minor = p_minimum_subtotal_minor,
      maximum_subtotal_minor = p_maximum_subtotal_minor,
      delivery_classes = coalesce(p_delivery_classes, '{}'), priority = p_priority,
      starts_at = p_starts_at, ends_at = p_ends_at, enabled = p_enabled,
      version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  perform app_private.record_commerce_revision(
    'delivery', 'rate:' || next_record.id::text, next_record.version,
    to_jsonb(next_record), p_reason, correlation
  );
  return next_record;
end;
$$;

alter function public.quote_guest_cart(text, text, text) rename to quote_guest_cart_v1;

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
  cart_currency public.currency_code;
  quote_record public.delivery_quotes;
  market_record public.market_settings;
  method_record public.shipping_methods;
  discount_record public.discounts;
  tax_record public.tax_rules;
  capped_discount bigint;
  new_tax bigint;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select cart.currency into cart_currency
  from public.carts cart
  join public.guest_sessions guest on guest.id = cart.guest_session_id
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp() and cart.status = 'active';
  if cart_currency is null then raise exception 'CART_NOT_FOUND' using errcode = 'P0002'; end if;
  if not exists (
    select 1 from public.currency_settings setting
    where setting.currency = cart_currency and setting.enabled and setting.checkout_enabled
      and setting.configuration_status = 'published'
  ) then raise exception 'CURRENCY_DISABLED' using errcode = '55000'; end if;
  quote_record := public.quote_guest_cart_v1(p_secret_hash, p_country_code, p_method_code);
  select * into market_record from public.market_settings market
  where market.country_code = p_country_code and market.enabled;
  select * into method_record from public.shipping_methods method where method.id = quote_record.method_id;
  select discount.* into discount_record
  from public.carts cart join public.discounts discount on discount.code = cart.discount_code
  where cart.id = quote_record.cart_id;
  capped_discount := least(
    quote_record.discount_minor,
    coalesce(discount_record.maximum_discount_minor, quote_record.discount_minor)
  );
  new_tax := quote_record.tax_minor;
  if capped_discount <> quote_record.discount_minor then
    select * into tax_record from public.tax_rules tax
    where tax.country_code = p_country_code and tax.currency = quote_record.currency and tax.enabled
      and tax.starts_at <= statement_timestamp() and tax.ends_at > statement_timestamp()
    order by tax.priority desc limit 1;
    if tax_record.id is not null and not tax_record.prices_include_tax then
      new_tax := ((quote_record.subtotal_minor - capped_discount)
        * tax_record.rate_basis_points + 5000) / 10000;
    end if;
  end if;
  update public.delivery_quotes set
    discount_minor = capped_discount,
    tax_minor = new_tax,
    total_minor = subtotal_minor - capped_discount + new_tax + delivery_minor,
    pricing_version = 'worldwide-v1:' || substr(encode(extensions.digest(concat_ws(':',
      pricing_version, coalesce(market_record.version::text, 'no-market'),
      coalesce((select version::text from public.currency_settings where currency = cart_currency), '0')
    )::bytea, 'sha256'), 'hex'), 1, 48),
    breakdown = breakdown || jsonb_build_object(
      'taxDisplayMode', coalesce(market_record.tax_display_mode::text, 'pending_legal_review'),
      'marketCode', market_record.market_code,
      'marketLegalStatus', coalesce(market_record.legal_status, 'draft_unapproved'),
      'customsResponsibility', coalesce(
        market_record.customs_responsibility, 'pending_legal_review'
      ),
      'customsCopy', coalesce(
        method_record.customs_copy_i18n,
        market_record.customs_copy_i18n,
        '{}'::jsonb
      ),
      'serviceLevel', coalesce(method_record.service_level_i18n, method_record.name_i18n),
      'discountCapped', capped_discount <> quote_record.discount_minor
    )
  where id = quote_record.id returning * into quote_record;
  return quote_record;
end;
$$;

create or replace function app_private.enqueue_manual_quote_notification(
  p_quote public.manual_quote_requests,
  p_purpose text,
  p_template_key text,
  p_suffix text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_id uuid;
  target_key text;
begin
  target_key := p_purpose || ':' || p_quote.id::text || ':' || p_suffix;
  insert into public.notifications (
    purpose, locale, template_key, recipient_hash, payload,
    idempotency_key, correlation_id
  ) values (
    p_purpose, p_quote.locale, p_template_key,
    encode(extensions.digest(lower(p_quote.contact_email::text)::bytea, 'sha256'), 'hex'),
    jsonb_build_object(
      'recipientEmail', lower(p_quote.contact_email::text),
      'quoteReference', p_quote.reference,
      'quoteStatus', p_quote.status,
      'amountMinor', p_quote.quoted_amount_minor,
      'currency', coalesce(p_quote.quoted_currency, p_quote.currency)
    ), target_key, p_quote.correlation_id
  ) on conflict (idempotency_key) do nothing returning id into notification_id;
  if notification_id is null then
    select id into notification_id from public.notifications where idempotency_key = target_key;
  end if;
  return notification_id;
end;
$$;

create or replace function public.submit_manual_quote(
  p_secret_hash text,
  p_quote_proof_hash text,
  p_country_code text,
  p_contact_email text,
  p_contact_phone text,
  p_address jsonb,
  p_buyer_note text,
  p_idempotency_key_hash text
)
returns public.manual_quote_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_record public.guest_sessions;
  cart_record public.carts;
  quote_record public.manual_quote_requests;
  snapshot jsonb;
  snapshot_count integer;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_secret_hash !~ '^[a-f0-9]{64}$' or p_quote_proof_hash !~ '^[a-f0-9]{64}$'
    or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' or p_country_code !~ '^[A-Z]{2}$'
    or char_length(lower(btrim(p_contact_email))) not between 3 and 254
    or jsonb_typeof(p_address) <> 'object'
    or char_length(coalesce(p_contact_phone, '')) > 40
    or char_length(coalesce(p_buyer_note, '')) > 2000 then
    raise exception 'INVALID_MANUAL_QUOTE' using errcode = '22023';
  end if;
  select * into guest_record from public.guest_sessions guest
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp() for update;
  if not found then raise exception 'GUEST_CONTEXT_NOT_FOUND' using errcode = '28000'; end if;
  select * into cart_record from public.carts cart
  where cart.guest_session_id = guest_record.id and cart.status = 'active' for update;
  if not found then raise exception 'CART_NOT_FOUND' using errcode = 'P0002'; end if;
  select request.* into quote_record from public.manual_quote_requests request
  where request.idempotency_key_hash = p_idempotency_key_hash
    and (
      request.guest_session_id = guest_record.id
      or request.customer_profile_id = guest_record.customer_profile_id
    );
  if quote_record.id is not null then return quote_record; end if;
  if not exists (
    select 1 from public.currency_settings setting
    where setting.currency = cart_record.currency and setting.enabled
      and setting.configuration_status = 'published'
  ) then raise exception 'CURRENCY_DISABLED' using errcode = '55000'; end if;
  select jsonb_build_object(
    'cartId', cart_record.id,
    'cartVersion', cart_record.version,
    'currency', cart_record.currency,
    'lines', coalesce(jsonb_agg(jsonb_build_object(
      'productId', item.product_id, 'sku', product.sku::text,
      'name', translation.name, 'quantity', item.quantity,
      'unitAmountMinor', resolved.amount_minor, 'deliveryClass', product.delivery_class,
      'widthMm', product.width_mm, 'lengthMm', product.length_mm
    ) order by item.created_at), '[]'::jsonb)
  ), count(*)::integer into snapshot, snapshot_count
  from public.cart_items item
  join public.products product on product.id = item.product_id
    and product.status = 'published' and product.search_visible
  join lateral public.resolve_product_price(
    product.id, cart_record.currency,
    (select market.market_code from public.market_settings market
     where market.country_code = p_country_code and market.enabled)
  ) resolved on resolved.id is not null
  join lateral (
    select translated.* from public.product_translations translated
    where translated.product_id = product.id and translated.status = 'published'
    order by case when translated.locale = guest_record.locale then 0
      when translated.locale = 'en' then 1 else 2 end, translated.locale limit 1
  ) translation on true
  where item.cart_id = cart_record.id;
  if snapshot_count = 0 or snapshot_count <> (
    select count(*) from public.cart_items where cart_id = cart_record.id
  ) then raise exception 'CART_ITEM_UNAVAILABLE' using errcode = 'P0001'; end if;
  insert into public.manual_quote_requests (
    customer_profile_id, guest_session_id, guest_proof_hash, cart_id,
    locale, currency, destination_country_code, contact_email, contact_phone,
    address, buyer_note, cart_snapshot, idempotency_key_hash
  ) values (
    guest_record.customer_profile_id,
    case when guest_record.customer_profile_id is null then guest_record.id else null end,
    case when guest_record.customer_profile_id is null then p_quote_proof_hash else null end,
    cart_record.id, guest_record.locale, cart_record.currency, p_country_code,
    lower(btrim(p_contact_email)), nullif(btrim(p_contact_phone), ''), p_address,
    nullif(btrim(p_buyer_note), ''), snapshot, p_idempotency_key_hash
  ) returning * into quote_record;
  insert into public.manual_quote_events (
    manual_quote_id, event_type, to_status, actor_profile_id, actor_class,
    idempotency_key_hash, correlation_id
  ) values (
    quote_record.id, 'submitted', quote_record.status, guest_record.customer_profile_id,
    case when guest_record.customer_profile_id is null then 'guest' else 'customer' end,
    p_idempotency_key_hash, quote_record.correlation_id
  );
  perform app_private.enqueue_manual_quote_notification(
    quote_record, 'quote-submitted', 'quote-submitted', 'submitted'
  );
  return quote_record;
end;
$$;

create or replace function public.read_manual_quote(
  p_reference text,
  p_proof_hash text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  quote_record public.manual_quote_requests;
begin
  select * into quote_record from public.manual_quote_requests request
  where request.reference = p_reference;
  if not found then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if not (
    public.is_active_staff()
    or (auth.uid() is not null and quote_record.customer_profile_id = auth.uid())
    or (quote_record.guest_session_id is not null and quote_record.guest_proof_hash = p_proof_hash)
  ) then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  return to_jsonb(quote_record) - 'guest_proof_hash' - 'idempotency_key_hash';
end;
$$;

create or replace function public.request_manual_quote_information(
  p_quote_id uuid,
  p_expected_version bigint,
  p_buyer_message text,
  p_idempotency_key_hash text
)
returns public.manual_quote_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_record public.manual_quote_requests;
  previous_status public.manual_quote_status;
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_buyer_message)) not between 2 and 2000
    or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_QUOTE_INFORMATION_REQUEST' using errcode = '22023';
  end if;
  if exists (select 1 from public.manual_quote_events event
    where event.manual_quote_id = p_quote_id and event.event_type = 'needs-information'
      and event.idempotency_key_hash = p_idempotency_key_hash) then
    select * into quote_record from public.manual_quote_requests where id = p_quote_id;
    return quote_record;
  end if;
  select * into quote_record from public.manual_quote_requests where id = p_quote_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if quote_record.version <> p_expected_version then raise exception 'QUOTE_VERSION_CONFLICT' using errcode = '40001'; end if;
  if quote_record.status not in ('submitted', 'needs_information') then
    raise exception 'INVALID_QUOTE_TRANSITION' using errcode = '55000';
  end if;
  previous_status := quote_record.status;
  update public.manual_quote_requests set status = 'needs_information',
    buyer_message = btrim(p_buyer_message), version = version + 1
  where id = p_quote_id returning * into quote_record;
  insert into public.manual_quote_events (
    manual_quote_id, event_type, from_status, to_status, actor_profile_id,
    actor_class, buyer_message, idempotency_key_hash, correlation_id
  ) values (
    quote_record.id, 'needs-information', previous_status, quote_record.status, auth.uid(),
    app_private.worldwide_actor_class(), quote_record.buyer_message,
    p_idempotency_key_hash, quote_record.correlation_id
  );
  perform app_private.enqueue_manual_quote_notification(
    quote_record, 'quote-needs-information', 'quote-needs-information', p_idempotency_key_hash
  );
  return quote_record;
end;
$$;

create or replace function public.resolve_manual_quote(
  p_quote_id uuid,
  p_expected_version bigint,
  p_amount_minor bigint,
  p_currency public.currency_code,
  p_method_i18n jsonb,
  p_estimate_min_days integer,
  p_estimate_max_days integer,
  p_customs_snapshot jsonb,
  p_expires_at timestamptz,
  p_staff_note text,
  p_buyer_message text,
  p_idempotency_key_hash text
)
returns public.manual_quote_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_record public.manual_quote_requests;
  previous_status public.manual_quote_status;
begin
  perform app_private.assert_manager();
  if p_amount_minor < 0 or jsonb_typeof(p_method_i18n) <> 'object'
    or not (p_method_i18n ?& array['ka', 'en', 'de', 'ru'])
    or p_estimate_min_days < 0 or p_estimate_max_days < p_estimate_min_days
    or p_estimate_max_days > 365 or jsonb_typeof(p_customs_snapshot) <> 'object'
    or p_expires_at <= statement_timestamp()
    or char_length(coalesce(p_staff_note, '')) > 2000
    or char_length(btrim(p_buyer_message)) not between 2 and 2000
    or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_QUOTE_RESOLUTION' using errcode = '22023';
  end if;
  if not exists (select 1 from public.currency_settings setting
    where setting.currency = p_currency and setting.enabled and setting.checkout_enabled
      and setting.configuration_status = 'published') then
    raise exception 'CURRENCY_DISABLED' using errcode = '55000';
  end if;
  if exists (select 1 from public.manual_quote_events event
    where event.manual_quote_id = p_quote_id and event.event_type = 'quoted'
      and event.idempotency_key_hash = p_idempotency_key_hash) then
    select * into quote_record from public.manual_quote_requests where id = p_quote_id;
    return quote_record;
  end if;
  select * into quote_record from public.manual_quote_requests where id = p_quote_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if quote_record.version <> p_expected_version then raise exception 'QUOTE_VERSION_CONFLICT' using errcode = '40001'; end if;
  if quote_record.status not in ('submitted', 'needs_information') then
    raise exception 'INVALID_QUOTE_TRANSITION' using errcode = '55000';
  end if;
  previous_status := quote_record.status;
  update public.manual_quote_requests set
    status = 'quoted', quoted_amount_minor = p_amount_minor, quoted_currency = p_currency,
    quoted_method_i18n = p_method_i18n, estimate_min_days = p_estimate_min_days,
    estimate_max_days = p_estimate_max_days, customs_snapshot = p_customs_snapshot,
    staff_note = nullif(btrim(p_staff_note), ''), buyer_message = btrim(p_buyer_message),
    quoted_by = auth.uid(), quoted_at = statement_timestamp(), expires_at = p_expires_at,
    version = version + 1
  where id = p_quote_id returning * into quote_record;
  insert into public.manual_quote_events (
    manual_quote_id, event_type, from_status, to_status, actor_profile_id,
    actor_class, buyer_message, idempotency_key_hash, correlation_id
  ) values (
    quote_record.id, 'quoted', previous_status, quote_record.status, auth.uid(),
    app_private.worldwide_actor_class(), quote_record.buyer_message,
    p_idempotency_key_hash, quote_record.correlation_id
  );
  perform app_private.enqueue_manual_quote_notification(
    quote_record, 'quote-ready', 'quote-ready', p_idempotency_key_hash
  );
  perform app_private.write_audit_event(
    app_private.worldwide_actor_class(), 'commerce.quote.resolve', 'manual_quote',
    quote_record.id::text, 'succeeded', 'worldwide-selling', quote_record.correlation_id,
    jsonb_build_object('version', quote_record.version, 'currency', p_currency::text)
  );
  return quote_record;
end;
$$;

create or replace function public.respond_manual_quote(
  p_quote_id uuid,
  p_proof_hash text,
  p_accept boolean,
  p_expected_version bigint,
  p_idempotency_key_hash text
)
returns public.manual_quote_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_record public.manual_quote_requests;
  target_status public.manual_quote_status := case when p_accept then 'accepted' else 'declined' end;
begin
  if p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_QUOTE_RESPONSE' using errcode = '22023';
  end if;
  if exists (select 1 from public.manual_quote_events event
    where event.manual_quote_id = p_quote_id and event.event_type = target_status::text
      and event.idempotency_key_hash = p_idempotency_key_hash) then
    select * into quote_record from public.manual_quote_requests where id = p_quote_id;
    return quote_record;
  end if;
  select * into quote_record from public.manual_quote_requests where id = p_quote_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if not (
    public.is_active_staff()
    or (auth.uid() is not null and quote_record.customer_profile_id = auth.uid())
    or (quote_record.guest_session_id is not null and quote_record.guest_proof_hash = p_proof_hash)
  ) then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if quote_record.version <> p_expected_version then raise exception 'QUOTE_VERSION_CONFLICT' using errcode = '40001'; end if;
  if quote_record.status <> 'quoted' or quote_record.expires_at <= statement_timestamp() then
    raise exception 'QUOTE_UNAVAILABLE' using errcode = '55000';
  end if;
  update public.manual_quote_requests set status = target_status, version = version + 1
  where id = p_quote_id returning * into quote_record;
  insert into public.manual_quote_events (
    manual_quote_id, event_type, from_status, to_status, actor_profile_id,
    actor_class, idempotency_key_hash, correlation_id
  ) values (
    quote_record.id, target_status::text, 'quoted', quote_record.status, auth.uid(),
    case when quote_record.customer_profile_id is null then 'guest' else 'customer' end,
    p_idempotency_key_hash, quote_record.correlation_id
  );
  perform app_private.enqueue_manual_quote_notification(
    quote_record, 'quote-' || target_status::text, 'quote-' || target_status::text,
    p_idempotency_key_hash
  );
  return quote_record;
end;
$$;

create or replace function public.expire_manual_quotes(p_limit integer default 200)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_limit not between 1 and 1000 then raise exception 'INVALID_LIMIT' using errcode = '22023'; end if;
  with candidates as (
    select id from public.manual_quote_requests
    where status = 'quoted' and expires_at <= statement_timestamp()
    order by expires_at for update skip locked limit p_limit
  ), updated as (
    update public.manual_quote_requests request set status = 'expired', version = version + 1
    from candidates where request.id = candidates.id returning request.*
  ), events as (
    insert into public.manual_quote_events (
      manual_quote_id, event_type, from_status, to_status, actor_class, correlation_id
    ) select id, 'expired', 'quoted', 'expired', 'system', correlation_id from updated
  ) select count(*)::integer into affected from updated;
  return affected;
end;
$$;

create or replace function public.run_worldwide_selling_maintenance(p_limit integer default 200)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  expired_count := public.expire_manual_quotes(p_limit);
  update public.discounts set enabled = false, configuration_status = 'disabled', version = version + 1
  where enabled and ends_at <= statement_timestamp();
  return jsonb_build_object('expiredQuotes', expired_count);
end;
$$;

revoke all on function app_private.record_commerce_revision(text, text, bigint, jsonb, text, uuid) from public;
revoke all on function public.configure_currency_setting(public.currency_code, boolean, boolean, boolean, integer, public.price_source_mode, text, text, bigint, text) from public, anon;
revoke all on function public.resolve_product_price(uuid, public.currency_code, text) from public, anon;
revoke all on function public.save_product_market_price(uuid, public.currency_code, text, bigint, timestamptz, timestamptz, boolean, text, text, bigint, text) from public, anon;
revoke all on function public.configure_promotion(uuid, text, public.discount_kind, integer, bigint, public.currency_code, bigint, bigint, integer, integer, timestamptz, timestamptz, text, text, integer, jsonb, jsonb, text, bigint, text) from public, anon;
revoke all on function public.configure_market_setting(text, text, public.currency_code, public.tax_display_mode, text, text, jsonb, text, boolean, bigint, text) from public, anon;
revoke all on function public.configure_shipping_zone(uuid, text, text, integer, text[], text, text, bigint, text) from public, anon;
revoke all on function public.configure_shipping_method(uuid, text, jsonb, jsonb, jsonb, integer, integer, boolean, text, bigint, text) from public, anon;
revoke all on function public.configure_shipping_rate(uuid, uuid, uuid, public.currency_code, bigint, bigint, bigint, bigint, text[], integer, timestamptz, timestamptz, boolean, bigint, text) from public, anon;
revoke all on function public.submit_manual_quote(text, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.quote_guest_cart(text, text, text) from public, anon, authenticated;
revoke all on function public.read_manual_quote(text, text) from public, anon;
revoke all on function public.request_manual_quote_information(uuid, bigint, text, text) from public, anon;
revoke all on function public.resolve_manual_quote(uuid, bigint, bigint, public.currency_code, jsonb, integer, integer, jsonb, timestamptz, text, text, text) from public, anon;
revoke all on function public.respond_manual_quote(uuid, text, boolean, bigint, text) from public, anon;
revoke all on function public.expire_manual_quotes(integer) from public, anon, authenticated;
revoke all on function public.run_worldwide_selling_maintenance(integer) from public, anon, authenticated;

grant execute on function public.configure_currency_setting(public.currency_code, boolean, boolean, boolean, integer, public.price_source_mode, text, text, bigint, text) to authenticated, service_role;
grant execute on function public.resolve_product_price(uuid, public.currency_code, text) to authenticated, service_role;
grant execute on function public.save_product_market_price(uuid, public.currency_code, text, bigint, timestamptz, timestamptz, boolean, text, text, bigint, text) to authenticated, service_role;
grant execute on function public.configure_promotion(uuid, text, public.discount_kind, integer, bigint, public.currency_code, bigint, bigint, integer, integer, timestamptz, timestamptz, text, text, integer, jsonb, jsonb, text, bigint, text) to authenticated, service_role;
grant execute on function public.configure_market_setting(text, text, public.currency_code, public.tax_display_mode, text, text, jsonb, text, boolean, bigint, text) to authenticated, service_role;
grant execute on function public.configure_shipping_zone(uuid, text, text, integer, text[], text, text, bigint, text) to authenticated, service_role;
grant execute on function public.configure_shipping_method(uuid, text, jsonb, jsonb, jsonb, integer, integer, boolean, text, bigint, text) to authenticated, service_role;
grant execute on function public.configure_shipping_rate(uuid, uuid, uuid, public.currency_code, bigint, bigint, bigint, bigint, text[], integer, timestamptz, timestamptz, boolean, bigint, text) to authenticated, service_role;
grant execute on function public.quote_guest_cart(text, text, text) to service_role;
grant execute on function public.submit_manual_quote(text, text, text, text, text, jsonb, text, text) to service_role;
grant execute on function public.read_manual_quote(text, text) to authenticated, service_role;
grant execute on function public.request_manual_quote_information(uuid, bigint, text, text) to authenticated, service_role;
grant execute on function public.resolve_manual_quote(uuid, bigint, bigint, public.currency_code, jsonb, integer, integer, jsonb, timestamptz, text, text, text) to authenticated, service_role;
grant execute on function public.respond_manual_quote(uuid, text, boolean, bigint, text) to authenticated, service_role;
grant execute on function public.expire_manual_quotes(integer) to service_role;
grant execute on function public.run_worldwide_selling_maintenance(integer) to service_role;
