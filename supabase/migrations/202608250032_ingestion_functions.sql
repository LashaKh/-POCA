create or replace function public.create_ingestion_batch(
  p_title text,
  p_expected_file_count integer default null,
  p_product_id uuid default null,
  p_correlation_id uuid default extensions.gen_random_uuid()
)
returns public.ingestion_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_batch public.ingestion_batches;
  target_product_id uuid := p_product_id;
begin
  perform app_private.assert_manager();

  if btrim(p_title) = '' or char_length(p_title) > 160
    or (p_expected_file_count is not null and p_expected_file_count not between 1 and 250) then
    raise exception 'INVALID_INGESTION_BATCH' using errcode = '22023';
  end if;

  if target_product_id is null then
    insert into public.products (sku, created_by)
    values (
      'EPO-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 8)),
      auth.uid()
    ) returning id into target_product_id;
  end if;

  insert into public.ingestion_batches (
    title, expected_file_count, product_id, created_by, correlation_id
  ) values (
    btrim(p_title), p_expected_file_count, target_product_id, auth.uid(), p_correlation_id
  )
  returning * into created_batch;

  return created_batch;
end;
$$;

create or replace function public.register_ingestion_file(
  p_batch_id uuid,
  p_client_file_id text,
  p_original_filename text,
  p_expected_mime text,
  p_expected_byte_size bigint,
  p_expected_checksum_sha256 text default null,
  p_recipe_version bigint default 1
)
returns public.ingestion_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_batch public.ingestion_batches;
  file_id uuid := extensions.gen_random_uuid();
  created_file public.ingestion_files;
begin
  perform app_private.assert_manager();
  select * into target_batch from public.ingestion_batches
  where id = p_batch_id for update;

  if not found then
    raise exception 'INGESTION_BATCH_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_batch.status in ('published', 'cancelled') then
    raise exception 'INGESTION_BATCH_CLOSED' using errcode = '55000';
  end if;
  if target_batch.registered_file_count >= coalesce(target_batch.expected_file_count, 250) then
    raise exception 'INGESTION_BATCH_LIMIT' using errcode = '22023';
  end if;
  if p_expected_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/tiff')
    or p_expected_byte_size not between 1 and 536870912
    or char_length(p_client_file_id) not between 8 and 200
    or char_length(p_original_filename) not between 1 and 240
    or p_recipe_version not between 1 and 1000000
    or (p_expected_checksum_sha256 is not null and p_expected_checksum_sha256 !~ '^[a-f0-9]{64}$') then
    raise exception 'UPLOAD_REJECTED' using errcode = '22023';
  end if;

  insert into public.ingestion_files (
    id, batch_id, client_file_id, original_filename, storage_path,
    expected_mime, expected_byte_size, expected_checksum_sha256,
    recipe_version, uploaded_by
  ) values (
    file_id, p_batch_id, p_client_file_id, p_original_filename,
    p_batch_id::text || '/' || file_id::text || '/original',
    p_expected_mime, p_expected_byte_size, p_expected_checksum_sha256,
    p_recipe_version, auth.uid()
  )
  on conflict (batch_id, client_file_id) do update
  set original_filename = excluded.original_filename
  returning * into created_file;

  return created_file;
end;
$$;

create or replace function public.mark_ingestion_uploading(p_file_id uuid)
returns public.ingestion_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_file public.ingestion_files;
begin
  perform app_private.assert_manager();
  update public.ingestion_files
  set status = 'uploading', safe_error_code = null, safe_error_summary = null
  where id = p_file_id
    and uploaded_by = auth.uid()
    and status in ('registered', 'uploading')
  returning * into target_file;

  if not found then
    raise exception 'INGESTION_FILE_NOT_UPLOADABLE' using errcode = '55000';
  end if;
  return target_file;
end;
$$;

create or replace function public.complete_ingestion_upload(
  p_file_id uuid,
  p_actual_mime text,
  p_actual_byte_size bigint,
  p_actual_checksum_sha256 text,
  p_pixel_width integer,
  p_pixel_height integer,
  p_orientation smallint default 1
)
returns public.ingestion_files
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_file public.ingestion_files;
  asset public.media_assets;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into target_file from public.ingestion_files
  where id = p_file_id for update;
  if not found then
    raise exception 'INGESTION_FILE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_file.status in ('ready', 'duplicate') then
    return target_file;
  end if;

  if p_actual_mime <> target_file.expected_mime
    or p_actual_byte_size <> target_file.expected_byte_size
    or p_actual_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/tiff')
    or p_actual_byte_size not between 1 and 536870912
    or p_actual_checksum_sha256 !~ '^[a-f0-9]{64}$'
    or (target_file.expected_checksum_sha256 is not null and target_file.expected_checksum_sha256 <> p_actual_checksum_sha256)
    or p_pixel_width not between 1 and 50000
    or p_pixel_height not between 1 and 50000
    or p_orientation not between 1 and 8 then
    update public.ingestion_files
    set status = 'failed', safe_error_code = 'UPLOAD_METADATA_MISMATCH',
        safe_error_summary = 'The uploaded file did not match its registered type, size, checksum, or image bounds.'
    where id = p_file_id returning * into target_file;
    return target_file;
  end if;

  select * into asset from public.media_assets
  where purpose = 'product' and checksum_sha256 = p_actual_checksum_sha256;

  if found then
    update public.ingestion_files
    set actual_mime = p_actual_mime,
        actual_byte_size = p_actual_byte_size,
        actual_checksum_sha256 = p_actual_checksum_sha256,
        pixel_width = p_pixel_width,
        pixel_height = p_pixel_height,
        orientation = p_orientation,
        media_asset_id = asset.id,
        status = 'duplicate',
        upload_completed_at = statement_timestamp(),
        processing_completed_at = statement_timestamp(),
        safe_error_code = null,
        safe_error_summary = null
    where id = p_file_id returning * into target_file;
    return target_file;
  end if;

  insert into public.media_assets (
    purpose, original_bucket, original_path, checksum_sha256, actual_mime,
    byte_size, pixel_width, pixel_height, orientation, uploaded_by
  ) values (
    'product', target_file.storage_bucket, target_file.storage_path,
    p_actual_checksum_sha256, p_actual_mime, p_actual_byte_size,
    p_pixel_width, p_pixel_height, p_orientation, target_file.uploaded_by
  ) returning * into asset;

  insert into public.media_licenses (asset_id, ownership_basis, creator_source, status)
  values (asset.id, 'owned', 'ÉPOCA staff upload; ownership approval required', 'pending');

  update public.ingestion_files
  set actual_mime = p_actual_mime,
      actual_byte_size = p_actual_byte_size,
      actual_checksum_sha256 = p_actual_checksum_sha256,
      pixel_width = p_pixel_width,
      pixel_height = p_pixel_height,
      orientation = p_orientation,
      media_asset_id = asset.id,
      status = 'uploaded',
      upload_completed_at = statement_timestamp(),
      safe_error_code = null,
      safe_error_summary = null
  where id = p_file_id returning * into target_file;

  insert into public.media_jobs (
    job_type, subject_id, recipe_version, correlation_id
  ) values (
    'product-renditions', target_file.id, target_file.recipe_version::text,
    (select correlation_id from public.ingestion_batches where id = target_file.batch_id)
  ) on conflict (job_type, subject_id, recipe_version) where subject_id is not null and recipe_version is not null
  do nothing;

  return target_file;
end;
$$;

create or replace function public.claim_ingestion_jobs(
  p_worker_id text,
  p_claim_limit integer default 5,
  p_lease_seconds integer default 240
)
returns setof public.media_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(p_worker_id) not between 3 and 120
    or p_claim_limit not between 1 and 25
    or p_lease_seconds not between 30 and 900 then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select job.id
    from public.media_jobs job
    join public.ingestion_files file on file.id = job.subject_id
    join public.ingestion_batches batch on batch.id = file.batch_id
    where job.job_type = 'product-renditions'
      and batch.status <> 'cancelled'
      and file.status not in ('cancelled', 'ready', 'duplicate')
      and (
        job.status in ('queued', 'retrying')
        or (job.status = 'processing' and job.lease_expires_at < statement_timestamp())
      )
      and job.next_attempt_at <= statement_timestamp()
      and job.attempt < job.max_attempts
    order by job.next_attempt_at, job.queued_at
    for update of job skip locked
    limit p_claim_limit
  ), claimed as (
    update public.media_jobs job
    set status = 'processing',
        lease_owner = p_worker_id,
        lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
        attempt = job.attempt + 1,
        started_at = coalesce(job.started_at, statement_timestamp()),
        progress_stage = 'claimed',
        safe_error_code = null,
        safe_error_summary = null
    from candidates
    where job.id = candidates.id
    returning job.*
  )
  select * from claimed;

  update public.ingestion_files file
  set status = 'processing'
  where file.id in (
    select job.subject_id from public.media_jobs job
    where job.lease_owner = p_worker_id and job.status = 'processing'
      and job.lease_expires_at > statement_timestamp()
  ) and file.status = 'uploaded';
end;
$$;

create or replace function public.checkpoint_ingestion_job(
  p_job_id uuid,
  p_worker_id text,
  p_progress_stage text,
  p_extend_seconds integer default 240
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(p_progress_stage) not between 1 and 120 or p_extend_seconds not between 30 and 900 then
    raise exception 'INVALID_CHECKPOINT' using errcode = '22023';
  end if;

  update public.media_jobs
  set progress_stage = p_progress_stage,
      lease_expires_at = statement_timestamp() + make_interval(secs => p_extend_seconds)
  where id = p_job_id and status = 'processing' and lease_owner = p_worker_id
    and lease_expires_at > statement_timestamp();
  return found;
end;
$$;

create or replace function public.complete_ingestion_job(
  p_job_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_file_id uuid;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.media_jobs
  set status = 'needs_review', progress_stage = 'review', completed_at = statement_timestamp(),
      lease_owner = null, lease_expires_at = null, safe_error_code = null, safe_error_summary = null
  where id = p_job_id and status = 'processing' and lease_owner = p_worker_id
    and lease_expires_at > statement_timestamp()
  returning subject_id into target_file_id;
  if not found then return false; end if;

  if not exists (
    select 1 from public.ingestion_files file
    join public.media_variants variant on variant.asset_id = file.media_asset_id
    where file.id = target_file_id and variant.recipe_version = file.recipe_version
      and variant.status in ('processing', 'approved')
  ) then
    raise exception 'RENDITIONS_INCOMPLETE' using errcode = '55000';
  end if;

  update public.ingestion_files
  set status = 'ready', processing_completed_at = statement_timestamp(),
      safe_error_code = null, safe_error_summary = null
  where id = target_file_id;
  return true;
end;
$$;

create or replace function public.fail_ingestion_job(
  p_job_id uuid,
  p_worker_id text,
  p_safe_error_code text,
  p_safe_error_summary text
)
returns public.job_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_status public.job_status;
  target_file_id uuid;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_safe_error_code !~ '^[A-Z0-9_]{2,80}$' or char_length(p_safe_error_summary) > 500 then
    raise exception 'UNSAFE_JOB_ERROR' using errcode = '22023';
  end if;

  update public.media_jobs job
  set status = case when job.attempt < job.max_attempts then 'retrying'::public.job_status else 'failed'::public.job_status end,
      next_attempt_at = statement_timestamp() + least(interval '15 minutes', interval '15 seconds' * power(2, greatest(job.attempt - 1, 0))),
      lease_owner = null,
      lease_expires_at = null,
      safe_error_code = p_safe_error_code,
      safe_error_summary = p_safe_error_summary,
      progress_stage = 'failed'
  where job.id = p_job_id and job.status = 'processing' and job.lease_owner = p_worker_id
  returning job.status, job.subject_id into next_status, target_file_id;

  if not found then
    raise exception 'JOB_LEASE_LOST' using errcode = '55000';
  end if;

  update public.ingestion_files
  set status = case when next_status = 'failed' then 'failed'::public.ingestion_file_status else 'uploaded'::public.ingestion_file_status end,
      safe_error_code = p_safe_error_code,
      safe_error_summary = p_safe_error_summary
  where id = target_file_id;
  return next_status;
end;
$$;

create or replace function public.recover_stale_ingestion_jobs(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  recovered_count integer;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_limit not between 1 and 1000 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;

  with stale as (
    select id from public.media_jobs
    where job_type = 'product-renditions' and status = 'processing'
      and lease_expires_at < statement_timestamp()
    order by lease_expires_at
    for update skip locked
    limit p_limit
  )
  update public.media_jobs job
  set status = case when attempt < max_attempts then 'retrying'::public.job_status else 'failed'::public.job_status end,
      next_attempt_at = statement_timestamp(), lease_owner = null, lease_expires_at = null,
      safe_error_code = 'STALE_LEASE', safe_error_summary = 'The worker lease expired and the job was recovered.'
  from stale where job.id = stale.id;
  get diagnostics recovered_count = row_count;
  return recovered_count;
end;
$$;

create or replace function public.cancel_ingestion_batch(p_batch_id uuid)
returns public.ingestion_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  cancelled_batch public.ingestion_batches;
begin
  perform app_private.assert_manager();
  update public.ingestion_batches
  set status = 'cancelled', completed_at = statement_timestamp()
  where id = p_batch_id and status not in ('published', 'cancelled')
  returning * into cancelled_batch;
  if not found then
    raise exception 'INGESTION_BATCH_NOT_CANCELLABLE' using errcode = '55000';
  end if;

  update public.ingestion_files set status = 'cancelled'
  where batch_id = p_batch_id and status in ('registered', 'uploading', 'uploaded', 'processing', 'failed');
  update public.media_jobs set status = 'cancelled', lease_owner = null, lease_expires_at = null
  where subject_id in (select id from public.ingestion_files where batch_id = p_batch_id)
    and status in ('queued', 'retrying', 'processing', 'failed');
  return cancelled_batch;
end;
$$;

create or replace function public.retry_ingestion_file(p_file_id uuid)
returns public.media_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  retried_job public.media_jobs;
begin
  perform app_private.assert_manager();

  select job.* into retried_job
  from public.media_jobs job
  join public.ingestion_files file on file.id = job.subject_id
  join public.ingestion_batches batch on batch.id = file.batch_id
  where file.id = p_file_id
    and file.status = 'failed'
    and job.job_type = 'product-renditions'
    and job.status = 'failed'
    and batch.status not in ('published', 'cancelled')
  for update of job, file, batch;

  if not found then
    raise exception 'INGESTION_JOB_NOT_RETRYABLE' using errcode = '55000';
  end if;

  update public.media_jobs
  set status = 'retrying', attempt = 0, next_attempt_at = statement_timestamp(),
      lease_owner = null, lease_expires_at = null, progress_stage = 'manual-retry',
      safe_error_code = null, safe_error_summary = null, completed_at = null
  where id = retried_job.id
  returning * into retried_job;

  update public.ingestion_files
  set status = 'uploaded', safe_error_code = null, safe_error_summary = null,
      processing_completed_at = null
  where id = p_file_id;

  return retried_job;
end;
$$;

create or replace function public.evaluate_product_readiness(p_product_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  product public.products;
  blockers jsonb := '[]'::jsonb;
begin
  perform app_private.assert_manager();
  select * into product from public.products where id = p_product_id;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if (product.shape = 'round' and product.diameter_mm is null)
    or (coalesce(product.shape, '') <> 'round' and (product.width_mm is null or product.length_mm is null)) then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'facts', 'code', 'DIMENSIONS_REQUIRED'));
  end if;
  if cardinality(product.materials) = 0 or cardinality(product.colors) = 0
    or product.construction is null or product.condition is null
    or product.care_code is null or product.delivery_class is null then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'facts', 'code', 'CATALOG_FACTS_REQUIRED'));
  end if;
  if (select count(*) from public.product_translations translation
      where translation.product_id = p_product_id
        and translation.locale in ('ka', 'en', 'de', 'ru')
        and translation.status in ('reviewed', 'published')
        and translation.short_description is not null
        and translation.long_description is not null
        and translation.alt_text_ready) <> 4 then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'translations', 'code', 'FOUR_LOCALES_REQUIRED'));
  end if;
  if not exists (
    select 1 from public.product_prices price where price.product_id = p_product_id
      and price.enabled and price.active_from <= statement_timestamp() and price.active_until > statement_timestamp()
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'commerce', 'code', 'ACTIVE_PRICE_REQUIRED'));
  end if;
  if not exists (
    select 1 from public.inventory_items inventory where inventory.product_id = p_product_id
      and inventory.on_hand_quantity > 0
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'commerce', 'code', 'INVENTORY_REQUIRED'));
  end if;
  if product.primary_media_asset_id is null or not exists (
    select 1 from public.media_assets asset
    join public.media_licenses license on license.asset_id = asset.id
    where asset.id = product.primary_media_asset_id and asset.approval_status = 'approved'
      and license.status = 'approved' and (license.expires_at is null or license.expires_at > statement_timestamp())
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'media', 'code', 'APPROVED_LICENSED_PRIMARY_REQUIRED'));
  end if;
  if product.primary_media_asset_id is not null and (
    select count(distinct variant.role) from public.media_variants variant
    where variant.asset_id = product.primary_media_asset_id and variant.status = 'approved'
      and variant.role in ('card_4x5', 'gallery_3x4', 'og')
  ) <> 3 then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'media', 'code', 'APPROVED_RENDITIONS_REQUIRED'));
  end if;
  if product.primary_media_asset_id is not null and not exists (
    select 1 from public.media_links link where link.asset_id = product.primary_media_asset_id
      and link.entity_type = 'product' and link.entity_id = p_product_id
      and link.primary_link and link.alt_text is not null and link.approved_crop_version is not null
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'media', 'code', 'MEDIA_REVIEW_REQUIRED'));
  end if;
  if exists (
    select 1 from public.assisted_suggestions suggestion
    where suggestion.product_id = p_product_id and suggestion.status = 'pending'
  ) then
    blockers := blockers || jsonb_build_array(jsonb_build_object('group', 'assistance', 'code', 'SUGGESTIONS_REQUIRE_DECISION'));
  end if;

  return jsonb_build_object(
    'ready', jsonb_array_length(blockers) = 0,
    'productId', p_product_id,
    'productVersion', product.version,
    'blockers', blockers
  );
end;
$$;

create or replace function public.publish_product(
  p_product_id uuid,
  p_expected_version bigint,
  p_confirm boolean
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
declare
  product public.products;
  readiness jsonb;
  correlation_id uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if not p_confirm then
    raise exception 'PUBLICATION_CONFIRMATION_REQUIRED' using errcode = '22023';
  end if;

  select * into product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if product.status = 'published' then return product; end if;
  if product.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;

  readiness := public.evaluate_product_readiness(p_product_id);
  if not (readiness ->> 'ready')::boolean then
    raise exception 'PRODUCT_NOT_READY' using errcode = '55000', detail = readiness::text;
  end if;

  update public.product_translations
  set status = 'published', published_by = auth.uid()
  where product_id = p_product_id and status = 'reviewed';

  update public.products
  set status = 'published', readiness_passed = true,
      readiness_version = readiness_version + 1,
      search_visible = true, structured_data_eligible = true,
      reviewed_by = coalesce(reviewed_by, auth.uid()),
      published_by = auth.uid(), published_at = statement_timestamp(), unpublished_at = null
  where id = p_product_id returning * into product;

  update public.ingestion_batches
  set status = 'published', completed_at = statement_timestamp()
  where product_id = p_product_id and status not in ('published', 'cancelled');

  perform app_private.write_audit_event(
    case
      when auth.uid() is null then 'service'
      else coalesce((select staff.role::text from public.staff_members staff where staff.profile_id = auth.uid()), 'customer')
    end,
    'catalog.product.publish', 'product', p_product_id::text, 'succeeded',
    'publish_product', correlation_id,
    jsonb_build_object('version', product.version, 'readinessVersion', product.readiness_version)
  );
  return product;
end;
$$;

revoke all on function public.create_ingestion_batch(text, integer, uuid, uuid) from public, anon;
revoke all on function public.register_ingestion_file(uuid, text, text, text, bigint, text, bigint) from public, anon;
revoke all on function public.mark_ingestion_uploading(uuid) from public, anon;
revoke all on function public.complete_ingestion_upload(uuid, text, bigint, text, integer, integer, smallint) from public, anon, authenticated;
revoke all on function public.claim_ingestion_jobs(text, integer, integer) from public, anon, authenticated;
revoke all on function public.checkpoint_ingestion_job(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.complete_ingestion_job(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_ingestion_job(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.recover_stale_ingestion_jobs(integer) from public, anon, authenticated;
revoke all on function public.cancel_ingestion_batch(uuid) from public, anon;
revoke all on function public.retry_ingestion_file(uuid) from public, anon;
revoke all on function public.evaluate_product_readiness(uuid) from public, anon;
revoke all on function public.publish_product(uuid, bigint, boolean) from public, anon;

grant execute on function public.create_ingestion_batch(text, integer, uuid, uuid) to authenticated, service_role;
grant execute on function public.register_ingestion_file(uuid, text, text, text, bigint, text, bigint) to authenticated, service_role;
grant execute on function public.mark_ingestion_uploading(uuid) to authenticated, service_role;
grant execute on function public.cancel_ingestion_batch(uuid) to authenticated, service_role;
grant execute on function public.retry_ingestion_file(uuid) to authenticated, service_role;
grant execute on function public.evaluate_product_readiness(uuid) to authenticated, service_role;
grant execute on function public.publish_product(uuid, bigint, boolean) to authenticated, service_role;
grant execute on function public.complete_ingestion_upload(uuid, text, bigint, text, integer, integer, smallint) to service_role;
grant execute on function public.claim_ingestion_jobs(text, integer, integer) to service_role;
grant execute on function public.checkpoint_ingestion_job(uuid, text, text, integer) to service_role;
grant execute on function public.complete_ingestion_job(uuid, text) to service_role;
grant execute on function public.fail_ingestion_job(uuid, text, text, text) to service_role;
grant execute on function public.recover_stale_ingestion_jobs(integer) to service_role;
