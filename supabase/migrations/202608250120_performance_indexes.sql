-- Cross-system indexes for bounded staff queues and operational reporting.
-- Partial indexes keep write overhead focused on records that still need work.

create index products_admin_status_updated
on public.products (status, updated_at desc, id);

create index orders_staff_status_accepted
on public.orders (status, accepted_at desc, id);

create index orders_payment_status_updated
on public.orders (payment_status, updated_at desc, id);

create index orders_customer_accepted
on public.orders (customer_profile_id, accepted_at desc, id)
where customer_profile_id is not null;

create index orders_reporting_currency_accepted
on public.orders (currency, accepted_at desc)
include (status, payment_status, subtotal_minor, discount_minor, tax_minor, delivery_minor, total_minor);

create index payment_attempts_status_updated
on public.payment_attempts (status, updated_at, id)
include (amount_minor, currency, provider);

create index payment_attempts_order_created
on public.payment_attempts (order_id, created_at desc, id);

create index inventory_items_low_stock
on public.inventory_items (available_quantity, low_stock_threshold, product_id)
where available_quantity <= low_stock_threshold;

create index inventory_events_reporting_time
on public.inventory_events (occurred_at desc, inventory_item_id);

create index ingestion_batches_reporting_time
on public.ingestion_batches (created_at desc, status)
include (registered_file_count, ready_file_count, failed_file_count, duplicate_file_count);

create index media_jobs_active_queue
on public.media_jobs (status, next_attempt_at, queued_at, id)
where status in ('queued', 'retrying', 'processing');

create index scheduled_actions_active_queue
on public.scheduled_actions (status, due_at, id)
where status in ('pending', 'leased', 'failed');

create index notifications_active_queue
on public.notifications (status, available_at, created_at, id)
where status in ('pending', 'leased', 'failed');

create index export_jobs_active_queue
on public.export_jobs (status, available_at, created_at, id)
where status in ('pending', 'leased', 'failed');

create index operational_alerts_open_severity
on public.operational_alerts (severity, last_seen_at desc, id)
where status in ('open', 'acknowledged');

create index audit_events_recent
on public.audit_events (occurred_at desc, id);

create index content_entries_admin_status_updated
on public.content_entries (status, updated_at desc, id);

create index return_requests_reporting_time
on public.return_requests (created_at desc, status)
include (request_kind, refunded_at);

