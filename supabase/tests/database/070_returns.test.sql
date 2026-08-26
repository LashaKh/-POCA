begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select ok(to_regclass('public.return_policies') is not null, 'return policies exist');
select ok(to_regclass('public.return_requests') is not null, 'return requests exist');
select ok(to_regclass('public.return_items') is not null, 'return items exist');
select ok(to_regclass('public.return_events') is not null, 'return timeline exists');
select ok(to_regclass('public.return_evidence') is not null, 'private return evidence exists');
select ok(to_regclass('public.return_inspections') is not null, 'return inspections exist');
select ok(to_regclass('public.return_restock_links') is not null, 'restock effects are linked');
select ok(to_regclass('public.return_refund_links') is not null, 'refund effects are linked');
select has_function('public', 'evaluate_return_eligibility', array['uuid', 'return_request_kind'], 'eligibility command exists');
select has_function('public', 'submit_return_request', array['uuid', 'return_request_kind', 'text', 'text', 'jsonb', 'text', 'text'], 'buyer request command exists');
select has_function('public', 'inspect_return_request', array['uuid', 'bigint', 'text', 'text', 'jsonb', 'text'], 'inspection command exists');
select has_function('public', 'process_return_refund', array['uuid', 'bigint', 'text', 'text', 'text'], 'return refund command exists');
select has_function('public', 'apply_return_restock', array['uuid', 'text'], 'return restock command exists');
select ok((select relforcerowsecurity from pg_class where oid = 'public.return_requests'::regclass), 'return request RLS is forced');
select ok((select relforcerowsecurity from pg_class where oid = 'public.return_evidence'::regclass), 'return evidence RLS is forced');
select ok(not has_table_privilege('anon', 'public.return_requests', 'select'), 'anonymous SQL cannot enumerate returns');
select ok(not has_table_privilege('authenticated', 'public.return_requests', 'insert'), 'buyers cannot bypass the request command');
select ok(not has_table_privilege('authenticated', 'public.return_evidence', 'update'), 'evidence metadata cannot be altered directly');
select is((select legal_status from public.return_policies where active), 'draft_unapproved'::public.return_legal_status, 'seeded legal copy is explicitly unapproved');
select ok(not (select public from storage.buckets where id = 'return-evidence'), 'return evidence bucket is private');

insert into public.products (
  id, sku, status, readiness_passed, published_at, width_mm, length_mm,
  shape, materials, construction, colors, styles, condition, care_code,
  delivery_class, search_visible
) values (
  '93000000-0000-4000-8000-000000000001', 'RETURN-ONE', 'published', true,
  statement_timestamp(), 1700, 2500, 'rectangle', array['wool'], 'hand-knotted',
  array['indigo'], array['traditional'], 'excellent', 'professional-clean', 'parcel', true
);
insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  search_text, alt_text_ready, status
) values (
  '93000000-0000-4000-8000-000000000001', 'en', 'return-one', 'Return One',
  'Return fixture', 'Synthetic return fixture.', 'return fixture', true, 'published'
);
insert into public.product_prices (product_id, currency, amount_minor, enabled)
values ('93000000-0000-4000-8000-000000000001', 'GEL', 100000, true);
insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
values ('93000000-0000-4000-8000-000000000001', 'unique', 1);

insert into auth.users (id, email) values
  ('93000000-0000-4000-8000-000000000091', 'return-manager@epoca.test'),
  ('93000000-0000-4000-8000-000000000092', 'return-customer@epoca.test'),
  ('93000000-0000-4000-8000-000000000093', 'other-customer@epoca.test');
insert into public.profiles (id, profile_kind, display_name) values
  ('93000000-0000-4000-8000-000000000091', 'staff', 'Return Manager'),
  ('93000000-0000-4000-8000-000000000092', 'customer', 'Return Customer'),
  ('93000000-0000-4000-8000-000000000093', 'customer', 'Other Customer');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at)
values ('93000000-0000-4000-8000-000000000091', 'manager', true, false, statement_timestamp());

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);
select is((select count(*) from public.create_guest_context(repeat('a', 64), 'en', 'GEL')), 1::bigint, 'return guest context exists');
select isnt(public.add_guest_cart_item(repeat('a', 64), '93000000-0000-4000-8000-000000000001', 1), null::uuid, 'return product enters the cart');
select is((public.reserve_guest_checkout(repeat('a', 64), 'GE', 'standard-test')).status, 'reserved'::public.checkout_status, 'return order reserves stock');
select matches(
  (public.accept_guest_order(
    repeat('a', 64),
    (select id from public.checkout_sessions where status = 'reserved' order by created_at desc limit 1),
    102500, false, repeat('1', 64), repeat('2', 64), repeat('b', 64),
    'return-buyer@epoca.test', '+995555010909',
    '{"fullName":"Return Buyer","line1":"7 Return Street","city":"Tbilisi","countryCode":"GE"}'::jsonb,
    'bank_transfer', 'terms-test-v1'
  )).reference,
  '^EPO-[A-Z0-9]{12}$',
  'return order is accepted'
);

update public.orders set status = 'delivered', payment_status = 'paid'
where contact_email = 'return-buyer@epoca.test';
update public.payment_attempts set status = 'paid'
where order_id = (select id from public.orders where contact_email = 'return-buyer@epoca.test');
update public.inventory_items set on_hand_quantity = 0, reserved_quantity = 0
where product_id = '93000000-0000-4000-8000-000000000001';
update public.inventory_reservations set
  status = 'converted', converted_at = statement_timestamp(), order_id = (
    select id from public.orders where contact_email = 'return-buyer@epoca.test'
  )
where product_id = '93000000-0000-4000-8000-000000000001';
insert into public.fulfillments (
  order_id, status, carrier, service_level, tracking_reference,
  dispatched_at, delivered_at
) values (
  (select id from public.orders where contact_email = 'return-buyer@epoca.test'),
  'delivered', 'Return Carrier', 'Test', 'RETURN-TRACK-001',
  statement_timestamp() - interval '2 days', statement_timestamp() - interval '1 day'
);

select ok(
  (public.evaluate_return_eligibility(
    (select id from public.orders where contact_email = 'return-buyer@epoca.test'), 'return'
  ) ->> 'eligible')::boolean,
  'paid delivered order inside its snapshotted window is eligible'
);
select is(
  public.evaluate_return_eligibility(
    (select id from public.orders where contact_email = 'return-buyer@epoca.test'), 'cancellation'
  ) ->> 'reasonCode',
  'order_not_cancellable',
  'delivered order is not silently accepted for cancellation'
);
select matches(
  (public.submit_return_request(
    (select id from public.orders where contact_email = 'return-buyer@epoca.test'),
    'return', 'damaged', 'Corner damage after delivery',
    jsonb_build_array(jsonb_build_object(
      'lineId', (select id from public.order_lines where order_id = (select id from public.orders where contact_email = 'return-buyer@epoca.test')),
      'quantity', 1
    )),
    repeat('c', 64), repeat('b', 64)
  )).reference,
  '^RET-[A-Z0-9]{12}$',
  'valid guest proof creates a return reference'
);
select is(
  (public.submit_return_request(
    (select id from public.orders where contact_email = 'return-buyer@epoca.test'),
    'return', 'damaged', 'Corner damage after delivery',
    jsonb_build_array(jsonb_build_object(
      'lineId', (select id from public.order_lines where order_id = (select id from public.orders where contact_email = 'return-buyer@epoca.test')),
      'quantity', 1
    )),
    repeat('c', 64), repeat('b', 64)
  )).id,
  (select id from public.return_requests where idempotency_key_hash = repeat('c', 64)),
  'request replay returns the original case'
);
select throws_ok(
  $$select public.submit_return_request(
    (select id from public.orders where contact_email = 'return-buyer@epoca.test'),
    'return', 'damaged', 'Invalid proof',
    jsonb_build_array(jsonb_build_object(
      'lineId', (select id from public.order_lines where order_id = (select id from public.orders where contact_email = 'return-buyer@epoca.test')),
      'quantity', 1
    )), repeat('d', 64), repeat('9', 64)
  )$$,
  '42501', 'RETURN_ACCESS_DENIED', 'wrong guest proof cannot create a case'
);
select is((select policy_snapshot ->> 'version' from public.return_requests), 'returns-v1-draft', 'request keeps its policy version snapshot');
select is((select eligibility_snapshot ->> 'reasonCode' from public.return_requests), 'eligible', 'request keeps its eligibility outcome snapshot');
select is((select count(*) from public.return_items), 1::bigint, 'requested line quantity is recorded once');
select is((select count(*) from public.notifications where template_key = 'return-submitted'), 1::bigint, 'submission queues one localized notice');

select isnt(
  (public.attach_return_evidence(
    (select id from public.return_requests),
    (select id::text || '/damage.jpg' from public.return_requests),
    'damage.jpg', 'image/jpeg', 2048, repeat('e', 64), repeat('b', 64)
  )).id,
  null::uuid,
  'bounded private image evidence attaches'
);
select throws_ok(
  $$select public.attach_return_evidence(
    (select id from public.return_requests),
    (select id::text || '/unsafe.pdf' from public.return_requests),
    'unsafe.pdf', 'application/pdf', 2048, repeat('f', 64), repeat('b', 64)
  )$$,
  '22023', 'INVALID_RETURN_EVIDENCE', 'disallowed actual type is rejected'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000093","role":"authenticated","aal":"aal1"}', true
);
select is((select count(*) from public.return_requests), 0::bigint, 'another customer cannot read the guest return');
select is((select count(*) from public.return_evidence), 0::bigint, 'another customer cannot read private evidence metadata');
select throws_ok(
  $$select public.request_return_information(
    (select id from public.return_requests), 1, 'Bypass', 'denied-return-info-0001'
  )$$,
  '42501', 'FORBIDDEN', 'customer cannot execute staff transitions'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}', true
);
select is((select count(*) from public.staff_return_queue where order_reference like 'EPO-%'), 1::bigint, 'manager sees the minimized queue');
select is(
  (public.request_return_information(
    (select id from public.return_requests),
    (select version from public.return_requests),
    'Please add a close photograph of the corner.',
    'return-info-request-0001'
  )).status,
  'needs_information'::public.return_request_status,
  'manager requests buyer information with a reason'
);
select is(
  (public.decide_return_request(
    (select id from public.return_requests),
    (select version from public.return_requests),
    true, 'Damage is eligible under the recorded policy.',
    'return-approve-000001'
  )).status,
  'approved'::public.return_request_status,
  'manager approves from needs-information state'
);
select throws_ok(
  $$select public.decide_return_request(
    (select id from public.return_requests),
    (select version from public.return_requests),
    false, 'Late conflicting rejection', 'return-reject-invalid1'
  )$$,
  '55000', 'INVALID_RETURN_TRANSITION', 'invalid out-of-order decision is denied'
);
select is(
  (public.record_return_receipt(
    (select id from public.return_requests),
    (select version from public.return_requests),
    'Package received at the service desk.',
    'return-receipt-000001'
  )).status,
  'received'::public.return_request_status,
  'approved return records receipt'
);
select is(
  (public.inspect_return_request(
    (select id from public.return_requests),
    (select version from public.return_requests),
    'Corner damage confirmed; item can be restored and restocked.',
    'Outer packaging intact.',
    jsonb_build_array(jsonb_build_object(
      'itemId', (select id from public.return_items),
      'condition', 'damaged',
      'restockDecision', 'restock',
      'refundAmountMinor', 50000,
      'note', 'Approved partial refund after inspection.'
    )),
    'return-inspection-0001'
  )).status,
  'inspected'::public.return_request_status,
  'receipt is inspected with per-item money and stock decisions'
);
select is((select refund_amount_minor from public.return_items), 50000::public.money_minor, 'inspection records exact minor-unit allocation');
select is(
  (public.process_return_refund(
    (select id from public.return_requests),
    (select version from public.return_requests),
    'Approved inspected return', 'return-refund-effect1', 'RETURN-REFUND-001'
  )).status,
  'refunded'::public.return_request_status,
  'inspected return produces one provider-confirmed refund'
);
select is((select count(*) from public.return_refund_links), 1::bigint, 'return links exactly one refund effect');
select is((select amount_minor from public.refund_records where provider_reference = 'RETURN-REFUND-001'), 50000::public.money_minor, 'refund uses the inspected allocation');
select is(
  (public.process_return_refund(
    (select id from public.return_requests),
    (select version from public.return_requests),
    'Approved inspected return', 'return-refund-effect1', 'RETURN-REFUND-001'
  )).status,
  'refunded'::public.return_request_status,
  'refund replay returns the same terminal effect'
);
select is(public.apply_return_restock((select id from public.return_requests), 'return-restock-effect'), 1, 'inspected restock applies once');
select is(public.apply_return_restock((select id from public.return_requests), 'return-restock-effect'), 0, 'restock replay applies no second stock change');
select is((select on_hand_quantity from public.inventory_items where product_id = '93000000-0000-4000-8000-000000000001'), 1, 'returned product is restored exactly once');
select is((select count(*) from public.return_restock_links), 1::bigint, 'return links exactly one inventory effect');
select is((select count(*) from public.return_events where return_request_id = (select id from public.return_requests)), 6::bigint, 'buyer and staff share one append-only timeline');
select cmp_ok((select count(*) from public.notifications where purpose like 'return-%'), '>=', 5::bigint, 'return transitions queue localized buyer notices');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);
select cmp_ok((select count(*) from public.audit_events where entity_type = 'return_request'), '>=', 4::bigint, 'return changes leave privacy-safe audit evidence');
select throws_ok(
  $$update public.return_events set event_type = 'changed' where return_request_id = (select id from public.return_requests)$$,
  '55000', 'IMMUTABLE_ORDER_SNAPSHOT', 'return timeline is append-only'
);
select is(
  (public.configure_return_policy(
    'returns-v2-draft', 12, 21,
    array['damaged', 'not_as_described', 'other'], 4, 4194304,
    'after_inspection'
  )).legal_status,
  'draft_unapproved'::public.return_legal_status,
  'new operational configuration cannot pretend legal approval'
);
select is((select policy_version from public.return_requests), 'returns-v1-draft', 'policy changes do not rewrite accepted request context');

insert into public.return_evidence (
  return_request_id, storage_path, original_filename, content_type,
  byte_size, checksum, status, retention_until, created_at
) values (
  (select id from public.return_requests),
  (select id::text || '/abandoned.jpg' from public.return_requests),
  'abandoned.jpg', 'image/jpeg', 1024, repeat('1', 64), 'pending',
  statement_timestamp() + interval '90 days', statement_timestamp() - interval '2 days'
);
select is((select count(*) from public.cleanup_abandoned_return_evidence(10)), 1::bigint, 'abandoned evidence is leased for private-object cleanup');
select is((select status from public.return_evidence where original_filename = 'abandoned.jpg'), 'expired'::public.return_evidence_status, 'abandoned evidence metadata expires safely');

set local role anon;
select throws_ok($$select count(*) from public.return_requests$$, '42501', null, 'anonymous cannot read return records');
select throws_ok($$select count(*) from public.return_evidence$$, '42501', null, 'anonymous cannot read evidence records');

select * from finish();
rollback;
