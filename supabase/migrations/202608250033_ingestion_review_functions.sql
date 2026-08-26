create or replace function public.save_ingestion_product_review(
  p_batch_id uuid,
  p_expected_version bigint,
  p_facts jsonb,
  p_translations jsonb,
  p_currency public.currency_code,
  p_amount_minor bigint,
  p_on_hand_quantity integer
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  product public.products;
  translation_count integer;
begin
  perform app_private.assert_manager();
  if jsonb_typeof(p_facts) <> 'object' or jsonb_typeof(p_translations) <> 'array'
    or p_amount_minor not between 0 and 9000000000000000
    or p_on_hand_quantity not between 0 and 1000000 then
    raise exception 'INVALID_PRODUCT_REVIEW' using errcode = '22023';
  end if;

  select p.* into product
  from public.products p
  join public.ingestion_batches batch on batch.product_id = p.id
  where batch.id = p_batch_id
  for update of p;
  if not found then raise exception 'INGESTION_PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
  if product.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;

  select count(distinct locale)
  into translation_count
  from jsonb_to_recordset(p_translations) as item(locale text, slug text, name text, short_description text, long_description text, care_text text, seo_title text, seo_description text);
  if translation_count <> 4 or jsonb_array_length(p_translations) <> 4
    or exists (
      select 1 from jsonb_to_recordset(p_translations) as item(locale text, slug text, name text, short_description text, long_description text)
      where locale not in ('ka', 'en', 'de', 'ru') or slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        or char_length(name) not between 1 and 180
        or char_length(short_description) not between 1 and 500
        or char_length(long_description) not between 1 and 10000
    ) then
    raise exception 'TRANSLATION_INCOMPLETE' using errcode = '22023';
  end if;

  update public.products set
    status = 'in_review',
    width_mm = nullif(p_facts ->> 'widthMm', '')::integer,
    length_mm = nullif(p_facts ->> 'lengthMm', '')::integer,
    diameter_mm = nullif(p_facts ->> 'diameterMm', '')::integer,
    shape = nullif(p_facts ->> 'shape', ''),
    materials = array(select jsonb_array_elements_text(coalesce(p_facts -> 'materials', '[]'::jsonb))),
    construction = nullif(p_facts ->> 'construction', ''),
    colors = array(select jsonb_array_elements_text(coalesce(p_facts -> 'colors', '[]'::jsonb))),
    styles = array(select jsonb_array_elements_text(coalesce(p_facts -> 'styles', '[]'::jsonb))),
    condition = nullif(p_facts ->> 'condition', ''),
    care_code = nullif(p_facts ->> 'careCode', ''),
    delivery_class = nullif(p_facts ->> 'deliveryClass', ''),
    category = nullif(p_facts ->> 'category', ''),
    origin = case when coalesce((p_facts ->> 'originVerified')::boolean, false) then nullif(p_facts ->> 'origin', '') else null end,
    origin_verified = coalesce((p_facts ->> 'originVerified')::boolean, false),
    updated_by = auth.uid()
  where id = product.id returning * into product;

  insert into public.product_translations (
    product_id, locale, slug, name, short_description, long_description,
    care_text, search_text, seo_title, seo_description, alt_text_ready,
    status, reviewed_by
  )
  select
    product.id, item.locale::public.app_locale, item.slug, item.name,
    item.short_description, item.long_description, nullif(item.care_text, ''),
    concat_ws(' ', item.name, item.short_description, item.long_description),
    nullif(item.seo_title, ''), nullif(item.seo_description, ''), true,
    'reviewed'::public.translation_status, auth.uid()
  from jsonb_to_recordset(p_translations) as item(
    locale text, slug text, name text, short_description text, long_description text,
    care_text text, seo_title text, seo_description text
  )
  on conflict (product_id, locale) do update set
    slug = excluded.slug, name = excluded.name,
    short_description = excluded.short_description,
    long_description = excluded.long_description,
    care_text = excluded.care_text, search_text = excluded.search_text,
    seo_title = excluded.seo_title, seo_description = excluded.seo_description,
    alt_text_ready = true, status = 'reviewed', reviewed_by = auth.uid();

  update public.product_prices
  set amount_minor = p_amount_minor, enabled = true, updated_at = statement_timestamp()
  where product_id = product.id and currency = p_currency and market_code is null and enabled;
  if not found then
    insert into public.product_prices (product_id, currency, amount_minor, enabled)
    values (product.id, p_currency, p_amount_minor, true);
  end if;

  insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
  values (product.id, case when p_on_hand_quantity <= 1 then 'unique'::public.stock_model else 'stocked'::public.stock_model end, p_on_hand_quantity)
  on conflict (product_id) do update set
    stock_model = excluded.stock_model,
    on_hand_quantity = excluded.on_hand_quantity;

  return product;
end;
$$;

create or replace function public.approve_ingestion_media(
  p_file_id uuid,
  p_expected_asset_version bigint,
  p_alt_text text,
  p_focal_x numeric,
  p_focal_y numeric,
  p_ownership_basis text,
  p_creator_source text
)
returns public.media_assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  file public.ingestion_files;
  batch public.ingestion_batches;
  asset public.media_assets;
  link_position integer;
  make_primary boolean;
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_alt_text)) not between 3 and 500
    or p_focal_x not between 0 and 1 or p_focal_y not between 0 and 1
    or p_ownership_basis not in ('owned', 'licensed', 'generated')
    or char_length(btrim(p_creator_source)) not between 2 and 300 then
    raise exception 'INVALID_MEDIA_REVIEW' using errcode = '22023';
  end if;

  select * into file from public.ingestion_files where id = p_file_id for update;
  if not found or file.media_asset_id is null or file.status not in ('ready', 'duplicate') then
    raise exception 'MEDIA_NOT_READY' using errcode = '55000';
  end if;
  select * into batch from public.ingestion_batches where id = file.batch_id;
  if batch.product_id is null then raise exception 'INGESTION_PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into asset from public.media_assets where id = file.media_asset_id for update;
  if asset.version <> p_expected_asset_version then raise exception 'VERSION_CONFLICT' using errcode = '40001'; end if;

  update public.media_licenses set
    ownership_basis = p_ownership_basis,
    creator_source = btrim(p_creator_source),
    status = 'approved', approved_by = auth.uid(), approved_at = statement_timestamp()
  where asset_id = asset.id;
  update public.media_variants set
    focal_x = p_focal_x, focal_y = p_focal_y, status = 'approved'
  where asset_id = asset.id and recipe_version = file.recipe_version and status <> 'retired';
  if not found then raise exception 'RENDITIONS_INCOMPLETE' using errcode = '55000'; end if;
  update public.media_assets set approval_status = 'approved'
  where id = asset.id returning * into asset;

  make_primary := not exists (select 1 from public.media_links where entity_type = 'product' and entity_id = batch.product_id and primary_link);
  select coalesce(max(position), -1) + 1 into link_position
  from public.media_links where entity_type = 'product' and entity_id = batch.product_id and purpose in ('primary', 'gallery');
  insert into public.media_links (
    asset_id, entity_type, entity_id, purpose, position, primary_link,
    alt_text, approved_crop_version
  ) values (
    asset.id, 'product', batch.product_id, case when make_primary then 'primary' else 'gallery' end,
    link_position, make_primary, btrim(p_alt_text), file.recipe_version
  ) on conflict (entity_type, entity_id, purpose, position) do update set
    asset_id = excluded.asset_id, alt_text = excluded.alt_text,
    approved_crop_version = excluded.approved_crop_version;

  if make_primary then
    update public.products set primary_media_asset_id = asset.id, updated_by = auth.uid()
    where id = batch.product_id;
  end if;
  update public.media_jobs set status = 'complete'
  where subject_id = file.id and recipe_version = file.recipe_version::text and status = 'needs_review';
  return asset;
end;
$$;

revoke all on function public.save_ingestion_product_review(uuid, bigint, jsonb, jsonb, public.currency_code, bigint, integer) from public, anon;
revoke all on function public.approve_ingestion_media(uuid, bigint, text, numeric, numeric, text, text) from public, anon;
grant execute on function public.save_ingestion_product_review(uuid, bigint, jsonb, jsonb, public.currency_code, bigint, integer) to authenticated, service_role;
grant execute on function public.approve_ingestion_media(uuid, bigint, text, numeric, numeric, text, text) to authenticated, service_role;

insert into public.integration_configs (key, mode, capabilities, secret_configured, safe_reason)
values ('catalog-assistance', 'disabled', '{}', false, 'Owner privacy approval and provider key are required.')
on conflict (key) do nothing;
