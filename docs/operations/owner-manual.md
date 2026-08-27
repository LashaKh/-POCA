# ÉPOCA Owner manual

Audience: the business/system Owner with full application authority  
Last reviewed: 2026-08-26  
Prerequisite: MFA (AAL2) on a dedicated account; no shared Owner login

The Owner can do everything in the Manager manual and is accountable for
access, integrations, privacy, audit, recovery, release evidence, and go/no-go.
Full permission does not bypass the same version, confirmation, idempotency,
reconciliation, or evidence rules.

## Owner safety rules

1. Keep at least two recoverable active Owners before changing Owner access.
2. Use a password manager, TOTP backup/recovery procedure, trusted device, and
   separate provider-console accounts. Never share credentials in chat or Git.
3. Treat any disclosed key/password as compromised: rotate, revoke sessions,
   review logs, and record safe evidence before reuse.
4. Never approve launch from “the page looks good.” Require the readiness gate,
   immutable commit/build/migration/SBOM evidence, staging reconciliation,
   monitoring, backup/restore, rollback point, and external approvals.
5. For protected actions, read the impact, type the exact phrase, provide a
   reason, and verify the resulting audit event.

## Daily Owner review

Open `/admin/operations` and review:

- current environment/release and readiness stage;
- dependency health and disabled/degraded states;
- queue age, lease/retry/dead-letter state, and scheduler catch-up;
- critical/open alerts and occurrence count;
- backup/restore, monitoring, domain, legal, and staging evidence status;
- release blockers. A blocker is resolved only by referenced evidence.

Then review audit exceptions, staff/session changes, payment/refund
reconciliation, privacy cases, and Manager handover items.

## Staff and access administration

Use `/admin/settings/staff`.

### Invite/activate

1. Confirm legal identity, role, business need, approver, and secure delivery
   channel.
2. Invite the minimum role. Manager is normal operations; Owner is exceptional.
3. Verify invitation expiry and single-use acceptance. Require MFA for Owner.
4. After activation, test the allowed route and one denied Owner-only route.
5. Record role/access review date and owner.

### Change/deactivate/revoke

1. Review open work and reassign it.
2. Use the versioned protected action with exact confirmation/reason.
3. Revoke application/auth sessions and related provider access.
4. Verify the staff record, session list, and audit event.
5. For suspected compromise, rotate affected secrets and invoke the incident
   runbook; deactivation alone is not sufficient.

The database prevents removing/deactivating the last active Owner. Follow
`docs/operations/runbooks/owner-recovery.md` for recovery—never bypass the
guard with ad-hoc SQL.

## Integrations and secret status

Use `/admin/settings/integrations` for status metadata only; secret values are
intentionally never displayed. Configure secrets in scoped Supabase/Netlify or
provider environment stores.

For each provider:

1. Complete its row in `external-activation-register.md`.
2. Obtain least-privilege sandbox credentials through an approved channel.
3. Configure staging scope, mode, callback origins, signing secrets, owner, and
   rotation date. Do not enable live mode yet.
4. Run the provider-specific create/failure/timeout/replay/reconcile/disable
   tests and inspect payloads for PII.
5. Record evidence reference and rollback/disable path.
6. After business/provider approval, rotate or promote to production-scoped
   credentials and run a controlled live proof.

Fixture/sandbox modes are forbidden in production. Disabled is honest and may
be build-complete, but required disabled providers block launch-ready.

For organic search, Search Console, Merchant Center free listings, and Bing,
follow `docs/operations/google-discovery-activation.md`. Keep Merchant feeds
disabled until each item resolves to one approved seller, origin, market,
price, shipping policy, and return policy; do not submit the placeholder
domain or create a Business Profile without a verified customer-facing site.

## Audit and protected exports

Use `/admin/audit` only at AAL2.

- Search by safe action/entity/reference/correlation/result, not buyer PII.
- Denied and failed events are as important as successes; investigate unusual
  bursts and repeated protected actions.
- Audit summaries reject/defensively redact secrets, contacts, addresses, and
  network identifiers. Never try to work around that constraint.
- Audit/privacy/catalog/report exports are private, bounded, spreadsheet-safe,
  and expire. Verify requester, purpose, row count, expiry, download, and
  destruction/retention.
- Audit is append-only. Corrections are new linked events, not edits.

## Privacy, consent, retention, and requests

Use `/admin/settings/privacy` and the versioned privacy case workflow.

1. Verify requester identity and scope through the approved channel.
2. Classify access, correction, deletion, export, restriction, or objection.
3. Identify legal holds/financial/audit records that cannot be rewritten;
   separate those from mutable account/contact data.
4. Preview impact. Sensitive export/deletion/retention changes require AAL2,
   exact confirmation, reason, and audit evidence.
5. Deliver through a private expiring export; record fulfillment without
   copying the data into notes.
6. Verify purge/anonymization/retention result and close with safe reference.

Optional analytics/newsletter consent is versioned and revocable. Operational
order/security communication must not be silently reused for marketing.
Approve final legal bases, periods, processors, regions, DPAs, and policy copy
before launch.

## Financial and payment oversight

In addition to the Manager workflow:

- approve merchant/bank configuration and four-locale instructions;
- separate payment creation, browser return, signed callback, reconciliation,
  settlement, and refund as distinct evidence;
- review daily unmatched/duplicate/uncertain/provider-down items;
- compare report totals with TBC/bank/accounting totals by currency and date;
- approve/refuse risk exceptions explicitly—never convert uncertainty to paid;
- maintain incident and provider escalation contacts.

Any callback-signature failure, settlement mismatch, duplicate refund, or raw
card data observed in ÉPOCA is a launch/operation-stopping incident.

## Backup and restore

Production requires Supabase PITR plus the approved procedure in
`docs/operations/backup-restore.md`.

Before launch and on schedule:

1. Confirm backup plan/retention/alerts and access separation.
2. Restore an approved recovery point into an isolated environment.
3. Verify migration head, row/count invariants, RLS, private storage access,
   authentication isolation, jobs, and application smoke.
4. Record RPO, RTO, operator, timestamps, evidence artifact, and cleanup.
5. Do not treat “backup enabled” as restore proof.

## Incident and release rollback

Follow `docs/operations/runbooks/incident-rollback.md`.

1. Declare severity/owner, preserve safe evidence, and stop harmful promotion
   or provider actions.
2. Revoke/rotate credentials or sessions if exposure is possible.
3. Choose rollback, feature/provider disablement, queue pause, or forward fix
   based on the immutable release/migration point and data compatibility.
4. Reconcile orders/payments/inventory/notifications affected during the
   window. Never replay blindly.
5. Communicate through approved legal/support channels.
6. Verify recovery, monitor, document root cause/corrective actions, and update
   this manual/threat model/tests.

## Launch-day checklist

### Before change window

- [ ] All required external activation rows are Ready; exposed credentials are
      rotated and old sessions/tokens revoked.
- [ ] Final legal/tax/privacy/returns/delivery/contact/banking copy is approved
      in all four locales.
- [ ] Production product facts, price, stock, translations, media rights, crops,
      and alt text pass readiness.
- [ ] Immutable Git commit/build, migration head, tests, SBOM/checksums and
      attestation are preserved.
- [ ] Staging smoke, payment/email/domain, monitoring, backup restore, security,
      accessibility, SEO, load, resilience, and reconciliation evidence pass.
- [ ] Netlify/Supabase/provider/DNS operators, incident owners, support, and
      rollback point/window are confirmed.
- [ ] `production-readiness-report.md` says launch-ready GO; no required blocker
      is waived informally.

### Activation

1. Freeze source/content/configuration changes.
2. Back up and record pre-change migration/release/provider/DNS state.
3. Apply reviewed migrations before application promotion where the release
   contract requires it; verify type/head/readiness.
4. Promote the immutable staging build—do not rebuild different source.
5. Activate scoped live provider modes and final domain/DNS in the approved
   order.
6. Run post-deploy health plus guest search/product/cart/checkout, bank transfer,
   controlled online payment/refund (if live), email, Manager/Owner, job,
   headers, sitemap/robots/canonical, and private-media checks.
7. Reconcile the controlled records in database/provider/bank/outbox/audit.
8. Record deploy ID, migration head, smoke reference, monitoring reference,
   decision time, operator, and rollback point.

### Observe and close

- Monitor error/latency/queue/payment/email/stock/contact/return alerts closely
  through the agreed observation window.
- Keep merchandising volume controlled until reconciliation is clean.
- Roll back/disable according to evidence if thresholds breach; do not wait for
  buyer reports.
- Close the window only after Owner sign-off and handoff to normal operations.

If any launch-ready prerequisite is missing, remain staging-operational and
record the exact blocker. Do not label the shop live or production-ready.
