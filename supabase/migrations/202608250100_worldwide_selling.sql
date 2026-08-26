create type public.price_source_mode as enum ('explicit_only', 'approved_rate_snapshot');
create type public.tax_display_mode as enum ('included', 'added_at_checkout', 'not_applicable', 'pending_legal_review');
create type public.manual_quote_status as enum (
  'submitted', 'needs_information', 'quoted', 'accepted', 'declined', 'expired', 'cancelled'
);

create table public.currency_settings (
  currency public.currency_code primary key,
  enabled boolean not null default false,
  checkout_enabled boolean not null default false,
  is_default boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 1000),
  price_source_mode public.price_source_mode not null default 'explicit_only',
  approved_rate_reference text check (
    approved_rate_reference is null or char_length(approved_rate_reference) between 2 and 200
  ),
  configuration_status text not null default 'draft' check (
    configuration_status in ('draft', 'published', 'disabled')
  ),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint currency_checkout_requires_enablement check (not checkout_enabled or enabled),
  constraint currency_approved_source_reference check (
    price_source_mode = 'explicit_only' or approved_rate_reference is not null
  )
);

create unique index currency_settings_one_default
on public.currency_settings (is_default)
where is_default;

create table public.market_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  market_code text not null unique check (market_code ~ '^[A-Z0-9-]{2,20}$'),
  country_code text not null unique check (country_code ~ '^[A-Z]{2}$'),
  default_currency public.currency_code not null references public.currency_settings(currency),
  tax_display_mode public.tax_display_mode not null default 'pending_legal_review',
  tax_registration_reference text check (
    tax_registration_reference is null or char_length(tax_registration_reference) between 2 and 200
  ),
  customs_responsibility text not null default 'buyer_unless_confirmed' check (
    customs_responsibility in ('buyer_unless_confirmed', 'seller', 'included_by_carrier', 'pending_legal_review')
  ),
  customs_copy_i18n jsonb not null,
  legal_status text not null default 'draft_unapproved' check (
    legal_status in ('draft_unapproved', 'approved')
  ),
  enabled boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint market_customs_four_locales check (
    customs_copy_i18n ?& array['ka', 'en', 'de', 'ru']
  )
);

alter table public.discounts
  add column public_name_i18n jsonb,
  add column description_i18n jsonb,
  add column combinability text not null default 'exclusive' check (
    combinability in ('exclusive', 'same_group', 'stackable')
  ),
  add column stacking_group text check (
    stacking_group is null or stacking_group ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  add column priority integer not null default 0 check (priority between -1000 and 1000),
  add column maximum_discount_minor public.money_minor,
  add column configuration_status text not null default 'draft' check (
    configuration_status in ('draft', 'published', 'disabled')
  ),
  add constraint discount_public_name_locales check (
    public_name_i18n is null or public_name_i18n ?& array['ka', 'en', 'de', 'ru']
  ),
  add constraint discount_description_locales check (
    description_i18n is null or description_i18n ?& array['ka', 'en', 'de', 'ru']
  ),
  add constraint discount_stacking_group_shape check (
    combinability <> 'same_group' or stacking_group is not null
  );

alter table public.shipping_zones
  add column configuration_status text not null default 'draft' check (
    configuration_status in ('draft', 'published', 'disabled')
  ),
  add column legal_status text not null default 'draft_unapproved' check (
    legal_status in ('draft_unapproved', 'approved')
  );

alter table public.shipping_methods
  add column service_level_i18n jsonb,
  add column customs_copy_i18n jsonb,
  add column configuration_status text not null default 'draft' check (
    configuration_status in ('draft', 'published', 'disabled')
  ),
  add constraint shipping_service_level_locales check (
    service_level_i18n is null or service_level_i18n ?& array['ka', 'en', 'de', 'ru']
  ),
  add constraint shipping_customs_copy_locales check (
    customs_copy_i18n is null or customs_copy_i18n ?& array['ka', 'en', 'de', 'ru']
  );

create table public.manual_quote_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default (
    'QUO-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 12))
  ) check (reference ~ '^QUO-[A-Z0-9]{12}$'),
  customer_profile_id uuid references public.profiles(id) on delete restrict,
  guest_session_id uuid references public.guest_sessions(id) on delete restrict,
  guest_proof_hash text check (guest_proof_hash is null or guest_proof_hash ~ '^[a-f0-9]{64}$'),
  cart_id uuid references public.carts(id) on delete restrict,
  status public.manual_quote_status not null default 'submitted',
  locale public.app_locale not null,
  currency public.currency_code not null,
  destination_country_code text not null check (destination_country_code ~ '^[A-Z]{2}$'),
  contact_email extensions.citext not null check (char_length(contact_email::text) between 3 and 254),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 40),
  address jsonb not null check (jsonb_typeof(address) = 'object'),
  buyer_note text check (buyer_note is null or char_length(buyer_note) <= 2000),
  cart_snapshot jsonb not null check (jsonb_typeof(cart_snapshot) = 'object'),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  quoted_amount_minor public.money_minor,
  quoted_currency public.currency_code,
  quoted_method_i18n jsonb,
  estimate_min_days integer check (estimate_min_days between 0 and 365),
  estimate_max_days integer check (estimate_max_days between 0 and 365),
  customs_snapshot jsonb,
  staff_note text check (staff_note is null or char_length(staff_note) <= 2000),
  buyer_message text check (buyer_message is null or char_length(buyer_message) <= 2000),
  quoted_by uuid references public.profiles(id) on delete set null,
  quoted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  correlation_id uuid not null default extensions.gen_random_uuid(),
  constraint manual_quote_one_subject check (
    num_nonnulls(customer_profile_id, guest_session_id) = 1
  ),
  constraint manual_quote_guest_proof_shape check (
    (guest_session_id is null and guest_proof_hash is null)
    or (guest_session_id is not null and guest_proof_hash is not null)
  ),
  constraint manual_quote_price_shape check (
    num_nonnulls(quoted_amount_minor, quoted_currency) in (0, 2)
  ),
  constraint manual_quote_estimate_order check (
    estimate_min_days is null or estimate_max_days is null
    or estimate_min_days <= estimate_max_days
  ),
  constraint manual_quote_expiry_shape check (
    expires_at is null or expires_at > created_at
  )
);

create unique index manual_quotes_customer_idempotency
on public.manual_quote_requests (customer_profile_id, idempotency_key_hash)
where customer_profile_id is not null;
create unique index manual_quotes_guest_idempotency
on public.manual_quote_requests (guest_session_id, idempotency_key_hash)
where guest_session_id is not null;
create index manual_quotes_staff_queue
on public.manual_quote_requests (status, created_at desc);

create table public.manual_quote_events (
  id bigint generated always as identity primary key,
  manual_quote_id uuid not null references public.manual_quote_requests(id) on delete restrict,
  event_type text not null check (event_type ~ '^[a-z0-9-]{2,80}$'),
  from_status public.manual_quote_status,
  to_status public.manual_quote_status not null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_class text not null check (actor_class in ('guest', 'customer', 'manager', 'owner', 'system')),
  buyer_message text check (buyer_message is null or char_length(buyer_message) <= 2000),
  idempotency_key_hash text check (
    idempotency_key_hash is null or idempotency_key_hash ~ '^[a-f0-9]{64}$'
  ),
  correlation_id uuid not null,
  occurred_at timestamptz not null default clock_timestamp()
);

create unique index manual_quote_event_idempotency
on public.manual_quote_events (manual_quote_id, event_type, idempotency_key_hash)
where idempotency_key_hash is not null;

create table public.commerce_configuration_revisions (
  id bigint generated always as identity primary key,
  area text not null check (area in ('currency', 'price', 'promotion', 'delivery', 'market')),
  subject_key text not null check (char_length(subject_key) between 1 and 200),
  version public.safe_version not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 2 and 500),
  correlation_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (area, subject_key, version)
);

create trigger currency_settings_updated before update on public.currency_settings
for each row execute function app_private.set_updated_at();
create trigger market_settings_updated before update on public.market_settings
for each row execute function app_private.set_updated_at();
create trigger manual_quote_requests_updated before update on public.manual_quote_requests
for each row execute function app_private.set_updated_at();

insert into public.currency_settings (
  currency, enabled, checkout_enabled, is_default, display_order,
  price_source_mode, configuration_status
) values
  ('GEL', true, true, true, 10, 'explicit_only', 'published'),
  ('USD', true, true, false, 20, 'explicit_only', 'published'),
  ('EUR', true, true, false, 30, 'explicit_only', 'published');

insert into public.market_settings (
  market_code, country_code, default_currency, tax_display_mode,
  customs_responsibility, customs_copy_i18n, legal_status, enabled
) values (
  'GE', 'GE', 'GEL', 'pending_legal_review', 'pending_legal_review',
  '{"ka":"საბაჟო და საგადასახადო ტექსტი საჭიროებს დამტკიცებას.","en":"Customs and tax wording is awaiting approval.","de":"Zoll- und Steuertext wartet auf Freigabe.","ru":"Текст о таможне и налогах ожидает утверждения."}',
  'draft_unapproved', true
);

update public.discounts set
  public_name_i18n = jsonb_build_object(
    'ka', code::text, 'en', code::text, 'de', code::text, 'ru', code::text
  ),
  configuration_status = case when enabled then 'published' else 'draft' end;
update public.shipping_zones set
  configuration_status = case when enabled then 'published' else 'draft' end;
update public.shipping_methods set
  service_level_i18n = name_i18n,
  configuration_status = case when enabled then 'published' else 'draft' end;

comment on table public.manual_quote_requests is
  'Private buyer-to-staff quote workflow. Cart and customs facts are snapshotted; no unsupported delivery promise is fabricated.';
comment on table public.commerce_configuration_revisions is
  'Immutable operational history for worldwide selling configuration changes.';
