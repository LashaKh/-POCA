alter type public.order_status add value if not exists 'processing';
alter type public.order_status add value if not exists 'shipped';
alter type public.order_status add value if not exists 'delivered';

create table public.provider_event_inbox (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null check (char_length(provider) between 1 and 80),
  event_key text not null check (char_length(event_key) between 1 and 180),
  event_type text not null check (char_length(event_type) between 1 and 100),
  subject_reference text check (subject_reference is null or char_length(subject_reference) <= 180),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  signature_valid boolean not null,
  status text not null default 'received'
    check (status in ('received', 'processing', 'complete', 'failed', 'rejected')),
  safe_metadata jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default statement_timestamp(),
  lease_owner text,
  lease_expires_at timestamptz,
  safe_error_code text check (safe_error_code is null or safe_error_code ~ '^[A-Z0-9_]{2,80}$'),
  correlation_id uuid not null default extensions.gen_random_uuid(),
  received_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  unique (provider, event_key),
  constraint provider_event_metadata_object check (jsonb_typeof(safe_metadata) = 'object'),
  constraint provider_event_lease_consistent check (
    (status = 'processing' and lease_owner is not null and lease_expires_at is not null)
    or status <> 'processing'
  )
);

create index provider_event_inbox_claim
on public.provider_event_inbox (next_attempt_at, received_at)
where status in ('received', 'failed');

create table public.payment_reconciliations (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  reconciliation_kind text not null
    check (reconciliation_kind in ('bank_transfer', 'provider_status', 'late_payment', 'refund')),
  status text not null default 'pending'
    check (status in ('pending', 'matched', 'rejected', 'unmatched', 'confirmed', 'late')),
  provider_event_inbox_id uuid references public.provider_event_inbox(id) on delete set null,
  external_reference text check (external_reference is null or char_length(external_reference) <= 180),
  amount_minor public.money_minor,
  currency public.currency_code,
  evidence_path text check (evidence_path is null or char_length(evidence_path) <= 500),
  safe_reason text check (safe_reason is null or char_length(safe_reason) <= 500),
  first_reviewed_by uuid references public.profiles(id) on delete set null,
  confirmed_by uuid references public.profiles(id) on delete set null,
  first_reviewed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint reconciliation_money_complete check (num_nonnulls(amount_minor, currency) in (0, 2)),
  constraint reconciliation_dual_review check (
    confirmed_by is null or (
      first_reviewed_by is not null and confirmed_by <> first_reviewed_by
      and first_reviewed_at is not null and confirmed_at is not null
    )
  )
);

create index payment_reconciliations_queue
on public.payment_reconciliations (status, created_at)
where status in ('pending', 'unmatched', 'late');

create table public.refund_records (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  amount_minor public.money_minor not null check (amount_minor > 0),
  currency public.currency_code not null,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'succeeded', 'failed', 'cancelled')),
  reason text not null check (char_length(reason) between 2 and 500),
  provider_reference text check (provider_reference is null or char_length(provider_reference) <= 180),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 180),
  requested_by uuid references public.profiles(id) on delete set null,
  processed_by uuid references public.profiles(id) on delete set null,
  safe_error_code text check (safe_error_code is null or safe_error_code ~ '^[A-Z0-9_]{2,80}$'),
  correlation_id uuid not null default extensions.gen_random_uuid(),
  requested_at timestamptz not null default statement_timestamp(),
  processed_at timestamptz,
  version public.safe_version not null default 1
);

create index refund_records_order on public.refund_records (order_id, requested_at desc);

create table public.fulfillments (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'dispatched', 'delivered', 'cancelled')),
  carrier text not null check (char_length(carrier) between 2 and 120),
  service_level text check (service_level is null or char_length(service_level) <= 120),
  tracking_reference text not null check (char_length(tracking_reference) between 2 and 180),
  tracking_url text check (tracking_url is null or char_length(tracking_url) <= 500),
  created_by uuid references public.profiles(id) on delete set null,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (order_id, tracking_reference),
  constraint fulfillment_timestamps check (
    (status = 'pending' and dispatched_at is null and delivered_at is null)
    or (status = 'dispatched' and dispatched_at is not null and delivered_at is null)
    or (status = 'delivered' and dispatched_at is not null and delivered_at is not null)
    or status = 'cancelled'
  )
);

create index fulfillments_order on public.fulfillments (order_id, created_at desc);

create table public.shipment_events (
  id bigint generated always as identity primary key,
  fulfillment_id uuid not null references public.fulfillments(id) on delete restrict,
  event_key text not null check (char_length(event_key) between 8 and 180),
  event_type text not null check (char_length(event_type) between 2 and 100),
  safe_location text check (safe_location is null or char_length(safe_location) <= 160),
  safe_metadata jsonb not null default '{}'::jsonb,
  actor_class text not null check (actor_class in ('manager', 'owner', 'service')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null default extensions.gen_random_uuid(),
  occurred_at timestamptz not null default clock_timestamp(),
  unique (fulfillment_id, event_key),
  constraint shipment_event_metadata_object check (jsonb_typeof(safe_metadata) = 'object')
);

create table public.order_internal_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  note text not null check (char_length(note) between 2 and 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp()
);

alter table public.notification_attempts
add column order_id uuid references public.orders(id) on delete set null,
add column provider_event_inbox_id uuid references public.provider_event_inbox(id) on delete set null;

alter table public.operational_alerts
add column order_id uuid references public.orders(id) on delete set null,
add column payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
add column refund_record_id uuid references public.refund_records(id) on delete set null;

create unique index payment_attempts_provider_reference
on public.payment_attempts (provider, provider_reference)
where provider_reference is not null;

create trigger payment_reconciliations_set_updated_at
before update on public.payment_reconciliations
for each row execute function app_private.set_updated_at();
create trigger refund_records_set_updated_at
before update on public.refund_records
for each row execute function app_private.set_updated_at();
create trigger fulfillments_set_updated_at
before update on public.fulfillments
for each row execute function app_private.set_updated_at();

create trigger shipment_events_append_only
before update or delete on public.shipment_events
for each row execute function app_private.reject_immutable_change();
create trigger order_internal_notes_append_only
before update or delete on public.order_internal_notes
for each row execute function app_private.reject_immutable_change();

comment on table public.provider_event_inbox is
  'Privacy-safe idempotent provider-event inbox; raw payment payloads are never stored.';
comment on table public.payment_reconciliations is
  'Authoritative payment and dual-review transfer reconciliation history.';
