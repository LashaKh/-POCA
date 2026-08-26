alter table public.staff_invitations enable row level security;
alter table public.staff_invitations force row level security;
alter table public.protected_operations enable row level security;
alter table public.protected_operations force row level security;
alter table public.privacy_requests enable row level security;
alter table public.privacy_requests force row level security;

revoke all on public.staff_invitations, public.protected_operations,
  public.privacy_requests from anon, authenticated;
grant select on public.staff_invitations, public.protected_operations to authenticated;
grant select on public.privacy_requests to authenticated;
grant select on public.integration_status_safe to authenticated;

drop policy if exists staff_read_self_or_owner on public.staff_members;
create policy staff_read_self_or_owner
on public.staff_members for select to authenticated
using (profile_id = auth.uid() or (
  public.is_active_staff('owner') and public.has_auth_assurance('aal2')
));

create policy profiles_owner_staff_read
on public.profiles for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

drop policy if exists sessions_read_self_or_owner on public.app_sessions;
create policy sessions_read_self_or_owner
on public.app_sessions for select to authenticated
using (profile_id = auth.uid() or (
  public.is_active_staff('owner') and public.has_auth_assurance('aal2')
));

drop policy if exists settings_staff_read on public.business_settings;
create policy settings_role_read
on public.business_settings for select to authenticated
using (
  (not sensitive and public.is_active_staff())
  or (public.is_active_staff('owner') and public.has_auth_assurance('aal2'))
);

drop policy if exists audit_owner_read on public.audit_events;
create policy audit_owner_read
on public.audit_events for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));

create policy staff_invitations_owner_read
on public.staff_invitations for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));
create policy protected_operations_owner_read
on public.protected_operations for select to authenticated
using (public.is_active_staff('owner') and public.has_auth_assurance('aal2'));
create policy privacy_requests_self_or_owner_read
on public.privacy_requests for select to authenticated
using (subject_profile_id = auth.uid() or (
  public.is_active_staff('owner') and public.has_auth_assurance('aal2')
));

grant all on public.staff_invitations, public.protected_operations,
  public.privacy_requests to service_role;
grant usage, select on all sequences in schema public to service_role;
