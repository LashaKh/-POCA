begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(12);

select ok(to_regclass('public.rate_limit_windows') is not null, 'rate-limit table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rate_limit_windows'::regclass),
  'rate-limit table has RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.rate_limit_windows'::regclass),
  'rate-limit table forces RLS'
);
select ok(
  has_table_privilege('anon', 'public.rate_limit_windows', 'select') is false,
  'anonymous clients cannot read counters'
);
select ok(
  has_table_privilege('authenticated', 'public.rate_limit_windows', 'select') is false,
  'authenticated clients cannot read counters'
);
select ok(
  has_table_privilege('service_role', 'public.rate_limit_windows', 'insert'),
  'service commands can write counters'
);
select has_function(
  'public',
  'consume_rate_limit',
  array['text', 'text', 'integer', 'integer'],
  'rate-limit command exists'
);
select ok(
  has_function_privilege('anon', 'public.consume_rate_limit(text,text,integer,integer)', 'execute') is false,
  'anonymous clients cannot execute the command'
);

select is(
  (select allowed from public.consume_rate_limit('checkout', repeat('a', 64), 2, 60)),
  true,
  'first request is allowed'
);
select is(
  (select remaining from public.consume_rate_limit('checkout', repeat('a', 64), 2, 60)),
  0,
  'second request consumes the remaining allowance'
);
select ok(
  (
    select allowed is false and retry_after_seconds between 1 and 60
    from public.consume_rate_limit('checkout', repeat('a', 64), 2, 60)
  ),
  'request over the limit is denied with a bounded retry time'
);
select throws_ok(
  $$select * from public.consume_rate_limit('checkout', 'raw-address', 2, 60)$$,
  '22023',
  'INVALID_RATE_LIMIT',
  'raw or otherwise invalid subjects are rejected'
);

select * from finish();
rollback;
