# US11 production operations evidence — 2026-08-26

## Outcome

The shop is locally operable and recoverable: releases are gated, health and queues are visible to an AAL2 Owner, scheduled jobs use leases and catch-up, operational evidence is privacy-safe, and a current-schema database/media restore has been executed. Readiness remains a truthful `payment-ready / hold`, not a launch claim.

## Functional requirement evidence

| Requirement                                | Evidence                                                                                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-097 consent-gated analytics             | Disabled/fixture/PostHog adapters validate consent; PostHog autocapture, profiles, and replay are disabled; browsing/buying/admin paths have no analytics dependency. Covered by `tests/unit/operations/providers.test.ts`.                                             |
| FR-098 event dictionary and outcomes       | `lib/observability/events.ts` defines named search/filter/product/wishlist/cart/checkout/order/upload/admin events; logger validation and metric dictionaries are covered by operations unit tests.                                                                     |
| FR-099 trust boundaries and abuse controls | Zod command schemas, safe failures, rate limits, signed callbacks, bounded uploads, idempotent checkout, authorization guards, and 391 pgTAP assertions plus security integration tests.                                                                                |
| FR-100 credential handling                 | Checked environment schema, safe status booleans/modes, ignored environment files, secret scan, disabled/fixture/live separation, and no committed conversation credential.                                                                                             |
| FR-101 operational diagnosis               | Correlation IDs flow through proxy/responses and sign-in/checkout/ingestion/payment/notification/admin boundaries; health, queue age, scheduler age, alerts, metrics, and Owner diagnostics omit customer text and secrets.                                             |
| FR-102 release procedure                   | Ordered migrations, deterministic local seed, isolated environment guidance, CI/release workflows, build/smoke/readiness/promotion/rollback scripts, Netlify headers/functions/runtime pinning, and dated gate evidence.                                                |
| FR-103 recovery procedures                 | Backup/PITR, incident, rollback, payment/domain activation, and Owner-recovery runbooks plus the current 37-migration restore rehearsal.                                                                                                                                |
| FR-104 missing external inputs             | Payment/email/assistance/analytics/monitoring adapters expose disabled/fixture state; health/readiness identify blockers; real Netlify/managed Supabase activation is not fabricated.                                                                                   |
| FR-105 reconciliation evidence             | Immutable order/payment/inventory/audit events, provider inbox, notification attempts, scheduled runs, alerts/occurrences, release/readiness/restore records, and safe correlation references. Returns/refunds receive additional domain coverage in their later phase. |
| FR-106 staged readiness                    | `evaluateReadiness` separates build-complete, payment-ready, staging-operational, and launch-ready; current generated result is `payment-ready`, `hold`, with eight explicit blockers.                                                                                  |

## Non-functional requirement evidence

| Requirement                    | Evidence                                                                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-003 progressive resilience | Server-rendered public content, safe loading/error states, disabled-provider behavior, recoverable command results, and smoke journeys. The duplicate loading `<main>` landmark was removed.                           |
| NFR-004 perceived speed        | Responsive-image requirement and bundle budgets pass; production build and 390/768/1440 journeys pass. Real p75 Core Web Vitals still require a deployed staging URL and RUM.                                          |
| NFR-005 interaction response   | Database search p95 is 16 ms under the local harness; queue/scheduler feedback and loading states are present. Deployed p95 remains a staging measurement gate.                                                        |
| NFR-006 reliability            | Checkout contention/idempotency, authoritative payment, two-person bank review, inventory conversion/release, leases/heartbeats/catch-up, retry/dead-letter behavior, and exact restore invariants pass.               |
| NFR-007 privacy/security       | Data minimization, RLS, forced immutable domains, CSP/security headers, PII redaction, provider payload hashing, retention/rotation documentation, and security gate pass. Raw card data never enters the application. |
| NFR-009 media efficiency       | Responsive rendition checks pass; image dimensions are reserved; automated ingestion creates bounded formats; the restore manifest verifies original/rendition checksums separately from the database.                 |
| NFR-010 recoverability         | Safe diagnostic evidence, executable local rollback rehearsal, exact database/media restore, reconciliation paths, and incident/Owner runbooks. Managed production recovery remains an explicit external gate.         |
| NFR-011 testability            | 147 Vitest tests, 391 pgTAP assertions, production smoke, stateful critical journeys, 25/25 accessibility combinations, performance budgets, security audit, and reproducible recovery scripts.                        |

## Operations behavior proven

- One typed coordinator claims publication, expiry, recovery, cleanup, reconciliation, outbox, alert, export, and security work with a bounded lease.
- Missed windows are replayed oldest first without duplicate current/future windows.
- Health distinguishes liveness from readiness and exposes detail only to an AAL2 Owner.
- Alert occurrences deduplicate without losing occurrence history.
- The Owner dashboard renders health, queues, alerts, scheduler runs, notification counts, release/readiness, blockers, and evidence links across all four languages and configured viewports.
- Local logical restore recovered 37 migrations, a synthetic accepted order, stock/payment/event relationships, 5,001 products, and separately archived original/rendition bytes with zero invariant failures.

## Production boundary

This evidence completes the repository-controlled US11 implementation. It does not assert live production readiness. Netlify preview, managed Supabase PITR, monitoring validation, domain activation, approved legal copy, credential rotation, and production environment evidence must clear the generated readiness blockers before promotion.
