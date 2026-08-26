create or replace function app_private.return_actor_class()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'service'
    when exists (
      select 1 from public.staff_members staff
      where staff.profile_id = auth.uid() and staff.active
    ) then (
      select staff.role::text from public.staff_members staff
      where staff.profile_id = auth.uid() and staff.active
    )
    else 'customer'
  end;
$$;

create or replace function app_private.return_transition_allowed(
  p_from public.return_request_status,
  p_to public.return_request_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from = 'requested' then p_to in ('needs_information', 'approved', 'rejected', 'cancelled')
    when p_from = 'needs_information' then p_to in ('requested', 'approved', 'rejected', 'cancelled')
    when p_from = 'approved' then p_to in ('in_transit', 'received', 'cancelled')
    when p_from = 'in_transit' then p_to = 'received'
    when p_from = 'received' then p_to = 'inspected'
    when p_from = 'inspected' then p_to in ('refund_pending', 'closed')
    when p_from = 'refund_pending' then p_to in ('refunded', 'needs_information')
    when p_from = 'refunded' then p_to = 'closed'
    else false
  end;
$$;

create or replace function app_private.assert_return_request_access(
  p_request public.return_requests,
  p_guest_proof_hash text default null
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
begin
  if public.is_active_staff() then return; end if;
  if auth.uid() is not null and p_request.customer_profile_id = auth.uid() then return; end if;
  if app_private.is_service_context() then
    select * into order_record from public.orders where id = p_request.order_id;
    if p_request.customer_profile_id is not null then return; end if;
    if p_guest_proof_hash is not null
      and order_record.guest_proof_hash = p_guest_proof_hash
      and order_record.guest_proof_expires_at > statement_timestamp() then
      return;
    end if;
  end if;
  raise exception 'RETURN_ACCESS_DENIED' using errcode = '42501';
end;
$$;

create or replace function public.evaluate_return_eligibility(
  p_order_id uuid,
  p_request_kind public.return_request_kind
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  policy_record public.return_policies;
  delivered_at timestamptz;
  deadline timestamptz;
  eligible boolean := false;
  reason_code text := 'not_eligible';
begin
  select * into order_record from public.orders where id = p_order_id;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  if auth.uid() is not null
    and order_record.customer_profile_id is distinct from auth.uid()
    and not public.is_active_staff()
    and not app_private.is_service_context() then
    raise exception 'RETURN_ACCESS_DENIED' using errcode = '42501';
  end if;
  select * into policy_record from public.return_policies
  where active and effective_at <= statement_timestamp()
  order by effective_at desc limit 1;
  if not found then
    return jsonb_build_object('eligible', false, 'reasonCode', 'policy_unavailable');
  end if;
  if exists (
    select 1 from public.return_requests request
    where request.order_id = p_order_id
      and request.request_kind = p_request_kind
      and request.status not in ('rejected', 'closed', 'cancelled')
  ) then
    return jsonb_build_object(
      'eligible', false,
      'reasonCode', 'request_already_open',
      'policyVersion', policy_record.version,
      'legalStatus', policy_record.legal_status
    );
  end if;

  if p_request_kind = 'cancellation' then
    deadline := order_record.accepted_at + make_interval(hours => policy_record.cancellation_window_hours);
    eligible := order_record.status in ('bank_transfer_pending', 'payment_pending', 'confirmed')
      and statement_timestamp() <= deadline;
    reason_code := case
      when order_record.status not in ('bank_transfer_pending', 'payment_pending', 'confirmed') then 'order_not_cancellable'
      when statement_timestamp() > deadline then 'cancellation_window_expired'
      else 'eligible'
    end;
  else
    select max(fulfillment.delivered_at) into delivered_at
    from public.fulfillments fulfillment
    where fulfillment.order_id = p_order_id and fulfillment.status = 'delivered';
    deadline := delivered_at + make_interval(days => policy_record.return_window_days);
    eligible := order_record.payment_status in ('paid', 'partially_refunded')
      and delivered_at is not null and statement_timestamp() <= deadline;
    reason_code := case
      when delivered_at is null then 'order_not_delivered'
      when order_record.payment_status not in ('paid', 'partially_refunded') then 'payment_not_returnable'
      when statement_timestamp() > deadline then 'return_window_expired'
      else 'eligible'
    end;
  end if;

  return jsonb_build_object(
    'eligible', eligible,
    'reasonCode', reason_code,
    'deadline', deadline,
    'policyId', policy_record.id,
    'policyVersion', policy_record.version,
    'policyVersionNumber', policy_record.version_number,
    'legalStatus', policy_record.legal_status,
    'allowedReasons', policy_record.allowed_reasons,
    'maxEvidenceFiles', policy_record.max_evidence_files,
    'maxEvidenceBytes', policy_record.max_evidence_bytes,
    'allowedEvidenceTypes', policy_record.allowed_evidence_types,
    'buyerCopy', policy_record.buyer_copy
  );
end;
$$;

create or replace function public.submit_return_request(
  p_order_id uuid,
  p_request_kind public.return_request_kind,
  p_reason_code text,
  p_buyer_note text,
  p_line_items jsonb,
  p_idempotency_key_hash text,
  p_guest_proof_hash text default null
)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  policy_record public.return_policies;
  eligibility jsonb;
  request_record public.return_requests;
  actor_class text;
  target_prefix text;
  item_count integer;
begin
  if p_idempotency_key_hash !~ '^[a-f0-9]{64}$'
    or p_reason_code !~ '^[a-z0-9_-]{2,60}$'
    or char_length(coalesce(p_buyer_note, '')) > 2000
    or jsonb_typeof(p_line_items) <> 'array' then
    raise exception 'INVALID_RETURN_REQUEST' using errcode = '22023';
  end if;
  select * into request_record from public.return_requests
  where order_id = p_order_id and request_kind = p_request_kind
    and idempotency_key_hash = p_idempotency_key_hash;
  if found then return request_record; end if;

  select * into order_record from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  if auth.uid() is not null and order_record.customer_profile_id = auth.uid() then
    actor_class := 'customer';
  elsif app_private.is_service_context()
    and order_record.customer_profile_id is not null then
    actor_class := 'customer';
  elsif app_private.is_service_context()
    and order_record.guest_session_id is not null
    and order_record.guest_proof_hash = p_guest_proof_hash
    and order_record.guest_proof_expires_at > statement_timestamp() then
    actor_class := 'guest';
  else
    raise exception 'RETURN_ACCESS_DENIED' using errcode = '42501';
  end if;

  select * into policy_record from public.return_policies
  where active and effective_at <= statement_timestamp()
  order by effective_at desc limit 1;
  eligibility := public.evaluate_return_eligibility(p_order_id, p_request_kind);
  if not coalesce((eligibility ->> 'eligible')::boolean, false) then
    raise exception 'RETURN_NOT_ELIGIBLE:%', eligibility ->> 'reasonCode' using errcode = '55000';
  end if;
  if not (p_reason_code = any(policy_record.allowed_reasons)) then
    raise exception 'RETURN_REASON_NOT_ALLOWED' using errcode = '22023';
  end if;

  target_prefix := case when p_request_kind = 'return' then 'RET' else 'CAN' end;
  insert into public.return_requests (
    reference, order_id, customer_profile_id, guest_session_id, request_kind,
    policy_id, policy_version, policy_snapshot, eligibility_snapshot,
    reason_code, buyer_note, buyer_locale, idempotency_key_hash, expires_at
  ) values (
    target_prefix || '-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 12)),
    order_record.id, order_record.customer_profile_id, order_record.guest_session_id,
    p_request_kind, policy_record.id, policy_record.version,
    jsonb_build_object(
      'version', policy_record.version,
      'versionNumber', policy_record.version_number,
      'cancellationWindowHours', policy_record.cancellation_window_hours,
      'returnWindowDays', policy_record.return_window_days,
      'legalStatus', policy_record.legal_status,
      'restockMode', policy_record.restock_mode,
      'buyerCopy', policy_record.buyer_copy
    ),
    eligibility, p_reason_code, nullif(btrim(p_buyer_note), ''),
    order_record.locale, p_idempotency_key_hash,
    coalesce((eligibility ->> 'deadline')::timestamptz, statement_timestamp() + interval '30 days')
  ) returning * into request_record;

  if p_request_kind = 'cancellation' and jsonb_array_length(p_line_items) = 0 then
    insert into public.return_items (return_request_id, order_line_id, quantity)
    select request_record.id, line.id, line.quantity
    from public.order_lines line where line.order_id = order_record.id;
  else
    if jsonb_array_length(p_line_items) not between 1 and 100 then
      raise exception 'RETURN_ITEMS_REQUIRED' using errcode = '22023';
    end if;
    if exists (
      select 1
      from jsonb_to_recordset(p_line_items) as selected("lineId" text, quantity integer)
      left join public.order_lines line
        on line.id = selected."lineId"::uuid and line.order_id = order_record.id
      where line.id is null or selected.quantity is null or selected.quantity < 1
        or selected.quantity > line.quantity
    ) then
      raise exception 'INVALID_RETURN_ITEMS' using errcode = '22023';
    end if;
    if exists (
      select 1
      from jsonb_to_recordset(p_line_items) as selected("lineId" text, quantity integer)
      join public.order_lines line on line.id = selected."lineId"::uuid
      where selected.quantity + coalesce((
        select sum(existing_item.quantity)
        from public.return_items existing_item
        join public.return_requests existing_request on existing_request.id = existing_item.return_request_id
        where existing_item.order_line_id = line.id
          and existing_request.status not in ('rejected', 'cancelled')
      ), 0) > line.quantity
    ) then
      raise exception 'RETURN_QUANTITY_EXCEEDED' using errcode = '22003';
    end if;
    insert into public.return_items (return_request_id, order_line_id, quantity)
    select request_record.id, selected."lineId"::uuid, selected.quantity
    from jsonb_to_recordset(p_line_items) as selected("lineId" text, quantity integer);
  end if;
  select count(*) into item_count from public.return_items where return_request_id = request_record.id;

  insert into public.return_events (
    return_request_id, event_type, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    request_record.id, 'request-submitted', 'requested', actor_class,
    case when actor_class = 'customer' then order_record.customer_profile_id else null end,
    request_record.correlation_id,
    jsonb_build_object('requestKind', p_request_kind, 'itemCount', item_count)
  );
  perform app_private.enqueue_order_notification(
    order_record.id,
    'return-submitted',
    'return-submitted',
    jsonb_build_object('returnReference', request_record.reference),
    ':' || request_record.id::text
  );
  perform app_private.write_audit_event(
    actor_class, 'return.submit', 'return_request', request_record.id::text,
    'succeeded', 'returns', request_record.correlation_id,
    jsonb_build_object('requestKind', p_request_kind, 'status', request_record.status)
  );
  return request_record;
end;
$$;

create or replace function app_private.apply_return_transition(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_target_status public.return_request_status,
  p_reason text,
  p_idempotency_key text,
  p_event_type text
)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
  existing_decision public.return_decisions;
  previous_status public.return_request_status;
  actor_class text := app_private.return_actor_class();
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_reason)) not between 2 and 2000
    or char_length(p_idempotency_key) not between 16 and 180
    or p_event_type !~ '^[a-z0-9-]{2,80}$' then
    raise exception 'INVALID_RETURN_TRANSITION' using errcode = '22023';
  end if;
  select * into existing_decision from public.return_decisions
  where idempotency_key = p_idempotency_key;
  if found then
    select * into request_record from public.return_requests
    where id = existing_decision.return_request_id;
    if request_record.id <> p_return_request_id then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505';
    end if;
    return request_record;
  end if;
  select * into request_record from public.return_requests
  where id = p_return_request_id for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  if request_record.version <> p_expected_version then
    raise exception 'RETURN_VERSION_CONFLICT' using errcode = '40001';
  end if;
  previous_status := request_record.status;
  if not app_private.return_transition_allowed(previous_status, p_target_status) then
    raise exception 'INVALID_RETURN_TRANSITION' using errcode = '55000';
  end if;
  update public.return_requests set
    status = p_target_status,
    decision_reason = case
      when p_target_status in ('approved', 'rejected') then btrim(p_reason)
      else decision_reason
    end,
    decision_by = case
      when p_target_status in ('approved', 'rejected') then auth.uid()
      else decision_by
    end,
    decided_at = case
      when p_target_status in ('approved', 'rejected') then statement_timestamp()
      else decided_at
    end,
    closed_at = case when p_target_status = 'closed' then statement_timestamp() else closed_at end,
    version = version + 1
  where id = request_record.id returning * into request_record;
  insert into public.return_decisions (
    return_request_id, decision, reason, decided_by, actor_class,
    idempotency_key, correlation_id
  ) values (
    request_record.id,
    case
      when p_target_status = 'needs_information' then 'information_requested'
      when p_target_status = 'approved' then 'approved'
      when p_target_status = 'rejected' then 'rejected'
      else 'closed'
    end,
    btrim(p_reason), auth.uid(), actor_class, p_idempotency_key, correlation
  );
  if p_target_status = 'needs_information' then
    insert into public.return_messages (
      return_request_id, audience, body, created_by, actor_class
    ) values (request_record.id, 'buyer', btrim(p_reason), auth.uid(), actor_class);
  end if;
  insert into public.return_events (
    return_request_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    request_record.id, p_event_type, previous_status, p_target_status,
    actor_class, auth.uid(), correlation,
    jsonb_build_object('reason', btrim(p_reason), 'idempotencyKey', p_idempotency_key)
  );
  perform app_private.enqueue_order_notification(
    request_record.order_id,
    'return-' || replace(p_target_status::text, '_', '-'),
    'return-' || replace(p_target_status::text, '_', '-'),
    jsonb_build_object('returnReference', request_record.reference),
    ':' || request_record.id::text || ':' || p_target_status::text
  );
  perform app_private.write_audit_event(
    actor_class, 'return.transition', 'return_request', request_record.id::text,
    'succeeded', 'returns', correlation,
    jsonb_build_object('fromStatus', previous_status, 'toStatus', p_target_status)
  );
  return request_record;
end;
$$;

create or replace function public.request_return_information(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_message text,
  p_idempotency_key text
)
returns public.return_requests
language sql
security definer
set search_path = ''
as $$
  select app_private.apply_return_transition(
    p_return_request_id, p_expected_version, 'needs_information',
    p_message, p_idempotency_key, 'information-requested'
  );
$$;

create or replace function public.decide_return_request(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_approve boolean,
  p_reason text,
  p_idempotency_key text
)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
  order_record public.orders;
begin
  request_record := app_private.apply_return_transition(
    p_return_request_id,
    p_expected_version,
    case when p_approve then 'approved'::public.return_request_status else 'rejected'::public.return_request_status end,
    p_reason,
    p_idempotency_key,
    case when p_approve then 'request-approved' else 'request-rejected' end
  );
  if p_approve and request_record.request_kind = 'cancellation' then
    select * into order_record from public.orders where id = request_record.order_id;
    if order_record.status <> 'cancelled' then
      perform public.transition_order(
        order_record.id,
        order_record.version,
        'cancelled',
        'Approved cancellation ' || request_record.reference,
        'return-cancel:' || request_record.id::text
      );
    end if;
  end if;
  return request_record;
end;
$$;

create or replace function public.mark_return_in_transit(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_note text,
  p_idempotency_key text
)
returns public.return_requests
language sql
security definer
set search_path = ''
as $$
  select app_private.apply_return_transition(
    p_return_request_id, p_expected_version, 'in_transit',
    p_note, p_idempotency_key, 'return-in-transit'
  );
$$;

create or replace function public.record_return_receipt(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_note text,
  p_idempotency_key text
)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
begin
  request_record := app_private.apply_return_transition(
    p_return_request_id, p_expected_version, 'received',
    p_note, p_idempotency_key, 'return-received'
  );
  update public.return_requests set received_at = coalesce(received_at, statement_timestamp())
  where id = request_record.id returning * into request_record;
  return request_record;
end;
$$;

create or replace function public.inspect_return_request(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_summary text,
  p_package_condition text,
  p_items jsonb,
  p_idempotency_key text
)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
  order_record public.orders;
  previous_status public.return_request_status;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.return_actor_class();
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_summary)) not between 2 and 2000
    or char_length(coalesce(p_package_condition, '')) > 500
    or char_length(p_idempotency_key) not between 16 and 180
    or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_RETURN_INSPECTION' using errcode = '22023';
  end if;
  if exists (select 1 from public.return_decisions where idempotency_key = p_idempotency_key) then
    select * into request_record from public.return_requests where id = p_return_request_id;
    return request_record;
  end if;
  select * into request_record from public.return_requests
  where id = p_return_request_id for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  if request_record.version <> p_expected_version then
    raise exception 'RETURN_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if request_record.status <> 'received' then
    raise exception 'RETURN_NOT_RECEIVED' using errcode = '55000';
  end if;
  if jsonb_array_length(p_items) <> (
    select count(*) from public.return_items where return_request_id = request_record.id
  ) then
    raise exception 'RETURN_INSPECTION_ITEMS_INCOMPLETE' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as inspected(
      "itemId" text,
      condition text,
      "restockDecision" text,
      "refundAmountMinor" bigint,
      note text
    )
    left join public.return_items item
      on item.id = inspected."itemId"::uuid and item.return_request_id = request_record.id
    left join public.order_lines line on line.id = item.order_line_id
    where item.id is null
      or inspected.condition not in ('unopened', 'like_new', 'used', 'damaged', 'missing')
      or inspected."restockDecision" not in ('restock', 'do_not_restock')
      or inspected."refundAmountMinor" < 0
      or inspected."refundAmountMinor" > line.total_minor
      or char_length(coalesce(inspected.note, '')) > 1000
  ) then
    raise exception 'INVALID_RETURN_INSPECTION_ITEMS' using errcode = '22023';
  end if;
  select * into order_record from public.orders where id = request_record.order_id;
  if (
    select coalesce(sum(inspected."refundAmountMinor"), 0)
    from jsonb_to_recordset(p_items) as inspected("refundAmountMinor" bigint)
  ) > order_record.total_minor then
    raise exception 'RETURN_REFUND_EXCEEDS_ORDER' using errcode = '22003';
  end if;

  update public.return_items item set
    condition = inspected.condition::public.return_item_condition,
    restock_decision = inspected."restockDecision"::public.restock_decision,
    refund_amount_minor = inspected."refundAmountMinor",
    inspection_note = nullif(btrim(inspected.note), ''),
    version = item.version + 1
  from jsonb_to_recordset(p_items) as inspected(
    "itemId" text,
    condition text,
    "restockDecision" text,
    "refundAmountMinor" bigint,
    note text
  )
  where item.id = inspected."itemId"::uuid and item.return_request_id = request_record.id;
  insert into public.return_inspections (
    return_request_id, summary, received_package_condition,
    inspected_by, correlation_id
  ) values (
    request_record.id, btrim(p_summary), nullif(btrim(p_package_condition), ''),
    auth.uid(), correlation
  );
  previous_status := request_record.status;
  update public.return_requests set
    status = 'inspected', inspected_at = statement_timestamp(), version = version + 1
  where id = request_record.id returning * into request_record;
  insert into public.return_decisions (
    return_request_id, decision, reason, decided_by, actor_class,
    idempotency_key, correlation_id
  ) values (
    request_record.id, 'closed', btrim(p_summary), auth.uid(), actor_class,
    p_idempotency_key, correlation
  );
  insert into public.return_events (
    return_request_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    request_record.id, 'return-inspected', previous_status, 'inspected',
    actor_class, auth.uid(), correlation,
    jsonb_build_object(
      'itemCount', jsonb_array_length(p_items),
      'refundableMinor', (select coalesce(sum(refund_amount_minor), 0) from public.return_items where return_request_id = request_record.id)
    )
  );
  perform app_private.enqueue_order_notification(
    request_record.order_id, 'return-inspected', 'return-inspected',
    jsonb_build_object('returnReference', request_record.reference),
    ':' || request_record.id::text
  );
  perform app_private.write_audit_event(
    actor_class, 'return.inspect', 'return_request', request_record.id::text,
    'succeeded', 'returns', correlation,
    jsonb_build_object('itemCount', jsonb_array_length(p_items))
  );
  return request_record;
end;
$$;

create or replace function public.process_return_refund(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_reason text,
  p_idempotency_key text,
  p_provider_reference text
)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
  refund_record public.refund_records;
  refund_total bigint;
  previous_status public.return_request_status;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.return_actor_class();
begin
  perform app_private.assert_manager();
  select * into request_record from public.return_requests
  where id = p_return_request_id for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.return_refund_links where idempotency_key = p_idempotency_key
  ) then return request_record; end if;
  if request_record.version <> p_expected_version then
    raise exception 'RETURN_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if request_record.status not in ('inspected', 'refund_pending') then
    raise exception 'RETURN_NOT_REFUNDABLE' using errcode = '55000';
  end if;
  select coalesce(sum(refund_amount_minor), 0) into refund_total
  from public.return_items where return_request_id = request_record.id;
  if refund_total <= 0 then raise exception 'RETURN_REFUND_AMOUNT_REQUIRED' using errcode = '22023'; end if;
  refund_record := public.issue_refund(
    request_record.order_id, refund_total, p_reason,
    p_idempotency_key, p_provider_reference
  );
  previous_status := request_record.status;
  update public.return_requests set
    status = 'refunded', refunded_at = statement_timestamp(), version = version + 1
  where id = request_record.id returning * into request_record;
  insert into public.return_refund_links (
    return_request_id, refund_record_id, idempotency_key
  ) values (request_record.id, refund_record.id, p_idempotency_key);
  insert into public.return_events (
    return_request_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    request_record.id, 'return-refunded', previous_status, 'refunded',
    actor_class, auth.uid(), correlation,
    jsonb_build_object('refundAmountMinor', refund_total, 'refundRecordId', refund_record.id)
  );
  perform app_private.enqueue_order_notification(
    request_record.order_id, 'return-refunded', 'return-refunded',
    jsonb_build_object('returnReference', request_record.reference, 'refundAmountMinor', refund_total),
    ':' || request_record.id::text
  );
  perform app_private.write_audit_event(
    actor_class, 'return.refund', 'return_request', request_record.id::text,
    'succeeded', 'returns', correlation,
    jsonb_build_object('refundAmountMinor', refund_total)
  );
  return request_record;
end;
$$;

create or replace function public.apply_return_restock(
  p_return_request_id uuid,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
  item_record record;
  inventory_record public.inventory_items;
  adjustment_record public.inventory_adjustments;
  effect_key text;
  applied integer := 0;
begin
  perform app_private.assert_manager();
  if char_length(p_idempotency_key) not between 16 and 100 then
    raise exception 'INVALID_RESTOCK_KEY' using errcode = '22023';
  end if;
  select * into request_record from public.return_requests
  where id = p_return_request_id for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  if request_record.status not in ('inspected', 'refund_pending', 'refunded', 'closed') then
    raise exception 'RETURN_NOT_INSPECTED' using errcode = '55000';
  end if;
  for item_record in
    select item.id, item.quantity, line.product_id
    from public.return_items item
    join public.order_lines line on line.id = item.order_line_id
    where item.return_request_id = request_record.id
      and item.restock_decision = 'restock'
    order by item.id
  loop
    effect_key := p_idempotency_key || ':' || item_record.id::text;
    if exists (select 1 from public.return_restock_links where idempotency_key = effect_key) then
      continue;
    end if;
    select * into inventory_record from public.inventory_items
    where product_id = item_record.product_id;
    perform public.adjust_catalog_inventory(
      item_record.product_id,
      inventory_record.version,
      item_record.quantity,
      'Inspected return ' || request_record.reference,
      effect_key
    );
    select * into adjustment_record from public.inventory_adjustments
    where idempotency_key = effect_key;
    insert into public.return_restock_links (
      return_request_id, return_item_id, inventory_adjustment_id,
      idempotency_key, applied_by
    ) values (
      request_record.id, item_record.id, adjustment_record.id,
      effect_key, auth.uid()
    );
    applied := applied + 1;
  end loop;
  return applied;
end;
$$;

create or replace function public.close_return_request(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_reason text,
  p_idempotency_key text
)
returns public.return_requests
language sql
security definer
set search_path = ''
as $$
  select app_private.apply_return_transition(
    p_return_request_id, p_expected_version, 'closed',
    p_reason, p_idempotency_key, 'return-closed'
  );
$$;

create or replace function public.cancel_buyer_return_request(
  p_return_request_id uuid,
  p_expected_version bigint,
  p_reason text,
  p_idempotency_key text,
  p_guest_proof_hash text default null
)
returns public.return_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
  existing_decision public.return_decisions;
  previous_status public.return_request_status;
  actor_class text;
  correlation uuid := extensions.gen_random_uuid();
begin
  if char_length(btrim(p_reason)) not between 2 and 500
    or char_length(p_idempotency_key) not between 16 and 180 then
    raise exception 'INVALID_RETURN_CANCELLATION' using errcode = '22023';
  end if;
  select * into existing_decision from public.return_decisions where idempotency_key = p_idempotency_key;
  if found then
    select * into request_record from public.return_requests where id = existing_decision.return_request_id;
    return request_record;
  end if;
  select * into request_record from public.return_requests
  where id = p_return_request_id for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  perform app_private.assert_return_request_access(request_record, p_guest_proof_hash);
  if request_record.version <> p_expected_version then
    raise exception 'RETURN_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if request_record.status not in ('requested', 'needs_information') then
    raise exception 'RETURN_CANNOT_BE_CANCELLED' using errcode = '55000';
  end if;
  actor_class := case when request_record.customer_profile_id is null then 'guest' else 'customer' end;
  previous_status := request_record.status;
  update public.return_requests set status = 'cancelled', closed_at = statement_timestamp(), version = version + 1
  where id = request_record.id returning * into request_record;
  insert into public.return_decisions (
    return_request_id, decision, reason, decided_by, actor_class,
    idempotency_key, correlation_id
  ) values (
    request_record.id, 'cancelled', btrim(p_reason),
    request_record.customer_profile_id, actor_class, p_idempotency_key, correlation
  );
  insert into public.return_events (
    return_request_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    request_record.id, 'request-cancelled', previous_status, 'cancelled', actor_class,
    request_record.customer_profile_id, correlation, jsonb_build_object('reason', btrim(p_reason))
  );
  return request_record;
end;
$$;

create or replace function public.attach_return_evidence(
  p_return_request_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_content_type text,
  p_byte_size bigint,
  p_checksum text,
  p_guest_proof_hash text default null
)
returns public.return_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.return_requests;
  policy_record public.return_policies;
  evidence_record public.return_evidence;
begin
  select * into request_record from public.return_requests
  where id = p_return_request_id for update;
  if not found then raise exception 'RETURN_REQUEST_NOT_FOUND' using errcode = 'P0002'; end if;
  perform app_private.assert_return_request_access(request_record, p_guest_proof_hash);
  select * into policy_record from public.return_policies where id = request_record.policy_id;
  if request_record.status not in ('requested', 'needs_information')
    or p_content_type <> all(policy_record.allowed_evidence_types)
    or p_byte_size > policy_record.max_evidence_bytes
    or p_checksum !~ '^[a-f0-9]{64}$'
    or p_storage_path !~ ('^' || request_record.id::text || '/[A-Za-z0-9_.-]+$')
    or char_length(p_original_filename) not between 1 and 255 then
    raise exception 'INVALID_RETURN_EVIDENCE' using errcode = '22023';
  end if;
  if (
    select count(*) from public.return_evidence
    where return_request_id = request_record.id and status in ('pending', 'attached')
  ) >= policy_record.max_evidence_files then
    raise exception 'RETURN_EVIDENCE_LIMIT' using errcode = '22003';
  end if;
  insert into public.return_evidence (
    return_request_id, storage_path, original_filename, content_type,
    byte_size, checksum, status, retention_until, attached_at
  ) values (
    request_record.id, p_storage_path, p_original_filename, p_content_type,
    p_byte_size, p_checksum, 'attached',
    greatest(request_record.created_at + interval '3 years', statement_timestamp() + interval '90 days'),
    statement_timestamp()
  ) returning * into evidence_record;
  return evidence_record;
end;
$$;

create or replace function public.remove_return_evidence(
  p_evidence_id uuid,
  p_guest_proof_hash text default null
)
returns public.return_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_record public.return_evidence;
  request_record public.return_requests;
begin
  select * into evidence_record from public.return_evidence where id = p_evidence_id for update;
  if not found then raise exception 'RETURN_EVIDENCE_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into request_record from public.return_requests where id = evidence_record.return_request_id;
  perform app_private.assert_return_request_access(request_record, p_guest_proof_hash);
  if request_record.status not in ('requested', 'needs_information') then
    raise exception 'RETURN_EVIDENCE_LOCKED' using errcode = '55000';
  end if;
  update public.return_evidence set status = 'removed', removed_at = statement_timestamp()
  where id = evidence_record.id and status in ('pending', 'attached')
  returning * into evidence_record;
  return evidence_record;
end;
$$;

create or replace function public.cleanup_abandoned_return_evidence(p_limit integer default 100)
returns table (evidence_id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_limit not between 1 and 500 then
    raise exception 'INVALID_CLEANUP_LIMIT' using errcode = '22023';
  end if;
  return query
  with candidates as (
    select evidence.id
    from public.return_evidence evidence
    where evidence.status = 'pending'
      and evidence.created_at < statement_timestamp() - interval '24 hours'
    order by evidence.created_at
    for update skip locked
    limit p_limit
  )
  update public.return_evidence evidence
  set status = 'expired', removed_at = statement_timestamp()
  from candidates where evidence.id = candidates.id
  returning evidence.id, evidence.storage_path;
end;
$$;

create or replace function public.configure_return_policy(
  p_version text,
  p_cancellation_window_hours integer,
  p_return_window_days integer,
  p_allowed_reasons text[],
  p_max_evidence_files integer,
  p_max_evidence_bytes bigint,
  p_restock_mode text
)
returns public.return_policies
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_policy public.return_policies;
  next_policy public.return_policies;
begin
  perform app_private.assert_manager();
  if p_version !~ '^[A-Za-z0-9_.-]{3,80}$'
    or p_cancellation_window_hours not between 0 and 720
    or p_return_window_days not between 0 and 365
    or cardinality(p_allowed_reasons) not between 1 and 30
    or p_max_evidence_files not between 0 and 10
    or p_max_evidence_bytes not between 1024 and 10485760
    or p_restock_mode not in ('after_inspection', 'never') then
    raise exception 'INVALID_RETURN_POLICY' using errcode = '22023';
  end if;
  select * into current_policy from public.return_policies where active for update;
  update public.return_policies set active = false where active;
  insert into public.return_policies (
    version, cancellation_window_hours, return_window_days, allowed_reasons,
    max_evidence_files, max_evidence_bytes, allowed_evidence_types,
    restock_mode, legal_status, buyer_copy, active, effective_at, created_by
  ) values (
    p_version, p_cancellation_window_hours, p_return_window_days, p_allowed_reasons,
    p_max_evidence_files, p_max_evidence_bytes,
    coalesce(current_policy.allowed_evidence_types, array['image/jpeg', 'image/png', 'image/webp']),
    p_restock_mode, 'draft_unapproved',
    coalesce(current_policy.buyer_copy, '{}'::jsonb), true,
    statement_timestamp(), auth.uid()
  ) returning * into next_policy;
  perform app_private.write_audit_event(
    app_private.return_actor_class(), 'return.policy.configure', 'return_policy',
    next_policy.id::text, 'succeeded', 'returns', extensions.gen_random_uuid(),
    jsonb_build_object('version', next_policy.version, 'legalStatus', next_policy.legal_status)
  );
  return next_policy;
end;
$$;

revoke all on function public.evaluate_return_eligibility(uuid, public.return_request_kind) from public, anon;
revoke all on function public.submit_return_request(uuid, public.return_request_kind, text, text, jsonb, text, text) from public, anon;
revoke all on function public.request_return_information(uuid, bigint, text, text) from public, anon;
revoke all on function public.decide_return_request(uuid, bigint, boolean, text, text) from public, anon;
revoke all on function public.mark_return_in_transit(uuid, bigint, text, text) from public, anon;
revoke all on function public.record_return_receipt(uuid, bigint, text, text) from public, anon;
revoke all on function public.inspect_return_request(uuid, bigint, text, text, jsonb, text) from public, anon;
revoke all on function public.process_return_refund(uuid, bigint, text, text, text) from public, anon;
revoke all on function public.apply_return_restock(uuid, text) from public, anon;
revoke all on function public.close_return_request(uuid, bigint, text, text) from public, anon;
revoke all on function public.cancel_buyer_return_request(uuid, bigint, text, text, text) from public, anon;
revoke all on function public.attach_return_evidence(uuid, text, text, text, bigint, text, text) from public, anon;
revoke all on function public.remove_return_evidence(uuid, text) from public, anon;
revoke all on function public.cleanup_abandoned_return_evidence(integer) from public, anon, authenticated;
revoke all on function public.configure_return_policy(text, integer, integer, text[], integer, bigint, text) from public, anon;

grant execute on function public.evaluate_return_eligibility(uuid, public.return_request_kind) to authenticated, service_role;
grant execute on function public.submit_return_request(uuid, public.return_request_kind, text, text, jsonb, text, text) to authenticated, service_role;
grant execute on function public.request_return_information(uuid, bigint, text, text) to authenticated, service_role;
grant execute on function public.decide_return_request(uuid, bigint, boolean, text, text) to authenticated, service_role;
grant execute on function public.mark_return_in_transit(uuid, bigint, text, text) to authenticated, service_role;
grant execute on function public.record_return_receipt(uuid, bigint, text, text) to authenticated, service_role;
grant execute on function public.inspect_return_request(uuid, bigint, text, text, jsonb, text) to authenticated, service_role;
grant execute on function public.process_return_refund(uuid, bigint, text, text, text) to authenticated, service_role;
grant execute on function public.apply_return_restock(uuid, text) to authenticated, service_role;
grant execute on function public.close_return_request(uuid, bigint, text, text) to authenticated, service_role;
grant execute on function public.cancel_buyer_return_request(uuid, bigint, text, text, text) to authenticated, service_role;
grant execute on function public.attach_return_evidence(uuid, text, text, text, bigint, text, text) to authenticated, service_role;
grant execute on function public.remove_return_evidence(uuid, text) to authenticated, service_role;
grant execute on function public.cleanup_abandoned_return_evidence(integer) to service_role;
grant execute on function public.configure_return_policy(text, integer, integer, text[], integer, bigint, text) to authenticated, service_role;
