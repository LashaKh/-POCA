create schema if not exists extensions;
create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.app_locale as enum ('ka', 'en', 'de', 'ru');
create type public.profile_kind as enum ('customer', 'staff');
create type public.staff_role as enum ('owner', 'manager');
create type public.integration_mode as enum (
  'disabled',
  'fixture',
  'sandbox',
  'live',
  'degraded'
);
create type public.consent_choice as enum ('granted', 'refused', 'withdrawn');
create type public.notification_status as enum (
  'pending',
  'leased',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'cancelled'
);
create type public.job_status as enum (
  'queued',
  'uploading',
  'processing',
  'needs_review',
  'failed',
  'retrying',
  'cancelled',
  'complete'
);
create type public.work_status as enum (
  'pending',
  'leased',
  'complete',
  'failed',
  'cancelled'
);

create domain public.currency_code as text
  check (value ~ '^[A-Z]{3}$');

create domain public.money_minor as bigint
  check (value between 0 and 9000000000000000);

create domain public.safe_version as bigint
  default 1
  check (value > 0);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  new.version = old.version + 1;
  return new;
end;
$$;

comment on schema app_private is
  'Server-owned helpers that are not exposed through the Data API.';
comment on domain public.money_minor is
  'Exact non-negative money amount in the currency minor unit.';
comment on domain public.currency_code is
  'Uppercase ISO-style currency identifier; business enablement is separate.';
