create or replace function app_private.assert_safe_operations_json(value jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(value) <> 'object' then
    raise exception 'INVALID_SAFE_CONTEXT' using errcode = '22023';
  end if;
  if value ?| array[
    'address', 'authorization', 'cardNumber', 'cookie', 'cvv', 'email',
    'message', 'name', 'notes', 'password', 'payload', 'phone', 'prompt',
    'secret', 'token', 'url'
  ] then
    raise exception 'SENSITIVE_OPERATIONS_CONTEXT' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.claim_due_scheduled_actions(
  p_worker_id text,
  p_limit integer default 20,
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
    or p_limit not between 1 and 100
    or p_lease_seconds not between 15 and 900 then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;

  for v_action in
    select action.*
    from public.scheduled_actions action
    where (
      action.status in ('pending', 'failed')
      or (action.status = 'leased' and action.lease_expires_at < statement_timestamp())
    )
      and action.due_at <= statement_timestamp()
      and action.attempt_count < action.max_attempts
    order by action.due_at, action.created_at
    for update skip locked
    limit p_limit
  loop
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
    set status = 'leased',
        lease_owner = p_worker_id,
        lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
        lease_heartbeat_at = statement_timestamp(),
        attempt_count = v_attempt,
        safe_error_code = null,
        last_run_id = v_run_id
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
  end loop;
end;
$$;

create or replace function public.heartbeat_scheduled_action(
  p_action_id uuid,
  p_run_id uuid,
  p_worker_id text,
  p_extend_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expiry timestamptz;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_extend_seconds not between 15 and 900 then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;
  v_expiry := statement_timestamp() + make_interval(secs => p_extend_seconds);

  update public.scheduled_actions action
  set lease_expires_at = v_expiry,
      lease_heartbeat_at = statement_timestamp()
  where action.id = p_action_id
    and action.last_run_id = p_run_id
    and action.status = 'leased'
    and action.lease_owner = p_worker_id
    and action.lease_expires_at >= statement_timestamp();
  if not found then
    raise exception 'LEASE_LOST' using errcode = 'P0001';
  end if;

  update public.scheduled_action_runs run
  set heartbeat_at = statement_timestamp(), lease_expires_at = v_expiry
  where run.id = p_run_id
    and run.scheduled_action_id = p_action_id
    and run.worker_id = p_worker_id
    and run.status = 'leased';
  if not found then
    raise exception 'LEASE_LOST' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

create or replace function public.complete_scheduled_action(
  p_action_id uuid,
  p_run_id uuid,
  p_worker_id text,
  p_success boolean,
  p_safe_error_code text default null,
  p_result_summary jsonb default '{}'::jsonb
)
returns public.scheduled_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public.scheduled_actions;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform app_private.assert_safe_operations_json(p_result_summary);
  if not p_success and coalesce(p_safe_error_code, '') !~ '^[A-Z0-9_]{2,80}$' then
    raise exception 'INVALID_SAFE_ERROR_CODE' using errcode = '22023';
  end if;

  select action.* into v_action
  from public.scheduled_actions action
  where action.id = p_action_id
  for update;
  if v_action.id is null
    or v_action.status <> 'leased'
    or v_action.lease_owner <> p_worker_id
    or v_action.last_run_id <> p_run_id
    or v_action.lease_expires_at < statement_timestamp() then
    raise exception 'LEASE_LOST' using errcode = 'P0001';
  end if;

  update public.scheduled_action_runs run
  set status = case when p_success then 'succeeded' else 'failed' end,
      completed_at = statement_timestamp(),
      duration_ms = greatest(0, floor(extract(epoch from (statement_timestamp() - run.leased_at)) * 1000)::integer),
      safe_error_code = case when p_success then null else p_safe_error_code end,
      result_summary = p_result_summary
  where run.id = p_run_id and run.status = 'leased';
  if not found then
    raise exception 'LEASE_LOST' using errcode = 'P0001';
  end if;

  update public.scheduled_actions action
  set status = case when p_success then 'complete'::public.work_status else 'failed'::public.work_status end,
      lease_owner = null,
      lease_expires_at = null,
      lease_heartbeat_at = null,
      safe_error_code = case when p_success then null else p_safe_error_code end,
      completed_at = case
        when p_success or action.attempt_count >= action.max_attempts then statement_timestamp()
        else null
      end
  where action.id = p_action_id
  returning action.* into v_action;
  return v_action;
end;
$$;

create or replace function public.enqueue_scheduled_catch_up(
  p_action_type text,
  p_subject_type text,
  p_scheduled_for timestamptz,
  p_idempotency_key text,
  p_correlation_id uuid
)
returns public.scheduled_actions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public.scheduled_actions;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_scheduled_for > statement_timestamp() + interval '1 minute' then
    raise exception 'FUTURE_CATCH_UP_WINDOW' using errcode = '22023';
  end if;
  insert into public.scheduled_actions (
    action_type, subject_type, due_at, idempotency_key, correlation_id
  ) values (
    p_action_type, p_subject_type, p_scheduled_for, p_idempotency_key, p_correlation_id
  )
  on conflict (idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning * into v_action;
  return v_action;
end;
$$;

create or replace function public.record_operational_alert(
  p_fingerprint text,
  p_category text,
  p_severity text,
  p_safe_summary text,
  p_correlation_id uuid default null,
  p_safe_context jsonb default '{}'::jsonb
)
returns public.operational_alerts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alert public.operational_alerts;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform app_private.assert_safe_operations_json(p_safe_context);

  select alert.* into v_alert
  from public.operational_alerts alert
  where alert.fingerprint = p_fingerprint
    and alert.status in ('open', 'acknowledged')
  order by case alert.status when 'open' then 0 else 1 end
  limit 1
  for update;

  if v_alert.id is null then
    insert into public.operational_alerts (
      fingerprint, category, severity, safe_summary, correlation_id
    ) values (
      p_fingerprint, p_category, p_severity, p_safe_summary, p_correlation_id
    ) returning * into v_alert;
  else
    update public.operational_alerts alert
    set occurrence_count = alert.occurrence_count + 1,
        last_seen_at = statement_timestamp(),
        severity = p_severity,
        safe_summary = p_safe_summary,
        correlation_id = coalesce(p_correlation_id, alert.correlation_id)
    where alert.id = v_alert.id
    returning * into v_alert;
  end if;

  insert into public.operational_alert_occurrences (
    alert_id, correlation_id, safe_context
  ) values (v_alert.id, p_correlation_id, p_safe_context);
  return v_alert;
end;
$$;

create or replace function public.record_health_snapshot(
  p_environment text,
  p_release text,
  p_overall text,
  p_checks jsonb,
  p_correlation_id uuid
)
returns public.health_snapshots
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot public.health_snapshots;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform app_private.assert_safe_operations_json(p_checks);
  insert into public.health_snapshots (
    environment, release, overall, checks, correlation_id
  ) values (
    p_environment, p_release, p_overall, p_checks, p_correlation_id
  ) returning * into v_snapshot;
  return v_snapshot;
end;
$$;

create or replace function public.record_readiness_assessment(
  p_environment text,
  p_stage text,
  p_decision text,
  p_gates jsonb,
  p_blockers text[],
  p_release_record_id uuid,
  p_correlation_id uuid
)
returns public.readiness_assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.readiness_assessments;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform app_private.assert_safe_operations_json(p_gates);
  insert into public.readiness_assessments (
    environment, stage, decision, gates, blockers, release_record_id, correlation_id
  ) values (
    p_environment, p_stage, p_decision, p_gates, p_blockers,
    p_release_record_id, p_correlation_id
  ) returning * into v_assessment;
  return v_assessment;
end;
$$;

create or replace function public.verify_critical_data_integrity()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_orders_without_lines bigint;
  v_inventory_invalid bigint;
  v_media_link_orphans bigint;
  v_active_owner_count bigint;
  v_rls_disabled bigint;
  v_checks jsonb;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select count(*) into v_orders_without_lines
  from public.orders orders
  where not exists (
    select 1 from public.order_lines lines where lines.order_id = orders.id
  );
  select count(*) into v_inventory_invalid
  from public.inventory_items inventory
  where inventory.on_hand_quantity < 0
    or inventory.reserved_quantity < 0
    or inventory.reserved_quantity > inventory.on_hand_quantity;
  select count(*) into v_media_link_orphans
  from public.media_links link
  left join public.products product
    on link.entity_type = 'product' and product.id = link.entity_id
  left join public.collections collection
    on link.entity_type = 'collection' and collection.id = link.entity_id
  where (link.entity_type = 'product' and product.id is null)
    or (link.entity_type = 'collection' and collection.id is null);
  select count(*) into v_active_owner_count
  from public.staff_members staff
  where staff.active and staff.role = 'owner';
  select count(*) into v_rls_disabled
  from pg_catalog.pg_class relation
  where relation.relnamespace = 'public'::regnamespace
    and relation.relname = any(array[
      'audit_events', 'inventory_items', 'media_assets', 'media_links',
      'order_lines', 'orders', 'staff_members'
    ])
    and not relation.relrowsecurity;

  v_checks := jsonb_build_object(
    'orders_without_lines', v_orders_without_lines,
    'inventory_invalid', v_inventory_invalid,
    'media_link_orphans', v_media_link_orphans,
    'active_owner_count', v_active_owner_count,
    'critical_tables_without_rls', v_rls_disabled
  );
  return jsonb_build_object(
    'ok', v_orders_without_lines = 0
      and v_inventory_invalid = 0
      and v_media_link_orphans = 0
      and v_active_owner_count > 0
      and v_rls_disabled = 0,
    'checks', v_checks,
    'checkedAt', statement_timestamp()
  );
end;
$$;

revoke all on function public.claim_due_scheduled_actions(text, integer, integer) from public, anon, authenticated;
revoke all on function public.heartbeat_scheduled_action(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.complete_scheduled_action(uuid, uuid, text, boolean, text, jsonb) from public, anon, authenticated;
revoke all on function public.enqueue_scheduled_catch_up(text, text, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.record_operational_alert(text, text, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.record_health_snapshot(text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.record_readiness_assessment(text, text, text, jsonb, text[], uuid, uuid) from public, anon, authenticated;
revoke all on function public.verify_critical_data_integrity() from public, anon, authenticated;

grant execute on function public.claim_due_scheduled_actions(text, integer, integer) to service_role;
grant execute on function public.heartbeat_scheduled_action(uuid, uuid, text, integer) to service_role;
grant execute on function public.complete_scheduled_action(uuid, uuid, text, boolean, text, jsonb) to service_role;
grant execute on function public.enqueue_scheduled_catch_up(text, text, timestamptz, text, uuid) to service_role;
grant execute on function public.record_operational_alert(text, text, text, text, uuid, jsonb) to service_role;
grant execute on function public.record_health_snapshot(text, text, text, jsonb, uuid) to service_role;
grant execute on function public.record_readiness_assessment(text, text, text, jsonb, text[], uuid, uuid) to service_role;
grant execute on function public.verify_critical_data_integrity() to service_role;

comment on function public.claim_due_scheduled_actions(text, integer, integer) is
  'Claims due and expired-lease work with a durable per-attempt record and bounded lease.';
comment on function public.verify_critical_data_integrity() is
  'Secret-free critical relationship, stock, role, media-reference, and RLS integrity summary.';
