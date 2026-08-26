alter table public.scheduled_actions
  add column lease_heartbeat_at timestamptz,
  add column last_run_id uuid;

create table public.scheduled_action_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  scheduled_action_id uuid not null references public.scheduled_actions(id) on delete restrict,
  run_key text not null unique check (char_length(run_key) between 16 and 200),
  worker_id text not null check (char_length(worker_id) between 3 and 160),
  attempt_number integer not null check (attempt_number between 1 and 30),
  status text not null check (status in ('leased', 'succeeded', 'failed', 'abandoned')),
  scheduled_for timestamptz not null,
  leased_at timestamptz not null default statement_timestamp(),
  heartbeat_at timestamptz not null default statement_timestamp(),
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  safe_error_code text check (safe_error_code is null or safe_error_code ~ '^[A-Z0-9_]{2,80}$'),
  result_summary jsonb not null default '{}'::jsonb,
  correlation_id uuid not null,
  constraint scheduled_run_summary_object check (jsonb_typeof(result_summary) = 'object'),
  constraint scheduled_run_completion check (
    (status = 'leased' and completed_at is null)
    or (status <> 'leased' and completed_at is not null)
  ),
  unique (scheduled_action_id, attempt_number)
);

alter table public.scheduled_actions
  add constraint scheduled_actions_last_run_fk
  foreign key (last_run_id) references public.scheduled_action_runs(id) on delete restrict;

create index scheduled_action_runs_action_time
on public.scheduled_action_runs (scheduled_action_id, leased_at desc);

create table public.operational_alert_occurrences (
  id bigint generated always as identity primary key,
  alert_id uuid not null references public.operational_alerts(id) on delete restrict,
  observed_at timestamptz not null default statement_timestamp(),
  correlation_id uuid,
  safe_context jsonb not null default '{}'::jsonb,
  constraint alert_occurrence_context_object check (jsonb_typeof(safe_context) = 'object')
);

create index operational_alert_occurrences_alert_time
on public.operational_alert_occurrences (alert_id, observed_at desc);

create table public.health_snapshots (
  id bigint generated always as identity primary key,
  recorded_at timestamptz not null default statement_timestamp(),
  environment text not null check (environment in ('local', 'preview', 'staging', 'production')),
  release text not null check (char_length(release) between 1 and 120),
  overall text not null check (overall in ('ok', 'degraded', 'down')),
  checks jsonb not null,
  correlation_id uuid not null,
  constraint health_checks_object check (jsonb_typeof(checks) = 'object')
);

create index health_snapshots_environment_time
on public.health_snapshots (environment, recorded_at desc);

create table public.release_records (
  id uuid primary key default extensions.gen_random_uuid(),
  release_id text not null unique check (release_id ~ '^[A-Za-z0-9_.:-]{3,120}$'),
  commit_sha text not null check (commit_sha ~ '^[a-f0-9]{7,64}$'),
  environment text not null check (environment in ('local', 'preview', 'staging', 'production')),
  stage text not null check (stage in ('incomplete', 'build-complete', 'payment-ready', 'staging-operational', 'launch-ready')),
  status text not null check (status in ('building', 'candidate', 'promoted', 'failed', 'rolled-back')),
  schema_version text not null check (schema_version ~ '^[A-Za-z0-9_.:-]{3,120}$'),
  netlify_deploy_id text check (netlify_deploy_id is null or netlify_deploy_id ~ '^[A-Za-z0-9_-]{3,160}$'),
  previous_release_id uuid references public.release_records(id) on delete restrict,
  rollback_reason_code text check (rollback_reason_code is null or rollback_reason_code ~ '^[A-Z0-9_]{2,80}$'),
  evidence jsonb not null default '{}'::jsonb,
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint release_evidence_object check (jsonb_typeof(evidence) = 'object'),
  constraint release_rollback_metadata check (
    status <> 'rolled-back'
    or (previous_release_id is not null and rollback_reason_code is not null)
  )
);

create index release_records_environment_time
on public.release_records (environment, created_at desc);

create table public.backup_restore_evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  evidence_type text not null check (evidence_type in ('backup', 'restore', 'integrity')),
  environment text not null check (environment in ('local', 'preview', 'staging', 'production', 'isolated-restore')),
  status text not null check (status in ('started', 'passed', 'failed', 'blocked')),
  backup_as_of timestamptz,
  started_at timestamptz not null,
  completed_at timestamptz,
  rpo_seconds integer check (rpo_seconds is null or rpo_seconds >= 0),
  rto_seconds integer check (rto_seconds is null or rto_seconds >= 0),
  checks jsonb not null default '{}'::jsonb,
  artifact_reference text check (artifact_reference is null or char_length(artifact_reference) between 3 and 300),
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint backup_restore_checks_object check (jsonb_typeof(checks) = 'object'),
  constraint backup_restore_completion check (
    (status = 'started' and completed_at is null)
    or (status <> 'started' and completed_at is not null)
  )
);

create table public.readiness_assessments (
  id uuid primary key default extensions.gen_random_uuid(),
  environment text not null check (environment in ('local', 'preview', 'staging', 'production')),
  stage text not null check (stage in ('incomplete', 'build-complete', 'payment-ready', 'staging-operational', 'launch-ready')),
  decision text not null check (decision in ('hold', 'promote')),
  gates jsonb not null,
  blockers text[] not null default '{}',
  release_record_id uuid references public.release_records(id) on delete restrict,
  correlation_id uuid not null,
  evaluated_at timestamptz not null default statement_timestamp(),
  constraint readiness_gates_object check (jsonb_typeof(gates) = 'object'),
  constraint readiness_promotion_truth check (
    decision <> 'promote'
    or (stage = 'launch-ready' and cardinality(blockers) = 0)
  )
);

create index readiness_assessments_environment_time
on public.readiness_assessments (environment, evaluated_at desc);

alter table public.scheduled_action_runs enable row level security;
alter table public.operational_alert_occurrences enable row level security;
alter table public.health_snapshots enable row level security;
alter table public.release_records enable row level security;
alter table public.backup_restore_evidence enable row level security;
alter table public.readiness_assessments enable row level security;

alter table public.scheduled_action_runs force row level security;
alter table public.operational_alert_occurrences force row level security;
alter table public.health_snapshots force row level security;
alter table public.release_records force row level security;
alter table public.backup_restore_evidence force row level security;
alter table public.readiness_assessments force row level security;

revoke all on public.scheduled_action_runs from public, anon, authenticated;
revoke all on public.operational_alert_occurrences from public, anon, authenticated;
revoke all on public.health_snapshots from public, anon, authenticated;
revoke all on public.release_records from public, anon, authenticated;
revoke all on public.backup_restore_evidence from public, anon, authenticated;
revoke all on public.readiness_assessments from public, anon, authenticated;

grant select on public.scheduled_action_runs to authenticated;
grant select on public.operational_alert_occurrences to authenticated;
grant select on public.health_snapshots to authenticated;
grant select on public.release_records to authenticated;
grant select on public.backup_restore_evidence to authenticated;
grant select on public.readiness_assessments to authenticated;
grant all on public.scheduled_action_runs to service_role;
grant all on public.operational_alert_occurrences to service_role;
grant all on public.health_snapshots to service_role;
grant all on public.release_records to service_role;
grant all on public.backup_restore_evidence to service_role;
grant all on public.readiness_assessments to service_role;
grant usage, select on sequence public.operational_alert_occurrences_id_seq to service_role;
grant usage, select on sequence public.health_snapshots_id_seq to service_role;

create policy scheduled_action_runs_owner_read on public.scheduled_action_runs
for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create policy alert_occurrences_owner_read on public.operational_alert_occurrences
for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create policy health_snapshots_owner_read on public.health_snapshots
for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create policy release_records_owner_read on public.release_records
for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create policy backup_restore_evidence_owner_read on public.backup_restore_evidence
for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create policy readiness_assessments_owner_read on public.readiness_assessments
for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create trigger health_snapshots_append_only before update or delete on public.health_snapshots
for each row execute function app_private.reject_immutable_change();
create trigger operational_alert_occurrences_append_only before update or delete on public.operational_alert_occurrences
for each row execute function app_private.reject_immutable_change();
create trigger release_records_append_only before update or delete on public.release_records
for each row execute function app_private.reject_immutable_change();
create trigger backup_restore_evidence_append_only before update or delete on public.backup_restore_evidence
for each row execute function app_private.reject_immutable_change();
create trigger readiness_assessments_append_only before update or delete on public.readiness_assessments
for each row execute function app_private.reject_immutable_change();

comment on table public.scheduled_action_runs is
  'Durable attempt history for lease-safe scheduled work; payloads remain in authoritative domain tables.';
comment on table public.health_snapshots is
  'Secret-free point-in-time operational health evidence for Owner diagnosis and release gates.';
comment on table public.release_records is
  'Append-only release and rollback metadata; a rollback is a new record, never a history rewrite.';
comment on table public.backup_restore_evidence is
  'Timestamped backup, restore, and integrity evidence with measured RPO/RTO where available.';
comment on table public.readiness_assessments is
  'Truthful staged readiness decisions and explicit blockers; promotion cannot be recorded with blockers.';
