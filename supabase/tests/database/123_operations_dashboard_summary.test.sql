begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);

select has_function(
  'public',
  'read_order_operations_summary',
  array[]::text[],
  'operations dashboard summary command exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.read_order_operations_summary()',
    'execute'
  ),
  'anonymous visitors cannot read operations counts'
);

insert into auth.users (id, email)
values ('90000000-0000-4000-8000-000000000095', 'operations-summary-manager@epoca.test');
insert into public.profiles (id, profile_kind, display_name)
values ('90000000-0000-4000-8000-000000000095', 'staff', 'Operations Summary Manager');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at)
values (
  '90000000-0000-4000-8000-000000000095',
  'manager',
  true,
  false,
  statement_timestamp()
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000095","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  jsonb_typeof(public.read_order_operations_summary()),
  'object',
  'a manager receives a defined summary object'
);
select is(
  (select count(*)::integer from jsonb_object_keys(public.read_order_operations_summary())),
  11,
  'the summary contains every dashboard metric'
);
select is(
  (public.read_order_operations_summary() ->> 'pendingPayments')::bigint,
  (
    select count(*)
    from public.orders
    where payment_status::text in (
      'pending',
      'bank_transfer_review',
      'uncertain',
      'reconciliation_required'
    )
  ),
  'pending payment work matches the source records'
);
select ok(
  (public.read_order_operations_summary() ->> 'oldestOpenMinutes')::bigint >= 0,
  'oldest open work is never reported as a negative duration'
);

reset role;
insert into auth.users (id, email)
values ('90000000-0000-4000-8000-000000000096', 'operations-summary-customer@epoca.test');
insert into public.profiles (id, profile_kind, display_name)
values ('90000000-0000-4000-8000-000000000096', 'customer', 'Operations Summary Customer');
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000096","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$select public.read_order_operations_summary()$$,
  '42501',
  'FORBIDDEN',
  'customer callers cannot read operations counts'
);

select * from finish();
rollback;
