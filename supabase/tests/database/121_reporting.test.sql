begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

select ok(to_regprocedure('public.read_operational_report(timestamptz,timestamptz,currency_code)') is not null, 'operational report function exists');
select ok(to_regprocedure('public.request_operational_report_export(timestamptz,timestamptz,currency_code)') is not null, 'report export command exists');
select ok(not has_function_privilege('anon', 'public.read_operational_report(timestamptz,timestamptz,currency_code)', 'execute'), 'anonymous visitors cannot read reports');
select ok(not has_function_privilege('anon', 'public.request_operational_report_export(timestamptz,timestamptz,currency_code)', 'execute'), 'anonymous visitors cannot request report exports');

insert into auth.users (id, email) values
  ('97000000-0000-4000-8000-000000000121', 'report-manager@epoca.test');
insert into public.profiles (id, profile_kind, display_name) values
  ('97000000-0000-4000-8000-000000000121', 'staff', 'Report Manager');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at)
values ('97000000-0000-4000-8000-000000000121', 'manager', true, false, statement_timestamp());

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000121","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  public.read_operational_report(statement_timestamp() - interval '30 days', statement_timestamp(), 'GEL')
    -> 'period' ->> 'timeZone',
  'Asia/Tbilisi',
  'reports state their business timezone'
);
select is(
  public.read_operational_report(statement_timestamp() - interval '30 days', statement_timestamp(), 'GEL')
    -> 'period' ->> 'currency',
  'GEL',
  'reports state their currency'
);
select is(
  jsonb_typeof(public.read_operational_report(statement_timestamp() - interval '30 days', statement_timestamp(), 'GEL') -> 'sales'),
  'object',
  'sales metrics are returned as a defined object'
);
select is(
  jsonb_typeof(public.read_operational_report(statement_timestamp() - interval '30 days', statement_timestamp(), 'GEL') -> 'payments'),
  'object',
  'payment metrics are returned as a defined object'
);
select is(
  jsonb_typeof(public.read_operational_report(statement_timestamp() - interval '30 days', statement_timestamp(), 'GEL') -> 'stock'),
  'object',
  'stock metrics are returned as a point-in-time object'
);
select is(
  jsonb_typeof(public.read_operational_report(statement_timestamp() - interval '30 days', statement_timestamp(), 'GEL') -> 'operations'),
  'object',
  'operational metrics are returned as a live object'
);
select throws_ok(
  $$select public.read_operational_report(statement_timestamp() - interval '400 days', statement_timestamp(), 'GEL')$$,
  '22023',
  'INVALID_REPORT_WINDOW',
  'report windows cannot exceed 366 days'
);
select is(
  (public.request_operational_report_export(
    statement_timestamp() - interval '30 days', statement_timestamp(), 'EUR'
  )).export_type,
  'operational-report',
  'a manager can request a bounded operational export'
);
select is(
  (select scope ->> 'timeZone' from public.export_jobs where export_type = 'operational-report' limit 1),
  'Asia/Tbilisi',
  'the export preserves timezone semantics'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);
select is(
  (select count(*) from public.audit_events where action = 'report.export.request'),
  1::bigint,
  'report export requests leave an audit event'
);

select * from finish();
rollback;
