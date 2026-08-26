# Implementation Plan: ÉPOCA Production Online Shop

<!-- UPGRADED:v1 -->

**Branch**: `001-build-production-shop` | **Date**: 2026-08-25 | **Spec**: [spec.md](./spec.md)  
**Input**: Approved and upgraded feature specification plus `docs/product/EPOCA_MASTER_BUILD_GOAL.md`  
**Status**: Upgraded design complete; ready for task generation

## Summary

Build one server-first Next.js application containing the localized Collector’s Index storefront and secure administration area. Supabase Postgres is the authoritative source for catalog, money, inventory, carts, orders, content, roles, workflow state, and audit; Supabase Auth, Storage, Queues, migrations, and RLS provide identity, media, durable jobs, reproducibility, and boundary authorization. Netlify hosts the application and bounded background media workers.

The implementation proceeds as complete vertical slices: platform/auth foundation; manual catalog; automated ingestion; public discovery; cart/checkout; payments/orders; post-purchase operations; content/analytics; and production hardening. Provider integrations use narrow contracts with local fixtures and explicit disabled/test/live states, so absent credentials never create hidden fallbacks or unfinished surrounding workflows.

## Technical Context

**Language/Version**: TypeScript 6.0.x in strict mode (latest line supported by the selected Next.js ESLint toolchain); SQL/PostgreSQL migrations; Node.js 24 LTS; small shell scripts only for reproducible developer/CI operations  
**Primary Dependencies**: Next.js 16.3.2 stable (the first npm-audit-clean line available for the announced August security release; confirm the 2026-08-26 advisory before external deployment), React 19.2, Supabase JS/SSR, next-intl, Zod, Uppy/TUS, Sharp, OpenAI SDK, Resend SDK, optional Sentry/PostHog adapters  
**Storage**: Supabase managed Postgres and Storage; private originals/evidence/export buckets, public approved-rendition bucket; Supabase Queues for durable background work  
**Testing**: Vitest, Testing Library, MSW, Supabase CLI + pgTAP, Playwright across Chromium/Firefox/WebKit, axe integration, k6 scripts, TypeScript/ESLint/Prettier/build/security gates  
**Target Platform**: Netlify-hosted responsive web application and Node background functions; Supabase managed backend; evergreen supported browsers with semantic/static-first fallbacks  
**Project Type**: Single production web application with storefront, administration, route handlers, provider webhooks, and background workers  
**Performance Goals**: Spec NFR-004/005 and SC-009/010; p75 primary content usable ≤2.5s, layout shift <0.1, interaction feedback ≤200ms, and 95% of catalog/admin interactions return result or progress ≤1s under the defined test profile  
**Constraints**: Four locales; independent GEL/EUR/USD support; integer money; guest checkout; unique-stock concurrency; no raw card data; RLS on every exposed table/bucket; human-reviewed generated content; Collector’s Index; 390/768/1440 browser evidence; no invented activation data  
**Scale/Scope**: Initial validation envelope of 5,000 published products, up to 24 product images each, 10,000 monthly visitors, 100 orders/day, 50 simultaneous checkout attempts, 10 simultaneous staff sessions, and a 250-file ingestion burst; reassess from staging evidence rather than adding speculative infrastructure  
**Availability/Recovery Objective**: 99.9% monthly application target excluding announced maintenance, recovery point objective (RPO) ≤15 minutes for accepted commercial data, and recovery time objective (RTO) ≤4 hours; launch requires a Supabase backup/PITR configuration and rehearsal capable of these targets

## Constitution Check

_GATE: Passed before research; re-evaluated and passed after Phase 1 design._

| Principle / Gate                       | Design Evidence                                                                                                                                            | Status |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Specification before construction      | Upgraded `spec.md` has independent journeys, 114 functional and 12 non-functional requirements, edge cases, and measurable outcomes                        | PASS   |
| Product truth and commerce correctness | Verified/unknown field states, publication gate, integer money, transactional stock/order/payment functions, immutable order snapshots, and audit          | PASS   |
| Customer-first accessible design       | `DESIGN.md` and storefront skill govern reusable tokens/components, four locales, semantic static-first pages, explicit states, and 390/768/1440 QA        | PASS   |
| Security/privacy by default            | Request-scoped auth, database/server authorization, RLS/grants, MFA assurance, private buckets, adapters, validation, redaction, consent, and no raw cards | PASS   |
| Tested buying journeys                 | pgTAP/RLS, unit/contract/integration tests, Playwright P1 journeys, accessibility, locale, concurrency, webhook, and restoration gates                     | PASS   |
| Simplicity and incremental delivery    | One deployable, no ORM/search microservice/carrier/FX gateway, feature modules only for named consumers, and vertical phases                               | PASS   |
| No unresolved critical clarification   | Product behavior is explicit; all provider/legal/catalog unknowns are activation inputs with disabled states and runbooks                                  | PASS   |

No constitutional violation requires a complexity exception.

## Architecture and Boundaries

### Runtime topology

```text
Browser
  └─ Next.js on Netlify
      ├─ Server-rendered storefront and admin routes
      ├─ Server Actions / Route Handlers (validated command boundary)
      ├─ Payment, email, AI, analytics, and monitoring adapters
      └─ Netlify Background/Scheduled Functions (media, notification, export, expiry, and publication work)
            └─ Supabase Queue leases and job checkpoints

Supabase
  ├─ Postgres (truth, transactions, search, audit, outbox)
  ├─ Auth (buyer and staff identity, MFA)
  ├─ Storage (originals, renditions, evidence, exports)
  ├─ Queues (durable asynchronous work)
  └─ RLS + grants (final row/object authorization)
```

### Domain ownership

| Domain               | Owns                                                                          | Does not own                                               |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Catalog              | Product facts, translations, collections, publication readiness               | Sellable quantity, cart snapshots, order history           |
| Media/Ingestion      | Uploads, masters, renditions, crops, provenance, jobs, suggestions            | Final verified product facts or publication decision       |
| Pricing/Promotions   | Exact prices, tax-display rules, discounts, calculation breakdown             | Inventory availability or payment result                   |
| Inventory            | Quantity, reservations, adjustments, releases, sale/restock effects           | Display availability copy or order totals                  |
| Cart/Checkout        | Guest/account cart, address/delivery/payment selections, final reconciliation | Final payment provider truth                               |
| Orders               | Immutable accepted commercial snapshot and valid lifecycle                    | Provider-specific response strings                         |
| Payments             | Method-neutral attempts/events/refunds/reconciliation                         | Catalog prices or order-line mutation                      |
| Fulfillment/Returns  | Shipments, cancellation/return workflows, inspection, restock requests        | Direct arbitrary inventory updates or raw provider refunds |
| Identity             | Buyer/staff profile, role, session assurance                                  | Editable role claims in user metadata                      |
| Content/Localization | Journal/service/navigation/translations/redirects                             | Product truth or transactional order snapshots             |
| Operations           | Audit, outbox, jobs, health, analytics events, readiness evidence             | Secret values in logs or public configuration              |

### Command/query rule

- Public, indexable pages read only published RLS-safe projections.
- Buyer account reads use the request-scoped customer session and ownership RLS.
- Mutations enter through a Server Action or Route Handler, validate with Zod, authorize on the server, call a transactional database function where multiple records/effects are involved, then revalidate affected routes/tags.
- Direct browser writes are limited to deliberately safe flows such as authorized TUS upload bytes after the server has created the record and signed permission.
- Service-role access exists only in server-only factories used by validated workers/webhooks; it never reaches client bundles.
- Every adapter accepts and returns repository-owned domain types rather than leaking provider payloads into pages or database state.

## Project Structure

### Documentation (this feature)

```text
specs/001-build-production-shop/
├── spec.md
├── spec.md.pre-upgrade
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   ├── providers.md
│   └── events.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── [locale]/
│   ├── (store)/
│   │   ├── page.tsx
│   │   ├── collections/[slug]/page.tsx
│   │   ├── search/page.tsx
│   │   ├── products/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── order/[reference]/page.tsx
│   │   ├── account/
│   │   ├── journal/[slug]/page.tsx
│   │   └── [service-page]/page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── catalog/
│   │   ├── ingestion/
│   │   ├── inventory/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── content/
│   │   ├── translations/
│   │   ├── returns/
│   │   ├── reports/
│   │   └── settings/
│   ├── auth/
│   └── layout.tsx
├── api/
│   ├── webhooks/tbc/route.ts
│   ├── webhooks/resend/route.ts
│   ├── health/route.ts
│   └── internal/jobs/route.ts
├── sitemap.ts
└── robots.ts

components/
├── ui/
├── storefront/
├── admin/
└── commerce/

features/
├── auth/             ├── catalog/          ├── media/
├── ingestion/        ├── inventory/        ├── pricing/
├── cart/             ├── checkout/         ├── orders/
├── payments/         ├── fulfillment/      ├── returns/
├── customers/        ├── content/          ├── translations/
└── operations/

lib/
├── env/              ├── supabase/         ├── validation/
├── money/            ├── observability/    ├── security/
└── providers/

messages/              # Versioned interface translations
emails/                # Versioned localized transactional templates
public/                # Static licensed brand assets only
netlify/functions/     # Bounded background workers and scheduled sweepers
supabase/
├── config.toml
├── migrations/
├── seed.sql
└── tests/database/
tests/
├── unit/
├── integration/
├── contract/
├── e2e/
├── visual/
├── accessibility/
└── load/
scripts/
docs/runbooks/
```

**Structure Decision**: One Next.js deployable with feature-owned modules and platform-specific edges. Create a folder only with its first consumer/task; the tree is the intended end-state, not permission to add empty scaffolding.

## Data Design

The normative entity, constraint, relationship, and lifecycle design is in [data-model.md](./data-model.md). Core rules:

- UUID primary identities and separate human references/SKUs; normalized unique indexes ignore archived records only where reuse is explicitly safe.
- `created_at`, `updated_at`, and optimistic `version` on mutable administrative records.
- Translation tables use `(entity_id, locale)` uniqueness and explicit workflow status; public projections select reviewed/published values under fallback rules.
- Money uses `bigint` minor units plus three-letter currency with checks; application values remain bounded safe integers.
- Orders and lines are immutable snapshots; later changes create events/refunds/returns rather than rewriting accepted commercial truth.
- State columns use constrained enums/checks and transition functions, never arbitrary page-provided next states.
- Audit/outbox/idempotency/job/event tables are append-oriented and partition/retention candidates after measured volume.

## Storefront Experience Plan

`DESIGN.md`, `.agents/skills/epoca-storefront-design/SKILL.md`, and `docs/design/WORKFLOW.md` are binding implementation authorities.

### Shared system

- Convert the selected prototype vocabulary into CSS custom properties for warm paper/ivory, near-black ink, stone metadata, one restrained accent, hard rules, spacing, content widths, image ratios, focus, and motion.
- Use self-hosted build output from `next/font` with two typographic roles: `Noto Serif`/`Noto Serif Georgian` for display and `Inter`/`Noto Sans Georgian` for utility text. Script-specific companions count as one visual role; verify Georgian, Cyrillic, Latin, numerals, currency marks, and the selected production weights before freezing the bundle.
- Build semantic primitives first: skip link, header/nav, language/currency controls, breadcrumb, product fact list, money/availability, buttons/links/inputs, notices, dialogs/drawers, table/list, pagination, media placeholder, status badge with text, and live status region. Dense administration tables receive a deliberate narrow-screen list/detail treatment rather than clipped desktop columns.
- Keep public pages useful in server-rendered HTML. JavaScript enhances cart/wishlist state, upload, zoom, drawers, autosave, and optimistic feedback; it does not hide essential facts.

### Route and journey behavior

| Surface                 | Entry and hierarchy                                                               | Required states / wiring                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Home                    | Locale root; editorial hero, curated collections, product edit, journal, services | CMS preview/publish, missing hero/media, empty featured set, long locale copy                                                 |
| Collection/search       | Header/search, collection links, shareable query                                  | server results, filters/sort, reset, pagination, no result, unavailable, slow/error                                           |
| Product                 | Cards/search/related links                                                        | gallery/zoom, facts, price/stock, delivery/return summary, wishlist/cart, missing rendition, stale item                       |
| Cart                    | Header and add confirmation                                                       | persistent guest/account cart, edit/remove, reconciliation, estimate, empty/error/changed                                     |
| Checkout                | Cart only                                                                         | contact/address/delivery/payment/review steps, bank/TBC enabled states, validation, back/cancel, duplicate/uncertain recovery |
| Confirmation/order      | Successful acceptance, email, account                                             | guest proof or account auth, reference, payment/fulfillment/return state, support                                             |
| Account                 | Header/auth                                                                       | wishlist merge, addresses, orders, sessions, data requests, empty/error/revoked                                               |
| Journal/service/contact | Header/footer/search entry                                                        | localized content, policies, metadata, redirects, consent, spam/failure feedback                                              |
| Administration          | Staff auth/MFA                                                                    | operational side navigation, dashboard-to-record links, dense responsive tables/forms, explicit permissions/states            |

### Responsive imagery

- Product variants: square catalog, 4:5 product card, 3:4 gallery, 16:9 editorial/OG, with documented pixel widths and crop/focal metadata in the media recipe.
- Render a repository-owned responsive `picture` primitive from approved variants; reserve dimensions, lazy-load below the fold, prioritize only measured above-fold media, and provide a non-product-deceptive placeholder.
- Protected masters never become a browser fallback. Alternative text is localized and reviewed; decorative crops use empty alternative text.
- For German/Russian visitors redirected to TBC’s currently documented KA/EN hosted page, the localized ÉPOCA review step discloses the provider-page language before redirect and the return/recovery page resumes the original locale.

### Visual verification

For every implemented surface: render 390px, 768px, and 1440px in all locales as relevant; run composition/journey pass; fix high-impact issues; rerender affected views for keyboard, focus, semantics, contrast, touch, missing media, long copy, states, reduced motion, image weight, and stability. Store evidence under `docs/quality/` or test artifacts and stop only when critical defects are cleared.

## Security and Privacy Design

- Central typed environment parser fails closed for malformed server configuration; only explicitly public values can enter client bundles.
- Secure headers include CSP built from required origins, HSTS in production, frame denial, referrer policy, MIME sniff prevention, and restrictive permissions policy.
- CSRF protection uses same-site secure cookies, origin checks for state-changing route handlers, framework action protections, and explicit webhook exceptions that use provider verification.
- Rate limits use database-backed or platform-supported keys for auth, contact, upload authorization, checkout, payment initiation, quote, and webhook abuse; limits return localized retry guidance without account enumeration.
- Staff role and active state are checked server-side and in RLS; sensitive operations require current `aal2` where defined.
- Storage separates public renditions from private masters/evidence/exports and uses bucket/path/owner policies plus short-lived signed downloads.
- Upload validation checks declared and actual type, dimensions, decompression limits, count/size, unsafe formats, deterministic path, and malware/manual quarantine strategy.
- Logs, analytics, and monitoring use allowlisted fields; addresses, free text, tokens, raw provider payloads, AI images/output, and secret values are excluded or redacted.
- Data retention is table/bucket specific and configuration-backed; production values and legal bases remain activation inputs. Scheduled deletion archives evidence and reports exceptions before irreversible removal.
- Dependencies, lockfile, secrets, and migrations receive automated scans; critical/high findings block production unless a time-bounded documented exception is approved.

## Integration and Job Design

### Provider contracts

Normative signatures and outcomes are in [contracts/providers.md](./contracts/providers.md). Each provider has `disabled`, `fixture/test`, and `live` configuration states and an integration-status check visible to Owner. No adapter logs full inputs or returns provider display strings as domain state.

### HTTP and webhook contracts

Normative endpoints, authentication, validation, idempotency, and error envelopes are in [contracts/http-api.md](./contracts/http-api.md). Server Actions may implement same-origin UI commands, but any webhook, health, signed-download, or background trigger keeps an explicit route contract.

### Events and outbox

Normative domain/outbox/analytics event schemas are in [contracts/events.md](./contracts/events.md). Order/payment/inventory transactions enqueue notifications and operational events in the same commit. Workers claim outbox rows with leases, use stable idempotency keys, and record delivery attempts separately.

### Scheduled and expiry coordination

- A Netlify Scheduled Function acts only as a coordinator: it leases due `scheduled_actions` and durable jobs, then invokes the same idempotent database commands/workers used by staff and webhooks.
- Due actions cover product/content publish or unpublish, inventory-reservation expiry, bank-transfer/payment expiry, quote/discount expiry, notification retry, retention cleanup, export deletion, job recovery, and operational-alert evaluation.
- Each scheduled action has target, action type, due time, status, attempt/lease, idempotency key, and correlation ID. Missed schedules remain visible and catch up; wall-clock time alone never marks a business effect complete.
- Store timestamps in UTC. Business reports and schedules render through a configurable business timezone initially set to `Asia/Tbilisi`; daylight/offset behavior is tested rather than encoded as a fixed offset.

## Testing Strategy

| Layer                | Scope                                                                                                                                                        | Required evidence                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Type/unit            | Money, discounts, tax display, delivery rules, localization/fallback, validation, state transition decisions, media recipes, provider mapping                | Fast deterministic Vitest suite and boundary/property cases                                             |
| Database             | Tables, constraints, indexes, functions, triggers, transition rules, reservations, concurrent last-unit checkout, RLS/grants, Storage policy predicates      | Fresh `supabase db reset`, pgTAP, role matrix, transactional concurrency harness                        |
| Component            | Forms, cards, gallery, filters, tables, dialogs, status/live regions, long copy, error recovery                                                              | Testing Library behavior and accessible-name assertions                                                 |
| Contract             | TBC, Resend, OpenAI, analytics, Sentry/no-op, worker queue, import/export                                                                                    | Recorded synthetic fixtures with signature/idempotency/order/failure variations; no production payloads |
| Integration          | Request-scoped Supabase clients, auth/MFA, Storage/TUS, outbox, server actions, route handlers                                                               | Local Supabase and provider fixture services                                                            |
| End-to-end           | Every spec story, especially upload/publish, discovery, guest/account checkout, transfer/card sandbox, concurrency, fulfillment, cancellation, return/refund | Playwright isolated test data across supported roles/locales                                            |
| Accessibility/visual | 390/768/1440, all locales, keyboard, reduced motion, contrast, semantics, missing/long/empty/error/unavailable states                                        | axe plus manual checklist and bounded screenshots                                                       |
| Performance/load     | Catalog/search, media bursts, checkout/reservation, webhook bursts, admin lists                                                                              | Budgets, query plans, k6 scenarios, Core Web Vitals/Lighthouse evidence                                 |
| Security             | Auth bypass, IDOR, injection, XSS, CSRF, replay, upload abuse, rate limit, secret/dependency scan                                                            | Automated tests/scans plus manual threat review and documented findings                                 |
| Operations           | Migration dry run/rollback, failed deploy, scheduled-action catch-up, notification replay, queue recovery, RPO/RTO backup restore, Owner recovery            | Timestamped rehearsal evidence and runbook corrections                                                  |

No test may be disabled to pass a gate. Provider tests use synthetic values. Production smoke tests create clearly tagged reversible records and clean them through documented operations.

## Performance and Capacity Plan

- Public catalog pages use server rendering, stable pagination, selected columns, indexed published projections, and cache tags invalidated after publication/stock/price change.
- Product pages avoid fetching admin workflow/audit data. Above-fold response has one prioritized image; remaining gallery images load lazily.
- Database migrations include query-plan tests for search/filter/admin lists against 5,000-product seed data; p95 database time receives a tighter internal budget to preserve the user-facing 1-second outcome.
- Cart/checkout uses a small number of transactional RPC calls rather than record-by-record network sequences.
- Workers process bounded batches and check elapsed time; queue depth/oldest age/retry count are monitored.
- Select the Netlify function region and Supabase project region together after the approved data-residency decision, preferring an available EU pairing close to Georgia; staging load tests must prove cross-service latency before production configuration is copied.
- JavaScript, CSS, fonts, responsive image bytes, layout shift, and interaction latency receive route-specific budgets in `docs/quality/performance-budget.md` before the first public UI slice is declared complete.
- Reassess search service, read replica, or job-worker topology only when load evidence misses the budgets after query/index/caching work.

## Deployment, Operations, and Recovery

### Environments

- Local: Supabase CLI, safe seed data, provider fixtures, local email capture, no production connectivity.
- Preview: Netlify branch deploy with isolated/ephemeral configuration and no production mutations.
- Staging: separate Supabase project, sandbox providers, representative non-personal catalog, full migration/smoke/rehearsal gates.
- Production: separate Supabase/Netlify configuration, reviewed secrets, real business inputs, controlled migration and promotion.
- Preview, staging, and production each carry an explicit region/data-residency record; a preview can never fall back to the production Supabase URL or provider mode.

### CI sequence

1. Lockfile and secret checks.
2. Format and ESLint.
3. Type generation drift and TypeScript.
4. Unit/component/contract tests.
5. Start local Supabase; reset migrations/seeds; pgTAP/RLS/Storage/concurrency tests.
6. Production build and bundle/performance budgets.
7. Critical Playwright and accessibility smoke.
8. Dependency/license/security scans.
9. Preview deploy and post-deploy smoke when credentials exist.

### Observability

- Correlation ID enters every command/webhook/job and is shown in recoverable errors.
- Structured logs use event name, environment, release, route/job/provider, outcome, duration, record reference, and redacted error code.
- Health distinguishes application response, database reachability, queue age, and required integration status without exposing secrets.
- Alerts cover checkout/order failures, uncertain payments, invalid webhook bursts, stuck jobs, failed notifications, low stock, restore/backup failure, elevated authorization denial, and error-rate/performance thresholds.
- Usage/cost alerts cover Supabase compute/storage/egress/queues/transforms, Netlify compute/background execution/bandwidth, OpenAI tokens, email volume, analytics/monitoring quotas, and unexpected provider mode. Owner sees budget state without secret or billing-account access leakage.

### Recovery

- Migrations include forward and documented rollback/repair strategy; irreversible data changes require backup and staged rehearsal.
- Deploy rollback uses Netlify release rollback plus compatible database strategy; application/schema compatibility spans the rollback window.
- Queue/outbox messages remain replayable and idempotent; uncertain provider actions reconcile from provider truth.
- Backup restore is rehearsed into a safe project, followed by relationship, RLS, Storage-reference, order, payment, and inventory integrity checks.
- The restore rehearsal measures and records actual RPO/RTO; missing the 15-minute/4-hour objectives blocks launch or requires an explicitly approved stronger backup/PITR design before another rehearsal.
- Owner recovery requires identity verification outside the application, a second controlled Owner path, rotation/revocation, and audit.

## Delivery Phases and Exit Gates

1. **Platform and trust foundation**: application shell, locale routing, tokens, Supabase local baseline, environment parser, session/role helpers, RLS/grants, audit/outbox, CI, and fixture providers. Exit: reproducible setup, direct-access denial tests, and responsive semantic shells.
2. **Localized storefront discovery**: product/translation/collection/price/inventory/media projections, representative seed records, home, collections, search/filter, product detail, approved renditions, and SEO/structured data. Exit: US1 and design two-pass evidence in all locales.
3. **Guest commerce**: guest session/cart, discounts, delivery/tax rules, checkout review/reservation, bank transfer, confirmation, and captured notices. Exit: deterministic totals, concurrent last-unit safety, and US2 fixture evidence.
4. **Automated ingestion**: TUS batches, queue, Sharp worker, crops, AI/manual drafts, recovery, readiness review, and publication into the storefront projection. Exit: SC-004/005 workflow evidence.
5. **Order and catalog operations**: TBC adapter/fixtures, webhook/reconciliation, notifications, fulfillment/refunds, then catalog CRUD, translations, inventory, imports/exports, and merchandising. Exit: US4/US5 operational evidence.
6. **Staff security and production operations**: Manager/Owner commands, MFA, session revocation, audit explorer, integration/readiness status, observability, controlled releases, alerts, backup/restore, rollback, and runbooks. Exit: US8/US11 role, release, and recovery evidence.
7. **Optional customer and after-sale service**: account/wishlist/address/history, cancellation/return evidence, inspection, restock, and duplicate-safe refunds. Exit: US6/US7 privacy and cross-ledger consistency.
8. **Worldwide selling**: explicit market prices/currencies, promotions, tax display, delivery zones/methods, customs responsibility, and manual quote workflow. Exit: US9 supported/unsupported destination evidence.
9. **Content, consent, reporting, and support**: CMS, translations, policies, redirects, contact/newsletter, analytics consent/events, and bounded reports/exports. Exit: US10 and privacy behavior.
10. **Cross-system production hardening**: all-browser/accessibility/performance/security/load work, full failure matrix, migration/backup/restore/rollback rehearsals, staging, external activation register, and final readiness gates. Exit: traceable evidence matrix and honest go/no-go labels.

Essential authorization, states, accessibility, tests, wiring, and observability are part of each phase’s exit gate, not postponed to Phase 10.

## Complexity Tracking

No constitution exceptions. The durable queue and provider adapters are required by resumable media processing and unavailable credentials; each has named consumers and is smaller than adding an independent worker service or duplicating provider logic.

## Post-Design Constitution Re-check

- Product intent remains in `spec.md`; this plan contains architecture only.
- Every service/module has a named page, command, worker, webhook, or test consumer.
- Transactions, RLS, and immutable snapshots protect commerce truth.
- Collector’s Index and accessibility behavior are explicit implementation authorities.
- Verification covers business rules, denial paths, full journeys, visual states, and operations.
- External inputs remain configuration/activation gates and have not been fabricated.

**Result**: PASS. Ready for plan hardening, then dependency-ordered task generation.
