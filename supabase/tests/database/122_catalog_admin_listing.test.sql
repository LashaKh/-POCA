begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

select has_function(
  'public',
  'list_staff_catalog_products',
  array['text', 'text', 'text', 'text', 'text', 'integer', 'integer'],
  'bounded staff catalog list command exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.list_staff_catalog_products(text,text,text,text,text,integer,integer)',
    'execute'
  ),
  'anonymous callers cannot list staff catalog data'
);

insert into auth.users (id, email)
values ('90000000-0000-4000-8000-000000000093', 'catalog-list-manager@epoca.test');
insert into public.profiles (id, profile_kind, display_name)
values ('90000000-0000-4000-8000-000000000093', 'staff', 'Catalog List Manager');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at)
values (
  '90000000-0000-4000-8000-000000000093',
  'manager',
  true,
  false,
  statement_timestamp()
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000093","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  (public.list_staff_catalog_products() ->> 'count')::integer,
  (select count(*)::integer from public.products),
  'default listing returns the exact catalog count'
);
select is(
  jsonb_array_length(public.list_staff_catalog_products() -> 'rows'),
  25,
  'default listing returns one bounded page'
);
select is(
  public.list_staff_catalog_products('SYN-00001') #>> '{rows,0,sku}',
  'SYN-00001',
  'SKU search returns the matching product'
);
select is(
  (public.list_staff_catalog_products('', 'published', 'complete', 'available') ->> 'count')::integer,
  (
    select count(*)::integer
    from public.products product_record
    join public.inventory_items inventory on inventory.product_id = product_record.id
    where product_record.status = 'published'
      and inventory.available_quantity > 0
      and (
        select count(distinct translation.locale)
        from public.product_translations translation
        where translation.product_id = product_record.id
      ) = 4
  ),
  'combined publication, translation, and stock filters preserve exact count semantics'
);
select throws_ok(
  $$select public.list_staff_catalog_products('', 'not-a-status')$$,
  '22023',
  'INVALID_CATALOG_LIST_FILTERS',
  'invalid filters fail closed'
);

reset role;
insert into auth.users (id, email)
values ('90000000-0000-4000-8000-000000000094', 'catalog-list-customer@epoca.test');
insert into public.profiles (id, profile_kind, display_name)
values ('90000000-0000-4000-8000-000000000094', 'customer', 'Catalog List Customer');
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000094","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$select public.list_staff_catalog_products()$$,
  '42501',
  'FORBIDDEN',
  'customer callers cannot list staff catalog data'
);

select * from finish();
rollback;
