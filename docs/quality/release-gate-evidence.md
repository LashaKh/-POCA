# Release gate evidence — 2026-08-26

## Decision

**Local release candidate: passed. Production promotion: hold.** Every repository-controlled Phase 9 gate is green. Netlify preview smoke, managed Supabase PITR, live monitoring, domain activation, legal approval, and credential rotation cannot be truthfully completed without external configuration; no partial or production deploy was attempted.

## Executed gates

| Gate                              | Result         | Evidence                                                                                                                                                                                    |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting / lint / TypeScript    | Passed         | Prettier, zero-warning ESLint, and `tsc --noEmit`                                                                                                                                           |
| Unit / component / contract       | Passed         | 38 Vitest files, 147 tests                                                                                                                                                                  |
| Clean migrations and seed         | Passed         | 37 ordered migrations through `202608250073`; 5,000 published synthetic fixtures; explicit readiness hold                                                                                   |
| Database behavior / authorization | Passed         | 9 pgTAP files, 391 assertions, including active-staff media-job visibility under RLS                                                                                                        |
| Generated database types / drift  | Passed         | Checked types match; no local schema drift                                                                                                                                                  |
| Security                          | Passed         | No moderate/high/critical npm advisory; no repository secret pattern; headers/CSP, last-Owner, rate-limit, RLS, authorization, and application-boundary suites passed                       |
| Production build                  | Passed         | Next.js 16.3.2 optimized build; 94 static-generation units; health and Owner Operations routes present                                                                                      |
| Production smoke                  | Passed         | 4/4 health, discovery/checkout, protected-admin, MFA/recovery/disabled-provider smoke journeys                                                                                              |
| Stateful P1 journeys              | Passed         | Guest bank transfer, hosted-payment confirmation, ingestion/publication, two-person transfer confirmation, fulfillment, refund, and cancellation passed on their owning Playwright projects |
| Accessibility / responsive        | Passed         | 25/25 combinations across 390/768/1440, Georgian/English/German/Russian, Chromium/Firefox/WebKit; Owner Operations included; error pages explicitly rejected                                |
| Performance                       | Passed         | Root JS gzip 130,375 B ≤ 174,080 B; responsive images present; database search p95 16 ms ≤ 250 ms; queue age 0 s ≤ 900 s                                                                    |
| Cost fixture                      | Passed         | Local fixture usage remained within configured Netlify/Supabase/monitoring budgets                                                                                                          |
| Backup / restore                  | Passed locally | Exact 37-migration logical restore, critical counts, RLS, order/stock/media invariants, and two Storage archives; see `docs/quality/restore-rehearsal.md`                                   |
| Rollback rehearsal                | Passed locally | Mock control-plane verified old-deploy lookup and Netlify restore endpoint; live script still requires database compatibility and explicit production confirmation; no deploy changed       |

## Release and readiness controls

- `artifacts/release-gates/latest.json` records the local build/migration/test/security/performance/smoke/accessibility/restore gate results.
- `artifacts/releases/local-rollback-rehearsal.json` records the non-mutating rollback control-plane rehearsal.
- `artifacts/readiness/latest.json` evaluated to `payment-ready`, decision `hold`.
- The release scripts require an immutable deploy ID, HTTPS smoke URL, allowed readiness stage, and explicit production promotion or rollback confirmation.
- A Netlify rollback changes the deployed application only; database compatibility is a required human confirmation and the database is never implicitly restored.

## External gates intentionally not claimed

The repository has no configured `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, immutable preview deploy ID, or preview URL. Therefore the real Netlify preview smoke and live rollback API were not run. The repository also has no linked isolated managed Supabase staging project. The managed PITR and production-sized Storage restore remain unproven.

The current eight readiness blockers are:

1. `STAGING_SMOKE_UNPROVEN`
2. `MONITORING_UNPROVEN`
3. `DOMAIN_NOT_ACTIVATED`
4. `LEGAL_COPY_NOT_APPROVED`
5. `PRODUCTION_ENVIRONMENT_INCOMPLETE`
6. `ROTATE_DISCLOSED_CREDENTIALS`
7. `NETLIFY_SITE_LINK`
8. `MANAGED_SUPABASE_LINK`

Credentials disclosed in the conversation were never written to repository files or release artifacts. They must be rotated before any managed environment is linked.

## Reproduction

Run a clean local Supabase reset, then the source, database, security, build, smoke, stateful Playwright, accessibility, performance, restore, rollback-rehearsal, and readiness commands documented in `docs/operations/runbooks/environment-deployment.md`. Managed promotion remains blocked until the external evidence references make the readiness decision advance without overrides.
