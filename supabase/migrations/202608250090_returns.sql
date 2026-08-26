create type public.return_request_kind as enum ('cancellation', 'return');
create type public.return_request_status as enum (
  'requested',
  'needs_information',
  'approved',
  'rejected',
  'in_transit',
  'received',
  'inspected',
  'refund_pending',
  'refunded',
  'closed',
  'cancelled'
);
create type public.return_legal_status as enum ('draft_unapproved', 'approved');
create type public.return_evidence_status as enum ('pending', 'attached', 'removed', 'expired');
create type public.return_item_condition as enum (
  'unreported', 'unopened', 'like_new', 'used', 'damaged', 'missing'
);
create type public.restock_decision as enum ('pending', 'restock', 'do_not_restock');

create table public.return_policies (
  id uuid primary key default extensions.gen_random_uuid(),
  version text not null unique check (version ~ '^[A-Za-z0-9_.-]{3,80}$'),
  cancellation_window_hours integer not null check (cancellation_window_hours between 0 and 720),
  return_window_days integer not null check (return_window_days between 0 and 365),
  allowed_reasons text[] not null check (cardinality(allowed_reasons) between 1 and 30),
  max_evidence_files integer not null check (max_evidence_files between 0 and 10),
  max_evidence_bytes bigint not null check (max_evidence_bytes between 1024 and 10485760),
  allowed_evidence_types text[] not null,
  restock_mode text not null check (restock_mode in ('after_inspection', 'never')),
  legal_status public.return_legal_status not null default 'draft_unapproved',
  buyer_copy jsonb not null,
  active boolean not null default false,
  effective_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version_number public.safe_version not null default 1,
  constraint return_policy_types check (
    allowed_evidence_types <@ array['image/jpeg', 'image/png', 'image/webp']::text[]
    and cardinality(allowed_evidence_types) between 1 and 3
  ),
  constraint return_policy_copy check (jsonb_typeof(buyer_copy) = 'object'),
  constraint return_policy_activation check (
    (active and effective_at is not null) or not active
  )
);

create unique index return_policies_one_active
on public.return_policies (active)
where active;

create table public.return_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique check (reference ~ '^(RET|CAN)-[A-Z0-9]{12}$'),
  order_id uuid not null references public.orders(id) on delete restrict,
  customer_profile_id uuid references public.profiles(id) on delete restrict,
  guest_session_id uuid references public.guest_sessions(id) on delete restrict,
  request_kind public.return_request_kind not null,
  status public.return_request_status not null default 'requested',
  policy_id uuid not null references public.return_policies(id) on delete restrict,
  policy_version text not null,
  policy_snapshot jsonb not null,
  eligibility_snapshot jsonb not null,
  reason_code text not null check (reason_code ~ '^[a-z0-9_-]{2,60}$'),
  buyer_note text check (buyer_note is null or char_length(buyer_note) <= 2000),
  buyer_locale public.app_locale not null,
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  decision_reason text check (decision_reason is null or char_length(decision_reason) between 2 and 2000),
  decision_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  received_at timestamptz,
  inspected_at timestamptz,
  refunded_at timestamptz,
  closed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  correlation_id uuid not null default extensions.gen_random_uuid(),
  constraint return_request_one_buyer check (
    num_nonnulls(customer_profile_id, guest_session_id) = 1
  ),
  constraint return_request_snapshots check (
    jsonb_typeof(policy_snapshot) = 'object'
    and jsonb_typeof(eligibility_snapshot) = 'object'
  ),
  constraint return_request_decision check (
    (status in ('rejected', 'approved', 'in_transit', 'received', 'inspected', 'refund_pending', 'refunded', 'closed')
      and decision_reason is not null and decision_by is not null and decided_at is not null)
    or status in ('requested', 'needs_information', 'cancelled')
  ),
  unique (order_id, request_kind, idempotency_key_hash)
);

create unique index return_requests_one_open_kind
on public.return_requests (order_id, request_kind)
where status not in ('rejected', 'closed', 'cancelled');
create index return_requests_staff_queue
on public.return_requests (status, created_at, id);
create index return_requests_customer
on public.return_requests (customer_profile_id, created_at desc)
where customer_profile_id is not null;

create table public.return_items (
  id uuid primary key default extensions.gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  order_line_id uuid not null references public.order_lines(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  condition public.return_item_condition not null default 'unreported',
  inspection_note text check (inspection_note is null or char_length(inspection_note) <= 1000),
  restock_decision public.restock_decision not null default 'pending',
  refund_amount_minor public.money_minor,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (return_request_id, order_line_id)
);

create table public.return_events (
  id bigint generated always as identity primary key,
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  event_type text not null check (event_type ~ '^[a-z0-9-]{2,80}$'),
  from_status public.return_request_status,
  to_status public.return_request_status not null,
  actor_class text not null check (actor_class in ('guest', 'customer', 'manager', 'owner', 'service')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint return_event_metadata check (jsonb_typeof(safe_metadata) = 'object')
);

create index return_events_timeline
on public.return_events (return_request_id, occurred_at, id);

create table public.return_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  audience text not null check (audience in ('buyer', 'staff', 'all')),
  body text not null check (char_length(body) between 2 and 2000),
  created_by uuid references public.profiles(id) on delete set null,
  actor_class text not null check (actor_class in ('guest', 'customer', 'manager', 'owner', 'service')),
  created_at timestamptz not null default statement_timestamp()
);

create table public.return_evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  bucket text not null default 'return-evidence' check (bucket = 'return-evidence'),
  storage_path text not null unique check (
    storage_path !~ '(^|/)\.\.(/|$)' and char_length(storage_path) between 12 and 500
  ),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  status public.return_evidence_status not null default 'pending',
  retention_until timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  attached_at timestamptz,
  removed_at timestamptz,
  constraint return_evidence_state check (
    (status = 'pending' and attached_at is null and removed_at is null)
    or (status = 'attached' and attached_at is not null and removed_at is null)
    or (status in ('removed', 'expired') and removed_at is not null)
  )
);

create table public.return_inspections (
  id uuid primary key default extensions.gen_random_uuid(),
  return_request_id uuid not null unique references public.return_requests(id) on delete restrict,
  summary text not null check (char_length(summary) between 2 and 2000),
  received_package_condition text check (
    received_package_condition is null or char_length(received_package_condition) <= 500
  ),
  inspected_by uuid not null references public.profiles(id) on delete restrict,
  inspected_at timestamptz not null default statement_timestamp(),
  correlation_id uuid not null
);

create table public.return_decisions (
  id uuid primary key default extensions.gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  decision text not null check (decision in ('information_requested', 'approved', 'rejected', 'cancelled', 'closed')),
  reason text not null check (char_length(reason) between 2 and 2000),
  decided_by uuid references public.profiles(id) on delete set null,
  actor_class text not null check (actor_class in ('guest', 'customer', 'manager', 'owner', 'service')),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 180),
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp()
);

create table public.return_restock_links (
  id uuid primary key default extensions.gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  return_item_id uuid not null unique references public.return_items(id) on delete restrict,
  inventory_adjustment_id uuid not null unique references public.inventory_adjustments(id) on delete restrict,
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 180),
  applied_by uuid references public.profiles(id) on delete set null,
  applied_at timestamptz not null default statement_timestamp()
);

create table public.return_refund_links (
  id uuid primary key default extensions.gen_random_uuid(),
  return_request_id uuid not null references public.return_requests(id) on delete restrict,
  refund_record_id uuid not null unique references public.refund_records(id) on delete restrict,
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 180),
  created_at timestamptz not null default statement_timestamp()
);

alter table public.operational_alerts
add column return_request_id uuid references public.return_requests(id) on delete set null;

create or replace function app_private.set_return_policy_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  new.version_number = old.version_number + 1;
  return new;
end;
$$;

create trigger return_policies_set_updated_at before update on public.return_policies
for each row execute function app_private.set_return_policy_updated_at();
create trigger return_requests_set_updated_at before update on public.return_requests
for each row execute function app_private.set_updated_at();
create trigger return_items_set_updated_at before update on public.return_items
for each row execute function app_private.set_updated_at();
create trigger return_events_append_only before update or delete on public.return_events
for each row execute function app_private.reject_immutable_change();
create trigger return_decisions_append_only before update or delete on public.return_decisions
for each row execute function app_private.reject_immutable_change();
create trigger return_restock_links_append_only before update or delete on public.return_restock_links
for each row execute function app_private.reject_immutable_change();
create trigger return_refund_links_append_only before update or delete on public.return_refund_links
for each row execute function app_private.reject_immutable_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'return-evidence',
  'return-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.return_policies (
  id,
  version,
  cancellation_window_hours,
  return_window_days,
  allowed_reasons,
  max_evidence_files,
  max_evidence_bytes,
  allowed_evidence_types,
  restock_mode,
  legal_status,
  buyer_copy,
  active,
  effective_at
) values (
  '91000000-0000-4000-8000-000000000090',
  'returns-v1-draft',
  24,
  14,
  array['changed_mind', 'damaged', 'not_as_described', 'wrong_item', 'other'],
  5,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp'],
  'after_inspection',
  'draft_unapproved',
  jsonb_build_object(
    'ka', 'ოპერაციული მონახაზი — იურიდიული ტექსტი ჯერ არ არის დამტკიცებული.',
    'en', 'Operational draft — legal policy copy is not yet approved.',
    'de', 'Betrieblicher Entwurf — der Rechtstext ist noch nicht freigegeben.',
    'ru', 'Рабочий черновик — юридический текст пока не утверждён.'
  ),
  true,
  statement_timestamp()
);

comment on table public.return_requests is
  'Buyer-owned cancellation/return case with immutable policy and eligibility snapshots.';
comment on table public.return_evidence is
  'Private, bounded evidence metadata. Objects stay in a non-public bucket and are served only by short-lived authorized URLs.';
