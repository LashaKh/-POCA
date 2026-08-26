-- Synthetic local-only catalog. None of these records or claims are production content.
insert into public.collections (id, code, status, published_at, order_strategy)
values (
  '20000000-0000-4000-8000-000000000001',
  'synthetic-collection',
  'published',
  statement_timestamp(),
  'manual'
);

insert into public.collection_translations (
  collection_id,
  locale,
  slug,
  name,
  description,
  seo_title,
  seo_description,
  status
)
values
  ('20000000-0000-4000-8000-000000000001', 'ka', 'synthetic-collection', 'სატესტო კოლექცია', 'მხოლოდ ლოკალური ტესტირების სინთეზური კოლექცია.', 'სატესტო კოლექცია', 'სინთეზური ლოკალური მონაცემები.', 'published'),
  ('20000000-0000-4000-8000-000000000001', 'en', 'synthetic-collection', 'Synthetic Collection', 'Synthetic collection for local testing only.', 'Synthetic Collection', 'Synthetic local-only data.', 'published'),
  ('20000000-0000-4000-8000-000000000001', 'de', 'synthetic-collection', 'Synthetische Kollektion', 'Synthetische Kollektion nur für lokale Tests.', 'Synthetische Kollektion', 'Synthetische lokale Daten.', 'published'),
  ('20000000-0000-4000-8000-000000000001', 'ru', 'synthetic-collection', 'Синтетическая коллекция', 'Синтетическая коллекция только для локальных тестов.', 'Синтетическая коллекция', 'Синтетические локальные данные.', 'published');

insert into public.products (
  id,
  sku,
  status,
  readiness_passed,
  published_at,
  width_mm,
  length_mm,
  entered_width,
  entered_length,
  entered_unit,
  shape,
  materials,
  construction,
  colors,
  styles,
  condition,
  care_code,
  delivery_class,
  origin,
  origin_verified,
  search_visible,
  structured_data_eligible
)
select
  extensions.gen_random_uuid(),
  'SYN-' || lpad(series::text, 5, '0'),
  'published',
  true,
  statement_timestamp() - make_interval(days => series % 365),
  1200 + (series % 8) * 100,
  1800 + (series % 10) * 100,
  120 + (series % 8) * 10,
  180 + (series % 10) * 10,
  'cm',
  case when series % 5 = 0 then 'runner' else 'rectangle' end,
  case when series % 3 = 0 then array['wool', 'silk'] else array['wool'] end,
  case when series % 2 = 0 then 'hand-knotted' else 'flatwoven' end,
  case when series % 4 = 0 then array['indigo', 'ivory'] else array['oxblood', 'stone'] end,
  case when series % 2 = 0 then array['geometric'] else array['traditional'] end,
  'synthetic-fixture',
  'professional-clean',
  case when series % 11 = 0 then 'manual-quote' else 'parcel' end,
  'Synthetic fixture',
  true,
  true,
  false
from generate_series(1, 5000) as series;

insert into public.product_translations (
  product_id,
  locale,
  slug,
  name,
  short_description,
  long_description,
  care_text,
  search_text,
  seo_title,
  seo_description,
  alt_text_ready,
  status
)
select
  product.id,
  locale.value::public.app_locale,
  lower(product.sku::text),
  case locale.value
    when 'ka' then 'სინთეზური ხალიჩა ' || right(product.sku::text, 5)
    when 'de' then 'Synthetischer Teppich ' || right(product.sku::text, 5)
    when 'ru' then 'Синтетический ковёр ' || right(product.sku::text, 5)
    else 'Synthetic Rug ' || right(product.sku::text, 5)
  end,
  case locale.value
    when 'ka' then 'მხოლოდ ლოკალური ტესტირების ჩანაწერი.'
    when 'de' then 'Datensatz nur für lokale Tests.'
    when 'ru' then 'Запись только для локального тестирования.'
    else 'Local testing record only.'
  end,
  case locale.value
    when 'ka' then 'ეს არის სინთეზური მონაცემი და არ წარმოადგენს გასაყიდ პროდუქტს.'
    when 'de' then 'Dies sind synthetische Daten und kein tatsächlich angebotenes Produkt.'
    when 'ru' then 'Это синтетические данные, а не реальный товар в продаже.'
    else 'This is synthetic data and not a real product offered for sale.'
  end,
  case locale.value
    when 'ka' then 'პროფესიონალური წმენდა.'
    when 'de' then 'Professionell reinigen.'
    when 'ru' then 'Профессиональная чистка.'
    else 'Professional clean.'
  end,
  'synthetic wool rug carpet teppich ковёр ხალიჩა ' || product.sku::text,
  case locale.value
    when 'ka' then 'სინთეზური ხალიჩა ' || right(product.sku::text, 5)
    when 'de' then 'Synthetischer Teppich ' || right(product.sku::text, 5)
    when 'ru' then 'Синтетический ковёр ' || right(product.sku::text, 5)
    else 'Synthetic Rug ' || right(product.sku::text, 5)
  end,
  'Synthetic local test record.',
  true,
  'published'
from public.products product
cross join (values ('ka'), ('en'), ('de'), ('ru')) as locale(value)
where product.sku::text like 'SYN-%';

insert into public.product_prices (product_id, currency, amount_minor, enabled)
select product.id, currency.value::public.currency_code,
  case currency.value
    when 'GEL' then 120000 + right(product.sku::text, 5)::integer * 10
    when 'USD' then 45000 + right(product.sku::text, 5)::integer * 4
    else 42000 + right(product.sku::text, 5)::integer * 4
  end,
  true
from public.products product
cross join (values ('GEL'), ('USD'), ('EUR')) as currency(value)
where product.sku::text like 'SYN-%';

insert into public.inventory_items (product_id, stock_model, on_hand_quantity, reserved_quantity, low_stock_threshold)
select
  product.id,
  case when right(product.sku::text, 5)::integer % 7 = 0 then 'stocked'::public.stock_model else 'unique'::public.stock_model end,
  case when right(product.sku::text, 5)::integer % 13 = 0 then 0 when right(product.sku::text, 5)::integer % 7 = 0 then 3 else 1 end,
  0,
  1
from public.products product
where product.sku::text like 'SYN-%';

insert into public.collection_products (collection_id, product_id, position, featured)
select
  '20000000-0000-4000-8000-000000000001',
  product.id,
  right(product.sku::text, 5)::integer,
  right(product.sku::text, 5)::integer <= 8
from public.products product
where product.sku::text like 'SYN-%';

insert into public.tags (id, code, tag_type, filter_visible)
values
  ('30000000-0000-4000-8000-000000000001', 'synthetic-wool', 'material', true),
  ('30000000-0000-4000-8000-000000000002', 'synthetic-indigo', 'color', true);

insert into public.tag_translations (tag_id, locale, slug, label)
select tag.id, locale.value::public.app_locale, tag.code, tag.code
from public.tags tag
cross join (values ('ka'), ('en'), ('de'), ('ru')) as locale(value);

insert into public.product_tags (product_id, tag_id)
select product.id, '30000000-0000-4000-8000-000000000001'
from public.products product
where product.sku::text like 'SYN-%';

insert into public.media_assets (
  id,
  purpose,
  original_path,
  checksum_sha256,
  actual_mime,
  byte_size,
  pixel_width,
  pixel_height,
  approval_status
)
values (
  '40000000-0000-4000-8000-000000000001',
  'product',
  'synthetic/pending-master.tiff',
  repeat('a', 64),
  'image/tiff',
  1024,
  1200,
  1600,
  'pending'
);

insert into public.media_licenses (
  asset_id,
  ownership_basis,
  creator_source,
  status
)
values (
  '40000000-0000-4000-8000-000000000001',
  'owned',
  'Synthetic local fixture',
  'pending'
);
