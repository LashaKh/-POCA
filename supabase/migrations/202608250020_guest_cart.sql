create type public.cart_status as enum ('active', 'converted', 'abandoned', 'expired');
create type public.checkout_status as enum ('reserved', 'accepted', 'expired', 'cancelled');
create type public.inventory_reservation_status as enum ('active', 'converted', 'released', 'expired');
create type public.order_status as enum (
  'bank_transfer_pending',
  'payment_pending',
  'confirmed',
  'cancelled',
  'expired',
  'refunded',
  'partially_refunded'
);
create type public.payment_status as enum (
  'pending',
  'bank_transfer_review',
  'authorized',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refunded',
  'partially_refunded',
  'uncertain',
  'reconciliation_required'
);
create type public.payment_method_kind as enum ('bank_transfer', 'hosted_payment');
create type public.discount_kind as enum ('percentage', 'fixed');

create table public.guest_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  secret_hash text not null unique check (secret_hash ~ '^[a-f0-9]{64}$'),
  previous_secret_hash text check (previous_secret_hash is null or previous_secret_hash ~ '^[a-f0-9]{64}$'),
  customer_profile_id uuid references public.profiles(id) on delete set null,
  locale public.app_locale not null,
  currency public.currency_code not null,
  created_at timestamptz not null default statement_timestamp(),
  last_seen_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null default (statement_timestamp() + interval '30 days'),
  rotated_at timestamptz,
  revoked_at timestamptz,
  version public.safe_version not null default 1,
  constraint guest_session_expiry check (expires_at > created_at),
  constraint guest_session_rotation check (
    (previous_secret_hash is null and rotated_at is null)
    or (previous_secret_hash is not null and rotated_at is not null)
  )
);

create table public.carts (
  id uuid primary key default extensions.gen_random_uuid(),
  guest_session_id uuid references public.guest_sessions(id) on delete restrict,
  customer_profile_id uuid references public.profiles(id) on delete restrict,
  status public.cart_status not null default 'active',
  currency public.currency_code not null,
  discount_code extensions.citext,
  reconciled_at timestamptz,
  expires_at timestamptz not null default (statement_timestamp() + interval '30 days'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint cart_one_subject check (num_nonnulls(guest_session_id, customer_profile_id) = 1),
  constraint cart_expiry check (expires_at > created_at)
);

create unique index carts_one_active_guest
on public.carts (guest_session_id)
where status = 'active' and guest_session_id is not null;
create unique index carts_one_active_customer
on public.carts (customer_profile_id)
where status = 'active' and customer_profile_id is not null;

create table public.cart_items (
  id uuid primary key default extensions.gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  observed_unit_amount_minor public.money_minor,
  observed_currency public.currency_code,
  observed_product_version public.safe_version,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (cart_id, product_id),
  constraint observed_price_complete check (
    num_nonnulls(observed_unit_amount_minor, observed_currency) in (0, 2)
  )
);

create index cart_items_cart_order on public.cart_items (cart_id, created_at, id);

create trigger carts_set_updated_at before update on public.carts
for each row execute function app_private.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function app_private.set_updated_at();

create or replace function app_private.bump_cart_for_item_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.cart_id = old.cart_id
    and new.product_id = old.product_id
    and new.quantity = old.quantity then
    return new;
  end if;
  update public.carts
  set updated_at = statement_timestamp()
  where id = coalesce(new.cart_id, old.cart_id);
  return coalesce(new, old);
end;
$$;

create trigger cart_items_bump_cart
after insert or update or delete on public.cart_items
for each row execute function app_private.bump_cart_for_item_change();

comment on table public.guest_sessions is
  'Server-managed anonymous commerce identity; only a SHA-256 secret hash is stored.';
comment on table public.cart_items is
  'Buyer intent plus last-observed facts; authoritative values are always reconciled before order acceptance.';
