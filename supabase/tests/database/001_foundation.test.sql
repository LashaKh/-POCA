begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

select ok(to_regtype('public.app_locale') is not null, 'app_locale type exists');
select ok(to_regtype('public.staff_role') is not null, 'staff_role type exists');
select ok(to_regtype('public.money_minor') is not null, 'money domain exists');
select ok(to_regclass('public.profiles') is not null, 'profiles table exists');
select ok(to_regclass('public.staff_members') is not null, 'staff table exists');
select ok(to_regclass('public.app_sessions') is not null, 'app sessions table exists');
select ok(to_regclass('public.consent_records') is not null, 'consent table exists');
select ok(to_regclass('public.audit_events') is not null, 'audit table exists');
select ok(to_regclass('public.idempotency_keys') is not null, 'idempotency table exists');
select ok(to_regclass('public.notifications') is not null, 'notification outbox exists');
select ok(to_regclass('public.media_jobs') is not null, 'media jobs table exists');
select ok(to_regclass('public.scheduled_actions') is not null, 'scheduled actions table exists');

select lives_ok($$select 0::public.money_minor$$, 'zero minor money is valid');
select throws_ok(
  $$select (-1)::public.money_minor$$,
  '23514',
  null,
  'negative minor money is rejected'
);
select throws_ok(
  $$select 'gel'::public.currency_code$$,
  '23514',
  null,
  'lowercase currency is rejected'
);

select ok(has_table_privilege('anon', 'public.audit_events', 'select') is false, 'anon cannot read audit');
select ok(has_table_privilege('authenticated', 'public.idempotency_keys', 'select') is false, 'browser cannot read idempotency');
select ok(has_table_privilege('authenticated', 'public.notifications', 'insert') is false, 'browser cannot write outbox');
select ok(has_table_privilege('service_role', 'public.notifications', 'insert'), 'service can write outbox');

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'audit has RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'audit forces RLS');

select has_function('public', 'is_active_staff', array['staff_role'], 'staff authorization helper exists');
select has_function('public', 'has_auth_assurance', array['text'], 'assurance helper exists');
select has_function('app_private', 'claim_notifications', array['text', 'integer', 'interval'], 'notification lease helper exists');
select has_function('app_private', 'claim_media_jobs', array['text', 'integer', 'interval'], 'media lease helper exists');
select has_function('app_private', 'claim_scheduled_actions', array['text', 'integer', 'interval'], 'scheduled lease helper exists');

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-000000000001', 'owner-foundation@example.invalid');

insert into public.profiles (id, profile_kind, display_name)
values ('00000000-0000-4000-8000-000000000001', 'staff', 'Foundation Owner');

insert into public.staff_members (
  profile_id,
  role,
  active,
  mfa_required,
  activated_at
) values (
  '00000000-0000-4000-8000-000000000001',
  'owner',
  true,
  true,
  statement_timestamp()
);

update public.staff_members
set active = false, deactivated_at = statement_timestamp()
where role = 'owner' and active
  and profile_id <> '00000000-0000-4000-8000-000000000001';

select throws_ok(
  $$update public.staff_members set active = false where profile_id = '00000000-0000-4000-8000-000000000001'$$,
  'P0001',
  'LAST_OWNER_REQUIRED',
  'last active Owner cannot be deactivated'
);

select * from finish();
rollback;
