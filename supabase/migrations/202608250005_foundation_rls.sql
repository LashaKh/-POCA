revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.app_sessions enable row level security;
alter table public.consent_records enable row level security;
alter table public.business_settings enable row level security;
alter table public.integration_configs enable row level security;
alter table public.audit_events enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_attempts enable row level security;
alter table public.operational_alerts enable row level security;
alter table public.export_jobs enable row level security;
alter table public.media_jobs enable row level security;
alter table public.scheduled_actions enable row level security;

alter table public.audit_events force row level security;
alter table public.idempotency_keys force row level security;
alter table public.notifications force row level security;
alter table public.notification_attempts force row level security;
alter table public.media_jobs force row level security;
alter table public.scheduled_actions force row level security;

grant select, update (display_name, locale, display_currency) on public.profiles to authenticated;
grant select on public.staff_members to authenticated;
grant select, update (last_seen_at, revoked_at, revoked_reason) on public.app_sessions to authenticated;
grant select, insert on public.consent_records to authenticated;
grant select on public.business_settings to authenticated;
grant select on public.integration_configs to authenticated;
grant select on public.audit_events to authenticated;
grant select on public.operational_alerts to authenticated;
grant select on public.export_jobs to authenticated;

create policy profiles_read_self
on public.profiles for select to authenticated
using (id = auth.uid());

create policy profiles_update_self_preferences
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid() and profile_kind = 'customer');

create policy staff_read_self_or_owner
on public.staff_members for select to authenticated
using (profile_id = auth.uid() or public.is_active_staff('owner'));

create policy sessions_read_self_or_owner
on public.app_sessions for select to authenticated
using (profile_id = auth.uid() or public.is_active_staff('owner'));

create policy sessions_update_self
on public.app_sessions for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy consent_read_self
on public.consent_records for select to authenticated
using (profile_id = auth.uid());

create policy consent_insert_self
on public.consent_records for insert to authenticated
with check (profile_id = auth.uid() and guest_subject_hash is null);

create policy settings_staff_read
on public.business_settings for select to authenticated
using (public.is_active_staff());

create policy integrations_staff_read
on public.integration_configs for select to authenticated
using (public.is_active_staff());

create policy audit_owner_read
on public.audit_events for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create policy alerts_staff_read
on public.operational_alerts for select to authenticated
using (public.is_active_staff());

create policy exports_requester_or_owner_read
on public.export_jobs for select to authenticated
using (requested_by = auth.uid() or public.is_active_staff('owner'));

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

comment on table public.audit_events is
  'Append-only privacy-safe sensitive action evidence; writes use app_private.write_audit_event.';
comment on table public.idempotency_keys is
  'Server-only duplicate-effect guard keyed by operation, actor, and hashed client key.';
