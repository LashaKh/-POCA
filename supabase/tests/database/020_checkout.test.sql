begin;

create extension if not exists pgtap with schema extensions;
select plan(61);

select ok(to_regclass('public.guest_sessions') is not null, 'guest sessions exist');
select ok(to_regclass('public.carts') is not null, 'carts exist');
select ok(to_regclass('public.cart_items') is not null, 'cart items exist');
select ok(to_regclass('public.discounts') is not null, 'discounts exist');
select ok(to_regclass('public.tax_rules') is not null, 'tax rules exist');
select ok(to_regclass('public.shipping_zones') is not null, 'shipping zones exist');
select ok(to_regclass('public.shipping_methods') is not null, 'shipping methods exist');
select ok(to_regclass('public.delivery_quotes') is not null, 'delivery quotes exist');
select ok(to_regclass('public.checkout_sessions') is not null, 'checkout sessions exist');
select ok(to_regclass('public.inventory_reservations') is not null, 'inventory reservations exist');
select ok(to_regclass('public.inventory_events') is not null, 'inventory events exist');
select ok(to_regclass('public.orders') is not null, 'orders exist');
select ok(to_regclass('public.order_lines') is not null, 'order lines exist');
select ok(to_regclass('public.order_addresses') is not null, 'order addresses exist');
select ok(to_regclass('public.order_adjustments') is not null, 'order adjustments exist');
select ok(to_regclass('public.order_events') is not null, 'order events exist');
select ok(to_regclass('public.payment_attempts') is not null, 'payment attempts exist');
select ok(to_regclass('public.bank_transfer_reviews') is not null, 'bank transfer reviews exist');
select ok(to_regclass('public.webhook_receipts') is not null, 'webhook receipts exist');
select ok(to_regclass('public.order_notification_links') is not null, 'order notification links exist');

select has_function('public', 'create_guest_context', array['text', 'app_locale', 'currency_code', 'interval'], 'guest context command exists');
select has_function('public', 'add_guest_cart_item', array['text', 'uuid', 'integer'], 'cart add command exists');
select has_function('public', 'quote_guest_cart', array['text', 'text', 'text'], 'authoritative pricing command exists');
select has_function('public', 'reserve_guest_checkout', array['text', 'text', 'text'], 'reservation command exists');
select has_function(
  'public',
  'accept_guest_order',
  array['text', 'uuid', 'bigint', 'boolean', 'text', 'text', 'text', 'text', 'text', 'jsonb', 'payment_method_kind', 'text'],
  'duplicate-safe acceptance command exists'
);
select has_function('public', 'release_order_reservations', array['uuid', 'text', 'boolean'], 'order release command exists');
select has_function('public', 'expire_due_checkout_work', array['integer'], 'normal expiry command exists');

select ok(not has_table_privilege('anon', 'public.guest_sessions', 'select'), 'anonymous clients cannot read guest secrets');
select ok(not has_table_privilege('anon', 'public.orders', 'select'), 'anonymous clients cannot read orders');
select ok(has_table_privilege('authenticated', 'public.orders', 'select'), 'authenticated buyers can attempt owned order reads');
select ok(
  not has_function_privilege('anon', 'public.accept_guest_order(text,uuid,bigint,boolean,text,text,text,text,text,jsonb,payment_method_kind,text)', 'execute'),
  'browser roles cannot invoke the service acceptance command'
);

insert into public.products (
  id, sku, status, readiness_passed, published_at, width_mm, length_mm,
  shape, materials, construction, colors, styles, condition, care_code,
  delivery_class, search_visible
) values (
  '60000000-0000-4000-8000-000000000001', 'CHECKOUT-ONE', 'published', true,
  statement_timestamp(), 1600, 2400, 'rectangle', array['wool'], 'hand-knotted',
  array['indigo'], array['traditional'], 'good', 'professional-clean', 'parcel', true
);
insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  search_text, alt_text_ready, status
) values (
  '60000000-0000-4000-8000-000000000001', 'en', 'checkout-one', 'Checkout One',
  'Checkout fixture', 'Synthetic checkout fixture.', 'checkout fixture', true, 'published'
);
insert into public.product_prices (product_id, currency, amount_minor, enabled)
values ('60000000-0000-4000-8000-000000000001', 'GEL', 100000, true);
insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
values ('60000000-0000-4000-8000-000000000001', 'unique', 1);

set local role service_role;

select is(
  (select count(*) from public.create_guest_context(repeat('1', 64), 'en', 'GEL')),
  1::bigint,
  'guest context creates one active cart'
);
select isnt(
  public.add_guest_cart_item(repeat('1', 64), '60000000-0000-4000-8000-000000000001', 1),
  null::uuid,
  'published in-stock item can be added'
);
select is(
  jsonb_array_length(public.read_guest_cart(repeat('1', 64)) -> 'items'),
  1,
  'guest cart persists its item'
);
select cmp_ok(
  (select version::integer from public.carts where status = 'active' and guest_session_id = (
    select id from public.guest_sessions where secret_hash = repeat('1', 64)
  )),
  '>',
  1,
  'cart item changes advance the cart reconciliation version'
);

update public.product_prices set amount_minor = 110000
where product_id = '60000000-0000-4000-8000-000000000001' and currency = 'GEL';

select is(
  (public.quote_guest_cart(repeat('1', 64), 'GE', 'standard-test')).breakdown ->> 'changed',
  'true',
  'reconciliation reports a changed observed price'
);
select is(
  (public.quote_guest_cart(repeat('1', 64), 'GE', 'standard-test')).total_minor::bigint,
  112500::bigint,
  'quote uses exact current subtotal plus configured delivery'
);
select is(
  app_private.allocate_minor(100, array[1, 1, 1]::bigint[]),
  array[34, 33, 33]::bigint[],
  'largest-remainder allocation is deterministic'
);
select is(
  (public.reserve_guest_checkout(repeat('1', 64), 'GE', 'standard-test')).status,
  'reserved'::public.checkout_status,
  'checkout reserves current inventory'
);
select is(
  (select reserved_quantity from public.inventory_items where product_id = '60000000-0000-4000-8000-000000000001'),
  1,
  'authoritative inventory records one reservation effect'
);

select matches(
  (
    public.accept_guest_order(
      repeat('1', 64),
      (select id from public.checkout_sessions where status = 'reserved' order by created_at desc limit 1),
      112500,
      false,
      repeat('2', 64),
      repeat('3', 64),
      repeat('4', 64),
      'buyer@example.test',
      '+995555000000',
      '{"fullName":"Test Buyer","line1":"1 Test Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
      'bank_transfer',
      'terms-test-v1'
    )
  ).reference,
  '^EPO-[A-Z0-9]{12}$',
  'bank-transfer acceptance returns a stable order reference'
);
select is((select count(*) from public.orders where guest_session_id is not null), 1::bigint, 'acceptance creates one order');
select is((select count(*) from public.notifications where template_key = 'order-bank-transfer-pending'), 1::bigint, 'acceptance queues one localized notice');
select is(
  (
    public.accept_guest_order(
      repeat('1', 64),
      (select checkout_session_id from public.orders where guest_session_id is not null limit 1),
      112500,
      false,
      repeat('2', 64),
      repeat('3', 64),
      repeat('4', 64),
      'buyer@example.test',
      '+995555000000',
      '{"fullName":"Test Buyer","line1":"1 Test Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
      'bank_transfer',
      'terms-test-v1'
    )
  ).id,
  (select id from public.orders where guest_session_id is not null limit 1),
  'duplicate acceptance returns the original order'
);
select throws_ok(
  $$select public.accept_guest_order(
    repeat('1', 64),
    (select checkout_session_id from public.orders where guest_session_id is not null limit 1),
    112500, false, repeat('2', 64), repeat('5', 64), repeat('4', 64),
    'buyer@example.test', null,
    '{"fullName":"Test Buyer","line1":"1 Test Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
    'bank_transfer', 'terms-test-v1'
  )$$,
  '23505',
  'IDEMPOTENCY_KEY_REUSED',
  'a reused idempotency key cannot change its request'
);
select ok(public.verify_guest_order_proof((select reference from public.orders limit 1), repeat('4', 64)), 'valid guest proof grants recovery');
select ok(not public.verify_guest_order_proof((select reference from public.orders limit 1), repeat('9', 64)), 'invalid guest proof is denied');
select throws_ok(
  $$update public.order_lines set localized_name = 'Changed' where order_id = (select id from public.orders limit 1)$$,
  '55000',
  'IMMUTABLE_ORDER_SNAPSHOT',
  'accepted order lines are immutable'
);

select is(
  (select count(*) from public.create_guest_context(repeat('6', 64), 'en', 'GEL')),
  1::bigint,
  'a second guest context has an independent cart'
);
select throws_ok(
  $$select public.add_guest_cart_item(repeat('6', 64), '60000000-0000-4000-8000-000000000001', 1)$$,
  'P0001',
  'INSUFFICIENT_STOCK',
  'a second buyer cannot claim the reserved last item'
);
select ok(public.release_order_reservations((select id from public.orders limit 1), 'test-release', false), 'order reservation releases normally');
select is(
  (select reserved_quantity from public.inventory_items where product_id = '60000000-0000-4000-8000-000000000001'),
  0,
  'release restores available inventory exactly once'
);
select ok(public.release_order_reservations((select id from public.orders limit 1), 'test-repeat', false), 'repeated release is idempotent');

select is(
  (select count(*) from public.create_guest_context(repeat('7', 64), 'en', 'GEL')),
  1::bigint,
  'discount checkout receives an independent guest cart'
);
select isnt(
  public.add_guest_cart_item(repeat('7', 64), '60000000-0000-4000-8000-000000000001', 1),
  null::uuid,
  'released inventory can be added by a later buyer'
);
select ok(public.apply_guest_cart_discount(repeat('7', 64), 'TEST10'), 'eligible discount is applied to the cart');
select is(
  (public.quote_guest_cart(repeat('7', 64), 'GE', 'standard-test')).discount_minor::bigint,
  11000::bigint,
  'percentage discount rounds in exact minor units'
);
select is(
  (public.quote_guest_cart(repeat('7', 64), 'GE', 'standard-test')).total_minor::bigint,
  101500::bigint,
  'discounted total reconciles exactly'
);
select ok(
  (public.quote_guest_cart(repeat('7', 64), 'US', 'manual-worldwide-test')).manual_quote,
  'international fixture honestly returns manual quote mode'
);
select throws_ok(
  $$select public.reserve_guest_checkout(repeat('7', 64), 'US', 'manual-worldwide-test')$$,
  'P0001',
  'MANUAL_QUOTE_REQUIRED',
  'manual-quote delivery cannot be falsely accepted as a fixed rate'
);

set local role anon;
select throws_ok(
  $$select * from public.orders$$,
  '42501',
  null,
  'anonymous SQL clients cannot bypass guest proof with a direct order read'
);

select * from finish();
rollback;
