alter table public.guest_sessions enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.discounts enable row level security;
alter table public.discount_scopes enable row level security;
alter table public.discount_redemptions enable row level security;
alter table public.tax_rules enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_zone_countries enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipping_rate_rules enable row level security;
alter table public.delivery_quotes enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.inventory_events enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_addresses enable row level security;
alter table public.order_adjustments enable row level security;
alter table public.order_events enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.bank_transfer_reviews enable row level security;
alter table public.webhook_receipts enable row level security;
alter table public.order_notification_links enable row level security;

alter table public.guest_sessions force row level security;
alter table public.carts force row level security;
alter table public.cart_items force row level security;
alter table public.delivery_quotes force row level security;
alter table public.checkout_sessions force row level security;
alter table public.inventory_reservations force row level security;
alter table public.inventory_events force row level security;
alter table public.orders force row level security;
alter table public.order_lines force row level security;
alter table public.order_addresses force row level security;
alter table public.order_adjustments force row level security;
alter table public.order_events force row level security;
alter table public.payment_attempts force row level security;
alter table public.payment_events force row level security;
alter table public.bank_transfer_reviews force row level security;
alter table public.webhook_receipts force row level security;
alter table public.order_notification_links force row level security;

revoke all on public.guest_sessions, public.carts, public.cart_items,
  public.discounts, public.discount_scopes, public.discount_redemptions,
  public.tax_rules, public.shipping_zones, public.shipping_zone_countries,
  public.shipping_methods, public.shipping_rate_rules, public.delivery_quotes,
  public.checkout_sessions, public.inventory_reservations, public.inventory_events,
  public.orders, public.order_lines, public.order_addresses, public.order_adjustments,
  public.order_events, public.payment_attempts, public.payment_events,
  public.bank_transfer_reviews, public.webhook_receipts, public.order_notification_links
from public, anon, authenticated;

grant select on public.orders, public.order_lines, public.order_addresses,
  public.order_adjustments, public.order_events, public.payment_attempts,
  public.payment_events, public.bank_transfer_reviews, public.order_notification_links
to authenticated;
grant select on public.discounts, public.discount_scopes, public.tax_rules,
  public.shipping_zones, public.shipping_zone_countries, public.shipping_methods,
  public.shipping_rate_rules, public.inventory_reservations, public.inventory_events
to authenticated;
grant insert, update, delete on public.discounts, public.discount_scopes,
  public.tax_rules, public.shipping_zones, public.shipping_zone_countries,
  public.shipping_methods, public.shipping_rate_rules
to authenticated;

create policy orders_customer_or_staff_read on public.orders for select to authenticated
using (customer_profile_id = auth.uid() or public.is_active_staff());
create policy order_lines_customer_or_staff_read on public.order_lines for select to authenticated
using (exists (
  select 1 from public.orders order_record
  where order_record.id = order_id and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));
create policy order_addresses_customer_or_staff_read on public.order_addresses for select to authenticated
using (exists (
  select 1 from public.orders order_record
  where order_record.id = order_id and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));
create policy order_adjustments_customer_or_staff_read on public.order_adjustments for select to authenticated
using (exists (
  select 1 from public.orders order_record
  where order_record.id = order_id and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));
create policy order_events_customer_or_staff_read on public.order_events for select to authenticated
using (exists (
  select 1 from public.orders order_record
  where order_record.id = order_id and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));
create policy payment_attempts_customer_or_staff_read on public.payment_attempts for select to authenticated
using (exists (
  select 1 from public.orders order_record
  where order_record.id = order_id and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));
create policy payment_events_customer_or_staff_read on public.payment_events for select to authenticated
using (exists (
  select 1 from public.payment_attempts attempt
  join public.orders order_record on order_record.id = attempt.order_id
  where attempt.id = payment_attempt_id and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));
create policy bank_reviews_staff_read on public.bank_transfer_reviews for select to authenticated
using (public.is_active_staff());
create policy notification_links_customer_or_staff_read on public.order_notification_links for select to authenticated
using (exists (
  select 1 from public.orders order_record
  where order_record.id = order_id and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy discounts_staff_all on public.discounts for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy discount_scopes_staff_all on public.discount_scopes for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy tax_rules_staff_all on public.tax_rules for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy shipping_zones_staff_all on public.shipping_zones for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy shipping_countries_staff_all on public.shipping_zone_countries for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy shipping_methods_staff_all on public.shipping_methods for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy shipping_rates_staff_all on public.shipping_rate_rules for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy reservations_staff_read on public.inventory_reservations for select to authenticated
using (public.is_active_staff());
create policy inventory_events_staff_read on public.inventory_events for select to authenticated
using (public.is_active_staff());

grant all on public.guest_sessions, public.carts, public.cart_items,
  public.discounts, public.discount_scopes, public.discount_redemptions,
  public.tax_rules, public.shipping_zones, public.shipping_zone_countries,
  public.shipping_methods, public.shipping_rate_rules, public.delivery_quotes,
  public.checkout_sessions, public.inventory_reservations, public.inventory_events,
  public.orders, public.order_lines, public.order_addresses, public.order_adjustments,
  public.order_events, public.payment_attempts, public.payment_events,
  public.bank_transfer_reviews, public.webhook_receipts, public.order_notification_links
to service_role;
grant usage, select on all sequences in schema public to service_role;

create view public.staff_order_summaries
with (security_invoker = true)
as
select
  order_record.id,
  order_record.reference,
  order_record.status,
  order_record.payment_status,
  order_record.currency,
  order_record.total_minor,
  regexp_replace(order_record.contact_email::text, '(^.).*(@.*$)', '\1***\2') as masked_email,
  order_record.accepted_at,
  order_record.updated_at
from public.orders order_record;

grant select on public.staff_order_summaries to authenticated;
comment on view public.staff_order_summaries is
  'RLS-aware staff/customer order list projection with minimized contact data.';
