create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  actor_class text not null check (actor_class in ('anonymous', 'guest', 'customer', 'manager', 'owner', 'service')),
  action text not null check (char_length(action) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text check (entity_id is null or char_length(entity_id) <= 160),
  result text not null check (result in ('allowed', 'denied', 'succeeded', 'failed')),
  source text not null check (char_length(source) between 1 and 120),
  correlation_id uuid not null,
  summary jsonb not null default '{}'::jsonb,
  constraint audit_summary_object check (jsonb_typeof(summary) = 'object')
);

create index audit_events_entity_idx
  on public.audit_events (entity_type, entity_id, occurred_at desc);
create index audit_events_actor_idx
  on public.audit_events (actor_profile_id, occurred_at desc)
  where actor_profile_id is not null;
create index audit_events_correlation_idx
  on public.audit_events (correlation_id);

create table public.idempotency_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  scope text not null check (char_length(scope) between 1 and 120),
  key_hash text not null check (char_length(key_hash) between 32 and 128),
  actor_fingerprint text not null check (char_length(actor_fingerprint) between 1 and 160),
  request_hash text not null check (char_length(request_hash) between 32 and 128),
  status text not null default 'processing' check (status in ('processing', 'complete', 'failed')),
  response jsonb,
  locked_until timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  expires_at timestamptz not null,
  unique (scope, key_hash, actor_fingerprint),
  constraint idempotency_expiry check (expires_at > created_at),
  constraint idempotency_completion check (
    (status = 'processing' and completed_at is null)
    or (status <> 'processing' and completed_at is not null)
  )
);

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  purpose text not null check (char_length(purpose) between 1 and 100),
  locale public.app_locale not null,
  template_key text not null check (char_length(template_key) between 1 and 120),
  recipient_hash text not null check (char_length(recipient_hash) between 32 and 128),
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'pending',
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 160),
  available_at timestamptz not null default statement_timestamp(),
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 8 check (max_attempts between 1 and 20),
  last_error_code text,
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint notification_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint notification_lease_consistent check (
    (status = 'leased' and lease_owner is not null and lease_expires_at is not null)
    or status <> 'leased'
  )
);

create index notifications_claim_idx
  on public.notifications (available_at, created_at)
  where status in ('pending', 'failed');

create table public.notification_attempts (
  id bigint generated always as identity primary key,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  provider text not null check (char_length(provider) between 1 and 80),
  provider_reference text,
  outcome text not null check (outcome in ('sent', 'delivered', 'failed', 'bounced', 'uncertain')),
  safe_error_code text,
  started_at timestamptz not null,
  completed_at timestamptz,
  unique (notification_id, attempt_number)
);

create table public.operational_alerts (
  id uuid primary key default extensions.gen_random_uuid(),
  fingerprint text not null check (char_length(fingerprint) between 8 and 160),
  category text not null check (char_length(category) between 1 and 80),
  severity text not null check (severity in ('info', 'warning', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  safe_summary text not null check (char_length(safe_summary) between 1 and 500),
  correlation_id uuid,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen_at timestamptz not null default statement_timestamp(),
  last_seen_at timestamptz not null default statement_timestamp(),
  acknowledged_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  unique (fingerprint, status)
);

create table public.export_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  requested_by uuid not null references public.profiles (id) on delete restrict,
  export_type text not null check (char_length(export_type) between 1 and 80),
  scope jsonb not null default '{}'::jsonb,
  status public.work_status not null default 'pending',
  object_path text,
  available_at timestamptz not null default statement_timestamp(),
  lease_owner text,
  lease_expires_at timestamptz,
  expires_at timestamptz,
  safe_error_code text,
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint export_scope_object check (jsonb_typeof(scope) = 'object')
);

create table public.media_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  job_type text not null check (char_length(job_type) between 1 and 80),
  subject_id uuid,
  recipe_version text,
  status public.job_status not null default 'queued',
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  lease_owner text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default statement_timestamp(),
  progress_stage text,
  safe_error_code text,
  safe_error_summary text check (safe_error_summary is null or char_length(safe_error_summary) <= 500),
  correlation_id uuid not null,
  queued_at timestamptz not null default statement_timestamp(),
  started_at timestamptz,
  completed_at timestamptz
);

create index media_jobs_claim_idx
  on public.media_jobs (next_attempt_at, queued_at)
  where status in ('queued', 'retrying');

create table public.scheduled_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  action_type text not null check (char_length(action_type) between 1 and 100),
  subject_type text not null check (char_length(subject_type) between 1 and 80),
  subject_id uuid,
  due_at timestamptz not null,
  status public.work_status not null default 'pending',
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 160),
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 10 check (max_attempts between 1 and 30),
  safe_error_code text,
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz
);

create index scheduled_actions_claim_idx
  on public.scheduled_actions (due_at, created_at)
  where status in ('pending', 'failed');

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function app_private.set_updated_at();
