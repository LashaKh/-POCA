-- This inaccessible structural user gives local restore rehearsals the same
-- active-Owner invariant required in managed environments. It has no email,
-- password, identity, or session and cannot sign in. Browser tests create
-- disposable human-like staff through the Auth API instead.
insert into auth.users (
  id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
) values (
  '00000000-0000-4000-8000-000000000700',
  'authenticated',
  'authenticated',
  '{"provider":"local-fixture","providers":[]}'::jsonb,
  '{"fixture":true}'::jsonb,
  statement_timestamp(),
  statement_timestamp(),
  false,
  false
) on conflict (id) do nothing;

insert into public.profiles (
  id,
  profile_kind,
  display_name,
  locale,
  display_currency
) values (
  '00000000-0000-4000-8000-000000000700',
  'staff',
  'Local recovery fixture',
  'en',
  'GEL'
) on conflict (id) do nothing;

insert into public.staff_members (
  profile_id,
  role,
  active,
  mfa_required,
  activated_at
) values (
  '00000000-0000-4000-8000-000000000700',
  'owner',
  true,
  true,
  statement_timestamp()
) on conflict (profile_id) do nothing;

insert into public.release_records (
  id,
  release_id,
  commit_sha,
  environment,
  stage,
  status,
  schema_version,
  evidence,
  correlation_id
) values (
  '00000000-0000-4000-8000-000000000701',
  'local-seed-candidate',
  '0000000000000000000000000000000000000000',
  'local',
  'incomplete',
  'candidate',
  '202608250103',
  '{"gates":{"build":false,"migrations":true,"tests":false,"security":false},"fixture":true}'::jsonb,
  '00000000-0000-4000-8000-000000000702'
) on conflict (release_id) do nothing;

insert into public.readiness_assessments (
  id,
  environment,
  stage,
  decision,
  gates,
  blockers,
  release_record_id,
  correlation_id
) values (
  '00000000-0000-4000-8000-000000000703',
  'local',
  'incomplete',
  'hold',
  '{"build":false,"migrations":true,"tests":false,"security":false}'::jsonb,
  array['LOCAL_FIXTURE_ONLY'],
  '00000000-0000-4000-8000-000000000701',
  '00000000-0000-4000-8000-000000000704'
) on conflict (id) do nothing;

insert into public.health_snapshots (
  environment,
  release,
  overall,
  checks,
  correlation_id
) values (
  'local',
  'local-seed-candidate',
  'ok',
  '{"database":{"status":"ok"},"fixture":{"status":"ok","code":"SYNTHETIC_ONLY"}}'::jsonb,
  '00000000-0000-4000-8000-000000000705'
);
