create or replace function app_private.assert_report_window(
  p_from timestamptz,
  p_to timestamptz,
  p_currency public.currency_code
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_currency is null
    or p_from >= p_to
    or p_to - p_from > interval '366 days'
    or p_currency::text not in ('GEL', 'USD', 'EUR') then
    raise exception 'INVALID_REPORT_WINDOW' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.read_operational_report(
  p_from timestamptz,
  p_to timestamptz,
  p_currency public.currency_code
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  report jsonb;
begin
  perform app_private.assert_manager();
  perform app_private.assert_report_window(p_from, p_to, p_currency);

  select jsonb_build_object(
    'period', jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'timeZone', 'Asia/Tbilisi',
      'currency', p_currency
    ),
    'sales', jsonb_build_object(
      'orderCount', (select count(*) from public.orders o
        where o.accepted_at >= p_from and o.accepted_at < p_to and o.currency = p_currency),
      'grossMinor', (select coalesce(sum(o.subtotal_minor + o.tax_minor + o.delivery_minor), 0) from public.orders o
        where o.accepted_at >= p_from and o.accepted_at < p_to and o.currency = p_currency),
      'netMinor', (select coalesce(sum(o.total_minor), 0) from public.orders o
        where o.accepted_at >= p_from and o.accepted_at < p_to and o.currency = p_currency),
      'discountMinor', (select coalesce(sum(o.discount_minor), 0) from public.orders o
        where o.accepted_at >= p_from and o.accepted_at < p_to and o.currency = p_currency),
      'taxMinor', (select coalesce(sum(o.tax_minor), 0) from public.orders o
        where o.accepted_at >= p_from and o.accepted_at < p_to and o.currency = p_currency),
      'deliveryMinor', (select coalesce(sum(o.delivery_minor), 0) from public.orders o
        where o.accepted_at >= p_from and o.accepted_at < p_to and o.currency = p_currency),
      'statusCounts', coalesce((
        select jsonb_object_agg(grouped.status, grouped.total)
        from (
          select o.status::text as status, count(*) as total
          from public.orders o
          where o.accepted_at >= p_from and o.accepted_at < p_to and o.currency = p_currency
          group by o.status
        ) grouped
      ), '{}'::jsonb)
    ),
    'payments', jsonb_build_object(
      'attemptCount', (select count(*) from public.payment_attempts p
        where p.created_at >= p_from and p.created_at < p_to and p.currency = p_currency),
      'amountMinor', (select coalesce(sum(p.amount_minor), 0) from public.payment_attempts p
        where p.created_at >= p_from and p.created_at < p_to and p.currency = p_currency),
      'statusCounts', coalesce((
        select jsonb_object_agg(grouped.status, grouped.total)
        from (
          select p.status::text as status, count(*) as total
          from public.payment_attempts p
          where p.created_at >= p_from and p.created_at < p_to and p.currency = p_currency
          group by p.status
        ) grouped
      ), '{}'::jsonb)
    ),
    'stock', jsonb_build_object(
      'outOfStock', (select count(*) from public.inventory_items i where i.available_quantity = 0),
      'lowStock', (select count(*) from public.inventory_items i
        where i.available_quantity > 0 and i.available_quantity <= i.low_stock_threshold),
      'availableUnits', (select coalesce(sum(i.available_quantity), 0) from public.inventory_items i)
    ),
    'ingestion', jsonb_build_object(
      'batchCount', (select count(*) from public.ingestion_batches b
        where b.created_at >= p_from and b.created_at < p_to),
      'completed', (select count(*) from public.ingestion_batches b
        where b.created_at >= p_from and b.created_at < p_to and b.status = 'published'),
      'failed', (select count(*) from public.ingestion_batches b
        where b.created_at >= p_from and b.created_at < p_to and b.status = 'failed'),
      'registeredFiles', (select coalesce(sum(b.registered_file_count), 0) from public.ingestion_batches b
        where b.created_at >= p_from and b.created_at < p_to),
      'readyFiles', (select coalesce(sum(b.ready_file_count), 0) from public.ingestion_batches b
        where b.created_at >= p_from and b.created_at < p_to),
      'failedFiles', (select coalesce(sum(b.failed_file_count), 0) from public.ingestion_batches b
        where b.created_at >= p_from and b.created_at < p_to)
    ),
    'returns', jsonb_build_object(
      'requestCount', (select count(*) from public.return_requests r
        where r.created_at >= p_from and r.created_at < p_to),
      'open', (select count(*) from public.return_requests r
        where r.created_at >= p_from and r.created_at < p_to
          and r.status not in ('rejected', 'closed', 'cancelled', 'refunded')),
      'refunded', (select count(*) from public.return_requests r
        where r.created_at >= p_from and r.created_at < p_to and r.status = 'refunded'),
      'statusCounts', coalesce((
        select jsonb_object_agg(grouped.status, grouped.total)
        from (
          select r.status::text as status, count(*) as total
          from public.return_requests r
          where r.created_at >= p_from and r.created_at < p_to
          group by r.status
        ) grouped
      ), '{}'::jsonb)
    ),
    'operations', jsonb_build_object(
      'openAlerts', (select count(*) from public.operational_alerts a where a.status <> 'resolved'),
      'criticalAlerts', (select count(*) from public.operational_alerts a
        where a.status <> 'resolved' and a.severity = 'critical'),
      'queuedMediaJobs', (select count(*) from public.media_jobs j
        where j.status in ('queued', 'retrying', 'processing')),
      'queuedExports', (select count(*) from public.export_jobs e
        where e.status in ('pending', 'leased')),
      'dueScheduledActions', (select count(*) from public.scheduled_actions s
        where s.status in ('pending', 'failed') and s.due_at <= statement_timestamp())
    )
  ) into report;

  return report;
end;
$$;

create or replace function public.request_operational_report_export(
  p_from timestamptz,
  p_to timestamptz,
  p_currency public.currency_code
)
returns public.export_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  export_record public.export_jobs;
  correlation uuid := extensions.gen_random_uuid();
begin
  perform app_private.assert_manager();
  perform app_private.assert_report_window(p_from, p_to, p_currency);
  if auth.uid() is null then
    raise exception 'STAFF_IDENTITY_REQUIRED' using errcode = '42501';
  end if;

  insert into public.export_jobs (
    requested_by, export_type, scope, status, expires_at,
    correlation_id, export_format, download_name
  ) values (
    auth.uid(),
    'operational-report',
    jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'currency', p_currency,
      'timeZone', 'Asia/Tbilisi'
    ),
    'pending',
    statement_timestamp() + interval '2 hours',
    correlation,
    'csv',
    'epoca-operational-report-' || lower(p_currency::text) || '.csv'
  ) returning * into export_record;

  perform app_private.write_audit_event(
    case when public.is_active_staff('owner') then 'owner' else 'manager' end,
    'report.export.request', 'export', export_record.id::text,
    'succeeded', 'operational-report', correlation,
    jsonb_build_object('bounded', true, 'currency', p_currency, 'expiresInHours', 2)
  );
  return export_record;
end;
$$;

revoke all on function app_private.assert_report_window(timestamptz, timestamptz, public.currency_code) from public, anon, authenticated;
revoke all on function public.read_operational_report(timestamptz, timestamptz, public.currency_code) from public, anon;
revoke all on function public.request_operational_report_export(timestamptz, timestamptz, public.currency_code) from public, anon;
grant execute on function public.read_operational_report(timestamptz, timestamptz, public.currency_code) to authenticated, service_role;
grant execute on function public.request_operational_report_export(timestamptz, timestamptz, public.currency_code) to authenticated, service_role;

