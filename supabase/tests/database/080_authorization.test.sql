begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select ok(to_regclass('public.staff_invitations') is not null, 'staff invitations exist');
select ok(to_regclass('public.protected_operations') is not null, 'protected operations exist');
select ok(to_regclass('public.privacy_requests') is not null, 'privacy requests exist');
select ok(to_regclass('public.integration_status_safe') is not null, 'secret-free integration status exists');
select has_function('public', 'record_current_session', array['uuid','text','text','text','timestamp with time zone','text'], 'session registration command exists');
select has_function('public', 'manage_staff_member', array['uuid','staff_role','boolean','text','bigint'], 'staff lifecycle command exists');
select has_function('public', 'revoke_app_sessions', array['uuid','uuid','text'], 'session revocation command exists');
select has_function('public', 'record_protected_operation', array['text','text','text','text','text'], 'exact confirmation command exists');
select has_function('public', 'request_privacy_operation', array['uuid','privacy_request_type','text'], 'privacy request command exists');
select has_function('public', 'revoke_current_session', array['text'], 'current-session revocation command exists');
select has_function('public', 'request_audit_export', array['jsonb','text'], 'bounded audit export command exists');
select has_function('public', 'run_security_maintenance', array[]::text[], 'security maintenance command exists');
select ok((select relforcerowsecurity from pg_class where oid = 'public.staff_invitations'::regclass), 'staff invitation RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.protected_operations'::regclass), 'protected operation RLS is forced');
select ok(not has_table_privilege('authenticated', 'public.staff_members', 'update'), 'browser cannot bypass staff lifecycle command');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'insert'), 'browser cannot forge audit evidence');
select ok(not has_table_privilege('anon', 'public.integration_status_safe', 'select'), 'anonymous users cannot inspect integration status');

insert into auth.users (id, email) values
  ('91000000-0000-4000-8000-000000000001', 'owner-one@epoca.test'),
  ('91000000-0000-4000-8000-000000000002', 'owner-two@epoca.test'),
  ('91000000-0000-4000-8000-000000000003', 'manager@epoca.test'),
  ('91000000-0000-4000-8000-000000000004', 'customer@epoca.test');
insert into public.profiles (id, profile_kind, display_name) values
  ('91000000-0000-4000-8000-000000000001', 'staff', 'Owner One'),
  ('91000000-0000-4000-8000-000000000002', 'staff', 'Owner Two'),
  ('91000000-0000-4000-8000-000000000003', 'staff', 'Manager'),
  ('91000000-0000-4000-8000-000000000004', 'customer', 'Customer');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at) values
  ('91000000-0000-4000-8000-000000000001', 'owner', true, true, statement_timestamp()),
  ('91000000-0000-4000-8000-000000000002', 'owner', true, true, statement_timestamp()),
  ('91000000-0000-4000-8000-000000000003', 'manager', true, false, statement_timestamp());
update public.staff_members
set active = false, deactivated_at = statement_timestamp(),
  deactivation_reason = 'Isolate authorization transaction'
where role = 'owner' and active
  and profile_id not in (
    '91000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000002'
  );
insert into public.integration_configs (key, mode, capabilities, safe_reason, secret_configured)
values ('test-payment', 'sandbox', array['status'], 'Sandbox check', true);
insert into public.business_settings (key, value, sensitive) values
  ('public.notice', '{"enabled":true}', false),
  ('private.bank', '{"account":"redacted-fixture"}', true);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1","session_id":"91000000-0000-4000-8000-000000000103"}', true);
select is((select count(*) from public.staff_members), 1::bigint, 'Manager sees only their own staff record');
select is((select count(*) from public.business_settings), 1::bigint, 'Manager sees only non-sensitive settings');
select is((select count(*) from public.integration_status_safe where key = 'test-payment'), 1::bigint, 'Manager sees safe integration status');
select throws_ok(
  $$select public.manage_staff_member('91000000-0000-4000-8000-000000000003', 'manager', false, 'Unauthorized self change', 1)$$,
  '42501', 'FORBIDDEN', 'Manager cannot manage staff lifecycle'
);
select is(
  (public.record_current_session(
    '91000000-0000-4000-8000-000000000103', 'aal1', 'Test browser', repeat('a', 64),
    statement_timestamp() + interval '1 hour', 'Manager laptop'
  )).assurance_level,
  'aal1',
  'authenticated user registers only the current JWT session'
);
select throws_ok(
  $$select public.record_current_session(
    '91000000-0000-4000-8000-000000000999', 'aal1', 'Test browser', repeat('a', 64),
    statement_timestamp() + interval '1 hour', null
  )$$,
  '22023', 'INVALID_SESSION_REGISTRATION', 'session registration cannot spoof another session id'
);

select set_config('request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"91000000-0000-4000-8000-000000000101"}', true);
select is((select count(*) from public.staff_members), 1::bigint, 'AAL1 Owner cannot enumerate staff');
select is((select count(*) from public.audit_events), 0::bigint, 'AAL1 Owner cannot read audit evidence');
select throws_ok(
  $$select public.manage_staff_member('91000000-0000-4000-8000-000000000003', 'manager', false, 'AAL1 attempt', 1)$$,
  '42501', 'MFA_REQUIRED', 'staff changes require Owner AAL2 assurance'
);

select set_config('request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"91000000-0000-4000-8000-000000000101"}', true);
select is((
  select count(*) from public.staff_members
  where profile_id in (
    '91000000-0000-4000-8000-000000000001',
    '91000000-0000-4000-8000-000000000002',
    '91000000-0000-4000-8000-000000000003'
  )
), 3::bigint, 'AAL2 Owner can inspect all fixture staff');
select is((select count(*) from public.business_settings where key = 'private.bank'), 1::bigint, 'AAL2 Owner can inspect sensitive settings');
select is(
  (public.record_protected_operation(
    'staff-deactivate', 'staff', '91000000-0000-4000-8000-000000000003',
    'STAFF DEACTIVATE 91000000-0000-4000-8000-000000000003',
    'Deactivate departed Manager'
  )).assurance_level,
  'aal2',
  'Manager deactivation requires exact Owner confirmation'
);
select is(
  (public.manage_staff_member(
    '91000000-0000-4000-8000-000000000003', 'manager', false,
    'Deactivate departed Manager', 1
  )).active,
  false,
  'AAL2 Owner deactivates a Manager'
);
select ok((select revoked_at is not null from public.app_sessions where auth_session_id = '91000000-0000-4000-8000-000000000103'), 'staff deactivation revokes active sessions');
select is((
  select count(*) from public.audit_events
  where action = 'security.staff.manage'
    and entity_id = '91000000-0000-4000-8000-000000000003'
), 1::bigint, 'staff change creates privacy-safe audit evidence');

select is(
  (public.record_protected_operation(
    'staff-deactivate', 'staff', '91000000-0000-4000-8000-000000000002',
    'STAFF DEACTIVATE 91000000-0000-4000-8000-000000000002',
    'Remove second test Owner'
  )).assurance_level,
  'aal2',
  'Owner deactivation requires exact Owner confirmation'
);
select is(
  (public.manage_staff_member(
    '91000000-0000-4000-8000-000000000002', 'owner', false,
    'Remove second test Owner', 1
  )).active,
  false,
  'one of two Owners can be deactivated'
);
select is(
  (public.record_protected_operation(
    'staff-deactivate', 'staff', '91000000-0000-4000-8000-000000000001',
    'STAFF DEACTIVATE 91000000-0000-4000-8000-000000000001',
    'Attempt to remove final Owner'
  )).assurance_level,
  'aal2',
  'last-Owner attempt still requires exact confirmation'
);
select throws_ok(
  $$select public.manage_staff_member(
    '91000000-0000-4000-8000-000000000001', 'owner', false,
    'Attempt to remove final Owner', 1
  )$$,
  '55000', 'LAST_ACTIVE_OWNER', 'last active Owner is protected'
);
select throws_ok(
  $$select public.record_protected_operation(
    'session-revoke-all', 'profile', '91000000-0000-4000-8000-000000000003',
    'wrong phrase', 'Security response'
  )$$,
  '22023', 'EXACT_CONFIRMATION_REQUIRED', 'protected operation requires exact impact phrase'
);
select is(
  (public.record_protected_operation(
    'session-revoke-all', 'profile', '91000000-0000-4000-8000-000000000003',
    'SESSION REVOKE ALL 91000000-0000-4000-8000-000000000003', 'Security response'
  )).assurance_level,
  'aal2',
  'exact Owner confirmation records immutable AAL2 evidence'
);
select throws_ok(
  $$update public.protected_operations set reason = 'changed'$$,
  '42501', null, 'protected operation evidence is immutable'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select throws_ok(
  $$insert into public.audit_events (
    actor_class, action, entity_type, result, source, correlation_id, summary
  ) values (
    'service', 'security.test', 'test', 'failed', 'test',
    extensions.gen_random_uuid(), '{"password":"must-not-enter-audit"}'::jsonb
  )$$,
  '22023', 'SENSITIVE_AUDIT_SUMMARY', 'audit summaries reject sensitive keys'
);
select throws_ok(
  $$update public.audit_events set result = 'failed' where action = 'security.staff.manage'$$,
  '55000', 'IMMUTABLE_AUDIT_EVENT', 'audit evidence is append-only even for service context'
);
select ok(not has_function_privilege('authenticated', 'public.run_security_maintenance()', 'execute'), 'browser cannot run security maintenance');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal1","session_id":"91000000-0000-4000-8000-000000000104"}', true);
select is(
  (public.request_privacy_operation(
    '91000000-0000-4000-8000-000000000004', 'access', 'Customer access request'
  )).status,
  'requested'::public.privacy_request_status,
  'customer can request access to their own data'
);
select is((select count(*) from public.privacy_requests), 1::bigint, 'customer sees their own privacy request');
select throws_ok(
  $$select public.request_privacy_operation(
    '91000000-0000-4000-8000-000000000003', 'access', 'Cross-profile request'
  )$$,
  '42501', 'FORBIDDEN', 'customer cannot request another profile operation'
);
select is((select count(*) from public.audit_events), 0::bigint, 'customer cannot inspect audit evidence');

set local role anon;
select throws_ok(
  $$select count(*) from public.integration_status_safe$$,
  '42501', null, 'anonymous role cannot inspect integration status'
);

select * from finish();
rollback;
