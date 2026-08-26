-- Bounded staff catalog listing. The original security-invoker view evaluated
-- row policies while aggregating every translated row for an exact count,
-- which timed out at the production-scale 5,000-product fixture. This command
-- checks staff authorization once, aggregates in one set-based plan, and
-- returns only the requested page.

create or replace function public.list_staff_catalog_products(
  p_query text default '',
  p_status text default 'all',
  p_translation text default 'all',
  p_stock text default 'all',
  p_sort text default 'updated-desc',
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
  v_result jsonb;
begin
  perform app_private.assert_manager();

  if char_length(v_query) > 80
    or not (
      coalesce(p_status, '') = any (
        array['all', 'draft', 'in_review', 'scheduled', 'published', 'unpublished', 'archived']
      )
    )
    or coalesce(p_translation, '') not in ('all', 'complete', 'missing')
    or coalesce(p_stock, '') not in ('all', 'available', 'unavailable', 'low')
    or coalesce(p_sort, '') not in ('updated-desc', 'updated-asc', 'sku-asc', 'stock-asc')
    or coalesce(p_page, 0) < 1
    or coalesce(p_page_size, 0) not between 1 and 100
  then
    raise exception 'INVALID_CATALOG_LIST_FILTERS' using errcode = '22023';
  end if;

  with translation_summary as materialized (
    select
      translation.product_id,
      max(translation.name) filter (where translation.locale = 'en') as display_name,
      jsonb_object_agg(translation.locale::text, translation.status::text) as statuses,
      array_agg(translation.locale) as locales
    from public.product_translations translation
    group by translation.product_id
  ),
  price_summary as materialized (
    select distinct on (price.product_id)
      price.product_id,
      price.amount_minor
    from public.product_prices price
    where price.currency = 'GEL' and price.market_code is null
    order by price.product_id, price.enabled desc, price.updated_at desc
  ),
  enriched as (
    select
      product_record.id,
      product_record.sku::text as sku,
      product_record.status,
      product_record.version,
      product_record.updated_at,
      product_record.archived_at,
      product_record.archive_reason,
      coalesce(translation.display_name, product_record.sku::text) as display_name,
      coalesce(translation.statuses, '{}'::jsonb) as translation_statuses,
      array(
        select locale_value::text
        from unnest(enum_range(null::public.app_locale)) locale_value
        where not coalesce(translation.locales, '{}'::public.app_locale[])
          @> array[locale_value]
      ) as missing_locales,
      price.amount_minor as gel_amount_minor,
      inventory.stock_model,
      inventory.on_hand_quantity,
      inventory.reserved_quantity,
      inventory.available_quantity,
      inventory.version as inventory_version
    from public.products product_record
    left join translation_summary translation
      on translation.product_id = product_record.id
    left join price_summary price on price.product_id = product_record.id
    left join public.inventory_items inventory
      on inventory.product_id = product_record.id
  ),
  filtered as (
    select *
    from enriched
    where (p_status = 'all' or status::text = p_status)
      and (
        v_query = ''
        or sku ilike '%' || v_query || '%'
        or display_name ilike '%' || v_query || '%'
      )
      and (
        p_translation = 'all'
        or (p_translation = 'complete' and cardinality(missing_locales) = 0)
        or (p_translation = 'missing' and cardinality(missing_locales) > 0)
      )
      and (
        p_stock = 'all'
        or (p_stock = 'available' and available_quantity > 0)
        or (p_stock = 'unavailable' and available_quantity = 0)
        or (p_stock = 'low' and available_quantity <= 1)
      )
  ),
  ordered as (
    select
      filtered.*,
      count(*) over () as total_count,
      row_number() over (
        order by
          case when p_sort = 'updated-desc' then updated_at end desc,
          case when p_sort = 'updated-asc' then updated_at end asc,
          case when p_sort = 'sku-asc' then sku end asc,
          case when p_sort = 'stock-asc' then available_quantity end asc nulls last,
          id
      ) as result_position
    from filtered
  ),
  paged as (
    select *
    from ordered
    where result_position between ((p_page - 1) * p_page_size) + 1
      and p_page * p_page_size
    order by result_position
  )
  select jsonb_build_object(
    'count', coalesce((select max(total_count) from ordered), 0),
    'rows', coalesce(
      (
        select jsonb_agg(
          to_jsonb(page_record) - 'total_count' - 'result_position'
          order by page_record.result_position
        )
        from paged page_record
      ),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.list_staff_catalog_products(text, text, text, text, text, integer, integer)
from public, anon;
grant execute on function public.list_staff_catalog_products(text, text, text, text, text, integer, integer)
to authenticated, service_role;

comment on function public.list_staff_catalog_products(text, text, text, text, text, integer, integer) is
  'Role-checked, bounded, set-based staff catalog page with an exact filtered count.';
