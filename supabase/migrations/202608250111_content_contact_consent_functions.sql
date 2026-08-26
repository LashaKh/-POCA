create or replace function app_private.content_actor_class()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'service'
    else coalesce(
      (select staff.role::text from public.staff_members staff
       where staff.profile_id = auth.uid() and staff.active),
      (select case when profile.profile_kind = 'customer' then 'customer' else 'service' end
       from public.profiles profile where profile.id = auth.uid()),
      'service'
    )
  end;
$$;

create or replace function app_private.content_snapshot(p_content_entry_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(entry) || jsonb_build_object(
    'translations', coalesce((
      select jsonb_agg(to_jsonb(translation) order by translation.locale)
      from public.content_translations translation
      where translation.content_entry_id = entry.id
    ), '[]'::jsonb)
  )
  from public.content_entries entry
  where entry.id = p_content_entry_id;
$$;

create or replace function app_private.record_content_revision(
  p_content_entry_id uuid,
  p_operation text,
  p_reason text,
  p_correlation_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_record public.content_entries;
  revision_id bigint;
begin
  perform app_private.assert_manager();
  if p_operation not in ('create', 'update', 'schedule', 'publish', 'unpublish', 'archive', 'restore')
    or char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then
    raise exception 'INVALID_CONTENT_REVISION' using errcode = '22023';
  end if;
  select * into entry_record from public.content_entries where id = p_content_entry_id;
  if not found then raise exception 'CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;
  insert into public.content_revisions (
    content_entry_id, version, operation, snapshot, reason,
    actor_profile_id, correlation_id
  ) values (
    entry_record.id, entry_record.version, p_operation,
    app_private.content_snapshot(entry_record.id), btrim(p_reason), auth.uid(), p_correlation_id
  ) returning id into revision_id;
  return revision_id;
end;
$$;

create or replace function public.save_content_entry(
  p_content_entry_id uuid default null,
  p_entry_key text default null,
  p_content_type text default null,
  p_fallback_policy text default null,
  p_legal_status text default null,
  p_translations jsonb default null,
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.content_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.content_entries;
  next_record public.content_entries;
  translation jsonb;
  translation_count integer;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_entry_key !~ '^[a-z][a-z0-9-]{1,79}$'
    or p_content_type not in ('homepage', 'journal', 'about', 'faq', 'delivery', 'returns', 'privacy', 'cookie', 'terms')
    or p_fallback_policy not in ('disclose', 'strict')
    or p_legal_status not in ('not_applicable', 'draft_unapproved', 'approved')
    or jsonb_typeof(p_translations) <> 'array'
    or jsonb_array_length(p_translations) not between 1 and 4
    or char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then
    raise exception 'INVALID_CONTENT_ENTRY' using errcode = '22023';
  end if;

  select count(distinct item ->> 'locale') into translation_count
  from jsonb_array_elements(p_translations) item
  where item ->> 'locale' in ('ka', 'en', 'de', 'ru');
  if translation_count <> jsonb_array_length(p_translations) then
    raise exception 'INVALID_CONTENT_TRANSLATIONS' using errcode = '22023';
  end if;

  if p_content_entry_id is null then
    if p_expected_version <> 0 then
      raise exception 'CONTENT_VERSION_CONFLICT' using errcode = '40001';
    end if;
    insert into public.content_entries (
      entry_key, content_type, fallback_policy, legal_status, created_by, updated_by
    ) values (
      p_entry_key, p_content_type, p_fallback_policy, p_legal_status, auth.uid(), auth.uid()
    ) returning * into next_record;
  else
    select * into current_record from public.content_entries
    where id = p_content_entry_id for update;
    if not found then raise exception 'CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;
    if current_record.version <> p_expected_version then
      raise exception 'CONTENT_VERSION_CONFLICT' using errcode = '40001';
    end if;
    update public.content_entries set
      entry_key = p_entry_key,
      content_type = p_content_type,
      fallback_policy = p_fallback_policy,
      legal_status = p_legal_status,
      updated_by = auth.uid(),
      version = version + 1
    where id = p_content_entry_id returning * into next_record;
  end if;

  for translation in select value from jsonb_array_elements(p_translations)
  loop
    if coalesce(translation ->> 'slug', '') !~ '^[a-z0-9][a-z0-9-]{0,119}$'
      or char_length(btrim(coalesce(translation ->> 'title', ''))) not between 1 and 180
      or jsonb_typeof(coalesce(translation -> 'blocks', '[]'::jsonb)) <> 'array'
      or coalesce(translation ->> 'reviewStatus', 'draft') not in ('draft', 'reviewed', 'approved') then
      raise exception 'INVALID_CONTENT_TRANSLATION' using errcode = '22023';
    end if;
    insert into public.content_translations (
      content_entry_id, locale, slug, title, summary, blocks,
      meta_title, meta_description, social_image_url, review_status
    ) values (
      next_record.id, (translation ->> 'locale')::public.app_locale,
      translation ->> 'slug', btrim(translation ->> 'title'),
      nullif(btrim(translation ->> 'summary'), ''),
      coalesce(translation -> 'blocks', '[]'::jsonb),
      nullif(btrim(translation ->> 'metaTitle'), ''),
      nullif(btrim(translation ->> 'metaDescription'), ''),
      nullif(btrim(translation ->> 'socialImageUrl'), ''),
      coalesce(translation ->> 'reviewStatus', 'draft')
    ) on conflict (content_entry_id, locale) do update set
      slug = excluded.slug,
      title = excluded.title,
      summary = excluded.summary,
      blocks = excluded.blocks,
      meta_title = excluded.meta_title,
      meta_description = excluded.meta_description,
      social_image_url = excluded.social_image_url,
      review_status = excluded.review_status,
      version = public.content_translations.version + 1;
  end loop;

  perform app_private.record_content_revision(
    next_record.id, case when p_content_entry_id is null then 'create' else 'update' end,
    p_reason, correlation
  );
  perform app_private.write_audit_event(
    app_private.content_actor_class(), 'content.entry.save', 'content_entry',
    next_record.id::text, 'succeeded', 'content', correlation,
    jsonb_build_object('entryKey', next_record.entry_key, 'version', next_record.version)
  );
  return next_record;
end;
$$;

create or replace function public.transition_content_entry(
  p_content_entry_id uuid,
  p_target_status text,
  p_publish_at timestamptz default null,
  p_unpublish_at timestamptz default null,
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.content_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.content_entries;
  next_record public.content_entries;
  operation text;
  approved_locale_count integer;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_target_status not in ('draft', 'scheduled', 'published', 'unpublished', 'archived', 'restore')
    or char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500
    or (p_unpublish_at is not null and p_publish_at is not null and p_unpublish_at <= p_publish_at) then
    raise exception 'INVALID_CONTENT_TRANSITION' using errcode = '22023';
  end if;
  select * into current_record from public.content_entries
  where id = p_content_entry_id for update;
  if not found then raise exception 'CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if current_record.version <> p_expected_version then
    raise exception 'CONTENT_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if p_target_status = 'restore' and current_record.status <> 'archived' then
    raise exception 'CONTENT_NOT_ARCHIVED' using errcode = '55000';
  end if;
  if p_target_status = 'scheduled' and (p_publish_at is null or p_publish_at <= statement_timestamp()) then
    raise exception 'CONTENT_SCHEDULE_MUST_BE_FUTURE' using errcode = '22023';
  end if;
  if p_target_status in ('scheduled', 'published') then
    select count(*) into approved_locale_count
    from public.content_translations translation
    where translation.content_entry_id = current_record.id
      and translation.review_status = 'approved';
    if approved_locale_count = 0 then
      raise exception 'CONTENT_REQUIRES_APPROVED_TRANSLATION' using errcode = '55000';
    end if;
    if current_record.fallback_policy = 'strict' and approved_locale_count <> 4 then
      raise exception 'STRICT_CONTENT_REQUIRES_ALL_LOCALES' using errcode = '55000';
    end if;
  end if;

  operation := case p_target_status
    when 'scheduled' then 'schedule'
    when 'published' then 'publish'
    when 'unpublished' then 'unpublish'
    when 'archived' then 'archive'
    when 'restore' then 'restore'
    else 'update'
  end;
  update public.content_entries set
    status = case when p_target_status = 'restore' then 'draft' else p_target_status end,
    publish_at = case
      when p_target_status = 'published' then coalesce(p_publish_at, statement_timestamp())
      when p_target_status = 'scheduled' then p_publish_at
      else publish_at
    end,
    unpublish_at = case when p_target_status in ('published', 'scheduled') then p_unpublish_at else unpublish_at end,
    published_at = case when p_target_status = 'published' then statement_timestamp() else published_at end,
    archived_at = case when p_target_status = 'archived' then statement_timestamp() else null end,
    updated_by = auth.uid(),
    version = version + 1
  where id = current_record.id returning * into next_record;
  perform app_private.record_content_revision(next_record.id, operation, p_reason, correlation);
  perform app_private.write_audit_event(
    app_private.content_actor_class(), 'content.entry.transition', 'content_entry',
    next_record.id::text, 'succeeded', 'content', correlation,
    jsonb_build_object('status', next_record.status, 'version', next_record.version)
  );
  return next_record;
end;
$$;

create or replace function public.create_content_preview_token(
  p_content_entry_id uuid,
  p_token_hash text,
  p_ttl_minutes integer default 30
)
returns public.content_preview_tokens
language plpgsql
security definer
set search_path = ''
as $$
declare
  token_record public.content_preview_tokens;
begin
  perform app_private.assert_manager();
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_ttl_minutes not between 5 and 1440 then
    raise exception 'INVALID_PREVIEW_TOKEN' using errcode = '22023';
  end if;
  insert into public.content_preview_tokens (
    content_entry_id, token_hash, created_by, expires_at
  ) values (
    p_content_entry_id, p_token_hash, auth.uid(),
    statement_timestamp() + make_interval(mins => p_ttl_minutes)
  ) returning * into token_record;
  return token_record;
end;
$$;

create or replace function public.read_content_preview(
  p_token_hash text,
  p_locale public.app_locale
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  content_id uuid;
  result jsonb;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  select token.content_entry_id into content_id
  from public.content_preview_tokens token
  where token.token_hash = p_token_hash and token.revoked_at is null
    and token.expires_at > statement_timestamp();
  if content_id is null then return null; end if;
  select jsonb_build_object(
    'entry', to_jsonb(entry),
    'translation', to_jsonb(translation),
    'requestedLocale', p_locale,
    'resolvedLocale', translation.locale,
    'fallbackDisclosed', translation.locale <> p_locale
  ) into result
  from public.content_entries entry
  join lateral (
    select candidate.* from public.content_translations candidate
    where candidate.content_entry_id = entry.id
    order by case candidate.locale when p_locale then 0 when 'en' then 1 when 'ka' then 2 else 3 end
    limit 1
  ) translation on true
  where entry.id = content_id;
  return result;
end;
$$;

create or replace function public.read_published_content(
  p_entry_key text,
  p_locale public.app_locale
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'entryKey', entry.entry_key,
    'contentType', entry.content_type,
    'legalStatus', entry.legal_status,
    'translation', to_jsonb(translation),
    'requestedLocale', p_locale,
    'resolvedLocale', translation.locale,
    'fallbackDisclosed', translation.locale <> p_locale,
    'fallbackPolicy', entry.fallback_policy,
    'publishedAt', entry.published_at
  )
  from public.content_entries entry
  join lateral (
    select candidate.* from public.content_translations candidate
    where candidate.content_entry_id = entry.id and candidate.review_status = 'approved'
    order by case candidate.locale when p_locale then 0 when 'en' then 1 when 'ka' then 2 else 3 end
    limit 1
  ) translation on true
  where entry.entry_key = p_entry_key and entry.status = 'published'
    and coalesce(entry.publish_at, '-infinity') <= statement_timestamp()
    and coalesce(entry.unpublish_at, 'infinity') > statement_timestamp()
    and (entry.fallback_policy = 'disclose' or translation.locale = p_locale);
$$;

create or replace function app_private.content_menu_snapshot(p_menu_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(menu) || jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.position, item.item_key)
      from public.content_menu_items item where item.menu_id = menu.id
    ), '[]'::jsonb)
  )
  from public.content_menus menu where menu.id = p_menu_id;
$$;

create or replace function public.publish_content_menu(
  p_menu_key text,
  p_items jsonb,
  p_status text,
  p_expected_version bigint,
  p_reason text
)
returns public.content_menus
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.content_menus;
  next_record public.content_menus;
  menu_item jsonb;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_menu_key not in ('header', 'footer') or p_status not in ('draft', 'published', 'disabled')
    or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 30
    or char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then
    raise exception 'INVALID_CONTENT_MENU' using errcode = '22023';
  end if;
  select * into current_record from public.content_menus
  where menu_key = p_menu_key for update;
  if not found then raise exception 'CONTENT_MENU_NOT_FOUND' using errcode = 'P0002'; end if;
  if current_record.version <> p_expected_version then
    raise exception 'CONTENT_MENU_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if (select count(distinct item ->> 'itemKey') from jsonb_array_elements(p_items) item)
    <> jsonb_array_length(p_items) then
    raise exception 'DUPLICATE_CONTENT_MENU_ITEM' using errcode = '22023';
  end if;
  delete from public.content_menu_items where menu_id = current_record.id;
  for menu_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(menu_item ->> 'itemKey', '') !~ '^[a-z][a-z0-9-]{1,79}$'
      or coalesce(menu_item ->> 'destinationPath', '') not like '/%'
      or coalesce(menu_item ->> 'destinationPath', '') like '//%'
      or jsonb_typeof(menu_item -> 'labels') <> 'object'
      or not ((menu_item -> 'labels') ?& array['ka', 'en', 'de', 'ru'])
      or exists (
        select 1 from jsonb_each_text(menu_item -> 'labels') label
        where char_length(btrim(label.value)) not between 1 and 120
      )
      or coalesce((menu_item ->> 'position')::integer, -1) not between 0 and 10000 then
      raise exception 'INVALID_CONTENT_MENU_ITEM' using errcode = '22023';
    end if;
    insert into public.content_menu_items (
      menu_id, item_key, destination_path, labels_i18n, position,
      enabled, visible_from, visible_until
    ) values (
      current_record.id, menu_item ->> 'itemKey', menu_item ->> 'destinationPath',
      menu_item -> 'labels', (menu_item ->> 'position')::integer,
      coalesce((menu_item ->> 'enabled')::boolean, true),
      coalesce((menu_item ->> 'visibleFrom')::timestamptz, '-infinity'),
      coalesce((menu_item ->> 'visibleUntil')::timestamptz, 'infinity')
    );
  end loop;
  update public.content_menus set
    status = p_status,
    published_at = case when p_status = 'published' then statement_timestamp() else published_at end,
    updated_by = auth.uid(),
    version = version + 1
  where id = current_record.id returning * into next_record;
  insert into public.content_menu_revisions (
    menu_id, version, snapshot, reason, actor_profile_id, correlation_id
  ) values (
    next_record.id, next_record.version, app_private.content_menu_snapshot(next_record.id),
    btrim(p_reason), auth.uid(), correlation
  );
  perform app_private.write_audit_event(
    app_private.content_actor_class(), 'content.menu.publish', 'content_menu',
    next_record.id::text, 'succeeded', 'content', correlation,
    jsonb_build_object('menuKey', next_record.menu_key, 'status', next_record.status, 'version', next_record.version)
  );
  return next_record;
end;
$$;

create or replace function app_private.content_redirect_creates_loop(
  p_source_path text,
  p_destination_path text,
  p_excluded_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive route(current_path, visited, depth) as (
    select p_destination_path, array[p_destination_path], 0
    union all
    select redirect.destination_path, route.visited || redirect.destination_path, route.depth + 1
    from route
    join public.content_redirects redirect on redirect.source_path = route.current_path
      and redirect.id is distinct from p_excluded_id
      and redirect.status <> 'disabled'
    where route.depth < 32
      and (not redirect.destination_path = any(route.visited) or redirect.destination_path = p_source_path)
  )
  select p_source_path = p_destination_path
    or exists (select 1 from route where current_path = p_source_path)
    or exists (select 1 from route where depth = 32);
$$;

create or replace function public.configure_content_redirect(
  p_redirect_id uuid default null,
  p_source_path text default null,
  p_destination_path text default null,
  p_http_status integer default 308,
  p_status text default 'draft',
  p_active_from timestamptz default null,
  p_active_until timestamptz default 'infinity',
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.content_redirects
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.content_redirects;
  next_record public.content_redirects;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_source_path not like '/%' or p_source_path like '//%'
    or p_destination_path not like '/%' or p_destination_path like '//%'
    or p_http_status not in (301, 302, 307, 308)
    or p_status not in ('draft', 'scheduled', 'published', 'disabled')
    or p_active_until <= p_active_from
    or (p_status = 'scheduled' and p_active_from <= statement_timestamp())
    or char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then
    raise exception 'INVALID_CONTENT_REDIRECT' using errcode = '22023';
  end if;
  if app_private.content_redirect_creates_loop(p_source_path, p_destination_path, p_redirect_id) then
    raise exception 'CONTENT_REDIRECT_LOOP' using errcode = '22023';
  end if;
  if p_redirect_id is null then
    if p_expected_version <> 0 then
      raise exception 'CONTENT_REDIRECT_VERSION_CONFLICT' using errcode = '40001';
    end if;
    insert into public.content_redirects (
      source_path, destination_path, http_status, status, active_from, active_until, updated_by
    ) values (
      p_source_path, p_destination_path, p_http_status, p_status,
      p_active_from, p_active_until, auth.uid()
    ) returning * into next_record;
  else
    select * into current_record from public.content_redirects
    where id = p_redirect_id for update;
    if not found then raise exception 'CONTENT_REDIRECT_NOT_FOUND' using errcode = 'P0002'; end if;
    if current_record.version <> p_expected_version then
      raise exception 'CONTENT_REDIRECT_VERSION_CONFLICT' using errcode = '40001';
    end if;
    update public.content_redirects set
      source_path = p_source_path, destination_path = p_destination_path,
      http_status = p_http_status, status = p_status,
      active_from = p_active_from, active_until = p_active_until,
      updated_by = auth.uid(), version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  perform app_private.write_audit_event(
    app_private.content_actor_class(), 'content.redirect.configure', 'content_redirect',
    next_record.id::text, 'succeeded', 'content', correlation,
    jsonb_build_object('sourcePath', next_record.source_path, 'status', next_record.status, 'version', next_record.version)
  );
  return next_record;
end;
$$;

create or replace function public.configure_contact_channel(
  p_channel_id uuid default null,
  p_channel_key text default null,
  p_channel_type text default null,
  p_public_value text default null,
  p_labels_i18n jsonb default null,
  p_enabled boolean default false,
  p_verified boolean default false,
  p_configuration_status text default 'draft',
  p_expected_version bigint default 0,
  p_reason text default null
)
returns public.contact_channels
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.contact_channels;
  next_record public.contact_channels;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_channel_key !~ '^[a-z][a-z0-9-]{1,79}$'
    or p_channel_type not in ('email', 'phone', 'messaging')
    or char_length(btrim(coalesce(p_public_value, ''))) not between 3 and 320
    or jsonb_typeof(p_labels_i18n) <> 'object'
    or not (p_labels_i18n ?& array['ka', 'en', 'de', 'ru'])
    or p_configuration_status not in ('draft', 'published', 'disabled')
    or (p_enabled and p_configuration_status = 'published' and not p_verified)
    or char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then
    raise exception 'INVALID_CONTACT_CHANNEL' using errcode = '22023';
  end if;
  if p_channel_id is null then
    if p_expected_version <> 0 then raise exception 'CONTACT_CHANNEL_VERSION_CONFLICT' using errcode = '40001'; end if;
    insert into public.contact_channels (
      channel_key, channel_type, public_value, labels_i18n, enabled,
      verified_at, configuration_status, updated_by
    ) values (
      p_channel_key, p_channel_type, btrim(p_public_value), p_labels_i18n, p_enabled,
      case when p_verified then statement_timestamp() else null end,
      p_configuration_status, auth.uid()
    ) returning * into next_record;
  else
    select * into current_record from public.contact_channels where id = p_channel_id for update;
    if not found then raise exception 'CONTACT_CHANNEL_NOT_FOUND' using errcode = 'P0002'; end if;
    if current_record.version <> p_expected_version then raise exception 'CONTACT_CHANNEL_VERSION_CONFLICT' using errcode = '40001'; end if;
    update public.contact_channels set
      channel_key = p_channel_key, channel_type = p_channel_type,
      public_value = btrim(p_public_value), labels_i18n = p_labels_i18n,
      enabled = p_enabled,
      verified_at = case when p_verified then coalesce(verified_at, statement_timestamp()) else null end,
      configuration_status = p_configuration_status,
      updated_by = auth.uid(), version = version + 1
    where id = current_record.id returning * into next_record;
  end if;
  perform app_private.write_audit_event(
    app_private.content_actor_class(), 'content.contact-channel.configure', 'contact_channel',
    next_record.id::text, 'succeeded', 'content', correlation,
    jsonb_build_object('channelKey', next_record.channel_key, 'enabled', next_record.enabled, 'version', next_record.version)
  );
  return next_record;
end;
$$;

create or replace function app_private.enqueue_contact_notification(
  p_submission public.contact_submissions,
  p_recipient_email text,
  p_purpose text,
  p_template_key text,
  p_suffix text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_id uuid;
  target_key text := p_purpose || ':' || p_submission.id::text || ':' || p_suffix;
begin
  insert into public.notifications (
    purpose, locale, template_key, recipient_hash, payload,
    idempotency_key, correlation_id
  ) values (
    p_purpose, p_submission.locale, p_template_key,
    encode(extensions.digest(lower(btrim(p_recipient_email))::bytea, 'sha256'), 'hex'),
    jsonb_build_object(
      'recipientEmail', lower(btrim(p_recipient_email)),
      'contactReference', p_submission.reference,
      'contactStatus', p_submission.status
    ), target_key, p_submission.correlation_id
  ) on conflict (idempotency_key) do nothing returning id into notification_id;
  if notification_id is null then
    select id into notification_id from public.notifications where idempotency_key = target_key;
  end if;
  return notification_id;
end;
$$;

create or replace function public.submit_contact_message(
  p_guest_subject_hash text,
  p_guest_proof_hash text,
  p_locale public.app_locale,
  p_contact_email text,
  p_full_name text,
  p_subject text,
  p_message text,
  p_message_fingerprint text,
  p_order_reference text,
  p_disclosure_version text,
  p_idempotency_key_hash text
)
returns public.contact_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.contact_submissions;
  staff_email text;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_guest_subject_hash !~ '^[a-f0-9]{64}$'
    or p_guest_proof_hash !~ '^[a-f0-9]{64}$'
    or p_message_fingerprint !~ '^[a-f0-9]{64}$'
    or p_idempotency_key_hash !~ '^[a-f0-9]{64}$'
    or char_length(btrim(p_contact_email)) not between 3 and 254
    or p_contact_email not like '%@%'
    or char_length(btrim(p_full_name)) not between 1 and 160
    or char_length(btrim(p_subject)) not between 2 and 180
    or char_length(btrim(p_message)) not between 2 and 5000
    or char_length(btrim(p_disclosure_version)) not between 2 and 80
    or not exists (
      select 1 from public.disclosure_versions disclosure
      where disclosure.purpose = 'contact' and disclosure.version_key = p_disclosure_version
        and disclosure.status = 'published'
    ) then
    raise exception 'INVALID_CONTACT_MESSAGE' using errcode = '22023';
  end if;

  select * into submission from public.contact_submissions
  where guest_subject_hash = p_guest_subject_hash
    and idempotency_key_hash = p_idempotency_key_hash;
  if found then return submission; end if;
  select * into submission from public.contact_submissions
  where guest_subject_hash = p_guest_subject_hash
    and message_fingerprint = p_message_fingerprint
    and created_at > statement_timestamp() - interval '24 hours'
  order by created_at desc limit 1;
  if found then return submission; end if;
  if (select count(*) from public.contact_submissions
      where guest_subject_hash = p_guest_subject_hash
        and created_at > statement_timestamp() - interval '15 minutes') >= 5 then
    raise exception 'CONTACT_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.contact_submissions (
    guest_subject_hash, guest_proof_hash, locale, contact_email, full_name,
    subject, message, message_fingerprint, order_reference, disclosure_version,
    idempotency_key_hash
  ) values (
    p_guest_subject_hash, p_guest_proof_hash, p_locale, lower(btrim(p_contact_email)),
    btrim(p_full_name), btrim(p_subject), btrim(p_message), p_message_fingerprint,
    nullif(btrim(p_order_reference), ''), p_disclosure_version, p_idempotency_key_hash
  ) returning * into submission;
  insert into public.contact_submission_events (
    contact_submission_id, event_type, to_status, idempotency_key_hash, correlation_id
  ) values (
    submission.id, 'received', 'received', p_idempotency_key_hash, submission.correlation_id
  );
  perform app_private.enqueue_contact_notification(
    submission, submission.contact_email::text, 'contact-received',
    'contact-received', 'buyer'
  );
  select channel.public_value into staff_email
  from public.contact_channels channel
  where channel.channel_type = 'email' and channel.enabled
    and channel.configuration_status = 'published' and channel.verified_at is not null
  order by channel.updated_at desc limit 1;
  if staff_email is not null then
    perform app_private.enqueue_contact_notification(
      submission, staff_email, 'contact-staff-alert', 'contact-staff-alert', 'staff'
    );
  end if;
  return submission;
end;
$$;

create or replace function public.read_contact_message_status(
  p_reference text,
  p_guest_proof_hash text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reference', submission.reference,
    'status', submission.status,
    'createdAt', submission.created_at,
    'updatedAt', submission.updated_at
  )
  from public.contact_submissions submission
  where submission.reference = upper(btrim(p_reference))
    and submission.guest_proof_hash = p_guest_proof_hash
    and p_guest_proof_hash ~ '^[a-f0-9]{64}$';
$$;

create or replace function public.transition_contact_message(
  p_contact_submission_id uuid,
  p_expected_version bigint,
  p_target_status text,
  p_safe_note text,
  p_idempotency_key_hash text
)
returns public.contact_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_record public.contact_submissions;
  next_record public.contact_submissions;
begin
  perform app_private.assert_manager();
  if p_target_status not in ('in_review', 'responded', 'closed', 'spam')
    or char_length(btrim(coalesce(p_safe_note, ''))) not between 2 and 1000
    or p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_CONTACT_TRANSITION' using errcode = '22023';
  end if;
  select * into current_record from public.contact_submissions
  where id = p_contact_submission_id for update;
  if not found then raise exception 'CONTACT_MESSAGE_NOT_FOUND' using errcode = 'P0002'; end if;
  if current_record.version <> p_expected_version then
    raise exception 'CONTACT_MESSAGE_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if not (
    (current_record.status = 'received' and p_target_status in ('in_review', 'responded', 'closed', 'spam'))
    or (current_record.status = 'in_review' and p_target_status in ('responded', 'closed', 'spam'))
    or (current_record.status = 'responded' and p_target_status in ('in_review', 'closed'))
  ) then
    raise exception 'CONTACT_MESSAGE_TRANSITION_NOT_ALLOWED' using errcode = '55000';
  end if;
  update public.contact_submissions set
    status = p_target_status,
    retention_due_at = case when p_target_status in ('closed', 'spam')
      then statement_timestamp() + interval '180 days' else retention_due_at end,
    version = version + 1
  where id = current_record.id returning * into next_record;
  insert into public.contact_submission_events (
    contact_submission_id, event_type, from_status, to_status, actor_profile_id,
    safe_note, idempotency_key_hash, correlation_id
  ) values (
    next_record.id, p_target_status, current_record.status, p_target_status, auth.uid(),
    btrim(p_safe_note), p_idempotency_key_hash, next_record.correlation_id
  );
  perform app_private.write_audit_event(
    app_private.content_actor_class(), 'contact.message.transition', 'contact_submission',
    next_record.id::text, 'succeeded', 'content', next_record.correlation_id,
    jsonb_build_object('status', next_record.status, 'version', next_record.version)
  );
  return next_record;
end;
$$;

create or replace function public.mark_contact_notification_failed(
  p_contact_submission_id uuid,
  p_safe_error_code text
)
returns public.contact_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission public.contact_submissions;
  event_key text;
begin
  if not app_private.is_service_context() or p_safe_error_code !~ '^[A-Z0-9_]{2,80}$' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.contact_submissions set notification_state = 'failed', version = version + 1
  where id = p_contact_submission_id returning * into submission;
  if not found then raise exception 'CONTACT_MESSAGE_NOT_FOUND' using errcode = 'P0002'; end if;
  event_key := encode(extensions.digest(
    (submission.id::text || ':notification:' || p_safe_error_code)::bytea, 'sha256'
  ), 'hex');
  insert into public.contact_submission_events (
    contact_submission_id, event_type, from_status, to_status,
    safe_note, idempotency_key_hash, correlation_id
  ) values (
    submission.id, 'notification_failed', submission.status, submission.status,
    'Notification delivery failed: ' || p_safe_error_code, event_key, submission.correlation_id
  ) on conflict do nothing;
  insert into public.operational_alerts (
    fingerprint, category, severity, safe_summary, correlation_id
  ) values (
    'contact-notification:' || submission.id::text, 'notification-dead-letter', 'high',
    'A contact-message notification needs operator attention.', submission.correlation_id
  ) on conflict (fingerprint, status) do update set
    occurrence_count = public.operational_alerts.occurrence_count + 1,
    last_seen_at = statement_timestamp();
  return submission;
end;
$$;

create or replace function app_private.record_guest_consent(
  p_guest_subject_hash text,
  p_purpose text,
  p_choice public.consent_choice,
  p_disclosure_version text,
  p_locale public.app_locale,
  p_source text,
  p_preference_metadata jsonb,
  p_correlation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  prior_id uuid;
  consent_id uuid;
begin
  if p_guest_subject_hash !~ '^[a-f0-9]{64}$'
    or p_purpose not in ('analytics', 'preferences', 'newsletter', 'marketing')
    or jsonb_typeof(p_preference_metadata) <> 'object'
    or char_length(btrim(p_source)) not between 1 and 80
    or not exists (
      select 1 from public.disclosure_versions disclosure
      where disclosure.purpose = p_purpose
        and disclosure.version_key = p_disclosure_version
        and disclosure.status = 'published'
    ) then
    raise exception 'INVALID_CONSENT_RECORD' using errcode = '22023';
  end if;
  select consent.id into prior_id
  from public.consent_records consent
  where consent.guest_subject_hash = p_guest_subject_hash and consent.purpose = p_purpose
  order by consent.recorded_at desc, consent.id desc limit 1;
  insert into public.consent_records (
    guest_subject_hash, purpose, choice, disclosure_version, locale, source,
    supersedes_id, preference_metadata, withdrawal_effective_at, correlation_id
  ) values (
    p_guest_subject_hash, p_purpose, p_choice, p_disclosure_version, p_locale,
    btrim(p_source), prior_id, p_preference_metadata,
    case when p_choice = 'withdrawn' then statement_timestamp() else null end,
    p_correlation_id
  ) returning id into consent_id;
  return consent_id;
end;
$$;

create or replace function public.read_published_disclosures(p_locale public.app_locale)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(
    disclosure.purpose,
    jsonb_build_object(
      'version', disclosure.version_key,
      'copy', coalesce(disclosure.copy_i18n ->> p_locale::text, disclosure.copy_i18n ->> 'en'),
      'locale', case when disclosure.copy_i18n ? p_locale::text then p_locale::text else 'en' end,
      'fallbackDisclosed', not (disclosure.copy_i18n ? p_locale::text)
    )
  ), '{}'::jsonb)
  from public.disclosure_versions disclosure
  where disclosure.status = 'published';
$$;

create or replace function public.publish_disclosure_version(
  p_purpose text,
  p_version_key text,
  p_copy_i18n jsonb,
  p_reason text
)
returns public.disclosure_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  disclosure public.disclosure_versions;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if p_purpose not in ('contact', 'newsletter', 'analytics', 'preferences')
    or p_version_key !~ '^[a-z0-9][a-z0-9._-]{1,79}$'
    or jsonb_typeof(p_copy_i18n) <> 'object'
    or not (p_copy_i18n ?& array['ka', 'en', 'de', 'ru'])
    or exists (
      select 1 from jsonb_each_text(p_copy_i18n) copy
      where char_length(btrim(copy.value)) not between 10 and 1000
    )
    or char_length(btrim(coalesce(p_reason, ''))) not between 2 and 500 then
    raise exception 'INVALID_DISCLOSURE_VERSION' using errcode = '22023';
  end if;
  update public.disclosure_versions set
    status = 'retired', retired_at = statement_timestamp()
  where purpose = p_purpose and status = 'published';
  insert into public.disclosure_versions (
    purpose, version_key, copy_i18n, status, published_at, created_by
  ) values (
    p_purpose, p_version_key, p_copy_i18n, 'published', statement_timestamp(), auth.uid()
  ) returning * into disclosure;
  perform app_private.write_audit_event(
    app_private.content_actor_class(), 'content.disclosure.publish', 'disclosure_version',
    disclosure.id::text, 'succeeded', 'content', correlation,
    jsonb_build_object('purpose', disclosure.purpose, 'versionKey', disclosure.version_key)
  );
  return disclosure;
end;
$$;

create or replace function public.record_visitor_consent(
  p_guest_subject_hash text,
  p_locale public.app_locale,
  p_choices jsonb,
  p_disclosure_versions jsonb,
  p_preference_metadata jsonb default '{}'::jsonb,
  p_source text default 'consent-banner'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  purpose text;
  choice_text text;
  consent_id uuid;
  result jsonb := '{}'::jsonb;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_guest_subject_hash !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_choices) <> 'object'
    or jsonb_typeof(p_disclosure_versions) <> 'object'
    or jsonb_typeof(p_preference_metadata) <> 'object'
    or p_choices = '{}'::jsonb
    or exists (select 1 from jsonb_object_keys(p_choices) key where key not in ('analytics', 'preferences')) then
    raise exception 'INVALID_VISITOR_CONSENT' using errcode = '22023';
  end if;
  for purpose, choice_text in select key, value from jsonb_each_text(p_choices)
  loop
    if choice_text not in ('granted', 'refused', 'withdrawn') then
      raise exception 'INVALID_VISITOR_CONSENT_CHOICE' using errcode = '22023';
    end if;
    consent_id := app_private.record_guest_consent(
      p_guest_subject_hash, purpose, choice_text::public.consent_choice,
      p_disclosure_versions ->> purpose, p_locale, p_source,
      case when purpose = 'preferences' then p_preference_metadata else '{}'::jsonb end,
      correlation
    );
    result := result || jsonb_build_object(purpose, jsonb_build_object('id', consent_id, 'choice', choice_text));
  end loop;
  return result;
end;
$$;

create or replace function public.read_visitor_consent(p_guest_subject_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not app_private.is_service_context() or p_guest_subject_hash !~ '^[a-f0-9]{64}$' then
    return '{}'::jsonb;
  end if;
  select coalesce(jsonb_object_agg(
    latest.purpose,
    jsonb_build_object(
      'choice', latest.choice,
      'disclosureVersion', latest.disclosure_version,
      'preferenceMetadata', latest.preference_metadata,
      'recordedAt', latest.recorded_at,
      'withdrawalEffectiveAt', latest.withdrawal_effective_at
    )
  ), '{}'::jsonb) into result
  from (
    select distinct on (consent.purpose) consent.*
    from public.consent_records consent
    where consent.guest_subject_hash = p_guest_subject_hash
      and consent.purpose in ('analytics', 'preferences')
    order by consent.purpose, consent.recorded_at desc, consent.id desc
  ) latest;
  return result;
end;
$$;

create or replace function public.subscribe_newsletter(
  p_email text,
  p_guest_subject_hash text,
  p_manage_proof_hash text,
  p_locale public.app_locale,
  p_disclosure_version text
)
returns public.newsletter_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription public.newsletter_subscriptions;
  consent_id uuid;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if char_length(btrim(p_email)) not between 3 and 254 or p_email not like '%@%'
    or p_guest_subject_hash !~ '^[a-f0-9]{64}$'
    or p_manage_proof_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_NEWSLETTER_SUBSCRIPTION' using errcode = '22023';
  end if;
  select * into subscription from public.newsletter_subscriptions
  where email = lower(btrim(p_email)) for update;
  if found and subscription.guest_subject_hash <> p_guest_subject_hash
    and subscription.manage_proof_hash <> p_manage_proof_hash then
    raise exception 'NEWSLETTER_CONFIRMATION_REQUIRED' using errcode = '42501';
  end if;
  consent_id := app_private.record_guest_consent(
    p_guest_subject_hash, 'newsletter', 'granted', p_disclosure_version,
    p_locale, 'newsletter-form', '{}'::jsonb, correlation
  );
  if subscription.id is null then
    insert into public.newsletter_subscriptions (
      email, guest_subject_hash, manage_proof_hash, locale, disclosure_version, consent_record_id
    ) values (
      lower(btrim(p_email)), p_guest_subject_hash, p_manage_proof_hash,
      p_locale, p_disclosure_version, consent_id
    ) returning * into subscription;
  else
    update public.newsletter_subscriptions set
      guest_subject_hash = p_guest_subject_hash, manage_proof_hash = p_manage_proof_hash,
      locale = p_locale, status = 'subscribed', disclosure_version = p_disclosure_version,
      consent_record_id = consent_id, subscribed_at = statement_timestamp(), withdrawn_at = null,
      version = version + 1
    where id = subscription.id returning * into subscription;
  end if;
  insert into public.notifications (
    purpose, locale, template_key, recipient_hash, payload, idempotency_key, correlation_id
  ) values (
    'newsletter-subscribed', subscription.locale, 'newsletter-subscribed',
    encode(extensions.digest(lower(subscription.email::text)::bytea, 'sha256'), 'hex'),
    jsonb_build_object('recipientEmail', lower(subscription.email::text), 'subscriptionReference', subscription.reference),
    'newsletter-subscribed:' || subscription.id::text || ':' || subscription.version::text,
    correlation
  ) on conflict (idempotency_key) do nothing;
  return subscription;
end;
$$;

create or replace function public.withdraw_newsletter(
  p_email text,
  p_manage_proof_hash text,
  p_locale public.app_locale
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription public.newsletter_subscriptions;
  consent_id uuid;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_manage_proof_hash !~ '^[a-f0-9]{64}$' then return true; end if;
  select * into subscription from public.newsletter_subscriptions
  where email = lower(btrim(p_email)) and manage_proof_hash = p_manage_proof_hash for update;
  if not found or subscription.status = 'withdrawn' then return true; end if;
  consent_id := app_private.record_guest_consent(
    subscription.guest_subject_hash, 'newsletter', 'withdrawn', subscription.disclosure_version,
    p_locale, 'newsletter-withdrawal', '{}'::jsonb, correlation
  );
  update public.newsletter_subscriptions set
    status = 'withdrawn', consent_record_id = consent_id,
    withdrawn_at = statement_timestamp(), version = version + 1
  where id = subscription.id returning * into subscription;
  insert into public.notifications (
    purpose, locale, template_key, recipient_hash, payload, idempotency_key, correlation_id
  ) values (
    'newsletter-withdrawn', subscription.locale, 'newsletter-withdrawn',
    encode(extensions.digest(lower(subscription.email::text)::bytea, 'sha256'), 'hex'),
    jsonb_build_object('recipientEmail', lower(subscription.email::text), 'subscriptionReference', subscription.reference),
    'newsletter-withdrawn:' || subscription.id::text || ':' || subscription.version::text,
    correlation
  ) on conflict (idempotency_key) do nothing;
  return true;
end;
$$;

create or replace function public.merge_visitor_consent(
  p_profile_id uuid,
  p_guest_subject_hash text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_consent public.consent_records;
  profile_prior uuid;
  merged_count integer := 0;
begin
  if not app_private.is_service_context() and auth.uid() is distinct from p_profile_id then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_guest_subject_hash !~ '^[a-f0-9]{64}$' or not exists (
    select 1 from public.profiles where id = p_profile_id
  ) then raise exception 'INVALID_CONSENT_MERGE' using errcode = '22023'; end if;
  for guest_consent in
    select distinct on (consent.purpose) consent.*
    from public.consent_records consent
    where consent.guest_subject_hash = p_guest_subject_hash
    order by consent.purpose, consent.recorded_at desc, consent.id desc
  loop
    select consent.id into profile_prior from public.consent_records consent
    where consent.profile_id = p_profile_id and consent.purpose = guest_consent.purpose
    order by consent.recorded_at desc, consent.id desc limit 1;
    insert into public.consent_records (
      profile_id, purpose, choice, disclosure_version, locale, source,
      supersedes_id, preference_metadata, withdrawal_effective_at, correlation_id
    ) values (
      p_profile_id, guest_consent.purpose, guest_consent.choice,
      guest_consent.disclosure_version, guest_consent.locale, 'guest-account-merge',
      coalesce(profile_prior, guest_consent.id), guest_consent.preference_metadata,
      guest_consent.withdrawal_effective_at, guest_consent.correlation_id
    );
    merged_count := merged_count + 1;
  end loop;
  return merged_count;
end;
$$;

create or replace function public.run_content_contact_consent_maintenance(
  p_delete_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_record public.content_entries;
  published_count integer := 0;
  unpublished_count integer := 0;
  redirects_published integer := 0;
  redirects_disabled integer := 0;
  preview_tokens_deleted integer := 0;
  contact_records_deleted integer := 0;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_delete_limit not between 1 and 1000 then
    raise exception 'INVALID_MAINTENANCE_LIMIT' using errcode = '22023';
  end if;
  for entry_record in
    select * from public.content_entries
    where status = 'scheduled' and publish_at <= statement_timestamp()
    order by publish_at for update skip locked
  loop
    update public.content_entries set
      status = 'published', published_at = statement_timestamp(), version = version + 1
    where id = entry_record.id returning * into entry_record;
    perform app_private.record_content_revision(entry_record.id, 'publish', 'Scheduled publication executed.', correlation);
    published_count := published_count + 1;
  end loop;
  for entry_record in
    select * from public.content_entries
    where status = 'published' and unpublish_at <= statement_timestamp()
    order by unpublish_at for update skip locked
  loop
    update public.content_entries set status = 'unpublished', version = version + 1
    where id = entry_record.id returning * into entry_record;
    perform app_private.record_content_revision(entry_record.id, 'unpublish', 'Scheduled unpublication executed.', correlation);
    unpublished_count := unpublished_count + 1;
  end loop;
  update public.content_redirects set status = 'published', version = version + 1
  where status = 'scheduled' and active_from <= statement_timestamp();
  get diagnostics redirects_published = row_count;
  update public.content_redirects set status = 'disabled', version = version + 1
  where status = 'published' and active_until <= statement_timestamp();
  get diagnostics redirects_disabled = row_count;
  delete from public.content_preview_tokens
  where id in (
    select id from public.content_preview_tokens
    where expires_at <= statement_timestamp() or revoked_at is not null
    order by expires_at limit p_delete_limit
  );
  get diagnostics preview_tokens_deleted = row_count;
  delete from public.contact_submissions
  where id in (
    select id from public.contact_submissions
    where status in ('closed', 'spam') and retention_due_at <= statement_timestamp()
    order by retention_due_at limit p_delete_limit
  );
  get diagnostics contact_records_deleted = row_count;
  insert into public.operational_alerts (
    fingerprint, category, severity, safe_summary, correlation_id
  )
  select
    'contact-notification-stalled:' || submission.id::text,
    'notification-stalled', 'warning',
    'A contact-message notification has remained pending and needs review.', submission.correlation_id
  from public.contact_submissions submission
  where submission.notification_state = 'pending'
    and submission.created_at < statement_timestamp() - interval '30 minutes'
  on conflict (fingerprint, status) do update set
    occurrence_count = public.operational_alerts.occurrence_count + 1,
    last_seen_at = statement_timestamp();
  perform app_private.write_audit_event(
    'service', 'content.maintenance.run', 'content_maintenance', null,
    'succeeded', 'content', correlation,
    jsonb_build_object(
      'published', published_count, 'unpublished', unpublished_count,
      'redirectsPublished', redirects_published, 'redirectsDisabled', redirects_disabled,
      'previewTokensDeleted', preview_tokens_deleted, 'contactRecordsDeleted', contact_records_deleted
    )
  );
  return jsonb_build_object(
    'published', published_count,
    'unpublished', unpublished_count,
    'redirectsPublished', redirects_published,
    'redirectsDisabled', redirects_disabled,
    'previewTokensDeleted', preview_tokens_deleted,
    'contactRecordsDeleted', contact_records_deleted
  );
end;
$$;
