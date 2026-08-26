create or replace function app_private.is_service_context()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when coalesce(auth.role(), '') <> '' then auth.role() = 'service_role'
    else session_user in ('postgres', 'supabase_admin')
  end;
$$;

create or replace function public.is_active_staff(required_role public.staff_role default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.profile_id = auth.uid()
      and sm.active
      and (required_role is null or sm.role = required_role)
  );
$$;

create or replace function public.has_auth_assurance(required_aal text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case required_aal
    when 'aal1' then coalesce(auth.jwt() ->> 'aal', '') in ('aal1', 'aal2')
    when 'aal2' then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    else false
  end;
$$;

create or replace function app_private.assert_manager()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_active_staff() and not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

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

  if require_aal2 and not public.has_auth_assurance('aal2') then
    raise exception 'MFA_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

create or replace function app_private.protect_last_active_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_owner_count integer;
begin
  if tg_op = 'DELETE' then
    if old.active and old.role = 'owner' then
      select count(*) into active_owner_count
      from public.staff_members
      where active and role = 'owner' and profile_id <> old.profile_id;

      if active_owner_count = 0 then
        raise exception 'LAST_OWNER_REQUIRED' using errcode = 'P0001';
      end if;
    end if;
    return old;
  end if;

  if old.active and old.role = 'owner'
    and (not new.active or new.role <> 'owner') then
    select count(*) into active_owner_count
    from public.staff_members
    where active and role = 'owner' and profile_id <> old.profile_id;

    if active_owner_count = 0 then
      raise exception 'LAST_OWNER_REQUIRED' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger staff_members_protect_last_owner
before update or delete on public.staff_members
for each row execute function app_private.protect_last_active_owner();

create or replace function app_private.write_audit_event(
  actor_class text,
  action text,
  entity_type text,
  entity_id text,
  result text,
  source text,
  correlation_id uuid,
  summary jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id bigint;
begin
  if jsonb_typeof(summary) <> 'object' then
    raise exception 'INVALID_AUDIT_SUMMARY' using errcode = '22023';
  end if;

  if summary ?| array[
    'password', 'secret', 'token', 'authorization', 'cookie',
    'cardNumber', 'cvv', 'rawPayload', 'address', 'message'
  ] then
    raise exception 'AUDIT_SUMMARY_CONTAINS_FORBIDDEN_FIELD' using errcode = '22023';
  end if;

  insert into public.audit_events (
    actor_profile_id,
    actor_class,
    action,
    entity_type,
    entity_id,
    result,
    source,
    correlation_id,
    summary
  ) values (
    auth.uid(),
    actor_class,
    action,
    entity_type,
    entity_id,
    result,
    source,
    correlation_id,
    summary
  ) returning id into event_id;

  return event_id;
end;
$$;

create or replace function app_private.begin_idempotency(
  operation_scope text,
  key_hash text,
  actor_fingerprint text,
  request_hash text,
  ttl interval default interval '24 hours'
)
returns public.idempotency_keys
language plpgsql
security definer
set search_path = ''
as $$
declare
  record public.idempotency_keys;
begin
  if ttl <= interval '0 seconds' or ttl > interval '30 days' then
    raise exception 'INVALID_IDEMPOTENCY_TTL' using errcode = '22023';
  end if;

  insert into public.idempotency_keys (
    scope,
    key_hash,
    actor_fingerprint,
    request_hash,
    locked_until,
    expires_at
  ) values (
    operation_scope,
    key_hash,
    actor_fingerprint,
    request_hash,
    statement_timestamp() + interval '2 minutes',
    statement_timestamp() + ttl
  )
  on conflict (scope, key_hash, actor_fingerprint) do nothing;

  select * into record
  from public.idempotency_keys
  where scope = operation_scope
    and idempotency_keys.key_hash = begin_idempotency.key_hash
    and idempotency_keys.actor_fingerprint = begin_idempotency.actor_fingerprint
  for update;

  if record.request_hash <> begin_idempotency.request_hash then
    raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505';
  end if;

  if record.status = 'processing'
    and record.locked_until < statement_timestamp() then
    update public.idempotency_keys
    set locked_until = statement_timestamp() + interval '2 minutes'
    where id = record.id
    returning * into record;
  end if;

  return record;
end;
$$;

create or replace function app_private.complete_idempotency(
  idempotency_id uuid,
  final_status text,
  response jsonb
)
returns public.idempotency_keys
language plpgsql
security definer
set search_path = ''
as $$
declare
  record public.idempotency_keys;
begin
  if final_status not in ('complete', 'failed') then
    raise exception 'INVALID_IDEMPOTENCY_STATUS' using errcode = '22023';
  end if;

  update public.idempotency_keys
  set status = final_status,
      response = complete_idempotency.response,
      completed_at = statement_timestamp(),
      locked_until = null
  where id = idempotency_id
    and status = 'processing'
  returning * into record;

  if record.id is null then
    select * into record from public.idempotency_keys where id = idempotency_id;
  end if;

  return record;
end;
$$;

create or replace function app_private.claim_notifications(
  worker_id text,
  claim_limit integer default 20,
  lease_duration interval default interval '2 minutes'
)
returns setof public.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if claim_limit not between 1 and 100
    or lease_duration <= interval '0 seconds'
    or lease_duration > interval '15 minutes' then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select id
    from public.notifications
    where (
      status in ('pending', 'failed')
      or (status = 'leased' and lease_expires_at < statement_timestamp())
    )
      and available_at <= statement_timestamp()
      and attempt_count < max_attempts
    order by available_at, created_at
    for update skip locked
    limit claim_limit
  )
  update public.notifications n
  set status = 'leased',
      lease_owner = worker_id,
      lease_expires_at = statement_timestamp() + lease_duration,
      attempt_count = n.attempt_count + 1
  from candidates
  where n.id = candidates.id
  returning n.*;
end;
$$;

create or replace function app_private.claim_media_jobs(
  worker_id text,
  claim_limit integer default 10,
  lease_duration interval default interval '4 minutes'
)
returns setof public.media_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if claim_limit not between 1 and 50
    or lease_duration <= interval '0 seconds'
    or lease_duration > interval '15 minutes' then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select id
    from public.media_jobs
    where (
      status in ('queued', 'retrying')
      or (status = 'processing' and lease_expires_at < statement_timestamp())
    )
      and next_attempt_at <= statement_timestamp()
      and attempt < max_attempts
    order by next_attempt_at, queued_at
    for update skip locked
    limit claim_limit
  )
  update public.media_jobs j
  set status = 'processing',
      lease_owner = worker_id,
      lease_expires_at = statement_timestamp() + lease_duration,
      attempt = j.attempt + 1,
      started_at = coalesce(j.started_at, statement_timestamp())
  from candidates
  where j.id = candidates.id
  returning j.*;
end;
$$;

create or replace function app_private.claim_scheduled_actions(
  worker_id text,
  claim_limit integer default 50,
  lease_duration interval default interval '2 minutes'
)
returns setof public.scheduled_actions
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if claim_limit not between 1 and 100
    or lease_duration <= interval '0 seconds'
    or lease_duration > interval '15 minutes' then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select id
    from public.scheduled_actions
    where (
      status in ('pending', 'failed')
      or (status = 'leased' and lease_expires_at < statement_timestamp())
    )
      and due_at <= statement_timestamp()
      and attempt_count < max_attempts
    order by due_at, created_at
    for update skip locked
    limit claim_limit
  )
  update public.scheduled_actions a
  set status = 'leased',
      lease_owner = worker_id,
      lease_expires_at = statement_timestamp() + lease_duration,
      attempt_count = a.attempt_count + 1
  from candidates
  where a.id = candidates.id
  returning a.*;
end;
$$;

revoke all on all functions in schema app_private from public, anon, authenticated;
grant usage on schema app_private to service_role;
grant execute on function app_private.begin_idempotency(text, text, text, text, interval) to service_role;
grant execute on function app_private.complete_idempotency(uuid, text, jsonb) to service_role;
grant execute on function app_private.claim_notifications(text, integer, interval) to service_role;
grant execute on function app_private.claim_media_jobs(text, integer, interval) to service_role;
grant execute on function app_private.claim_scheduled_actions(text, integer, interval) to service_role;

grant execute on function public.is_active_staff(public.staff_role) to authenticated;
grant execute on function public.has_auth_assurance(text) to authenticated;
