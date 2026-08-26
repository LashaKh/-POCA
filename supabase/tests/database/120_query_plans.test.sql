begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(22);

create function pg_temp.query_plan(p_sql text)
returns text
language plpgsql
as $$
declare
  plan_document json;
begin
  execute 'explain (format json) ' || p_sql into plan_document;
  return plan_document::text;
end;
$$;

select has_index('public', 'products', 'products_admin_status_updated', 'product admin list has a bounded index');
select has_index('public', 'orders', 'orders_staff_status_accepted', 'order status queue has a bounded index');
select has_index('public', 'orders', 'orders_payment_status_updated', 'payment-status queue has a bounded index');
select has_index('public', 'orders', 'orders_customer_accepted', 'customer order history has a partial index');
select has_index('public', 'orders', 'orders_reporting_currency_accepted', 'sales reporting has a covering index');
select has_index('public', 'payment_attempts', 'payment_attempts_status_updated', 'payment reporting has a covering index');
select has_index('public', 'payment_attempts', 'payment_attempts_order_created', 'order payment timeline has an index');
select has_index('public', 'inventory_items', 'inventory_items_low_stock', 'low-stock reporting has a partial index');
select has_index('public', 'inventory_events', 'inventory_events_reporting_time', 'inventory event reporting has a time index');
select has_index('public', 'ingestion_batches', 'ingestion_batches_reporting_time', 'ingestion reporting has a covering index');
select has_index('public', 'media_jobs', 'media_jobs_active_queue', 'media work has an active-queue index');
select has_index('public', 'scheduled_actions', 'scheduled_actions_active_queue', 'scheduled work has an active-queue index');
select has_index('public', 'notifications', 'notifications_active_queue', 'notification work has an active-queue index');
select has_index('public', 'export_jobs', 'export_jobs_active_queue', 'export work has an active-queue index');
select has_index('public', 'operational_alerts', 'operational_alerts_open_severity', 'open alerts have a severity index');
select has_index('public', 'audit_events', 'audit_events_recent', 'recent audit history has an index');
select has_index('public', 'content_entries', 'content_entries_admin_status_updated', 'content admin list has an index');
select has_index('public', 'return_requests', 'return_requests_reporting_time', 'returns reporting has a covering index');

set local enable_seqscan = off;

select matches(
  pg_temp.query_plan(
    'select id from public.orders where status = ''confirmed'' order by accepted_at desc, id limit 30'
  ),
  'orders_staff_status_accepted',
  'order queue query uses the bounded status index'
);

select matches(
  pg_temp.query_plan(
    'select id from public.payment_attempts where status = ''pending'' order by updated_at, id limit 30'
  ),
  'payment_attempts_status_updated',
  'payment queue query uses its status index'
);

select matches(
  pg_temp.query_plan(
    'select id from public.scheduled_actions where status = ''pending'' order by due_at, id limit 30'
  ),
  'scheduled_actions_active_queue',
  'scheduled work query uses its partial queue index'
);

select matches(
  pg_temp.query_plan(
    'select id from public.return_requests where created_at >= statement_timestamp() - interval ''30 days'' order by created_at desc limit 30'
  ),
  'return_requests_reporting_time',
  'returns reporting query uses its time index'
);

select * from finish();
rollback;
