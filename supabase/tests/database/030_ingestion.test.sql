begin;

create extension if not exists pgtap with schema extensions;
select plan(55);

select ok(to_regclass('public.ingestion_batches') is not null, 'ingestion batches exist');
select ok(to_regclass('public.ingestion_files') is not null, 'ingestion files exist');
select ok(to_regclass('public.assisted_suggestions') is not null, 'assisted suggestions exist');
select ok((select relrowsecurity from pg_class where oid = 'public.ingestion_batches'::regclass), 'batches have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.ingestion_files'::regclass), 'files have RLS');
select ok(not has_table_privilege('anon', 'public.ingestion_files', 'select'), 'anonymous clients cannot inspect private ingestion metadata');
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'product_originals_registered_insert'), 'original upload policy requires a registered path');
select ok(not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'catalog_storage_staff_all'), 'broad catalog Storage write policy is removed');
select has_function('public', 'create_ingestion_batch', array['text', 'integer', 'uuid', 'uuid'], 'batch command exists');
select has_function('public', 'register_ingestion_file', array['uuid', 'text', 'text', 'text', 'bigint', 'text', 'bigint'], 'file registration command exists');
select has_function('public', 'claim_ingestion_jobs', array['text', 'integer', 'integer'], 'bounded queue lease command exists');
select has_function('public', 'retry_ingestion_file', array['uuid'], 'manager terminal-job retry command exists');
select has_function('public', 'evaluate_product_readiness', array['uuid'], 'readiness command exists');
select has_function('public', 'publish_product', array['uuid', 'bigint', 'boolean'], 'transactional publication command exists');
select ok(not has_function_privilege('authenticated', 'public.complete_ingestion_upload(uuid,text,bigint,text,integer,integer,smallint)', 'execute'), 'browser staff cannot assert processed upload facts');
select ok(not has_function_privilege('authenticated', 'public.claim_ingestion_jobs(text,integer,integer)', 'execute'), 'browser staff cannot lease worker jobs');
select ok(has_column_privilege('authenticated', 'public.media_jobs', 'subject_id', 'select'), 'authenticated staff can read bounded ingestion job identity fields');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_jobs' and policyname = 'media_jobs_staff_read'), 'media job visibility remains restricted by active-staff RLS');

insert into public.products (
  id, sku, status, width_mm, length_mm, shape, materials, construction, colors,
  styles, condition, care_code, delivery_class
) values (
  '70000000-0000-4000-8000-000000000001', 'INGESTION-READY', 'draft',
  1600, 2400, 'rectangle', array['wool'], 'hand-knotted', array['indigo'],
  array['traditional'], 'excellent', 'professional-clean', 'parcel'
);
insert into auth.users (id, email)
values ('70000000-0000-4000-8000-000000000099', 'reviewer@epoca.test');

set local role service_role;

select isnt(
  (public.create_ingestion_batch('Automatic draft product', 1, null)).product_id,
  null::uuid,
  'a new batch automatically receives a maintainable draft product identity'
);
select matches(
  (select product.sku::text from public.products product join public.ingestion_batches batch on batch.product_id = product.id where batch.title = 'Automatic draft product'),
  '^EPO-[0-9]{8}-[A-F0-9]{8}$',
  'automatic product receives a readable collision-resistant SKU'
);
select is(
  (public.save_ingestion_product_review(
    (select id from public.ingestion_batches where title = 'Automatic draft product'),
    (select product.version from public.products product join public.ingestion_batches batch on batch.product_id = product.id where batch.title = 'Automatic draft product'),
    '{"widthMm":1600,"lengthMm":2400,"shape":"rectangle","materials":["wool"],"construction":"hand-knotted","colors":["blue"],"styles":["traditional"],"condition":"excellent","careCode":"professional-clean","deliveryClass":"parcel","category":"carpet","origin":"","originVerified":false}'::jsonb,
    '[
      {"locale":"ka","slug":"automatic-ka","name":"Automatic KA","short_description":"Reviewed short","long_description":"Reviewed long","care_text":"Care","seo_title":"","seo_description":""},
      {"locale":"en","slug":"automatic-en","name":"Automatic EN","short_description":"Reviewed short","long_description":"Reviewed long","care_text":"Care","seo_title":"","seo_description":""},
      {"locale":"de","slug":"automatic-de","name":"Automatic DE","short_description":"Reviewed short","long_description":"Reviewed long","care_text":"Care","seo_title":"","seo_description":""},
      {"locale":"ru","slug":"automatic-ru","name":"Automatic RU","short_description":"Reviewed short","long_description":"Reviewed long","care_text":"Care","seo_title":"","seo_description":""}
    ]'::jsonb,
    'GEL', 100000, 1
  )).status,
  'in_review'::public.product_status,
  'one review transaction saves verified facts, localized copy, price, and stock'
);
select is(
  (select count(*) from public.product_translations translation join public.ingestion_batches batch on batch.product_id = translation.product_id where batch.title = 'Automatic draft product'),
  4::bigint,
  'review transaction persists exactly four locales'
);
select is((select mode from public.integration_configs where key = 'catalog-assistance'), 'disabled'::public.integration_mode, 'assistance is disabled until Owner privacy activation');
select is(
  (public.cancel_ingestion_batch((select id from public.ingestion_batches where title = 'Automatic draft product'))).status,
  'cancelled'::public.ingestion_batch_status,
  'staff can cancel an incomplete batch normally'
);

select is(
  (public.create_ingestion_batch('Twelve-photo carpet', 2, '70000000-0000-4000-8000-000000000001')).title,
  'Twelve-photo carpet',
  'staff command creates a bounded batch'
);
select matches(
  (public.register_ingestion_file(
    (select id from public.ingestion_batches where title = 'Twelve-photo carpet'),
    'browser-file-0001', 'front.jpg', 'image/jpeg', 1000, repeat('9', 64), 1
  )).storage_path,
  '^[a-f0-9-]+/[a-f0-9-]+/original$',
  'registration assigns a deterministic private path'
);
select is(
  (public.register_ingestion_file(
    (select id from public.ingestion_batches where title = 'Twelve-photo carpet'),
    'browser-file-0001', 'front.jpg', 'image/jpeg', 1000, repeat('9', 64), 1
  )).id,
  (select id from public.ingestion_files where client_file_id = 'browser-file-0001'),
  'repeated registration recovers the same file identity'
);
select is((select count(*) from public.ingestion_files where client_file_id = 'browser-file-0001'), 1::bigint, 'registration is idempotent');
select throws_ok(
  $$select public.register_ingestion_file(
    (select id from public.ingestion_batches where title = 'Twelve-photo carpet'),
    'browser-file-bad1', 'script.svg', 'image/svg+xml', 1000, null, 1
  )$$,
  '22023', 'UPLOAD_REJECTED', 'unsupported declared file types are rejected'
);

select is(
  (public.complete_ingestion_upload(
    (select id from public.ingestion_files where client_file_id = 'browser-file-0001'),
    'image/jpeg', 1000::bigint, repeat('9', 64), 3000, 4000, 1::smallint
  )).status,
  'uploaded'::public.ingestion_file_status,
  'verified upload metadata creates a processable file'
);
select is((select count(*) from public.media_assets where checksum_sha256 = repeat('9', 64)), 1::bigint, 'upload creates one checksum-owned media asset');
select is((select status from public.media_licenses where asset_id = (select media_asset_id from public.ingestion_files where client_file_id = 'browser-file-0001')), 'pending'::public.media_license_status, 'ownership remains pending human approval');
select is((select count(*) from public.media_jobs where job_type = 'product-renditions'), 1::bigint, 'upload enqueues one recipe job');

select isnt(
  (public.register_ingestion_file(
    (select id from public.ingestion_batches where title = 'Twelve-photo carpet'),
    'browser-file-0002', 'front-copy.jpg', 'image/jpeg', 1000, repeat('9', 64), 1
  )).id,
  null::uuid,
  'a second file can be registered'
);
select is(
  (public.complete_ingestion_upload(
    (select id from public.ingestion_files where client_file_id = 'browser-file-0002'),
    'image/jpeg', 1000::bigint, repeat('9', 64), 3000, 4000, 1::smallint
  )).status,
  'duplicate'::public.ingestion_file_status,
  'checksum duplicate reuses the existing asset'
);
select is((select count(*) from public.media_assets where checksum_sha256 = repeat('9', 64)), 1::bigint, 'duplicate upload cannot duplicate an asset');
select is((select count(*) from public.media_jobs where job_type = 'product-renditions'), 1::bigint, 'duplicate upload cannot duplicate processing work');
select is((select duplicate_file_count from public.ingestion_batches where title = 'Twelve-photo carpet'), 1, 'batch counters record duplicates');

select is((select count(*) from public.claim_ingestion_jobs('worker-test', 1, 240)), 1::bigint, 'worker leases one available job');
select ok(not public.checkpoint_ingestion_job((select id from public.media_jobs limit 1), 'wrong-worker', 'metadata', 240), 'another worker cannot checkpoint a lease');
select ok(public.checkpoint_ingestion_job((select id from public.media_jobs limit 1), 'worker-test', 'renditions', 240), 'lease owner checkpoints resumable progress');

insert into public.media_variants (
  asset_id, recipe_version, role, format, width, height, bucket, path,
  checksum_sha256, byte_size, status, crop_x, crop_y, focal_x, focal_y
)
select
  (select media_asset_id from public.ingestion_files where client_file_id = 'browser-file-0001'),
  1, variant.role, 'webp', variant.width, variant.height, 'product-renditions',
  'ingestion-test/' || variant.role || '.webp', variant.checksum, 100, 'approved', 0, 0, 0.5, 0.5
from (values
  ('card_4x5', 1200, 1500, repeat('b', 64)),
  ('gallery_3x4', 1800, 2400, repeat('c', 64)),
  ('og', 1200, 630, repeat('d', 64))
) as variant(role, width, height, checksum);

select ok(public.complete_ingestion_job((select id from public.media_jobs limit 1), 'worker-test'), 'worker completes only after an approved rendition exists');
select is((select status from public.ingestion_files where client_file_id = 'browser-file-0001'), 'ready'::public.ingestion_file_status, 'completed job advances the source file to ready');
select is((select ready_file_count from public.ingestion_batches where title = 'Twelve-photo carpet'), 1, 'batch counters reflect ready files');

select throws_ok(
  $$insert into public.media_variants (
    asset_id, recipe_version, role, format, width, height, path, checksum_sha256, byte_size, status
  ) values (
    (select media_asset_id from public.ingestion_files where client_file_id = 'browser-file-0001'),
    1, 'card_4x5', 'webp', 1200, 1500, 'ingestion-test/duplicate.webp', repeat('e', 64), 100, 'approved'
  )$$,
  '23505', null, 'recipe output identity prevents duplicate renditions'
);

insert into public.assisted_suggestions (
  batch_id, product_id, ingestion_file_id, suggestion_kind, locale,
  provider_key, model_key, schema_version, payload
) values (
  (select id from public.ingestion_batches where title = 'Twelve-photo carpet'),
  '70000000-0000-4000-8000-000000000001',
  (select id from public.ingestion_files where client_file_id = 'browser-file-0001'),
  'catalog-copy', 'en', 'disabled', 'manual', 'v1', '{"name":"Suggested only"}'
);
select is((public.evaluate_product_readiness('70000000-0000-4000-8000-000000000001') ->> 'ready')::boolean, false, 'grouped readiness initially blocks incomplete products');
select ok((public.evaluate_product_readiness('70000000-0000-4000-8000-000000000001') -> 'blockers') @> '[{"code":"FOUR_LOCALES_REQUIRED"}]', 'readiness reports the incomplete translation group');
select ok((public.evaluate_product_readiness('70000000-0000-4000-8000-000000000001') -> 'blockers') @> '[{"code":"SUGGESTIONS_REQUIRE_DECISION"}]', 'pending assistance must receive a human decision');

-- System-operated test has no auth.uid(), so use a stable fixture user for the human decision fields.
update public.assisted_suggestions
set status = 'rejected', decided_by = '70000000-0000-4000-8000-000000000099', decided_at = statement_timestamp()
where product_id = '70000000-0000-4000-8000-000000000001';

insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  search_text, alt_text_ready, status
)
select '70000000-0000-4000-8000-000000000001', locale.locale,
  'ingestion-ready-' || locale.locale::text, 'Ingestion Ready ' || upper(locale.locale::text),
  'Reviewed short description', 'Reviewed long description', 'ingestion ready', true, 'reviewed'
from unnest(enum_range(null::public.app_locale)) as locale(locale);
insert into public.product_prices (product_id, currency, amount_minor, enabled)
values ('70000000-0000-4000-8000-000000000001', 'GEL', 400000, true);
insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
values ('70000000-0000-4000-8000-000000000001', 'unique', 1);
select is(
  (public.approve_ingestion_media(
    (select id from public.ingestion_files where client_file_id = 'browser-file-0001'),
    (select asset.version from public.media_assets asset join public.ingestion_files file on file.media_asset_id = asset.id where file.client_file_id = 'browser-file-0001'),
    'Reviewed image of the carpet', 0.5::numeric, 0.5::numeric,
    'owned', 'ÉPOCA product photography'
  )).approval_status,
  'approved'::public.media_approval_status,
  'human review approves rights, crops, variants, link, and primary image together'
);

select is((public.evaluate_product_readiness('70000000-0000-4000-8000-000000000001') ->> 'ready')::boolean, true, 'complete reviewed product passes authoritative readiness');
select throws_ok(
  $$select public.publish_product(
    '70000000-0000-4000-8000-000000000001',
    (select version from public.products where id = '70000000-0000-4000-8000-000000000001'), false
  )$$,
  '22023', 'PUBLICATION_CONFIRMATION_REQUIRED', 'publication requires a current human confirmation'
);
select is(
  (public.publish_product(
    '70000000-0000-4000-8000-000000000001',
    (select version from public.products where id = '70000000-0000-4000-8000-000000000001'), true
  )).status,
  'published'::public.product_status,
  'one transaction publishes a ready product'
);
select is((select count(*) from public.product_translations where product_id = '70000000-0000-4000-8000-000000000001' and status = 'published'), 4::bigint, 'publication atomically publishes all reviewed locales');
select is((select status from public.ingestion_batches where title = 'Twelve-photo carpet'), 'published'::public.ingestion_batch_status, 'publication closes the linked ingestion batch');
select is((select count(*) from public.audit_events where action = 'catalog.product.publish' and entity_id = '70000000-0000-4000-8000-000000000001'), 1::bigint, 'publication records privacy-safe audit evidence');

reset role;
select * from finish();
rollback;
