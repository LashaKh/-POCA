begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select ok(to_regclass('public.currency_settings') is not null, 'currency governance exists');
select ok(to_regclass('public.market_settings') is not null, 'market governance exists');
select ok(to_regclass('public.manual_quote_requests') is not null, 'manual quote requests exist');
select ok(to_regclass('public.manual_quote_events') is not null, 'manual quote timeline exists');
select ok(to_regclass('public.commerce_configuration_revisions') is not null, 'configuration history exists');
select has_function('public', 'resolve_product_price', array['uuid', 'currency_code', 'text'], 'versioned price resolver exists');
select has_function('public', 'configure_currency_setting', array[
  'currency_code', 'boolean', 'boolean', 'boolean', 'integer',
  'price_source_mode', 'text', 'text', 'bigint', 'text'
], 'currency configuration command exists');
select has_function('public', 'submit_manual_quote', array[
  'text', 'text', 'text', 'text', 'text', 'jsonb', 'text', 'text'
], 'manual quote submission command exists');
select has_function('public', 'resolve_manual_quote', array[
  'uuid', 'bigint', 'bigint', 'currency_code', 'jsonb', 'integer',
  'integer', 'jsonb', 'timestamp with time zone', 'text', 'text', 'text'
], 'manual quote resolution command exists');
select ok((select relforcerowsecurity from pg_class where oid = 'public.manual_quote_requests'::regclass), 'manual quote RLS is forced');
select ok(not has_table_privilege('anon', 'public.manual_quote_requests', 'select'), 'guest quote contact is not directly enumerable');
select ok(not has_table_privilege('authenticated', 'public.currency_settings', 'update'), 'staff cannot bypass currency command');
select ok(
  has_table_privilege('service_role', 'public.published_currency_settings', 'select')
  and has_table_privilege('service_role', 'public.published_market_settings', 'select')
  and has_table_privilege('service_role', 'public.published_promotions', 'select')
  and has_table_privilege('service_role', 'public.published_delivery_options', 'select'),
  'trusted storefront rendering can read every published commerce projection'
);
select is((select count(*) from public.currency_settings where enabled), 3::bigint, 'GEL, USD, and EUR are explicitly enabled');
select is((select currency from public.currency_settings where is_default), 'GEL'::public.currency_code, 'GEL is the explicit default');
select is((select legal_status from public.market_settings where country_code = 'GE'), 'draft_unapproved', 'unapproved Georgia legal wording is labeled honestly');

insert into public.products (
  id, sku, status, readiness_passed, published_at, width_mm, length_mm,
  shape, materials, construction, colors, styles, condition, care_code,
  delivery_class, search_visible
) values (
  '95000000-0000-4000-8000-000000000001', 'WORLD-ONE', 'published', true,
  statement_timestamp(), 1800, 2600, 'rectangle', array['wool'], 'hand-knotted',
  array['rust'], array['traditional'], 'excellent', 'professional-clean', 'parcel', true
);
insert into public.product_translations (
  product_id, locale, slug, name, short_description, long_description,
  search_text, alt_text_ready, status
) values (
  '95000000-0000-4000-8000-000000000001', 'en', 'world-one', 'World One',
  'Worldwide fixture', 'Synthetic worldwide-selling fixture.', 'world fixture', true, 'published'
);
insert into public.product_prices (product_id, currency, amount_minor, enabled)
values
  ('95000000-0000-4000-8000-000000000001', 'GEL', 100000, true),
  ('95000000-0000-4000-8000-000000000001', 'USD', 40000, true);
insert into public.inventory_items (product_id, stock_model, on_hand_quantity)
values ('95000000-0000-4000-8000-000000000001', 'stocked', 20);

select is(
  (public.resolve_product_price('95000000-0000-4000-8000-000000000001', 'GEL', null)).amount_minor::bigint,
  100000::bigint,
  'price resolver returns the explicit GEL minor-unit price'
);
select is(
  (public.resolve_product_price(
    '95000000-0000-4000-8000-000000000001', 'EUR', null
  )).id,
  null::uuid,
  'a missing EUR price does not fabricate a conversion'
);

insert into auth.users (id, email) values
  ('95000000-0000-4000-8000-000000000091', 'world-manager@epoca.test'),
  ('95000000-0000-4000-8000-000000000092', 'world-customer@epoca.test');
insert into public.profiles (id, profile_kind, display_name) values
  ('95000000-0000-4000-8000-000000000091', 'staff', 'World Manager'),
  ('95000000-0000-4000-8000-000000000092', 'customer', 'World Customer');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at)
values ('95000000-0000-4000-8000-000000000091', 'manager', true, false, statement_timestamp());

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  (public.configure_currency_setting(
    'USD', false, false, false, 20, 'explicit_only', null,
    'disabled', 1, 'Test disabled-currency behavior'
  )).configuration_status,
  'disabled',
  'manager can explicitly disable a currency'
);
select is(
  (select count(*) from public.commerce_configuration_revisions
   where area = 'currency' and subject_key = 'USD'),
  1::bigint,
  'currency change creates one immutable revision'
);
select throws_ok(
  $$select public.configure_currency_setting(
    'USD', true, true, false, 20, 'explicit_only', null,
    'published', 1, 'Stale replay'
  )$$,
  '40001',
  'CURRENCY_VERSION_CONFLICT',
  'stale currency version is rejected'
);
select is(
  (public.configure_currency_setting(
    'USD', true, true, false, 20, 'explicit_only', null,
    'published', 2, 'Restore the test currency'
  )).configuration_status,
  'published',
  'disabled currency can be deliberately restored'
);

select is(
  (public.save_product_market_price(
    '95000000-0000-4000-8000-000000000001', 'USD', 'US', 41000,
    statement_timestamp(), statement_timestamp() + interval '30 days', true,
    'explicit', null, 0, 'Add an explicit US price'
  )).market_code,
  'US',
  'manager can save an explicit market price'
);
select is(
  (public.resolve_product_price('95000000-0000-4000-8000-000000000001', 'USD', 'US')).amount_minor::bigint,
  41000::bigint,
  'matching explicit market price wins deterministically'
);
select is(
  (select count(*) from public.product_prices
   where product_id = '95000000-0000-4000-8000-000000000001'
     and currency = 'USD' and enabled),
  1::bigint,
  'price publishing prevents ambiguous enabled prices in the legacy checkout boundary'
);

select is(
  (public.configure_promotion(
    null, 'WORLD50', 'percentage', 5000, null, null, 0, 12000,
    100, 1, statement_timestamp() - interval '1 hour',
    statement_timestamp() + interval '1 day', 'exclusive', null, 100,
    '{"ka":"მსოფლიო 50%","en":"World 50%","de":"Weltweit 50 %","ru":"Мир 50%"}',
    null, 'published', 0, 'Create bounded test promotion'
  )).maximum_discount_minor::bigint,
  12000::bigint,
  'promotion stores an exact maximum discount cap'
);
select throws_ok(
  $$select public.configure_promotion(
    null, 'BADSTACK', 'percentage', 1000, null, null, 0, null,
    100, 1, statement_timestamp(), statement_timestamp() + interval '1 day',
    'same_group', null, 0,
    '{"ka":"x","en":"x","de":"x","ru":"x"}', null,
    'published', 0, 'Invalid stacking rule'
  )$$,
  '22023',
  'INVALID_PROMOTION',
  'promotion combination policy cannot omit its stacking group'
);

reset role;
insert into public.shipping_zones (
  id, code, name, priority, enabled, configuration_status, legal_status
) values
  ('95000000-0000-4000-8000-000000000010', 'world-low', 'World low', 5, true, 'published', 'draft_unapproved'),
  ('95000000-0000-4000-8000-000000000011', 'world-high', 'World high', 50, true, 'published', 'draft_unapproved');
insert into public.shipping_zone_countries (zone_id, country_code) values
  ('95000000-0000-4000-8000-000000000010', 'CA'),
  ('95000000-0000-4000-8000-000000000011', 'CA');
insert into public.shipping_methods (
  id, code, name_i18n, service_level_i18n, estimate_min_days,
  estimate_max_days, enabled, configuration_status
) values
  (
    '95000000-0000-4000-8000-000000000020', 'world-low',
    '{"ka":"დაბალი","en":"Low","de":"Niedrig","ru":"Низкий"}',
    '{"ka":"დაბალი","en":"Low","de":"Niedrig","ru":"Низкий"}',
    8, 12, true, 'published'
  ),
  (
    '95000000-0000-4000-8000-000000000021', 'world-high',
    '{"ka":"მაღალი","en":"High","de":"Hoch","ru":"Высокий"}',
    '{"ka":"მაღალი","en":"High","de":"Hoch","ru":"Высокий"}',
    3, 5, true, 'published'
  );
insert into public.shipping_rate_rules (
  zone_id, method_id, currency, amount_minor, delivery_classes, priority, enabled
) values
  ('95000000-0000-4000-8000-000000000010', '95000000-0000-4000-8000-000000000020', 'GEL', 9900, array['parcel'], 10, true),
  ('95000000-0000-4000-8000-000000000011', '95000000-0000-4000-8000-000000000021', 'GEL', 7700, array['parcel'], 10, true);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);
select is((select count(*) from public.create_guest_context(repeat('d', 64), 'en', 'GEL')), 1::bigint, 'worldwide guest cart exists');
select isnt(
  public.add_guest_cart_item(repeat('d', 64), '95000000-0000-4000-8000-000000000001', 1),
  null::uuid,
  'worldwide fixture enters the cart'
);
select ok(public.apply_guest_cart_discount(repeat('d', 64), 'WORLD50'), 'bounded promotion applies');
select is(
  (public.quote_guest_cart(repeat('d', 64), 'GE', 'standard-test')).discount_minor::bigint,
  12000::bigint,
  'authoritative quote caps the promotion in exact minor units'
);
select is(
  (public.quote_guest_cart(repeat('d', 64), 'CA', null)).delivery_minor::bigint,
  7700::bigint,
  'higher-priority eligible delivery zone wins'
);
select is(
  (public.quote_guest_cart(repeat('d', 64), 'CA', null)).breakdown ->> 'taxDisplayMode',
  'pending_legal_review',
  'unknown market tax display remains explicitly pending review'
);

select matches(
  (public.submit_manual_quote(
    repeat('d', 64), repeat('e', 64), 'AQ', 'world-buyer@epoca.test', null,
    '{"fullName":"World Buyer","line1":"1 Long Research Station","city":"McMurdo","countryCode":"AQ"}',
    'Please quote this route', repeat('f', 64)
  )).reference,
  '^QUO-[A-Z0-9]{12}$',
  'unsupported destination receives a stable manual quote reference'
);
select is(
  (public.submit_manual_quote(
    repeat('d', 64), repeat('e', 64), 'AQ', 'world-buyer@epoca.test', null,
    '{"fullName":"World Buyer","line1":"1 Long Research Station","city":"McMurdo","countryCode":"AQ"}',
    'Please quote this route', repeat('f', 64)
  )).id,
  (select id from public.manual_quote_requests where idempotency_key_hash = repeat('f', 64)),
  'manual quote replay returns the original request'
);
select is(
  public.read_manual_quote(
    (select reference from public.manual_quote_requests where idempotency_key_hash = repeat('f', 64)),
    repeat('e', 64)
  ) ->> 'status',
  'submitted',
  'valid guest proof reads quote status'
);
select throws_ok(
  $$select public.read_manual_quote(
    (select reference from public.manual_quote_requests where idempotency_key_hash = repeat('f', 64)),
    repeat('0', 64)
  )$$,
  'P0002',
  'QUOTE_NOT_FOUND',
  'invalid proof receives an existence-safe denial'
);
select is(
  (select count(*) from public.notifications where template_key = 'quote-submitted'),
  1::bigint,
  'manual quote submission queues exactly one localized notice'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (public.resolve_manual_quote(
    (select id from public.manual_quote_requests where idempotency_key_hash = repeat('f', 64)),
    1, 22000, 'GEL',
    '{"ka":"საერთაშორისო","en":"International","de":"International","ru":"Международная"}',
    10, 18,
    '{"responsibility":"buyer_unless_confirmed","legalStatus":"draft_unapproved"}',
    statement_timestamp() + interval '7 days', 'Carrier fixture',
    'Your route has been priced for review', repeat('1', 64)
  )).status,
  'quoted'::public.manual_quote_status,
  'manager resolves a quote with bounded price, estimate, and customs snapshot'
);
select is(
  (select count(*) from public.manual_quote_events
   where manual_quote_id = (select id from public.manual_quote_requests where idempotency_key_hash = repeat('f', 64))
     and event_type = 'quoted'),
  1::bigint,
  'quote resolution creates one timeline event'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);
select is(
  (public.respond_manual_quote(
    (select id from public.manual_quote_requests where idempotency_key_hash = repeat('f', 64)),
    repeat('e', 64), true, 2, repeat('2', 64)
  )).status,
  'accepted'::public.manual_quote_status,
  'guest accepts a live quote with its private proof'
);
select is(
  (public.respond_manual_quote(
    (select id from public.manual_quote_requests where idempotency_key_hash = repeat('f', 64)),
    repeat('e', 64), true, 2, repeat('2', 64)
  )).status,
  'accepted'::public.manual_quote_status,
  'quote response replay remains idempotent'
);

set local role anon;
select is((select count(*) from public.published_currency_settings), 3::bigint, 'anonymous storefront sees only published currencies');
select ok((select count(*) from public.published_delivery_options where country_code = 'GE') > 0, 'published delivery projection is available to the storefront');
select throws_ok(
  $$select * from public.manual_quote_requests$$,
  '42501',
  null,
  'anonymous SQL cannot enumerate manual quote contact or address data'
);

select * from finish();
rollback;
