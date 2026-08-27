-- Google discovery adds public, factual search projections without creating a
-- second catalog. Merchant activation remains closed until seller and policy
-- ownership are explicitly configured outside this migration.

alter table public.products
  add column brand text check (brand is null or char_length(brand) between 1 and 120),
  add column gtin text check (gtin is null or gtin ~ '^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$'),
  add column mpn text check (mpn is null or char_length(mpn) between 1 and 70),
  add column identifier_exists boolean,
  add constraint product_identifier_truth check (
    (identifier_exists is null and gtin is null and mpn is null)
    or (identifier_exists = false and gtin is null and mpn is null)
    or (identifier_exists = true and num_nonnulls(gtin, mpn) >= 1)
  );

comment on column public.products.identifier_exists is
  'Tri-state manufacturer identifier assessment: null unknown, false explicitly none, true with a GTIN or MPN. ÉPOCA SKU is not a manufacturer identifier.';

create or replace view public.public_catalog_products
with (security_invoker = true)
as
select
  p.id,
  p.sku::text as sku,
  pt.locale,
  pt.slug,
  pt.name,
  pt.short_description,
  pt.long_description,
  pt.care_text,
  pt.search_text,
  p.width_mm,
  p.length_mm,
  p.diameter_mm,
  p.shape,
  p.materials,
  p.construction,
  p.colors,
  p.styles,
  p.condition,
  p.care_code,
  p.delivery_class,
  case when p.origin_verified then p.origin end as origin,
  case when p.age_verified then p.age_min_year end as age_min_year,
  case when p.age_verified then p.age_max_year end as age_max_year,
  case when p.pile_verified then p.pile end as pile,
  case when p.handmade_verified then p.handmade end as handmade,
  case when p.provenance_verified then p.provenance_summary end as provenance_summary,
  p.category,
  p.structured_data_eligible,
  pp.currency,
  pp.amount_minor,
  ii.stock_model,
  ii.available_quantity,
  (
    select mv.path
    from public.media_variants mv
    join public.media_licenses ml on ml.asset_id = mv.asset_id
    where mv.asset_id = p.primary_media_asset_id
      and mv.status = 'approved'
      and mv.role = 'card_4x5'
      and ml.status = 'approved'
      and (ml.expires_at is null or ml.expires_at > statement_timestamp())
    order by mv.width desc
    limit 1
  ) as primary_image_path,
  p.published_at,
  p.updated_at,
  pt.seo_title,
  pt.seo_description,
  p.brand,
  p.gtin,
  p.mpn,
  p.identifier_exists,
  pt.updated_at as translation_updated_at
from public.products p
join public.product_translations pt on pt.product_id = p.id
join public.product_prices pp on pp.product_id = p.id
join public.inventory_items ii on ii.product_id = p.id
where p.status = 'published'
  and p.search_visible
  and pt.status = 'published'
  and pp.enabled
  and pp.active_from <= statement_timestamp()
  and pp.active_until > statement_timestamp();

create view public.published_product_routes
with (security_invoker = true)
as
select
  product.id as product_id,
  translation.locale,
  translation.slug,
  greatest(product.updated_at, translation.updated_at) as updated_at,
  (
    select variant.path
    from public.media_variants variant
    join public.media_licenses license on license.asset_id = variant.asset_id
    where variant.asset_id = product.primary_media_asset_id
      and variant.status = 'approved'
      and variant.role = 'card_4x5'
      and license.status = 'approved'
      and (license.expires_at is null or license.expires_at > statement_timestamp())
    order by variant.width desc
    limit 1
  ) as primary_image_path
from public.products product
join public.product_translations translation on translation.product_id = product.id
where product.status = 'published'
  and product.search_visible
  and translation.status = 'published';

create view public.published_collection_routes
with (security_invoker = true)
as
select
  collection.id as collection_id,
  translation.locale,
  translation.slug,
  translation.name,
  translation.description,
  translation.seo_title,
  translation.seo_description,
  collection.published_at,
  greatest(collection.updated_at, translation.updated_at) as updated_at,
  (
    select count(*)::integer
    from public.collection_products membership
    join public.products product on product.id = membership.product_id
    where membership.collection_id = collection.id
      and membership.active_from <= statement_timestamp()
      and membership.active_until > statement_timestamp()
      and product.status = 'published'
      and product.search_visible
  ) as product_count
from public.collections collection
join public.collection_translations translation
  on translation.collection_id = collection.id
where collection.status = 'published'
  and translation.status = 'published';

create function public.product_discovery_warnings(p_product_id uuid)
returns table (code text, severity text)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    'product_without_public_collection_path'::text,
    'warning'::text
  where exists (
    select 1
    from public.products product
    where product.id = p_product_id
      and product.status = 'published'
      and product.search_visible
  )
  and not exists (
    select 1
    from public.collection_products membership
    join public.collections collection on collection.id = membership.collection_id
    join public.collection_translations translation
      on translation.collection_id = collection.id
    where membership.product_id = p_product_id
      and membership.active_from <= statement_timestamp()
      and membership.active_until > statement_timestamp()
      and collection.status = 'published'
      and translation.status = 'published'
  );
$$;

grant select on public.public_catalog_products,
  public.published_product_routes,
  public.published_collection_routes
to anon, authenticated, service_role;
grant execute on function public.product_discovery_warnings(uuid)
to authenticated, service_role;

comment on view public.public_catalog_products is
  'RLS-aware published product projection with verified public facts and localized search metadata.';
comment on view public.published_product_routes is
  'Published product translation routes grouped by stable product identity for metadata and sitemap generation.';
comment on view public.published_collection_routes is
  'Published collection translation routes and active public-product counts for crawlable catalog navigation.';
comment on function public.product_discovery_warnings(uuid) is
  'Advisory discovery warnings that do not silently weaken the core product publication truth gate.';

create function app_private.record_catalog_slug_redirect()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_path text;
  v_destination_path text;
  redirect_record public.content_redirects;
  correlation uuid := extensions.gen_random_uuid();
begin
  if old.status <> 'published' or new.status <> 'published' or old.slug = new.slug then
    return new;
  end if;

  v_source_path := '/' || new.locale::text || '/' || tg_argv[0] || '/' || old.slug;
  v_destination_path := '/' || new.locale::text || '/' || tg_argv[0] || '/' || new.slug;

  update public.content_redirects
  set status = 'disabled', updated_by = auth.uid(), version = version + 1
  where source_path = v_destination_path and status <> 'disabled';

  update public.content_redirects
  set destination_path = v_destination_path,
      updated_by = auth.uid(),
      version = version + 1
  where public.content_redirects.destination_path = v_source_path
    and public.content_redirects.source_path <> v_destination_path
    and status = 'published';

  insert into public.content_redirects (
    source_path, destination_path, http_status, status, active_from,
    active_until, updated_by
  ) values (
    v_source_path, v_destination_path, 308, 'published', statement_timestamp(),
    'infinity', auth.uid()
  )
  on conflict (source_path) do update set
    destination_path = excluded.destination_path,
    http_status = 308,
    status = 'published',
    active_from = statement_timestamp(),
    active_until = 'infinity',
    updated_by = auth.uid(),
    version = public.content_redirects.version + 1
  returning * into redirect_record;

  perform app_private.write_audit_event(
    app_private.content_actor_class(),
    'catalog.slug.redirect',
    'content_redirect',
    redirect_record.id::text,
    'succeeded',
    'catalog',
    correlation,
    jsonb_build_object(
      'sourcePath', v_source_path,
      'destinationPath', v_destination_path,
      'status', redirect_record.status,
      'version', redirect_record.version
    )
  );
  return new;
end;
$$;

create trigger product_translation_slug_redirect
after update of slug, status on public.product_translations
for each row execute function app_private.record_catalog_slug_redirect('products');

create trigger collection_translation_slug_redirect
after update of slug, status on public.collection_translations
for each row execute function app_private.record_catalog_slug_redirect('collections');

comment on function app_private.record_catalog_slug_redirect() is
  'Creates a single-hop, audited 308 whenever a published product or collection translation changes slug.';
