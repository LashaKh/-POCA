alter table public.currency_settings enable row level security;
alter table public.market_settings enable row level security;
alter table public.manual_quote_requests enable row level security;
alter table public.manual_quote_events enable row level security;
alter table public.commerce_configuration_revisions enable row level security;

alter table public.currency_settings force row level security;
alter table public.market_settings force row level security;
alter table public.manual_quote_requests force row level security;
alter table public.manual_quote_events force row level security;
alter table public.commerce_configuration_revisions force row level security;

revoke all on public.currency_settings, public.market_settings,
  public.manual_quote_requests, public.manual_quote_events,
  public.commerce_configuration_revisions
from public, anon, authenticated;

grant select on public.currency_settings, public.market_settings to anon, authenticated;
grant select on public.manual_quote_requests, public.manual_quote_events,
  public.commerce_configuration_revisions to authenticated;

create policy currency_settings_published_or_staff_read
on public.currency_settings for select to anon, authenticated
using (
  (enabled and configuration_status = 'published')
  or public.is_active_staff()
);

create policy market_settings_enabled_or_staff_read
on public.market_settings for select to anon, authenticated
using (enabled or public.is_active_staff());

create policy manual_quotes_customer_or_staff_read
on public.manual_quote_requests for select to authenticated
using (customer_profile_id = auth.uid() or public.is_active_staff());

create policy manual_quote_events_customer_or_staff_read
on public.manual_quote_events for select to authenticated
using (exists (
  select 1 from public.manual_quote_requests request
  where request.id = manual_quote_id
    and (request.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy commerce_revisions_staff_read
on public.commerce_configuration_revisions for select to authenticated
using (public.is_active_staff());

grant select on public.discounts, public.shipping_zones,
  public.shipping_zone_countries, public.shipping_methods,
  public.shipping_rate_rules to anon;

create policy discounts_published_read
on public.discounts for select to anon
using (
  enabled and configuration_status = 'published'
  and starts_at <= statement_timestamp() and ends_at > statement_timestamp()
);

create policy shipping_zones_published_read
on public.shipping_zones for select to anon
using (enabled and configuration_status = 'published');

create policy shipping_countries_published_read
on public.shipping_zone_countries for select to anon
using (exists (
  select 1 from public.shipping_zones zone
  where zone.id = zone_id and zone.enabled and zone.configuration_status = 'published'
));

create policy shipping_methods_published_read
on public.shipping_methods for select to anon
using (enabled and configuration_status = 'published');

create policy shipping_rates_published_read
on public.shipping_rate_rules for select to anon
using (
  enabled and starts_at <= statement_timestamp() and ends_at > statement_timestamp()
  and exists (
    select 1 from public.shipping_zones zone
    where zone.id = zone_id and zone.enabled and zone.configuration_status = 'published'
  )
  and exists (
    select 1 from public.shipping_methods method
    where method.id = method_id and method.enabled
      and method.configuration_status = 'published'
  )
);

revoke insert, update, delete on public.currency_settings, public.market_settings,
  public.discounts, public.product_prices, public.shipping_zones,
  public.shipping_zone_countries, public.shipping_methods,
  public.shipping_rate_rules from authenticated;

create view public.published_currency_settings
with (security_invoker = true)
as
select
  currency, checkout_enabled, is_default, display_order, price_source_mode
from public.currency_settings
where enabled and configuration_status = 'published';

create view public.published_market_settings
with (security_invoker = true)
as
select
  market_code, country_code, default_currency, tax_display_mode,
  customs_responsibility, customs_copy_i18n, legal_status
from public.market_settings
where enabled;

create view public.published_promotions
with (security_invoker = true)
as
select
  id, code, kind, percentage_basis_points, fixed_amount_minor, currency,
  minimum_subtotal_minor, maximum_discount_minor, usage_limit, used_count,
  starts_at, ends_at, public_name_i18n, description_i18n,
  combinability, stacking_group, priority
from public.discounts
where enabled and configuration_status = 'published'
  and starts_at <= statement_timestamp() and ends_at > statement_timestamp();

create view public.published_delivery_options
with (security_invoker = true)
as
select
  country.country_code, zone.code as zone_code, zone.priority as zone_priority,
  method.code as method_code, method.name_i18n, method.service_level_i18n,
  method.customs_copy_i18n, method.estimate_min_days, method.estimate_max_days,
  method.manual_quote, rate.currency, rate.amount_minor,
  rate.free_threshold_minor, rate.minimum_subtotal_minor,
  rate.maximum_subtotal_minor, rate.delivery_classes, rate.priority as rate_priority
from public.shipping_zone_countries country
join public.shipping_zones zone on zone.id = country.zone_id
  and zone.enabled and zone.configuration_status = 'published'
join public.shipping_rate_rules rate on rate.zone_id = zone.id and rate.enabled
  and rate.starts_at <= statement_timestamp() and rate.ends_at > statement_timestamp()
join public.shipping_methods method on method.id = rate.method_id
  and method.enabled and method.configuration_status = 'published';

create view public.staff_manual_quote_queue
with (security_invoker = true)
as
select
  request.id, request.reference, request.status, request.destination_country_code,
  request.currency, request.quoted_amount_minor, request.quoted_currency,
  request.version, request.created_at, request.updated_at, request.expires_at,
  regexp_replace(request.contact_email::text, '(^.).*(@.*$)', '\1***\2') as masked_email,
  jsonb_array_length(request.cart_snapshot -> 'lines') as item_count
from public.manual_quote_requests request
where public.is_active_staff();

grant select on public.published_currency_settings,
  public.published_market_settings, public.published_promotions,
  public.published_delivery_options to anon, authenticated;
grant select on public.staff_manual_quote_queue to authenticated;

grant all on public.currency_settings, public.market_settings,
  public.manual_quote_requests, public.manual_quote_events,
  public.commerce_configuration_revisions to service_role;
grant usage, select on all sequences in schema public to service_role;

comment on view public.published_market_settings is
  'Public market truth includes legal approval status so draft policy text is never presented as approved.';
comment on view public.staff_manual_quote_queue is
  'Operational queue masks buyer contact; authorized staff open a single record for full details.';
