alter table public.return_policies enable row level security;
alter table public.return_requests enable row level security;
alter table public.return_items enable row level security;
alter table public.return_events enable row level security;
alter table public.return_messages enable row level security;
alter table public.return_evidence enable row level security;
alter table public.return_inspections enable row level security;
alter table public.return_decisions enable row level security;
alter table public.return_restock_links enable row level security;
alter table public.return_refund_links enable row level security;

alter table public.return_policies force row level security;
alter table public.return_requests force row level security;
alter table public.return_items force row level security;
alter table public.return_events force row level security;
alter table public.return_messages force row level security;
alter table public.return_evidence force row level security;
alter table public.return_inspections force row level security;
alter table public.return_decisions force row level security;
alter table public.return_restock_links force row level security;
alter table public.return_refund_links force row level security;

revoke all on public.return_policies, public.return_requests,
  public.return_items, public.return_events, public.return_messages,
  public.return_evidence, public.return_inspections, public.return_decisions,
  public.return_restock_links, public.return_refund_links
from public, anon, authenticated;

grant select on public.return_policies, public.return_requests,
  public.return_items, public.return_events, public.return_messages,
  public.return_evidence, public.return_inspections, public.return_decisions,
  public.return_restock_links, public.return_refund_links
to authenticated;

create policy return_policies_published_or_staff_read
on public.return_policies for select to authenticated
using (active or public.is_active_staff());

create policy return_requests_buyer_or_staff_read
on public.return_requests for select to authenticated
using (customer_profile_id = auth.uid() or public.is_active_staff());

create policy return_items_buyer_or_staff_read
on public.return_items for select to authenticated
using (exists (
  select 1 from public.return_requests request
  where request.id = return_request_id
    and (request.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy return_events_buyer_or_staff_read
on public.return_events for select to authenticated
using (exists (
  select 1 from public.return_requests request
  where request.id = return_request_id
    and (request.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy return_messages_buyer_or_staff_read
on public.return_messages for select to authenticated
using (exists (
  select 1 from public.return_requests request
  where request.id = return_request_id
    and (
      public.is_active_staff()
      or (request.customer_profile_id = auth.uid() and audience in ('buyer', 'all'))
    )
));

create policy return_evidence_buyer_or_staff_read
on public.return_evidence for select to authenticated
using (exists (
  select 1 from public.return_requests request
  where request.id = return_request_id
    and (request.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy return_inspections_buyer_or_staff_read
on public.return_inspections for select to authenticated
using (exists (
  select 1 from public.return_requests request
  where request.id = return_request_id
    and (request.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy return_decisions_buyer_or_staff_read
on public.return_decisions for select to authenticated
using (exists (
  select 1 from public.return_requests request
  where request.id = return_request_id
    and (request.customer_profile_id = auth.uid() or public.is_active_staff())
));

create policy return_restock_links_staff_read
on public.return_restock_links for select to authenticated
using (public.is_active_staff());

create policy return_refund_links_buyer_or_staff_read
on public.return_refund_links for select to authenticated
using (exists (
  select 1 from public.return_requests request
  where request.id = return_request_id
    and (request.customer_profile_id = auth.uid() or public.is_active_staff())
));

grant all on public.return_policies, public.return_requests,
  public.return_items, public.return_events, public.return_messages,
  public.return_evidence, public.return_inspections, public.return_decisions,
  public.return_restock_links, public.return_refund_links
to service_role;
grant usage, select on all sequences in schema public to service_role;

create view public.staff_return_queue
with (security_invoker = true)
as
select
  request.id,
  request.reference,
  request.order_id,
  order_record.reference as order_reference,
  request.request_kind,
  request.status,
  request.reason_code,
  request.policy_version,
  request.version,
  request.created_at,
  request.updated_at,
  request.expires_at,
  regexp_replace(order_record.contact_email::text, '(^.).*(@.*$)', '\1***\2') as masked_email,
  count(distinct item.id)::integer as item_count,
  count(distinct evidence.id) filter (where evidence.status = 'attached')::integer as evidence_count,
  coalesce(sum(item.refund_amount_minor), 0)::bigint as proposed_refund_minor,
  order_record.currency
from public.return_requests request
join public.orders order_record on order_record.id = request.order_id
left join public.return_items item on item.return_request_id = request.id
left join public.return_evidence evidence on evidence.return_request_id = request.id
where public.is_active_staff()
group by request.id, order_record.id;

grant select on public.staff_return_queue to authenticated;

comment on view public.staff_return_queue is
  'Manager/Owner-only minimized returns queue; full buyer contact and evidence objects remain outside the list projection.';
comment on policy return_evidence_buyer_or_staff_read on public.return_evidence is
  'Metadata only. Storage has no browser SELECT policy; authorized server code issues short-lived signed URLs.';
