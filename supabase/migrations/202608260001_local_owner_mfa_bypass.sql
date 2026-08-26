-- Keep production Owner MFA intact while making the explicit local preview
-- account usable without enrolling a disposable authenticator.
create or replace function public.owner_has_required_assurance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_auth_assurance('aal2')
    or (
      coalesce(auth.jwt() ->> 'aal', '') = 'aal1'
      and lower(coalesce(auth.jwt() ->> 'email', '')) like '%@epoca.local'
      and coalesce(auth.jwt() ->> 'iss', '')
        ~ '^https?://(127[.]0[.]0[.]1|localhost)(:[0-9]+)?/auth/v1$'
    )
$$;

revoke all on function public.owner_has_required_assurance() from public;
grant execute on function public.owner_has_required_assurance()
  to authenticated, service_role;

create or replace function app_private.assert_owner(require_aal2 boolean default true)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if app_private.is_service_context() then
    return;
  end if;

  if not public.is_active_staff('owner') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if require_aal2 and not public.owner_has_required_assurance() then
    raise exception 'MFA_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

drop policy if exists staff_read_self_or_owner on public.staff_members;
create policy staff_read_self_or_owner on public.staff_members
for select to authenticated
using (
  profile_id = auth.uid()
  or (public.is_active_staff('owner') and public.owner_has_required_assurance())
);

drop policy if exists profiles_owner_staff_read on public.profiles;
create policy profiles_owner_staff_read on public.profiles
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists sessions_read_self_or_owner on public.app_sessions;
create policy sessions_read_self_or_owner on public.app_sessions
for select to authenticated
using (
  profile_id = auth.uid()
  or (public.is_active_staff('owner') and public.owner_has_required_assurance())
);

drop policy if exists settings_role_read on public.business_settings;
create policy settings_role_read on public.business_settings
for select to authenticated
using (
  (not sensitive and public.is_active_staff())
  or (public.is_active_staff('owner') and public.owner_has_required_assurance())
);

drop policy if exists audit_owner_read on public.audit_events;
create policy audit_owner_read on public.audit_events
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists staff_invitations_owner_read on public.staff_invitations;
create policy staff_invitations_owner_read on public.staff_invitations
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists protected_operations_owner_read on public.protected_operations;
create policy protected_operations_owner_read on public.protected_operations
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists privacy_requests_self_or_owner_read on public.privacy_requests;
create policy privacy_requests_self_or_owner_read on public.privacy_requests
for select to authenticated
using (
  subject_profile_id = auth.uid()
  or (public.is_active_staff('owner') and public.owner_has_required_assurance())
);

drop policy if exists scheduled_action_runs_owner_read on public.scheduled_action_runs;
create policy scheduled_action_runs_owner_read on public.scheduled_action_runs
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists alert_occurrences_owner_read on public.operational_alert_occurrences;
create policy alert_occurrences_owner_read on public.operational_alert_occurrences
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists health_snapshots_owner_read on public.health_snapshots;
create policy health_snapshots_owner_read on public.health_snapshots
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists release_records_owner_read on public.release_records;
create policy release_records_owner_read on public.release_records
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists backup_restore_evidence_owner_read on public.backup_restore_evidence;
create policy backup_restore_evidence_owner_read on public.backup_restore_evidence
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());

drop policy if exists readiness_assessments_owner_read on public.readiness_assessments;
create policy readiness_assessments_owner_read on public.readiness_assessments
for select to authenticated
using (public.is_active_staff('owner') and public.owner_has_required_assurance());
