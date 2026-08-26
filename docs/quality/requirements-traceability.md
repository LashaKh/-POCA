# ÉPOCA requirements traceability

**Scope:** `specs/001-build-production-shop/spec.md`  
**Implementation plan:** `specs/001-build-production-shop/plan.md`  
**Task ledger:** `specs/001-build-production-shop/tasks.md`  
**Generated for final gate:** 2026-08-26

This register connects every approved requirement and scenario to its primary
implementation boundary, executable tests, and durable evidence. A path ending
in `*` means the complete directory is in scope. External activation does not
change implementation coverage: an unapproved capability must remain tested as
disabled/test/degraded and is listed in the activation register.

## Functional requirements FR-001–FR-114

| Requirement IDs | Implemented boundaries                                                                                                                                                 | Repeatable tests                                                                                                                                       | Durable evidence                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| FR-001–FR-014   | `i18n/*`, `messages/*`, `app/[locale]/(store)/*`, `components/storefront/*`, `features/catalog/*`, `features/media/*`, `app/sitemap.ts`, `app/robots.ts`               | `tests/e2e/storefront-discovery.spec.ts`, `tests/integration/seo/catalog-metadata.test.ts`, `tests/seo/final-output.spec.ts`, final visual/WCAG suites | `us1-*`, `localization-inventory.md`, `media-delivery-audit.md`, `final-visual-review.md`, `seo-evidence.md`    |
| FR-015–FR-025   | `features/catalog/*`, `features/collections/*`, inventory boundaries in catalog/checkout, `components/admin/catalog/*`, catalog/inventory migrations and RLS           | catalog unit/integration/E2E suites, `tests/integration/checkout/concurrency.test.ts`, catalog pgTAP files                                             | `us5-*`, `production-hardening-evidence.md`, `resilience-evidence.md`                                           |
| FR-026–FR-038   | `features/ingestion/*`, `features/media/*`, `components/admin/ingestion/*`, private storage and ingestion migrations                                                   | ingestion unit/integration/E2E/accessibility/load suites, ingestion pgTAP files                                                                        | `us3-*`, `media-delivery-audit.md`, `resilience-evidence.md`                                                    |
| FR-039–FR-054   | `features/cart/*`, `features/checkout/*`, `features/pricing/*`, `features/delivery/*`, `features/payments/bank-transfer.ts`, commerce migrations                       | checkout unit/integration/E2E/visual/accessibility/load suites, worldwide-selling suites, commerce pgTAP files                                         | `us2-*`, `us9-*`, `resilience-evidence.md`                                                                      |
| FR-055–FR-066   | `features/payments/*`, `features/orders/*`, `features/operations/notification-worker.ts`, `lib/providers/payment/*`, `lib/providers/email/*`, order/payment migrations | payment/email contracts, order integration/E2E/accessibility suites, checkout recovery, payment/order pgTAP files                                      | `us4-*`, `resilience-evidence.md`, `external-activation-register.md`                                            |
| FR-067–FR-073   | `features/wishlist/*`, `features/customer/*`, `features/auth/*`, account routes, customer/auth migrations                                                              | customer unit/integration/E2E/accessibility suites, authorization tests, account pgTAP files                                                           | `us6-*`, `us8-security-evidence.md`, `threat-model.md`                                                          |
| FR-074–FR-085   | `app/[locale]/admin/*`, `components/admin/*`, `features/auth/*`, `features/audit/*`, `features/operations/*`, staff/audit migrations                                   | admin-access unit/integration/E2E/accessibility suites, operations tests, role/MFA pgTAP files                                                         | `us8-*`, `us11-production-operations-evidence.md`, Owner/Manager manuals                                        |
| FR-086–FR-089   | `features/returns/*`, `features/payments/return-service.ts`, return routes/components, return migrations and private evidence bucket                                   | return unit/integration/E2E/accessibility suites and return pgTAP files                                                                                | `us7-*`, `resilience-evidence.md`, `media-delivery-audit.md`                                                    |
| FR-090–FR-096   | `features/content/*`, service/journal routes, content administration, notification/provider boundaries                                                                 | content unit/integration/E2E/accessibility suites and content pgTAP files                                                                              | `us10-*`, `seo-evidence.md`, Manager manual                                                                     |
| FR-097–FR-106   | `lib/providers/analytics/*`, `lib/observability/*`, `features/operations/*`, `scripts/release/*`, security/readiness/restore scripts, runbooks                         | operations/security/provider unit and integration suites, smoke/load/security scripts, database restore rehearsal                                      | `us11-*`, `release-gate-evidence.md`, `restore-rehearsal.md`, `threat-model.md`, activation/readiness registers |
| FR-107–FR-114   | gallery/media rights, preference, contact/consent/session/private-evidence/reporting/export boundaries across `features/*` and related migrations                      | storefront, media, content, customer, authorization, returns, reporting, export, resilience, security and pgTAP suites                                 | `media-delivery-audit.md`, `us6-*`–`us10-*`, `production-hardening-evidence.md`, `final-verification.md`        |

The ranges above are continuous and collectively cover exactly FR-001 through
FR-114 without gaps or overlap omissions.

**Machine-auditable FR ledger:** FR-001, FR-002, FR-003, FR-004, FR-005,
FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014,
FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023,
FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032,
FR-033, FR-034, FR-035, FR-036, FR-037, FR-038, FR-039, FR-040, FR-041,
FR-042, FR-043, FR-044, FR-045, FR-046, FR-047, FR-048, FR-049, FR-050,
FR-051, FR-052, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059,
FR-060, FR-061, FR-062, FR-063, FR-064, FR-065, FR-066, FR-067, FR-068,
FR-069, FR-070, FR-071, FR-072, FR-073, FR-074, FR-075, FR-076, FR-077,
FR-078, FR-079, FR-080, FR-081, FR-082, FR-083, FR-084, FR-085, FR-086,
FR-087, FR-088, FR-089, FR-090, FR-091, FR-092, FR-093, FR-094, FR-095,
FR-096, FR-097, FR-098, FR-099, FR-100, FR-101, FR-102, FR-103, FR-104,
FR-105, FR-106, FR-107, FR-108, FR-109, FR-110, FR-111, FR-112, FR-113,
FR-114.

## Non-functional requirements NFR-001–NFR-012

| ID      | Verification                                                                          | Evidence                                                  |
| ------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| NFR-001 | Axe, keyboard/focus, names/status, target size, 320px reflow and reduced-motion tests | `final-accessibility-audit.md`                            |
| NFR-002 | Four locales × 390/768/1440 × two-pass critical-route matrix                          | `final-visual-review.md`                                  |
| NFR-003 | noscript/system-state tests and explicit command/provider failure contracts           | system-state suites, `resilience-evidence.md`             |
| NFR-004 | public performance/load budgets for usability, layout shift and interaction           | `performance-budget.md`, `us1-performance-evidence.md`    |
| NFR-005 | catalog/checkout/ingestion load and 5,000-record administration proof                 | load suites, `production-hardening-evidence.md`           |
| NFR-006 | checkout/payment/order/refund concurrency and replay matrix                           | `resilience-evidence.md`                                  |
| NFR-007 | RLS/access-policy tests, redaction, private media, dependency/security audits         | `threat-model.md`, security evidence                      |
| NFR-008 | Collector’s Index route screenshots and design-token/UI tests                         | `final-visual-review.md`, `DESIGN.md`                     |
| NFR-009 | deterministic responsive rendition recipe and delivery audit                          | `media-delivery-audit.md`, ingestion tests                |
| NFR-010 | health/correlation/reconciliation tests and executable rollback/restore runbooks      | `restore-rehearsal.md`, manuals, `resilience-evidence.md` |
| NFR-011 | unit → pgTAP → integration → E2E → smoke → build gate                                 | `final-verification.md`                                   |
| NFR-012 | publication readiness, suggestion guardrails, source/license state and cleanup scan   | ingestion/content tests, `final-cleanup.md`               |

## Success criteria SC-001–SC-025

| IDs           | Measured outcome and primary evidence                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| SC-001–SC-002 | Storefront discovery and complete guest-transfer journeys: US1/US2 E2E, performance and manual operator evidence          |
| SC-003        | Exactly-once commercial/inventory effects: checkout concurrency, recovery, pgTAP and resilience evidence                  |
| SC-004–SC-006 | Timed, recoverable ingestion; no duplicate media; all publication blockers: US3 integration/E2E/load evidence             |
| SC-007–SC-008 | Four-language responsive and WCAG outcome: final visual and accessibility audits                                          |
| SC-009–SC-010 | p75 public budgets and normal-load response: performance/load evidence                                                    |
| SC-011–SC-012 | Actor/role/session and every protected data/media class: auth integration plus all RLS pgTAP suites                       |
| SC-013–SC-014 | Payment/order/transfer/fulfillment/return/refund consistency: provider, order, return and resilience suites               |
| SC-015        | Staff action records reachable through dashboard/admin navigation: admin E2E and final visual matrix                      |
| SC-016        | Promotion stops on any failed gate: release scripts, CI workflow and release-gate evidence                                |
| SC-017        | Restored catalog/order/stock/role/audit relationships: restore rehearsal evidence                                         |
| SC-018        | Privacy-safe reference to documented recovery action: threat model, incident/rollback runbook and manuals                 |
| SC-019        | No secrets/raw-card paths/unapproved live providers/facts/pre-consent tracking: security scan, cleanup and consent suites |
| SC-020        | Full requirement/scenario mapping and zero critical disconnected work: this register and final verification               |
| SC-021        | Honest four-stage readiness language and unresolved inputs: production readiness report and activation register           |
| SC-022        | Consent grant/refuse/withdraw/block cases do not block commerce: content/consent unit, integration and E2E suites         |
| SC-023        | Contact validation/rate/duplicate/provider-failure recovery: content/contact tests and pgTAP suites                       |
| SC-024        | No unsafe/unapproved/private/expired media public: media delivery audit, ingestion and private-evidence tests             |
| SC-025        | Versioned content/fallback/redirect/contact/consent lifecycle: content integration/E2E/pgTAP plus SEO evidence            |

The grouped rows explicitly include every ID from SC-001 through SC-025.

**Machine-auditable SC ledger:** SC-001, SC-002, SC-003, SC-004, SC-005,
SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-012, SC-013, SC-014,
SC-015, SC-016, SC-017, SC-018, SC-019, SC-020, SC-021, SC-022, SC-023,
SC-024, SC-025.

## Acceptance scenarios

| Scenario IDs | Coverage                                                                                                          | Executable journey and evidence                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| US1-AS1–AS7  | All seven discovery, truth, fallback, gallery and accessible-use scenarios                                        | `tests/e2e/storefront-discovery.spec.ts`, storefront visual/accessibility suites, US1 evidence |
| US2-AS1–AS7  | All seven cart, reconciliation, totals, bank transfer, disabled-payment, replay and recovery scenarios            | guest checkout/concurrency/recovery E2E+integration, US2/resilience evidence                   |
| US3-AS1–AS7  | All seven mixed upload, interruption, processing, assistance/manual fallback, readiness and publication scenarios | ingestion unit/integration/recovery/E2E/load suites, US3 evidence                              |
| US4-AS1–AS5  | All five dashboard, transfer, fulfillment, event and reconciliation scenarios                                     | order-operations integration/E2E/accessibility, US4 evidence                                   |
| US5-AS1–AS5  | All five save/conflict/bulk-import/translation/archive scenarios                                                  | catalog admin unit/integration/E2E, US5 evidence                                               |
| US6-AS1–AS6  | All six wishlist/address/ownership/recovery/session/privacy scenarios                                             | customer account unit/integration/E2E/accessibility, US6 evidence                              |
| US7-AS1–AS4  | All four eligibility/decision/refund/restock scenarios                                                            | return unit/integration/E2E/accessibility, US7 evidence                                        |
| US8-AS1–AS4  | All four Manager denial/MFA/audit/irreversible-action scenarios                                                   | admin access/authorization unit/integration/E2E, US8 evidence                                  |
| US9-AS1–AS4  | All four supported/unsupported delivery, discount and currency scenarios                                          | worldwide-selling unit/integration/E2E/accessibility, US9 evidence                             |
| US10-AS1–AS6 | All six content lifecycle/fallback/redirect/contact/consent scenarios                                             | content/contact/consent unit/integration/E2E/accessibility, US10 and SEO evidence              |
| US11-AS1–AS4 | All four dependency, correlation, promotion/rollback and restore scenarios                                        | operations integration/smoke, release scripts and restore rehearsal                            |

## Edge cases EC-01–EC-35

| IDs         | Spec edge cases                                                                                               | Executable evidence                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| EC-01–EC-04 | Last-item race; redirect expiry; stale checkout; duplicate/back/lost/out-of-order submit                      | checkout concurrency/recovery integration+E2E and resilience matrix         |
| EC-05–EC-08 | Missing/duplicate/forged payment; mismatched transfer; lost refund response; damaged/ineligible return        | payment contracts, order/return integration+E2E, resilience matrix          |
| EC-09–EC-13 | Unpublished relation; malicious upload; interrupted processing; unsafe assistance; incomplete publication     | catalog/ingestion/media unit+integration+E2E and media audit                |
| EC-14–EC-15 | Concurrent staff edits; malformed/partial/duplicate imports and long locale values                            | catalog admin integration+E2E and pgTAP conflict/import suites              |
| EC-16–EC-19 | Locale expansion; international address; locale/currency switch; mixed-script/no-result/private search        | localization, storefront, checkout and final visual/WCAG suites             |
| EC-20–EC-24 | Wishlist merge conflict; cross-customer read; Manager Owner-bypass; Owner recovery; mid-change session expiry | customer/admin authorization integration+E2E, threat model and Owner manual |
| EC-25–EC-28 | Delivery gaps/overlap; discount race; public slow/offline/missing media; message reject/delay/duplicate       | worldwide, checkout, system-state, email contract and operations suites     |
| EC-29–EC-31 | Tracking blocked/withdrawn; absent credential; failed rendition with private original                         | consent tests, external degradation tests, media recovery/delivery audit    |
| EC-32–EC-35 | Missing/expired media license; hostile/duplicate contact; divergent consent; in-flight session revocation     | media-rights/content/customer/auth tests, threat model, activation register |

The edge rows are ordered exactly as the 35 bullets in the specification and
cover EC-01 through EC-35 continuously.

**Machine-auditable edge ledger:** EC-01, EC-02, EC-03, EC-04, EC-05,
EC-06, EC-07, EC-08, EC-09, EC-10, EC-11, EC-12, EC-13, EC-14, EC-15,
EC-16, EC-17, EC-18, EC-19, EC-20, EC-21, EC-22, EC-23, EC-24, EC-25,
EC-26, EC-27, EC-28, EC-29, EC-30, EC-31, EC-32, EC-33, EC-34, EC-35.

## Gate interpretation

- **Build-complete** requires all implementation and local evidence above.
- **Payment-ready** additionally requires approved TBC production configuration.
- **Staging-operational** additionally requires managed Supabase, Netlify and
  post-deploy smoke/reconciliation evidence.
- **Launch-ready** additionally requires every legal, business, delivery,
  contact, licensed-media and production credential item in
  `docs/operations/external-activation-register.md` to be approved and rechecked.

No unresolved external input may be relabeled as an implemented or tested live
capability.
