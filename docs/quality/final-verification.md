# Final verification

**Date:** 2026-08-26  
**Environment:** macOS, Node.js 24 LTS, npm 11, Supabase CLI 2.115.0  
**Application:** Next.js 16.3.2 optimized build with local Supabase  
**Repository-controlled result:** PASS

## Clean foundation

| Gate                          | Result                                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| `npm ci`                      | PASS; 592 packages installed, zero npm vulnerabilities                |
| `npm run db:reset`            | PASS; 54 ordered migrations and all safe local seeds                  |
| `npm run db:seed:verify`      | PASS; 5,000 published synthetic fixtures, explicitly held from launch |
| `npm run db:test`             | PASS; 17 pgTAP files, 653 assertions                                  |
| `npm run db:types:check`      | PASS; committed types match the reset schema                          |
| `npm run db:migrations:check` | PASS; unique ordered migrations through `202608250123`                |
| `npm run db:drift:check`      | PASS; no local schema drift                                           |

The restore rehearsal separately rebuilt the schema, data and Storage archives,
then verified RLS and commerce invariants. It proved a local RPO of zero and a
13-second local logical restore; managed Supabase PITR remains an external gate.

## Source and build gates

| Command                                              | Result                                                |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `npm run format:check`                               | PASS                                                  |
| `npm run lint`                                       | PASS; zero warnings                                   |
| `npm run typecheck`                                  | PASS; strict TypeScript                               |
| `npm test`                                           | PASS; 60 files, 236 tests                             |
| `SITE_URL=http://127.0.0.1:3015 npm run build:local` | PASS; 206 generated page variants plus dynamic routes |
| `npm run cleanup:check`                              | PASS                                                  |

## Browser and output gates

Playwright runs with one worker because its stateful journeys intentionally
share one local Supabase database. Parallel workers can race on staff, MFA and
inventory state, so the release gate uses isolated serial groups rather than a
misleading parallel monolith.

| Gate                                               | Result                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Final WCAG matrix                                  | PASS; 5 browser/locale/viewport profiles in 5.2 minutes                      |
| Production smoke                                   | PASS; 20/20 checks across Chromium phone/tablet/desktop, Firefox and WebKit  |
| Generated SEO/discovery                            | PASS; canonical, hreflang, robots, sitemap, JSON-LD, redirects and noindex   |
| Final visual matrix                                | PASS; 576 route checks, 288 screenshots, zero overflow/client errors         |
| Corrected mobile returns journey                   | PASS at 390 px                                                               |
| Corrected Owner/Manager/MFA boundary               | PASS at 768 px                                                               |
| Corrected catalogue truth/filter/currency journeys | PASS; 3/3 at 390 px                                                          |
| Resilience matrix                                  | PASS; 11 files/41 tests plus ingestion-recovery and 36 dashboard transitions |

The feature-specific browser suites for checkout, ingestion, order operations,
catalogue administration, customer accounts, returns, access control,
worldwide selling, reporting, content/consent and system states are recorded in
their `docs/quality/us*-evidence.md` files. A diagnostic two-worker aggregate
run was discarded after demonstrating shared-database collisions; every actual
defect or stale assertion it exposed was fixed and rerun serially.

## Load and performance gates

| Gate                 | Result                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Catalogue            | PASS; 40 requests at concurrency 8; first-byte p95 386 ms, complete p95 1,095 ms                |
| Checkout reservation | PASS; 50/50 successes; p95 248 ms                                                               |
| Media ingestion      | PASS; 250-file registration, 12 processed images, 108 unique renditions, idempotent second pass |
| Application budgets  | PASS; root JS gzip 130,538 B, database search p95 34 ms, queue age 389 s                        |
| Cost fixture         | PASS; all configured local budgets                                                              |

## Security and supply-chain gates

| Gate                         | Result                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run security:audit`     | PASS; dependencies, secrets, headers/CSP, RLS, authorization and application boundaries     |
| `npm run security:licenses`  | PASS; 701 locked packages                                                                   |
| `npm run security:artifacts` | PASS; SBOM/provider inventory and 60 checksummed subjects                                   |
| Secret cleanup               | PASS; no supplied chat credential or credential-bearing URL is present in repository source |

## Honest release boundary

This evidence proves **build-complete locally**. It does not prove a managed
staging deployment or a live shop. Netlify preview smoke, managed Supabase PITR,
live payment/email/monitoring, DNS, legal approval and production-content review
remain in the external activation register. Credentials disclosed in chat must
be rotated before any managed environment is linked.
