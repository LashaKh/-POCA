alter table public.provider_event_inbox enable row level security;
alter table public.payment_reconciliations enable row level security;
alter table public.refund_records enable row level security;
alter table public.fulfillments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.order_internal_notes enable row level security;

alter table public.provider_event_inbox force row level security;
alter table public.payment_reconciliations force row level security;
alter table public.refund_records force row level security;
alter table public.fulfillments force row level security;
alter table public.shipment_events force row level security;
alter table public.order_internal_notes force row level security;

revoke all on public.provider_event_inbox, public.payment_reconciliations,
  public.refund_records, public.fulfillments, public.shipment_events,
  public.order_internal_notes
from public, anon, authenticated;

grant select on public.provider_event_inbox, public.payment_reconciliations,
  public.refund_records, public.fulfillments, public.shipment_events,
  public.order_internal_notes, public.notifications, public.notification_attempts
to authenticated;

create policy provider_events_staff_read
on public.provider_event_inbox for select to authenticated
using (public.is_active_staff());

create policy payment_reconciliations_staff_read
on public.payment_reconciliations for select to authenticated
using (public.is_active_staff());

create policy refund_records_staff_read
on public.refund_records for select to authenticated
using (public.is_active_staff());

create policy fulfillments_customer_or_staff_read
on public.fulfillments for select to authenticated
using (exists (
  select 1 from public.orders order_record
  where order_record.id = order_id
    and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy shipment_events_customer_or_staff_read
on public.shipment_events for select to authenticated
using (exists (
  select 1
  from public.fulfillments fulfillment
  join public.orders order_record on order_record.id = fulfillment.order_id
  where fulfillment.id = fulfillment_id
    and (order_record.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy order_internal_notes_staff_read
on public.order_internal_notes for select to authenticated
using (public.is_active_staff());

create policy notifications_staff_read
on public.notifications for select to authenticated
using (public.is_active_staff());

create policy notification_attempts_staff_read
on public.notification_attempts for select to authenticated
using (public.is_active_staff());

grant all on public.provider_event_inbox, public.payment_reconciliations,
  public.refund_records, public.fulfillments, public.shipment_events,
  public.order_internal_notes
to service_role;
grant usage, select on all sequences in schema public to service_role;

create view public.staff_order_operations
with (security_invoker = true)
as
select
  order_record.id,
  order_record.reference,
  order_record.status,
  order_record.payment_status,
  order_record.payment_method,
  order_record.currency,
  order_record.total_minor,
  regexp_replace(order_record.contact_email::text, '(^.).*(@.*$)', '\1***\2') as masked_email,
  order_record.version,
  order_record.accepted_at,
  order_record.updated_at,
  payment.provider,
  payment.provider_reference,
  payment.status as payment_attempt_status,
  fulfillment.carrier,
  fulfillment.tracking_reference,
  fulfillment.status as fulfillment_status,
  fulfillment.dispatched_at,
  fulfillment.delivered_at
from public.orders order_record
left join lateral (
  select attempt.provider, attempt.provider_reference, attempt.status
  from public.payment_attempts attempt
  where attempt.order_id = order_record.id
  order by attempt.created_at desc
  limit 1
) payment on true
left join lateral (
  select shipment.carrier, shipment.tracking_reference, shipment.status,
    shipment.dispatched_at, shipment.delivered_at
  from public.fulfillments shipment
  where shipment.order_id = order_record.id
  order by shipment.created_at desc
  limit 1
) fulfillment on true
where public.is_active_staff();

grant select on public.staff_order_operations to authenticated;
comment on view public.staff_order_operations is
  'Staff-only, minimized order operations queue with masked customer contact data.';
