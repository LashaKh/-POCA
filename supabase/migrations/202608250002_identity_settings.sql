create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  profile_kind public.profile_kind not null default 'customer',
  display_name text check (display_name is null or char_length(display_name) between 1 and 160),
  locale public.app_locale not null default 'ka',
  display_currency public.currency_code not null default 'GEL',
  marketing_status public.consent_choice,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create table public.staff_members (
  profile_id uuid primary key references public.profiles (id) on delete restrict,
  role public.staff_role not null,
  active boolean not null default false,
  mfa_required boolean not null default false,
  invited_by uuid references public.profiles (id) on delete set null,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint staff_owner_requires_mfa check (role <> 'owner' or mfa_required),
  constraint staff_activation_consistent check (
    (active and activated_at is not null and deactivated_at is null)
    or (not active)
  )
);

create table public.app_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_session_id uuid not null unique,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  assurance_level text not null check (assurance_level in ('aal1', 'aal2')),
  user_agent_summary text check (user_agent_summary is null or char_length(user_agent_summary) <= 240),
  ip_prefix_hash text check (ip_prefix_hash is null or char_length(ip_prefix_hash) <= 128),
  created_at timestamptz not null default statement_timestamp(),
  last_seen_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason is null or char_length(revoked_reason) <= 240),
  revoked_by uuid references public.profiles (id) on delete set null,
  constraint app_session_time_order check (expires_at > created_at),
  constraint app_session_revocation_consistent check (
    (revoked_at is null and revoked_reason is null and revoked_by is null)
    or revoked_at is not null
  )
);

create index app_sessions_profile_active_idx
  on public.app_sessions (profile_id, expires_at desc)
  where revoked_at is null;

create table public.consent_records (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete restrict,
  guest_subject_hash text,
  purpose text not null check (purpose in ('analytics', 'newsletter', 'marketing')),
  choice public.consent_choice not null,
  disclosure_version text not null check (char_length(disclosure_version) between 1 and 80),
  locale public.app_locale not null,
  source text not null check (char_length(source) between 1 and 80),
  supersedes_id uuid references public.consent_records (id) on delete restrict,
  recorded_at timestamptz not null default statement_timestamp(),
  constraint consent_one_subject check (
    num_nonnulls(profile_id, guest_subject_hash) = 1
  ),
  constraint consent_guest_hash_bounded check (
    guest_subject_hash is null or char_length(guest_subject_hash) between 32 and 128
  )
);

create index consent_profile_current_idx
  on public.consent_records (profile_id, purpose, recorded_at desc)
  where profile_id is not null;

create table public.business_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  value jsonb not null default '{}'::jsonb,
  value_schema_version integer not null default 1 check (value_schema_version > 0),
  sensitive boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create table public.integration_configs (
  key text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  mode public.integration_mode not null default 'disabled',
  capabilities text[] not null default '{}',
  safe_reason text check (safe_reason is null or char_length(safe_reason) <= 240),
  secret_configured boolean not null default false,
  last_checked_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint live_integration_requires_secret check (
    mode <> 'live' or secret_configured
  )
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

create trigger staff_members_set_updated_at
before update on public.staff_members
for each row execute function app_private.set_updated_at();

create trigger business_settings_set_updated_at
before update on public.business_settings
for each row execute function app_private.set_updated_at();

create trigger integration_configs_set_updated_at
before update on public.integration_configs
for each row execute function app_private.set_updated_at();
