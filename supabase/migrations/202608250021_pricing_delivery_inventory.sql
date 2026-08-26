create table public.discounts (
  id uuid primary key default extensions.gen_random_uuid(),
  code extensions.citext not null unique check (code::text ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$'),
  kind public.discount_kind not null,
  percentage_basis_points integer check (percentage_basis_points between 1 and 10000),
  fixed_amount_minor public.money_minor,
  currency public.currency_code,
  minimum_subtotal_minor public.money_minor not null default 0,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_subject_limit integer not null default 1 check (per_subject_limit between 1 and 100),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz not null default '-infinity',
  ends_at timestamptz not null default 'infinity',
  enabled boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint discount_value_shape check (
    (kind = 'percentage' and percentage_basis_points is not null and fixed_amount_minor is null and currency is null)
    or (kind = 'fixed' and percentage_basis_points is null and fixed_amount_minor is not null and currency is not null)
  ),
  constraint discount_interval check (ends_at > starts_at),
  constraint discount_usage check (usage_limit is null or used_count <= usage_limit)
);

create table public.discount_scopes (
  id uuid primary key default extensions.gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  unique nulls not distinct (discount_id, product_id, collection_id),
  constraint discount_scope_one_target check (num_nonnulls(product_id, collection_id) = 1)
);

create table public.discount_redemptions (
  id uuid primary key default extensions.gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete restrict,
  order_id uuid not null,
  guest_session_id uuid references public.guest_sessions(id) on delete restrict,
  customer_profile_id uuid references public.profiles(id) on delete restrict,
  amount_minor public.money_minor not null,
  currency public.currency_code not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (discount_id, order_id),
  constraint redemption_one_subject check (num_nonnulls(guest_session_id, customer_profile_id) = 1)
);

create table public.tax_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  currency public.currency_code not null,
  rate_basis_points integer not null check (rate_basis_points between 0 and 10000),
  prices_include_tax boolean not null default false,
  priority integer not null default 0,
  starts_at timestamptz not null default '-infinity',
  ends_at timestamptz not null default 'infinity',
  enabled boolean not null default false,
  version public.safe_version not null default 1,
  constraint tax_rule_interval check (ends_at > starts_at)
);

create unique index tax_rules_active_priority
on public.tax_rules (country_code, currency, priority)
where enabled;

create table public.shipping_zones (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  priority integer not null default 0,
  enabled boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create table public.shipping_zone_countries (
  zone_id uuid not null references public.shipping_zones(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  primary key (zone_id, country_code)
);

create table public.shipping_methods (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_i18n jsonb not null,
  estimate_min_days integer check (estimate_min_days between 0 and 365),
  estimate_max_days integer check (estimate_max_days between 0 and 365),
  manual_quote boolean not null default false,
  enabled boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint shipping_name_four_locales check (name_i18n ?& array['ka', 'en', 'de', 'ru']),
  constraint shipping_estimate_order check (
    estimate_min_days is null or estimate_max_days is null or estimate_min_days <= estimate_max_days
  )
);

create table public.shipping_rate_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones(id) on delete cascade,
  method_id uuid not null references public.shipping_methods(id) on delete cascade,
  currency public.currency_code not null,
  amount_minor public.money_minor not null,
  free_threshold_minor public.money_minor,
  minimum_subtotal_minor public.money_minor not null default 0,
  maximum_subtotal_minor public.money_minor,
  delivery_classes text[] not null default '{}',
  priority integer not null default 0,
  enabled boolean not null default false,
  starts_at timestamptz not null default '-infinity',
  ends_at timestamptz not null default 'infinity',
  version public.safe_version not null default 1,
  constraint shipping_rate_interval check (ends_at > starts_at),
  constraint shipping_subtotal_range check (
    maximum_subtotal_minor is null or maximum_subtotal_minor >= minimum_subtotal_minor
  )
);

create index shipping_rates_lookup
on public.shipping_rate_rules (zone_id, currency, priority, method_id)
where enabled;

create table public.delivery_quotes (
  id uuid primary key default extensions.gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  cart_version public.safe_version not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  method_id uuid references public.shipping_methods(id) on delete restrict,
  currency public.currency_code not null,
  subtotal_minor public.money_minor not null,
  discount_minor public.money_minor not null,
  tax_minor public.money_minor not null,
  delivery_minor public.money_minor not null,
  total_minor public.money_minor not null,
  manual_quote boolean not null default false,
  pricing_version text not null check (char_length(pricing_version) between 1 and 80),
  breakdown jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  constraint delivery_quote_expiry check (expires_at > created_at),
  constraint delivery_quote_breakdown_object check (jsonb_typeof(breakdown) = 'object'),
  constraint delivery_quote_total check (
    total_minor = subtotal_minor - discount_minor + tax_minor + delivery_minor
  )
);

create table public.checkout_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete restrict,
  quote_id uuid not null references public.delivery_quotes(id) on delete restrict,
  status public.checkout_status not null default 'reserved',
  reservation_version text not null check (char_length(reservation_version) between 16 and 128),
  accepted_order_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  constraint checkout_session_expiry check (expires_at > created_at),
  constraint checkout_acceptance check (
    (status = 'accepted' and accepted_order_id is not null and accepted_at is not null)
    or status <> 'accepted'
  )
);

create unique index checkout_one_reserved_cart
on public.checkout_sessions (cart_id)
where status = 'reserved';

create table public.inventory_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  checkout_session_id uuid not null references public.checkout_sessions(id) on delete restrict,
  cart_id uuid not null references public.carts(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  order_id uuid,
  quantity integer not null check (quantity between 1 and 20),
  status public.inventory_reservation_status not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  converted_at timestamptz,
  released_at timestamptz,
  release_reason text check (release_reason is null or char_length(release_reason) <= 120),
  unique (checkout_session_id, product_id),
  constraint reservation_expiry check (expires_at > created_at),
  constraint reservation_terminal_time check (
    (status = 'active' and converted_at is null and released_at is null)
    or (status = 'converted' and converted_at is not null and released_at is null)
    or (status in ('released', 'expired') and released_at is not null and converted_at is null)
  )
);

create index inventory_reservations_active_expiry
on public.inventory_reservations (expires_at, product_id)
where status = 'active';

create table public.inventory_events (
  id bigint generated always as identity primary key,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  reservation_id uuid references public.inventory_reservations(id) on delete restrict,
  event_type text not null check (event_type in ('reserved', 'released', 'expired', 'sold', 'adjusted', 'returned')),
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null check (char_length(reason) between 1 and 120),
  correlation_id uuid not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default clock_timestamp()
);

create index inventory_events_item_time on public.inventory_events (inventory_item_id, occurred_at desc);

create trigger discounts_set_updated_at before update on public.discounts
for each row execute function app_private.set_updated_at();
create trigger shipping_zones_set_updated_at before update on public.shipping_zones
for each row execute function app_private.set_updated_at();
create trigger shipping_methods_set_updated_at before update on public.shipping_methods
for each row execute function app_private.set_updated_at();

comment on table public.delivery_quotes is
  'Versioned exact reconciliation snapshot; acceptance always verifies cart version and expiry.';
