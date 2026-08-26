begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select ok(to_regclass('public.catalog_revisions') is not null, 'catalog revisions exist');
select ok(to_regclass('public.inventory_adjustments') is not null, 'inventory adjustments exist');
select ok(to_regclass('public.catalog_import_batches') is not null, 'catalog import batches exist');
select ok(to_regclass('public.catalog_import_rows') is not null, 'catalog import rows exist');
select ok(to_regclass('public.saved_admin_views') is not null, 'saved admin views exist');
select ok(to_regclass('public.catalog_bulk_actions') is not null, 'bulk action records exist');
select ok(to_regclass('public.staff_catalog_products') is not null, 'staff catalog queue exists');
select ok(to_regclass('public.catalog_export_rows') is not null, 'safe catalog export projection exists');

select has_function('public', 'save_catalog_product', array['text','jsonb','jsonb','jsonb','stock_model','integer','text','uuid','bigint'], 'optimistic product command exists');
select has_function('public', 'adjust_catalog_inventory', array['uuid','bigint','integer','text','text'], 'inventory adjustment command exists');
select has_function('public', 'bulk_catalog_action', array['uuid[]','text','text','text','uuid'], 'partial-result bulk command exists');
select has_function('public', 'schedule_catalog_product', array['uuid','bigint','timestamp with time zone','text'], 'product scheduling command exists');
select has_function('public', 'process_due_catalog_publications', array['integer'], 'scheduled catalog publication worker exists');
select has_function('public', 'save_catalog_collection', array['text','collection_status','text','jsonb','text','uuid','bigint','timestamp with time zone'], 'collection save command exists');
select has_function('public', 'reorder_catalog_collection', array['uuid','uuid[]','bigint','uuid'], 'collection reorder command exists');
select has_function('public', 'stage_catalog_import', array['text','text','text','jsonb','jsonb','text'], 'catalog import staging command exists');
select has_function('public', 'apply_catalog_import', array['uuid'], 'catalog import apply command exists');
select has_function('public', 'cancel_catalog_import', array['uuid'], 'catalog import cancellation command exists');
select has_function('public', 'request_catalog_export', array['jsonb','text'], 'catalog export request command exists');

select ok((select relforcerowsecurity from pg_class where oid = 'public.catalog_revisions'::regclass), 'revision RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.catalog_import_rows'::regclass), 'private import-row RLS is forced');
select ok(not has_table_privilege('authenticated', 'public.products', 'update'), 'browser staff cannot bypass product commands');
select ok(not has_table_privilege('authenticated', 'public.inventory_items', 'update'), 'browser staff cannot bypass inventory commands');
select ok(not has_table_privilege('anon', 'public.catalog_import_rows', 'select'), 'anonymous users cannot inspect import rows');
select ok(exists (select 1 from storage.buckets where id = 'catalog-imports' and not public), 'catalog imports use a private bucket');
select ok(exists (select 1 from storage.buckets where id = 'catalog-exports' and not public), 'catalog exports use a private bucket');

insert into auth.users (id, email) values
  ('90000000-0000-4000-8000-000000000091', 'catalog-manager@epoca.test'),
  ('90000000-0000-4000-8000-000000000092', 'catalog-customer@epoca.test');
insert into public.profiles (id, profile_kind, display_name) values
  ('90000000-0000-4000-8000-000000000091', 'staff', 'Catalog Manager'),
  ('90000000-0000-4000-8000-000000000092', 'customer', 'Catalog Customer');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at)
values ('90000000-0000-4000-8000-000000000091', 'manager', true, false, statement_timestamp());

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  (public.save_catalog_product(
    'CATALOG-ADMIN-ONE',
    '{"widthMm":1700,"lengthMm":2500,"shape":"rectangle","materials":["wool"],"construction":"hand-knotted","colors":["indigo"],"styles":["traditional"],"condition":"excellent","careCode":"professional-clean","deliveryClass":"parcel","category":"carpet","origin":"Georgia","originVerified":true}'::jsonb,
    '[
      {"locale":"ka","slug":"catalog-admin-one-ka","name":"Catalog KA","shortDescription":"Short KA","longDescription":"Long KA","searchText":"catalog ka","status":"draft"},
      {"locale":"en","slug":"catalog-admin-one-en","name":"Catalog EN","shortDescription":"Short EN","longDescription":"Long EN","searchText":"catalog en","status":"draft"},
      {"locale":"de","slug":"catalog-admin-one-de","name":"Catalog DE","shortDescription":"Short DE","longDescription":"Long DE","searchText":"catalog de","status":"draft"},
      {"locale":"ru","slug":"catalog-admin-one-ru","name":"Catalog RU","shortDescription":"Short RU","longDescription":"Long RU","searchText":"catalog ru","status":"draft"}
    ]'::jsonb,
    '[{"currency":"GEL","amountMinor":150000,"enabled":true}]'::jsonb,
    'stocked', 5, 'Create catalog test product'
  )).status,
  'draft'::public.product_status,
  'manager creates a complete maintainable draft'
);
select is((select count(*) from public.product_translations where product_id = (select id from public.products where sku = 'CATALOG-ADMIN-ONE')), 4::bigint, 'create stores all four translations');
select is((select count(*) from public.catalog_revisions where entity_id = (select id from public.products where sku = 'CATALOG-ADMIN-ONE')), 1::bigint, 'create records one immutable revision');
select is((select on_hand_quantity from public.inventory_items where product_id = (select id from public.products where sku = 'CATALOG-ADMIN-ONE')), 5, 'create stores authoritative stock');

select is(
  (public.save_catalog_product(
    'CATALOG-ADMIN-ONE',
    '{"widthMm":1800,"lengthMm":2600,"shape":"rectangle","materials":["wool","silk"],"construction":"hand-knotted","colors":["indigo"],"styles":["traditional"],"condition":"excellent","careCode":"professional-clean","deliveryClass":"parcel","category":"carpet","origin":"Georgia","originVerified":true,"ageMinYear":1880,"ageMaxYear":1910,"ageVerified":true,"pile":"low pile","pileVerified":true,"handmade":true,"handmadeVerified":true,"provenanceSummary":"Documented collector history","provenanceVerified":true}'::jsonb,
    '[{"locale":"en","slug":"catalog-admin-one-en","name":"Catalog EN revised","shortDescription":"Short EN","longDescription":"Long EN","searchText":"catalog en revised","status":"draft"}]'::jsonb,
    '[{"currency":"GEL","amountMinor":160000,"enabled":true}]'::jsonb,
    'stocked', 5, 'Correct dimensions and price',
    (select id from public.products where sku = 'CATALOG-ADMIN-ONE'), 1
  )).version::bigint,
  2::bigint,
  'optimistic edit increments the product version'
);
select is((select name from public.product_translations where product_id = (select id from public.products where sku = 'CATALOG-ADMIN-ONE') and locale = 'en'), 'Catalog EN revised', 'edit updates only the supplied locale');
select is((select age_min_year from public.products where sku = 'CATALOG-ADMIN-ONE'), 1880, 'verified optional age is maintained');
select is((select provenance_summary from public.products where sku = 'CATALOG-ADMIN-ONE'), 'Documented collector history', 'verified provenance remains available for truthful display');
select throws_ok(
  $$select public.save_catalog_product(
    'CATALOG-ADMIN-ONE', '{}'::jsonb,
    '[{"locale":"en","slug":"catalog-admin-one-en","name":"Stale"}]'::jsonb,
    '[{"currency":"GEL","amountMinor":1,"enabled":true}]'::jsonb,
    'stocked', 5, 'Stale change attempt',
    (select id from public.products where sku = 'CATALOG-ADMIN-ONE'), 1
  )$$,
  '40001', 'VERSION_CONFLICT', 'stale product edits are rejected'
);

select is(
  (public.adjust_catalog_inventory(
    (select id from public.products where sku = 'CATALOG-ADMIN-ONE'), 1, 2,
    'Counted two additional pieces', 'catalog-stock-adjust-0001'
  )).on_hand_quantity,
  7,
  'reasoned stock adjustment changes on-hand quantity'
);
select is((select count(*) from public.inventory_adjustments where idempotency_key = 'catalog-stock-adjust-0001'), 1::bigint, 'stock adjustment records one evidence row');
select is((public.adjust_catalog_inventory(
  (select id from public.products where sku = 'CATALOG-ADMIN-ONE'), 1, 2,
  'Counted two additional pieces', 'catalog-stock-adjust-0001'
)).on_hand_quantity, 7, 'stock adjustment replay returns the original effect');
select throws_ok(
  $$select public.adjust_catalog_inventory(
    (select id from public.products where sku = 'CATALOG-ADMIN-ONE'), 2, -8,
    'Unsafe negative correction', 'catalog-stock-adjust-0002'
  )$$,
  '55000', 'INVENTORY_ADJUSTMENT_UNSAFE', 'stock cannot become negative or below reserved quantity'
);
select throws_ok(
  $$update public.catalog_revisions set note = 'changed' where entity_id = (select id from public.products where sku = 'CATALOG-ADMIN-ONE')$$,
  '42501', null, 'browser staff cannot mutate immutable revision history directly'
);

select is(
  (public.save_catalog_collection(
    'catalog-admin-collection', 'draft', 'manual',
    '[{"locale":"en","slug":"catalog-admin-collection","name":"Catalog Admin Collection","description":"Curated test collection","status":"draft"}]'::jsonb,
    'Create catalog test collection'
  )).status,
  'draft'::public.collection_status,
  'manager creates a collection'
);
select is(
  jsonb_array_length((public.bulk_catalog_action(
    array[(select id from public.products where sku = 'CATALOG-ADMIN-ONE')],
    'collection_add', 'Add selected product', 'catalog-bulk-collection-0001',
    (select id from public.collections where code = 'catalog-admin-collection')
  )) -> 'succeeded'),
  1,
  'bulk merchandising adds a selected product'
);
select is(
  (public.reorder_catalog_collection(
    (select id from public.collections where code = 'catalog-admin-collection'),
    array[(select id from public.products where sku = 'CATALOG-ADMIN-ONE')],
    1, (select id from public.products where sku = 'CATALOG-ADMIN-ONE')
  )).version::bigint,
  2::bigint,
  'collection reorder persists featured placement with optimistic versioning'
);
select ok((select featured from public.collection_products where collection_id = (select id from public.collections where code = 'catalog-admin-collection')), 'collection member is featured');
select is(
  (public.save_catalog_collection(
    'catalog-admin-collection', 'scheduled', 'manual',
    '[{"locale":"en","slug":"catalog-admin-collection","name":"Catalog Admin Collection","description":"Curated test collection","status":"draft"}]'::jsonb,
    'Schedule catalog test collection',
    (select id from public.collections where code = 'catalog-admin-collection'), 2,
    statement_timestamp() + interval '1 day'
  )).status,
  'scheduled'::public.collection_status,
  'manager can schedule a collection for future publication'
);
reset role;
select is((select count(*) from public.scheduled_actions where action_type = 'publish-catalog-collection' and subject_id = (select id from public.collections where code = 'catalog-admin-collection')), 1::bigint, 'collection scheduling queues one private idempotent publication action');
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  jsonb_array_length((public.bulk_catalog_action(
    array[(select id from public.products where sku = 'CATALOG-ADMIN-ONE'), '90000000-0000-4000-8000-000000000099'::uuid],
    'archive', 'Seasonal archive', 'catalog-bulk-archive-0001'
  )) -> 'failed'),
  1,
  'bulk action reports one missing product without losing the valid result'
);
select is((select status from public.products where sku = 'CATALOG-ADMIN-ONE'), 'archived'::public.product_status, 'valid product is archived reversibly');
select is((select count(*) from public.catalog_bulk_actions where idempotency_key = 'catalog-bulk-archive-0001'), 1::bigint, 'bulk action is recorded once');
select is(jsonb_array_length((public.bulk_catalog_action(
  array[(select id from public.products where sku = 'CATALOG-ADMIN-ONE'), '90000000-0000-4000-8000-000000000099'::uuid],
  'archive', 'Seasonal archive', 'catalog-bulk-archive-0001'
)) -> 'succeeded'), 1, 'bulk replay returns the original partial result');
select is(jsonb_array_length((public.bulk_catalog_action(
  array[(select id from public.products where sku = 'CATALOG-ADMIN-ONE')],
  'restore', 'Restore for editing', 'catalog-bulk-restore-0001'
)) -> 'succeeded'), 1, 'archived product can be restored');
select is((select status from public.products where sku = 'CATALOG-ADMIN-ONE'), 'draft'::public.product_status, 'restore returns product to a safe draft');
select throws_ok(
  $$select public.schedule_catalog_product(
    (select id from public.products where sku = 'CATALOG-ADMIN-ONE'),
    (select version from public.products where sku = 'CATALOG-ADMIN-ONE'),
    statement_timestamp() - interval '1 minute', 'Invalid past schedule'
  )$$,
  '22023', 'INVALID_PRODUCT_SCHEDULE', 'past product publication schedules are rejected'
);
select throws_ok(
  $$select public.schedule_catalog_product(
    (select id from public.products where sku = 'CATALOG-ADMIN-ONE'),
    (select version from public.products where sku = 'CATALOG-ADMIN-ONE'),
    statement_timestamp() + interval '1 day', 'Future catalog launch'
  )$$,
  '55000', 'PRODUCT_NOT_READY', 'scheduling enforces the same publication readiness gate'
);

reset role;
update public.products set status = 'published', readiness_passed = true,
  search_visible = true, published_at = statement_timestamp()
where sku = 'CATALOG-ADMIN-ONE';
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);
select is(jsonb_array_length((public.bulk_catalog_action(
  array[(select id from public.products where sku = 'CATALOG-ADMIN-ONE')],
  'unpublish', 'Temporarily remove from sale', 'catalog-bulk-unpublish-0001'
)) -> 'succeeded'), 1, 'manager can unpublish a public product');
select is((select status from public.products where sku = 'CATALOG-ADMIN-ONE'), 'unpublished'::public.product_status, 'unpublishing immediately hides the product safely');

select is(
  (public.stage_catalog_import(
    'staff/90000000-0000-4000-8000-000000000091/catalog-test.csv', repeat('a', 64), 'catalog-test.csv',
    '{"sku":"sku","name_en":"name_en"}'::jsonb,
    '[
      {"rowNumber":2,"source":{"sku":"IMPORT-ONE"},"normalized":{"sku":"IMPORT-ONE","facts":{"widthMm":1600,"lengthMm":2400,"shape":"rectangle","materials":["wool"],"construction":"hand-knotted","colors":["blue"],"styles":[],"condition":"excellent","careCode":"professional-clean","deliveryClass":"parcel","category":"carpet","origin":"","originVerified":false},"translations":[{"locale":"en","slug":"import-one","name":"Import One","shortDescription":"Imported","longDescription":"Imported product","searchText":"import one","status":"draft"}],"prices":[{"currency":"GEL","amountMinor":99000,"enabled":true}],"stockModel":"unique","onHandQuantity":1},"errors":[]},
      {"rowNumber":3,"source":{"sku":"=FORMULA"},"normalized":null,"errors":[{"field":"sku","code":"INVALID_SKU"}]}
    ]'::jsonb
  )).valid_row_count,
  1,
  'mixed CSV staging counts valid rows'
);
select is((select invalid_row_count from public.catalog_import_batches where source_checksum = repeat('a', 64)), 1, 'mixed CSV staging retains invalid rows for correction');
select is((public.apply_catalog_import((select id from public.catalog_import_batches where source_checksum = repeat('a', 64)))).applied_row_count, 1, 'import applies only validated rows');
select is((select count(*) from public.products where sku = 'IMPORT-ONE'), 1::bigint, 'validated import creates exactly one product');
select is((select status from public.catalog_import_rows where row_number = 3 and batch_id = (select id from public.catalog_import_batches where source_checksum = repeat('a', 64))), 'invalid'::public.catalog_import_row_status, 'invalid import row remains inspectable and unapplied');

select isnt((public.save_catalog_product(
  '=1+1',
  '{"shape":"rectangle","materials":[],"colors":[],"styles":[],"origin":"","originVerified":false}'::jsonb,
  '[{"locale":"en","slug":"formula-safe","name":"+Formula Name","status":"draft"}]'::jsonb,
  '[{"currency":"GEL","amountMinor":100,"enabled":true}]'::jsonb,
  'stocked', 0, 'Create formula export fixture'
)).id, null::uuid, 'formula-looking source values can be safely stored as catalog text');
select is((select sku from public.catalog_export_rows where sku = '''=1+1' limit 1), '''=1+1', 'export projection prefixes formula-looking SKU');
select is((select name from public.catalog_export_rows where sku = '''=1+1' limit 1), '''+Formula Name', 'export projection prefixes formula-looking translated name');
select is((public.request_catalog_export('{"status":"draft"}'::jsonb, 'epoca-catalog.csv')).status, 'pending'::public.work_status, 'bounded catalog export request is queued');
select is((public.save_catalog_admin_view('products', 'Draft products', '{"status":"draft"}'::jsonb, '{"field":"updated_at","direction":"desc"}'::jsonb)).name, 'Draft products', 'manager can save a stable catalog view');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.collections set status = 'scheduled', scheduled_at = statement_timestamp() - interval '1 minute'
where id = '20000000-0000-4000-8000-000000000001';
insert into public.scheduled_actions (
  action_type, subject_type, subject_id, due_at, idempotency_key, correlation_id
) values (
  'publish-catalog-collection', 'collection', '20000000-0000-4000-8000-000000000001',
  statement_timestamp() - interval '1 minute',
  'catalog-collection-publish:20000000-0000-4000-8000-000000000001',
  extensions.gen_random_uuid()
);
select is(
  (public.process_due_catalog_publications(10) ->> 'publishedCollections')::integer,
  1,
  'service worker publishes a due ready collection exactly once'
);
select is((select status from public.collections where id = '20000000-0000-4000-8000-000000000001'), 'published'::public.collection_status, 'due collection becomes publicly eligible');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"90000000-0000-4000-8000-000000000092","role":"authenticated","aal":"aal1"}',
  true
);
select is((select count(*) from public.staff_catalog_products), 0::bigint, 'customer cannot inspect the staff catalog queue');
select is((select count(*) from public.catalog_revisions), 0::bigint, 'customer cannot inspect catalog history');
select throws_ok(
  $$select public.adjust_catalog_inventory(
    (select id from public.products where sku = 'IMPORT-ONE'), 1, 1,
    'Customer attempt', 'catalog-customer-denied-0001'
  )$$,
  '42501', 'FORBIDDEN', 'customer cannot execute catalog commands'
);

select * from finish();
rollback;
