create view public.public_catalog_products
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
  p.updated_at
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

create or replace function public.search_catalog(
  p_locale public.app_locale,
  p_query text,
  p_currency public.currency_code,
  p_collection_slug text default null,
  p_limit integer default 24,
  p_offset integer default 0,
  p_materials text[] default '{}',
  p_colors text[] default '{}',
  p_in_stock boolean default false,
  p_sort text default 'relevance'
)
returns table (
  id uuid,
  sku text,
  requested_locale public.app_locale,
  content_locale public.app_locale,
  slug text,
  name text,
  short_description text,
  width_mm integer,
  length_mm integer,
  materials text[],
  colors text[],
  amount_minor public.money_minor,
  currency public.currency_code,
  available_quantity integer,
  primary_image_path text,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  normalized_query text := trim(
    regexp_replace(
      regexp_replace(coalesce(p_query, ''), '[^[:alnum:][:space:]-]+', ' ', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
  exact_sku_query boolean := false;
begin
  p_materials := coalesce(p_materials, '{}');
  p_colors := coalesce(p_colors, '{}');
  if p_limit not between 1 and 100 or p_offset not between 0 and 100000 then
    raise exception 'INVALID_PAGINATION' using errcode = '22023';
  end if;
  if p_sort not in ('relevance', 'newest', 'price-asc', 'price-desc') then
    raise exception 'INVALID_SORT' using errcode = '22023';
  end if;
  if cardinality(p_materials) > 20 or cardinality(p_colors) > 20 then
    raise exception 'TOO_MANY_FILTERS' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_materials || p_colors) value where char_length(value) > 60) then
    raise exception 'INVALID_FILTER' using errcode = '22023';
  end if;
  p_materials := array(select lower(trim(value)) from unnest(p_materials) value where trim(value) <> '');
  p_colors := array(select lower(trim(value)) from unnest(p_colors) value where trim(value) <> '');
  if normalized_query <> '' then
    select exists (
      select 1 from public.products product
      where lower(product.sku::text) = lower(normalized_query)
    ) into exact_sku_query;
  end if;

  return query
  with eligible as (
    select
      catalog.*,
      case
        when catalog.locale = p_locale then 0
        when catalog.locale = 'en' then 1
        when catalog.locale = 'ka' then 2
        else 3
      end as locale_priority,
      case
        when normalized_query = '' then 0::real
        when lower(catalog.sku) = lower(normalized_query) then 100::real
        else ts_rank(
          to_tsvector('simple', extensions.unaccent(catalog.name || ' ' || catalog.search_text || ' ' || catalog.sku)),
          plainto_tsquery('simple', extensions.unaccent(normalized_query))
        )
      end as search_rank
    from public.public_catalog_products catalog
    where catalog.currency = p_currency
      and catalog.locale in (p_locale, 'en', 'ka')
      and (
        normalized_query = ''
        or (exact_sku_query and lower(catalog.sku) = lower(normalized_query))
        or (
          not exact_sku_query
          and (
            to_tsvector('simple', extensions.unaccent(catalog.name || ' ' || catalog.search_text || ' ' || catalog.sku))
              @@ plainto_tsquery('simple', extensions.unaccent(normalized_query))
            or extensions.unaccent(catalog.name)
              operator(extensions.%) extensions.unaccent(normalized_query)
            or catalog.sku ilike '%' || normalized_query || '%'
          )
        )
      )
      and (
        p_collection_slug is null
        or exists (
          select 1
          from public.collection_products cp
          join public.collections c on c.id = cp.collection_id
          join public.collection_translations ct on ct.collection_id = c.id
          where cp.product_id = catalog.id
            and c.status = 'published'
            and ct.status = 'published'
            and ct.locale = p_locale
            and ct.slug = p_collection_slug
            and cp.active_from <= statement_timestamp()
            and cp.active_until > statement_timestamp()
          )
      )
      and (
        cardinality(p_materials) = 0
        or catalog.materials @> p_materials
      )
      and (
        cardinality(p_colors) = 0
        or catalog.colors @> p_colors
      )
      and (not p_in_stock or catalog.available_quantity > 0)
  ), localized as (
    select distinct on (eligible.id)
      eligible.*
    from eligible
    order by eligible.id, eligible.locale_priority, eligible.locale
  )
  select
    localized.id,
    localized.sku,
    p_locale,
    localized.locale,
    localized.slug,
    localized.name,
    localized.short_description,
    localized.width_mm,
    localized.length_mm,
    localized.materials,
    localized.colors,
    localized.amount_minor,
    localized.currency,
    localized.available_quantity,
    localized.primary_image_path,
    count(*) over ()
  from localized
  order by
    case when p_sort = 'relevance' then localized.search_rank end desc,
    case when p_sort = 'price-asc' then localized.amount_minor end asc,
    case when p_sort = 'price-desc' then localized.amount_minor end desc,
    case when p_sort = 'newest' then localized.published_at end desc,
    localized.published_at desc,
    localized.id
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.catalog_facets(
  p_locale public.app_locale,
  p_currency public.currency_code,
  p_collection_slug text default null
)
returns table (
  filter_key text,
  value text,
  product_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select distinct product.id, product.materials, product.colors
    from public.products product
    join public.product_prices price on price.product_id = product.id
    where price.currency = p_currency
      and price.enabled
      and price.active_from <= statement_timestamp()
      and price.active_until > statement_timestamp()
      and (
        p_collection_slug is null
        or exists (
          select 1
          from public.collection_products cp
          join public.collections c on c.id = cp.collection_id
          join public.collection_translations ct on ct.collection_id = c.id
          where cp.product_id = product.id
            and c.status = 'published'
            and ct.status = 'published'
            and ct.locale = p_locale
            and ct.slug = p_collection_slug
            and cp.active_from <= statement_timestamp()
            and cp.active_until > statement_timestamp()
        )
      )
  ), facet_values as (
    select eligible.id, 'material'::text as filter_key, lower(trim(material.value)) as value
    from eligible
    cross join lateral unnest(eligible.materials) material(value)
    union all
    select eligible.id, 'color'::text, lower(trim(color.value))
    from eligible
    cross join lateral unnest(eligible.colors) color(value)
  )
  select facet_values.filter_key, facet_values.value, count(distinct facet_values.id)
  from facet_values
  where facet_values.value <> ''
  group by facet_values.filter_key, facet_values.value
  order by facet_values.filter_key, facet_values.value;
$$;

comment on view public.public_catalog_products is
  'RLS-aware published product projection containing verified public facts only.';
comment on function public.search_catalog(public.app_locale, text, public.currency_code, text, integer, integer, text[], text[], boolean, text) is
  'Bounded locale-aware published catalog search with canonical filters, stable sorting, and an explicit content locale diagnostic.';
comment on function public.catalog_facets(public.app_locale, public.currency_code, text) is
  'RLS-aware material and color facet counts for the published catalog.';
