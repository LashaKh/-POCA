begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select ok(to_regclass('public.customer_accounts') is not null, 'customer account lifecycle exists');
select ok(to_regclass('public.customer_addresses') is not null, 'saved addresses exist');
select ok(to_regclass('public.wishlists') is not null, 'wishlists exist');
select ok(to_regclass('public.wishlist_items') is not null, 'wishlist items exist');
select ok(to_regclass('public.customer_merge_records') is not null, 'merge replay evidence exists');
select ok(to_regclass('public.wishlist_merge_events') is not null, 'wishlist merge evidence exists');
select has_function('public', 'initialize_customer_profile', array['text','app_locale','currency_code'], 'profile initialization command exists');
select has_function('public', 'toggle_guest_wishlist_item', array['text','uuid'], 'guest wishlist command exists');
select has_function('public', 'toggle_customer_wishlist_item', array['uuid'], 'customer wishlist command exists');
select has_function('public', 'merge_customer_guest_data', array['text','text','uuid','text'], 'guest merge command exists');
select has_function('public', 'claim_guest_order_for_customer', array['uuid','text','uuid'], 'account order claim command exists');
select has_function('public', 'request_customer_privacy', array['privacy_request_type','text'], 'customer privacy command exists');
select ok((select relforcerowsecurity from pg_class where oid = 'public.customer_addresses'::regclass), 'address RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.wishlists'::regclass), 'wishlist RLS is forced');
select ok(not has_table_privilege('anon', 'public.wishlists', 'select'), 'anonymous SQL cannot enumerate wishlists');
select ok(not has_function_privilege('anon', 'public.toggle_guest_wishlist_item(text,uuid)', 'execute'), 'browser cannot bypass server-held guest proof');
select ok(not has_table_privilege('authenticated', 'public.customer_accounts', 'update'), 'account state cannot be edited directly');

insert into auth.users (id, email) values
  ('92000000-0000-4000-8000-000000000001', 'customer-one@epoca.test'),
  ('92000000-0000-4000-8000-000000000002', 'customer-two@epoca.test');

insert into public.products (
  id, sku, status, readiness_passed, published_at, width_mm, length_mm,
  shape, materials, construction, colors, styles, condition, care_code,
  delivery_class, search_visible
) values (
  '62000000-0000-4000-8000-000000000001', 'ACCOUNT-ONE', 'published', true,
  statement_timestamp(), 1600, 2400, 'rectangle', array['wool'], 'hand-knotted',
  array['red'], array['traditional'], 'good', 'professional-clean', 'parcel', true
);
insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  search_text, alt_text_ready, status
) values (
  '62000000-0000-4000-8000-000000000001', 'en', 'account-one', 'Account One',
  'Account fixture', 'Synthetic account fixture.', 'account fixture', true, 'published'
);
insert into public.product_prices (product_id, currency, amount_minor, enabled)
values ('62000000-0000-4000-8000-000000000001', 'GEL', 100000, true);
insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
values ('62000000-0000-4000-8000-000000000001', 'unique', 1);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"92000000-0000-4000-8000-000000000101"}', true);
select is(
  (public.initialize_customer_profile('Customer One', 'en', 'GEL')).profile_kind,
  'customer'::public.profile_kind,
  'verified auth initializes its own customer profile'
);
select is((select status from public.customer_accounts), 'active'::public.customer_account_status, 'new customer starts active');
select is(public.toggle_customer_wishlist_item('62000000-0000-4000-8000-000000000001'), true, 'customer can save a published product');
select is(public.toggle_customer_wishlist_item('62000000-0000-4000-8000-000000000001'), false, 'customer toggle removes without duplicates');
select is(public.toggle_customer_wishlist_item('62000000-0000-4000-8000-000000000001'), true, 'customer can save the item again');

insert into public.customer_addresses (
  profile_id, label, full_name, line1, city, country_code, is_default
) values (
  '92000000-0000-4000-8000-000000000001', 'Home', 'Customer One',
  '1 Original Street', 'Tbilisi', 'GE', true
);
select is((select count(*) from public.customer_addresses), 1::bigint, 'customer reads own address');
select throws_ok(
  $$insert into public.customer_addresses (
    profile_id, label, full_name, line1, city, country_code, is_default
  ) values (
    '92000000-0000-4000-8000-000000000001', 'Second default', 'Customer One',
    '2 New Street', 'Tbilisi', 'GE', true
  )$$,
  '23505', null, 'only one default address is allowed per customer'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(
  (select count(*) from public.create_guest_context(repeat('1', 64), 'en', 'GEL')),
  1::bigint, 'guest context is ready for merge'
);
select is(public.toggle_guest_wishlist_item(repeat('1', 64), '62000000-0000-4000-8000-000000000001'), true, 'anonymous wishlist saves by hashed proof');
select is(jsonb_array_length(public.read_guest_wishlist(repeat('1', 64)) -> 'productIds'), 1, 'anonymous wishlist persists');
select isnt(public.add_guest_cart_item(repeat('1', 64), '62000000-0000-4000-8000-000000000001', 1), null::uuid, 'guest cart is ready for merge');
select is(
  (public.merge_customer_guest_data(
    repeat('1', 64), repeat('2', 64),
    '92000000-0000-4000-8000-000000000001', repeat('3', 64)
  ) ->> 'replayed')::boolean,
  false, 'first merge performs one effect'
);
select is(
  (public.merge_customer_guest_data(
    repeat('1', 64), repeat('2', 64),
    '92000000-0000-4000-8000-000000000001', repeat('3', 64)
  ) ->> 'replayed')::boolean,
  true, 'merge replay returns recorded result without repeating effects'
);
select is(
  (
    select count(*)
    from public.customer_merge_records
    where customer_profile_id = '92000000-0000-4000-8000-000000000001'
      and idempotency_key_hash = repeat('3', 64)
  ),
  1::bigint,
  'one merge record is retained for the tested merge key'
);
select is((select count(*) from public.wishlist_items item join public.wishlists list on list.id = item.wishlist_id where list.customer_profile_id = '92000000-0000-4000-8000-000000000001'), 1::bigint, 'wishlist merge suppresses duplicates');
select is((select count(*) from public.cart_items item join public.carts cart on cart.id = item.cart_id where cart.customer_profile_id = '92000000-0000-4000-8000-000000000001'), 1::bigint, 'cart merge creates persistent account cart');
select is(
  jsonb_array_length(public.read_guest_wishlist(repeat('1', 64)) -> 'productIds'),
  0, 'old guest proof cannot read wishlist data after rotation'
);
select is((select secret_hash from public.guest_sessions where customer_profile_id = '92000000-0000-4000-8000-000000000001'), repeat('2', 64), 'merge rotates the guest proof');

select is(
  (public.reserve_guest_checkout(repeat('2', 64), 'GE', 'standard-test')).status,
  'reserved'::public.checkout_status,
  'merged customer can keep using the safe checkout path'
);
select matches(
  (
    public.accept_guest_order(
      repeat('2', 64),
      (select id from public.checkout_sessions where status = 'reserved' order by created_at desc limit 1),
      (select total_minor from public.delivery_quotes order by created_at desc limit 1),
      false, repeat('4', 64), repeat('5', 64), repeat('6', 64),
      'customer-one@epoca.test', '+995555000000',
      '{"fullName":"Customer One","line1":"1 Original Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
      'bank_transfer', 'terms-test-v1'
    )
  ).reference,
  '^EPO-[A-Z0-9]{12}$',
  'account checkout first records the normal immutable order'
);
select ok(public.claim_guest_order_for_customer(
  (select id from public.orders where guest_session_id is not null limit 1), repeat('2', 64),
  '92000000-0000-4000-8000-000000000001'
), 'current merged guest order is claimed by the account');
select is((select count(*) from public.orders where customer_profile_id = '92000000-0000-4000-8000-000000000001'), 1::bigint, 'claimed order has customer ownership');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"92000000-0000-4000-8000-000000000101"}', true);
update public.customer_addresses set line1 = '99 Updated Street' where label = 'Home';
select is((select line1 from public.order_addresses where address_type = 'delivery'), '1 Original Street', 'saved-address edits cannot change historical order snapshots');
select is((select count(*) from public.orders), 1::bigint, 'customer reads own order');
select is(
  (public.request_customer_privacy('access', 'Provide my account data')).status,
  'requested'::public.privacy_request_status,
  'customer can request access without staff intervention'
);
select is(
  (public.request_customer_privacy('deletion', 'Close my customer account')).status,
  'requested'::public.privacy_request_status,
  'customer can request deletion while retained orders remain protected'
);
select is((select status from public.customer_accounts), 'deletion_requested'::public.customer_account_status, 'deletion request records a non-destructive lifecycle state');
select throws_ok(
  $$select public.request_customer_privacy('deletion', 'Duplicate closure request')$$,
  '23505', 'PRIVACY_REQUEST_ALREADY_OPEN', 'duplicate open privacy requests are rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1","session_id":"92000000-0000-4000-8000-000000000102"}', true);
select is((public.initialize_customer_profile('Customer Two', 'de', 'EUR')).display_name, 'Customer Two', 'second account initializes independently');
select is((select count(*) from public.customer_addresses), 0::bigint, 'second customer cannot read first customer addresses');
select is((select count(*) from public.orders), 0::bigint, 'second customer cannot read first customer orders');
select is((select count(*) from public.wishlist_items), 0::bigint, 'second customer cannot read first customer wishlist items');
select is((select count(*) from public.privacy_requests), 0::bigint, 'second customer cannot read first customer privacy requests');

set local role anon;
select throws_ok($$select count(*) from public.customer_addresses$$, '42501', null, 'anonymous users cannot read saved addresses');
select throws_ok($$select count(*) from public.customer_merge_records$$, '42501', null, 'anonymous users cannot read merge evidence');

select * from finish();
rollback;
