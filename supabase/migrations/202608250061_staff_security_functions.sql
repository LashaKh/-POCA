create or replace function app_private.reject_sensitive_audit_summary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.summary::text ~* '"(password|secret|token|authorization|cookie|email|phone|address|ip)"[[:space:]]*:' then
    raise exception 'SENSITIVE_AUDIT_SUMMARY' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger audit_events_reject_sensitive_summary
before insert or update on public.audit_events
for each row execute function app_private.reject_sensitive_audit_summary();

create or replace function app_private.assert_recent_protected_operation(
  p_operation_type text,
  p_entity_type text,
  p_entity_id text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.protected_operations operation
    where operation.actor_profile_id = auth.uid()
      and operation.operation_type = p_operation_type
      and operation.entity_type = p_entity_type
      and operation.entity_id = p_entity_id
      and operation.completed_at >= statement_timestamp() - interval '5 minutes'
  ) then
    raise exception 'PROTECTED_CONFIRMATION_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.record_current_session(
  p_auth_session_id uuid,
  p_assurance_level text,
  p_user_agent_summary text,
  p_ip_prefix_hash text,
  p_expires_at timestamptz,
  p_device_label text default null
)
returns public.app_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_record public.app_sessions;
begin
  if auth.uid() is null
    or p_auth_session_id::text <> coalesce(auth.jwt() ->> 'session_id', '')
    or p_assurance_level not in ('aal1', 'aal2')
    or p_expires_at <= statement_timestamp()
    or char_length(coalesce(p_user_agent_summary, '')) > 240
    or (p_ip_prefix_hash is not null and p_ip_prefix_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'INVALID_SESSION_REGISTRATION' using errcode = '22023';
  end if;
  insert into public.app_sessions (
    auth_session_id, profile_id, assurance_level, user_agent_summary,
    ip_prefix_hash, expires_at, device_label
  ) values (
    p_auth_session_id, auth.uid(), p_assurance_level, nullif(p_user_agent_summary, ''),
    p_ip_prefix_hash, p_expires_at, nullif(btrim(p_device_label), '')
  ) on conflict (auth_session_id) do update set
    assurance_level = excluded.assurance_level,
    user_agent_summary = excluded.user_agent_summary,
    ip_prefix_hash = excluded.ip_prefix_hash,
    expires_at = excluded.expires_at,
    device_label = coalesce(excluded.device_label, public.app_sessions.device_label),
    last_seen_at = statement_timestamp()
  returning * into session_record;
  return session_record;
end;
$$;

create or replace function public.manage_staff_member(
  p_profile_id uuid,
  p_role public.staff_role,
  p_active boolean,
  p_reason text,
  p_expected_version bigint
)
returns public.staff_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_record public.staff_members;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_owner(true);
  if char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_STAFF_CHANGE' using errcode = '22023';
  end if;
  select * into staff_record from public.staff_members
  where profile_id = p_profile_id for update;
  if not found then raise exception 'STAFF_NOT_FOUND' using errcode = 'P0002'; end if;
  if staff_record.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  if staff_record.active and not p_active then
    perform app_private.assert_recent_protected_operation(
      'staff-deactivate', 'staff', p_profile_id::text
    );
  elsif staff_record.role <> p_role then
    perform app_private.assert_recent_protected_operation(
      'staff-role-change', 'staff', p_profile_id::text
    );
  end if;
  if staff_record.role = 'owner' and staff_record.active
    and (p_role <> 'owner' or not p_active)
    and (select count(*) from public.staff_members where role = 'owner' and active) <= 1 then
    raise exception 'LAST_ACTIVE_OWNER' using errcode = '55000';
  end if;
  update public.staff_members set
    role = p_role, active = p_active, mfa_required = p_role = 'owner',
    activated_at = case when p_active then coalesce(activated_at, statement_timestamp()) else activated_at end,
    deactivated_at = case when p_active then null else statement_timestamp() end,
    deactivation_reason = case when p_active then null else btrim(p_reason) end,
    role_changed_at = case when role <> p_role then statement_timestamp() else role_changed_at end,
    role_changed_by = case when role <> p_role then auth.uid() else role_changed_by end,
    version = version + 1
  where profile_id = p_profile_id returning * into staff_record;
  if not p_active then
    update public.app_sessions set revoked_at = statement_timestamp(),
      revoked_reason = 'staff-deactivated', revoked_by = auth.uid()
    where profile_id = p_profile_id and revoked_at is null;
  end if;
  perform app_private.write_audit_event(
    'owner', 'security.staff.manage', 'staff', p_profile_id::text,
    'succeeded', 'staff-security', correlation,
    jsonb_build_object('role', p_role, 'active', p_active, 'version', staff_record.version)
  );
  return staff_record;
end;
$$;

create or replace function public.revoke_app_sessions(
  p_profile_id uuid,
  p_keep_auth_session_id uuid default null,
  p_reason text default 'Session revoked'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  actor_class text;
  correlation uuid := extensions.gen_random_uuid();
begin
  if auth.uid() <> p_profile_id then
    perform app_private.assert_owner(true);
    perform app_private.assert_recent_protected_operation(
      'session-revoke-all', 'profile', p_profile_id::text
    );
    actor_class := 'owner';
  else
    if not public.has_auth_assurance('aal1') then
      raise exception 'AUTH_REQUIRED' using errcode = '42501';
    end if;
    actor_class := case when public.is_active_staff('owner') then 'owner'
      when public.is_active_staff() then 'manager' else 'customer' end;
  end if;
  if char_length(btrim(p_reason)) not between 2 and 240 then
    raise exception 'INVALID_SESSION_REVOCATION' using errcode = '22023';
  end if;
  update public.app_sessions set revoked_at = statement_timestamp(),
    revoked_reason = btrim(p_reason), revoked_by = auth.uid()
  where profile_id = p_profile_id and revoked_at is null
    and (p_keep_auth_session_id is null or auth_session_id <> p_keep_auth_session_id);
  get diagnostics affected = row_count;
  perform app_private.write_audit_event(
    actor_class, 'security.session.revoke', 'profile', p_profile_id::text,
    'succeeded', 'session-security', correlation,
    jsonb_build_object('revokedCount', affected, 'keptCurrent', p_keep_auth_session_id is not null)
  );
  return affected;
end;
$$;

create or replace function public.record_protected_operation(
  p_operation_type text,
  p_entity_type text,
  p_entity_id text,
  p_confirmation text,
  p_reason text
)
returns public.protected_operations
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_record public.protected_operations;
  expected text := upper(replace(p_operation_type, '-', ' ')) || ' ' || p_entity_id;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_owner(true);
  if p_operation_type not in ('staff-deactivate', 'staff-role-change', 'session-revoke-all',
      'privacy-delete', 'retention-change', 'export-sensitive')
    or p_entity_type !~ '^[a-z][a-z0-9_-]{1,79}$'
    or char_length(p_entity_id) not between 1 and 160
    or p_confirmation <> expected
    or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'EXACT_CONFIRMATION_REQUIRED' using errcode = '22023';
  end if;
  insert into public.protected_operations (
    operation_type, entity_type, entity_id, impact_summary, exact_confirmation,
    reason, actor_profile_id, assurance_level, correlation_id
  ) values (
    p_operation_type, p_entity_type, p_entity_id,
    'Owner confirmed protected operation ' || p_operation_type,
    expected, btrim(p_reason), auth.uid(), 'aal2', correlation
  ) returning * into operation_record;
  perform app_private.write_audit_event(
    'owner', 'security.protected-operation', p_entity_type, p_entity_id,
    'succeeded', 'protected-operation', correlation,
    jsonb_build_object('operationType', p_operation_type)
  );
  return operation_record;
end;
$$;

create or replace function public.request_privacy_operation(
  p_subject_profile_id uuid,
  p_request_type public.privacy_request_type,
  p_reason text
)
returns public.privacy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.privacy_requests;
  correlation uuid := extensions.gen_random_uuid();
begin
  if auth.uid() <> p_subject_profile_id then perform app_private.assert_owner(true); end if;
  if p_request_type = 'deletion' then
    perform app_private.assert_recent_protected_operation(
      'privacy-delete', 'profile', p_subject_profile_id::text
    );
  elsif p_request_type = 'export' then
    perform app_private.assert_recent_protected_operation(
      'export-sensitive', 'profile', p_subject_profile_id::text
    );
  end if;
  if auth.uid() is null or char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'INVALID_PRIVACY_REQUEST' using errcode = '22023';
  end if;
  insert into public.privacy_requests (
    subject_profile_id, request_type, requested_by, reason, correlation_id
  ) values (
    p_subject_profile_id, p_request_type, auth.uid(), btrim(p_reason), correlation
  ) returning * into request_record;
  perform app_private.write_audit_event(
    case when public.is_active_staff('owner') then 'owner' else 'customer' end,
    'privacy.request', 'profile', p_subject_profile_id::text, 'succeeded',
    'privacy', correlation, jsonb_build_object('requestType', p_request_type)
  );
  return request_record;
end;
$$;

create view public.integration_status_safe
with (security_invoker = true)
as select key, mode, capabilities, safe_reason,
  secret_configured, last_checked_at, updated_at, version
from public.integration_configs;

revoke all on function app_private.reject_sensitive_audit_summary() from public, anon, authenticated;
revoke all on function app_private.assert_recent_protected_operation(text, text, text) from public, anon, authenticated;
revoke all on function public.record_current_session(uuid, text, text, text, timestamptz, text) from public, anon;
revoke all on function public.manage_staff_member(uuid, public.staff_role, boolean, text, bigint) from public, anon;
revoke all on function public.revoke_app_sessions(uuid, uuid, text) from public, anon;
revoke all on function public.record_protected_operation(text, text, text, text, text) from public, anon;
revoke all on function public.request_privacy_operation(uuid, public.privacy_request_type, text) from public, anon;
grant execute on function public.record_current_session(uuid, text, text, text, timestamptz, text) to authenticated, service_role;
grant execute on function public.manage_staff_member(uuid, public.staff_role, boolean, text, bigint) to authenticated, service_role;
grant execute on function public.revoke_app_sessions(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.record_protected_operation(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.request_privacy_operation(uuid, public.privacy_request_type, text) to authenticated, service_role;
