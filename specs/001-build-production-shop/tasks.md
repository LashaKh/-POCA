# Tasks: ÉPOCA Production Online Shop

<!-- UPGRADED:v1 -->

**Input**: `spec.md`, upgraded `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, and `contracts/`  
**Tests**: Mandatory; the specification requires business-rule, database/RLS, contract, integration, end-to-end, accessibility, visual, load, security, and operational evidence  
**Organization**: Setup and foundation first, then all P1 stories, P2 stories, P3 story, and final production gates  
**Implementation rule**: Write the listed tests first and confirm they fail for the intended reason before implementing the behavior.

## Format

- `[P]` means different files and no dependency on another incomplete task in the same group.
- `[W]` means explicit integration wiring and must run after its producer.
- `[USx]` maps to the exact numbered user story in `spec.md`.
- Every task includes its intended repository path; do not create empty end-state folders ahead of their first consumer.
- Every task that creates, changes, wires, or verifies a user interface MUST use `DESIGN.md` and `.agents/skills/epoca-storefront-design/SKILL.md` as implementation authorities; this requirement is part of each such UI task even when not repeated in its sentence.

## Phase 1: Setup and Reproducible Toolchain

**Purpose**: Establish one secure, testable Next.js/Supabase/Netlify project without implementing business stories.

- [x] T001 Scaffold the Next.js App Router application and pin the approved Node/Next/React/TypeScript baseline in package.json, package-lock.json, tsconfig.json, next.config.ts, app/layout.tsx, and app/page.tsx
- [x] T002 Record Node.js 24 LTS and npm engine requirements in .nvmrc, .node-version, and package.json
- [x] T003 Implement the safe configuration template and secret exclusions in .env.example and .gitignore
- [x] T004 [P] Configure ESLint, Prettier, and repository scripts in eslint.config.mjs, prettier.config.mjs, .prettierignore, and package.json
- [x] T005 [P] Configure Vitest and Testing Library environments in vitest.config.ts, tests/setup/vitest.ts, and package.json
- [x] T006 [P] Configure Playwright Chromium/Firefox/WebKit, locale projects, and 390/768/1440 devices in playwright.config.ts and tests/setup/playwright.ts
- [x] T007 [P] Configure Netlify Next.js builds, local functions, security contexts, and non-production defaults in netlify.toml and netlify/functions/README.md
- [x] T008 Initialize the committed local Supabase structure and explicit local-only ports/schemas in supabase/config.toml and supabase/seed.sql
- [x] T009 [P] Create the baseline pull-request CI checks for install, format, lint, typecheck, tests, Supabase reset, and build in .github/workflows/ci.yml
- [x] T010 [P] Add license/provenance and generated-artifact rules for application assets in public/README.md and docs/content/media-provenance.md
- [x] T011 [P] Create type-checked interface message roots for ka, en, de, and ru in messages/ka.json, messages/en.json, messages/de.json, and messages/ru.json
- [x] T012 [P] Translate Collector’s Index colors, spacing, rules, typography roles, focus, and reduced-motion values into app/globals.css and components/ui/tokens.css using DESIGN.md
- [x] T013 [P] Record initial route-level JavaScript, font, image, layout-shift, and interaction budgets in docs/quality/performance-budget.md
- [x] T014 Verify a clean npm install, local Supabase start/reset, all baseline checks, and production build; record exact working commands and Next.js security-patch gate in README.md and specs/001-build-production-shop/quickstart.md

**Checkpoint**: A new developer can reproduce the empty application and all baseline checks without a cloud credential.

---

## Phase 2: Foundational Security, Data, Localization, and UI

**Purpose**: Build the shared trust boundaries that block every user story.

**⚠️ CRITICAL**: No story phase starts until the foundational RLS, environment, session, command, and test harness pass.

- [x] T015 Create PostgreSQL extensions, canonical enums/domains, UTC timestamp/version helpers, and safe money/locale constraints in supabase/migrations/202608250001_extensions_types.sql
- [x] T016 Create profiles, staff_members, app_sessions, consent_records, business_settings, and integration_configs with last-active-Owner protection in supabase/migrations/202608250002_identity_settings.sql
- [x] T017 Create audit_events, idempotency_keys, notifications, notification_attempts, operational_alerts, export_jobs, media_jobs, and scheduled_actions in supabase/migrations/202608250003_operations.sql
- [x] T018 Implement database authorization helpers, audit insertion, idempotency begin/complete, outbox leases, job leases, and scheduled-action leases in supabase/migrations/202608250004_foundation_functions.sql
- [x] T019 Lock down foundational table grants, enable RLS, add active-staff/role/AAL policies, and protect append-only records in supabase/migrations/202608250005_foundation_rls.sql
- [x] T020 [P] Write pgTAP tests for types, constraints, last Owner, grants, role/AAL helpers, append-only audit, idempotency, and lease recovery in supabase/tests/database/001_foundation.test.sql
- [x] T021 Generate and commit database types after the foundational reset in lib/supabase/database.types.ts and add drift-check scripts in package.json and scripts/check-database-types.mjs
- [x] T022 Implement fail-closed server/public environment schemas and provider-mode cross-validation in lib/env/schema.ts, lib/env/server.ts, and lib/env/public.ts
- [x] T023 Implement request-scoped browser/server/service Supabase factories without cross-request reuse in lib/supabase/browser.ts, lib/supabase/server.ts, and lib/supabase/service.ts
- [x] T024 Implement guest/customer/staff context resolution, revoked-session checks, safe return paths, and MFA assurance helpers in features/auth/context.ts and features/auth/authorization.ts
- [x] T025 [W] Wire authentication context into the Next.js request proxy — import session refresh/revocation helpers from features/auth/context.ts and deny revoked/protected requests in proxy.ts; locale routing is added by T035 after its producer exists
- [x] T026 [P] Implement the shared typed CommandResult/error-code envelope from contracts/http-api.md in lib/validation/command-result.ts
- [x] T027 [P] Implement common Zod schemas for UUIDs, locale, currency, exact minor money, cursor, pagination, idempotency, and bounded free text in lib/validation/common.ts
- [x] T028 [P] Implement branded safe-integer minor money arithmetic and formatting contracts in lib/money/minor.ts and lib/money/format.ts
- [x] T029 [P] Configure CSP, HSTS-production, frame/referrer/MIME/permissions headers and same-origin checks in lib/security/headers.ts and next.config.ts
- [x] T030 [P] Implement database-backed bounded rate-limit commands for auth, contact, upload authorization, checkout, payment, and webhooks in lib/security/rate-limit.ts and supabase/migrations/202608250006_rate_limits.sql
- [x] T031 [P] Implement correlation IDs, allowlisted structured logs, redaction, and safe error capture in lib/observability/correlation.ts, lib/observability/logger.ts, and lib/observability/redact.ts
- [x] T032 [P] Implement secret-free provider/integration status types and disabled/local registries in lib/providers/status.ts and lib/providers/registry.ts
- [x] T033 [W] Wire validated env, request-scoped Supabase, correlation logger, and error boundary into app/layout.tsx, app/error.tsx, and instrumentation.ts
- [x] T034 Implement next-intl locale routing, message loading, canonical locale helpers, and independent currency preference parsing in i18n/routing.ts, i18n/request.ts, and i18n/preferences.ts
- [x] T035 [W] Wire locale routing into the request proxy and localized root layout — import routing/request config in proxy.ts and app/[locale]/layout.tsx
- [x] T036 [P] Implement semantic shared primitives for skip link, buttons, links, fields, notices, status/live regions, dialogs, lists/tables, pagination, media fallback, and focus in components/ui/
- [x] T037 [W] Wire global tokens, script-aware Noto/Inter font roles, skip link, error boundary, and reduced-motion behavior into app/[locale]/layout.tsx and app/globals.css
- [x] T038 Implement responsive semantic storefront and administration shells with truthful empty navigation in components/storefront/site-shell.tsx, components/admin/admin-shell.tsx, app/[locale]/(store)/layout.tsx, and app/[locale]/admin/layout.tsx
- [x] T039 Run foundation database, unit, request-proxy, header, locale, accessibility-smoke, and production-build checks and record the pass/fail evidence in docs/quality/foundation-evidence.md

**Checkpoint**: The application has a secure localized shell, authoritative role/session boundary, reproducible database, and test harness; no commerce domain is fabricated.

---

## Phase 3: User Story 1 — Discover and Evaluate a Carpet (Priority: P1) 🎯 First Demonstrable Slice

**Goal**: Buyers can navigate, search/filter, inspect truthful published products, and recover from empty/missing/unavailable states in all four languages.

**Independent Test**: Seed a representative published catalog and complete homepage → collection/search → product evaluation at each target width and locale without administration or checkout.

### Tests for User Story 1

- [x] T040 [P] [US1] Write failing pgTAP tests for product/translation/price/collection/tag/media constraints, published projections, search leakage, license/readiness rules, and public RLS in supabase/tests/database/010_catalog.test.sql
- [x] T041 [P] [US1] Write failing Vitest tests for search parsing, locale fallback, filter canonicalization, product view mapping, exact price display, and unavailable states in tests/unit/catalog/
- [x] T042 [P] [US1] Write failing component tests for navigation, product card/facts, gallery keyboard state, pagination, filters, and missing media in tests/unit/storefront/catalog-components.test.tsx

### Implementation for User Story 1

- [x] T043 [US1] Create products, product_translations, product_prices, inventory_items, collections/translations/products, tags/translations/products, product_relations, and merchandising_slots in supabase/migrations/202608250010_catalog.sql
- [x] T044 [US1] Create media_assets, media_licenses, media_variants, media_links, approved public-rendition bucket, and protected-original bucket metadata in supabase/migrations/202608250011_media_catalog.sql
- [x] T045 [US1] Implement invoker-safe published product/collection projections, locale fallback diagnostics, full-text/trigram search, facets, stable sorting, and cursor functions in supabase/migrations/202608250012_catalog_queries.sql
- [x] T046 [US1] Add public published-read, staff-manage, private-master denial, approved-rendition, and draft/search-leak prevention policies in supabase/migrations/202608250013_catalog_rls.sql
- [x] T047 [US1] Add clearly synthetic four-locale products, collections, prices, stock, media license states, empty/unavailable cases, and 5,000-record scale fixtures in supabase/seeds/010_catalog.sql and supabase/config.toml
- [x] T048 [P] [US1] Implement shared catalog validation/view types from database outputs in features/catalog/schema.ts and features/catalog/types.ts
- [x] T049 [US1] Implement server catalog queries for home, collection, search, product, filters, and related records in features/catalog/queries.ts
- [x] T050 [P] [US1] Implement URL-safe search/filter/sort parsing and canonical serialization in features/catalog/search-params.ts
- [x] T051 [P] [US1] Implement the approved-rendition responsive picture/gallery primitives with private-master denial and fallbacks in components/storefront/responsive-product-image.tsx and components/storefront/product-gallery.tsx
- [x] T052 [P] [US1] Implement Collector’s Index product card, price/availability, verified fact list, color-variation note, and related-record components in components/storefront/product-card.tsx and components/storefront/product-facts.tsx
- [x] T053 [P] [US1] Implement responsive site header, search form, utility area, language/currency controls, and footer entry points in components/storefront/site-header.tsx and components/storefront/site-footer.tsx
- [x] T054 [US1] Implement the localized editorial homepage with honest empty/missing-media states in app/[locale]/(store)/page.tsx
- [x] T055 [US1] Implement collection description, canonical filters/sort, result count, pagination, and no-results recovery in app/[locale]/(store)/collections/[slug]/page.tsx
- [x] T056 [US1] Implement search suggestions/recovery, mixed-script behavior, canonical query, and result states in app/[locale]/(store)/search/page.tsx
- [x] T057 [US1] Implement product gallery, verified facts, price/stock, delivery/returns summary, related items, structured facts, and unavailable state in app/[locale]/(store)/products/[slug]/page.tsx

### Wiring and Verification for User Story 1

- [x] T058 [W] [US1] Wire catalog queries/search parser into home, collection, search, and product pages — import functions from features/catalog/queries.ts and features/catalog/search-params.ts in app/[locale]/(store)/page.tsx, collections/[slug]/page.tsx, search/page.tsx, and products/[slug]/page.tsx
- [x] T059 [W] [US1] Wire responsive-product-image, product-gallery, product-card, and product-facts into their page/list consumers in app/[locale]/(store)/page.tsx, collections/[slug]/page.tsx, search/page.tsx, and products/[slug]/page.tsx
- [x] T060 [W] [US1] Wire the site header/footer and persistent preference controls into the storefront shell — import SiteHeader/SiteFooter in components/storefront/site-shell.tsx and call preference actions from features/auth/preferences.actions.ts
- [x] T061 [US1] Implement sitemap, robots, canonical, hreflang, Open Graph, breadcrumb, Product/Offer/Organization structured data, and metadata tests in app/sitemap.ts, app/robots.ts, features/catalog/metadata.ts, and tests/integration/seo/catalog-metadata.test.ts

- [x] T062 [US1] Add Playwright discovery/search/filter/product journeys for ka/en/de/ru, keyboard, missing media, no results, unpublished leakage, and unavailable products in tests/e2e/storefront-discovery.spec.ts
- [x] T063 [US1] Run the two-pass Collector’s Index visual/accessibility review at 390/768/1440 with long German/Russian/Georgian copy and record screenshots/findings in tests/visual/storefront-discovery.spec.ts and docs/quality/us1-visual-evidence.md
- [x] T064 [US1] Prove search/filter/query plans and public route budgets against scale seed data in tests/load/catalog-search.js and docs/quality/us1-performance-evidence.md

**Checkpoint**: US1 works independently as the first truthful public demonstration; no cart or staff editing is needed to prove it.

---

## Phase 4: User Story 2 — Complete a Guest Purchase (Priority: P1) 🛒 Commerce MVP

**Goal**: An anonymous buyer can maintain a cart, reconcile exact totals and stock, choose configured delivery, order by bank transfer, and recover from duplicate/stale/uncertain submission.

**Independent Test**: Buy the last seeded carpet as a guest by bank transfer and prove one order, one reservation/inventory effect, exact totals, confirmation, and captured localized notice.

### Tests for User Story 2

- [x] T065 [P] [US2] Write failing pgTAP/concurrency tests for guest carts, discounts, delivery/tax, reservations, immutable order snapshots, idempotent acceptance, expiry, and public/customer/staff RLS in supabase/tests/database/020_checkout.test.sql
- [x] T066 [P] [US2] Write failing unit/property tests for money, allocation, discount limits, tax display, delivery rules, stale reconciliation, and state decisions in tests/unit/commerce/
- [x] T067 [P] [US2] Write failing component tests for cart states, checkout validation/review, changed totals, disabled payments, bank instructions, and duplicate feedback in tests/unit/checkout/checkout-ui.test.tsx

### Implementation for User Story 2

- [x] T068 [US2] Create guest_sessions, carts, cart_items, and guest order-proof fields with one-active-cart constraints in supabase/migrations/202608250020_guest_cart.sql
- [x] T069 [US2] Create discounts/scopes/redemptions, tax_rules, shipping_zones/countries/methods/rate_rules, delivery_quotes, and inventory_reservations/events in supabase/migrations/202608250021_pricing_delivery_inventory.sql
- [x] T070 [US2] Create orders, order_lines, order_addresses, order_adjustments/events, payment_attempts/events, bank_transfer_reviews, webhook_receipts, and order-notification links in supabase/migrations/202608250022_orders_payments.sql
- [x] T071 [US2] Implement create/rotate guest context, cart ownership, add/update/remove item, and guest-to-order proof helpers in supabase/migrations/202608250023_cart_functions.sql
- [x] T072 [US2] Implement deterministic price, discount, tax, eligible delivery, and manual-quote calculations with versioned breakdowns in supabase/migrations/202608250024_pricing_functions.sql
- [x] T073 [US2] Implement reserve_checkout, accept_order, reservation conversion/release/expiry, immutable snapshots, idempotency, audit, order events, and outbox writes in supabase/migrations/202608250025_checkout_functions.sql
- [x] T074 [US2] Add guest-secret, cart-owner, order-proof, order-customer, staff-safe-projection, and service-command RLS/grants in supabase/migrations/202608250026_checkout_rls.sql
- [x] T075 [US2] Implement typed cart queries and add/update/remove/apply-discount actions in features/cart/schema.ts, features/cart/queries.ts, and features/cart/actions.ts
- [x] T076 [US2] Implement checkout review/accept schemas, exact reconciliation mapping, and duplicate-safe actions in features/checkout/schema.ts, features/checkout/service.ts, and features/checkout/actions.ts
- [x] T077 [P] [US2] Implement configurable bank-transfer method/status/instruction mapping with disabled/unconfigured behavior in features/payments/bank-transfer.ts
- [x] T078 [P] [US2] Implement notification outbox types, local capture provider, and four-locale order/bank-transfer templates in features/operations/outbox.ts, lib/providers/email/capture.ts, and emails/order/
- [x] T079 [P] [US2] Implement cart line, totals, reconciliation notice, discount, delivery-estimate, empty/loading/error controls in components/commerce/cart/
- [x] T080 [US2] Implement the persistent localized cart page with server-rendered fallback forms in app/[locale]/(store)/cart/page.tsx
- [x] T081 [P] [US2] Implement accessible contact, international address, delivery, payment, consent, review, back/cancel, and error step components in components/commerce/checkout/
- [x] T082 [US2] Implement checkout review and acceptance page/actions with price/stock change acknowledgement in app/[locale]/(store)/checkout/page.tsx and app/[locale]/(store)/checkout/actions.ts
- [x] T083 [US2] Implement guest confirmation/recovery and bank-transfer pending state in app/[locale]/(store)/order/[reference]/page.tsx and features/orders/guest-proof.ts

### Wiring and Verification for User Story 2

- [x] T084 [W] [US2] Wire cart count/open link into the header — import getCartSummary from features/cart/queries.ts in components/storefront/site-header.tsx and render current quantity/status
- [x] T085 [W] [US2] Wire cart actions and totals into cart consumers — import actions from features/cart/actions.ts in components/commerce/cart/ and app/[locale]/(store)/cart/page.tsx
- [x] T086 [W] [US2] Wire checkout service into checkout page/actions — import reviewCheckout/acceptOrder from features/checkout/service.ts in app/[locale]/(store)/checkout/actions.ts and render CommandResult states in page.tsx
- [x] T087 [W] [US2] Wire bank-transfer configuration and notification outbox into order acceptance — call features/payments/bank-transfer.ts and features/operations/outbox.ts from features/checkout/service.ts
- [x] T088 [W] [US2] Wire reservation/bank-transfer expiry to scheduled actions — enqueue the normal expiry commands from features/operations/scheduler.ts and netlify/functions/scheduled-coordinator.mts
- [x] T089 [US2] Add local-Supabase integration tests for guest cookie rotation, cart persistence, signed proof, outbox capture, and disabled payment modes in tests/integration/checkout/guest-checkout.test.ts
- [x] T090 [US2] Add Playwright guest bank-transfer purchase, confirmation, refresh/back, localized notice preview, and cart persistence in tests/e2e/guest-bank-transfer.spec.ts
- [x] T091 [US2] Add Playwright/database concurrency cases for two last-item buyers, stale price/stock, duplicate submit, expired reservation, late transfer, and uncertain response in tests/e2e/checkout-recovery.spec.ts and tests/integration/checkout/concurrency.test.ts
- [x] T092 [US2] Run checkout keyboard/axe/touch/long-address/locale review at 390/768/1440 and store evidence in tests/accessibility/checkout.spec.ts and docs/quality/us2-visual-evidence.md
- [x] T093 [US2] Validate checkout/reservation and cart-review budgets under 50 simultaneous attempts in tests/load/checkout.js and docs/quality/us2-load-evidence.md
- [x] T094 [US2] Record requirement/evidence mapping for FR-039–FR-061 and SC-002/003/013/014 in docs/quality/us2-commerce-evidence.md

**Checkpoint**: US1 + US2 form a complete commerce MVP with bank transfer in configured/fixture mode and no account requirement.

---

## Phase 5: User Story 3 — Upload, Prepare, and Publish a Product (Priority: P1)

**Goal**: Staff can resume standardized image batches, process safe deterministic renditions, review optional assistance, and publish only verified complete products.

**Independent Test**: Upload 12 images with an interruption and duplicate, recover processing, edit crops/suggestions, complete four locales, pass readiness, publish once, and find the product in US1.

### Tests for User Story 3

- [x] T095 [P] [US3] Write failing pgTAP tests for ingestion batches/files/jobs, checksum/recipe uniqueness, media licenses, suggestion decisions, queue leases, readiness, private/public Storage policies, and retry idempotency in supabase/tests/database/030_ingestion.test.sql
- [x] T096 [P] [US3] Write failing unit/contract tests for upload validation, media recipes, Sharp safety limits, forbidden AI facts, schema validation, job retries, and manual fallback in tests/unit/ingestion/ and tests/contract/assistance/
- [x] T097 [P] [US3] Write failing component tests for uploader progress/cancel/resume/errors, crop keyboard use, suggestions, readiness blockers, and publish confirmation in tests/unit/admin/ingestion-ui.test.tsx

### Implementation for User Story 3

- [x] T098 [US3] Create ingestion_batches, ingestion_files, assisted_suggestions, queue setup, recipe/version constraints, and batch counters in supabase/migrations/202608250030_ingestion.sql
- [x] T099 [US3] Add signed TUS authorization, product-original/evidence path rules, staff/object ownership policies, approved-rendition writes, and orphan-safe Storage procedures in supabase/migrations/202608250031_ingestion_storage_rls.sql
- [x] T100 [US3] Implement enqueue/lease/checkpoint/retry/complete/cancel/recover functions and product readiness/publish_product transaction in supabase/migrations/202608250032_ingestion_functions.sql
- [x] T101 [P] [US3] Implement file/batch limits, actual-type result schemas, deterministic storage paths, and signed upload authorization action in features/ingestion/schema.ts, features/ingestion/storage-path.ts, and features/ingestion/actions.ts
- [x] T102 [P] [US3] Implement accessible Uppy Dashboard/TUS batch uploader with recovered fingerprints and no service credential in components/admin/ingestion/batch-uploader.tsx
- [x] T103 [US3] Implement ingestion batch list/detail/progress/retry/cancel routes in app/[locale]/admin/ingestion/page.tsx and app/[locale]/admin/ingestion/[batchId]/page.tsx
- [x] T104 [P] [US3] Implement versioned product rendition recipes, crop/focal math, checksum identity, and output metadata in features/media/recipe.ts and features/media/types.ts
- [x] T105 [US3] Implement bounded Sharp validation/orientation/metadata-strip/rendition/placeholder processing with checkpointed outputs in netlify/functions/media-worker.mts and features/media/processor.ts
- [x] T106 [US3] Implement signed background dispatch, scheduled stale-job recovery, time-budget stop, capped retries, and safe job errors in features/operations/job-dispatch.ts and netlify/functions/scheduled-coordinator.mts
- [x] T107 [P] [US3] Implement accessible focal/crop editor and approved variant preview in components/admin/ingestion/crop-editor.tsx and components/admin/ingestion/media-review.tsx
- [x] T108 [P] [US3] Implement AssistanceProvider types, strict suggestion schema, manual/disabled adapter, and forbidden-fact guard in lib/providers/assistance/types.ts, lib/providers/assistance/disabled.ts, and features/ingestion/suggestion-schema.ts
- [x] T109 [US3] Implement OpenAI Responses image/Structured-Output adapter with pinned model, store:false, privacy/redaction, and safe failures in lib/providers/assistance/openai.ts
- [x] T110 [US3] Implement suggestion request/review/accept/edit/reject commands that preserve verified values in features/ingestion/suggestions.ts and features/ingestion/suggestion.actions.ts
- [x] T111 [US3] Implement grouped product readiness validation for facts, translations, price, stock, delivery, licenses, media/crops/alt, and discovery in features/catalog/readiness.ts
- [x] T112 [US3] Implement product media/suggestion/readiness review and one-confirmation publish interface in app/[locale]/admin/ingestion/[batchId]/review/page.tsx and components/admin/ingestion/readiness-panel.tsx

### Wiring and Verification for User Story 3

- [x] T113 [W] [US3] Wire BatchUploader into ingestion detail — import BatchUploader from components/admin/ingestion/batch-uploader.tsx in app/[locale]/admin/ingestion/[batchId]/page.tsx and call features/ingestion/actions.ts for authorization/state
- [x] T114 [W] [US3] Wire media-worker to Supabase Queue/job checkpoints — import processor from features/media/processor.ts in netlify/functions/media-worker.mts and call claim/complete functions through lib/supabase/service.ts
- [x] T115 [W] [US3] Wire crop editor/media review into product review — render components/admin/ingestion/crop-editor.tsx and media-review.tsx from app/[locale]/admin/ingestion/[batchId]/review/page.tsx and persist approved recipes
- [x] T116 [W] [US3] Wire assistance providers into suggestion commands — select provider from lib/providers/registry.ts in features/ingestion/suggestions.ts and invoke only after Owner-approved mode/privacy status
- [x] T117 [W] [US3] Wire readiness and publish_product into the review action — import features/catalog/readiness.ts in app/[locale]/admin/ingestion/[batchId]/review/actions.ts and call the transactional publish function only after a current human confirmation
- [x] T118 [US3] Complete unit/contract evaluation for corrupt/decompression-bomb/mislabeled files, retry identity, protected originals, unsafe model text, four-locale schema, and disabled assistance in tests/unit/ingestion/ and tests/contract/assistance/
- [x] T119 [US3] Add local TUS/Storage/Queue/worker integration tests for interrupted resume, 409 duplicate path, partial derivatives, stale lease, retry, cancellation, and orphan cleanup in tests/integration/ingestion/media-pipeline.test.ts
- [x] T120 [US3] Add Playwright upload → process → crop → suggestion review → readiness → publication journey in tests/e2e/product-ingestion.spec.ts
- [x] T121 [US3] Add Playwright recovery cases for refresh/offline/failure/manual fallback/duplicate batch and grouped blockers in tests/e2e/product-ingestion-recovery.spec.ts
- [x] T122 [US3] Run admin ingestion keyboard/axe/touch/long-locale/390/768/1440 two-pass review and store evidence in tests/accessibility/ingestion.spec.ts and docs/quality/us3-visual-evidence.md
- [x] T123 [US3] Validate a 250-file burst, 12-image completion target, queue age, worker memory/time, and zero duplicate outputs in tests/load/media-ingestion.js and docs/quality/us3-load-evidence.md
- [x] T124 [US3] Record SC-004/005/006/024 and FR-026–FR-038/108 evidence in docs/quality/us3-ingestion-evidence.md

**Checkpoint**: Staff can take a safe batch from upload to a truthful public product with or without AI credentials.

---

## Phase 6: User Story 4 — Operate Orders, Payments, and Fulfillment (Priority: P1)

**Goal**: Staff can reconcile payments, advance valid order states, fulfill worldwide shipments, notify customers, and recover safely from duplicate or late provider events.

**Independent Test**: Accept one bank-transfer order and one fixture card order, reconcile each exactly once, ship with tracking, deliver notifications, then exercise duplicate, failed, refunded, and late-event paths.

### Tests for User Story 4

- [x] T125 [P] [US4] Write failing pgTAP tests for payment/refund/fulfillment transitions, webhook replay, outbox claims, separation-of-duties, late payment, and order-event immutability in supabase/tests/database/040_order_operations.test.sql
- [x] T126 [P] [US4] Write failing provider contract tests for TBC create/status/refund/callback verification, bank-transfer reconciliation, disabled mode, idempotency, and sanitized errors in tests/contract/payments/
- [x] T127 [P] [US4] Write failing component tests for order queues, timeline, transfer review, payment state, shipment form, refund confirmation, and retry states in tests/unit/admin/order-operations.test.tsx

### Implementation for User Story 4

- [x] T128 [US4] Create fulfillments, shipment events, refund records, reconciliation records, and provider event inbox, then extend foundational notification-attempt/operational-alert records with order-operation references in supabase/migrations/202608250040_order_operations.sql
- [x] T129 [US4] Implement transition_order, reconcile_payment, record_provider_event, issue_refund, create_shipment, and delivery-event functions with locks, idempotency, audit, and outbox writes in supabase/migrations/202608250041_order_operation_functions.sql
- [x] T130 [US4] Add least-privilege RLS/grants and staff-safe customer projections for order, payment, refund, fulfillment, provider-event, and notification operations in supabase/migrations/202608250042_order_operations_rls.sql
- [x] T131 [P] [US4] Define PaymentProvider contracts, normalized states, fixture/disabled implementations, redacted logging, and provider selection in lib/providers/payment/types.ts, lib/providers/payment/fixture.ts, lib/providers/payment/disabled.ts, and lib/providers/registry.ts
- [x] T132 [US4] Implement TBC access-token, create-payment, authoritative status, refund, timeout, retry, language limitation, and error mapping in lib/providers/payment/tbc.ts
- [x] T133 [US4] Implement verified TBC callback inbox, immediate acknowledgement, replay protection, and queued authoritative status fetch in app/api/webhooks/tbc/route.ts and features/payments/webhook-service.ts
- [x] T134 [US4] Implement localized hosted-payment return/cancel recovery that never trusts redirect parameters for paid status in app/[locale]/(store)/payment/return/page.tsx and features/payments/return-service.ts
- [x] T135 [P] [US4] Define EmailProvider contracts, extend the foundational capture adapter, and implement disabled/Resend adapters with idempotency and safe metadata in lib/providers/email/types.ts, lib/providers/email/disabled.ts, lib/providers/email/capture.ts, and lib/providers/email/resend.ts
- [x] T136 [P] [US4] Implement four-locale accepted, payment-pending, payment-confirmed, shipped, delivered, cancelled, refunded, failed, and staff-alert templates in emails/order/ and emails/operations/
- [x] T137 [US4] Implement notification-outbox claim/send/checkpoint/retry/dead-letter processing and Resend delivery webhook normalization in netlify/functions/notification-worker.mts, features/operations/notification-worker.ts, and app/api/webhooks/resend/route.ts
- [x] T138 [US4] Implement typed order queue/detail/payment/refund/fulfillment queries and command schemas in features/orders/admin-queries.ts, features/orders/admin-actions.ts, and features/orders/schema.ts
- [x] T139 [P] [US4] Implement operations dashboard cards, actionable exceptions, queue-age indicators, and safe empty/loading/error states in components/admin/operations/dashboard.tsx
- [x] T140 [US4] Implement localized admin order queue with filters, saved URL state, pagination, and exports in app/[locale]/admin/orders/page.tsx
- [x] T141 [US4] Implement order detail timeline, immutable snapshots, customer/contact projection, payment, refund, fulfillment, notes, and audit panels in app/[locale]/admin/orders/[orderId]/page.tsx and components/admin/orders/
- [x] T142 [P] [US4] Implement dual-confirmation bank-transfer match/reject/unmatch controls with reference and evidence fields in components/admin/orders/transfer-review.tsx
- [x] T143 [P] [US4] Implement shipment/carrier/tracking/dispatch/delivery controls and safe transition guidance in components/admin/orders/fulfillment-panel.tsx
- [x] T144 [P] [US4] Implement payment status/retry/refund controls with amount guardrails and Owner-only override messaging in components/admin/orders/payment-panel.tsx
- [x] T145 [US4] Implement provider reconciliation, stale-pending checks, notification retry, shipment follow-up, and dead-letter escalation jobs in features/operations/reconciliation.ts and netlify/functions/scheduled-coordinator.mts

### Wiring and Verification for User Story 4

- [x] T146 [W] [US4] Wire card/wallet payment creation into accepted checkout — call the selected PaymentProvider from features/checkout/service.ts, store provider references, and return only the hosted redirect URL
- [x] T147 [W] [US4] Wire verified payment events to transactional state changes — call reconcile_payment from features/payments/webhook-service.ts and enqueue notification/refund/fulfillment follow-up without direct table mutation
- [x] T148 [W] [US4] Wire order command actions to order detail controls — import features/orders/admin-actions.ts from components/admin/orders/ and revalidate the localized order route after CommandResult success
- [x] T149 [W] [US4] Wire operational exceptions and queue metrics into the admin dashboard — import queries from features/operations/reconciliation.ts in app/[locale]/admin/page.tsx
- [x] T150 [US4] Complete payment provider contract tests with fixture recordings, malformed/duplicate callbacks, authoritative mismatch, timeout, late success, refund, and unavailable-provider cases in tests/contract/payments/
- [x] T151 [US4] Add local integration tests for provider inbox, payment reconciliation, bank-transfer review, state transitions, refund, fulfillment, outbox, dead letter, and replay in tests/integration/orders/order-operations.test.ts
- [x] T152 [US4] Add Playwright fixture-card and bank-transfer operations journeys through fulfillment, notification capture, cancellation, and refund in tests/e2e/order-operations.spec.ts
- [x] T153 [US4] Run order operations keyboard/axe/touch/long-locale/390/768/1440 review and store evidence in tests/accessibility/order-operations.spec.ts and docs/quality/us4-visual-evidence.md
- [x] T154 [US4] Record FR-055–FR-066 and SC-009/010/015/018 evidence in docs/quality/us4-order-operations-evidence.md

**Checkpoint**: Accepted orders can be reconciled, fulfilled, communicated, audited, and recovered without trusting browser redirects or duplicate callbacks.

---

## Phase 7: User Story 5 — Maintain Catalog and Store Content (Priority: P1)

**Goal**: Staff can maintain products, inventory, translations, collections, merchandising, and bulk data safely after initial ingestion.

**Independent Test**: Create and edit a product, resolve a concurrent edit, adjust inventory with a reason, import a mixed-validity CSV, translate all fields, merchandise a collection, archive/restore, and export an audit-safe dataset.

### Tests for User Story 5

- [x] T155 [P] [US5] Write failing pgTAP tests for catalog revisions, optimistic conflicts, inventory adjustments, last-item safety, bulk actions, import batches, archives, and change-history immutability in supabase/tests/database/050_catalog_admin.test.sql
- [x] T156 [P] [US5] Write failing unit tests for catalog form schemas, locale completeness, CSV parse/preview/validation, export escaping, bulk selection, archive rules, and autosave conflicts in tests/unit/admin/catalog/
- [x] T157 [P] [US5] Write failing component tests for product editor, translation matrix, inventory adjustment, import preview, collection merchandising, bulk toolbar, and conflict recovery in tests/unit/admin/catalog-ui.test.tsx

### Implementation for User Story 5

- [x] T158 [US5] Create catalog revisions, inventory adjustments, import batches/rows, saved admin views, and archive metadata, then extend foundational export jobs with scoped catalog metadata in supabase/migrations/202608250050_catalog_admin.sql
- [x] T159 [US5] Implement optimistic update, inventory adjustment, bulk archive/restore/publish, import apply, reorder collection, and safe export functions with audit in supabase/migrations/202608250051_catalog_admin_functions.sql
- [x] T160 [US5] Add catalog-admin RLS/grants, safe export projections, spreadsheet-formula protection, and private import/error-report Storage policies in supabase/migrations/202608250052_catalog_admin_rls.sql
- [x] T161 [P] [US5] Implement product/catalog admin schemas, locale-aware normalization, version tokens, and CommandResult mapping in features/catalog/admin-schema.ts and features/catalog/admin-actions.ts
- [x] T162 [P] [US5] Implement localized product facts, pricing, inventory, delivery, SEO, discovery, provenance, and archive form sections in components/admin/catalog/product-form/
- [x] T163 [US5] Implement product list/filter/sort/pagination/saved-view/bulk-selection route in app/[locale]/admin/products/page.tsx and components/admin/catalog/product-table.tsx
- [x] T164 [US5] Implement create/edit/autosave/conflict/restore routes using the shared form and revision token in app/[locale]/admin/products/new/page.tsx and app/[locale]/admin/products/[productId]/edit/page.tsx
- [x] T165 [P] [US5] Implement four-locale translation matrix with source comparison, completeness, copied-text warnings, and per-field validation in components/admin/catalog/translation-workspace.tsx
- [x] T166 [P] [US5] Implement stock-on-hand/reserved/available display and reason-required adjustment control in components/admin/catalog/inventory-panel.tsx
- [x] T167 [P] [US5] Implement collection CRUD, product ordering, featured placement, and publish scheduling controls in features/collections/admin-actions.ts and components/admin/catalog/collection-editor.tsx
- [x] T168 [US5] Implement collection list/editor routes in app/[locale]/admin/collections/page.tsx and app/[locale]/admin/collections/[collectionId]/page.tsx
- [x] T169 [P] [US5] Implement streamed CSV parser, header mapping, row validation, formula-safe error report, dry-run preview, and import summary in features/catalog/importer.ts
- [x] T170 [US5] Implement resumable catalog CSV import preview/apply/cancel route in app/[locale]/admin/imports/catalog/page.tsx and components/admin/catalog/import-workspace.tsx
- [x] T171 [P] [US5] Implement scoped CSV export requests, async generation, expiry, and safe download metadata in features/catalog/exporter.ts and netlify/functions/export-worker.mts
- [x] T172 [P] [US5] Implement selection-wide publish/archive/restore/collection actions with confirmation and partial-failure reporting in components/admin/catalog/bulk-toolbar.tsx
- [x] T173 [US5] Implement product change-history timeline and field-level revision comparison in app/[locale]/admin/products/[productId]/history/page.tsx and components/admin/catalog/revision-diff.tsx

### Wiring and Verification for User Story 5

- [x] T174 [W] [US5] Wire product forms and translation workspace to optimistic catalog commands — import features/catalog/admin-actions.ts from components/admin/catalog/product-form/ and surface current-vs-submitted conflicts
- [x] T175 [W] [US5] Wire inventory adjustments and availability updates into storefront invalidation — call the adjustment command from components/admin/catalog/inventory-panel.tsx and revalidate affected product/listing tags
- [x] T176 [W] [US5] Wire collection editor to public merchandising — call features/collections/admin-actions.ts from components/admin/catalog/collection-editor.tsx and revalidate localized collection routes
- [x] T177 [W] [US5] Wire import/export/bulk controls into product list state — compose components/admin/catalog/import-workspace.tsx and bulk-toolbar.tsx from app/[locale]/admin/products/page.tsx without exposing private files
- [x] T178 [US5] Add local integration tests for optimistic conflict, stock adjustment, partial bulk result, mixed CSV import, archive/restore, translation completeness, and scoped export in tests/integration/catalog/catalog-admin.test.ts
- [x] T179 [US5] Add Playwright product CRUD, autosave conflict, translation, inventory, collection ordering, import, bulk, archive, restore, and export journeys in tests/e2e/catalog-admin.spec.ts
- [x] T180 [US5] Run catalog admin keyboard/axe/touch/dense-table/long-locale/390/768/1440 review and store evidence in tests/accessibility/catalog-admin.spec.ts and docs/quality/us5-visual-evidence.md
- [x] T181 [US5] Record FR-015–FR-025/074/075/083/084/114 and SC-011/016/017 evidence in docs/quality/us5-catalog-admin-evidence.md

**Checkpoint**: The Owner and Manager can maintain the complete sellable catalog without database-console work.

---

## Phase 8: User Story 8 — Control Access, Configuration, and Audit (Priority: P1)

**Goal**: Owner and Manager permissions are enforced at every boundary, production Owner access uses MFA, sensitive actions are privacy-safely audited, and integrations expose status without secrets.

**Independent Test**: Exercise representative public, buyer, Manager, Owner, stale-session, revoked-session, and insufficient-assurance requests directly against data and command boundaries; verify only allowed effects occur and every sensitive outcome is auditable.

### Tests for User Story 8

- [x] T182 [P] [US8] Write failing pgTAP role-matrix tests for Owner/Manager/customer/anonymous boundaries, last-Owner protection, audit immutability/redaction, reauthentication, session revocation, exports, and destructive actions in supabase/tests/database/080_authorization.test.sql
- [x] T183 [P] [US8] Write failing unit tests for authorization guards, MFA assurance, exact-confirmation challenges, integration status, audit summaries, redaction, and session expiry/revocation in tests/unit/auth/ and tests/unit/admin/security/
- [x] T184 [P] [US8] Write failing component tests for sign-in/MFA/recovery, staff management, integration status, audit explorer, sensitive settings, and destructive confirmations in tests/unit/admin/access-control.test.tsx

### Implementation for User Story 8

- [x] T185 [US8] Extend foundational staff/session/integration/audit records with role assignments, session revocations, reauthentication challenges, audit partitions/retention metadata, and protected-operation records in supabase/migrations/202608250060_staff_security.sql
- [x] T186 [US8] Implement assign/deactivate staff, protect last active Owner, revoke sessions, require assurance, record allowed/denied audit, and exact-confirmation functions in supabase/migrations/202608250061_staff_security_functions.sql
- [x] T187 [US8] Apply complete role/data/command RLS matrix, immutable audit grants, security-definer ownership controls, and secret-free integration projections in supabase/migrations/202608250062_staff_security_rls.sql
- [x] T188 [P] [US8] Extend foundational authorization with server-only session context, assurance level, revocation check, sign-out-current/all, and role predicates in features/auth/session.ts, features/auth/authorization.ts, and features/auth/actions.ts
- [x] T189 [P] [US8] Implement sign-in, generic recovery, MFA enrollment/challenge, session-expired, revoked-session, and signed-out views in app/[locale]/auth/ and components/auth/
- [x] T190 [US8] Implement locale-aware admin route protection, Manager/Owner command guards, reauthentication redirects, and deny-safe responses in app/[locale]/admin/layout.tsx and features/auth/admin-guard.ts
- [x] T191 [P] [US8] Implement staff list/invite/role/deactivate/reactivate/session-revoke controls with last-Owner guidance in components/admin/settings/staff-management.tsx
- [x] T192 [US8] Implement Owner staff-management route and server actions in app/[locale]/admin/settings/staff/page.tsx and app/[locale]/admin/settings/staff/actions.ts
- [x] T193 [P] [US8] Implement configured/disabled/test/degraded/ready integration cards without secret retrieval in components/admin/settings/integration-status.tsx
- [x] T194 [US8] Implement Owner integration and business configuration status route in app/[locale]/admin/settings/integrations/page.tsx and features/settings/integration-status.ts
- [x] T195 [P] [US8] Implement audit search/filter/pagination/detail/redaction components with correlation links and safe exports in components/admin/audit/
- [x] T196 [US8] Implement Owner audit explorer and scoped export actions in app/[locale]/admin/audit/page.tsx and features/audit/queries.ts
- [x] T197 [P] [US8] Implement reusable exact-impact, typed-name, reauthentication, reversible-alternative, and result confirmation controls in components/admin/security/danger-confirmation.tsx
- [x] T198 [US8] Implement retention, customer-data request, bounded export, archival, and irreversible-operation command registry in features/privacy/admin-actions.ts and app/[locale]/admin/settings/privacy/page.tsx
- [x] T199 [US8] Implement audit retention/partition maintenance, expired export cleanup, stale session revocation, and security alert jobs in features/operations/security-maintenance.ts and netlify/functions/scheduled-coordinator.mts

### Wiring and Verification for User Story 8

- [x] T200 [W] [US8] Wire server session and role guards into every admin command — import requireManager/requireOwner/requireAssurance from features/auth/authorization.ts in features/\*\*/admin-actions.ts and reject before mutation
- [x] T201 [W] [US8] Wire sensitive allowed/denied outcomes into audit recording — use the central command wrapper from features/audit/command.ts across staff, payment, refund, inventory, import/export, retention, and irreversible operations
- [x] T202 [W] [US8] Wire MFA/session status and sign-out controls into admin chrome — render components/auth/session-menu.tsx from app/[locale]/admin/layout.tsx with current assurance and revocation-safe handling
- [x] T203 [US8] Add local integration tests for direct-boundary role bypass, MFA levels, reauthentication expiry, last Owner, session revocation, audit privacy, retention, and scoped export in tests/integration/auth/authorization.test.ts
- [x] T204 [US8] Add Playwright Manager/Owner sign-in, MFA enrollment/challenge, permission denial, session revoke, staff lifecycle, audit search, and exact-confirmation journeys in tests/e2e/admin-access.spec.ts
- [x] T205 [US8] Run auth/settings/audit keyboard/axe/touch/long-locale/390/768/1440 review and store evidence in tests/accessibility/admin-access.spec.ts and docs/quality/us8-visual-evidence.md
- [x] T206 [US8] Run dependency, secret, RLS, headers, CSP, abuse-control, and authorization-boundary security verification in scripts/security-audit.mjs and docs/quality/us8-security-evidence.md
- [x] T207 [US8] Record FR-076–FR-085/100/112/114 and SC-007/008/019 evidence in docs/quality/us8-access-control-evidence.md

**Checkpoint**: Administration has enforceable least privilege, strong Owner authentication, safe session lifecycle, secret-free configuration visibility, and immutable audit evidence.

---

## Phase 9: User Story 11 — Operate and Recover the Service (Priority: P1)

**Goal**: Releases are controlled, failures are diagnosable, scheduled work catches up, backups/restores are proven, and launch claims are evidence-based.

**Independent Test**: Promote an isolated fixture-backed release, run smoke journeys, simulate dependency and scheduled-job failures, roll back, restore a backup into a clean environment, and reconcile critical data/media invariants.

### Tests for User Story 11

- [x] T208 [P] [US11] Write failing unit tests for health aggregation, correlation IDs, redaction, event dictionary enforcement, readiness stages, alert thresholds, release decisions, and scheduler catch-up in tests/unit/operations/
- [x] T209 [P] [US11] Write failing integration tests for scheduled-action leases, missed-window catch-up, health degradation, alert deduplication, data/media integrity checks, and rollback metadata in tests/integration/operations/
- [x] T210 [P] [US11] Write failing smoke specifications for public discovery, checkout, ingestion, order operations, auth/MFA, and dependency-disabled states in tests/smoke/production-gates.spec.ts

### Implementation for User Story 11

- [x] T211 [US11] Extend foundational scheduled actions and alerts with leases/runs/occurrences, then create health snapshots, release records, backup/restore evidence, and readiness-assessment tables in supabase/migrations/202608250070_operations.sql
- [x] T212 [US11] Implement lease/heartbeat/complete/catch-up, alert dedupe, readiness evaluation, and critical-data integrity functions in supabase/migrations/202608250071_operations_functions.sql
- [x] T213 [P] [US11] Extend the foundational correlation/logger layer with a named event dictionary, metric types, and privacy allowlist in lib/observability/logger.ts, lib/observability/events.ts, and lib/observability/metrics.ts
- [x] T214 [P] [US11] Implement disabled/fixture/PostHog analytics adapters with consent gating, autocapture/replay disabled, and named-event validation in lib/providers/analytics/
- [x] T215 [P] [US11] Implement disabled/fixture/Sentry error-monitoring adapters with PII-off defaults, correlation references, and scrub hooks in lib/providers/monitoring/
- [x] T216 [US11] Implement liveness, readiness, dependency, queue-age, scheduler-age, and version checks without secret disclosure in app/api/health/live/route.ts, app/api/health/ready/route.ts, and features/operations/health.ts
- [x] T217 [US11] Implement lease-safe scheduled coordinator for publication, expiry, recovery, cleanup, reconciliation, outbox, alert, export, and security jobs in netlify/functions/scheduled-coordinator.mts
- [x] T218 [US11] Implement release/readiness evaluator distinguishing build-complete, payment-ready, staging-operational, and launch-ready with external-input blockers in features/operations/readiness.ts and scripts/readiness-report.mjs
- [x] T219 [P] [US11] Implement operations dashboard health, alert, queue, scheduler, notification, integration, release, and readiness panels in components/admin/operations/health-dashboard.tsx
- [x] T220 [US11] Implement Owner operations/readiness route with evidence links and no unsupported launch claim in app/[locale]/admin/operations/page.tsx
- [x] T221 [P] [US11] Harden the baseline Netlify build/functions/headers/redirects configuration and runtime pinning for preview/staging/production in netlify.toml, public/\_headers, and .nvmrc
- [x] T222 [P] [US11] Extend the foundational checked environment contract with safe examples, startup validation, and environment-status reporting in lib/env/schema.ts, .env.example, and scripts/check-env.mjs
- [x] T223 [P] [US11] Extend local Supabase configuration with isolated preview/staging/production guidance, safe seed fixtures, migration checks, and type generation in supabase/config.toml, supabase/seed.sql, and scripts/database/
- [x] T224 [P] [US11] Expand baseline CI into install/lint/typecheck/unit/database/contract/build/e2e/accessibility/security/migration-drift release gates with artifact retention in .github/workflows/ci.yml and .github/workflows/release-gates.yml
- [x] T225 [P] [US11] Add controlled Netlify preview/staging/production promotion, post-deploy smoke, and rollback metadata scripts in scripts/release/promote.mjs, scripts/release/smoke.mjs, and scripts/release/rollback.mjs
- [x] T226 [P] [US11] Add k6 scenarios and budgets for browse/search, checkout contention, admin lists, ingestion bursts, webhooks, and scheduled catch-up in tests/load/
- [x] T227 [P] [US11] Add bundle, responsive-image, Core Web Vitals, database-query, queue-age, and cost/usage budget checks in scripts/performance/ and docs/operations/performance-budgets.md
- [x] T228 [P] [US11] Document environment setup, migrations, deployment, rollback, incident response, degraded dependencies, payment activation, domain activation, and Owner recovery in docs/operations/runbooks/
- [x] T229 [P] [US11] Document backup/PITR prerequisites, RPO/RTO, restore rehearsal, integrity SQL, media-reference checks, evidence retention, and rehearsal schedule in docs/operations/backup-restore.md
- [x] T230 [P] [US11] Document data classification, retention, deletion, privacy requests, residency/region decision, subprocessors, log policy, and credential rotation in docs/operations/data-governance.md

### Wiring and Verification for User Story 11

- [x] T231 [W] [US11] Wire correlation/event/metric adapters into public, checkout, ingestion, payment, notification, auth, and admin boundaries using lib/observability/ without customer text or raw provider payloads
- [x] T232 [W] [US11] Wire health/readiness/alert queries into Owner operations UI — import features/operations/health.ts and readiness.ts from app/[locale]/admin/operations/page.tsx
- [x] T233 [W] [US11] Wire all scheduled domains through the single lease-safe coordinator — register typed jobs from features/operations/ in netlify/functions/scheduled-coordinator.mts with bounded time and catch-up rules
- [x] T234 [US11] Prove missed-schedule catch-up, dependency degradation, retry/dead-letter alerts, correlation tracing, and safe health responses in tests/integration/operations/production-operations.test.ts
- [x] T235 [US11] Execute clean-database migration, seed, backup, restore, critical-table/RLS/order-stock/media integrity verification and record dated evidence in docs/quality/restore-rehearsal.md
- [x] T236 [US11] Execute full CI/release gates, Netlify preview smoke, rollback rehearsal, performance budgets, and readiness report and record dated evidence in docs/quality/release-gate-evidence.md
- [x] T237 [US11] Record FR-097–FR-106 and NFR-003/004/005/006/007/009/010/011 evidence in docs/quality/us11-production-operations-evidence.md

**Checkpoint**: The complete P1 business is demonstrable in isolated environments with controlled release, diagnosis, recovery, and truthful readiness reporting.

---

## Phase 10: User Story 6 — Use an Optional Customer Account (Priority: P2)

**Goal**: Buyers may keep a wishlist, create an optional secure account, merge guest state, manage sessions/addresses, and view only their own historical orders.

**Independent Test**: Build an anonymous wishlist/cart, register and verify an account, merge without duplicates, manage two addresses and sessions, inspect an order, sign out/revoke, recover access, and prove cross-account denial.

### Tests for User Story 6

- [x] T238 [P] [US6] Write failing pgTAP tests for anonymous/account wishlist ownership and merge, customer/address/order isolation, immutable order snapshots, session revocation, privacy requests, and account deletion states in supabase/tests/database/060_customer_accounts.test.sql
- [x] T239 [P] [US6] Write failing unit tests for auth/account/address/wishlist schemas, existence-safe recovery, guest merge, duplicate suppression, and privacy-request eligibility in tests/unit/customer/
- [x] T240 [P] [US6] Write failing component tests for account navigation, order history/detail, address book, wishlist, session manager, recovery, verification, and privacy controls in tests/unit/customer/account-ui.test.tsx

### Implementation for User Story 6

- [x] T241 [US6] Create customer profiles, addresses, wishlist items, guest wishlist ownership, merge records, consent/preferences, and privacy-request tables in supabase/migrations/202608250080_customer_accounts.sql
- [x] T242 [US6] Implement duplicate-safe guest merge, address CRUD/default selection, customer proof/order lookup, privacy-request lifecycle, and account closure functions in supabase/migrations/202608250081_customer_account_functions.sql
- [x] T243 [US6] Apply strict customer self-access, guest-secret wishlist, immutable order-snapshot, staff-safe customer projection, and privacy-request RLS/grants in supabase/migrations/202608250082_customer_accounts_rls.sql
- [x] T244 [P] [US6] Implement anonymous/account wishlist queries, toggle actions, merge, and count summary in features/wishlist/queries.ts, features/wishlist/actions.ts, and features/wishlist/merge.ts
- [x] T245 [P] [US6] Implement secure sign-up/sign-in/verification/recovery schemas and actions with generic recovery outcomes and rate-limit hooks in features/auth/customer-actions.ts
- [x] T246 [US6] Implement customer auth routes and accessible forms in app/[locale]/auth/sign-up/page.tsx, app/[locale]/auth/sign-in/page.tsx, app/[locale]/auth/verify/page.tsx, and app/[locale]/auth/recover/page.tsx
- [x] T247 [P] [US6] Implement account order, address, wishlist, preference, session, and privacy queries/actions in features/customer/
- [x] T248 [US6] Implement protected account layout/overview and navigation in app/[locale]/account/layout.tsx and app/[locale]/account/page.tsx
- [x] T249 [P] [US6] Implement responsive order-history list and authenticated order-detail view in app/[locale]/account/orders/page.tsx and app/[locale]/account/orders/[orderId]/page.tsx
- [x] T250 [P] [US6] Implement address-book list/create/edit/default/delete controls preserving order snapshots in app/[locale]/account/addresses/page.tsx and components/account/address-book.tsx
- [x] T251 [P] [US6] Implement wishlist page, product-card toggle, guest persistence, and sign-in merge notice in app/[locale]/account/wishlist/page.tsx and components/commerce/wishlist-button.tsx
- [x] T252 [P] [US6] Implement active-session list, current/all sign-out, revocation status, preference/consent, export, correction, and closure controls in app/[locale]/account/settings/page.tsx and components/account/security-privacy.tsx

### Wiring and Verification for User Story 6

- [x] T253 [W] [US6] Wire wishlist state into storefront product/list/detail and header — import features/wishlist/ from components/storefront/product-card.tsx, app/[locale]/(store)/products/[slug]/page.tsx, and components/storefront/site-header.tsx
- [x] T254 [W] [US6] Wire successful sign-in/sign-up to one-time guest cart/wishlist merge — call features/wishlist/merge.ts and the cart merge command from features/auth/customer-actions.ts with idempotency
- [x] T255 [US6] Add local integration tests for cross-user denial, guest-secret rotation, merge replay, saved-address mutation versus order snapshot, session revoke, and privacy request in tests/integration/customer/customer-account.test.ts
- [x] T256 [US6] Add Playwright anonymous wishlist → account merge, order history, address management, recovery, sessions, sign-out, and account privacy journeys in tests/e2e/customer-account.spec.ts
- [x] T257 [US6] Run customer auth/account keyboard/axe/touch/long-locale/390/768/1440 review and store evidence in tests/accessibility/customer-account.spec.ts and docs/quality/us6-visual-evidence.md
- [x] T258 [US6] Record FR-067–FR-073/109/112 and SC-020 evidence in docs/quality/us6-customer-account-evidence.md

**Checkpoint**: Accounts add durable convenience without becoming a purchase requirement or weakening customer isolation.

---

## Phase 11: User Story 7 — Request Cancellation, Return, or Refund (Priority: P2)

**Goal**: Buyers can submit eligible requests with private safe evidence, while staff apply valid, notified, auditable, duplicate-safe decisions, refunds, and restocks.

**Independent Test**: Submit guest and account return requests, upload permitted evidence, request information, approve/reject, inspect receipt, restock once, refund once, and validate expired/ineligible/duplicate paths.

### Tests for User Story 7

- [x] T259 [P] [US7] Write failing pgTAP tests for policy-window snapshots, request ownership, transitions, evidence privacy/retention, decision reasons, refund/restock idempotency, and guest proof in supabase/tests/database/070_returns.test.sql
- [x] T260 [P] [US7] Write failing unit tests for eligibility, reason/note/file limits, real-type validation, transition rules, restock outcomes, refund allocation, and legal-copy status in tests/unit/returns/
- [x] T261 [P] [US7] Write failing component tests for buyer request/status/evidence and staff queue/detail/information/decision/inspection/refund/restock states in tests/unit/returns/returns-ui.test.tsx

### Implementation for User Story 7

- [x] T262 [US7] Create return policies, cancellation/return requests, request events/messages, private evidence, inspections, decisions, and restock links in supabase/migrations/202608250090_returns.sql
- [x] T263 [US7] Implement eligibility, submit, request-information, approve/reject, record-receipt/inspection, cancel, refund, restock, and expiry functions with immutable policy context in supabase/migrations/202608250091_return_functions.sql
- [x] T264 [US7] Apply buyer/guest-proof/staff RLS, private signed evidence access, abandoned-evidence cleanup, and return-safe order projections in supabase/migrations/202608250092_returns_rls.sql
- [x] T265 [P] [US7] Implement return eligibility, request, transition, evidence, refund, and restock schemas/services in features/returns/schema.ts, features/returns/eligibility.ts, and features/returns/actions.ts
- [x] T266 [P] [US7] Implement bounded private evidence upload with file/count/size/actual-type checks and removal in features/returns/evidence.ts and components/returns/evidence-upload.tsx
- [x] T267 [P] [US7] Implement buyer cancellation/return request form, disclosure, reference result, and recoverable errors in components/returns/request-form.tsx
- [x] T268 [US7] Implement guest-proof and account-owned return request/status routes in app/[locale]/(store)/order/[reference]/request/page.tsx and app/[locale]/account/returns/[returnId]/page.tsx
- [x] T269 [P] [US7] Implement staff return queue filters/counts/states and request detail timeline in app/[locale]/admin/returns/page.tsx and app/[locale]/admin/returns/[returnId]/page.tsx
- [x] T270 [P] [US7] Implement information request, approve/reject reason, receipt/inspection, refund, and restock controls in components/admin/returns/return-operations.tsx
- [x] T271 [US7] Implement configurable cancellation/return windows, eligibility, reasons, evidence, restock behavior, and unapproved-legal-copy status in app/[locale]/admin/settings/returns/page.tsx and features/returns/policy-actions.ts
- [x] T272 [P] [US7] Implement four-locale return submitted, information requested, approved, rejected, received, refunded, and closed templates in emails/returns/

### Wiring and Verification for User Story 7

- [x] T273 [W] [US7] Wire eligible return/cancellation actions into guest and account order detail — import features/returns/eligibility.ts from app/[locale]/(store)/order/[reference]/page.tsx and app/[locale]/account/orders/[orderId]/page.tsx without exposing another order
- [x] T274 [W] [US7] Wire approved return refund/restock to existing transactional commands — invoke the issue_refund and adjust_inventory RPCs produced by supabase/migrations/202608250041_order_operation_functions.sql and supabase/migrations/202608250051_catalog_admin_functions.sql from features/returns/actions.ts through lib/supabase/server.ts with one shared idempotency key
- [x] T275 [W] [US7] Wire return transitions to outbox, dashboard, cleanup, and audit through features/returns/actions.ts, components/admin/operations/dashboard.tsx, features/operations/outbox.ts, and netlify/functions/scheduled-coordinator.mts
- [x] T276 [US7] Add local integration tests for guest/account ownership, private evidence, invalid type, abandoned cleanup, transition denial, duplicate refund/restock, and notification failure in tests/integration/returns/return-workflow.test.ts
- [x] T277 [US7] Add Playwright buyer request → staff information/decision → receipt/refund/restock journeys plus expired/ineligible/rejected cases in tests/e2e/returns.spec.ts
- [x] T278 [US7] Run buyer/staff returns keyboard/axe/touch/long-locale/390/768/1440 review and store evidence in tests/accessibility/returns.spec.ts and docs/quality/us7-visual-evidence.md
- [x] T279 [US7] Record FR-086–FR-089/113 and SC-021/022 evidence in docs/quality/us7-returns-evidence.md

**Checkpoint**: Returns and cancellations are a complete, private, auditable operation rather than an informal support promise.

---

## Phase 12: User Story 9 — Configure Worldwide Selling (Priority: P2)

**Goal**: Staff configure truthful markets, prices, tax display, promotions, delivery zones/methods, customs notices, and manual quotes without fabricated conversions or unsupported service.

**Independent Test**: Configure Georgia, one supported international zone, a manual-quote route, explicit GEL/EUR/USD prices, discounts, and customs text; verify valid, ineligible, oversized, disabled-currency, and unsupported-country outcomes.

### Tests for User Story 9

- [x] T280 [P] [US9] Write failing pgTAP tests for currency enablement/prices, delivery-zone precedence, method eligibility, discount windows/limits/combinations, quote lifecycle, tax display, and configuration revisions in supabase/tests/database/090_worldwide_selling.test.sql
- [x] T281 [P] [US9] Write failing unit/property tests for minor-unit market prices, no implicit conversion, discount allocation, international address cases, delivery constraints, customs responsibility, and manual-quote fallback in tests/unit/commerce/worldwide/
- [x] T282 [P] [US9] Write failing component tests for currency, discount, delivery-zone/method, tax/customs, and manual-quote administration plus public unsupported states in tests/unit/admin/worldwide-selling.test.tsx

### Implementation for User Story 9

- [x] T283 [US9] Extend foundational product-price, discount/redemption, and delivery-zone/method/rate records with market currency, approved conversion policy, customs text, and manual quote tables in supabase/migrations/202608250100_worldwide_selling.sql
- [x] T284 [US9] Implement versioned price resolution, discount validation/allocation, delivery eligibility/rate precedence, tax display, manual quote submit/resolve/expire, and configuration publish functions in supabase/migrations/202608250101_worldwide_selling_functions.sql
- [x] T285 [US9] Apply Owner/Manager configuration grants, public published projections, customer quote ownership, and private quote-contact RLS in supabase/migrations/202608250102_worldwide_selling_rls.sql
- [x] T286 [P] [US9] Implement currencies/prices/conversion-status schemas and admin actions with independent locale/currency persistence in features/pricing/admin-actions.ts and features/preferences/currency.ts
- [x] T287 [P] [US9] Implement discounts/promotions schemas, preview, eligibility explanation, usage display, and admin actions in features/promotions/ and components/admin/commerce/promotion-editor.tsx
- [x] T288 [P] [US9] Implement delivery zone/method/rate/service-level/threshold/estimate/customs/manual-quote schemas and actions in features/delivery/admin-actions.ts
- [x] T289 [US9] Implement currency/explicit-price settings and product market-price matrix in app/[locale]/admin/settings/currencies/page.tsx and components/admin/commerce/price-matrix.tsx
- [x] T290 [US9] Implement promotions list/editor/status/usage routes in app/[locale]/admin/promotions/page.tsx and app/[locale]/admin/promotions/[promotionId]/page.tsx
- [x] T291 [US9] Implement delivery zone/method/rate ordering and test-address preview routes in app/[locale]/admin/settings/delivery/page.tsx and components/admin/commerce/delivery-editor.tsx
- [x] T292 [P] [US9] Implement tax-display/customs-responsibility configuration with unapproved/legal-review states in app/[locale]/admin/settings/markets/page.tsx
- [x] T293 [P] [US9] Implement public manual quote form, reference/status view, staff queue/detail/resolve controls, and localized notifications in app/[locale]/(store)/quote/, app/[locale]/admin/quotes/, and emails/quotes/

### Wiring and Verification for User Story 9

- [x] T294 [W] [US9] Wire published currency, market price, tax, delivery, discount, and customs configuration into features/catalog/queries.ts, features/cart/queries.ts, and features/checkout/service.ts through the authoritative pricing functions without locale-derived currency
- [x] T295 [W] [US9] Wire manual quote fallback from unsupported catalog/cart/checkout outcomes to app/[locale]/(store)/quote/ with recoverable cart/address context
- [x] T296 [W] [US9] Wire configuration changes to cache invalidation, scheduled activation/expiry, audit, alerts, and readiness status through features/pricing/admin-actions.ts, features/delivery/admin-actions.ts, features/promotions/admin-actions.ts, and netlify/functions/scheduled-coordinator.mts
- [x] T297 [US9] Add local integration tests for zone precedence, supported/unsupported destination, oversized item, explicit currency price, disabled currency, promotion contention, manual quote, and schedule catch-up in tests/integration/commerce/worldwide-selling.test.ts
- [x] T298 [US9] Add Playwright Georgia/international/manual-quote purchases, independent language/currency, invalid discount, customs notice, and staff configuration journeys in tests/e2e/worldwide-selling.spec.ts
- [x] T299 [US9] Run worldwide settings/checkout keyboard/axe/touch/long-address/long-locale/390/768/1440 review and store evidence in tests/accessibility/worldwide-selling.spec.ts and docs/quality/us9-visual-evidence.md
- [x] T300 [US9] Record FR-043/045–FR-048/109 and SC-023 evidence in docs/quality/us9-worldwide-selling-evidence.md

**Checkpoint**: Worldwide selling is configurable and truthful, with supported checkout where valid and a clear quote path everywhere else.

---

## Phase 13: User Story 10 — Publish Editorial and Service Content (Priority: P3)

**Goal**: Staff publish localized editorial/service content, menus, redirects, contact paths, and consent-aware communications without exposing placeholder facts or silently mixing critical translations.

**Independent Test**: Draft, preview, schedule, publish, move, unpublish, archive, and restore a four-locale story/service page; update menus; submit contact/newsletter consent; withdraw analytics consent; and verify fallbacks, redirects, failures, and cleanup.

### Tests for User Story 10

- [x] T301 [P] [US10] Write failing pgTAP tests for content states/schedules, locale fallback disclosure, menu revisions, redirect-loop prevention, contact deduplication/privacy, consent withdrawal/versioning, and abandoned-message cleanup in supabase/tests/database/100_content_contact_consent.test.sql
- [x] T302 [P] [US10] Write failing unit tests for content/SEO schemas, scheduling/timezone, redirect graph validation, contact limits/abuse controls, newsletter basis, consent categories, and fallback disclosure in tests/unit/content/
- [x] T303 [P] [US10] Write failing component tests for content editor/preview/schedule, menu/redirect tools, public contact status, newsletter consent, and cookie preference center in tests/unit/content/content-ui.test.tsx

### Implementation for User Story 10

- [x] T304 [US10] Create content entries/translations/revisions, menus/items, redirects, contact channels/submissions, newsletter consents, and disclosure versions, then extend foundational consent records with public preference metadata in supabase/migrations/202608250110_content_contact_consent.sql
- [x] T305 [US10] Implement preview/publish/schedule/unpublish/archive/restore, menu publish, redirect validation, duplicate-safe contact, newsletter consent/withdrawal, and preference functions in supabase/migrations/202608250111_content_contact_consent_functions.sql
- [x] T306 [US10] Apply published-content projections, staff content grants, private contact access, visitor consent ownership, retention, and verified-channel RLS in supabase/migrations/202608250112_content_contact_consent_rls.sql
- [x] T307 [P] [US10] Implement content entry/translation/metadata/schedule schemas, preview tokens, fallback policy, and admin actions in features/content/
- [x] T308 [P] [US10] Implement localized rich-content editor using constrained portable blocks, source comparison, preview, status, schedule, and approval controls in components/admin/content/content-editor.tsx
- [x] T309 [US10] Implement content list/create/edit/preview/revision routes in app/[locale]/admin/content/page.tsx, app/[locale]/admin/content/[contentId]/page.tsx, and app/[locale]/preview/[token]/page.tsx
- [x] T310 [P] [US10] Implement menu/footer ordering, locale labels, visibility schedules, and broken-destination checks in components/admin/content/menu-editor.tsx and app/[locale]/admin/content/navigation/page.tsx
- [x] T311 [P] [US10] Implement redirect graph validation, loop/conflict preview, scheduled activation, and status controls in features/content/redirects.ts and app/[locale]/admin/content/redirects/page.tsx
- [x] T312 [US10] Implement localized homepage content regions, journal list/article, and safe content renderer in app/[locale]/(store)/page.tsx, app/[locale]/(store)/journal/, and components/content/content-renderer.tsx
- [x] T313 [US10] Implement About, FAQ, Delivery, Returns, Privacy, Cookie, and Terms routes with reviewed/fallback/unapproved policy states in app/[locale]/(store)/(service)/; the interactive Contact route is owned by T314
- [x] T314 [P] [US10] Implement verified contact-channel configuration, contact validation/abuse controls, duplicate-safe reference, outbox notice, and recoverable status in features/contact/ and app/[locale]/(store)/(service)/contact/page.tsx
- [x] T315 [P] [US10] Implement newsletter explicit-consent signup/withdrawal with abandoned-cart messaging hard-disabled until approved in features/newsletter/ and components/content/newsletter-form.tsx
- [x] T316 [P] [US10] Implement essential/preferences/analytics consent model, versioned preference center, grant/refuse/withdraw controls, and script activation boundary in features/consent/ and components/content/consent-preferences.tsx
- [x] T317 [P] [US10] Extend catalog discovery metadata with content-aware sitemap/robots, canonical/hreflang, localized metadata, article structured data, social cards, and unavailable-content rules in app/sitemap.ts, app/robots.ts, features/seo/, and app/[locale]/layout.tsx
- [x] T318 [P] [US10] Implement four-locale contact received/failure, newsletter confirmation/withdrawal, content schedule failure, and staff contact alert templates in emails/contact/ and emails/content/

### Wiring and Verification for User Story 10

- [x] T319 [W] [US10] Wire published menus/footer/content into storefront shell — query features/content/ from components/storefront/site-header.tsx, site-footer.tsx, and localized public routes with disclosed fallback
- [x] T320 [W] [US10] Wire analytics provider activation to current optional-consent state — use features/consent/ in lib/providers/analytics/ and stop future non-essential events immediately after withdrawal
- [x] T321 [W] [US10] Wire scheduled content/redirect/menu/contact-cleanup/consent-retention work from features/content/scheduler.ts, features/contact/cleanup.ts, and features/consent/retention.ts into netlify/functions/scheduled-coordinator.mts and features/operations/alerts.ts
- [x] T322 [US10] Add local integration tests for preview token, schedule catch-up, locale fallback, redirect loops, contact replay/rate limit/outbox failure, newsletter withdrawal, and analytics consent in tests/integration/content/content-contact-consent.test.ts
- [x] T323 [US10] Add Playwright content publish/preview/schedule/navigation/redirect, contact success/failure, newsletter, and cookie grant/refuse/withdraw journeys in tests/e2e/content-and-consent.spec.ts
- [x] T324 [US10] Run public/admin content keyboard/axe/touch/reduced-motion/long-locale/390/768/1440 review and store evidence in tests/accessibility/content-and-consent.spec.ts and docs/quality/us10-visual-evidence.md
- [x] T325 [US10] Record FR-090–FR-098/110/111 and SC-012/025 evidence in docs/quality/us10-content-contact-consent-evidence.md

**Checkpoint**: ÉPOCA can publish and support buyers in four languages while keeping policy truth, contact channels, redirects, and optional tracking under explicit control.

---

## Phase 14: Cross-System Production Hardening and Launch Evidence

**Purpose**: Close the requirements that span stories, verify the assembled system as one shop, and leave only clearly identified external activation inputs.

- [x] T326 [P] Reconcile all Georgian, English, German, and Russian message catalogs, routes, email subjects, metadata, validation messages, admin labels, and fallback disclosures in messages/ and docs/quality/localization-inventory.md
- [x] T327 [P] Verify script-aware Noto Serif/Noto Serif Georgian and Inter/Noto Sans Georgian loading, numeral/currency/address formatting, text expansion, font fallback, and no glyph loss in app/[locale]/layout.tsx, app/globals.css, and tests/visual/fonts.spec.ts
- [x] T328 [P] Complete and audit the foundational Collector’s Index design tokens, focus/hover/disabled/error/success/loading states, reduced motion, print-safe order views, responsive admin density, and reusable public/admin primitives in app/globals.css and components/ui/
- [x] T329 [P] Audit every public/admin image consumer for correct aspect reservation, sizes/srcset, rendition access, lazy/eager priority, fallback, alt policy, zoom honesty, and protected-original isolation in components/ and docs/quality/media-delivery-audit.md
- [x] T330 [P] Harden the foundational CSP, HSTS, referrer, permissions, MIME, frame, cache, webhook, upload, and admin security headers with preview/production differences in public/\_headers, netlify.toml, and proxy.ts
- [x] T331 [P] Complete and audit centralized rate/abuse limits and useful failure mapping for auth, contact, uploads, checkout, quote, returns, payment events, newsletter, and exposed writes in lib/security/rate-limit.ts and features/\*\*/actions.ts
- [x] T332 [P] Add secret scanning, dependency/license audit, generated-SBOM, migration/RLS audit, provider egress inventory, and artifact signing/checksums to .github/workflows/security.yml and scripts/security/
- [x] T333 [P] Add production-scale indexes/query plans for catalog search, admin lists, orders, jobs, audit, content, returns, and reporting with regression tests in supabase/migrations/202608250120_performance_indexes.sql and supabase/tests/database/120_query_plans.test.sql
- [x] T334 [P] Add bounded, timezone/currency-defined sales, payment, stock, ingestion, returns, and operational reports with role-limited exports in features/reporting/ and app/[locale]/admin/reports/page.tsx
- [x] T335 [P] Add four-locale safe error, not-found, loading, maintenance, offline/retry, JavaScript-limited, and dependency-degraded experiences in app/[locale]/error.tsx, app/[locale]/not-found.tsx, app/[locale]/loading.tsx, app/global-error.tsx, and public/
- [x] T336 Run the two-pass UI workflow for every critical public/admin route at 390px, 768px, and 1440px in all four locales and record screenshots/issues/resolutions in docs/quality/final-visual-review.md
- [x] T337 Run full WCAG 2.2 AA keyboard, focus, screen-reader-name, status announcement, contrast, target size, zoom/reflow, reduced-motion, and axe verification and record exceptions in docs/quality/final-accessibility-audit.md
- [x] T338 Run final unit/component/database/contract/integration/e2e/smoke/load/security/localization/build/type/lint suites from a clean install and record commands, versions, results, and artifacts in docs/quality/final-verification.md
- [x] T339 Run concurrency and failure-injection matrix for last-item checkout, payment uncertainty/replay, refund/restock, upload interruption, queue lease, notification failure, schedule miss, provider outage, export failure, and session revocation in tests/resilience/ and docs/quality/resilience-evidence.md
- [x] T340 Verify SEO/discovery from generated production output including canonical/hreflang, sitemap/robots, redirects, structured data, noindex preview/admin, product availability, and localized social metadata in tests/seo/ and docs/quality/seo-evidence.md
- [x] T341 Perform privacy/security threat review covering RLS, staff/customer/guest isolation, PII logs, audit redaction, private media/evidence, consent, retention, exports, callbacks, CSRF/XSS/SSRF/upload threats, and dependency posture in docs/security/threat-model.md
- [x] T342 Complete operational manuals for Owner/Manager catalog, ingestion, orders, transfers, fulfillment, returns, content, staff, integrations, audit, reconciliation, incident, backup/restore, and launch-day procedures in docs/operations/owner-manual.md and docs/operations/manager-manual.md
- [x] T343 Create external activation register for Supabase, Netlify, domain/DNS, TBC merchant approval/credentials, bank-transfer instructions, Resend/domain authentication, OpenAI, PostHog, Sentry, verified contact details, delivery rules, tax/legal/policy approval, privacy review, and licensed production media in docs/operations/external-activation-register.md
- [x] T344 Verify every missing external input leaves a tested disabled/test/degraded state, never a false promise, and link its activation/revalidation procedure from docs/operations/external-activation-register.md
- [x] T345 Generate requirements-to-code-to-test-to-evidence traceability for FR-001–FR-114, NFR-001–NFR-012, SC-001–SC-025, and every acceptance/edge case in docs/quality/requirements-traceability.md
- [x] T346 Remove sample secrets, unapproved facts, unsupported provider claims, orphaned assets, dead code, debug output, unsafe fixtures, TODO launch claims, and expired preview artifacts while retaining explicit activation placeholders in scripts/final-cleanup.mjs and docs/quality/final-cleanup.md
- [x] T347 Validate fresh-clone onboarding, local Supabase start/reset/types, fixture providers, four-locale seed catalog, test/build, Netlify preview, and recovery instructions solely from README.md and docs/operations/ in docs/quality/fresh-clone-evidence.md
- [x] T348 Produce a dated readiness report with build-complete/payment-ready/staging-operational/launch-ready gates, owners, evidence, unresolved external inputs, risk acceptance, and go/no-go result in docs/quality/production-readiness-report.md
- [ ] T349 Tag the verified release candidate, preserve immutable build/migration/test/SBOM evidence, deploy to staging, run post-deploy smoke/reconciliation, and record rollback point in docs/quality/release-candidate.md
- [ ] T350 Activate production only after all launch-ready gates and external approvals pass; otherwise keep staging operational and record the exact blockers without claiming live readiness in docs/quality/production-readiness-report.md

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1–US5, US8, US11 (Phases 3–9)**: Execute in phase order for the safest commerce path. After Foundation, isolated test/schema work marked `[P]` may proceed independently, but wiring waits for its listed implementation.
- **US6, US7, US9 (Phases 10–12)**: Depend on the P1 checkout/order/auth foundations; each remains independently testable.
- **US10 (Phase 13)**: Depends on localization, staff access, outbox, scheduling, and public shell foundations.
- **Production Hardening (Phase 14)**: Depends on all required story phases and cannot certify external capabilities that remain unconfigured.

### User Story Dependency Graph

```text
Setup → Foundation → US1 → US2 → US3 → US4 → US5 → US8 → US11
                              ├────────────→ US6
                              ├────→ US7
                         US2/US5───────────→ US9
              US1/US4/US8/US11────────────→ US10
All selected stories ─────────────────────→ Production Hardening
```

### Within Each User Story

1. Write the listed failing database/unit/component/contract tests.
2. Apply schema and RLS migrations before data-access or command code.
3. Implement provider-neutral domain behavior before live adapters.
4. Build page/components against typed services and explicit states.
5. Complete `[W]` wiring tasks only after both named producer and consumer exist.
6. Pass integration, journey, accessibility, performance, and evidence tasks before the checkpoint.

## Parallel Execution Examples

- **US1**: T040, T041, and T042 can run together; after T043–T049, T050–T054 can run together; then T055–T064 close wiring and evidence.
- **US3**: T095–T097 can run together; T101/T102, T104, and T107/T108 can proceed in parallel after migrations; T113–T117 then integrate the pipeline.
- **US4**: Provider contracts/adapters (T126/T131–T136), admin components (T127/T139/T142–T144), and database transitions (T125/T128–T130) are separate lanes until T146–T149.
- **US8**: Database role enforcement (T182/T185–T187), session/auth UX (T183/T188–T190), and staff/audit UI (T184/T191–T198) converge at T200–T202.
- **US11**: Observability (T208/T213–T220), platform/release (T221–T225), and performance/runbooks (T226–T230) can proceed independently before T231–T237.
- **Final hardening**: T326–T335 are separable audits/implementations; T336–T347 consume the assembled build; T348–T350 are sequential release decisions.

## Implementation Strategy

### Increment 1 — Demonstrable Commerce Core

Complete Phases 1–4. This yields a localized Collector’s Index storefront and duplicate-safe guest bank-transfer checkout using local/fixture dependencies.

### Increment 2 — Operable Inventory-to-Fulfillment Business

Complete Phases 5–9. This adds automated ingestion, catalog/order operations, enforceable Owner/Manager access, audit, controlled releases, and recovery—the minimum P1 business system.

### Increment 3 — Buyer and Worldwide Service Depth

Complete Phases 10–12. Accounts remain optional; returns and international configuration reuse the proven commerce boundaries.

### Increment 4 — Editorial Trust and Production Closure

Complete Phase 13 and Phase 14. Activate only externally approved integrations, legal copy, contact details, delivery rules, and production media; all other capabilities stay explicitly disabled/test/degraded.

## Requirement Traceability Summary

| Requirement area                                                                                     | Primary tasks                                                |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| FR-001–FR-014: public localization, discovery, product media, SEO                                    | T040–T064, T301–T325, T326–T329, T340                        |
| FR-015–FR-025: catalog, inventory, merchandising, imports/exports                                    | T043–T049, T095–T124, T155–T181, T333–T334                   |
| FR-026–FR-038: ingestion, processing, assistance, publication                                        | T095–T124                                                    |
| FR-039–FR-054: cart, pricing, delivery, checkout, bank transfer                                      | T065–T094, T280–T300                                         |
| FR-055–FR-066: payments, orders, notifications, fulfillment                                          | T125–T154                                                    |
| FR-067–FR-073: optional customer accounts, wishlist, privacy                                         | T238–T258                                                    |
| FR-074–FR-085: administration, access, MFA, audit, configuration                                     | T139–T145, T155–T207, T219–T220                              |
| FR-086–FR-089: cancellation, returns, evidence, refund/restock                                       | T259–T279                                                    |
| FR-090–FR-096 and FR-110–FR-111: content, contact, consent, communication                            | T301–T325                                                    |
| FR-097–FR-106: analytics, security, operations, recovery/readiness                                   | T208–T237, T330–T350                                         |
| FR-107–FR-114: cross-journey gallery, media rights, preferences, sessions, private evidence, exports | T043–T064, T095–T124, T155–T207, T238–T279, T301–T345        |
| NFR-001–NFR-012 and SC-001–SC-025: measurable experience/production outcomes                         | Story verification tasks T039–T325 and final gates T326–T350 |

## Acceptance and Independent-Test Map

| Story                                      | Acceptance and edge-case evidence |
| ------------------------------------------ | --------------------------------- |
| US1                                        | T040–T042, T061–T064              |
| US2                                        | T065–T067, T089–T094              |
| US3                                        | T095–T097, T118–T124              |
| US4                                        | T125–T127, T150–T154              |
| US5                                        | T155–T157, T178–T181              |
| US6                                        | T238–T240, T255–T258              |
| US7                                        | T259–T261, T276–T279              |
| US8                                        | T182–T184, T203–T207              |
| US9                                        | T280–T282, T297–T300              |
| US10                                       | T301–T303, T322–T325              |
| US11                                       | T208–T210, T234–T237              |
| Cross-story edge cases and launch evidence | T336–T350                         |

## Notes

- `[P]` means the task edits an independent file/domain and can proceed in parallel when prerequisites are satisfied.
- `[W]` means explicit integration wiring and MUST name both the producer and consumer being connected.
- Database migrations are append-only once shared; correction migrations supersede rather than rewrite applied history.
- External credentials, merchant approval, verified business facts, legal copy, and licensed production media are activation inputs—not reasons to fabricate readiness or skip disabled-state implementation.
- Every checkpoint requires the story’s independent test to pass from documented commands before later phases may rely on it.
