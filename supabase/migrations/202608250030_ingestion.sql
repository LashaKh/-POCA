create type public.ingestion_batch_status as enum (
  'draft',
  'uploading',
  'processing',
  'review',
  'ready',
  'published',
  'failed',
  'cancelled'
);

create type public.ingestion_file_status as enum (
  'registered',
  'uploading',
  'uploaded',
  'processing',
  'ready',
  'failed',
  'cancelled',
  'duplicate'
);

create type public.suggestion_decision_status as enum (
  'pending',
  'accepted',
  'edited',
  'rejected'
);

create table public.ingestion_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  product_id uuid references public.products(id) on delete set null,
  status public.ingestion_batch_status not null default 'draft',
  expected_file_count integer check (expected_file_count between 1 and 250),
  registered_file_count integer not null default 0 check (registered_file_count between 0 and 250),
  ready_file_count integer not null default 0 check (ready_file_count between 0 and 250),
  failed_file_count integer not null default 0 check (failed_file_count between 0 and 250),
  duplicate_file_count integer not null default 0 check (duplicate_file_count between 0 and 250),
  created_by uuid references auth.users(id) on delete set null,
  correlation_id uuid not null default extensions.gen_random_uuid(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  version public.safe_version not null default 1,
  constraint ingestion_batch_counts_bounded check (
    ready_file_count + failed_file_count + duplicate_file_count <= registered_file_count
  ),
  constraint ingestion_batch_completion_consistent check (
    status not in ('published', 'cancelled') or completed_at is not null
  )
);

create table public.ingestion_files (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null references public.ingestion_batches(id) on delete cascade,
  client_file_id text not null check (char_length(client_file_id) between 8 and 200),
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  storage_bucket text not null default 'product-originals' check (storage_bucket = 'product-originals'),
  storage_path text not null check (
    storage_path !~ '(^|/)\.\.(/|$)'
    and storage_path ~ '^[a-f0-9-]+/[a-f0-9-]+/original$'
    and char_length(storage_path) between 3 and 500
  ),
  expected_mime text not null check (expected_mime in ('image/jpeg', 'image/png', 'image/webp', 'image/tiff')),
  expected_byte_size bigint not null check (expected_byte_size between 1 and 536870912),
  expected_checksum_sha256 text check (expected_checksum_sha256 is null or expected_checksum_sha256 ~ '^[a-f0-9]{64}$'),
  actual_mime text check (actual_mime is null or actual_mime in ('image/jpeg', 'image/png', 'image/webp', 'image/tiff')),
  actual_byte_size bigint check (actual_byte_size is null or actual_byte_size between 1 and 536870912),
  actual_checksum_sha256 text check (actual_checksum_sha256 is null or actual_checksum_sha256 ~ '^[a-f0-9]{64}$'),
  pixel_width integer check (pixel_width is null or pixel_width between 1 and 50000),
  pixel_height integer check (pixel_height is null or pixel_height between 1 and 50000),
  orientation smallint check (orientation is null or orientation between 1 and 8),
  status public.ingestion_file_status not null default 'registered',
  recipe_version public.safe_version not null default 1,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  upload_completed_at timestamptz,
  processing_completed_at timestamptz,
  safe_error_code text check (safe_error_code is null or safe_error_code ~ '^[A-Z0-9_]{2,80}$'),
  safe_error_summary text check (safe_error_summary is null or char_length(safe_error_summary) <= 500),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (batch_id, client_file_id),
  unique (storage_bucket, storage_path),
  constraint ingestion_file_actual_metadata_complete check (
    (actual_mime is null and actual_byte_size is null and actual_checksum_sha256 is null)
    or (actual_mime is not null and actual_byte_size is not null and actual_checksum_sha256 is not null)
  ),
  constraint ingestion_file_ready_has_asset check (
    status not in ('ready', 'duplicate') or media_asset_id is not null
  )
);

create table public.assisted_suggestions (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null references public.ingestion_batches(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  ingestion_file_id uuid references public.ingestion_files(id) on delete cascade,
  suggestion_kind text not null check (suggestion_kind in ('catalog-copy', 'alt-text', 'crop-focus', 'classification')),
  locale public.app_locale,
  provider_key text not null check (char_length(provider_key) between 2 and 80),
  model_key text not null check (char_length(model_key) between 2 and 120),
  schema_version text not null check (schema_version ~ '^v[0-9]+$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status public.suggestion_decision_status not null default 'pending',
  requested_by uuid references auth.users(id) on delete set null,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint suggestion_subject_present check (num_nonnulls(product_id, ingestion_file_id) >= 1),
  constraint suggestion_decision_consistent check (
    (status = 'pending' and decided_by is null and decided_at is null)
    or (status <> 'pending' and decided_by is not null and decided_at is not null)
  )
);

create index ingestion_batches_staff_queue
on public.ingestion_batches (status, updated_at desc);
create index ingestion_files_batch_status
on public.ingestion_files (batch_id, status, created_at);
create index ingestion_files_checksum
on public.ingestion_files (actual_checksum_sha256)
where actual_checksum_sha256 is not null;
create index assisted_suggestions_review_queue
on public.assisted_suggestions (batch_id, status, created_at);

create unique index media_jobs_recipe_identity
on public.media_jobs (job_type, subject_id, recipe_version)
where subject_id is not null and recipe_version is not null;

create trigger ingestion_batches_set_updated_at before update on public.ingestion_batches
for each row execute function app_private.set_updated_at();
create trigger ingestion_files_set_updated_at before update on public.ingestion_files
for each row execute function app_private.set_updated_at();
create trigger assisted_suggestions_set_updated_at before update on public.assisted_suggestions
for each row execute function app_private.set_updated_at();

create or replace function app_private.refresh_ingestion_batch_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_batch_id uuid := coalesce(new.batch_id, old.batch_id);
begin
  update public.ingestion_batches batch
  set
    registered_file_count = counts.registered_count,
    ready_file_count = counts.ready_count,
    failed_file_count = counts.failed_count,
    duplicate_file_count = counts.duplicate_count,
    status = case
      when batch.status in ('published', 'cancelled') then batch.status
      when counts.registered_count = 0 then 'draft'::public.ingestion_batch_status
      when counts.active_count > 0 then 'processing'::public.ingestion_batch_status
      when counts.failed_count > 0 and counts.ready_count + counts.duplicate_count = 0 then 'failed'::public.ingestion_batch_status
      else 'review'::public.ingestion_batch_status
    end
  from (
    select
      count(*)::integer as registered_count,
      count(*) filter (where status = 'ready')::integer as ready_count,
      count(*) filter (where status = 'failed')::integer as failed_count,
      count(*) filter (where status = 'duplicate')::integer as duplicate_count,
      count(*) filter (where status in ('registered', 'uploading', 'uploaded', 'processing'))::integer as active_count
    from public.ingestion_files
    where batch_id = target_batch_id
  ) counts
  where batch.id = target_batch_id;

  return coalesce(new, old);
end;
$$;

create trigger ingestion_files_refresh_batch_counts
after insert or update of status or delete on public.ingestion_files
for each row execute function app_private.refresh_ingestion_batch_counts();

create or replace function app_private.cleanup_ingestion_file_jobs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.media_jobs
  where job_type = 'product-renditions' and subject_id = old.id;
  return old;
end;
$$;

create trigger ingestion_files_cleanup_jobs
after delete on public.ingestion_files
for each row execute function app_private.cleanup_ingestion_file_jobs();
