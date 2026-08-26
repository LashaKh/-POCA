alter table public.customer_accounts enable row level security;
alter table public.customer_accounts force row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_addresses force row level security;
alter table public.wishlists enable row level security;
alter table public.wishlists force row level security;
alter table public.wishlist_items enable row level security;
alter table public.wishlist_items force row level security;
alter table public.customer_merge_records enable row level security;
alter table public.customer_merge_records force row level security;
alter table public.wishlist_merge_events enable row level security;
alter table public.wishlist_merge_events force row level security;

revoke all on public.customer_accounts, public.customer_addresses,
  public.wishlists, public.wishlist_items, public.customer_merge_records,
  public.wishlist_merge_events from public, anon, authenticated;

grant select on public.customer_accounts to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select on public.wishlists, public.wishlist_items,
  public.customer_merge_records, public.wishlist_merge_events to authenticated;

create policy customer_accounts_self_read on public.customer_accounts
for select to authenticated using (profile_id = auth.uid());

create policy customer_addresses_self_read on public.customer_addresses
for select to authenticated using (profile_id = auth.uid());
create policy customer_addresses_self_insert on public.customer_addresses
for insert to authenticated with check (profile_id = auth.uid());
create policy customer_addresses_self_update on public.customer_addresses
for update to authenticated using (profile_id = auth.uid())
with check (profile_id = auth.uid());
create policy customer_addresses_self_delete on public.customer_addresses
for delete to authenticated using (profile_id = auth.uid());

create policy wishlists_customer_read on public.wishlists
for select to authenticated using (customer_profile_id = auth.uid());
create policy wishlist_items_customer_read on public.wishlist_items
for select to authenticated using (exists (
  select 1 from public.wishlists wishlist
  where wishlist.id = wishlist_id and wishlist.customer_profile_id = auth.uid()
));
create policy customer_merge_records_self_read on public.customer_merge_records
for select to authenticated using (customer_profile_id = auth.uid());
create policy wishlist_merge_events_self_read on public.wishlist_merge_events
for select to authenticated using (exists (
  select 1 from public.customer_merge_records merge_record
  where merge_record.id = merge_record_id
    and merge_record.customer_profile_id = auth.uid()
));

create policy profiles_staff_customer_safe_read on public.profiles
for select to authenticated using (public.is_active_staff());

create view public.staff_customer_directory
with (security_invoker = true)
as select profile.id, profile.display_name, profile.locale,
  profile.created_at, account.status, account.updated_at
from public.profiles profile
join public.customer_accounts account on account.profile_id = profile.id
where profile.profile_kind = 'customer';

revoke all on public.staff_customer_directory from public, anon, authenticated;
grant select on public.staff_customer_directory to authenticated;

grant all on public.customer_accounts, public.customer_addresses,
  public.wishlists, public.wishlist_items, public.customer_merge_records,
  public.wishlist_merge_events to service_role;
grant usage, select on all sequences in schema public to service_role;
