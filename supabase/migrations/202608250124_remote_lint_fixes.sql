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
  on conflict on constraint idempotency_keys_scope_key_hash_actor_fingerprint_key do nothing;

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

create or replace function app_private.allocate_minor(
  total_amount bigint,
  weights bigint[]
)
returns bigint[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  weight_total numeric;
  allocations bigint[] := array[]::bigint[];
  remainders numeric[] := array[]::numeric[];
  remaining bigint;
  chosen_index integer;
begin
  if total_amount < 0 or cardinality(weights) = 0
    or exists (select 1 from unnest(weights) weight where weight < 0) then
    raise exception 'INVALID_ALLOCATION' using errcode = '22023';
  end if;
  select sum(weight)::numeric into weight_total from unnest(weights) weight;
  if weight_total <= 0 then raise exception 'INVALID_ALLOCATION' using errcode = '22023'; end if;
  for index_value in 1..cardinality(weights) loop
    allocations := array_append(allocations, floor(total_amount::numeric * weights[index_value] / weight_total)::bigint);
    remainders := array_append(remainders, mod(total_amount::numeric * weights[index_value], weight_total));
  end loop;
  remaining := total_amount - (select sum(value) from unnest(allocations) value);
  while remaining > 0 loop
    select candidate.index_value into chosen_index
    from generate_subscripts(remainders, 1) candidate(index_value)
    order by remainders[candidate.index_value] desc, candidate.index_value
    limit 1;
    allocations[chosen_index] := allocations[chosen_index] + 1;
    remainders[chosen_index] := -1;
    remaining := remaining - 1;
  end loop;
  return allocations;
end;
$$;

create or replace function public.attach_hosted_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_reference text
)
returns public.payment_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_record public.payment_attempts;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(p_provider) not between 2 and 80
    or char_length(p_provider_reference) not between 2 and 180 then
    raise exception 'INVALID_PROVIDER_PAYMENT' using errcode = '22023';
  end if;
  perform 1
  from public.orders
  where id = p_order_id and payment_method = 'hosted_payment'
  for update;
  if not found then raise exception 'HOSTED_PAYMENT_ORDER_REQUIRED' using errcode = '55000'; end if;
  select * into payment_record from public.payment_attempts
  where order_id = p_order_id and method = 'hosted_payment'
  order by created_at desc limit 1 for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if payment_record.provider_reference is not null then
    if payment_record.provider <> p_provider
      or payment_record.provider_reference <> p_provider_reference then
      raise exception 'PROVIDER_PAYMENT_CONFLICT' using errcode = '23505';
    end if;
    return payment_record;
  end if;
  update public.payment_attempts
  set provider = p_provider, provider_reference = p_provider_reference
  where id = payment_record.id returning * into payment_record;
  insert into public.payment_events (
    payment_attempt_id, event_type, from_status, to_status,
    provider_event_key, correlation_id, safe_metadata
  ) values (
    payment_record.id, 'provider-payment-created', 'pending', 'pending',
    'initialized:' || p_provider_reference, correlation,
    jsonb_build_object('provider', p_provider)
  );
  perform app_private.write_audit_event(
    'service', 'payment.attach-provider', 'order', p_order_id::text,
    'succeeded', 'checkout', correlation, jsonb_build_object('provider', p_provider)
  );
  return payment_record;
end;
$$;

create or replace function public.respond_manual_quote(
  p_quote_id uuid,
  p_proof_hash text,
  p_accept boolean,
  p_expected_version bigint,
  p_idempotency_key_hash text
)
returns public.manual_quote_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_record public.manual_quote_requests;
  target_status public.manual_quote_status := case
    when p_accept then 'accepted'::public.manual_quote_status
    else 'declined'::public.manual_quote_status
  end;
begin
  if p_idempotency_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_QUOTE_RESPONSE' using errcode = '22023';
  end if;
  if exists (select 1 from public.manual_quote_events event
    where event.manual_quote_id = p_quote_id and event.event_type = target_status::text
      and event.idempotency_key_hash = p_idempotency_key_hash) then
    select * into quote_record from public.manual_quote_requests where id = p_quote_id;
    return quote_record;
  end if;
  select * into quote_record from public.manual_quote_requests where id = p_quote_id for update;
  if not found then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if not (
    public.is_active_staff()
    or (auth.uid() is not null and quote_record.customer_profile_id = auth.uid())
    or (quote_record.guest_session_id is not null and quote_record.guest_proof_hash = p_proof_hash)
  ) then raise exception 'QUOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if quote_record.version <> p_expected_version then raise exception 'QUOTE_VERSION_CONFLICT' using errcode = '40001'; end if;
  if quote_record.status <> 'quoted' or quote_record.expires_at <= statement_timestamp() then
    raise exception 'QUOTE_UNAVAILABLE' using errcode = '55000';
  end if;
  update public.manual_quote_requests set status = target_status, version = version + 1
  where id = p_quote_id returning * into quote_record;
  insert into public.manual_quote_events (
    manual_quote_id, event_type, from_status, to_status, actor_profile_id,
    actor_class, idempotency_key_hash, correlation_id
  ) values (
    quote_record.id, target_status::text, 'quoted', quote_record.status, auth.uid(),
    case when quote_record.customer_profile_id is null then 'guest' else 'customer' end,
    p_idempotency_key_hash, quote_record.correlation_id
  );
  perform app_private.enqueue_manual_quote_notification(
    quote_record, 'quote-' || target_status::text, 'quote-' || target_status::text,
    p_idempotency_key_hash
  );
  return quote_record;
end;
$$;
