# US10 Content, Contact, and Consent Evidence

Verified: 2026-08-26

## Quality result

| Gate                             | Result                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Clean database contract          | PASS — 50 ordered migrations through `202608250112`; 13 pgTAP files and 602 assertions                                    |
| Seed, generated types, and drift | PASS — safe 5,000-product seed, schema marker 112, matching generated types, and no local drift                           |
| Unit and integration             | PASS — full 50-file/197-test Vitest suite, including content domain/UI and live Supabase content-contact-consent journeys |
| Static quality                   | PASS — Prettier/ESLint with zero warnings and TypeScript with no errors                                                   |
| Production build                 | PASS — Next.js 16.3.2 compiled under Node.js 24 and generated 202 localized/static route variants                         |
| Browser journey                  | PASS — production-build content publishing, private support, newsletter, and consent lifecycle                            |
| Accessibility/responsive matrix  | PASS — five browser/device projects, zero Axe violations, no page-level overflow, and 44 px visible controls              |

## Requirement trace

| Requirement | Repeatable evidence                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-090      | Manager/Owner content routes create and version four-locale homepage, journal, FAQ, service/policy entries, menus, redirects, contact channels, metadata, preview tokens, and schedules. The storefront reads only published projections and keeps a safe localized fallback shell.                                                                                                                            |
| FR-091      | Database transitions enforce draft, scheduled, published, unpublished, archived, and restored states with optimistic versions, revisions, reasons, actor/correlation evidence, private time-limited preview, scheduled catch-up, and unpublish maintenance.                                                                                                                                                    |
| FR-092      | About, Contact, FAQ, Delivery, Returns, Privacy, Cookie, and Terms exist in ka/en/de/ru. Constrained portable blocks reject arbitrary HTML. Legal-dependent fallback pages disclose `draft_unapproved` and use `noindex` until approved content exists.                                                                                                                                                        |
| FR-093      | Newsletter subscribe and withdrawal require a versioned disclosure and explicit action, are duplicate-safe, queue localized confirmations, and retain withdrawal evidence. `abandonedCartMessagingEnabled` is a compile-time `false` constant covered by tests and visible copy.                                                                                                                               |
| FR-094      | Four-locale contact receipt, newsletter confirmation/withdrawal, schedule failure, and staff contact alert templates join the existing order/payment/stock/ingestion/returns notification catalog. Outbox failures remain stored, alertable, and retryable.                                                                                                                                                    |
| FR-095      | Email, phone, and messaging channels are versioned Manager settings. Public projections require enabled, published, and verified state; blank/unverified details never appear as real support facts.                                                                                                                                                                                                           |
| FR-096      | Redirect commands validate same-site paths, active windows, status, optimistic version, and the full redirect graph. Recursive database checks reject loops/conflicts; the proxy reads only active published redirects and preserves locale.                                                                                                                                                                   |
| FR-097      | Essential commerce remains independent. Preferences and analytics each support grant/refuse/withdraw with current disclosure version. The analytics boundary rereads the current cookie for every event and stops future non-essential events immediately after refusal/withdrawal.                                                                                                                            |
| FR-098      | `lib/observability/events.ts` defines privacy-limited search, filter, product-view, wishlist, cart, checkout, purchase, upload, ingestion-failure, and administrative outcomes. Content/contact commands add correlation-safe audit/outbox/alert evidence without personal data in analytics.                                                                                                                  |
| FR-110      | Contact input is bounded and schema-validated, uses hashed subject/message/idempotency proofs, enforces rate limits and duplicate replay, returns one `MSG-*` reference, stores private workflow events, exposes proof-bound visitor status, creates staff/outbox work, alerts failed delivery, and expires data through scheduled retention.                                                                  |
| FR-111      | Visitors can inspect versioned preference copy and independently grant, refuse, or withdraw preferences/analytics. The readable cookie contains only choices, the opaque subject proof is HTTP-only, database records preserve disclosure/locale/source, and essential browsing/checkout is never gated.                                                                                                       |
| SC-012      | Forced RLS and execution grants distinguish anonymous, authenticated visitor, Manager, Owner, and service maintenance. Public views contain published operational fields only; raw contact/newsletter/consent tables are not publicly enumerable. `100_content_contact_consent.test.sql` is part of the clean 602-assertion access-policy suite.                                                               |
| SC-025      | pgTAP, Vitest, Playwright, and the five-project matrix cover the content lifecycle, disclosed locale fallback, menu revisions, redirect loops, duplicate/rate-limited/private contact, outbox recovery, newsletter withdrawal, and consent grant/refuse/withdraw. Every accepted mutation is versioned/recoverable, legal drafts stay explicit, and analytics remains off before consent and after withdrawal. |

## Security and recovery boundaries

- Manager content actions execute with the authenticated actor and an operation-specific audit command; no public browser receives the service credential.
- Contact status uses a browser-held proof rather than a public identifier alone. Staff lists mask contact details; authorized detail views and events remain RLS protected.
- Menu and content publishing use optimistic versions so concurrent edits fail visibly instead of silently overwriting reviewed work.
- Preview tokens store only a SHA-256 hash, expire after a bounded TTL, and do not publish the underlying draft.
- Consent merging preserves anonymous evidence when a visitor later authenticates. Withdrawal is a new durable state, not deletion of the prior grant.
- Scheduled maintenance publishes due content, unpublishes expired entries, activates redirects, cleans contact records, and reports retained consent work through the existing leased operations coordinator.

## Primary implementation and verification surfaces

- `supabase/migrations/202608250110_content_contact_consent.sql` through `202608250112_content_contact_consent_rls.sql`
- `features/content/`, `features/contact/`, `features/newsletter/`, `features/consent/`, and `features/seo/`
- `components/admin/content/`, `components/content/`, and `components/storefront/`
- localized public service/journal/contact routes and `app/[locale]/admin/content/`
- `emails/content/`, `emails/contact/`, notification routing, the proxy, sitemap, and scheduled coordinator
- `supabase/tests/database/100_content_contact_consent.test.sql`
- `tests/unit/content/`, `tests/integration/content/content-contact-consent.test.ts`, `tests/e2e/content-and-consent.spec.ts`, and `tests/accessibility/content-and-consent.spec.ts`

## Production boundary

US10 is complete for the local production-shaped system. This is not a launch claim. Managed Supabase linking, Netlify linking, rotation of every credential disclosed in chat, verified production support details, staging smoke/monitoring evidence, domain activation, and business/legal approval of policy copy remain explicit release blockers.
