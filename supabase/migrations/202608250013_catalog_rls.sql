alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.product_prices enable row level security;
alter table public.inventory_items enable row level security;
alter table public.collections enable row level security;
alter table public.collection_translations enable row level security;
alter table public.collection_products enable row level security;
alter table public.tags enable row level security;
alter table public.tag_translations enable row level security;
alter table public.product_tags enable row level security;
alter table public.product_relations enable row level security;
alter table public.merchandising_slots enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_licenses enable row level security;
alter table public.media_variants enable row level security;
alter table public.media_links enable row level security;

revoke all on public.products, public.product_translations, public.product_prices,
  public.inventory_items, public.collections, public.collection_translations,
  public.collection_products, public.tags, public.tag_translations,
  public.product_tags, public.product_relations, public.merchandising_slots,
  public.media_assets, public.media_licenses, public.media_variants, public.media_links
from public, anon, authenticated;

grant select on public.products, public.product_translations, public.product_prices,
  public.inventory_items, public.collections, public.collection_translations,
  public.collection_products, public.tags, public.tag_translations,
  public.product_tags, public.product_relations, public.merchandising_slots,
  public.media_assets, public.media_variants, public.media_links
to anon, authenticated;
grant select (asset_id, ownership_basis, creator_source, usage_url, territory, expires_at, approved_at, status)
on public.media_licenses to anon, authenticated;
grant select on public.public_catalog_products to anon, authenticated;
grant execute on function public.search_catalog(public.app_locale, text, public.currency_code, text, integer, integer, text[], text[], boolean, text)
to anon, authenticated;
grant execute on function public.catalog_facets(public.app_locale, public.currency_code, text)
to anon, authenticated;

grant insert, update, delete on public.products, public.product_translations,
  public.product_prices, public.inventory_items, public.collections,
  public.collection_translations, public.collection_products, public.tags,
  public.tag_translations, public.product_tags, public.product_relations,
  public.merchandising_slots, public.media_assets, public.media_licenses,
  public.media_variants, public.media_links
to authenticated;

create policy products_public_read on public.products for select to anon, authenticated
using (status = 'published' and search_visible);
create policy products_staff_read on public.products for select to authenticated
using (public.is_active_staff());
create policy products_staff_insert on public.products for insert to authenticated
with check (public.is_active_staff());
create policy products_staff_update on public.products for update to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy products_staff_delete on public.products for delete to authenticated
using (public.is_active_staff('owner'));

create policy product_translations_public_read on public.product_translations for select to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published' and p.search_visible
  )
);
create policy product_translations_staff_all on public.product_translations for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

create policy product_prices_public_read on public.product_prices for select to anon, authenticated
using (
  enabled and active_from <= statement_timestamp() and active_until > statement_timestamp()
  and exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published' and p.search_visible
  )
);
create policy product_prices_staff_all on public.product_prices for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

create policy inventory_public_read on public.inventory_items for select to anon, authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published' and p.search_visible
  )
);
create policy inventory_staff_all on public.inventory_items for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

create policy collections_public_read on public.collections for select to anon, authenticated
using (status = 'published' and published_at is not null);
create policy collections_staff_all on public.collections for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy collection_translations_public_read on public.collection_translations for select to anon, authenticated
using (
  status = 'published'
  and exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published')
);
create policy collection_translations_staff_all on public.collection_translations for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy collection_products_public_read on public.collection_products for select to anon, authenticated
using (
  active_from <= statement_timestamp() and active_until > statement_timestamp()
  and exists (select 1 from public.collections c where c.id = collection_id and c.status = 'published')
  and exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.search_visible)
);
create policy collection_products_staff_all on public.collection_products for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

create policy tags_public_read on public.tags for select to anon, authenticated using (filter_visible);
create policy tags_staff_all on public.tags for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy tag_translations_public_read on public.tag_translations for select to anon, authenticated
using (exists (select 1 from public.tags t where t.id = tag_id and t.filter_visible));
create policy tag_translations_staff_all on public.tag_translations for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy product_tags_public_read on public.product_tags for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.search_visible));
create policy product_tags_staff_all on public.product_tags for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

create policy product_relations_public_read on public.product_relations for select to anon, authenticated
using (
  exists (select 1 from public.products p where p.id = source_product_id and p.status = 'published' and p.search_visible)
  and exists (select 1 from public.products p where p.id = target_product_id and p.status = 'published' and p.search_visible)
);
create policy product_relations_staff_all on public.product_relations for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy merchandising_public_read on public.merchandising_slots for select to anon, authenticated
using (status = 'published' and active_from <= statement_timestamp() and active_until > statement_timestamp());
create policy merchandising_staff_all on public.merchandising_slots for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

create policy media_assets_public_read on public.media_assets for select to anon, authenticated
using (
  approval_status = 'approved'
  and exists (
    select 1 from public.media_licenses ml
    where ml.asset_id = public.media_assets.id and ml.status = 'approved'
      and (ml.expires_at is null or ml.expires_at > statement_timestamp())
  )
  and exists (
    select 1 from public.media_links link
    join public.products p on link.entity_type = 'product' and link.entity_id = p.id
    where link.asset_id = public.media_assets.id and p.status = 'published' and p.search_visible
  )
);
create policy media_assets_staff_all on public.media_assets for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy media_licenses_public_read on public.media_licenses for select to anon, authenticated
using (status = 'approved' and (expires_at is null or expires_at > statement_timestamp()));
create policy media_licenses_staff_all on public.media_licenses for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy media_variants_public_read on public.media_variants for select to anon, authenticated
using (
  status = 'approved' and bucket = 'product-renditions'
  and exists (
    select 1 from public.media_assets asset
    where asset.id = public.media_variants.asset_id and asset.approval_status = 'approved'
  )
);
create policy media_variants_staff_all on public.media_variants for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy media_links_public_read on public.media_links for select to anon, authenticated
using (
  entity_type = 'product'
  and exists (
    select 1 from public.products p
    where p.id = public.media_links.entity_id and p.status = 'published' and p.search_visible
  )
);
create policy media_links_staff_all on public.media_links for all to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());

grant select on storage.objects to anon, authenticated;
create policy product_renditions_public_read on storage.objects for select to anon, authenticated
using (
  bucket_id = 'product-renditions'
  and exists (
    select 1 from public.media_variants variant
    where variant.path = name and variant.bucket = bucket_id and variant.status = 'approved'
  )
);
create policy catalog_storage_staff_all on storage.objects for all to authenticated
using (bucket_id in ('product-originals', 'product-renditions') and public.is_active_staff())
with check (bucket_id in ('product-originals', 'product-renditions') and public.is_active_staff());

grant all on public.products, public.product_translations, public.product_prices,
  public.inventory_items, public.collections, public.collection_translations,
  public.collection_products, public.tags, public.tag_translations,
  public.product_tags, public.product_relations, public.merchandising_slots,
  public.media_assets, public.media_licenses, public.media_variants, public.media_links
to service_role;
grant usage, select on all sequences in schema public to service_role;
