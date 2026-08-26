-- The operations landing page needs one consistent snapshot. Keeping these
-- counts in one role-checked command avoids eleven parallel HTTP requests on
-- every admin navigation and keeps the dashboard stable under load.

create or replace function public.read_order_operations_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app_private.assert_manager();

  select jsonb_build_object(
    'pendingPayments', (
      select count(*)
      from public.orders
      where payment_status::text in (
        'pending',
        'bank_transfer_review',
        'uncertain',
        'reconciliation_required'
      )
    ),
    'transferReviews', (
      select count(*)
      from public.payment_reconciliations
      where status::text in ('pending', 'unmatched', 'late')
    ),
    'fulfillment', (
      select count(*)
      from public.orders
      where status::text in ('confirmed', 'processing', 'shipped')
    ),
    'failedNotifications', (
      select count(*)
      from public.notifications
      where status::text in ('failed', 'bounced', 'cancelled')
    ),
    'providerFailures', (
      select count(*)
      from public.provider_event_inbox
      where status::text = 'failed'
    ),
    'alerts', (
      select count(*)
      from public.operational_alerts
      where status::text = 'open'
    ),
    'lowStock', (
      select count(*)
      from public.inventory_items
      where available_quantity <= 1
    ),
    'missingTranslations', (
      select count(*)
      from public.products product_record
      where (
        select count(distinct translation.locale)
        from public.product_translations translation
        where translation.product_id = product_record.id
      ) < 4
    ),
    'failedIngestion', (
      select count(*)
      from public.ingestion_batches
      where status::text = 'failed'
    ),
    'openReturns', (
      select count(*)
      from public.return_requests
      where status::text in (
        'requested',
        'needs_information',
        'approved',
        'in_transit',
        'received',
        'inspected',
        'refund_pending'
      )
    ),
    'oldestOpenMinutes', coalesce((
      select greatest(
        0,
        floor(extract(epoch from statement_timestamp() - min(accepted_at)) / 60)
      )::bigint
      from public.orders
      where status::text in (
        'bank_transfer_pending',
        'payment_pending',
        'confirmed',
        'processing'
      )
    ), 0)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.read_order_operations_summary()
from public, anon;
grant execute on function public.read_order_operations_summary()
to authenticated, service_role;

comment on function public.read_order_operations_summary() is
  'Role-checked operational queue counts returned as one consistent dashboard snapshot.';
