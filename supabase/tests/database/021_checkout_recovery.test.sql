begin;

create extension if not exists pgtap with schema extensions;
select plan(30);

insert into public.products (
  id, sku, status, readiness_passed, published_at, width_mm, length_mm,
  shape, materials, construction, colors, styles, condition, care_code,
  delivery_class, search_visible
) values (
  '61000000-0000-4000-8000-000000000001', 'RECOVERY-ONE', 'published', true,
  statement_timestamp(), 1600, 2400, 'rectangle', array['wool'], 'hand-knotted',
  array['indigo'], array['traditional'], 'good', 'professional-clean', 'parcel', true
);
insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  search_text, alt_text_ready, status
) values (
  '61000000-0000-4000-8000-000000000001', 'en', 'recovery-one', 'Recovery One',
  'Recovery fixture', 'Synthetic recovery fixture.', 'recovery fixture', true, 'published'
);
insert into public.product_prices (product_id, currency, amount_minor, enabled)
values ('61000000-0000-4000-8000-000000000001', 'GEL', 100000, true);
insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
values ('61000000-0000-4000-8000-000000000001', 'unique', 1);

set local role service_role;

select is((select count(*) from public.create_guest_context(repeat('a', 64), 'en', 'GEL')), 1::bigint, 'expiry guest is created');
select isnt(public.add_guest_cart_item(repeat('a', 64), '61000000-0000-4000-8000-000000000001', 1), null::uuid, 'expiry item is added');
select is((public.reserve_guest_checkout(repeat('a', 64), 'GE', 'standard-test')).status, 'reserved'::public.checkout_status, 'expiry checkout reserves inventory');
update public.inventory_reservations set created_at = statement_timestamp() - interval '20 minutes', expires_at = statement_timestamp() - interval '1 minute'
where checkout_session_id = (select id from public.checkout_sessions where status = 'reserved');
update public.checkout_sessions set created_at = statement_timestamp() - interval '20 minutes', expires_at = statement_timestamp() - interval '1 minute'
where status = 'reserved';
select is(public.expire_due_checkout_work(10), 1, 'normal coordinator expires the due checkout');
select is((select status from public.checkout_sessions where status = 'expired' order by created_at limit 1), 'expired'::public.checkout_status, 'checkout becomes expired');
select is((select reserved_quantity from public.inventory_items where product_id = '61000000-0000-4000-8000-000000000001'), 0, 'checkout expiry releases stock');

select is((select count(*) from public.create_guest_context(repeat('b', 64), 'en', 'GEL')), 1::bigint, 'stale-price guest is created');
select isnt(public.add_guest_cart_item(repeat('b', 64), '61000000-0000-4000-8000-000000000001', 1), null::uuid, 'stale-price item is added');
select is((public.reserve_guest_checkout(repeat('b', 64), 'GE', 'standard-test')).status, 'reserved'::public.checkout_status, 'stale-price checkout reserves inventory');
update public.product_prices set amount_minor = 110000 where product_id = '61000000-0000-4000-8000-000000000001' and currency = 'GEL';
select throws_ok(
  $$select public.accept_guest_order(
    repeat('b', 64), (select id from public.checkout_sessions where status = 'reserved'),
    102500, false, repeat('1', 64), repeat('2', 64), repeat('3', 64),
    'stale@example.test', null,
    '{"fullName":"Stale Buyer","line1":"1 Test Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
    'bank_transfer', 'terms-test-v1'
  )$$,
  'P0001', 'CHECKOUT_STALE', 'changed authoritative price blocks stale acceptance'
);
select ok(public.release_checkout_session((select id from public.checkout_sessions where status = 'reserved'), 'test-stale-release', false), 'stale checkout can release normally');
update public.product_prices set amount_minor = 100000 where product_id = '61000000-0000-4000-8000-000000000001' and currency = 'GEL';

select is((select count(*) from public.create_guest_context(repeat('c', 64), 'en', 'GEL')), 1::bigint, 'country-change guest is created');
select isnt(public.add_guest_cart_item(repeat('c', 64), '61000000-0000-4000-8000-000000000001', 1), null::uuid, 'country-change item is added');
select is((public.reserve_guest_checkout(repeat('c', 64), 'GE', 'standard-test')).status, 'reserved'::public.checkout_status, 'country-change checkout reserves inventory');
select throws_ok(
  $$select public.accept_guest_order(
    repeat('c', 64), (select id from public.checkout_sessions where status = 'reserved'),
    102500, false, repeat('4', 64), repeat('5', 64), repeat('6', 64),
    'country@example.test', null,
    '{"fullName":"Country Buyer","line1":"1 Test Street","city":"Berlin","countryCode":"DE"}'::jsonb,
    'bank_transfer', 'terms-test-v1'
  )$$,
  'P0001', 'DELIVERY_COUNTRY_CHANGED', 'address country cannot diverge from the delivery quote'
);
select ok(public.release_checkout_session((select id from public.checkout_sessions where status = 'reserved'), 'test-country-release', false), 'country-change checkout releases');

select is((select count(*) from public.create_guest_context(repeat('d', 64), 'en', 'GEL')), 1::bigint, 'total-change guest is created');
select isnt(public.add_guest_cart_item(repeat('d', 64), '61000000-0000-4000-8000-000000000001', 1), null::uuid, 'total-change item is added');
select is((public.reserve_guest_checkout(repeat('d', 64), 'GE', 'standard-test')).status, 'reserved'::public.checkout_status, 'total-change checkout reserves inventory');
select throws_ok(
  $$select public.accept_guest_order(
    repeat('d', 64), (select id from public.checkout_sessions where status = 'reserved'),
    1, false, repeat('7', 64), repeat('8', 64), repeat('9', 64),
    'total@example.test', null,
    '{"fullName":"Total Buyer","line1":"1 Test Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
    'bank_transfer', 'terms-test-v1'
  )$$,
  'P0001', 'TOTAL_CHANGED', 'client total mismatch fails closed'
);
select ok(public.release_checkout_session((select id from public.checkout_sessions where status = 'reserved'), 'test-total-release', false), 'total-change checkout releases');

select is((select count(*) from public.create_guest_context(repeat('e', 64), 'en', 'GEL')), 1::bigint, 'late-transfer guest is created');
select isnt(public.add_guest_cart_item(repeat('e', 64), '61000000-0000-4000-8000-000000000001', 1), null::uuid, 'late-transfer item is added');
select is((public.reserve_guest_checkout(repeat('e', 64), 'GE', 'standard-test')).status, 'reserved'::public.checkout_status, 'late-transfer checkout reserves inventory');
select matches(
  (public.accept_guest_order(
    repeat('e', 64), (select id from public.checkout_sessions where status = 'reserved'),
    102500, false, repeat('0', 64), repeat('a', 64), repeat('b', 64),
    'late@example.test', null,
    '{"fullName":"Late Buyer","line1":"1 Test Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
    'bank_transfer', 'terms-test-v1'
  )).reference,
  '^EPO-[A-Z0-9]{12}$',
  'late-transfer order is accepted once'
);
update public.orders set bank_transfer_due_at = statement_timestamp() - interval '1 minute'
where contact_email = 'late@example.test';
select is(public.expire_due_checkout_work(10), 1, 'normal coordinator expires the late transfer');
select is((select status from public.orders where contact_email = 'late@example.test'), 'expired'::public.order_status, 'late order becomes expired');
select is((select payment_status from public.orders where contact_email = 'late@example.test'), 'expired'::public.payment_status, 'late payment becomes expired');
select is((select status from public.inventory_reservations where order_id = (select id from public.orders where contact_email = 'late@example.test')), 'expired'::public.inventory_reservation_status, 'late transfer reservation becomes expired');
select is((select reserved_quantity from public.inventory_items where product_id = '61000000-0000-4000-8000-000000000001'), 0, 'late transfer expiry releases stock');

select * from finish();
rollback;
