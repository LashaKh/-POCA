# US9 Worldwide Selling Evidence

Verified: 2026-08-26

## Quality result

| Gate                             | Result                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Clean database contract          | PASS — 47 ordered migrations through `202608250103`; 12 pgTAP files and 551 assertions                                     |
| Seed, generated types, and drift | PASS — safe 5,000-product seed, schema marker 103, matching generated types, and no local drift                            |
| Unit and integration             | PASS — full 47-file/183-test Vitest suite, including exact-price/property, component, and live Supabase worldwide journeys |
| Static quality                   | PASS — Prettier check, ESLint with zero warnings, and TypeScript with no errors                                            |
| Production build                 | PASS — Next.js 16.3.2 generated 154 pages/routes under Node.js 24.19.0                                                     |
| Browser journey                  | PASS — final production-build buyer-to-Manager worldwide journey                                                           |
| Accessibility/responsive matrix  | PASS — five browser/device projects, zero Axe violations, no page-level overflow, and 44 px controls                       |

## Requirement trace

| Requirement | Repeatable evidence                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-043      | GEL is the explicit default/accounting currency. GEL, USD, and EUR are independently enabled and use stored minor-unit prices. Missing prices return no result; neither locale nor a guessed exchange rate creates a price. Currency status and optional approved-rate reference are versioned.                                                                                                                                                        |
| FR-045      | Manager/Owner command boundaries configure currencies, explicit product/market prices, promotions, delivery zones/countries/methods/rates/thresholds/estimates, market tax display, customs responsibility, legal status, and manual-quote rules. Configuration revisions use optimistic versions and immutable audit records.                                                                                                                         |
| FR-046      | Promotion dates, enablement, minimum subtotal, usage limits, per-subject limits, maximum discount, priority, and combination group are checked at the database calculation boundary. The checkout quote applies an exact minor-unit cap and rejects invalid/stale configuration.                                                                                                                                                                       |
| FR-047      | Delivery resolution evaluates published zone priority, country, method status, delivery class, currency, subtotal thresholds, rate priority, service estimate, and customs metadata. Only eligible methods are returned; the authoritative checkout quote records the exact charge and disclosure.                                                                                                                                                     |
| FR-048      | Unsupported countries, manual-only methods, missing explicit prices, and unavailable delivery outcomes do not produce a false checkout promise. Cart/checkout redirects preserve recoverable context for a localized quote request with stable reference and private status.                                                                                                                                                                           |
| FR-109      | Locale and currency are separate persisted preferences. The browser journey changes EUR independently, switches English to German and back, and retains EUR. Order/quote snapshots preserve accepted locale, currency, line prices, and delivery facts; later preference changes cannot rewrite them.                                                                                                                                                  |
| SC-023      | The manual-quote contact route validates bounded input, applies an eight-per-hour guest limiter, returns one stable `QUO-*` reference, and replays the same request for the same idempotency key. Notification delivery is an outbox concern after acceptance; staff recovery reads the stored queue. Direct public enumeration, wrong guest proof, and cross-customer access are denied. The broader general-contact matrix remains assigned to US10. |

## Security and transactional boundaries

- Forced RLS protects currency/market configuration, quote requests, quote events, and revisions. Published storefront views expose only operational fields; quote contact/address data is never publicly enumerable.
- Public quote submission reaches the `service_role` function only after schema validation, a valid guest cart, a bounded rate limit, and hashed guest/idempotency proofs. Service credentials never enter client code.
- Manager commands still execute with the authenticated actor, role checks, optimistic version, reason, correlation ID, and immutable revision/event evidence.
- Quote reads return the same existence-safe denial for an unknown reference and an invalid proof. Staff queue projections mask email until an authorized detail view is opened.
- Currency conversion is never implicit. An approved snapshot requires an explicit reference, and no missing price is replaced with a guessed value.
- Legal copy has a separate `draft_unapproved`/`approved` state. Delivery configuration cannot silently present draft tax or customs wording as legal approval.
- Scheduled maintenance expires stale quotes and scheduled commerce configuration through the existing leased coordinator, preserving catch-up and audit behavior.

## Primary implementation and verification surfaces

- `supabase/migrations/202608250100_worldwide_selling.sql` through `202608250103_worldwide_selling_view_grants.sql`
- `features/pricing/`, `features/promotions/`, `features/delivery/`, `features/quotes/`, and `features/preferences/currency.ts`
- `components/admin/commerce/`, `components/admin/quotes/`, and `components/quotes/`
- `app/[locale]/admin/settings/currencies`, `delivery`, `markets`, `admin/promotions`, `admin/quotes`, and public `quote`
- `emails/quotes/` and the scheduled coordinator
- `supabase/tests/database/090_worldwide_selling.test.sql`
- `tests/unit/commerce/worldwide/`, `tests/unit/admin/worldwide-selling.test.tsx`, `tests/integration/commerce/worldwide-selling.test.ts`, `tests/e2e/worldwide-selling.spec.ts`, and `tests/accessibility/worldwide-selling.spec.ts`

## Production boundary

US9 is complete for the local production-shaped system. This is not a launch claim. Managed Supabase linking, Netlify site linking, rotation of credentials disclosed in chat, real provider configuration, staging smoke/monitoring evidence, domain activation, and approved legal copy remain explicit release blockers.
