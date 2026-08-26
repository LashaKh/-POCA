create type public.product_status as enum (
  'draft',
  'in_review',
  'scheduled',
  'published',
  'unpublished',
  'archived'
);
create type public.translation_status as enum ('draft', 'reviewed', 'published');
create type public.stock_model as enum ('unique', 'stocked');
create type public.collection_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.catalog_relation_type as enum ('related', 'similar', 'companion');

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  sku extensions.citext not null unique check (char_length(sku::text) between 2 and 80),
  status public.product_status not null default 'draft',
  readiness_passed boolean not null default false,
  readiness_version public.safe_version not null default 1,
  scheduled_at timestamptz,
  published_at timestamptz,
  unpublished_at timestamptz,
  archived_at timestamptz,
  width_mm integer check (width_mm between 1 and 100000),
  length_mm integer check (length_mm between 1 and 100000),
  diameter_mm integer check (diameter_mm between 1 and 100000),
  entered_width numeric(10, 2),
  entered_length numeric(10, 2),
  entered_unit text check (entered_unit in ('mm', 'cm', 'm', 'in', 'ft')),
  shape text check (shape is null or char_length(shape) between 2 and 60),
  materials text[] not null default '{}',
  construction text check (construction is null or char_length(construction) between 2 and 120),
  colors text[] not null default '{}',
  styles text[] not null default '{}',
  condition text check (condition is null or char_length(condition) between 2 and 120),
  care_code text check (care_code is null or char_length(care_code) between 2 and 80),
  delivery_class text check (delivery_class is null or char_length(delivery_class) between 2 and 80),
  origin text check (origin is null or char_length(origin) between 2 and 120),
  origin_verified boolean not null default false,
  age_min_year integer check (age_min_year between 1000 and 2200),
  age_max_year integer check (age_max_year between 1000 and 2200),
  age_verified boolean not null default false,
  pile text check (pile is null or char_length(pile) between 2 and 120),
  pile_verified boolean not null default false,
  handmade boolean,
  handmade_verified boolean not null default false,
  provenance_summary text check (provenance_summary is null or char_length(provenance_summary) <= 2000),
  provenance_verified boolean not null default false,
  category text check (category is null or char_length(category) between 2 and 80),
  search_visible boolean not null default false,
  structured_data_eligible boolean not null default false,
  primary_media_asset_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint product_age_range check (
    age_min_year is null or age_max_year is null or age_min_year <= age_max_year
  ),
  constraint product_optional_truth check (
    (origin is null or origin_verified)
    and (age_min_year is null and age_max_year is null or age_verified)
    and (pile is null or pile_verified)
    and (handmade is null or handmade_verified)
    and (provenance_summary is null or provenance_verified)
  ),
  constraint product_shape_dimensions check (
    shape is null
    or shape <> 'round'
    or (diameter_mm is not null and width_mm is null and length_mm is null)
  ),
  constraint product_published_state check (
    status <> 'published'
    or (readiness_passed and published_at is not null and search_visible)
  )
);

create table public.product_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  locale public.app_locale not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 160),
  name text not null check (char_length(name) between 1 and 180),
  short_description text check (short_description is null or char_length(short_description) <= 500),
  long_description text check (long_description is null or char_length(long_description) <= 10000),
  care_text text check (care_text is null or char_length(care_text) <= 3000),
  search_text text not null default '' check (char_length(search_text) <= 12000),
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 180),
  alt_text_ready boolean not null default false,
  status public.translation_status not null default 'draft',
  assisted_source boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (product_id, locale),
  unique (locale, slug),
  constraint published_translation_ready check (
    status <> 'published'
    or (short_description is not null and long_description is not null and alt_text_ready)
  )
);

create table public.product_prices (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  currency public.currency_code not null,
  amount_minor public.money_minor not null,
  market_code text check (market_code is null or market_code ~ '^[A-Z0-9-]{2,20}$'),
  active_from timestamptz not null default '-infinity',
  active_until timestamptz not null default 'infinity',
  enabled boolean not null default false,
  source text not null default 'explicit' check (source in ('explicit', 'approved_rate_snapshot')),
  source_reference text check (source_reference is null or char_length(source_reference) <= 200),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint product_price_interval check (active_until > active_from)
);

create unique index product_prices_active_identity
on public.product_prices (product_id, currency, coalesce(market_code, ''))
where enabled;
create index product_prices_public_lookup
on public.product_prices (currency, amount_minor, product_id)
where enabled;

create table public.inventory_items (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete restrict,
  stock_model public.stock_model not null,
  on_hand_quantity integer not null default 0 check (on_hand_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  available_quantity integer generated always as (on_hand_quantity - reserved_quantity) stored,
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint inventory_not_oversold check (reserved_quantity <= on_hand_quantity),
  constraint unique_product_quantity check (stock_model <> 'unique' or on_hand_quantity <= 1)
);

create table public.collections (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  collection_type text not null default 'manual' check (collection_type in ('manual', 'rule')),
  status public.collection_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  hero_media_asset_id uuid,
  order_strategy text not null default 'manual' check (order_strategy in ('manual', 'newest', 'price_asc', 'price_desc')),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create table public.collection_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  locale public.app_locale not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 180),
  description text check (description is null or char_length(description) <= 6000),
  seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  seo_description text check (seo_description is null or char_length(seo_description) <= 180),
  status public.translation_status not null default 'draft',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (collection_id, locale),
  unique (locale, slug)
);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  featured boolean not null default false,
  active_from timestamptz not null default '-infinity',
  active_until timestamptz not null default 'infinity',
  primary key (collection_id, product_id),
  constraint collection_product_interval check (active_until > active_from)
);

create table public.tags (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  tag_type text not null check (tag_type in ('color', 'material', 'style', 'origin', 'feature')),
  filter_visible boolean not null default true,
  created_at timestamptz not null default statement_timestamp()
);

create table public.tag_translations (
  tag_id uuid not null references public.tags(id) on delete cascade,
  locale public.app_locale not null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (char_length(label) between 1 and 100),
  primary key (tag_id, locale),
  unique (locale, slug)
);

create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create table public.product_relations (
  source_product_id uuid not null references public.products(id) on delete cascade,
  target_product_id uuid not null references public.products(id) on delete cascade,
  relation_type public.catalog_relation_type not null,
  position integer not null default 0 check (position >= 0),
  primary key (source_product_id, target_product_id, relation_type),
  constraint product_relation_not_self check (source_product_id <> target_product_id)
);

create table public.merchandising_slots (
  id uuid primary key default extensions.gen_random_uuid(),
  placement text not null check (char_length(placement) between 2 and 100),
  locale public.app_locale,
  market_code text,
  product_id uuid references public.products(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  active_from timestamptz not null default '-infinity',
  active_until timestamptz not null default 'infinity',
  status public.collection_status not null default 'draft',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint merchandising_one_target check (num_nonnulls(product_id, collection_id) = 1),
  constraint merchandising_interval check (active_until > active_from)
);

create index products_public_status on public.products (published_at desc, id) where status = 'published' and search_visible;
create index products_public_sku_lower on public.products (lower(sku::text)) where status = 'published' and search_visible;
create index products_facets on public.products (shape, condition, category) where status = 'published';
create index products_materials_gin on public.products using gin (materials) where status = 'published';
create index products_colors_gin on public.products using gin (colors) where status = 'published';
create index product_translations_search on public.product_translations using gin (to_tsvector('simple', search_text));
create index product_translations_name_trgm on public.product_translations using gin (name extensions.gin_trgm_ops);
create index collection_products_order on public.collection_products (collection_id, position, product_id);

create trigger products_set_updated_at before update on public.products
for each row execute function app_private.set_updated_at();
create trigger product_translations_set_updated_at before update on public.product_translations
for each row execute function app_private.set_updated_at();
create trigger product_prices_set_updated_at before update on public.product_prices
for each row execute function app_private.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items
for each row execute function app_private.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
for each row execute function app_private.set_updated_at();
create trigger collection_translations_set_updated_at before update on public.collection_translations
for each row execute function app_private.set_updated_at();
create trigger merchandising_slots_set_updated_at before update on public.merchandising_slots
for each row execute function app_private.set_updated_at();
