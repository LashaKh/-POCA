alter table public.catalog_revisions enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.catalog_import_batches enable row level security;
alter table public.catalog_import_rows enable row level security;
alter table public.saved_admin_views enable row level security;
alter table public.catalog_bulk_actions enable row level security;

alter table public.catalog_revisions force row level security;
alter table public.inventory_adjustments force row level security;
alter table public.catalog_import_batches force row level security;
alter table public.catalog_import_rows force row level security;
alter table public.saved_admin_views force row level security;
alter table public.catalog_bulk_actions force row level security;

revoke all on public.catalog_revisions, public.inventory_adjustments,
  public.catalog_import_batches, public.catalog_import_rows,
  public.saved_admin_views, public.catalog_bulk_actions
from public, anon, authenticated;

grant select on public.catalog_revisions, public.inventory_adjustments,
  public.catalog_import_batches, public.catalog_import_rows,
  public.catalog_bulk_actions to authenticated;
grant select on public.saved_admin_views to authenticated;

create policy catalog_revisions_staff_read
on public.catalog_revisions for select to authenticated
using (public.is_active_staff());

create policy inventory_adjustments_staff_read
on public.inventory_adjustments for select to authenticated
using (public.is_active_staff());

create policy catalog_import_batches_staff_read
on public.catalog_import_batches for select to authenticated
using (public.is_active_staff());

create policy catalog_import_rows_staff_read
on public.catalog_import_rows for select to authenticated
using (public.is_active_staff());

create policy saved_admin_views_own_read
on public.saved_admin_views for select to authenticated
using (owner_profile_id = auth.uid() and public.is_active_staff());

create policy catalog_bulk_actions_staff_read
on public.catalog_bulk_actions for select to authenticated
using (public.is_active_staff());

revoke insert, update, delete on public.products, public.product_translations,
  public.product_prices, public.inventory_items, public.collections,
  public.collection_translations, public.collection_products
from authenticated;

create view public.staff_catalog_products
with (security_invoker = true)
as
select
  product_record.id,
  product_record.sku::text as sku,
  product_record.status,
  product_record.version,
  product_record.updated_at,
  product_record.archived_at,
  product_record.archive_reason,
  coalesce(translation_summary.display_name, product_record.sku::text) as display_name,
  coalesce(translation_summary.statuses, '{}'::jsonb) as translation_statuses,
  array(
    select locale_value::text
    from unnest(enum_range(null::public.app_locale)) locale_value
    where not coalesce(translation_summary.locales, '{}') @> array[locale_value]
  ) as missing_locales,
  price.amount_minor as gel_amount_minor,
  inventory.stock_model,
  inventory.on_hand_quantity,
  inventory.reserved_quantity,
  inventory.available_quantity,
  inventory.version as inventory_version
from public.products product_record
left join lateral (
  select
    max(translation.name) filter (where translation.locale = 'en') as display_name,
    jsonb_object_agg(translation.locale::text, translation.status::text) as statuses,
    array_agg(translation.locale) as locales
  from public.product_translations translation
  where translation.product_id = product_record.id
) translation_summary on true
left join lateral (
  select product_price.amount_minor
  from public.product_prices product_price
  where product_price.product_id = product_record.id
    and product_price.currency = 'GEL' and product_price.market_code is null
  order by product_price.enabled desc, product_price.updated_at desc limit 1
) price on true
left join public.inventory_items inventory on inventory.product_id = product_record.id
where public.is_active_staff();

grant select on public.staff_catalog_products to authenticated;

create view public.catalog_export_rows
with (security_invoker = true)
as
select
  product_record.id,
  case when product_record.sku::text ~ '^[=+@-]' then '''' || product_record.sku::text else product_record.sku::text end as sku,
  product_record.status::text as status,
  case when coalesce(translation.name, '') ~ '^[=+@-]' then '''' || translation.name else translation.name end as name,
  translation.locale::text as locale,
  translation.slug,
  price.currency::text as currency,
  price.amount_minor,
  inventory.stock_model::text as stock_model,
  inventory.on_hand_quantity,
  inventory.reserved_quantity,
  product_record.updated_at
from public.products product_record
join public.product_translations translation on translation.product_id = product_record.id
left join public.product_prices price on price.product_id = product_record.id and price.enabled
left join public.inventory_items inventory on inventory.product_id = product_record.id
where public.is_active_staff() or auth.role() = 'service_role';

grant select on public.catalog_export_rows to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-imports', 'catalog-imports', false, 10485760, array['text/csv', 'text/plain']),
  ('catalog-exports', 'catalog-exports', false, 52428800, array['text/csv'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy catalog_import_storage_staff
on storage.objects for all to authenticated
using (
  bucket_id = 'catalog-imports'
  and (storage.foldername(name))[1] = 'staff'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_active_staff()
)
with check (
  bucket_id = 'catalog-imports'
  and (storage.foldername(name))[1] = 'staff'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_active_staff()
);

create policy catalog_export_storage_requester
on storage.objects for select to authenticated
using (
  bucket_id = 'catalog-exports'
  and (storage.foldername(name))[1] = 'staff'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_active_staff()
);

grant all on public.catalog_revisions, public.inventory_adjustments,
  public.catalog_import_batches, public.catalog_import_rows,
  public.saved_admin_views, public.catalog_bulk_actions to service_role;
grant usage, select on all sequences in schema public to service_role;

comment on view public.staff_catalog_products is
  'Staff-only catalog queue with compact translation, GEL price, and inventory status.';
comment on view public.catalog_export_rows is
  'Staff-only bounded export projection with spreadsheet-formula protection on text cells.';
