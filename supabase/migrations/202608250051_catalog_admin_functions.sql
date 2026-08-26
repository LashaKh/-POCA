create or replace function app_private.catalog_actor_class()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'service'
    else coalesce(
      (select staff.role::text from public.staff_members staff
       where staff.profile_id = auth.uid() and staff.active),
      'service'
    )
  end;
$$;

create or replace function app_private.catalog_product_snapshot(p_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'product', to_jsonb(product_record),
    'translations', coalesce((
      select jsonb_agg(to_jsonb(translation) order by translation.locale)
      from public.product_translations translation
      where translation.product_id = product_record.id
    ), '[]'::jsonb),
    'prices', coalesce((
      select jsonb_agg(to_jsonb(price) order by price.currency, price.market_code nulls first)
      from public.product_prices price where price.product_id = product_record.id
    ), '[]'::jsonb),
    'inventory', (
      select to_jsonb(inventory) from public.inventory_items inventory
      where inventory.product_id = product_record.id
    )
  )
  from public.products product_record where product_record.id = p_product_id;
$$;

create or replace function public.save_catalog_product(
  p_sku text,
  p_facts jsonb,
  p_translations jsonb,
  p_prices jsonb,
  p_stock_model public.stock_model,
  p_on_hand_quantity integer,
  p_change_note text,
  p_product_id uuid default null,
  p_expected_version bigint default null
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_record public.products;
  translation_record jsonb;
  price_record jsonb;
  target_id uuid := coalesce(p_product_id, extensions.gen_random_uuid());
  is_create boolean := p_product_id is null;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.catalog_actor_class();
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_sku)) not between 2 and 80
    or jsonb_typeof(p_facts) <> 'object'
    or jsonb_typeof(p_translations) <> 'array'
    or jsonb_typeof(p_prices) <> 'array'
    or jsonb_array_length(p_translations) = 0
    or jsonb_array_length(p_prices) = 0
    or p_on_hand_quantity < 0
    or (p_stock_model = 'unique' and p_on_hand_quantity > 1)
    or char_length(p_change_note) not between 2 and 500 then
    raise exception 'INVALID_CATALOG_PRODUCT' using errcode = '22023';
  end if;

  if is_create then
    insert into public.products (
      id, sku, status, width_mm, length_mm, diameter_mm, shape, materials,
      construction, colors, styles, condition, care_code, delivery_class,
      origin, origin_verified, age_min_year, age_max_year, age_verified,
      pile, pile_verified, handmade, handmade_verified,
      provenance_summary, provenance_verified, category, created_by, updated_by
    ) values (
      target_id, btrim(p_sku), 'draft',
      nullif(p_facts ->> 'widthMm', '')::integer,
      nullif(p_facts ->> 'lengthMm', '')::integer,
      nullif(p_facts ->> 'diameterMm', '')::integer,
      nullif(btrim(p_facts ->> 'shape'), ''),
      array(select jsonb_array_elements_text(coalesce(p_facts -> 'materials', '[]'::jsonb))),
      nullif(btrim(p_facts ->> 'construction'), ''),
      array(select jsonb_array_elements_text(coalesce(p_facts -> 'colors', '[]'::jsonb))),
      array(select jsonb_array_elements_text(coalesce(p_facts -> 'styles', '[]'::jsonb))),
      nullif(btrim(p_facts ->> 'condition'), ''),
      nullif(btrim(p_facts ->> 'careCode'), ''),
      nullif(btrim(p_facts ->> 'deliveryClass'), ''),
      nullif(btrim(p_facts ->> 'origin'), ''),
      coalesce((p_facts ->> 'originVerified')::boolean, false),
      nullif(p_facts ->> 'ageMinYear', '')::integer,
      nullif(p_facts ->> 'ageMaxYear', '')::integer,
      coalesce((p_facts ->> 'ageVerified')::boolean, false),
      nullif(btrim(p_facts ->> 'pile'), ''),
      coalesce((p_facts ->> 'pileVerified')::boolean, false),
      nullif(p_facts ->> 'handmade', '')::boolean,
      coalesce((p_facts ->> 'handmadeVerified')::boolean, false),
      nullif(btrim(p_facts ->> 'provenanceSummary'), ''),
      coalesce((p_facts ->> 'provenanceVerified')::boolean, false),
      nullif(btrim(p_facts ->> 'category'), ''),
      auth.uid(), auth.uid()
    ) returning * into product_record;
    insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
    values (target_id, p_stock_model, p_on_hand_quantity);
  else
    select * into product_record from public.products where id = target_id for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
    if product_record.version <> p_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = '40001';
    end if;
    update public.products set
      sku = btrim(p_sku),
      width_mm = nullif(p_facts ->> 'widthMm', '')::integer,
      length_mm = nullif(p_facts ->> 'lengthMm', '')::integer,
      diameter_mm = nullif(p_facts ->> 'diameterMm', '')::integer,
      shape = nullif(btrim(p_facts ->> 'shape'), ''),
      materials = array(select jsonb_array_elements_text(coalesce(p_facts -> 'materials', '[]'::jsonb))),
      construction = nullif(btrim(p_facts ->> 'construction'), ''),
      colors = array(select jsonb_array_elements_text(coalesce(p_facts -> 'colors', '[]'::jsonb))),
      styles = array(select jsonb_array_elements_text(coalesce(p_facts -> 'styles', '[]'::jsonb))),
      condition = nullif(btrim(p_facts ->> 'condition'), ''),
      care_code = nullif(btrim(p_facts ->> 'careCode'), ''),
      delivery_class = nullif(btrim(p_facts ->> 'deliveryClass'), ''),
      origin = nullif(btrim(p_facts ->> 'origin'), ''),
      origin_verified = coalesce((p_facts ->> 'originVerified')::boolean, false),
      age_min_year = nullif(p_facts ->> 'ageMinYear', '')::integer,
      age_max_year = nullif(p_facts ->> 'ageMaxYear', '')::integer,
      age_verified = coalesce((p_facts ->> 'ageVerified')::boolean, false),
      pile = nullif(btrim(p_facts ->> 'pile'), ''),
      pile_verified = coalesce((p_facts ->> 'pileVerified')::boolean, false),
      handmade = nullif(p_facts ->> 'handmade', '')::boolean,
      handmade_verified = coalesce((p_facts ->> 'handmadeVerified')::boolean, false),
      provenance_summary = nullif(btrim(p_facts ->> 'provenanceSummary'), ''),
      provenance_verified = coalesce((p_facts ->> 'provenanceVerified')::boolean, false),
      category = nullif(btrim(p_facts ->> 'category'), ''),
      readiness_passed = false, structured_data_eligible = false,
      updated_by = auth.uid(), version = version + 1
    where id = target_id returning * into product_record;
  end if;

  for translation_record in select value from jsonb_array_elements(p_translations)
  loop
    if coalesce(translation_record ->> 'locale', '') not in ('ka', 'en', 'de', 'ru')
      or coalesce(translation_record ->> 'slug', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or char_length(btrim(coalesce(translation_record ->> 'name', ''))) not between 1 and 180 then
      raise exception 'INVALID_CATALOG_TRANSLATION' using errcode = '22023';
    end if;
    insert into public.product_translations (
      product_id, locale, slug, name, short_description, long_description,
      care_text, search_text, seo_title, seo_description, alt_text_ready, status
    ) values (
      target_id, (translation_record ->> 'locale')::public.app_locale,
      translation_record ->> 'slug', btrim(translation_record ->> 'name'),
      nullif(btrim(translation_record ->> 'shortDescription'), ''),
      nullif(btrim(translation_record ->> 'longDescription'), ''),
      nullif(btrim(translation_record ->> 'careText'), ''),
      btrim(coalesce(translation_record ->> 'searchText', translation_record ->> 'name')),
      nullif(btrim(translation_record ->> 'seoTitle'), ''),
      nullif(btrim(translation_record ->> 'seoDescription'), ''),
      coalesce((translation_record ->> 'altTextReady')::boolean, false),
      coalesce((translation_record ->> 'status')::public.translation_status, 'draft')
    )
    on conflict (product_id, locale) do update set
      slug = excluded.slug, name = excluded.name,
      short_description = excluded.short_description,
      long_description = excluded.long_description, care_text = excluded.care_text,
      search_text = excluded.search_text, seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      alt_text_ready = excluded.alt_text_ready, status = excluded.status,
      version = public.product_translations.version + 1;
  end loop;

  for price_record in select value from jsonb_array_elements(p_prices)
  loop
    if coalesce(price_record ->> 'currency', '') not in ('GEL', 'USD', 'EUR')
      or coalesce((price_record ->> 'amountMinor')::bigint, -1) < 0 then
      raise exception 'INVALID_CATALOG_PRICE' using errcode = '22023';
    end if;
    update public.product_prices set
      amount_minor = (price_record ->> 'amountMinor')::bigint,
      enabled = coalesce((price_record ->> 'enabled')::boolean, true),
      version = version + 1
    where product_id = target_id
      and currency = (price_record ->> 'currency')::public.currency_code
      and market_code is null;
    if not found then
      insert into public.product_prices (product_id, currency, amount_minor, enabled)
      values (
        target_id, (price_record ->> 'currency')::public.currency_code,
        (price_record ->> 'amountMinor')::bigint,
        coalesce((price_record ->> 'enabled')::boolean, true)
      );
    end if;
  end loop;

  insert into public.catalog_revisions (
    entity_type, entity_id, entity_version, revision_kind, changed_fields,
    snapshot, note, actor_profile_id, correlation_id
  ) values (
    'product', target_id, product_record.version,
    case when is_create then 'created'::public.catalog_revision_kind else 'updated'::public.catalog_revision_kind end,
    array['facts', 'translations', 'prices'], app_private.catalog_product_snapshot(target_id),
    p_change_note, auth.uid(), correlation
  );
  perform app_private.write_audit_event(
    actor_class, case when is_create then 'catalog.product.create' else 'catalog.product.update' end,
    'product', target_id::text, 'succeeded', 'catalog-admin', correlation,
    jsonb_build_object('version', product_record.version)
  );
  return product_record;
end;
$$;

create or replace function public.adjust_catalog_inventory(
  p_product_id uuid,
  p_expected_inventory_version bigint,
  p_quantity_delta integer,
  p_reason text,
  p_idempotency_key text
)
returns public.inventory_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  inventory_record public.inventory_items;
  existing_adjustment public.inventory_adjustments;
  product_record public.products;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_quantity_delta = 0 or char_length(btrim(p_reason)) not between 2 and 500
    or char_length(p_idempotency_key) not between 16 and 180 then
    raise exception 'INVALID_INVENTORY_ADJUSTMENT' using errcode = '22023';
  end if;
  select * into existing_adjustment from public.inventory_adjustments
  where idempotency_key = p_idempotency_key;
  if found then
    select * into inventory_record from public.inventory_items
    where id = existing_adjustment.inventory_item_id;
    return inventory_record;
  end if;
  select * into product_record from public.products where id = p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into inventory_record from public.inventory_items
  where product_id = p_product_id for update;
  if not found then raise exception 'INVENTORY_NOT_FOUND' using errcode = 'P0002'; end if;
  if inventory_record.version <> p_expected_inventory_version then
    raise exception 'INVENTORY_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if inventory_record.on_hand_quantity + p_quantity_delta < inventory_record.reserved_quantity
    or (inventory_record.stock_model = 'unique' and inventory_record.on_hand_quantity + p_quantity_delta > 1) then
    raise exception 'INVENTORY_ADJUSTMENT_UNSAFE' using errcode = '55000';
  end if;
  update public.inventory_items set
    on_hand_quantity = on_hand_quantity + p_quantity_delta,
    version = version + 1
  where id = inventory_record.id returning * into inventory_record;
  update public.products set updated_by = auth.uid(), version = version + 1
  where id = p_product_id returning * into product_record;
  insert into public.inventory_adjustments (
    inventory_item_id, previous_on_hand, resulting_on_hand, quantity_delta,
    reason, idempotency_key, actor_profile_id, correlation_id
  ) values (
    inventory_record.id, inventory_record.on_hand_quantity - p_quantity_delta,
    inventory_record.on_hand_quantity, p_quantity_delta, btrim(p_reason),
    p_idempotency_key, auth.uid(), correlation
  );
  insert into public.inventory_events (
    inventory_item_id, event_type, quantity_delta, reason,
    correlation_id, actor_profile_id
  ) values (
    inventory_record.id, 'adjusted', p_quantity_delta,
    left(btrim(p_reason), 120), correlation, auth.uid()
  );
  insert into public.catalog_revisions (
    entity_type, entity_id, entity_version, revision_kind, changed_fields,
    snapshot, note, actor_profile_id, correlation_id
  ) values (
    'product', p_product_id, product_record.version, 'inventory', array['inventory'],
    app_private.catalog_product_snapshot(p_product_id), p_reason, auth.uid(), correlation
  );
  perform app_private.write_audit_event(
    app_private.catalog_actor_class(), 'catalog.inventory.adjust', 'product',
    p_product_id::text, 'succeeded', 'catalog-admin', correlation,
    jsonb_build_object('quantityDelta', p_quantity_delta, 'resultingOnHand', inventory_record.on_hand_quantity)
  );
  return inventory_record;
end;
$$;

create or replace function public.bulk_catalog_action(
  p_product_ids uuid[],
  p_action text,
  p_reason text,
  p_idempotency_key text,
  p_collection_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.catalog_bulk_actions;
  target_product_id uuid;
  product_record public.products;
  correlation uuid := extensions.gen_random_uuid();
  succeeded jsonb := '[]'::jsonb;
  failed jsonb := '[]'::jsonb;
begin
  perform app_private.assert_manager();
  if cardinality(p_product_ids) not between 1 and 500
    or p_action not in ('publish', 'unpublish', 'archive', 'restore', 'collection_add', 'collection_remove')
    or char_length(btrim(p_reason)) not between 2 and 500
    or char_length(p_idempotency_key) not between 16 and 180
    or (p_action like 'collection_%' and p_collection_id is null) then
    raise exception 'INVALID_BULK_CATALOG_ACTION' using errcode = '22023';
  end if;
  select * into existing_run from public.catalog_bulk_actions
  where idempotency_key = p_idempotency_key;
  if found then return existing_run.result; end if;

  foreach target_product_id in array p_product_ids loop
    begin
      select * into product_record from public.products where id = target_product_id for update;
      if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
      if p_action = 'archive' then
        if exists (select 1 from public.inventory_reservations reservation
          where reservation.product_id = target_product_id and reservation.status = 'active') then
          raise exception 'ACTIVE_RESERVATION_BLOCKS_ARCHIVE' using errcode = '55000';
        end if;
        update public.products set status = 'archived', search_visible = false,
          archived_at = statement_timestamp(), archived_by = auth.uid(),
          archive_reason = btrim(p_reason), version = version + 1
        where id = target_product_id returning * into product_record;
      elsif p_action = 'restore' then
        if product_record.status <> 'archived' then
          raise exception 'PRODUCT_NOT_ARCHIVED' using errcode = '55000';
        end if;
        update public.products set status = 'draft', search_visible = false,
          archived_at = null, archived_by = null, archive_reason = null,
          readiness_passed = false, version = version + 1
        where id = target_product_id returning * into product_record;
      elsif p_action = 'publish' then
        product_record := public.publish_product(target_product_id, product_record.version, true);
      elsif p_action = 'unpublish' then
        if product_record.status not in ('published', 'scheduled') then
          raise exception 'PRODUCT_NOT_PUBLIC' using errcode = '55000';
        end if;
        update public.products set status = 'unpublished', search_visible = false,
          structured_data_eligible = false, scheduled_at = null,
          unpublished_at = statement_timestamp(), version = version + 1
        where id = target_product_id returning * into product_record;
        update public.scheduled_actions set status = 'complete',
          safe_error_code = 'CANCELLED_BY_MANAGER', completed_at = statement_timestamp(),
          lease_owner = null, lease_expires_at = null
        where action_type = 'publish-catalog-product'
          and subject_id = target_product_id and status in ('pending', 'leased', 'failed');
      elsif p_action = 'collection_add' then
        insert into public.collection_products (collection_id, product_id, position)
        values (p_collection_id, target_product_id,
          coalesce((select max(position) + 1 from public.collection_products where collection_id = p_collection_id), 0))
        on conflict (collection_id, product_id) do nothing;
        update public.products set version = version + 1 where id = target_product_id returning * into product_record;
      else
        delete from public.collection_products
        where collection_id = p_collection_id and collection_products.product_id = target_product_id;
        update public.products set version = version + 1 where id = target_product_id returning * into product_record;
      end if;
      insert into public.catalog_revisions (
        entity_type, entity_id, entity_version, revision_kind, changed_fields,
        snapshot, note, actor_profile_id, correlation_id
      ) values (
        'product', target_product_id, product_record.version,
        case p_action
          when 'archive' then 'archived'::public.catalog_revision_kind
          when 'restore' then 'restored'::public.catalog_revision_kind
          when 'publish' then 'published'::public.catalog_revision_kind
          when 'unpublish' then 'updated'::public.catalog_revision_kind
          else 'merchandising'::public.catalog_revision_kind
        end,
        array[p_action], app_private.catalog_product_snapshot(target_product_id),
        p_reason, auth.uid(), correlation
      ) on conflict (entity_type, entity_id, entity_version) do nothing;
      succeeded := succeeded || jsonb_build_array(jsonb_build_object('productId', target_product_id));
    exception when others then
      failed := failed || jsonb_build_array(jsonb_build_object(
        'productId', target_product_id,
        'code', case
          when sqlerrm in ('PRODUCT_NOT_FOUND', 'ACTIVE_RESERVATION_BLOCKS_ARCHIVE',
            'PRODUCT_NOT_ARCHIVED', 'PRODUCT_NOT_PUBLIC', 'PRODUCT_NOT_READY') then sqlerrm
          else 'CATALOG_ACTION_FAILED'
        end
      ));
    end;
  end loop;
  insert into public.catalog_bulk_actions (
    action, requested_product_ids, collection_id, result, idempotency_key,
    actor_profile_id, correlation_id
  ) values (
    p_action, p_product_ids, p_collection_id,
    jsonb_build_object('succeeded', succeeded, 'failed', failed),
    p_idempotency_key, auth.uid(), correlation
  ) returning * into existing_run;
  perform app_private.write_audit_event(
    app_private.catalog_actor_class(), 'catalog.bulk.' || p_action, 'catalog', null,
    'succeeded', 'catalog-admin', correlation,
    jsonb_build_object('requestedCount', cardinality(p_product_ids),
      'succeededCount', jsonb_array_length(succeeded), 'failedCount', jsonb_array_length(failed))
  );
  return existing_run.result;
end;
$$;

create or replace function public.schedule_catalog_product(
  p_product_id uuid,
  p_expected_version bigint,
  p_scheduled_at timestamptz,
  p_reason text
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_record public.products;
  readiness jsonb;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_scheduled_at <= statement_timestamp()
    or p_scheduled_at > statement_timestamp() + interval '2 years'
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_PRODUCT_SCHEDULE' using errcode = '22023';
  end if;
  select * into product_record from public.products where id = p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002'; end if;
  if product_record.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  readiness := public.evaluate_product_readiness(p_product_id);
  if not (readiness ->> 'ready')::boolean then
    raise exception 'PRODUCT_NOT_READY' using errcode = '55000', detail = readiness::text;
  end if;
  update public.products set
    status = 'scheduled', scheduled_at = p_scheduled_at,
    search_visible = false, structured_data_eligible = false,
    readiness_passed = true, version = version + 1
  where id = p_product_id returning * into product_record;
  insert into public.scheduled_actions (
    action_type, subject_type, subject_id, due_at, idempotency_key, correlation_id
  ) values (
    'publish-catalog-product', 'product', p_product_id, p_scheduled_at,
    'catalog-product-publish:' || p_product_id::text, correlation
  ) on conflict (idempotency_key) do update set
    due_at = excluded.due_at, status = 'pending', attempt_count = 0,
    safe_error_code = null, correlation_id = excluded.correlation_id,
    lease_owner = null, lease_expires_at = null, completed_at = null;
  insert into public.catalog_revisions (
    entity_type, entity_id, entity_version, revision_kind, changed_fields,
    snapshot, note, actor_profile_id, correlation_id
  ) values (
    'product', p_product_id, product_record.version, 'updated',
    array['status', 'scheduledAt'], app_private.catalog_product_snapshot(p_product_id),
    btrim(p_reason), auth.uid(), correlation
  );
  perform app_private.write_audit_event(
    app_private.catalog_actor_class(), 'catalog.product.schedule', 'product',
    p_product_id::text, 'succeeded', 'catalog-admin', correlation,
    jsonb_build_object('scheduledAt', p_scheduled_at)
  );
  return product_record;
end;
$$;

create or replace function public.save_catalog_collection(
  p_code text,
  p_status public.collection_status,
  p_order_strategy text,
  p_translations jsonb,
  p_note text,
  p_collection_id uuid default null,
  p_expected_version bigint default null,
  p_scheduled_at timestamptz default null
)
returns public.collections
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection_record public.collections;
  translation_record jsonb;
  target_id uuid := coalesce(p_collection_id, extensions.gen_random_uuid());
  is_create boolean := p_collection_id is null;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or p_order_strategy not in ('manual', 'newest', 'price_asc', 'price_desc')
    or jsonb_typeof(p_translations) <> 'array'
    or jsonb_array_length(p_translations) = 0
    or char_length(p_note) not between 2 and 500
    or (p_status = 'scheduled' and (p_scheduled_at is null or p_scheduled_at <= statement_timestamp())) then
    raise exception 'INVALID_CATALOG_COLLECTION' using errcode = '22023';
  end if;
  if is_create then
    insert into public.collections (
      id, code, status, order_strategy, scheduled_at, published_at,
      archived_by, archive_reason
    ) values (
      target_id, p_code, p_status, p_order_strategy,
      case when p_status = 'scheduled' then p_scheduled_at end,
      case when p_status = 'published' then statement_timestamp() end,
      case when p_status = 'archived' then auth.uid() end,
      case when p_status = 'archived' then btrim(p_note) end
    )
    returning * into collection_record;
  else
    select * into collection_record from public.collections where id = target_id for update;
    if not found then raise exception 'COLLECTION_NOT_FOUND' using errcode = 'P0002'; end if;
    if collection_record.version <> p_expected_version then
      raise exception 'VERSION_CONFLICT' using errcode = '40001';
    end if;
    update public.collections set code = p_code, status = p_status,
      order_strategy = p_order_strategy,
      scheduled_at = case when p_status = 'scheduled' then p_scheduled_at end,
      published_at = case
        when p_status = 'published' then coalesce(published_at, statement_timestamp())
        when p_status in ('draft', 'scheduled') then null
        else published_at
      end,
      archived_by = case when p_status = 'archived' then auth.uid() end,
      archive_reason = case when p_status = 'archived' then btrim(p_note) end,
      version = version + 1
    where id = target_id returning * into collection_record;
  end if;
  for translation_record in select value from jsonb_array_elements(p_translations)
  loop
    insert into public.collection_translations (
      collection_id, locale, slug, name, description, seo_title, seo_description, status
    ) values (
      target_id, (translation_record ->> 'locale')::public.app_locale,
      translation_record ->> 'slug', btrim(translation_record ->> 'name'),
      nullif(btrim(translation_record ->> 'description'), ''),
      nullif(btrim(translation_record ->> 'seoTitle'), ''),
      nullif(btrim(translation_record ->> 'seoDescription'), ''),
      coalesce((translation_record ->> 'status')::public.translation_status, 'draft')
    ) on conflict (collection_id, locale) do update set
      slug = excluded.slug, name = excluded.name, description = excluded.description,
      seo_title = excluded.seo_title, seo_description = excluded.seo_description,
      status = excluded.status, version = public.collection_translations.version + 1;
  end loop;
  insert into public.catalog_revisions (
    entity_type, entity_id, entity_version, revision_kind, changed_fields,
    snapshot, note, actor_profile_id, correlation_id
  ) values (
    'collection', target_id, collection_record.version,
    case when is_create then 'created'::public.catalog_revision_kind else 'updated'::public.catalog_revision_kind end,
    array['collection', 'translations'],
    jsonb_build_object('collection', to_jsonb(collection_record), 'translations', p_translations),
    p_note, auth.uid(), correlation
  );
  if p_status = 'scheduled' then
    insert into public.scheduled_actions (
      action_type, subject_type, subject_id, due_at, idempotency_key, correlation_id
    ) values (
      'publish-catalog-collection', 'collection', target_id, p_scheduled_at,
      'catalog-collection-publish:' || target_id::text, correlation
    ) on conflict (idempotency_key) do update set
      due_at = excluded.due_at, status = 'pending', attempt_count = 0,
      safe_error_code = null, correlation_id = excluded.correlation_id,
      lease_owner = null, lease_expires_at = null, completed_at = null;
  else
    update public.scheduled_actions set status = 'complete',
      safe_error_code = 'SUPERSEDED_BY_MANAGER', completed_at = statement_timestamp(),
      lease_owner = null, lease_expires_at = null
    where action_type = 'publish-catalog-collection'
      and subject_id = target_id and status in ('pending', 'leased', 'failed');
  end if;
  return collection_record;
end;
$$;

create or replace function public.process_due_catalog_publications(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_record public.scheduled_actions;
  product_record public.products;
  collection_record public.collections;
  readiness jsonb;
  published_products integer := 0;
  published_collections integer := 0;
  failed_count integer := 0;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_limit not between 1 and 500 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;
  for action_record in
    select action.* from public.scheduled_actions action
    where action.action_type in ('publish-catalog-product', 'publish-catalog-collection')
      and action.status in ('pending', 'failed')
      and action.due_at <= statement_timestamp()
      and action.attempt_count < action.max_attempts
    order by action.due_at, action.created_at
    for update skip locked limit p_limit
  loop
    update public.scheduled_actions set status = 'leased',
      lease_owner = 'catalog-publication-coordinator',
      lease_expires_at = statement_timestamp() + interval '2 minutes',
      attempt_count = attempt_count + 1
    where id = action_record.id;
    begin
      if action_record.action_type = 'publish-catalog-product' then
        select * into product_record from public.products
        where id = action_record.subject_id for update;
        if not found or product_record.status <> 'scheduled'
          or product_record.scheduled_at is null
          or product_record.scheduled_at > statement_timestamp() then
          raise exception 'PRODUCT_SCHEDULE_NOT_DUE' using errcode = '55000';
        end if;
        readiness := public.evaluate_product_readiness(product_record.id);
        if not (readiness ->> 'ready')::boolean then
          raise exception 'PRODUCT_NOT_READY' using errcode = '55000';
        end if;
        update public.product_translations set status = 'published'
        where product_id = product_record.id and status = 'reviewed';
        update public.products set status = 'published', readiness_passed = true,
          readiness_version = readiness_version + 1, search_visible = true,
          structured_data_eligible = true, published_at = statement_timestamp(),
          unpublished_at = null, scheduled_at = null, version = version + 1
        where id = product_record.id returning * into product_record;
        insert into public.catalog_revisions (
          entity_type, entity_id, entity_version, revision_kind, changed_fields,
          snapshot, note, actor_profile_id, correlation_id
        ) values (
          'product', product_record.id, product_record.version, 'published',
          array['status', 'publishedAt'],
          app_private.catalog_product_snapshot(product_record.id),
          'Scheduled product publication completed', null, action_record.correlation_id
        );
        perform app_private.write_audit_event(
          'service', 'catalog.product.scheduled-publish', 'product',
          product_record.id::text, 'succeeded', 'catalog-publication-coordinator',
          action_record.correlation_id, jsonb_build_object('version', product_record.version)
        );
        published_products := published_products + 1;
      else
        select * into collection_record from public.collections
        where id = action_record.subject_id for update;
        if not found or collection_record.status <> 'scheduled'
          or collection_record.scheduled_at is null
          or collection_record.scheduled_at > statement_timestamp() then
          raise exception 'COLLECTION_SCHEDULE_NOT_DUE' using errcode = '55000';
        end if;
        if (select count(*) from public.collection_translations translation
          where translation.collection_id = collection_record.id
            and translation.status in ('reviewed', 'published')) <> 4 then
          raise exception 'COLLECTION_NOT_READY' using errcode = '55000';
        end if;
        update public.collection_translations set status = 'published'
        where collection_id = collection_record.id and status = 'reviewed';
        update public.collections set status = 'published', scheduled_at = null,
          published_at = statement_timestamp(), version = version + 1
        where id = collection_record.id returning * into collection_record;
        insert into public.catalog_revisions (
          entity_type, entity_id, entity_version, revision_kind, changed_fields,
          snapshot, note, actor_profile_id, correlation_id
        ) values (
          'collection', collection_record.id, collection_record.version, 'published',
          array['status', 'publishedAt'], jsonb_build_object('collection', to_jsonb(collection_record)),
          'Scheduled collection publication completed', null, action_record.correlation_id
        );
        perform app_private.write_audit_event(
          'service', 'catalog.collection.scheduled-publish', 'collection',
          collection_record.id::text, 'succeeded', 'catalog-publication-coordinator',
          action_record.correlation_id, jsonb_build_object('version', collection_record.version)
        );
        published_collections := published_collections + 1;
      end if;
      update public.scheduled_actions set status = 'complete',
        completed_at = statement_timestamp(), safe_error_code = null,
        lease_owner = null, lease_expires_at = null
      where id = action_record.id;
    exception when others then
      update public.scheduled_actions set status = 'failed',
        safe_error_code = case
          when sqlerrm in ('PRODUCT_NOT_READY', 'COLLECTION_NOT_READY',
            'PRODUCT_SCHEDULE_NOT_DUE', 'COLLECTION_SCHEDULE_NOT_DUE') then sqlerrm
          else 'CATALOG_PUBLICATION_FAILED'
        end,
        lease_owner = null, lease_expires_at = null
      where id = action_record.id;
      failed_count := failed_count + 1;
    end;
  end loop;
  return jsonb_build_object(
    'publishedProducts', published_products,
    'publishedCollections', published_collections,
    'failed', failed_count
  );
end;
$$;

create or replace function public.reorder_catalog_collection(
  p_collection_id uuid,
  p_ordered_product_ids uuid[],
  p_expected_version bigint,
  p_featured_product_id uuid default null
)
returns public.collections
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection_record public.collections;
  member_count integer;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  select * into collection_record from public.collections where id = p_collection_id for update;
  if not found then raise exception 'COLLECTION_NOT_FOUND' using errcode = 'P0002'; end if;
  if collection_record.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  select count(*) into member_count from public.collection_products where collection_id = p_collection_id;
  if member_count <> cardinality(p_ordered_product_ids)
    or member_count <> (select count(distinct value) from unnest(p_ordered_product_ids) value)
    or exists (select 1 from unnest(p_ordered_product_ids) value
      where not exists (select 1 from public.collection_products member
        where member.collection_id = p_collection_id and member.product_id = value))
    or (p_featured_product_id is not null and not p_featured_product_id = any(p_ordered_product_ids)) then
    raise exception 'INVALID_COLLECTION_ORDER' using errcode = '22023';
  end if;
  update public.collection_products member set
    position = ordering.ordinality - 1,
    featured = ordering.product_id = p_featured_product_id
  from unnest(p_ordered_product_ids) with ordinality ordering(product_id, ordinality)
  where member.collection_id = p_collection_id and member.product_id = ordering.product_id;
  update public.collections set order_strategy = 'manual', version = version + 1
  where id = p_collection_id returning * into collection_record;
  insert into public.catalog_revisions (
    entity_type, entity_id, entity_version, revision_kind, changed_fields,
    snapshot, note, actor_profile_id, correlation_id
  ) values (
    'collection', p_collection_id, collection_record.version, 'merchandising',
    array['productOrder', 'featuredProduct'],
    jsonb_build_object('collection', to_jsonb(collection_record),
      'orderedProductIds', to_jsonb(p_ordered_product_ids), 'featuredProductId', p_featured_product_id),
    'Collection order updated', auth.uid(), correlation
  );
  return collection_record;
end;
$$;

create or replace function public.stage_catalog_import(
  p_source_path text,
  p_source_checksum text,
  p_original_filename text,
  p_header_mapping jsonb,
  p_rows jsonb,
  p_error_report_path text default null
)
returns public.catalog_import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_record public.catalog_import_batches;
  row_record jsonb;
begin
  perform app_private.assert_manager();
  if p_source_path !~ '^staff/[a-f0-9-]+/.+\.csv$'
    or p_source_checksum !~ '^[a-f0-9]{64}$'
    or char_length(p_original_filename) not between 1 and 255
    or jsonb_typeof(p_header_mapping) <> 'object'
    or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) > 10000 then
    raise exception 'INVALID_CATALOG_IMPORT' using errcode = '22023';
  end if;
  select * into batch_record from public.catalog_import_batches
  where source_checksum = p_source_checksum;
  if found then return batch_record; end if;
  insert into public.catalog_import_batches (
    status, source_path, source_checksum, original_filename, header_mapping,
    error_report_path,
    row_count, valid_row_count, invalid_row_count, created_by
  ) values (
    'ready', p_source_path, p_source_checksum, p_original_filename, p_header_mapping,
    p_error_report_path,
    jsonb_array_length(p_rows),
    (select count(*) from jsonb_array_elements(p_rows) item where jsonb_array_length(item -> 'errors') = 0),
    (select count(*) from jsonb_array_elements(p_rows) item where jsonb_array_length(item -> 'errors') > 0),
    auth.uid()
  ) returning * into batch_record;
  for row_record in select value from jsonb_array_elements(p_rows)
  loop
    insert into public.catalog_import_rows (
      batch_id, row_number, status, source_record, normalized_record, validation_errors
    ) values (
      batch_record.id, (row_record ->> 'rowNumber')::integer,
      case when jsonb_array_length(row_record -> 'errors') = 0
        then 'valid'::public.catalog_import_row_status else 'invalid'::public.catalog_import_row_status end,
      row_record -> 'source', nullif(row_record -> 'normalized', 'null'::jsonb),
      row_record -> 'errors'
    );
  end loop;
  return batch_record;
end;
$$;

create or replace function public.cancel_catalog_import(p_batch_id uuid)
returns public.catalog_import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_record public.catalog_import_batches;
begin
  perform app_private.assert_manager();
  select * into batch_record from public.catalog_import_batches
  where id = p_batch_id for update;
  if not found then raise exception 'IMPORT_NOT_FOUND' using errcode = 'P0002'; end if;
  if batch_record.status = 'cancelled' then return batch_record; end if;
  if batch_record.status not in ('uploaded', 'validating', 'ready') then
    raise exception 'IMPORT_CANNOT_BE_CANCELLED' using errcode = '55000';
  end if;
  update public.catalog_import_batches set
    status = 'cancelled', completed_at = statement_timestamp(), version = version + 1
  where id = p_batch_id returning * into batch_record;
  return batch_record;
end;
$$;

create or replace function public.apply_catalog_import(p_batch_id uuid)
returns public.catalog_import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_record public.catalog_import_batches;
  import_row public.catalog_import_rows;
  product_record public.products;
begin
  perform app_private.assert_manager();
  select * into batch_record from public.catalog_import_batches where id = p_batch_id for update;
  if not found then raise exception 'IMPORT_NOT_FOUND' using errcode = 'P0002'; end if;
  if batch_record.status = 'complete' then return batch_record; end if;
  if batch_record.status <> 'ready' then raise exception 'IMPORT_NOT_READY' using errcode = '55000'; end if;
  update public.catalog_import_batches set status = 'applying', version = version + 1
  where id = p_batch_id returning * into batch_record;
  for import_row in select * from public.catalog_import_rows
    where batch_id = p_batch_id and status = 'valid' order by row_number for update
  loop
    begin
      product_record := public.save_catalog_product(
        p_sku => import_row.normalized_record ->> 'sku',
        p_facts => import_row.normalized_record -> 'facts',
        p_translations => import_row.normalized_record -> 'translations',
        p_prices => import_row.normalized_record -> 'prices',
        p_stock_model => (import_row.normalized_record ->> 'stockModel')::public.stock_model,
        p_on_hand_quantity => (import_row.normalized_record ->> 'onHandQuantity')::integer,
        p_change_note => 'Created by catalog CSV import'
      );
      update public.catalog_import_rows set status = 'applied', product_id = product_record.id,
        applied_at = statement_timestamp() where id = import_row.id;
    exception when others then
      update public.catalog_import_rows set status = 'failed', safe_error_code = 'IMPORT_ROW_APPLY_FAILED'
      where id = import_row.id;
    end;
  end loop;
  update public.catalog_import_batches batch set
    status = 'complete',
    applied_row_count = (select count(*) from public.catalog_import_rows row_record
      where row_record.batch_id = p_batch_id and row_record.status = 'applied'),
    completed_at = statement_timestamp(), version = version + 1
  where id = p_batch_id returning * into batch_record;
  return batch_record;
end;
$$;

create or replace function public.save_catalog_admin_view(
  p_view_type text,
  p_name text,
  p_filters jsonb,
  p_sort jsonb
)
returns public.saved_admin_views
language plpgsql
security definer
set search_path = ''
as $$
declare
  view_record public.saved_admin_views;
begin
  perform app_private.assert_manager();
  if auth.uid() is null then raise exception 'STAFF_IDENTITY_REQUIRED' using errcode = '42501'; end if;
  insert into public.saved_admin_views (owner_profile_id, view_type, name, filters, sort)
  values (auth.uid(), p_view_type, btrim(p_name), p_filters, p_sort)
  on conflict (owner_profile_id, view_type, name) do update
  set filters = excluded.filters, sort = excluded.sort
  returning * into view_record;
  return view_record;
end;
$$;

create or replace function public.request_catalog_export(
  p_scope jsonb,
  p_download_name text
)
returns public.export_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  export_record public.export_jobs;
begin
  perform app_private.assert_manager();
  if auth.uid() is null or jsonb_typeof(p_scope) <> 'object'
    or char_length(p_download_name) not between 5 and 255
    or p_download_name !~ '^[A-Za-z0-9._-]+\.csv$' then
    raise exception 'INVALID_CATALOG_EXPORT' using errcode = '22023';
  end if;
  insert into public.export_jobs (
    requested_by, export_type, scope, status, expires_at,
    correlation_id, export_format, download_name
  ) values (
    auth.uid(), 'catalog', p_scope, 'pending', statement_timestamp() + interval '24 hours',
    extensions.gen_random_uuid(), 'csv', p_download_name
  ) returning * into export_record;
  return export_record;
end;
$$;

revoke all on function app_private.catalog_actor_class() from public, anon, authenticated;
revoke all on function app_private.catalog_product_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.save_catalog_product(text, jsonb, jsonb, jsonb, public.stock_model, integer, text, uuid, bigint) from public, anon;
revoke all on function public.adjust_catalog_inventory(uuid, bigint, integer, text, text) from public, anon;
revoke all on function public.bulk_catalog_action(uuid[], text, text, text, uuid) from public, anon;
revoke all on function public.schedule_catalog_product(uuid, bigint, timestamptz, text) from public, anon;
revoke all on function public.process_due_catalog_publications(integer) from public, anon, authenticated;
revoke all on function public.save_catalog_collection(text, public.collection_status, text, jsonb, text, uuid, bigint, timestamptz) from public, anon;
revoke all on function public.reorder_catalog_collection(uuid, uuid[], bigint, uuid) from public, anon;
revoke all on function public.stage_catalog_import(text, text, text, jsonb, jsonb, text) from public, anon;
revoke all on function public.apply_catalog_import(uuid) from public, anon;
revoke all on function public.cancel_catalog_import(uuid) from public, anon;
revoke all on function public.save_catalog_admin_view(text, text, jsonb, jsonb) from public, anon;
revoke all on function public.request_catalog_export(jsonb, text) from public, anon;

grant execute on function public.save_catalog_product(text, jsonb, jsonb, jsonb, public.stock_model, integer, text, uuid, bigint) to authenticated, service_role;
grant execute on function public.adjust_catalog_inventory(uuid, bigint, integer, text, text) to authenticated, service_role;
grant execute on function public.bulk_catalog_action(uuid[], text, text, text, uuid) to authenticated, service_role;
grant execute on function public.schedule_catalog_product(uuid, bigint, timestamptz, text) to authenticated, service_role;
grant execute on function public.process_due_catalog_publications(integer) to service_role;
grant execute on function public.save_catalog_collection(text, public.collection_status, text, jsonb, text, uuid, bigint, timestamptz) to authenticated, service_role;
grant execute on function public.reorder_catalog_collection(uuid, uuid[], bigint, uuid) to authenticated, service_role;
grant execute on function public.stage_catalog_import(text, text, text, jsonb, jsonb, text) to authenticated, service_role;
grant execute on function public.apply_catalog_import(uuid) to authenticated, service_role;
grant execute on function public.cancel_catalog_import(uuid) to authenticated, service_role;
grant execute on function public.save_catalog_admin_view(text, text, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.request_catalog_export(jsonb, text) to authenticated, service_role;
