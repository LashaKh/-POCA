alter table public.consent_records
  drop constraint consent_records_purpose_check;
alter table public.consent_records
  add constraint consent_records_purpose_check
  check (purpose in ('analytics', 'preferences', 'newsletter', 'marketing'));
alter table public.consent_records
  add column preference_metadata jsonb not null default '{}'::jsonb,
  add column withdrawal_effective_at timestamptz,
  add column correlation_id uuid not null default extensions.gen_random_uuid();

-- Preserve compatibility with consent history created before withdrawal timestamps
-- became explicit evidence.
update public.consent_records
set withdrawal_effective_at = recorded_at
where choice = 'withdrawn';

alter table public.consent_records
  add constraint consent_preference_metadata_object
    check (jsonb_typeof(preference_metadata) = 'object'),
  add constraint consent_withdrawal_consistent
    check ((choice = 'withdrawn') = (withdrawal_effective_at is not null));

create index consent_guest_current_idx
  on public.consent_records (guest_subject_hash, purpose, recorded_at desc)
  where guest_subject_hash is not null;

create table public.disclosure_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  purpose text not null check (purpose in ('contact', 'newsletter', 'analytics', 'preferences')),
  version_key text not null check (version_key ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  copy_i18n jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  published_at timestamptz,
  retired_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  unique (purpose, version_key),
  constraint disclosure_copy_object check (jsonb_typeof(copy_i18n) = 'object'),
  constraint disclosure_status_dates check (
    (status = 'draft' and published_at is null and retired_at is null)
    or (status = 'published' and published_at is not null and retired_at is null)
    or (status = 'retired' and published_at is not null and retired_at is not null)
  )
);

create unique index disclosure_one_published_purpose_idx
  on public.disclosure_versions (purpose)
  where status = 'published';

create table public.content_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  entry_key text not null unique check (entry_key ~ '^[a-z][a-z0-9-]{1,79}$'),
  content_type text not null check (
    content_type in ('homepage', 'journal', 'about', 'faq', 'delivery', 'returns', 'privacy', 'cookie', 'terms')
  ),
  status text not null default 'draft' check (
    status in ('draft', 'scheduled', 'published', 'unpublished', 'archived')
  ),
  fallback_policy text not null default 'disclose' check (fallback_policy in ('disclose', 'strict')),
  legal_status text not null default 'not_applicable' check (
    legal_status in ('not_applicable', 'draft_unapproved', 'approved')
  ),
  publish_at timestamptz,
  unpublish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint content_schedule_order check (
    unpublish_at is null or publish_at is null or unpublish_at > publish_at
  ),
  constraint content_archive_consistent check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create index content_entries_publication_idx
  on public.content_entries (status, publish_at, unpublish_at);

create table public.content_translations (
  id uuid primary key default extensions.gen_random_uuid(),
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  locale public.app_locale not null,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  title text not null check (char_length(title) between 1 and 180),
  summary text check (summary is null or char_length(summary) <= 500),
  blocks jsonb not null default '[]'::jsonb,
  meta_title text check (meta_title is null or char_length(meta_title) <= 180),
  meta_description text check (meta_description is null or char_length(meta_description) <= 320),
  social_image_url text check (social_image_url is null or char_length(social_image_url) <= 1000),
  review_status text not null default 'draft' check (review_status in ('draft', 'reviewed', 'approved')),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (content_entry_id, locale),
  unique (locale, slug),
  constraint content_blocks_array check (jsonb_typeof(blocks) = 'array')
);

create table public.content_revisions (
  id bigint generated always as identity primary key,
  content_entry_id uuid not null references public.content_entries(id) on delete restrict,
  version bigint not null,
  operation text not null check (
    operation in ('create', 'update', 'schedule', 'publish', 'unpublish', 'archive', 'restore')
  ),
  snapshot jsonb not null,
  reason text not null check (char_length(reason) between 2 and 500),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (content_entry_id, version),
  constraint content_revision_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create table public.content_preview_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint preview_expiry check (expires_at > created_at)
);

create table public.content_menus (
  id uuid primary key default extensions.gen_random_uuid(),
  menu_key text not null unique check (menu_key in ('header', 'footer')),
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1
);

create table public.content_menu_items (
  id uuid primary key default extensions.gen_random_uuid(),
  menu_id uuid not null references public.content_menus(id) on delete cascade,
  item_key text not null check (item_key ~ '^[a-z][a-z0-9-]{1,79}$'),
  destination_path text not null check (
    destination_path like '/%' and destination_path not like '//%' and char_length(destination_path) <= 500
  ),
  labels_i18n jsonb not null,
  position integer not null check (position between 0 and 10000),
  enabled boolean not null default true,
  visible_from timestamptz not null default '-infinity',
  visible_until timestamptz not null default 'infinity',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (menu_id, item_key),
  constraint menu_item_labels_object check (jsonb_typeof(labels_i18n) = 'object'),
  constraint menu_item_window check (visible_until > visible_from)
);

create table public.content_menu_revisions (
  id bigint generated always as identity primary key,
  menu_id uuid not null references public.content_menus(id) on delete restrict,
  version bigint not null,
  snapshot jsonb not null,
  reason text not null check (char_length(reason) between 2 and 500),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (menu_id, version),
  constraint menu_revision_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create table public.content_redirects (
  id uuid primary key default extensions.gen_random_uuid(),
  source_path text not null unique check (
    source_path like '/%' and source_path not like '//%' and char_length(source_path) <= 500
  ),
  destination_path text not null check (
    destination_path like '/%' and destination_path not like '//%' and char_length(destination_path) <= 500
  ),
  http_status integer not null default 308 check (http_status in (301, 302, 307, 308)),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'disabled')),
  active_from timestamptz not null default statement_timestamp(),
  active_until timestamptz not null default 'infinity',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint content_redirect_not_self check (source_path <> destination_path),
  constraint content_redirect_window check (active_until > active_from)
);

create index content_redirects_active_idx
  on public.content_redirects (source_path, status, active_from, active_until);

create table public.contact_channels (
  id uuid primary key default extensions.gen_random_uuid(),
  channel_key text not null unique check (channel_key ~ '^[a-z][a-z0-9-]{1,79}$'),
  channel_type text not null check (channel_type in ('email', 'phone', 'messaging')),
  public_value text not null check (char_length(public_value) between 3 and 320),
  labels_i18n jsonb not null,
  enabled boolean not null default false,
  verified_at timestamptz,
  configuration_status text not null default 'draft' check (
    configuration_status in ('draft', 'published', 'disabled')
  ),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint contact_channel_labels_object check (jsonb_typeof(labels_i18n) = 'object'),
  constraint contact_channel_publish_verified check (
    not (enabled and configuration_status = 'published') or verified_at is not null
  )
);

create table public.contact_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default (
    'MSG-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  profile_id uuid references public.profiles(id) on delete set null,
  guest_subject_hash text not null check (guest_subject_hash ~ '^[a-f0-9]{64}$'),
  guest_proof_hash text check (guest_proof_hash is null or guest_proof_hash ~ '^[a-f0-9]{64}$'),
  locale public.app_locale not null,
  channel_key text references public.contact_channels(channel_key) on delete restrict,
  contact_email extensions.citext not null check (char_length(contact_email::text) between 3 and 254),
  full_name text not null check (char_length(full_name) between 1 and 160),
  subject text not null check (char_length(subject) between 2 and 180),
  message text not null check (char_length(message) between 2 and 5000),
  message_fingerprint text not null check (message_fingerprint ~ '^[a-f0-9]{64}$'),
  order_reference text check (order_reference is null or char_length(order_reference) <= 40),
  disclosure_version text not null check (char_length(disclosure_version) between 2 and 80),
  status text not null default 'received' check (
    status in ('received', 'in_review', 'responded', 'closed', 'spam')
  ),
  notification_state text not null default 'pending' check (
    notification_state in ('pending', 'sent', 'failed')
  ),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  correlation_id uuid not null default extensions.gen_random_uuid(),
  retention_due_at timestamptz not null default (statement_timestamp() + interval '180 days'),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  unique (guest_subject_hash, idempotency_key_hash)
);

create index contact_submissions_queue_idx
  on public.contact_submissions (status, created_at desc);
create index contact_submissions_retention_idx
  on public.contact_submissions (retention_due_at)
  where status in ('closed', 'spam');
create index contact_submissions_duplicate_idx
  on public.contact_submissions (guest_subject_hash, message_fingerprint, created_at desc);

create table public.contact_submission_events (
  id bigint generated always as identity primary key,
  contact_submission_id uuid not null references public.contact_submissions(id) on delete cascade,
  event_type text not null check (
    event_type in ('received', 'in_review', 'responded', 'closed', 'spam', 'notification_failed')
  ),
  from_status text,
  to_status text,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  safe_note text check (safe_note is null or char_length(safe_note) <= 1000),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  correlation_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (contact_submission_id, idempotency_key_hash)
);

create table public.newsletter_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default (
    'NEWS-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 12))
  ),
  email extensions.citext not null unique check (char_length(email::text) between 3 and 254),
  profile_id uuid references public.profiles(id) on delete set null,
  guest_subject_hash text not null check (guest_subject_hash ~ '^[a-f0-9]{64}$'),
  locale public.app_locale not null,
  status text not null default 'subscribed' check (status in ('subscribed', 'withdrawn')),
  disclosure_version text not null check (char_length(disclosure_version) between 2 and 80),
  manage_proof_hash text not null check (manage_proof_hash ~ '^[a-f0-9]{64}$'),
  consent_record_id uuid not null references public.consent_records(id) on delete restrict,
  subscribed_at timestamptz not null default statement_timestamp(),
  withdrawn_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  version public.safe_version not null default 1,
  constraint newsletter_withdrawal_consistent check (
    (status = 'subscribed' and withdrawn_at is null)
    or (status = 'withdrawn' and withdrawn_at is not null)
  )
);

create trigger content_entries_set_updated_at
before update on public.content_entries
for each row execute function app_private.set_updated_at();
create trigger content_translations_set_updated_at
before update on public.content_translations
for each row execute function app_private.set_updated_at();
create trigger content_menus_set_updated_at
before update on public.content_menus
for each row execute function app_private.set_updated_at();
create trigger content_menu_items_set_updated_at
before update on public.content_menu_items
for each row execute function app_private.set_updated_at();
create trigger content_redirects_set_updated_at
before update on public.content_redirects
for each row execute function app_private.set_updated_at();
create trigger contact_channels_set_updated_at
before update on public.contact_channels
for each row execute function app_private.set_updated_at();
create trigger contact_submissions_set_updated_at
before update on public.contact_submissions
for each row execute function app_private.set_updated_at();
create trigger newsletter_subscriptions_set_updated_at
before update on public.newsletter_subscriptions
for each row execute function app_private.set_updated_at();

insert into public.disclosure_versions (
  purpose, version_key, copy_i18n, status, published_at
) values
  (
    'contact', 'contact-v1',
    '{"ka":"თქვენი შეტყობინება ინახება პასუხისა და უსაფრთხო ოპერირებისათვის.","en":"Your message is stored so the team can respond and operate support safely.","de":"Ihre Nachricht wird gespeichert, damit das Team antworten und den Support sicher betreiben kann.","ru":"Ваше сообщение хранится, чтобы команда могла ответить и безопасно вести поддержку."}',
    'published', statement_timestamp()
  ),
  (
    'newsletter', 'newsletter-v1',
    '{"ka":"ელფოსტის განახლებებზე გამოწერა ნებაყოფლობითია და ნებისმიერ დროს გასაუქმებელი.","en":"Email updates are optional and can be withdrawn at any time.","de":"E-Mail-Updates sind freiwillig und können jederzeit abbestellt werden.","ru":"Рассылка по электронной почте добровольна, и от неё можно отказаться в любое время."}',
    'published', statement_timestamp()
  ),
  (
    'analytics', 'analytics-v1',
    '{"ka":"არჩევითი ანალიტიკა გვეხმარება გამოყენების გაგებაში და არ არის საჭირო შესყიდვისთვის.","en":"Optional analytics helps us understand use and is never required to shop.","de":"Optionale Analysen helfen uns, die Nutzung zu verstehen, und sind niemals zum Einkaufen erforderlich.","ru":"Необязательная аналитика помогает понять использование и никогда не требуется для покупок."}',
    'published', statement_timestamp()
  ),
  (
    'preferences', 'preferences-v1',
    '{"ka":"არჩევითი პარამეტრები ინახავს თქვენს საიტის არჩევანს.","en":"Optional preferences remember your site choices.","de":"Optionale Einstellungen speichern Ihre Seitenauswahl.","ru":"Необязательные настройки запоминают ваш выбор на сайте."}',
    'published', statement_timestamp()
  );

insert into public.content_menus (menu_key) values ('header'), ('footer');

comment on table public.content_entries is
  'Versioned editorial/service content state. Legal approval is independent from operational publication state.';
comment on table public.contact_submissions is
  'Private duplicate-safe support record. Public status requires account ownership or an existence-safe guest proof.';
comment on table public.consent_records is
  'Append-only purpose-specific choices. Essential commerce is never represented as optional consent.';
