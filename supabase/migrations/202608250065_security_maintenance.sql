create table public.audit_event_archives (
  id bigint primary key,
  occurred_at timestamptz not null,
  actor_profile_id uuid,
  actor_class text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  result text not null,
  source text not null,
  correlation_id uuid not null,
  summary jsonb not null,
  retention_class text not null,
  contains_personal_data boolean not null,
  archived_at timestamptz not null default statement_timestamp(),
  purge_after timestamptz not null
);

alter table public.audit_event_archives enable row level security;
alter table public.audit_event_archives force row level security;
revoke all on public.audit_event_archives from public, anon, authenticated;
grant all on public.audit_event_archives to service_role;

create or replace function app_private.reject_audit_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.audit_maintenance', true) = 'retention' and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'IMMUTABLE_AUDIT_EVENT' using errcode = '55000';
end;
$$;

drop trigger audit_events_append_only on public.audit_events;
create trigger audit_events_append_only before update or delete on public.audit_events
for each row execute function app_private.reject_audit_change();

create or replace function public.run_security_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_invitations integer := 0;
  revoked_sessions integer := 0;
  expired_exports integer := 0;
  archived_events integer := 0;
  purged_archives integer := 0;
begin
  update public.staff_invitations
  set status = 'expired'
  where status = 'pending' and expires_at <= statement_timestamp();
  get diagnostics expired_invitations = row_count;

  update public.app_sessions
  set revoked_at = statement_timestamp(),
      revoked_reason = 'Session expired by security maintenance'
  where revoked_at is null and (
    expires_at <= statement_timestamp()
    or last_seen_at < statement_timestamp() - interval '30 days'
  );
  get diagnostics revoked_sessions = row_count;

  update public.export_jobs
  set status = case when status = 'complete' then status else 'failed' end,
      safe_error_code = case when status = 'complete' then safe_error_code else 'EXPORT_EXPIRED' end,
      object_path = null
  where expires_at is not null and expires_at <= statement_timestamp()
    and (object_path is not null or status in ('pending', 'leased'));
  get diagnostics expired_exports = row_count;

  insert into public.audit_event_archives (
    id, occurred_at, actor_profile_id, actor_class, action, entity_type,
    entity_id, result, source, correlation_id, summary, retention_class,
    contains_personal_data, purge_after
  )
  select event.id, event.occurred_at, event.actor_profile_id, event.actor_class,
    event.action, event.entity_type, event.entity_id, event.result, event.source,
    event.correlation_id, event.summary, event.retention_class,
    event.contains_personal_data,
    event.occurred_at + case event.retention_class
      when 'financial' then interval '6 years'
      when 'security' then interval '2 years'
      when 'privacy' then interval '2 years'
      else interval '1 year'
    end + interval '30 days'
  from public.audit_events event
  where event.occurred_at < statement_timestamp() - case event.retention_class
    when 'financial' then interval '6 years'
    when 'security' then interval '2 years'
    when 'privacy' then interval '2 years'
    else interval '1 year'
  end
  on conflict (id) do nothing;
  get diagnostics archived_events = row_count;

  perform set_config('app.audit_maintenance', 'retention', true);
  delete from public.audit_events event
  using public.audit_event_archives archive
  where archive.id = event.id;
  delete from public.audit_event_archives
  where purge_after <= statement_timestamp();
  get diagnostics purged_archives = row_count;

  if not exists (
    select 1 from public.staff_members where role = 'owner' and active
  ) then
    insert into public.operational_alerts (
      fingerprint, category, severity, safe_summary, occurrence_count
    ) values (
      'security-no-active-owner', 'security', 'critical',
      'No active Owner account is available.', 1
    )
    on conflict (fingerprint, status) do update
      set occurrence_count = public.operational_alerts.occurrence_count + 1,
          last_seen_at = statement_timestamp();
  end if;

  return jsonb_build_object(
    'expiredInvitations', expired_invitations,
    'revokedSessions', revoked_sessions,
    'expiredExports', expired_exports,
    'archivedEvents', archived_events,
    'purgedArchives', purged_archives
  );
end;
$$;

revoke all on function app_private.reject_audit_change() from public, anon, authenticated;
revoke all on function public.run_security_maintenance() from public, anon, authenticated;
grant execute on function public.run_security_maintenance() to service_role;

comment on table public.audit_event_archives is
  'Service-only short grace archive used by the audited retention process before final purge.';
