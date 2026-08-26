create type public.staff_invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
create type public.privacy_request_type as enum ('access', 'export', 'correction', 'deletion');
create type public.privacy_request_status as enum ('requested', 'verified', 'processing', 'complete', 'rejected', 'cancelled');

alter table public.staff_members
  add column deactivation_reason text check (deactivation_reason is null or char_length(deactivation_reason) <= 500),
  add column role_changed_at timestamptz,
  add column role_changed_by uuid references public.profiles(id) on delete set null;

alter table public.app_sessions
  add column device_label text check (device_label is null or char_length(device_label) <= 120);

alter table public.audit_events
  add column retention_class text not null default 'standard'
    check (retention_class in ('standard', 'security', 'financial', 'privacy')),
  add column contains_personal_data boolean not null default false;

create table public.staff_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  email extensions.citext not null,
  role public.staff_role not null,
  status public.staff_invitation_status not null default 'pending',
  auth_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  accepted_at timestamptz,
  expires_at timestamptz not null default statement_timestamp() + interval '7 days',
  revoked_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint staff_invitation_expiry check (expires_at > created_at),
  constraint staff_invitation_state check (
    (status = 'accepted' and accepted_at is not null and auth_user_id is not null)
    or (status = 'revoked' and revoked_at is not null)
    or status in ('pending', 'expired')
  )
);

create unique index staff_invitations_pending_email
on public.staff_invitations (email)
where status = 'pending';

create table public.protected_operations (
  id uuid primary key default extensions.gen_random_uuid(),
  operation_type text not null check (operation_type in (
    'staff-deactivate', 'staff-role-change', 'session-revoke-all',
    'privacy-delete', 'retention-change', 'export-sensitive'
  )),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text not null check (char_length(entity_id) between 1 and 160),
  impact_summary text not null check (char_length(impact_summary) between 2 and 500),
  exact_confirmation text not null check (char_length(exact_confirmation) between 4 and 240),
  reason text not null check (char_length(reason) between 2 and 500),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  assurance_level text not null check (assurance_level = 'aal2'),
  correlation_id uuid not null,
  completed_at timestamptz not null default statement_timestamp()
);

create table public.privacy_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  subject_profile_id uuid not null references public.profiles(id) on delete restrict,
  request_type public.privacy_request_type not null,
  status public.privacy_request_status not null default 'requested',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 2 and 500),
  verified_at timestamptz,
  completed_at timestamptz,
  safe_result_code text check (safe_result_code is null or safe_result_code ~ '^[A-Z0-9_]{2,80}$'),
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create index privacy_requests_subject_time
on public.privacy_requests (subject_profile_id, created_at desc);

create trigger staff_invitations_set_updated_at before update on public.staff_invitations
for each row execute function app_private.set_updated_at();
create trigger privacy_requests_set_updated_at before update on public.privacy_requests
for each row execute function app_private.set_updated_at();
create trigger protected_operations_append_only before update or delete on public.protected_operations
for each row execute function app_private.reject_immutable_change();
create trigger audit_events_append_only before update or delete on public.audit_events
for each row execute function app_private.reject_immutable_change();

comment on table public.protected_operations is
  'Append-only evidence that an MFA-assured Owner completed an exact-impact confirmation.';
comment on table public.staff_invitations is
  'Owner-only staff lifecycle metadata. Email is never projected into general staff or audit views.';
