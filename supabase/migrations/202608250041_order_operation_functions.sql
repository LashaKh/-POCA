create or replace function app_private.order_actor_class()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'service'
    else coalesce(
      (select staff.role::text from public.staff_members staff
       where staff.profile_id = auth.uid() and staff.active),
      'service'
    )
  end;
$$;

create or replace function app_private.enqueue_order_notification(
  p_order_id uuid,
  p_purpose text,
  p_template_key text,
  p_payload jsonb default '{}'::jsonb,
  p_idempotency_suffix text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  notification_id uuid;
  target_idempotency_key text;
begin
  if jsonb_typeof(p_payload) <> 'object'
    or char_length(p_purpose) not between 1 and 100
    or char_length(p_template_key) not between 1 and 120 then
    raise exception 'INVALID_NOTIFICATION' using errcode = '22023';
  end if;
  select * into order_record from public.orders where id = p_order_id;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;

  target_idempotency_key := p_purpose || ':' || p_order_id::text || p_idempotency_suffix;
  insert into public.notifications (
    purpose, locale, template_key, recipient_hash, payload,
    idempotency_key, correlation_id
  ) values (
    p_purpose, order_record.locale, p_template_key,
    encode(extensions.digest(lower(order_record.contact_email::text)::bytea, 'sha256'), 'hex'),
    jsonb_build_object(
      'recipientEmail', lower(order_record.contact_email::text),
      'orderReference', order_record.reference,
      'amountMinor', order_record.total_minor,
      'currency', order_record.currency
    ) || p_payload,
    target_idempotency_key, extensions.gen_random_uuid()
  )
  on conflict (idempotency_key) do nothing
  returning id into notification_id;

  if notification_id is null then
    select id into notification_id from public.notifications
    where notifications.idempotency_key = target_idempotency_key;
  end if;
  insert into public.order_notification_links (order_id, notification_id, purpose)
  values (p_order_id, notification_id, p_purpose)
  on conflict do nothing;
  return notification_id;
end;
$$;

create or replace function public.transition_order(
  p_order_id uuid,
  p_expected_version bigint,
  p_target_status public.order_status,
  p_reason text,
  p_idempotency_key text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  previous_status public.order_status;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.order_actor_class();
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_reason)) not between 2 and 500
    or char_length(p_idempotency_key) not between 16 and 180 then
    raise exception 'INVALID_ORDER_TRANSITION' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.order_events event
    where event.order_id = p_order_id
      and event.safe_metadata ->> 'idempotencyKey' = p_idempotency_key
  ) then
    select * into order_record from public.orders where id = p_order_id;
    return order_record;
  end if;

  select * into order_record from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  if order_record.version <> p_expected_version then
    raise exception 'ORDER_VERSION_CONFLICT' using errcode = '40001';
  end if;
  previous_status := order_record.status;
  if not (
    (previous_status in ('bank_transfer_pending', 'payment_pending') and p_target_status in ('cancelled', 'expired'))
    or (previous_status = 'confirmed' and p_target_status in ('processing', 'cancelled'))
    or (previous_status = 'processing' and p_target_status = 'cancelled')
  ) then
    raise exception 'INVALID_ORDER_TRANSITION' using errcode = '55000';
  end if;

  if p_target_status in ('cancelled', 'expired') then
    perform public.release_order_reservations(
      p_order_id,
      case when p_target_status = 'expired' then 'order-expired' else 'order-cancelled' end,
      p_target_status = 'expired'
    );
  end if;
  update public.orders
  set status = p_target_status,
      payment_status = case
        when p_target_status = 'cancelled' and payment_status not in ('paid', 'refunded', 'partially_refunded') then 'cancelled'::public.payment_status
        when p_target_status = 'expired' then 'expired'::public.payment_status
        else payment_status
      end
  where id = p_order_id returning * into order_record;

  insert into public.order_events (
    order_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    p_order_id, 'order-transition', previous_status, p_target_status,
    actor_class, auth.uid(), correlation,
    jsonb_build_object('reason', btrim(p_reason), 'idempotencyKey', p_idempotency_key)
  );
  if p_target_status = 'cancelled' then
    perform app_private.enqueue_order_notification(
      p_order_id, 'order-cancelled', 'order-cancelled',
      jsonb_build_object('reason', btrim(p_reason))
    );
  end if;
  perform app_private.write_audit_event(
    actor_class, 'order.transition', 'order', p_order_id::text, 'succeeded',
    'order-operations', correlation,
    jsonb_build_object('fromStatus', previous_status, 'toStatus', p_target_status)
  );
  return order_record;
end;
$$;

create or replace function public.record_provider_event(
  p_provider text,
  p_event_key text,
  p_event_type text,
  p_subject_reference text,
  p_payload_hash text,
  p_signature_valid boolean,
  p_safe_metadata jsonb default '{}'::jsonb
)
returns public.provider_event_inbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  inbox_record public.provider_event_inbox;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(p_provider) not between 1 and 80
    or char_length(p_event_key) not between 1 and 180
    or char_length(p_event_type) not between 1 and 100
    or p_payload_hash !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_safe_metadata) <> 'object' then
    raise exception 'INVALID_PROVIDER_EVENT' using errcode = '22023';
  end if;
  insert into public.provider_event_inbox (
    provider, event_key, event_type, subject_reference, payload_hash,
    signature_valid, status, safe_metadata
  ) values (
    p_provider, p_event_key, p_event_type, nullif(p_subject_reference, ''),
    p_payload_hash, p_signature_valid,
    case when p_signature_valid then 'received' else 'rejected' end,
    p_safe_metadata
  ) on conflict (provider, event_key) do nothing
  returning * into inbox_record;

  if inbox_record.id is null then
    select * into inbox_record from public.provider_event_inbox
    where provider = p_provider and event_key = p_event_key;
    if inbox_record.payload_hash <> p_payload_hash then
      raise exception 'PROVIDER_EVENT_KEY_REUSED' using errcode = '23505';
    end if;
  end if;
  return inbox_record;
end;
$$;

create or replace function public.claim_provider_events(
  p_worker_id text,
  p_claim_limit integer default 20,
  p_lease_seconds integer default 120
)
returns setof public.provider_event_inbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if char_length(p_worker_id) not between 3 and 120
    or p_claim_limit not between 1 and 100
    or p_lease_seconds not between 30 and 900 then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;
  return query
  with candidates as (
    select inbox.id from public.provider_event_inbox inbox
    where inbox.signature_valid
      and (inbox.status in ('received', 'failed')
        or (inbox.status = 'processing' and inbox.lease_expires_at < statement_timestamp()))
      and inbox.next_attempt_at <= statement_timestamp()
      and inbox.attempt_count < 10
    order by inbox.next_attempt_at, inbox.received_at
    for update skip locked limit p_claim_limit
  )
  update public.provider_event_inbox inbox
  set status = 'processing', lease_owner = p_worker_id,
      lease_expires_at = statement_timestamp() + make_interval(secs => p_lease_seconds),
      attempt_count = inbox.attempt_count + 1
  from candidates where inbox.id = candidates.id
  returning inbox.*;
end;
$$;

create or replace function public.fail_provider_event(
  p_provider_event_id uuid,
  p_worker_id text,
  p_safe_error_code text
)
returns public.provider_event_inbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  inbox_record public.provider_event_inbox;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_safe_error_code !~ '^[A-Z0-9_]{2,80}$' then
    raise exception 'INVALID_PROVIDER_EVENT_ERROR' using errcode = '22023';
  end if;
  update public.provider_event_inbox
  set status = 'failed', lease_owner = null, lease_expires_at = null,
      safe_error_code = p_safe_error_code,
      next_attempt_at = statement_timestamp() + least(
        interval '4 hours',
        interval '30 seconds' * power(2, greatest(attempt_count - 1, 0))
      )
  where id = p_provider_event_id and status = 'processing'
    and lease_owner = p_worker_id and lease_expires_at > statement_timestamp()
  returning * into inbox_record;
  if not found then raise exception 'PROVIDER_EVENT_LEASE_LOST' using errcode = '55000'; end if;
  return inbox_record;
end;
$$;

create or replace function public.reconcile_payment(
  p_order_id uuid,
  p_provider_event_key text,
  p_target_status public.payment_status,
  p_amount_minor bigint,
  p_currency text,
  p_provider_reference text default null,
  p_provider_event_inbox_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  payment_record public.payment_attempts;
  previous_payment_status public.payment_status;
  final_payment_status public.payment_status;
  previous_order_status public.order_status;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.order_actor_class();
begin
  perform app_private.assert_manager();
  if char_length(p_provider_event_key) not between 8 and 180
    or p_target_status not in ('authorized', 'paid', 'failed', 'expired', 'cancelled', 'uncertain', 'reconciliation_required')
    or p_amount_minor < 0 or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'INVALID_PAYMENT_RECONCILIATION' using errcode = '22023';
  end if;

  select * into order_record from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into payment_record from public.payment_attempts
  where order_id = p_order_id order by created_at desc limit 1 for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.payment_events event
    where event.payment_attempt_id = payment_record.id
      and event.provider_event_key = p_provider_event_key
  ) then return order_record; end if;

  previous_payment_status := payment_record.status;
  previous_order_status := order_record.status;
  final_payment_status := p_target_status;
  if p_target_status in ('authorized', 'paid')
    and (p_amount_minor <> payment_record.amount_minor or p_currency <> payment_record.currency) then
    final_payment_status := 'reconciliation_required';
  elsif previous_payment_status in ('paid', 'refunded', 'partially_refunded')
    and p_target_status in ('failed', 'expired', 'cancelled') then
    final_payment_status := previous_payment_status;
  elsif p_target_status = 'paid' and order_record.status in ('cancelled', 'expired') then
    final_payment_status := 'reconciliation_required';
    insert into public.payment_reconciliations (
      order_id, payment_attempt_id, reconciliation_kind, status,
      provider_event_inbox_id, external_reference, amount_minor, currency,
      safe_reason
    ) values (
      order_record.id, payment_record.id, 'late_payment', 'late',
      p_provider_event_inbox_id, p_provider_reference, p_amount_minor,
      p_currency, 'Payment arrived after cancellation or expiry.'
    );
  end if;

  update public.payment_attempts
  set status = final_payment_status,
      provider_reference = coalesce(nullif(p_provider_reference, ''), provider_reference)
  where id = payment_record.id returning * into payment_record;
  update public.orders
  set payment_status = final_payment_status,
      status = case
        when final_payment_status = 'paid' and status in ('bank_transfer_pending', 'payment_pending') then 'confirmed'::public.order_status
        else status
      end
  where id = order_record.id returning * into order_record;

  insert into public.payment_events (
    payment_attempt_id, event_type, from_status, to_status,
    provider_event_key, correlation_id, safe_metadata
  ) values (
    payment_record.id, 'reconciled', previous_payment_status,
    final_payment_status, p_provider_event_key, correlation,
    jsonb_build_object('amountMatched', p_amount_minor = payment_record.amount_minor,
      'currencyMatched', p_currency = payment_record.currency)
  );
  insert into public.order_events (
    order_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    order_record.id, 'payment-reconciled', previous_order_status,
    order_record.status, actor_class, auth.uid(), correlation,
    jsonb_build_object('paymentStatus', final_payment_status)
  );
  if final_payment_status = 'paid' then
    perform public.convert_order_reservations(order_record.id);
    perform app_private.enqueue_order_notification(
      order_record.id, 'payment-confirmed', 'order-payment-confirmed'
    );
  elsif final_payment_status in ('failed', 'expired', 'uncertain', 'reconciliation_required') then
    perform app_private.enqueue_order_notification(
      order_record.id, 'payment-update', 'order-payment-update',
      jsonb_build_object('paymentStatus', final_payment_status),
      ':' || p_provider_event_key
    );
  end if;
  if p_provider_event_inbox_id is not null then
    update public.provider_event_inbox
    set status = 'complete', completed_at = statement_timestamp(),
        lease_owner = null, lease_expires_at = null, safe_error_code = null
    where id = p_provider_event_inbox_id;
  end if;
  perform app_private.write_audit_event(
    actor_class, 'payment.reconcile', 'order', order_record.id::text,
    'succeeded', 'payment-operations', correlation,
    jsonb_build_object('paymentStatus', final_payment_status)
  );
  return order_record;
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
  order_record public.orders;
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
  select * into order_record from public.orders
  where id = p_order_id and payment_method = 'hosted_payment' for update;
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

create or replace function public.review_bank_transfer(
  p_order_id uuid,
  p_decision text,
  p_transfer_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_evidence_path text,
  p_reconciliation_id uuid default null
)
returns public.payment_reconciliations
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  payment_record public.payment_attempts;
  reconciliation public.payment_reconciliations;
  actor_id uuid := auth.uid();
begin
  perform app_private.assert_manager();
  if actor_id is null then raise exception 'STAFF_IDENTITY_REQUIRED' using errcode = '42501'; end if;
  if p_decision not in ('matched', 'rejected')
    or char_length(btrim(p_transfer_reference)) not between 2 and 160
    or p_amount_minor <= 0 or p_currency !~ '^[A-Z]{3}$'
    or (p_evidence_path <> '' and char_length(p_evidence_path) > 500) then
    raise exception 'INVALID_TRANSFER_REVIEW' using errcode = '22023';
  end if;
  select * into order_record from public.orders where id = p_order_id for update;
  if not found or order_record.payment_method <> 'bank_transfer' then
    raise exception 'BANK_TRANSFER_ORDER_REQUIRED' using errcode = '55000';
  end if;
  select * into payment_record from public.payment_attempts
  where order_id = p_order_id and method = 'bank_transfer'
  order by created_at desc limit 1 for update;

  if p_reconciliation_id is null then
    insert into public.payment_reconciliations (
      order_id, payment_attempt_id, reconciliation_kind, status,
      external_reference, amount_minor, currency, evidence_path,
      safe_reason, first_reviewed_by, first_reviewed_at
    ) values (
      p_order_id, payment_record.id, 'bank_transfer', 'pending',
      btrim(p_transfer_reference), p_amount_minor, p_currency,
      nullif(p_evidence_path, ''), 'Awaiting independent confirmation: ' || p_decision,
      actor_id, statement_timestamp()
    ) returning * into reconciliation;
    return reconciliation;
  end if;

  select * into reconciliation from public.payment_reconciliations
  where id = p_reconciliation_id and order_id = p_order_id
    and reconciliation_kind = 'bank_transfer' for update;
  if not found or reconciliation.status <> 'pending'
    or reconciliation.first_reviewed_by = actor_id then
    raise exception 'INDEPENDENT_TRANSFER_CONFIRMATION_REQUIRED' using errcode = '55000';
  end if;
  if reconciliation.external_reference <> btrim(p_transfer_reference)
    or reconciliation.amount_minor <> p_amount_minor
    or reconciliation.currency <> p_currency then
    raise exception 'TRANSFER_CONFIRMATION_MISMATCH' using errcode = '55000';
  end if;
  update public.payment_reconciliations
  set status = p_decision, confirmed_by = actor_id,
      confirmed_at = statement_timestamp(), safe_reason = 'Independently confirmed: ' || p_decision
  where id = reconciliation.id returning * into reconciliation;
  update public.bank_transfer_reviews
  set status = p_decision, transfer_reference = p_transfer_reference,
      amount_minor = p_amount_minor, currency = p_currency,
      evidence_path = nullif(p_evidence_path, ''), reviewed_by = actor_id,
      review_reason = 'Dual-reviewed transfer ' || p_decision,
      reviewed_at = statement_timestamp()
  where order_id = p_order_id;
  perform public.reconcile_payment(
    p_order_id, 'bank-transfer:' || reconciliation.id::text,
    case when p_decision = 'matched' then 'paid'::public.payment_status
         else 'reconciliation_required'::public.payment_status end,
    p_amount_minor, p_currency, p_transfer_reference, null
  );
  return reconciliation;
end;
$$;

create or replace function public.issue_refund(
  p_order_id uuid,
  p_amount_minor bigint,
  p_reason text,
  p_idempotency_key text,
  p_provider_reference text
)
returns public.refund_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  payment_record public.payment_attempts;
  refund_record public.refund_records;
  refunded_minor bigint;
  final_payment_status public.payment_status;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.order_actor_class();
begin
  perform app_private.assert_manager();
  if p_amount_minor <= 0 or char_length(btrim(p_reason)) not between 2 and 500
    or char_length(p_idempotency_key) not between 16 and 180
    or char_length(p_provider_reference) not between 2 and 180 then
    raise exception 'INVALID_REFUND' using errcode = '22023';
  end if;
  select * into refund_record from public.refund_records
  where idempotency_key = p_idempotency_key;
  if found then
    if refund_record.order_id <> p_order_id or refund_record.amount_minor <> p_amount_minor then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505';
    end if;
    return refund_record;
  end if;
  select * into order_record from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into payment_record from public.payment_attempts
  where order_id = p_order_id order by created_at desc limit 1 for update;
  if payment_record.status not in ('paid', 'partially_refunded') then
    raise exception 'PAYMENT_NOT_REFUNDABLE' using errcode = '55000';
  end if;
  select coalesce(sum(amount_minor), 0) into refunded_minor
  from public.refund_records where order_id = p_order_id and status = 'succeeded';
  if refunded_minor + p_amount_minor > order_record.total_minor then
    raise exception 'REFUND_EXCEEDS_PAID_AMOUNT' using errcode = '22003';
  end if;
  final_payment_status := case
    when refunded_minor + p_amount_minor = order_record.total_minor then 'refunded'::public.payment_status
    else 'partially_refunded'::public.payment_status
  end;
  insert into public.refund_records (
    order_id, payment_attempt_id, amount_minor, currency, status, reason,
    provider_reference, idempotency_key, requested_by, processed_by,
    correlation_id, processed_at
  ) values (
    order_record.id, payment_record.id, p_amount_minor, order_record.currency,
    'succeeded', btrim(p_reason), p_provider_reference, p_idempotency_key,
    auth.uid(), auth.uid(), correlation, statement_timestamp()
  ) returning * into refund_record;
  update public.payment_attempts set status = final_payment_status
  where id = payment_record.id;
  update public.orders
  set payment_status = final_payment_status,
      status = case when final_payment_status = 'refunded' then 'refunded'::public.order_status
                    else 'partially_refunded'::public.order_status end
  where id = order_record.id;
  insert into public.payment_events (
    payment_attempt_id, event_type, from_status, to_status,
    provider_event_key, correlation_id, safe_metadata
  ) values (
    payment_record.id, 'refund-succeeded', payment_record.status,
    final_payment_status, 'refund:' || p_idempotency_key, correlation,
    jsonb_build_object('amountMinor', p_amount_minor)
  );
  insert into public.order_events (
    order_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    order_record.id, 'refund-succeeded', order_record.status,
    case when final_payment_status = 'refunded' then 'refunded'::public.order_status
         else 'partially_refunded'::public.order_status end,
    actor_class, auth.uid(), correlation,
    jsonb_build_object('amountMinor', p_amount_minor)
  );
  perform app_private.enqueue_order_notification(
    order_record.id, 'order-refunded', 'order-refunded',
    jsonb_build_object('refundAmountMinor', p_amount_minor),
    ':' || refund_record.id::text
  );
  perform app_private.write_audit_event(
    actor_class, 'payment.refund', 'order', order_record.id::text,
    'succeeded', 'order-operations', correlation,
    jsonb_build_object('amountMinor', p_amount_minor, 'paymentStatus', final_payment_status)
  );
  return refund_record;
end;
$$;

create or replace function public.create_shipment(
  p_order_id uuid,
  p_expected_version bigint,
  p_carrier text,
  p_service_level text,
  p_tracking_reference text,
  p_tracking_url text,
  p_idempotency_key text
)
returns public.fulfillments
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders;
  fulfillment public.fulfillments;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.order_actor_class();
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_carrier)) not between 2 and 120
    or char_length(btrim(p_tracking_reference)) not between 2 and 180
    or char_length(p_service_level) > 120 or char_length(p_tracking_url) > 500
    or char_length(p_idempotency_key) not between 16 and 180 then
    raise exception 'INVALID_SHIPMENT' using errcode = '22023';
  end if;
  select * into fulfillment from public.fulfillments
  where order_id = p_order_id and tracking_reference = btrim(p_tracking_reference);
  if found then return fulfillment; end if;
  select * into order_record from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  if order_record.version <> p_expected_version then
    raise exception 'ORDER_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if order_record.status not in ('confirmed', 'processing') or order_record.payment_status <> 'paid' then
    raise exception 'ORDER_NOT_SHIPPABLE' using errcode = '55000';
  end if;
  insert into public.fulfillments (
    order_id, status, carrier, service_level, tracking_reference,
    tracking_url, created_by, dispatched_at
  ) values (
    p_order_id, 'dispatched', btrim(p_carrier), nullif(btrim(p_service_level), ''),
    btrim(p_tracking_reference), nullif(btrim(p_tracking_url), ''), auth.uid(),
    statement_timestamp()
  ) returning * into fulfillment;
  insert into public.shipment_events (
    fulfillment_id, event_key, event_type, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    fulfillment.id, p_idempotency_key, 'dispatched', actor_class,
    auth.uid(), correlation, jsonb_build_object('carrier', fulfillment.carrier)
  );
  update public.orders set status = 'shipped' where id = p_order_id;
  insert into public.order_events (
    order_id, event_type, from_status, to_status, actor_class,
    actor_profile_id, correlation_id, safe_metadata
  ) values (
    p_order_id, 'shipment-dispatched', order_record.status, 'shipped',
    actor_class, auth.uid(), correlation,
    jsonb_build_object('fulfillmentId', fulfillment.id, 'carrier', fulfillment.carrier)
  );
  perform app_private.enqueue_order_notification(
    p_order_id, 'order-shipped', 'order-shipped',
    jsonb_build_object('carrier', fulfillment.carrier,
      'trackingReference', fulfillment.tracking_reference,
      'trackingUrl', fulfillment.tracking_url),
    ':' || fulfillment.id::text
  );
  return fulfillment;
end;
$$;

create or replace function public.record_delivery_event(
  p_fulfillment_id uuid,
  p_event_key text,
  p_safe_location text default null
)
returns public.fulfillments
language plpgsql
security definer
set search_path = ''
as $$
declare
  fulfillment public.fulfillments;
  order_record public.orders;
  correlation uuid := extensions.gen_random_uuid();
  actor_class text := app_private.order_actor_class();
begin
  perform app_private.assert_manager();
  if char_length(p_event_key) not between 8 and 180
    or char_length(coalesce(p_safe_location, '')) > 160 then
    raise exception 'INVALID_DELIVERY_EVENT' using errcode = '22023';
  end if;
  select * into fulfillment from public.fulfillments
  where id = p_fulfillment_id for update;
  if not found then raise exception 'FULFILLMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if exists (select 1 from public.shipment_events where fulfillment_id = p_fulfillment_id and event_key = p_event_key) then
    return fulfillment;
  end if;
  if fulfillment.status not in ('dispatched', 'delivered') then
    raise exception 'FULFILLMENT_NOT_DELIVERABLE' using errcode = '55000';
  end if;
  if fulfillment.status = 'dispatched' then
    update public.fulfillments
    set status = 'delivered', delivered_at = statement_timestamp()
    where id = fulfillment.id returning * into fulfillment;
    select * into order_record from public.orders where id = fulfillment.order_id for update;
    update public.orders set status = 'delivered' where id = order_record.id;
    insert into public.order_events (
      order_id, event_type, from_status, to_status, actor_class,
      actor_profile_id, correlation_id, safe_metadata
    ) values (
      order_record.id, 'shipment-delivered', order_record.status, 'delivered',
      actor_class, auth.uid(), correlation,
      jsonb_build_object('fulfillmentId', fulfillment.id)
    );
    perform app_private.enqueue_order_notification(
      order_record.id, 'order-delivered', 'order-delivered',
      jsonb_build_object('trackingReference', fulfillment.tracking_reference),
      ':' || fulfillment.id::text
    );
  end if;
  insert into public.shipment_events (
    fulfillment_id, event_key, event_type, safe_location,
    actor_class, actor_profile_id, correlation_id
  ) values (
    fulfillment.id, p_event_key, 'delivered', nullif(p_safe_location, ''),
    actor_class, auth.uid(), correlation
  );
  return fulfillment;
end;
$$;

create or replace function public.add_order_note(p_order_id uuid, p_note text)
returns public.order_internal_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  note_record public.order_internal_notes;
begin
  perform app_private.assert_manager();
  if char_length(btrim(p_note)) not between 2 and 2000 then
    raise exception 'INVALID_ORDER_NOTE' using errcode = '22023';
  end if;
  insert into public.order_internal_notes (order_id, note, created_by)
  values (p_order_id, btrim(p_note), auth.uid()) returning * into note_record;
  return note_record;
end;
$$;

create or replace function public.complete_notification_attempt(
  p_notification_id uuid,
  p_worker_id text,
  p_provider text,
  p_outcome text,
  p_provider_reference text default null,
  p_safe_error_code text default null
)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification public.notifications;
  order_id uuid;
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_outcome not in ('sent', 'delivered', 'failed', 'bounced', 'uncertain')
    or char_length(p_provider) not between 1 and 80
    or (p_safe_error_code is not null and p_safe_error_code !~ '^[A-Z0-9_]{2,80}$') then
    raise exception 'INVALID_NOTIFICATION_OUTCOME' using errcode = '22023';
  end if;
  select * into notification from public.notifications
  where id = p_notification_id and status = 'leased'
    and lease_owner = p_worker_id and lease_expires_at > statement_timestamp()
  for update;
  if not found then raise exception 'NOTIFICATION_LEASE_LOST' using errcode = '55000'; end if;
  select link.order_id into order_id from public.order_notification_links link
  where link.notification_id = notification.id limit 1;
  insert into public.notification_attempts (
    notification_id, attempt_number, provider, provider_reference,
    outcome, safe_error_code, started_at, completed_at, order_id
  ) values (
    notification.id, notification.attempt_count, p_provider,
    nullif(p_provider_reference, ''), p_outcome, p_safe_error_code,
    statement_timestamp(), statement_timestamp(), order_id
  ) on conflict (notification_id, attempt_number) do nothing;
  update public.notifications
  set status = case
        when p_outcome = 'delivered' then 'delivered'::public.notification_status
        when p_outcome = 'sent' then 'sent'::public.notification_status
        when p_outcome = 'bounced' then 'bounced'::public.notification_status
        when attempt_count >= max_attempts then 'cancelled'::public.notification_status
        else 'failed'::public.notification_status
      end,
      available_at = case when p_outcome in ('failed', 'uncertain')
        then statement_timestamp() + least(interval '4 hours', interval '30 seconds' * power(2, greatest(attempt_count - 1, 0)))
        else available_at end,
      lease_owner = null, lease_expires_at = null,
      last_error_code = p_safe_error_code
  where id = notification.id returning * into notification;
  if notification.status = 'cancelled' then
    insert into public.operational_alerts (
      fingerprint, category, severity, safe_summary, correlation_id, order_id
    ) values (
      'notification-dead:' || notification.id::text,
      'notification-dead-letter', 'high',
      'A transactional notification exhausted its retry budget.',
      notification.correlation_id, order_id
    ) on conflict (fingerprint, status) do update
      set occurrence_count = public.operational_alerts.occurrence_count + 1,
          last_seen_at = statement_timestamp();
  end if;
  return notification;
end;
$$;

create or replace function public.claim_notification_outbox(
  p_worker_id text,
  p_claim_limit integer default 20,
  p_lease_seconds integer default 120
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
  if char_length(p_worker_id) not between 3 and 120
    or p_claim_limit not between 1 and 100
    or p_lease_seconds not between 30 and 900 then
    raise exception 'INVALID_LEASE' using errcode = '22023';
  end if;
  return query select * from app_private.claim_notifications(
    p_worker_id, p_claim_limit, make_interval(secs => p_lease_seconds)
  );
end;
$$;

create or replace function public.record_notification_delivery(
  p_provider text,
  p_event_key text,
  p_payload_hash text,
  p_provider_reference text,
  p_outcome text
)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt public.notification_attempts;
  notification public.notifications;
  receipt public.webhook_receipts;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_outcome not in ('delivered', 'bounced')
    or char_length(p_provider) not between 2 and 80
    or char_length(p_event_key) not between 8 and 180
    or char_length(p_provider_reference) not between 2 and 180
    or p_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_NOTIFICATION_DELIVERY' using errcode = '22023';
  end if;
  insert into public.webhook_receipts (
    provider, event_key, payload_hash, signature_valid, status,
    correlation_id, completed_at
  ) values (
    p_provider, p_event_key, p_payload_hash, true, 'complete',
    correlation, statement_timestamp()
  ) on conflict (provider, event_key) do nothing
  returning * into receipt;
  if receipt.id is null then
    select * into receipt from public.webhook_receipts
    where provider = p_provider and event_key = p_event_key;
    if receipt.payload_hash <> p_payload_hash then
      raise exception 'WEBHOOK_EVENT_KEY_REUSED' using errcode = '23505';
    end if;
    select n.* into notification from public.notifications n
    join public.notification_attempts a on a.notification_id = n.id
    where a.provider_reference = p_provider_reference
    order by a.id desc limit 1;
    return notification;
  end if;
  select * into attempt from public.notification_attempts
  where provider = p_provider and provider_reference = p_provider_reference
  order by id desc limit 1 for update;
  if not found then raise exception 'NOTIFICATION_REFERENCE_UNKNOWN' using errcode = 'P0002'; end if;
  update public.notification_attempts
  set outcome = p_outcome, completed_at = statement_timestamp()
  where id = attempt.id;
  update public.notifications
  set status = p_outcome::public.notification_status
  where id = attempt.notification_id returning * into notification;
  return notification;
end;
$$;

create or replace function public.retry_notification(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification public.notifications;
begin
  perform app_private.assert_manager();
  update public.notifications
  set status = 'pending', available_at = statement_timestamp(),
      lease_owner = null, lease_expires_at = null, attempt_count = 0,
      last_error_code = null
  where id = p_notification_id and status in ('failed', 'bounced', 'cancelled')
  returning * into notification;
  if not found then raise exception 'NOTIFICATION_NOT_RETRYABLE' using errcode = '55000'; end if;
  return notification;
end;
$$;

revoke all on function public.transition_order(uuid, bigint, public.order_status, text, text) from public, anon;
revoke all on function public.record_provider_event(text, text, text, text, text, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.claim_provider_events(text, integer, integer) from public, anon, authenticated;
revoke all on function public.fail_provider_event(uuid, text, text) from public, anon, authenticated;
revoke all on function public.reconcile_payment(uuid, text, public.payment_status, bigint, text, text, uuid) from public, anon;
revoke all on function public.attach_hosted_payment(uuid, text, text) from public, anon, authenticated;
revoke all on function public.review_bank_transfer(uuid, text, text, bigint, text, text, uuid) from public, anon;
revoke all on function public.issue_refund(uuid, bigint, text, text, text) from public, anon;
revoke all on function public.create_shipment(uuid, bigint, text, text, text, text, text) from public, anon;
revoke all on function public.record_delivery_event(uuid, text, text) from public, anon;
revoke all on function public.add_order_note(uuid, text) from public, anon;
revoke all on function public.complete_notification_attempt(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_notification_outbox(text, integer, integer) from public, anon, authenticated;
revoke all on function public.record_notification_delivery(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.retry_notification(uuid) from public, anon;

grant execute on function public.transition_order(uuid, bigint, public.order_status, text, text) to authenticated, service_role;
grant execute on function public.record_provider_event(text, text, text, text, text, boolean, jsonb) to service_role;
grant execute on function public.claim_provider_events(text, integer, integer) to service_role;
grant execute on function public.fail_provider_event(uuid, text, text) to service_role;
grant execute on function public.reconcile_payment(uuid, text, public.payment_status, bigint, text, text, uuid) to authenticated, service_role;
grant execute on function public.attach_hosted_payment(uuid, text, text) to service_role;
grant execute on function public.review_bank_transfer(uuid, text, text, bigint, text, text, uuid) to authenticated, service_role;
grant execute on function public.issue_refund(uuid, bigint, text, text, text) to authenticated, service_role;
grant execute on function public.create_shipment(uuid, bigint, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.record_delivery_event(uuid, text, text) to authenticated, service_role;
grant execute on function public.add_order_note(uuid, text) to authenticated, service_role;
grant execute on function public.complete_notification_attempt(uuid, text, text, text, text, text) to service_role;
grant execute on function public.claim_notification_outbox(text, integer, integer) to service_role;
grant execute on function public.record_notification_delivery(text, text, text, text, text) to service_role;
grant execute on function public.retry_notification(uuid) to authenticated, service_role;
