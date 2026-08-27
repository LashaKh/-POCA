begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select ok(
  to_regclass('public.published_product_routes') is not null,
  'published product route projection exists'
);
select ok(
  to_regclass('public.published_collection_routes') is not null,
  'published collection route projection exists'
);
select has_column(
  'public', 'public_catalog_products', 'seo_title',
  'public product discovery exposes localized SEO title'
);
select has_column(
  'public', 'public_catalog_products', 'identifier_exists',
  'public product discovery exposes explicit identifier state'
);
select has_function(
  'public', 'product_discovery_warnings', array['uuid'],
  'catalog discovery warning function exists'
);
select ok(
  not exists (
    select 1
    from public.published_product_routes route
    join public.product_translations translation
      on translation.product_id = route.product_id
      and translation.locale = route.locale
      and translation.slug = route.slug
    where translation.status <> 'published'
  ),
  'draft product translations never leak into route maps'
);
select ok(
  not exists (
    select 1
    from public.published_collection_routes route
    join public.collection_translations translation
      on translation.collection_id = route.collection_id
      and translation.locale = route.locale
      and translation.slug = route.slug
    where translation.status <> 'published'
  ),
  'draft collection translations never leak into route maps'
);
select is(
  (
    select count(distinct locale)
    from public.published_product_routes
    where product_id = (
      select id from public.products order by sku limit 1
    )
  ),
  4::bigint,
  'published translations remain grouped by stable product identity'
);
select throws_ok(
  $$update public.products
    set identifier_exists = false, mpn = 'INVENTED-MPN'
    where id = (select id from public.products order by sku limit 1)$$,
  '23514',
  null,
  'explicit no-identifier state cannot coexist with an MPN'
);

update public.products
set identifier_exists = false, gtin = null, mpn = null
where id = (select id from public.products order by sku limit 1);
select is(
  (
    select identifier_exists
    from public.products
    order by sku
    limit 1
  ),
  false,
  'an explicit no-manufacturer-identifier assessment is stored honestly'
);

update public.product_translations
set slug = slug || '-redirect-check'
where product_id = (select id from public.products order by sku limit 1)
  and locale = 'en';
select is(
  (
    select http_status
    from public.content_redirects
    where source_path = '/en/products/syn-00001'
  ),
  308,
  'published product slug changes automatically create permanent redirects'
);
select is(
  (
    select destination_path
    from public.content_redirects
    where source_path = '/en/products/syn-00001'
  ),
  '/en/products/syn-00001-redirect-check',
  'automatic product redirects point to the real localized replacement'
);

select is(
  (
    select count(*)
    from public.product_discovery_warnings(
      (select id from public.products order by sku limit 1)
    )
  ),
  0::bigint,
  'a product in the published synthetic collection has an ordinary crawl path'
);

select * from finish();
rollback;
