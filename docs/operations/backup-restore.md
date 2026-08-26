# Backup, restore, and integrity rehearsal

## Objectives and prerequisites

- Recovery point objective (RPO): no more than 15 minutes of accepted commercial data.
- Recovery time objective (RTO): service restored and verified within 4 hours.
- Production requires a paid Supabase project with Point-in-Time Recovery (PITR), adequate compute, an approved retention window, Owner access, and alert ownership.
- Supabase database backups do not contain Storage objects. Product originals/renditions and private evidence need a separate inventory/export or recoverable storage policy.

See the official [Supabase database backup guide](https://supabase.com/docs/guides/platform/backups), [restore-to-new-project guide](https://supabase.com/docs/guides/platform/clone-project), and [CLI backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## Quarterly isolated rehearsal

1. Record source project, selected recovery timestamp, latest accepted order timestamp, release/schema version, Storage object counts/checksums, and start time.
2. Restore or clone to a new isolated paid project. Disable outgoing webhooks, scheduled work, email, hosted payments, analytics, and other external side effects before opening access.
3. Reapply environment-specific Auth redirects, extensions/settings, Storage buckets/policies/objects, Edge/Netlify functions, API keys, Realtime settings, and provider modes. Restored database keys and project configuration are not assumed identical.
4. Generate database types and run migrations/drift, pgTAP, authorization bypass tests, and `verify_critical_data_integrity()`.
5. Compare critical counts and relationships: products/translations/prices/inventory, media assets/links/variants/licenses, profiles/staff/active Owners/sessions, orders/lines/addresses/events, payments/provider inbox/refunds, reservations/inventory events, notifications/attempts, audit/archive, scheduled actions/runs, releases, and readiness evidence.
6. List every Storage path referenced by approved media/evidence records and verify the object exists with expected size/checksum. Separately flag unreferenced objects for review; never delete during rehearsal.
7. Exercise storefront discovery, a synthetic checkout, staff sign-in/MFA, order operations, outbox replay, scheduled catch-up, and backup-environment health with all providers disabled or fixture-only.
8. Measure RPO from the source's latest accepted critical write to the recovered point and RTO from start to completed integrity/smoke. If either objective fails, launch remains blocked until capacity, PITR, Storage recovery, or procedure changes are made and retested.
9. Insert a passed/failed `backup_restore_evidence` record with safe checks, RPO/RTO, artifact reference, and correlation ID. Retain the signed report for at least three years; remove the isolated project and exports through the approved cleanup after evidence retention is confirmed.

## Integrity SQL entry point

Run through a service-scoped operator session:

```sql
select public.verify_critical_data_integrity();
```

Then run the repository pgTAP suite and the detailed count/media-reference checklist. The compact function is an early warning, not a substitute for Storage object verification or commercial reconciliation.

## Emergency production restore

Stop or degrade writes, preserve evidence, choose the latest safe PITR point before corruption, communicate downtime, and obtain Owner approval. Restore only after estimating intentional writes that would be lost. After restore, rotate potentially exposed secrets, replay only idempotent durable work, reconcile provider truth, and do not reopen checkout until order/payment/inventory/media/authorization integrity passes.
