create type public.customer_account_status as enum (
  'active', 'deletion_requested', 'restricted', 'closed'
);
create type public.wishlist_status as enum ('active', 'merged', 'abandoned');

create table public.customer_accounts (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  status public.customer_account_status not null default 'active',
  verified_at timestamptz,
  deletion_requested_at timestamptz,
  closed_at timestamptz,
  closure_reason_code text check (
    closure_reason_code is null or closure_reason_code ~ '^[A-Z0-9_]{2,80}$'
  ),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint customer_account_state_times check (
    (status <> 'deletion_requested' or deletion_requested_at is not null)
    and (status <> 'closed' or closed_at is not null)
  )
);

create table public.customer_addresses (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 160),
  organization text check (organization is null or char_length(organization) <= 160),
  line1 text not null check (char_length(btrim(line1)) between 1 and 200),
  line2 text check (line2 is null or char_length(line2) <= 200),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  region text check (region is null or char_length(region) <= 120),
  postal_code text check (postal_code is null or char_length(postal_code) <= 40),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  phone text check (phone is null or char_length(phone) between 5 and 40),
  instructions text check (instructions is null or char_length(instructions) <= 500),
  is_default boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create unique index customer_addresses_one_default
on public.customer_addresses (profile_id)
where is_default;
create index customer_addresses_profile_order
on public.customer_addresses (profile_id, is_default desc, created_at, id);

create table public.wishlists (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_profile_id uuid references public.profiles(id) on delete restrict,
  guest_session_id uuid references public.guest_sessions(id) on delete restrict,
  status public.wishlist_status not null default 'active',
  merged_into_id uuid references public.wishlists(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint wishlist_one_subject check (
    num_nonnulls(customer_profile_id, guest_session_id) = 1
  ),
  constraint wishlist_merge_state check (
    (status = 'merged' and merged_into_id is not null)
    or (status <> 'merged' and merged_into_id is null)
  )
);

create unique index wishlists_one_active_customer
on public.wishlists (customer_profile_id)
where customer_profile_id is not null and status = 'active';
create unique index wishlists_one_active_guest
on public.wishlists (guest_session_id)
where guest_session_id is not null and status = 'active';

create table public.wishlist_items (
  id uuid primary key default extensions.gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  added_at timestamptz not null default statement_timestamp(),
  unique (wishlist_id, product_id)
);

create index wishlist_items_order
on public.wishlist_items (wishlist_id, added_at desc, id);

create table public.customer_merge_records (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles(id) on delete restrict,
  guest_session_id uuid not null references public.guest_sessions(id) on delete restrict,
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  cart_items_merged integer not null default 0 check (cart_items_merged >= 0),
  wishlist_items_merged integer not null default 0 check (wishlist_items_merged >= 0),
  orders_claimed integer not null default 0 check (orders_claimed >= 0),
  completed_at timestamptz not null default statement_timestamp(),
  correlation_id uuid not null,
  unique (customer_profile_id, idempotency_key_hash)
);

create table public.wishlist_merge_events (
  id bigint generated always as identity primary key,
  merge_record_id uuid not null unique references public.customer_merge_records(id) on delete restrict,
  source_wishlist_id uuid references public.wishlists(id) on delete restrict,
  target_wishlist_id uuid not null references public.wishlists(id) on delete restrict,
  item_count integer not null check (item_count >= 0),
  occurred_at timestamptz not null default clock_timestamp()
);

create trigger customer_accounts_set_updated_at before update on public.customer_accounts
for each row execute function app_private.set_updated_at();
create trigger customer_addresses_set_updated_at before update on public.customer_addresses
for each row execute function app_private.set_updated_at();
create trigger wishlists_set_updated_at before update on public.wishlists
for each row execute function app_private.set_updated_at();

create trigger wishlist_merge_events_append_only
before update or delete on public.wishlist_merge_events
for each row execute function app_private.reject_immutable_change();
create trigger customer_merge_records_append_only
before update or delete on public.customer_merge_records
for each row execute function app_private.reject_immutable_change();

comment on table public.customer_addresses is
  'Customer convenience data only. Accepted orders always retain independent immutable address snapshots.';
comment on table public.customer_merge_records is
  'Replay-safe evidence of guest-to-account cart, wishlist, and order ownership reconciliation.';
