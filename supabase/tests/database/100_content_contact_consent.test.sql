begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

select ok(to_regclass('public.content_entries') is not null, 'content entries exist');
select ok(to_regclass('public.content_revisions') is not null, 'immutable content revisions exist');
select ok(to_regclass('public.content_menus') is not null, 'managed navigation exists');
select ok(to_regclass('public.content_redirects') is not null, 'managed redirects exist');
select ok(to_regclass('public.contact_submissions') is not null, 'private contact submissions exist');
select ok(to_regclass('public.newsletter_subscriptions') is not null, 'newsletter subscriptions exist');
select ok(to_regclass('public.disclosure_versions') is not null, 'versioned disclosures exist');
select ok(to_regclass('public.published_content_projection') is not null, 'public content projection exists');
select has_function('public', 'save_content_entry', array[
  'uuid', 'text', 'text', 'text', 'text', 'jsonb', 'bigint', 'text'
], 'content save command exists');
select has_function('public', 'submit_contact_message', array[
  'text', 'text', 'app_locale', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text'
], 'contact submission command exists');
select has_function('public', 'record_visitor_consent', array[
  'text', 'app_locale', 'jsonb', 'jsonb', 'jsonb', 'text'
], 'visitor consent command exists');
select ok((select relforcerowsecurity from pg_class where oid = 'public.contact_submissions'::regclass), 'contact RLS is forced');
select ok(not has_table_privilege('anon', 'public.contact_submissions', 'select'), 'anonymous users cannot enumerate support records');
select ok(not has_table_privilege('authenticated', 'public.content_entries', 'update'), 'staff cannot bypass versioned content commands');
select ok(has_table_privilege('service_role', 'public.published_content_projection', 'select'), 'trusted renderer can read published content');
select is((select count(*) from public.disclosure_versions where status = 'published'), 4::bigint, 'all optional purposes have one published disclosure');

insert into auth.users (id, email) values
  ('96000000-0000-4000-8000-000000000091', 'content-manager@epoca.test');
insert into public.profiles (id, profile_kind, display_name) values
  ('96000000-0000-4000-8000-000000000091', 'staff', 'Content Manager');
insert into public.staff_members (profile_id, role, active, mfa_required, activated_at)
values ('96000000-0000-4000-8000-000000000091', 'manager', true, false, statement_timestamp());

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);

select is(
  (public.save_content_entry(
    null, 'about-epoca', 'about', 'disclose', 'not_applicable',
    '[{"locale":"en","slug":"about","title":"About ÉPOCA","summary":"Our collection","blocks":[{"type":"paragraph","text":"A verified editorial fixture."}],"reviewStatus":"approved"}]',
    0, 'Create the About page'
  )).status,
  'draft',
  'manager creates a draft with a reviewed translation'
);
select is(
  (select count(*) from public.content_revisions where content_entry_id = (
    select id from public.content_entries where entry_key = 'about-epoca'
  )),
  1::bigint,
  'content creation stores its first snapshot'
);
select is(
  (public.transition_content_entry(
    (select id from public.content_entries where entry_key = 'about-epoca'),
    'published', null, null, 1, 'Publish the reviewed About page'
  )).status,
  'published',
  'reviewed content can be published'
);
select throws_ok(
  $$select public.transition_content_entry(
    (select id from public.content_entries where entry_key = 'about-epoca'),
    'unpublished', null, null, 1, 'Stale transition'
  )$$,
  '40001',
  'CONTENT_VERSION_CONFLICT',
  'stale editorial changes are rejected'
);
select is(
  public.read_published_content('about-epoca', 'ru') -> 'translation' ->> 'title',
  'About ÉPOCA',
  'a missing Russian translation uses the approved English fallback'
);
select is(
  (public.read_published_content('about-epoca', 'ru')) ->> 'fallbackDisclosed',
  'true',
  'fallback use is explicitly disclosed'
);

select is(
  (public.save_content_entry(
    null, 'strict-faq', 'faq', 'strict', 'not_applicable',
    '[{"locale":"en","slug":"strict-faq","title":"Strict FAQ","blocks":[],"reviewStatus":"approved"}]',
    0, 'Create strict FAQ fixture'
  )).fallback_policy,
  'strict',
  'strict fallback policy can be selected'
);
select throws_ok(
  $$select public.transition_content_entry(
    (select id from public.content_entries where entry_key = 'strict-faq'),
    'published', null, null, 1, 'Try incomplete strict publication'
  )$$,
  '55000',
  'STRICT_CONTENT_REQUIRES_ALL_LOCALES',
  'strict content cannot publish with missing locales'
);

select is(
  (public.publish_content_menu(
    'header',
    '[{"itemKey":"catalog","destinationPath":"/en/catalog","labels":{"ka":"კატალოგი","en":"Catalog","de":"Katalog","ru":"Каталог"},"position":10,"enabled":true}]',
    'published',
    (select version from public.content_menus where menu_key = 'header'),
    'Publish the primary navigation'
  )).status,
  'published',
  'four-language navigation publishes atomically'
);
select is((
  select count(*) from public.content_menu_revisions
  where reason = 'Publish the primary navigation'
), 1::bigint, 'menu publication creates a snapshot');

select is(
  (public.configure_content_redirect(
    null, '/old-about', '/en/about', 308, 'published',
    statement_timestamp() - interval '1 minute', 'infinity', 0, 'Preserve the old About URL'
  )).source_path,
  '/old-about',
  'manager configures a bounded redirect'
);
select throws_ok(
  $$select public.configure_content_redirect(
    null, '/en/about', '/old-about', 308, 'published',
    statement_timestamp() - interval '1 minute', 'infinity', 0, 'Create a loop'
  )$$,
  '22023',
  'CONTENT_REDIRECT_LOOP',
  'redirect cycles are rejected before publication'
);

select throws_ok(
  $$select public.configure_contact_channel(
    null, 'support-phone', 'phone', '+995555000000',
    '{"ka":"ტელეფონი","en":"Phone","de":"Telefon","ru":"Телефон"}',
    true, false, 'published', 0, 'Publish unverified phone'
  )$$,
  '22023',
  'INVALID_CONTACT_CHANNEL',
  'unverified phone details cannot become public'
);
select is(
  (public.configure_contact_channel(
    null, 'support-email', 'email', 'support@epoca.test',
    '{"ka":"ელფოსტა","en":"Email","de":"E-Mail","ru":"Почта"}',
    true, true, 'published', 0, 'Publish verified support email'
  )).configuration_status,
  'published',
  'verified support email can become public'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);

select matches(
  (public.submit_contact_message(
    repeat('a', 64), repeat('b', 64), 'de', 'buyer@epoca.test', 'Rug Buyer',
    'Delivery question', 'Can you deliver this rug?', repeat('c', 64), null,
    'contact-v1', repeat('d', 64)
  )).reference,
  '^MSG-[A-Z0-9]{12}$',
  'valid contact message returns a stable reference'
);
select is(
  (public.submit_contact_message(
    repeat('a', 64), repeat('b', 64), 'de', 'buyer@epoca.test', 'Rug Buyer',
    'Delivery question', 'Can you deliver this rug?', repeat('c', 64), null,
    'contact-v1', repeat('d', 64)
  )).id,
  (select id from public.contact_submissions where idempotency_key_hash = repeat('d', 64)),
  'contact replay returns the original record'
);
select is(
  (public.submit_contact_message(
    repeat('a', 64), repeat('b', 64), 'de', 'buyer@epoca.test', 'Rug Buyer',
    'Delivery question', 'Can you deliver this rug?', repeat('c', 64), null,
    'contact-v1', repeat('e', 64)
  )).id,
  (select id from public.contact_submissions where idempotency_key_hash = repeat('d', 64)),
  'same message fingerprint is deduplicated even with a new request key'
);
select is((select count(*) from public.contact_submissions), 1::bigint, 'contact deduplication stores one private message');
select is(
  (select count(*) from public.notifications
   where purpose like 'contact-%'
     and payload ->> 'contactReference' = (
       select reference from public.contact_submissions
       where idempotency_key_hash = repeat('d', 64)
     )),
  2::bigint,
  'buyer and staff contact notifications are queued'
);
select is(
  public.read_contact_message_status(
    (select reference from public.contact_submissions limit 1), repeat('b', 64)
  ) ->> 'status',
  'received',
  'valid guest proof reads the safe contact status'
);
select is(
  public.read_contact_message_status(
    (select reference from public.contact_submissions limit 1), repeat('0', 64)
  ),
  null::jsonb,
  'invalid contact proof does not reveal whether a message exists'
);

select is(
  public.record_visitor_consent(
    repeat('a', 64), 'en', '{"analytics":"refused","preferences":"granted"}',
    '{"analytics":"analytics-v1","preferences":"preferences-v1"}',
    '{"currency":"EUR"}', 'consent-banner'
  ) -> 'analytics' ->> 'choice',
  'refused',
  'analytics can be explicitly refused without blocking the site'
);
select is(
  public.read_visitor_consent(repeat('a', 64)) -> 'preferences' ->> 'choice',
  'granted',
  'preference consent is stored separately from analytics'
);
select is(
  public.record_visitor_consent(
    repeat('a', 64), 'en', '{"preferences":"withdrawn"}',
    '{"preferences":"preferences-v1"}', '{}', 'consent-settings'
  ) -> 'preferences' ->> 'choice',
  'withdrawn',
  'optional consent can be withdrawn later'
);
select isnt(
  (select withdrawal_effective_at from public.consent_records
   where guest_subject_hash = repeat('a', 64) and purpose = 'preferences'
   order by recorded_at desc limit 1),
  null::timestamptz,
  'withdrawal has an explicit effective timestamp'
);

select is(
  (public.subscribe_newsletter(
    'news@epoca.test', repeat('a', 64), repeat('f', 64), 'ru', 'newsletter-v1'
  )).status,
  'subscribed',
  'newsletter requires a versioned explicit opt-in'
);
select ok(
  public.withdraw_newsletter('news@epoca.test', repeat('f', 64), 'ru'),
  'newsletter withdrawal is existence-safe'
);
select is(
  (select status from public.newsletter_subscriptions where email = 'news@epoca.test'),
  'withdrawn',
  'newsletter subscription becomes withdrawn'
);
select is(
  (select choice from public.consent_records
   where purpose = 'newsletter' and guest_subject_hash = repeat('a', 64)
   order by recorded_at desc limit 1),
  'withdrawn'::public.consent_choice,
  'newsletter withdrawal appends regulatory consent evidence'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000091","role":"authenticated","aal":"aal1"}',
  true
);
select is(
  (public.transition_contact_message(
    (select id from public.contact_submissions limit 1), 1, 'in_review',
    'Assigned to the delivery team.', repeat('1', 64)
  )).status,
  'in_review',
  'manager can move a support record through its workflow'
);
select is((select count(*) from public.contact_submission_events), 2::bigint, 'contact workflow appends an event');

reset role;
update public.content_entries set publish_at = statement_timestamp() - interval '1 minute'
where entry_key = 'strict-faq';
update public.contact_submissions set status = 'closed', retention_due_at = statement_timestamp() - interval '1 minute'
where id = (select id from public.contact_submissions limit 1);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","aal":"aal2"}', true);
select is(
  public.run_content_contact_consent_maintenance(100) ->> 'contactRecordsDeleted',
  '1',
  'maintenance removes support records only after their retention deadline'
);
select is((select count(*) from public.contact_submissions), 0::bigint, 'retained contact fixture was cleaned with its events');

reset role;
set local role anon;
select is((select count(*) from public.published_content_projection where entry_key = 'about-epoca'), 1::bigint, 'anonymous storefront sees approved published content');
select is((select count(*) from public.published_contact_channels), 1::bigint, 'anonymous storefront sees only verified contact channels');

select * from finish();
rollback;
