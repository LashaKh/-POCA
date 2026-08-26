begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(53);

select ok(to_regclass('public.provider_event_inbox') is not null, 'provider event inbox exists');
select ok(to_regclass('public.payment_reconciliations') is not null, 'payment reconciliations exist');
select ok(to_regclass('public.refund_records') is not null, 'refund records exist');
select ok(to_regclass('public.fulfillments') is not null, 'fulfillments exist');
select ok(to_regclass('public.shipment_events') is not null, 'shipment events exist');
select ok(to_regclass('public.order_internal_notes') is not null, 'internal notes exist');

select has_function('public', 'transition_order', array['uuid', 'bigint', 'order_status', 'text', 'text'], 'order transition command exists');
select has_function('public', 'record_provider_event', array['text', 'text', 'text', 'text', 'text', 'boolean', 'jsonb'], 'provider inbox command exists');
select has_function('public', 'claim_provider_events', array['text', 'integer', 'integer'], 'provider event lease command exists');
select has_function('public', 'reconcile_payment', array['uuid', 'text', 'payment_status', 'bigint', 'text', 'text', 'uuid'], 'payment reconciliation command exists');
select has_function('public', 'review_bank_transfer', array['uuid', 'text', 'text', 'bigint', 'text', 'text', 'uuid'], 'dual-review transfer command exists');
select has_function('public', 'issue_refund', array['uuid', 'bigint', 'text', 'text', 'text'], 'refund command exists');
select has_function('public', 'create_shipment', array['uuid', 'bigint', 'text', 'text', 'text', 'text', 'text'], 'shipment command exists');
select has_function('public', 'record_delivery_event', array['uuid', 'text', 'text'], 'delivery event command exists');
select has_function('public', 'complete_notification_attempt', array['uuid', 'text', 'text', 'text', 'text', 'text'], 'notification completion command exists');
select has_function('public', 'retry_notification', array['uuid'], 'notification retry command exists');

select ok((select relrowsecurity from pg_class where oid = 'public.provider_event_inbox'::regclass), 'provider inbox has RLS');
select ok((select relforcerowsecurity from pg_class where oid = 'public.payment_reconciliations'::regclass), 'reconciliation RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.order_internal_notes'::regclass), 'internal-note RLS is forced');
select ok(not has_table_privilege('authenticated', 'public.payment_reconciliations', 'insert'), 'browser staff cannot directly insert reconciliations');
select ok(not has_table_privilege('authenticated', 'public.refund_records', 'update'), 'browser staff cannot directly alter refunds');
select ok(not has_function_privilege('authenticated', 'public.record_provider_event(text,text,text,text,text,boolean,jsonb)', 'execute'), 'browser roles cannot forge provider events');

insert into public.products (
  id, sku, status, readiness_passed, published_at, width_mm, length_mm,
  shape, materials, construction, colors, styles, condition, care_code,
  delivery_class, search_visible
) values (
  '80000000-0000-4000-8000-000000000001', 'OPERATIONS-ONE', 'published', true,
  statement_timestamp(), 1600, 2400, 'rectangle', array['wool'], 'hand-knotted',
  array['indigo'], array['traditional'], 'excellent', 'professional-clean', 'parcel', true
);
insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  search_text, alt_text_ready, status
) values (
  '80000000-0000-4000-8000-000000000001', 'en', 'operations-one', 'Operations One',
  'Operations fixture', 'Synthetic operations fixture.', 'operations fixture', true, 'published'
);
insert into public.product_prices (product_id, currency, amount_minor, enabled)
values ('80000000-0000-4000-8000-000000000001', 'GEL', 100000, true);
insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
values ('80000000-0000-4000-8000-000000000001', 'unique', 1);

insert into auth.users (id, email) values
  ('80000000-0000-4000-8000-000000000091', 'manager-one@epoca.test'),
  ('80000000-0000-4000-8000-000000000092', 'manager-two@epoca.test'),
  ('80000000-0000-4000-8000-000000000093', 'customer@epoca.test');
insert into public.profiles (id, profile_kind, display_name) values
  ('80000000-0000-4000-8000-000000000091', 'staff', 'Manager One'),
  ('80000000-0000-4000-8000-000000000092', 'staff', 'Manager Two'),
  ('80000000-0000-4000-8000-000000000093', 'customer', 'Customer');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at) values
  ('80000000-0000-4000-8000-000000000091', 'manager', true, false, statement_timestamp()),
  ('80000000-0000-4000-8000-000000000092', 'manager', true, false, statement_timestamp());

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);

select is((select count(*) from public.create_guest_context(repeat('8', 64), 'en', 'GEL')), 1::bigint, 'operations guest is created');
select isnt(public.add_guest_cart_item(repeat('8', 64), '80000000-0000-4000-8000-000000000001', 1), null::uuid, 'operations item is added');
select is((public.reserve_guest_checkout(repeat('8', 64), 'GE', 'standard-test')).status, 'reserved'::public.checkout_status, 'operations checkout reserves inventory');
select matches(
  (public.accept_guest_order(
    repeat('8', 64),
    (select id from public.checkout_sessions where status = 'reserved' order by created_at desc limit 1),
    102500, false, repeat('1', 64), repeat('2', 64), repeat('3', 64),
    'operations@example.test', '+995555010101',
    '{"fullName":"Operations Buyer","line1":"1 Test Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
    'bank_transfer', 'terms-test-v1'
  )).reference,
  '^EPO-[A-Z0-9]{12}$',
  'bank-transfer order is accepted for operations'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"80000000-0000-4000-8000-000000000093","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$select public.transition_order(
    (select id from public.orders where contact_email = 'operations@example.test'),
    (select version from public.orders where contact_email = 'operations@example.test'),
    'cancelled', 'customer attempt', 'customer-denied-0001'
  )$$,
  '42501', 'FORBIDDEN', 'a customer cannot execute manager operations'
);
select is((select count(*) from public.payment_reconciliations), 0::bigint, 'customer cannot see staff-only reconciliations');

select set_config(
  'request.jwt.claims',
  '{"sub":"80000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (public.review_bank_transfer(
    (select id from public.orders where contact_email = 'operations@example.test'),
    'matched', 'TRANSFER-001', 102500, 'GEL', '', null
  )).status,
  'pending',
  'first transfer review remains pending for independent confirmation'
);
select throws_ok(
  $$select public.review_bank_transfer(
    (select id from public.orders where contact_email = 'operations@example.test'),
    'matched', 'TRANSFER-001', 102500, 'GEL', '',
    (select id from public.payment_reconciliations where reconciliation_kind = 'bank_transfer')
  )$$,
  '55000', 'INDEPENDENT_TRANSFER_CONFIRMATION_REQUIRED',
  'the same manager cannot confirm their own transfer review'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"80000000-0000-4000-8000-000000000092","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (public.review_bank_transfer(
    (select id from public.orders where contact_email = 'operations@example.test'),
    'matched', 'TRANSFER-001', 102500, 'GEL', '',
    (select id from public.payment_reconciliations where reconciliation_kind = 'bank_transfer')
  )).status,
  'matched',
  'a second manager independently confirms the transfer'
);
select is((select status from public.orders where contact_email = 'operations@example.test'), 'confirmed'::public.order_status, 'matched payment confirms the order');
select is((select payment_status from public.orders where contact_email = 'operations@example.test'), 'paid'::public.payment_status, 'matched payment marks the order paid');
select is(
  (select status from public.inventory_reservations where order_id = (select id from public.orders where contact_email = 'operations@example.test')),
  'converted'::public.inventory_reservation_status,
  'paid order converts its reservation into sold inventory'
);

select is(
  (public.transition_order(
    (select id from public.orders where contact_email = 'operations@example.test'),
    (select version from public.orders where contact_email = 'operations@example.test'),
    'processing', 'Preparing the carpet', 'order-processing-0001'
  )).status,
  'processing'::public.order_status,
  'manager advances a paid order to processing'
);
select is(
  (public.create_shipment(
    (select id from public.orders where contact_email = 'operations@example.test'),
    (select version from public.orders where contact_email = 'operations@example.test'),
    'Test Carrier', 'Worldwide', 'TRACK-001', 'https://carrier.example/track/TRACK-001',
    'shipment-dispatch-0001'
  )).status,
  'dispatched',
  'manager records a shipment with tracking'
);
select is((select status from public.orders where contact_email = 'operations@example.test'), 'shipped'::public.order_status, 'shipment advances the order to shipped');
select is(
  (public.record_delivery_event(
    (select id from public.fulfillments where tracking_reference = 'TRACK-001'),
    'carrier-delivery-0001', 'Tbilisi'
  )).status,
  'delivered',
  'delivery event completes the fulfillment'
);
select is((select status from public.orders where contact_email = 'operations@example.test'), 'delivered'::public.order_status, 'delivery advances the order to delivered');

select is(
  (public.issue_refund(
    (select id from public.orders where contact_email = 'operations@example.test'),
    2500, 'Delivery adjustment', 'refund-operations-0001', 'REFUND-001'
  )).status,
  'succeeded',
  'manager records a successful provider-confirmed refund'
);
select is((select payment_status from public.orders where contact_email = 'operations@example.test'), 'partially_refunded'::public.payment_status, 'partial refund updates payment status');
select is(
  (public.issue_refund(
    (select id from public.orders where contact_email = 'operations@example.test'),
    2500, 'Delivery adjustment', 'refund-operations-0001', 'REFUND-001'
  )).id,
  (select id from public.refund_records where idempotency_key = 'refund-operations-0001'),
  'refund idempotency returns the original record'
);
select throws_ok(
  $$select public.issue_refund(
    (select id from public.orders where contact_email = 'operations@example.test'),
    102501, 'Excessive refund', 'refund-operations-0002', 'REFUND-002'
  )$$,
  '22003', 'REFUND_EXCEEDS_PAID_AMOUNT', 'refund cannot exceed the captured total'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);
select throws_ok(
  $$update public.shipment_events set event_type = 'changed' where event_key = 'carrier-delivery-0001'$$,
  '55000', 'IMMUTABLE_ORDER_SNAPSHOT', 'shipment history is append-only'
);

select isnt(
  (public.record_provider_event(
    'fixture', 'provider-event-0001', 'payment.updated', 'TRANSFER-001', repeat('a', 64), true,
    '{"source":"test"}'::jsonb
  )).id,
  null::uuid,
  'verified provider event enters the inbox'
);
select is(
  (public.record_provider_event(
    'fixture', 'provider-event-0001', 'payment.updated', 'TRANSFER-001', repeat('a', 64), true,
    '{"source":"test"}'::jsonb
  )).id,
  (select id from public.provider_event_inbox where event_key = 'provider-event-0001'),
  'provider event replay returns the original inbox record'
);
select is(
  (select count(*) from public.claim_provider_events('provider-worker', 10, 120)),
  1::bigint,
  'verified provider event is leased exactly once'
);

select is(
  (select count(*) from app_private.claim_notifications('email-worker', 1, interval '2 minutes')),
  1::bigint,
  'notification worker leases one due message'
);
select is(
  (public.complete_notification_attempt(
    (select id from public.notifications where lease_owner = 'email-worker'),
    'email-worker', 'fixture-email', 'delivered', 'MESSAGE-001', null
  )).status,
  'delivered'::public.notification_status,
  'notification completion records authoritative delivery'
);
select is((select count(*) from public.notification_attempts where outcome = 'delivered'), 1::bigint, 'notification attempt history is recorded once');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"80000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);
select is((select count(*) from public.staff_order_operations where reference like 'EPO-%'), 1::bigint, 'manager sees the minimized operations queue');
select isnt(
  (public.add_order_note(
    (select id from public.orders where contact_email = 'operations@example.test'),
    'Customer requested careful packaging.'
  )).id,
  null::uuid,
  'manager can add an append-only internal note'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"80000000-0000-4000-8000-000000000093","role":"authenticated","aal":"aal1"}',
  true
);
select is((select count(*) from public.order_internal_notes), 0::bigint, 'customer cannot read staff-only internal notes');

select * from finish();
rollback;
