begin;

create extension if not exists pgtap with schema extensions;
select plan(34);

select ok(to_regclass('public.products') is not null, 'products table exists');
select ok(to_regclass('public.product_translations') is not null, 'product translations exist');
select ok(to_regclass('public.product_prices') is not null, 'product prices exist');
select ok(to_regclass('public.inventory_items') is not null, 'inventory items exist');
select ok(to_regclass('public.collections') is not null, 'collections exist');
select ok(to_regclass('public.collection_translations') is not null, 'collection translations exist');
select ok(to_regclass('public.tags') is not null, 'tags exist');
select ok(to_regclass('public.media_assets') is not null, 'media assets exist');
select ok(to_regclass('public.media_licenses') is not null, 'media licenses exist');
select ok(to_regclass('public.media_variants') is not null, 'media variants exist');
select ok(to_regclass('public.public_catalog_products') is not null, 'published catalog projection exists');
select has_function(
  'public',
  'search_catalog',
  array['app_locale', 'text', 'currency_code', 'text', 'integer', 'integer', 'text[]', 'text[]', 'boolean', 'text'],
  'bounded public search exists'
);
select has_function(
  'public',
  'catalog_facets',
  array['app_locale', 'currency_code', 'text'],
  'published catalog facet counts exist'
);

select ok((select relrowsecurity from pg_class where oid = 'public.products'::regclass), 'products have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.media_assets'::regclass), 'media assets have RLS');
select ok(has_table_privilege('anon', 'public.products', 'select'), 'anonymous clients can attempt catalog reads');
select ok(has_table_privilege('anon', 'public.products', 'insert') is false, 'anonymous clients cannot create products');
select ok(has_table_privilege('authenticated', 'public.products', 'update') is false, 'staff product writes require audited catalog commands');
select ok(has_table_privilege('anon', 'public.media_assets', 'select'), 'anonymous clients can attempt approved media reads');
select ok(has_table_privilege('anon', 'public.media_assets', 'insert') is false, 'anonymous clients cannot create media');
select ok(has_table_privilege('anon', 'storage.objects', 'select'), 'anonymous clients can attempt public rendition reads');

insert into public.products (
  id, sku, status, readiness_passed, published_at, width_mm, length_mm,
  shape, materials, construction, colors, styles, condition, care_code, delivery_class,
  search_visible
) values
  (
    '10000000-0000-4000-8000-000000000001', 'EPOCA-PUBLISHED', 'published', true,
    statement_timestamp(), 1600, 2400, 'rectangle', array['wool'], 'hand-knotted',
    array['indigo'], array['traditional'], 'good', 'professional-clean', 'parcel', true
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'EPOCA-DRAFT', 'draft', false,
    null, null, null, null, array[]::text[], null,
    array[]::text[], array[]::text[], null, null, null, false
  );

insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  care_text, search_text, seo_title, seo_description, alt_text_ready, status
) values
  (
    '10000000-0000-4000-8000-000000000001', 'en', 'published-indigo-rug',
    'Published Indigo Rug', 'Verified wool rug', 'A verified catalog fixture.',
    'Professional clean.', 'indigo wool traditional', 'Published Indigo Rug',
    'Verified catalog fixture', true, 'published'
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'en', 'private-draft-rug',
    'Private Draft Rug', 'Must not leak', 'Must not leak through search.',
    null, 'secret draft phrase', null, null, false, 'draft'
  );

insert into public.product_prices (product_id, currency, amount_minor, enabled)
values ('10000000-0000-4000-8000-000000000001', 'GEL', 250000, true);

insert into public.inventory_items (product_id, stock_model, on_hand_quantity, reserved_quantity)
values ('10000000-0000-4000-8000-000000000001', 'unique', 1, 0);

insert into public.collections (id, code, status, published_at)
values ('10000000-0000-4000-8000-000000000010', 'catalog-test', 'published', statement_timestamp());
insert into public.collection_translations (collection_id, locale, slug, name, status)
values ('10000000-0000-4000-8000-000000000010', 'en', 'catalog-test', 'Catalog Test', 'published');
insert into public.collection_products (collection_id, product_id)
values ('10000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001');

select throws_ok(
  $$insert into public.products (sku) values ('epoca-published')$$,
  '23505',
  null,
  'SKU uniqueness is case-insensitive and permanent'
);
select throws_ok(
  $$insert into public.inventory_items (product_id, stock_model, on_hand_quantity) values ('10000000-0000-4000-8000-000000000002', 'unique', 2)$$,
  '23514',
  null,
  'unique products cannot have quantity above one'
);
select throws_ok(
  $$insert into public.product_prices (product_id, currency, amount_minor, enabled) values ('10000000-0000-4000-8000-000000000001', 'GEL', -1, true)$$,
  '23514',
  null,
  'negative catalog prices are rejected'
);
select throws_ok(
  $$insert into public.product_relations (source_product_id, target_product_id, relation_type) values ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'related')$$,
  '23514',
  null,
  'products cannot relate to themselves'
);

set local role anon;
select is(
  (select count(*) from public.products where id in (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  )),
  1::bigint,
  'public RLS exposes the published fixture and hides the draft fixture'
);
select is(
  (select count(*) from public.product_translations where search_text ilike '%secret draft phrase%'),
  0::bigint,
  'draft search content does not leak'
);
select is(
  (select count(*) from public.search_catalog('en', 'indigo', 'GEL', null, 24, 0)),
  1::bigint,
  'search returns a matching published product'
);
select is(
  (select count(*) from public.search_catalog('en', 'secret draft phrase', 'GEL', null, 24, 0)),
  0::bigint,
  'search never returns a draft product'
);
select is(
  (select count(*) from public.search_catalog('en', '', 'GEL', 'catalog-test', 24, 0, array['wool'], array['indigo'], true, 'price-asc')),
  1::bigint,
  'search applies material, color, availability, and sort inputs in the database'
);
select is(
  (select count(*) from public.search_catalog('en', '', 'GEL', 'catalog-test', 24, 0, array['silk'], '{}', false, 'relevance')),
  0::bigint,
  'search excludes nonmatching facets before pagination'
);
select is(
  (select product_count from public.catalog_facets('en', 'GEL', 'catalog-test') where filter_key = 'material' and value = 'wool'),
  1::bigint,
  'facet counts include only eligible public products'
);
select throws_ok(
  $$select * from public.search_catalog('en', 'indigo', 'GEL', null, 101, 0)$$,
  '22023',
  'INVALID_PAGINATION',
  'search refuses unbounded limits'
);
select throws_ok(
  $$select * from public.search_catalog('en', '', 'GEL', null, 24, 0, '{}', '{}', false, 'random')$$,
  '22023',
  'INVALID_SORT',
  'search refuses unknown sort modes'
);

reset role;
select * from finish();
rollback;
