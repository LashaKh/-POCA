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
  allocations bigint[] := '{}';
  remainders numeric[] := '{}';
  remaining bigint;
  index_value integer;
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

create or replace function public.release_checkout_session(
  p_checkout_session_id uuid,
  p_reason text default 'cancelled',
  p_expired boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  checkout_record public.checkout_sessions;
  reservation_record public.inventory_reservations;
  inventory_id uuid;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if char_length(p_reason) not between 1 and 120 then raise exception 'INVALID_REASON' using errcode = '22023'; end if;
  select session.* into checkout_record from public.checkout_sessions session
  where session.id = p_checkout_session_id for update;
  if checkout_record.id is null then return false; end if;
  if checkout_record.status <> 'reserved' then return true; end if;

  for reservation_record in
    select reservation.* from public.inventory_reservations reservation
    where reservation.checkout_session_id = checkout_record.id and reservation.status = 'active'
    order by reservation.product_id for update
  loop
    update public.inventory_items inventory
    set reserved_quantity = reserved_quantity - reservation_record.quantity
    where inventory.product_id = reservation_record.product_id
      and inventory.reserved_quantity >= reservation_record.quantity
    returning inventory.id into inventory_id;
    if inventory_id is null then raise exception 'INVENTORY_RESERVATION_DRIFT' using errcode = 'P0001'; end if;
    update public.inventory_reservations
    set status = case when p_expired then 'expired'::public.inventory_reservation_status else 'released'::public.inventory_reservation_status end,
        released_at = statement_timestamp(), release_reason = p_reason
    where id = reservation_record.id;
    insert into public.inventory_events (
      inventory_item_id, reservation_id, event_type, quantity_delta, reason, correlation_id
    ) values (
      inventory_id, reservation_record.id, case when p_expired then 'expired' else 'released' end,
      -reservation_record.quantity, p_reason, correlation
    );
  end loop;
  update public.checkout_sessions
  set status = case when p_expired then 'expired'::public.checkout_status else 'cancelled'::public.checkout_status end
  where id = checkout_record.id;
  return true;
end;
$$;

create or replace function public.reserve_guest_checkout(
  p_secret_hash text,
  p_country_code text,
  p_method_code text default null
)
returns public.checkout_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_record public.delivery_quotes;
  checkout_record public.checkout_sessions;
  existing_checkout_id uuid;
  item_record record;
  inventory_record public.inventory_items;
  reservation_id uuid;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  quote_record := public.quote_guest_cart(p_secret_hash, p_country_code, p_method_code);
  if quote_record.manual_quote then raise exception 'MANUAL_QUOTE_REQUIRED' using errcode = 'P0001'; end if;

  select session.id into existing_checkout_id
  from public.checkout_sessions session
  where session.cart_id = quote_record.cart_id and session.status = 'reserved'
  for update;
  if existing_checkout_id is not null then
    perform public.release_checkout_session(existing_checkout_id, 'replaced', false);
  end if;

  insert into public.checkout_sessions (
    cart_id, quote_id, reservation_version, expires_at
  ) values (
    quote_record.cart_id,
    quote_record.id,
    encode(extensions.digest((quote_record.id::text || ':' || quote_record.cart_version::text)::bytea, 'sha256'), 'hex'),
    least(quote_record.expires_at, statement_timestamp() + interval '15 minutes')
  ) returning * into checkout_record;

  for item_record in
    select item.product_id, item.quantity
    from public.cart_items item where item.cart_id = quote_record.cart_id
    order by item.product_id
  loop
    select inventory.* into inventory_record from public.inventory_items inventory
    where inventory.product_id = item_record.product_id for update;
    if inventory_record.id is null or inventory_record.available_quantity < item_record.quantity then
      raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
    end if;
    update public.inventory_items
    set reserved_quantity = reserved_quantity + item_record.quantity
    where id = inventory_record.id;
    insert into public.inventory_reservations (
      checkout_session_id, cart_id, product_id, quantity, expires_at
    ) values (
      checkout_record.id, checkout_record.cart_id, item_record.product_id,
      item_record.quantity, checkout_record.expires_at
    ) returning id into reservation_id;
    insert into public.inventory_events (
      inventory_item_id, reservation_id, event_type, quantity_delta, reason, correlation_id
    ) values (inventory_record.id, reservation_id, 'reserved', item_record.quantity, 'checkout', correlation);
  end loop;
  return checkout_record;
end;
$$;

create or replace function public.accept_guest_order(
  p_secret_hash text,
  p_checkout_session_id uuid,
  p_expected_total_minor bigint,
  p_accept_changes boolean,
  p_idempotency_key_hash text,
  p_request_hash text,
  p_guest_proof_hash text,
  p_contact_email text,
  p_contact_phone text,
  p_address jsonb,
  p_payment_method public.payment_method_kind,
  p_terms_version text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  guest_record public.guest_sessions;
  cart_record public.carts;
  checkout_record public.checkout_sessions;
  quote_record public.delivery_quotes;
  order_record public.orders;
  existing_order public.orders;
  payment_record public.payment_attempts;
  line_record record;
  line_weights bigint[];
  discount_allocations bigint[];
  tax_allocations bigint[];
  line_index integer := 0;
  order_reference text;
  due_at timestamptz;
  correlation uuid := extensions.gen_random_uuid();
  notification_id uuid;
  discount_record public.discounts;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_idempotency_key_hash !~ '^[a-f0-9]{64}$' or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_guest_proof_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_ACCEPTANCE_IDENTITY' using errcode = '22023';
  end if;
  if p_payment_method not in ('bank_transfer', 'hosted_payment') then
    raise exception 'PAYMENT_METHOD_DISABLED' using errcode = 'P0001';
  end if;
  if char_length(trim(p_contact_email)) not between 3 and 254
    or char_length(p_terms_version) not between 1 and 80
    or jsonb_typeof(p_address) <> 'object' then
    raise exception 'INVALID_CHECKOUT_DETAILS' using errcode = '22023';
  end if;
  if nullif(trim(p_address ->> 'fullName'), '') is null
    or nullif(trim(p_address ->> 'line1'), '') is null
    or nullif(trim(p_address ->> 'city'), '') is null
    or coalesce(p_address ->> 'countryCode', '') !~ '^[A-Z]{2}$' then
    raise exception 'INVALID_ADDRESS' using errcode = '22023';
  end if;

  select guest.* into guest_record from public.guest_sessions guest
  where guest.secret_hash = p_secret_hash and guest.revoked_at is null
    and guest.expires_at > statement_timestamp() for update;
  if guest_record.id is null then raise exception 'GUEST_CONTEXT_NOT_FOUND' using errcode = '28000'; end if;
  select existing.* into existing_order from public.orders existing
  where existing.guest_session_id = guest_record.id and existing.idempotency_key_hash = p_idempotency_key_hash;
  if existing_order.id is not null then
    if existing_order.request_hash <> p_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '23505'; end if;
    return existing_order;
  end if;

  select session.* into checkout_record from public.checkout_sessions session
  where session.id = p_checkout_session_id for update;
  if checkout_record.id is null or checkout_record.status <> 'reserved' then raise exception 'CHECKOUT_NOT_RESERVED' using errcode = 'P0001'; end if;
  if checkout_record.expires_at <= statement_timestamp() then
    perform public.release_checkout_session(checkout_record.id, 'checkout-expired', true);
    raise exception 'CHECKOUT_EXPIRED' using errcode = 'P0001';
  end if;
  select cart.* into cart_record from public.carts cart where cart.id = checkout_record.cart_id for update;
  if cart_record.guest_session_id <> guest_record.id or cart_record.status <> 'active' then raise exception 'CHECKOUT_OWNERSHIP_MISMATCH' using errcode = '42501'; end if;
  select quote.* into quote_record from public.delivery_quotes quote where quote.id = checkout_record.quote_id;
  if quote_record.expires_at <= statement_timestamp() or quote_record.cart_version <> cart_record.version then
    raise exception 'CHECKOUT_STALE' using errcode = 'P0001';
  end if;
  if p_address ->> 'countryCode' <> quote_record.country_code then
    raise exception 'DELIVERY_COUNTRY_CHANGED' using errcode = 'P0001';
  end if;
  if quote_record.total_minor <> p_expected_total_minor then raise exception 'TOTAL_CHANGED' using errcode = 'P0001'; end if;
  if coalesce((quote_record.breakdown ->> 'changed')::boolean, false) and not p_accept_changes then
    raise exception 'CHANGE_ACKNOWLEDGEMENT_REQUIRED' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(quote_record.breakdown -> 'lines') line
    where not exists (
      select 1
      from public.products product
      join public.product_prices price on price.product_id = product.id
        and price.currency = quote_record.currency
        and price.enabled
        and price.active_from <= statement_timestamp()
        and price.active_until > statement_timestamp()
      join public.inventory_reservations reservation
        on reservation.checkout_session_id = checkout_record.id
        and reservation.product_id = product.id
        and reservation.status = 'active'
      where product.id = (line ->> 'productId')::uuid
        and product.status = 'published'
        and product.search_visible
        and price.amount_minor = (line ->> 'unitAmountMinor')::bigint
        and reservation.quantity = (line ->> 'quantity')::integer
    )
  ) then raise exception 'CHECKOUT_STALE' using errcode = 'P0001'; end if;

  if cart_record.discount_code is not null then
    select discount.* into discount_record from public.discounts discount
    where discount.code = cart_record.discount_code for update;
    if discount_record.id is null or not discount_record.enabled
      or (discount_record.usage_limit is not null and discount_record.used_count >= discount_record.usage_limit)
      or (select count(*) from public.discount_redemptions redemption
          where redemption.discount_id = discount_record.id and redemption.guest_session_id = guest_record.id) >= discount_record.per_subject_limit then
      raise exception 'DISCOUNT_UNAVAILABLE' using errcode = 'P0001';
    end if;
  end if;

  order_reference := 'EPO-' || upper(substr(replace(extensions.gen_random_uuid()::text, '-', ''), 1, 12));
  due_at := statement_timestamp() + case
    when p_payment_method = 'bank_transfer' then interval '3 days'
    else interval '30 minutes'
  end;
  insert into public.orders (
    reference, guest_session_id, checkout_session_id, status, payment_status, payment_method,
    locale, currency, contact_email, contact_phone, subtotal_minor, discount_minor,
    tax_minor, delivery_minor, total_minor, pricing_version, terms_version,
    idempotency_key_hash, request_hash, guest_proof_hash, guest_proof_expires_at, bank_transfer_due_at
  ) values (
    order_reference, guest_record.id, checkout_record.id,
    case when p_payment_method = 'bank_transfer' then 'bank_transfer_pending'::public.order_status else 'payment_pending'::public.order_status end,
    case when p_payment_method = 'bank_transfer' then 'bank_transfer_review'::public.payment_status else 'pending'::public.payment_status end,
    p_payment_method,
    guest_record.locale, quote_record.currency, lower(trim(p_contact_email)), nullif(trim(p_contact_phone), ''),
    quote_record.subtotal_minor, quote_record.discount_minor, quote_record.tax_minor,
    quote_record.delivery_minor, quote_record.total_minor, quote_record.pricing_version, p_terms_version,
    p_idempotency_key_hash, p_request_hash, p_guest_proof_hash,
    statement_timestamp() + interval '90 days',
    case when p_payment_method = 'bank_transfer' then due_at else null end
  ) returning * into order_record;

  select array_agg((line ->> 'unitAmountMinor')::bigint * (line ->> 'quantity')::integer order by line ->> 'productId')
  into line_weights from jsonb_array_elements(quote_record.breakdown -> 'lines') line;
  discount_allocations := app_private.allocate_minor(quote_record.discount_minor, line_weights);
  tax_allocations := app_private.allocate_minor(quote_record.tax_minor, line_weights);
  for line_record in
    select line from jsonb_array_elements(quote_record.breakdown -> 'lines') line
    order by line ->> 'productId'
  loop
    line_index := line_index + 1;
    insert into public.order_lines (
      order_id, product_id, sku, localized_name, quantity, unit_amount_minor,
      subtotal_minor, discount_minor, tax_minor, total_minor, fulfillment_snapshot, product_snapshot
    ) values (
      order_record.id,
      (line_record.line ->> 'productId')::uuid,
      line_record.line ->> 'sku', line_record.line ->> 'name',
      (line_record.line ->> 'quantity')::integer,
      (line_record.line ->> 'unitAmountMinor')::bigint,
      line_weights[line_index], discount_allocations[line_index], tax_allocations[line_index],
      line_weights[line_index] - discount_allocations[line_index] + tax_allocations[line_index],
      jsonb_build_object('deliveryClass', line_record.line ->> 'deliveryClass'),
      line_record.line - array['previousUnitAmountMinor', 'availableQuantity']
    );
  end loop;

  insert into public.order_addresses (
    order_id, address_type, full_name, organization, line1, line2, city, region,
    postal_code, country_code, instructions
  ) values (
    order_record.id, 'delivery', trim(p_address ->> 'fullName'), nullif(trim(p_address ->> 'organization'), ''),
    trim(p_address ->> 'line1'), nullif(trim(p_address ->> 'line2'), ''), trim(p_address ->> 'city'),
    nullif(trim(p_address ->> 'region'), ''), nullif(trim(p_address ->> 'postalCode'), ''),
    p_address ->> 'countryCode', nullif(trim(p_address ->> 'instructions'), '')
  );
  if quote_record.discount_minor > 0 then
    insert into public.order_adjustments (order_id, adjustment_type, code, label, amount_minor, currency)
    values (order_record.id, 'discount', cart_record.discount_code::text, 'Discount', -quote_record.discount_minor, quote_record.currency);
  end if;
  if quote_record.tax_minor > 0 then
    insert into public.order_adjustments (order_id, adjustment_type, label, amount_minor, currency)
    values (order_record.id, 'tax', 'Tax', quote_record.tax_minor, quote_record.currency);
  end if;
  insert into public.order_adjustments (order_id, adjustment_type, label, amount_minor, currency, metadata)
  values (order_record.id, 'delivery', 'Delivery', quote_record.delivery_minor, quote_record.currency,
    jsonb_build_object('methodCode', quote_record.breakdown ->> 'deliveryMethodCode'));

  insert into public.payment_attempts (
    order_id, method, status, amount_minor, currency, provider, idempotency_key, due_at
  ) values (
    order_record.id, p_payment_method,
    case when p_payment_method = 'bank_transfer' then 'bank_transfer_review'::public.payment_status else 'pending'::public.payment_status end,
    order_record.total_minor, order_record.currency,
    case when p_payment_method = 'bank_transfer' then 'bank-transfer' else 'pending-provider' end,
    case when p_payment_method = 'bank_transfer' then 'bank:' else 'hosted:' end || order_record.id::text,
    due_at
  ) returning * into payment_record;
  insert into public.payment_events (
    payment_attempt_id, event_type, to_status, correlation_id
  ) values (
    payment_record.id,
    case when p_payment_method = 'bank_transfer' then 'instructions-issued' else 'payment-pending' end,
    payment_record.status,
    correlation
  );
  if p_payment_method = 'bank_transfer' then
    insert into public.bank_transfer_reviews (order_id, status)
    values (order_record.id, 'pending');
  end if;
  insert into public.order_events (
    order_id, event_type, to_status, actor_class, correlation_id,
    safe_metadata
  ) values (
    order_record.id, 'accepted', order_record.status, 'guest', correlation,
    jsonb_build_object('paymentMethod', p_payment_method)
  );

  update public.inventory_reservations
  set order_id = order_record.id, expires_at = due_at
  where checkout_session_id = checkout_record.id and status = 'active';
  update public.checkout_sessions
  set status = 'accepted', accepted_order_id = order_record.id, accepted_at = statement_timestamp()
  where id = checkout_record.id;
  update public.carts set status = 'converted' where id = cart_record.id;
  if discount_record.id is not null then
    update public.discounts set used_count = used_count + 1 where id = discount_record.id;
    insert into public.discount_redemptions (
      discount_id, order_id, guest_session_id, amount_minor, currency
    ) values (discount_record.id, order_record.id, guest_record.id, quote_record.discount_minor, quote_record.currency);
  end if;

  insert into public.notifications (
    purpose, locale, template_key, recipient_hash, payload, idempotency_key, correlation_id
  ) values (
    'order-accepted', order_record.locale,
    case when p_payment_method = 'bank_transfer' then 'order-bank-transfer-pending' else 'order-payment-pending' end,
    encode(extensions.digest(lower(trim(p_contact_email))::bytea, 'sha256'), 'hex'),
    jsonb_build_object(
      'recipientEmail', lower(trim(p_contact_email)), 'orderReference', order_record.reference,
      'amountMinor', order_record.total_minor, 'currency', order_record.currency,
      'dueAt', due_at, 'paymentMode', p_payment_method
    ), 'order-accepted:' || order_record.id::text, correlation
  ) returning id into notification_id;
  insert into public.order_notification_links (order_id, notification_id, purpose)
  values (order_record.id, notification_id, 'order-accepted');
  insert into public.scheduled_actions (
    action_type, subject_type, subject_id, due_at, idempotency_key, correlation_id
  ) values (
    case when p_payment_method = 'bank_transfer' then 'expire-bank-transfer' else 'expire-hosted-payment' end,
    'order', order_record.id, due_at,
    case when p_payment_method = 'bank_transfer' then 'expire-bank-transfer:' else 'expire-hosted-payment:' end || order_record.id::text,
    correlation
  );
  perform app_private.write_audit_event(
    'guest', 'order.accept', 'order', order_record.id::text, 'succeeded',
    'checkout', correlation, jsonb_build_object('reference', order_record.reference, 'paymentMethod', p_payment_method)
  );
  return order_record;
end;
$$;

create or replace function public.convert_order_reservations(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_record public.inventory_reservations;
  inventory_id uuid;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() and not public.is_active_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  for reservation_record in
    select reservation.* from public.inventory_reservations reservation
    where reservation.order_id = p_order_id and reservation.status = 'active'
    order by reservation.product_id for update
  loop
    update public.inventory_items inventory
    set on_hand_quantity = on_hand_quantity - reservation_record.quantity,
        reserved_quantity = reserved_quantity - reservation_record.quantity
    where inventory.product_id = reservation_record.product_id
      and inventory.on_hand_quantity >= reservation_record.quantity
      and inventory.reserved_quantity >= reservation_record.quantity
    returning id into inventory_id;
    if inventory_id is null then raise exception 'INVENTORY_RESERVATION_DRIFT' using errcode = 'P0001'; end if;
    update public.inventory_reservations set status = 'converted', converted_at = statement_timestamp()
    where id = reservation_record.id;
    insert into public.inventory_events (
      inventory_item_id, reservation_id, event_type, quantity_delta, reason, correlation_id
    ) values (inventory_id, reservation_record.id, 'sold', -reservation_record.quantity, 'order-paid', correlation);
  end loop;
  return true;
end;
$$;

create or replace function public.release_order_reservations(
  p_order_id uuid,
  p_reason text default 'order-cancelled',
  p_expired boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_record public.inventory_reservations;
  inventory_id uuid;
  correlation uuid := extensions.gen_random_uuid();
begin
  if not app_private.is_service_context() and not public.is_active_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  for reservation_record in
    select reservation.* from public.inventory_reservations reservation
    where reservation.order_id = p_order_id and reservation.status = 'active'
    order by reservation.product_id for update
  loop
    update public.inventory_items inventory
    set reserved_quantity = reserved_quantity - reservation_record.quantity
    where inventory.product_id = reservation_record.product_id
      and inventory.reserved_quantity >= reservation_record.quantity
    returning id into inventory_id;
    if inventory_id is null then raise exception 'INVENTORY_RESERVATION_DRIFT' using errcode = 'P0001'; end if;
    update public.inventory_reservations
    set status = case when p_expired then 'expired'::public.inventory_reservation_status else 'released'::public.inventory_reservation_status end,
        released_at = statement_timestamp(), release_reason = p_reason
    where id = reservation_record.id;
    insert into public.inventory_events (
      inventory_item_id, reservation_id, event_type, quantity_delta, reason, correlation_id
    ) values (
      inventory_id, reservation_record.id, case when p_expired then 'expired' else 'released' end,
      -reservation_record.quantity, p_reason, correlation
    );
  end loop;
  return true;
end;
$$;

create or replace function public.expire_due_checkout_work(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  checkout_id uuid;
  target_order_id uuid;
  target_payment_id uuid;
  correlation uuid;
  affected integer := 0;
begin
  if not app_private.is_service_context() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_limit not between 1 and 500 then raise exception 'INVALID_LIMIT' using errcode = '22023'; end if;
  for checkout_id in select session.id from public.checkout_sessions session
    where session.status = 'reserved' and session.expires_at <= statement_timestamp()
    order by session.expires_at for update skip locked limit p_limit
  loop
    perform public.release_checkout_session(checkout_id, 'checkout-expired', true);
    affected := affected + 1;
  end loop;
  for target_order_id in select order_record.id from public.orders order_record
    where order_record.status = 'bank_transfer_pending' and order_record.bank_transfer_due_at <= statement_timestamp()
    order by order_record.bank_transfer_due_at for update skip locked limit greatest(p_limit - affected, 0)
  loop
    perform public.release_order_reservations(target_order_id, 'bank-transfer-expired', true);
    update public.orders set status = 'expired', payment_status = 'expired' where id = target_order_id;
    update public.payment_attempts set status = 'expired'
    where order_id = target_order_id and status = 'bank_transfer_review';
    update public.scheduled_actions set status = 'complete', completed_at = statement_timestamp()
    where subject_id = target_order_id and action_type = 'expire-bank-transfer' and status = 'pending';
    affected := affected + 1;
  end loop;
  for target_order_id, target_payment_id in
    select order_record.id, attempt.id
    from public.orders order_record
    join public.payment_attempts attempt on attempt.order_id = order_record.id
    where order_record.status = 'payment_pending'
      and attempt.status = 'pending' and attempt.due_at <= statement_timestamp()
    order by attempt.due_at for update of order_record, attempt skip locked
    limit greatest(p_limit - affected, 0)
  loop
    correlation := extensions.gen_random_uuid();
    perform public.release_order_reservations(target_order_id, 'hosted-payment-expired', true);
    update public.payment_attempts set status = 'expired' where id = target_payment_id;
    update public.orders set status = 'expired', payment_status = 'expired' where id = target_order_id;
    insert into public.payment_events (
      payment_attempt_id, event_type, from_status, to_status, correlation_id
    ) values (target_payment_id, 'payment-expired', 'pending', 'expired', correlation);
    insert into public.order_events (
      order_id, event_type, from_status, to_status, actor_class, correlation_id
    ) values (target_order_id, 'payment-expired', 'payment_pending', 'expired', 'service', correlation);
    update public.scheduled_actions set status = 'complete', completed_at = statement_timestamp()
    where subject_id = target_order_id and action_type = 'expire-hosted-payment' and status = 'pending';
    affected := affected + 1;
  end loop;
  return affected;
end;
$$;

create or replace function app_private.protect_order_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reference <> old.reference
    or new.guest_session_id is distinct from old.guest_session_id
    or new.customer_profile_id is distinct from old.customer_profile_id
    or new.checkout_session_id <> old.checkout_session_id
    or new.payment_method <> old.payment_method
    or new.locale <> old.locale or new.currency <> old.currency
    or new.contact_email <> old.contact_email or new.contact_phone is distinct from old.contact_phone
    or new.subtotal_minor <> old.subtotal_minor or new.discount_minor <> old.discount_minor
    or new.tax_minor <> old.tax_minor or new.delivery_minor <> old.delivery_minor
    or new.total_minor <> old.total_minor or new.pricing_version <> old.pricing_version
    or new.terms_version <> old.terms_version or new.accepted_at <> old.accepted_at then
    raise exception 'IMMUTABLE_ORDER_SNAPSHOT' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger orders_protect_snapshot before update on public.orders
for each row execute function app_private.protect_order_snapshot();

revoke all on function app_private.allocate_minor(bigint, bigint[]) from public, anon, authenticated;
revoke all on function public.release_checkout_session(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.reserve_guest_checkout(text, text, text) from public, anon, authenticated;
revoke all on function public.accept_guest_order(text, uuid, bigint, boolean, text, text, text, text, text, jsonb, public.payment_method_kind, text) from public, anon, authenticated;
revoke all on function public.convert_order_reservations(uuid) from public, anon, authenticated;
revoke all on function public.release_order_reservations(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.expire_due_checkout_work(integer) from public, anon, authenticated;
grant execute on function public.release_checkout_session(uuid, text, boolean) to service_role;
grant execute on function app_private.allocate_minor(bigint, bigint[]) to service_role;
grant execute on function public.reserve_guest_checkout(text, text, text) to service_role;
grant execute on function public.accept_guest_order(text, uuid, bigint, boolean, text, text, text, text, text, jsonb, public.payment_method_kind, text) to service_role;
grant execute on function public.convert_order_reservations(uuid) to service_role;
grant execute on function public.release_order_reservations(uuid, text, boolean) to service_role;
grant execute on function public.expire_due_checkout_work(integer) to service_role;
