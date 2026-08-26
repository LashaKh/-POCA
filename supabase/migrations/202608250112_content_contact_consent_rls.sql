alter table public.disclosure_versions enable row level security;
alter table public.content_entries enable row level security;
alter table public.content_translations enable row level security;
alter table public.content_revisions enable row level security;
alter table public.content_preview_tokens enable row level security;
alter table public.content_menus enable row level security;
alter table public.content_menu_items enable row level security;
alter table public.content_menu_revisions enable row level security;
alter table public.content_redirects enable row level security;
alter table public.contact_channels enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.contact_submission_events enable row level security;
alter table public.newsletter_subscriptions enable row level security;

alter table public.disclosure_versions force row level security;
alter table public.content_entries force row level security;
alter table public.content_translations force row level security;
alter table public.content_revisions force row level security;
alter table public.content_preview_tokens force row level security;
alter table public.content_menus force row level security;
alter table public.content_menu_items force row level security;
alter table public.content_menu_revisions force row level security;
alter table public.content_redirects force row level security;
alter table public.contact_channels force row level security;
alter table public.contact_submissions force row level security;
alter table public.contact_submission_events force row level security;
alter table public.newsletter_subscriptions force row level security;
alter table public.consent_records force row level security;

revoke all on public.disclosure_versions, public.content_entries,
  public.content_translations, public.content_revisions, public.content_preview_tokens,
  public.content_menus, public.content_menu_items, public.content_menu_revisions,
  public.content_redirects, public.contact_channels, public.contact_submissions,
  public.contact_submission_events, public.newsletter_subscriptions
from public, anon, authenticated;

grant select on public.disclosure_versions, public.content_entries,
  public.content_translations, public.content_menus, public.content_menu_items,
  public.content_redirects, public.contact_channels to anon, authenticated;
grant select on public.content_revisions, public.content_preview_tokens,
  public.content_menu_revisions, public.contact_submissions,
  public.contact_submission_events, public.newsletter_subscriptions to authenticated;

create policy disclosure_published_or_staff_read
on public.disclosure_versions for select to anon, authenticated
using (status = 'published' or public.is_active_staff());

create policy content_entries_published_or_staff_read
on public.content_entries for select to anon, authenticated
using (
  public.is_active_staff()
  or (
    status = 'published'
    and coalesce(publish_at, '-infinity') <= statement_timestamp()
    and coalesce(unpublish_at, 'infinity') > statement_timestamp()
  )
);

create policy content_translations_published_or_staff_read
on public.content_translations for select to anon, authenticated
using (
  public.is_active_staff()
  or (
    review_status = 'approved'
    and exists (
      select 1 from public.content_entries entry
      where entry.id = content_entry_id and entry.status = 'published'
        and coalesce(entry.publish_at, '-infinity') <= statement_timestamp()
        and coalesce(entry.unpublish_at, 'infinity') > statement_timestamp()
    )
  )
);

create policy content_revisions_staff_read
on public.content_revisions for select to authenticated
using (public.is_active_staff());

create policy content_preview_tokens_staff_read
on public.content_preview_tokens for select to authenticated
using (public.is_active_staff());

create policy content_menus_published_or_staff_read
on public.content_menus for select to anon, authenticated
using (status = 'published' or public.is_active_staff());

create policy content_menu_items_published_or_staff_read
on public.content_menu_items for select to anon, authenticated
using (
  public.is_active_staff()
  or (
    enabled and visible_from <= statement_timestamp() and visible_until > statement_timestamp()
    and exists (
      select 1 from public.content_menus menu where menu.id = menu_id and menu.status = 'published'
    )
  )
);

create policy content_menu_revisions_staff_read
on public.content_menu_revisions for select to authenticated
using (public.is_active_staff());

create policy content_redirects_published_or_staff_read
on public.content_redirects for select to anon, authenticated
using (
  public.is_active_staff()
  or (
    status = 'published' and active_from <= statement_timestamp()
    and active_until > statement_timestamp()
  )
);

create policy contact_channels_published_or_staff_read
on public.contact_channels for select to anon, authenticated
using (
  public.is_active_staff()
  or (enabled and configuration_status = 'published' and verified_at is not null)
);

create policy contact_submissions_subject_or_staff_read
on public.contact_submissions for select to authenticated
using (profile_id = auth.uid() or public.is_active_staff());

create policy contact_submission_events_staff_read
on public.contact_submission_events for select to authenticated
using (public.is_active_staff());

create policy newsletter_subscriptions_subject_or_staff_read
on public.newsletter_subscriptions for select to authenticated
using (profile_id = auth.uid() or public.is_active_staff());

create view public.published_content_projection
with (security_invoker = true)
as
select
  entry.entry_key, entry.content_type, entry.fallback_policy, entry.legal_status,
  entry.published_at, translation.locale, translation.slug, translation.title,
  translation.summary, translation.blocks, translation.meta_title,
  translation.meta_description, translation.social_image_url
from public.content_entries entry
join public.content_translations translation on translation.content_entry_id = entry.id
where entry.status = 'published' and translation.review_status = 'approved'
  and coalesce(entry.publish_at, '-infinity') <= statement_timestamp()
  and coalesce(entry.unpublish_at, 'infinity') > statement_timestamp();

create view public.published_content_menu_items
with (security_invoker = true)
as
select
  menu.menu_key, item.item_key, item.destination_path, item.labels_i18n, item.position
from public.content_menus menu
join public.content_menu_items item on item.menu_id = menu.id
where menu.status = 'published' and item.enabled
  and item.visible_from <= statement_timestamp() and item.visible_until > statement_timestamp();

create view public.published_content_redirects
with (security_invoker = true)
as
select source_path, destination_path, http_status
from public.content_redirects
where status = 'published' and active_from <= statement_timestamp()
  and active_until > statement_timestamp();

create view public.published_contact_channels
with (security_invoker = true)
as
select channel_key, channel_type, public_value, labels_i18n
from public.contact_channels
where enabled and configuration_status = 'published' and verified_at is not null;

create view public.published_disclosure_versions
with (security_invoker = true)
as
select purpose, version_key, copy_i18n, published_at
from public.disclosure_versions where status = 'published';

create view public.staff_content_queue
with (security_invoker = true)
as
select
  entry.id, entry.entry_key, entry.content_type, entry.status, entry.fallback_policy,
  entry.legal_status, entry.publish_at, entry.unpublish_at, entry.published_at,
  entry.updated_at, entry.version,
  count(translation.id)::integer as translation_count,
  count(translation.id) filter (where translation.review_status = 'approved')::integer as approved_translation_count
from public.content_entries entry
left join public.content_translations translation on translation.content_entry_id = entry.id
where public.is_active_staff()
group by entry.id;

create view public.staff_contact_queue
with (security_invoker = true)
as
select
  submission.id, submission.reference, submission.status, submission.locale,
  submission.order_reference, submission.notification_state,
  submission.created_at, submission.updated_at, submission.version,
  regexp_replace(submission.contact_email::text, '(^.).*(@.*$)', '\1***\2') as masked_email,
  left(submission.subject, 80) as subject_preview
from public.contact_submissions submission
where public.is_active_staff();

create view public.staff_newsletter_queue
with (security_invoker = true)
as
select
  subscription.id, subscription.reference, subscription.status, subscription.locale,
  subscription.subscribed_at, subscription.withdrawn_at, subscription.version,
  regexp_replace(subscription.email::text, '(^.).*(@.*$)', '\1***\2') as masked_email
from public.newsletter_subscriptions subscription
where public.is_active_staff();

grant select on public.published_content_projection,
  public.published_content_menu_items, public.published_content_redirects,
  public.published_contact_channels, public.published_disclosure_versions
to anon, authenticated;
grant select on public.staff_content_queue, public.staff_contact_queue,
  public.staff_newsletter_queue to authenticated;

grant all on public.disclosure_versions, public.content_entries,
  public.content_translations, public.content_revisions, public.content_preview_tokens,
  public.content_menus, public.content_menu_items, public.content_menu_revisions,
  public.content_redirects, public.contact_channels, public.contact_submissions,
  public.contact_submission_events, public.newsletter_subscriptions to service_role;
grant select on public.published_content_projection,
  public.published_content_menu_items, public.published_content_redirects,
  public.published_contact_channels, public.published_disclosure_versions,
  public.staff_content_queue, public.staff_contact_queue,
  public.staff_newsletter_queue to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.save_content_entry(uuid, text, text, text, text, jsonb, bigint, text) from public, anon;
revoke all on function public.transition_content_entry(uuid, text, timestamptz, timestamptz, bigint, text) from public, anon;
revoke all on function public.create_content_preview_token(uuid, text, integer) from public, anon;
revoke all on function public.read_content_preview(text, public.app_locale) from public, anon;
revoke all on function public.read_published_content(text, public.app_locale) from public;
revoke all on function public.publish_content_menu(text, jsonb, text, bigint, text) from public, anon;
revoke all on function public.configure_content_redirect(uuid, text, text, integer, text, timestamptz, timestamptz, bigint, text) from public, anon;
revoke all on function public.configure_contact_channel(uuid, text, text, text, jsonb, boolean, boolean, text, bigint, text) from public, anon;
revoke all on function public.submit_contact_message(text, text, public.app_locale, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.read_contact_message_status(text, text) from public, anon, authenticated;
revoke all on function public.transition_contact_message(uuid, bigint, text, text, text) from public, anon;
revoke all on function public.mark_contact_notification_failed(uuid, text) from public, anon, authenticated;
revoke all on function public.read_published_disclosures(public.app_locale) from public;
revoke all on function public.publish_disclosure_version(text, text, jsonb, text) from public, anon;
revoke all on function public.record_visitor_consent(text, public.app_locale, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.read_visitor_consent(text) from public, anon, authenticated;
revoke all on function public.subscribe_newsletter(text, text, text, public.app_locale, text) from public, anon, authenticated;
revoke all on function public.withdraw_newsletter(text, text, public.app_locale) from public, anon, authenticated;
revoke all on function public.merge_visitor_consent(uuid, text) from public, anon;
revoke all on function public.run_content_contact_consent_maintenance(integer) from public, anon, authenticated;

grant execute on function public.save_content_entry(uuid, text, text, text, text, jsonb, bigint, text) to authenticated, service_role;
grant execute on function public.transition_content_entry(uuid, text, timestamptz, timestamptz, bigint, text) to authenticated, service_role;
grant execute on function public.create_content_preview_token(uuid, text, integer) to authenticated, service_role;
grant execute on function public.read_content_preview(text, public.app_locale) to authenticated, service_role;
grant execute on function public.read_published_content(text, public.app_locale) to anon, authenticated, service_role;
grant execute on function public.publish_content_menu(text, jsonb, text, bigint, text) to authenticated, service_role;
grant execute on function public.configure_content_redirect(uuid, text, text, integer, text, timestamptz, timestamptz, bigint, text) to authenticated, service_role;
grant execute on function public.configure_contact_channel(uuid, text, text, text, jsonb, boolean, boolean, text, bigint, text) to authenticated, service_role;
grant execute on function public.submit_contact_message(text, text, public.app_locale, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.read_contact_message_status(text, text) to service_role;
grant execute on function public.transition_contact_message(uuid, bigint, text, text, text) to authenticated, service_role;
grant execute on function public.mark_contact_notification_failed(uuid, text) to service_role;
grant execute on function public.read_published_disclosures(public.app_locale) to anon, authenticated, service_role;
grant execute on function public.publish_disclosure_version(text, text, jsonb, text) to authenticated, service_role;
grant execute on function public.record_visitor_consent(text, public.app_locale, jsonb, jsonb, jsonb, text) to service_role;
grant execute on function public.read_visitor_consent(text) to service_role;
grant execute on function public.subscribe_newsletter(text, text, text, public.app_locale, text) to service_role;
grant execute on function public.withdraw_newsletter(text, text, public.app_locale) to service_role;
grant execute on function public.merge_visitor_consent(uuid, text) to authenticated, service_role;
grant execute on function public.run_content_contact_consent_maintenance(integer) to service_role;

comment on view public.staff_contact_queue is
  'Private support queue masks buyer email and omits message bodies from list views.';
comment on view public.published_content_projection is
  'Approved localized content only; legal_status preserves the difference between operational publication and legal approval.';
