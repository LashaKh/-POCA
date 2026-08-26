create or replace function public.claim_scheduled_action(
  p_action_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns table (
  action_id uuid,
  run_id uuid,
  action_type text,
  subject_type text,
  subject_id uuid,
  scheduled_for timestamptz,
  correlation_id uuid,
  attempt_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public.scheduled_actions;
  v_run_id uuid;
  v_attempt integer;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(p_worker_id) not between 3 and 160
    or p_lease_seconds not between 15 and 900 then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;

  select action.* into v_action
  from public.scheduled_actions action
  where action.id = p_action_id
    and action.due_at <= statement_timestamp()
    and action.attempt_count < action.max_attempts
    and (
      action.status in ('pending', 'failed')
      or (action.status = 'leased' and action.lease_expires_at < statement_timestamp())
    )
  for update;
  if v_action.id is null then return; end if;

  if v_action.status = 'leased' and v_action.last_run_id is not null then
    update public.scheduled_action_runs run
    set status = 'abandoned',
        completed_at = statement_timestamp(),
        duration_ms = greatest(0, floor(extract(epoch from (statement_timestamp() - run.leased_at)) * 1000)::integer),
        safe_error_code = 'LEASE_EXPIRED'
    where run.id = v_action.last_run_id and run.status = 'leased';
  end if;

  v_run_id := extensions.gen_random_uuid();
  v_attempt := v_action.attempt_count + 1;
  insert into public.scheduled_action_runs (
    id, scheduled_action_id, run_key, worker_id, attempt_number, status,
    scheduled_for, lease_expires_at, correlation_id
  ) values (
    v_run_id, v_action.id,
    v_action.idempotency_key || ':attempt:' || v_attempt::text,
    p_worker_id, v_attempt, 'leased', v_action.due_at,
    statement_timestamp() + make_interval(secs => p_lease_seconds),
    v_action.correlation_id
  );
  update public.scheduled_actions action
  set status = 'leased', lease_owner = p_worker_id,
      lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
      lease_heartbeat_at = statement_timestamp(), attempt_count = v_attempt,
      safe_error_code = null, last_run_id = v_run_id
  where action.id = v_action.id;

  action_id := v_action.id;
  run_id := v_run_id;
  action_type := v_action.action_type;
  subject_type := v_action.subject_type;
  subject_id := v_action.subject_id;
  scheduled_for := v_action.due_at;
  correlation_id := v_action.correlation_id;
  attempt_number := v_attempt;
  return next;
end;
$$;

revoke all on function public.claim_scheduled_action(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.claim_scheduled_action(uuid, text, integer) to service_role;

comment on function public.claim_scheduled_action(uuid, text, integer) is
  'Claims one selected action atomically so typed coordinators never lease unrelated domain actions.';
