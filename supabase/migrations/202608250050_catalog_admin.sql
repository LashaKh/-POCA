create type public.catalog_revision_kind as enum (
  'created', 'updated', 'imported', 'published', 'archived', 'restored',
  'inventory', 'merchandising'
);
create type public.catalog_import_status as enum (
  'uploaded', 'validating', 'ready', 'applying', 'complete', 'failed', 'cancelled'
);
create type public.catalog_import_row_status as enum (
  'valid', 'invalid', 'applied', 'failed'
);

create table public.catalog_revisions (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('product', 'collection')),
  entity_id uuid not null,
  entity_version public.safe_version not null,
  revision_kind public.catalog_revision_kind not null,
  changed_fields text[] not null default '{}',
  snapshot jsonb not null,
  note text check (note is null or char_length(note) <= 500),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (entity_type, entity_id, entity_version),
  constraint catalog_revision_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create index catalog_revisions_entity_time
on public.catalog_revisions (entity_type, entity_id, created_at desc);

create table public.inventory_adjustments (
  id uuid primary key default extensions.gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  previous_on_hand integer not null check (previous_on_hand >= 0),
  resulting_on_hand integer not null check (resulting_on_hand >= 0),
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (char_length(reason) between 2 and 500),
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 180),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null,
  created_at timestamptz not null default clock_timestamp()
);

create table public.catalog_import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  status public.catalog_import_status not null default 'uploaded',
  source_bucket text not null default 'catalog-imports' check (source_bucket = 'catalog-imports'),
  source_path text not null check (source_path !~ '(^|/)\.\.(/|$)' and char_length(source_path) between 3 and 500),
  source_checksum text not null check (source_checksum ~ '^[a-f0-9]{64}$'),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  header_mapping jsonb not null default '{}'::jsonb,
  row_count integer not null default 0 check (row_count >= 0),
  valid_row_count integer not null default 0 check (valid_row_count >= 0),
  invalid_row_count integer not null default 0 check (invalid_row_count >= 0),
  applied_row_count integer not null default 0 check (applied_row_count >= 0),
  error_report_path text check (error_report_path is null or char_length(error_report_path) <= 500),
  safe_error_code text check (safe_error_code is null or safe_error_code ~ '^[A-Z0-9_]{2,80}$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  version public.safe_version not null default 1,
  unique (source_checksum),
  constraint catalog_import_mapping_object check (jsonb_typeof(header_mapping) = 'object'),
  constraint catalog_import_counts check (
    valid_row_count + invalid_row_count <= row_count and applied_row_count <= valid_row_count
  )
);

create table public.catalog_import_rows (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null references public.catalog_import_batches(id) on delete cascade,
  row_number integer not null check (row_number > 1),
  status public.catalog_import_row_status not null,
  source_record jsonb not null,
  normalized_record jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  product_id uuid references public.products(id) on delete set null,
  safe_error_code text check (safe_error_code is null or safe_error_code ~ '^[A-Z0-9_]{2,80}$'),
  created_at timestamptz not null default statement_timestamp(),
  applied_at timestamptz,
  unique (batch_id, row_number),
  constraint catalog_import_source_object check (jsonb_typeof(source_record) = 'object'),
  constraint catalog_import_normalized_object check (
    normalized_record is null or jsonb_typeof(normalized_record) = 'object'
  ),
  constraint catalog_import_errors_array check (jsonb_typeof(validation_errors) = 'array')
);

create index catalog_import_rows_batch_status
on public.catalog_import_rows (batch_id, status, row_number);

create table public.saved_admin_views (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  view_type text not null check (view_type in ('products', 'collections', 'imports')),
  name text not null check (char_length(name) between 1 and 100),
  filters jsonb not null default '{}'::jsonb,
  sort jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (owner_profile_id, view_type, name),
  constraint saved_admin_view_filters_object check (jsonb_typeof(filters) = 'object'),
  constraint saved_admin_view_sort_object check (jsonb_typeof(sort) = 'object')
);

create table public.catalog_bulk_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  action text not null check (action in ('publish', 'unpublish', 'archive', 'restore', 'collection_add', 'collection_remove')),
  requested_product_ids uuid[] not null check (cardinality(requested_product_ids) between 1 and 500),
  collection_id uuid references public.collections(id) on delete restrict,
  result jsonb not null,
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 180),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint catalog_bulk_result_object check (jsonb_typeof(result) = 'object')
);

alter table public.products
  add column archived_by uuid references public.profiles(id) on delete set null,
  add column archive_reason text check (archive_reason is null or char_length(archive_reason) <= 500);

alter table public.collections
  add column archived_by uuid references public.profiles(id) on delete set null,
  add column archive_reason text check (archive_reason is null or char_length(archive_reason) <= 500);

alter table public.export_jobs
  add column export_format text not null default 'csv' check (export_format in ('csv')),
  add column row_count integer check (row_count is null or row_count >= 0),
  add column download_name text check (download_name is null or char_length(download_name) <= 255);

create trigger catalog_import_batches_set_updated_at before update on public.catalog_import_batches
for each row execute function app_private.set_updated_at();
create trigger saved_admin_views_set_updated_at before update on public.saved_admin_views
for each row execute function app_private.set_updated_at();

create trigger catalog_revisions_append_only before update or delete on public.catalog_revisions
for each row execute function app_private.reject_immutable_change();
create trigger inventory_adjustments_append_only before update or delete on public.inventory_adjustments
for each row execute function app_private.reject_immutable_change();
create trigger catalog_bulk_actions_append_only before update or delete on public.catalog_bulk_actions
for each row execute function app_private.reject_immutable_change();

comment on table public.catalog_revisions is
  'Append-only product/collection snapshots used for conflict recovery and field-level history.';
comment on table public.catalog_import_rows is
  'Private per-row import staging; raw values never become public until a validated apply command succeeds.';
