create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique check (reference ~ '^EPO-[A-Z0-9]{10,24}$'),
  guest_session_id uuid references public.guest_sessions(id) on delete restrict,
  customer_profile_id uuid references public.profiles(id) on delete restrict,
  checkout_session_id uuid not null unique references public.checkout_sessions(id) on delete restrict,
  status public.order_status not null,
  payment_status public.payment_status not null,
  payment_method public.payment_method_kind not null,
  locale public.app_locale not null,
  currency public.currency_code not null,
  contact_email extensions.citext not null check (char_length(contact_email::text) between 3 and 254),
  contact_phone text check (contact_phone is null or char_length(contact_phone) between 5 and 40),
  subtotal_minor public.money_minor not null,
  discount_minor public.money_minor not null,
  tax_minor public.money_minor not null,
  delivery_minor public.money_minor not null,
  total_minor public.money_minor not null,
  pricing_version text not null check (char_length(pricing_version) between 1 and 80),
  terms_version text not null check (char_length(terms_version) between 1 and 80),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  guest_proof_hash text check (guest_proof_hash is null or guest_proof_hash ~ '^[a-f0-9]{64}$'),
  guest_proof_expires_at timestamptz,
  bank_transfer_due_at timestamptz,
  accepted_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint order_one_buyer check (num_nonnulls(guest_session_id, customer_profile_id) = 1),
  constraint order_total check (total_minor = subtotal_minor - discount_minor + tax_minor + delivery_minor),
  constraint order_guest_proof check (
    (guest_session_id is null and guest_proof_hash is null and guest_proof_expires_at is null)
    or (guest_session_id is not null and guest_proof_hash is not null and guest_proof_expires_at > accepted_at)
  ),
  unique (guest_session_id, idempotency_key_hash)
);

create table public.order_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null,
  localized_name text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_amount_minor public.money_minor not null,
  subtotal_minor public.money_minor not null,
  discount_minor public.money_minor not null default 0,
  tax_minor public.money_minor not null default 0,
  total_minor public.money_minor not null,
  fulfillment_snapshot jsonb not null,
  product_snapshot jsonb not null,
  unique (order_id, product_id),
  constraint order_line_total check (total_minor = subtotal_minor - discount_minor + tax_minor),
  constraint order_line_subtotal check (subtotal_minor = unit_amount_minor * quantity),
  constraint order_line_snapshots check (
    jsonb_typeof(fulfillment_snapshot) = 'object' and jsonb_typeof(product_snapshot) = 'object'
  )
);

create table public.order_addresses (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  address_type text not null check (address_type in ('delivery', 'billing')),
  full_name text not null check (char_length(full_name) between 1 and 160),
  organization text check (organization is null or char_length(organization) <= 160),
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text check (line2 is null or char_length(line2) <= 200),
  city text not null check (char_length(city) between 1 and 120),
  region text check (region is null or char_length(region) <= 120),
  postal_code text check (postal_code is null or char_length(postal_code) <= 40),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  instructions text check (instructions is null or char_length(instructions) <= 500),
  unique (order_id, address_type)
);

create table public.order_adjustments (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in ('discount', 'tax', 'delivery')),
  code text,
  label text not null check (char_length(label) between 1 and 160),
  amount_minor bigint not null,
  currency public.currency_code not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint order_adjustment_metadata check (jsonb_typeof(metadata) = 'object')
);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 1 and 100),
  from_status public.order_status,
  to_status public.order_status,
  actor_class text not null check (actor_class in ('guest', 'customer', 'manager', 'owner', 'service')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint order_event_metadata check (jsonb_typeof(safe_metadata) = 'object')
);

create table public.payment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  method public.payment_method_kind not null,
  status public.payment_status not null,
  amount_minor public.money_minor not null,
  currency public.currency_code not null,
  provider text not null check (char_length(provider) between 1 and 80),
  provider_reference text,
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 160),
  due_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 1 and 100),
  from_status public.payment_status,
  to_status public.payment_status not null,
  provider_event_key text,
  correlation_id uuid not null,
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp(),
  unique nulls not distinct (payment_attempt_id, provider_event_key),
  constraint payment_event_metadata check (jsonb_typeof(safe_metadata) = 'object')
);

create table public.bank_transfer_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  status text not null check (status in ('pending', 'matched', 'rejected', 'unmatched', 'late')),
  transfer_reference text check (transfer_reference is null or char_length(transfer_reference) <= 160),
  amount_minor public.money_minor,
  currency public.currency_code,
  evidence_path text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_reason text check (review_reason is null or char_length(review_reason) <= 500),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  reviewed_at timestamptz,
  version public.safe_version not null default 1
);

create table public.webhook_receipts (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null check (char_length(provider) between 1 and 80),
  event_key text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  signature_valid boolean not null,
  status text not null check (status in ('received', 'processing', 'complete', 'failed', 'rejected')),
  safe_error_code text,
  correlation_id uuid not null,
  received_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  unique (provider, event_key)
);

create table public.order_notification_links (
  order_id uuid not null references public.orders(id) on delete restrict,
  notification_id uuid not null references public.notifications(id) on delete restrict,
  purpose text not null check (char_length(purpose) between 1 and 100),
  primary key (order_id, notification_id)
);

alter table public.discount_redemptions
add constraint discount_redemptions_order_fk foreign key (order_id) references public.orders(id) on delete restrict;
alter table public.checkout_sessions
add constraint checkout_sessions_order_fk foreign key (accepted_order_id) references public.orders(id) on delete restrict;
alter table public.inventory_reservations
add constraint inventory_reservations_order_fk foreign key (order_id) references public.orders(id) on delete restrict;

create trigger orders_set_updated_at before update on public.orders
for each row execute function app_private.set_updated_at();
create trigger payment_attempts_set_updated_at before update on public.payment_attempts
for each row execute function app_private.set_updated_at();
create trigger bank_transfer_reviews_set_updated_at before update on public.bank_transfer_reviews
for each row execute function app_private.set_updated_at();

create or replace function app_private.reject_immutable_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'IMMUTABLE_ORDER_SNAPSHOT' using errcode = '55000';
end;
$$;

create trigger order_lines_immutable before update or delete on public.order_lines
for each row execute function app_private.reject_immutable_change();
create trigger order_addresses_immutable before update or delete on public.order_addresses
for each row execute function app_private.reject_immutable_change();
create trigger order_adjustments_immutable before update or delete on public.order_adjustments
for each row execute function app_private.reject_immutable_change();
create trigger order_events_append_only before update or delete on public.order_events
for each row execute function app_private.reject_immutable_change();
create trigger payment_events_append_only before update or delete on public.payment_events
for each row execute function app_private.reject_immutable_change();

comment on table public.orders is
  'Accepted-order monetary, buyer, locale, payment, and policy snapshot; line/address/adjustment children are immutable.';
