-- Synthetic local-only commerce configuration. It is not a production shipping or banking promise.
insert into public.shipping_zones (
  id, code, name, priority, enabled, configuration_status, legal_status
)
values
  ('50000000-0000-4000-8000-000000000001', 'georgia-test', 'Georgia test zone', 100, true, 'published', 'draft_unapproved'),
  ('50000000-0000-4000-8000-000000000002', 'international-test', 'International test zone', 10, true, 'published', 'draft_unapproved');

insert into public.shipping_zone_countries (zone_id, country_code)
values
  ('50000000-0000-4000-8000-000000000001', 'GE'),
  ('50000000-0000-4000-8000-000000000002', 'DE'),
  ('50000000-0000-4000-8000-000000000002', 'GB'),
  ('50000000-0000-4000-8000-000000000002', 'RU'),
  ('50000000-0000-4000-8000-000000000002', 'US');

insert into public.shipping_methods (
  id, code, name_i18n, service_level_i18n, estimate_min_days,
  estimate_max_days, manual_quote, enabled, configuration_status
)
values
  (
    '51000000-0000-4000-8000-000000000001',
    'standard-test',
    '{"ka":"სტანდარტული სატესტო მიწოდება","en":"Standard test delivery","de":"Standard-Testlieferung","ru":"Стандартная тестовая доставка"}',
    '{"ka":"სტანდარტული","en":"Standard","de":"Standard","ru":"Стандарт"}',
    1, 3, false, true, 'published'
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    'manual-worldwide-test',
    '{"ka":"საერთაშორისო მიწოდების შეთავაზება","en":"Worldwide delivery quote","de":"Angebot für weltweite Lieferung","ru":"Расчёт международной доставки"}',
    '{"ka":"ხელით გამოთვლა","en":"Manual quote","de":"Manuelles Angebot","ru":"Ручной расчёт"}',
    null, null, true, true, 'published'
  );

insert into public.shipping_rate_rules (
  id, zone_id, method_id, currency, amount_minor, free_threshold_minor,
  delivery_classes, priority, enabled
)
values
  ('52000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'GEL', 2500, 500000, array['parcel'], 100, true),
  ('52000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'USD', 1000, 200000, array['parcel'], 100, true),
  ('52000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'EUR', 900, 180000, array['parcel'], 100, true),
  ('52000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'GEL', 0, null, '{}', 10, true),
  ('52000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'USD', 0, null, '{}', 10, true),
  ('52000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000002', 'EUR', 0, null, '{}', 10, true);

insert into public.tax_rules (
  id, country_code, currency, rate_basis_points, prices_include_tax, priority, enabled
)
values
  ('53000000-0000-4000-8000-000000000001', 'GE', 'GEL', 0, false, 100, true),
  ('53000000-0000-4000-8000-000000000002', 'GE', 'USD', 0, false, 100, true),
  ('53000000-0000-4000-8000-000000000003', 'GE', 'EUR', 0, false, 100, true);

insert into public.discounts (
  id, code, kind, percentage_basis_points, minimum_subtotal_minor,
  usage_limit, per_subject_limit, enabled, public_name_i18n,
  combinability, configuration_status
)
values (
  '54000000-0000-4000-8000-000000000001', 'TEST10', 'percentage', 1000,
  10000, 1000, 1, true,
  '{"ka":"სატესტო 10%","en":"Test 10%","de":"Test 10 %","ru":"Тест 10%"}',
  'exclusive', 'published'
);

insert into public.business_settings (key, value, sensitive)
values (
  'payments.bank_transfer',
  '{"enabled":true,"mode":"fixture","deadlineDays":3,"beneficiary":"ÉPOCA TEST ONLY","bank":"TEST BANK — NOT PAYABLE","iban":"TEST-GE00-0000","instructions":{"ka":"მხოლოდ ლოკალური ტესტი — თანხა არ გადარიცხოთ.","en":"Local test only — do not transfer funds.","de":"Nur lokaler Test — kein Geld überweisen.","ru":"Только локальный тест — не переводите деньги."}}',
  true
);

insert into public.integration_configs (key, mode, capabilities, secret_configured, safe_reason)
values ('payment', 'fixture', array['bank-transfer'], false, 'Local bank-transfer fixture only');
