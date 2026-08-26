create type public.media_approval_status as enum ('pending', 'approved', 'rejected');
create type public.media_license_status as enum ('pending', 'approved', 'rejected', 'expired');
create type public.media_variant_status as enum ('processing', 'approved', 'failed', 'retired');

create table public.media_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  purpose text not null check (purpose in ('product', 'collection', 'content', 'evidence')),
  original_bucket text not null default 'product-originals' check (original_bucket <> 'product-renditions'),
  original_path text not null check (original_path !~ '(^|/)\.\.(/|$)' and char_length(original_path) between 3 and 500),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  actual_mime text not null check (actual_mime in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff')),
  byte_size bigint not null check (byte_size between 1 and 536870912),
  pixel_width integer not null check (pixel_width between 1 and 50000),
  pixel_height integer not null check (pixel_height between 1 and 50000),
  orientation smallint not null default 1 check (orientation between 1 and 8),
  protected boolean not null default true,
  approval_status public.media_approval_status not null default 'pending',
  uploaded_by uuid references auth.users(id) on delete set null,
  recipe_version public.safe_version not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (purpose, checksum_sha256),
  unique (original_bucket, original_path)
);

create table public.media_licenses (
  id uuid primary key default extensions.gen_random_uuid(),
  asset_id uuid not null unique references public.media_assets(id) on delete cascade,
  ownership_basis text not null check (ownership_basis in ('owned', 'licensed', 'generated')),
  creator_source text check (creator_source is null or char_length(creator_source) <= 300),
  evidence_private_reference text check (evidence_private_reference is null or char_length(evidence_private_reference) <= 500),
  usage_url text check (usage_url is null or usage_url ~ '^https://'),
  territory text check (territory is null or char_length(territory) <= 200),
  expires_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  status public.media_license_status not null default 'pending',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint approved_media_license check (status <> 'approved' or approved_at is not null)
);

create table public.media_variants (
  id uuid primary key default extensions.gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  recipe_version public.safe_version not null,
  role text not null check (role in ('catalog_square', 'card_4x5', 'gallery_3x4', 'editorial_16x9', 'og', 'thumbnail', 'placeholder')),
  format text not null check (format in ('jpeg', 'webp', 'avif')),
  width integer not null check (width between 16 and 5000),
  height integer not null check (height between 16 and 5000),
  crop_x numeric(7, 6) check (crop_x between 0 and 1),
  crop_y numeric(7, 6) check (crop_y between 0 and 1),
  focal_x numeric(7, 6) check (focal_x between 0 and 1),
  focal_y numeric(7, 6) check (focal_y between 0 and 1),
  bucket text not null default 'product-renditions' check (bucket = 'product-renditions'),
  path text not null check (path !~ '(^|/)\.\.(/|$)' and char_length(path) between 3 and 500),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  byte_size bigint not null check (byte_size between 1 and 104857600),
  status public.media_variant_status not null default 'processing',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (asset_id, recipe_version, role, format, width),
  unique (bucket, path)
);

create table public.media_links (
  id uuid primary key default extensions.gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  entity_type text not null check (entity_type in ('product', 'collection', 'content')),
  entity_id uuid not null,
  purpose text not null check (purpose in ('primary', 'gallery', 'hero', 'editorial')),
  position integer not null default 0 check (position >= 0),
  locale public.app_locale,
  primary_link boolean not null default false,
  alt_text text check (alt_text is null or char_length(alt_text) <= 500),
  approved_crop_version public.safe_version,
  created_at timestamptz not null default statement_timestamp(),
  unique (entity_type, entity_id, purpose, position)
);

create unique index media_links_one_primary
on public.media_links (entity_type, entity_id, purpose, locale) nulls not distinct
where primary_link;
create index media_variants_public_lookup on public.media_variants (asset_id, role, width) where status = 'approved';
create index media_links_entity_order on public.media_links (entity_type, entity_id, purpose, position);

alter table public.products
add constraint products_primary_media_asset_fk
foreign key (primary_media_asset_id) references public.media_assets(id) on delete set null;
alter table public.collections
add constraint collections_hero_media_asset_fk
foreign key (hero_media_asset_id) references public.media_assets(id) on delete set null;

create trigger media_assets_set_updated_at before update on public.media_assets
for each row execute function app_private.set_updated_at();
create trigger media_licenses_set_updated_at before update on public.media_licenses
for each row execute function app_private.set_updated_at();
create trigger media_variants_set_updated_at before update on public.media_variants
for each row execute function app_private.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-originals', 'product-originals', false, 536870912, array['image/jpeg', 'image/png', 'image/webp', 'image/tiff']),
  ('product-renditions', 'product-renditions', true, 104857600, array['image/jpeg', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
