begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(5);

select has_function(
  'public',
  'owner_has_required_assurance',
  array[]::text[],
  'local Owner assurance helper exists'
);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","aal":"aal1","email":"owner@epoca.local","iss":"http://127.0.0.1:54321/auth/v1"}',
  true
);
select ok(
  public.owner_has_required_assurance(),
  'the explicit local preview Owner may use AAL1'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","aal":"aal1","email":"owner@epoca.test","iss":"http://127.0.0.1:54321/auth/v1"}',
  true
);
select ok(
  not public.owner_has_required_assurance(),
  'other local accounts still require AAL2'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","aal":"aal1","email":"owner@epoca.local","iss":"https://example.supabase.co/auth/v1"}',
  true
);
select ok(
  not public.owner_has_required_assurance(),
  'the preview address does not bypass MFA in a hosted environment'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","aal":"aal2","email":"owner@example.com","iss":"https://example.supabase.co/auth/v1"}',
  true
);
select ok(
  public.owner_has_required_assurance(),
  'AAL2 remains valid everywhere'
);

select * from finish();
rollback;
