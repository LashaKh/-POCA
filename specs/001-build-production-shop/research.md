# Research: ÉPOCA Production Online Shop

**Date**: 2026-08-25  
**Status**: Complete — no unresolved technical clarification remains  
**Authority**: `spec.md`, `docs/product/EPOCA_MASTER_BUILD_GOAL.md`, `DESIGN.md`, and the project constitution

## Decision 1: Application Runtime and Framework

**Decision**: Build one Next.js App Router application in strict TypeScript 6.0 on Node.js 24 LTS, managed with npm and a committed lockfile. TypeScript 7 was rejected during setup because the selected Next.js ESLint parser declares support below 6.1; production installs must not rely on peer-dependency overrides. Pin Next.js 16.3.2, the first stable package line that resolves the registry audit advisories found during setup. Do not deploy externally until the announced 2026-08-26 security advisory confirms the patched line and the exact lockfile remains audit-clean.

**Rationale**: One application keeps storefront, administration, server rendering, route handlers, and shared business modules close without a separate API project. Node 24 is an official LTS line intended for production. Netlify officially supports the App Router, SSR, ISR, Server Components, Server Actions, route handlers, streaming, image optimization, internationalization, and cache revalidation through its maintained OpenNext adapter. The security-release gate avoids claiming readiness on a version with a pending critical patch.

**Alternatives considered**:

- Separate frontend and backend: rejected because Supabase already supplies the backend platform and a second custom service adds deployment and authorization seams without a requirement.
- Next.js experimental/canary features: rejected in favor of the stable security-patched line and stable features.
- A static-only export: rejected because authenticated administration, server-side authorization, checkout, webhooks, preview, and personalized account routes require dynamic execution.

**Evidence**: [Next.js releases](https://nextjs.org/blog), [Next.js cross-platform adapter commitment](https://nextjs.org/blog/nextjs-across-platforms), [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Node.js release status](https://nodejs.org/en/about/previous-releases).

## Decision 2: Repository and Module Shape

**Decision**: Use one deployable application with route groups under `app/`, shared presentation under `components/`, domain modules under `features/`, platform adapters under `lib/`, versioned SQL under `supabase/`, background workers under `netlify/functions/`, and tests grouped by the boundary they verify.

**Rationale**: Feature modules make the important business boundaries visible without introducing packages or services before a real consumer exists. Storefront and admin can share exact pricing, inventory, order, payment, and localization contracts while keeping their page composition distinct.

**Alternatives considered**:

- Monorepo with multiple packages/apps: rejected for the initial release because there is one web deployable and no independently released library.
- Layer-only folders such as one global `services/`: rejected because commerce behavior would become difficult to trace to its owning journey.

## Decision 3: Supabase Data, Auth, and Authorization

**Decision**: Use managed Supabase Postgres, Auth, Storage, Queues, migrations, generated TypeScript types, and Row Level Security (RLS). Use `@supabase/ssr` behind small request-scoped client factories for cookie sessions, while isolating its beta surface in `lib/supabase/`. Store `owner`/`manager` authorization in protected app metadata and a staff profile table; never use editable user metadata. Require `aal2` for production Owner operations and selected sensitive Manager operations.

**Rationale**: RLS puts the final permission decision alongside the records even when interface controls are bypassed. Request-scoped clients prevent cross-user session reuse. Protected app metadata supplies compact role claims, while database membership and active-state checks prevent a stale claim from being the only authority.

**Alternatives considered**:

- Interface-only role checks: rejected as insecure.
- Service-role access for normal requests: rejected because it bypasses RLS; reserve it for narrowly authorized server jobs after independent checks.
- A general ORM: rejected initially because generated Supabase types, explicit SQL migrations, and transaction/RPC functions are simpler for RLS and concurrency-critical behavior.

**Evidence**: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase SSR package selection](https://supabase.com/docs/guides/auth/choosing-a-server-package), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa), [secure data guidance](https://supabase.com/docs/guides/database/secure-data).

## Decision 4: Business Transactions and Concurrency

**Decision**: Put inventory reservation, checkout acceptance, discount redemption, payment/order transitions, returns, refund effects, and audit creation in explicit Postgres functions and constraints. Lock affected inventory rows during reservation/order acceptance; use unique idempotency records for client submission and external events; use append-only event tables plus current-state columns for efficient operations.

**Rationale**: A browser/server sequence cannot guarantee that the last carpet, payment event, stock event, and order record change together. Database transactions are the smallest reliable boundary. Append-only events preserve reconciliation evidence without forcing every list page to replay an event stream.

**Alternatives considered**:

- Application-only transactions across separate requests: rejected because partial failure can oversell or duplicate effects.
- Full event sourcing: rejected because it adds projection and replay complexity beyond the current operational need.

## Decision 5: Search and Catalog Reads

**Decision**: Use Postgres full-text search per translation plus `pg_trgm` similarity for typo recovery, with indexed normalized catalog/filter fields and stable URL query parameters. Serve public reads from RLS-safe published views or functions using invoker security.

**Rationale**: This satisfies the initial catalog without another search service, keeps localized truth in one database, and supports filters, ranking, suggestions, and no-results recovery. Search can move behind the same contract later if measured scale requires a dedicated provider.

**Alternatives considered**:

- Algolia/Meilisearch at launch: rejected because it adds synchronization, credentials, cost, and privacy work before measured need.
- Client-only filtering: rejected because it cannot scale, secure unpublished content, or support crawlable stable results.

## Decision 6: Localization and Currency

**Decision**: Use `next-intl` for explicit `/ka`, `/en`, `/de`, and `/ru` routes, type-checked message namespaces, server-rendered locale data, `hreflang`, and localized metadata. Store content translations as records with workflow status. Keep currency as a separate cookie/account choice and store money as checked integer minor units with ISO currency codes.

**Rationale**: Locale routes are crawlable and shareable. Database translation records let staff see review state and missing content. Separating locale and currency avoids an English visitor being silently charged USD or a German visitor EUR.

**Alternatives considered**:

- One JSON file for product content: rejected because staff publication/review requires database records.
- Floating-point money or live conversion by default: rejected because totals and refunds must be deterministic and live rates are not supplied.

## Decision 7: Product Upload and Media Processing

**Decision**: Use Uppy with the TUS protocol for direct resumable uploads to a private Supabase originals bucket. Persist upload and media-job records before upload. Use a durable Supabase Queue plus bounded Netlify Background Functions using Sharp to validate content, strip unsafe metadata, correct orientation, calculate checksums, and pre-generate approved AVIF/WebP/JPEG renditions and placeholders. Publish only approved renditions from a separate public bucket; keep originals and return/contact evidence private.

**Rationale**: Supabase recommends resumable TUS uploads for large or interruption-prone files. A database-backed queue survives page, request, and worker failure. Netlify background functions run asynchronously for up to 15 minutes and retry failures, while the worker checkpoints per rendition and keeps every job idempotent. Pre-generating fixed variants gives predictable crops/cost and avoids making the paid managed transformation feature a launch dependency.

**Worker contract**:

- The client obtains an authorized upload record and signed upload permission; it never receives a service-role credential.
- A successful upload enqueues only an opaque media-job ID, never a file body.
- A worker leases a bounded queue message, validates authoritative job state, processes within a time budget, records each derivative atomically, and archives the message only after completion.
- Failure increments a capped retry count, records a privacy-safe reason, and leaves the job retryable; a scheduled sweeper re-enqueues stale recoverable jobs.
- Reprocessing uses the original checksum plus variant recipe version as the uniqueness key.

**Alternatives considered**:

- Synchronous processing in the upload request: rejected because large images and batches exceed reliable request duration.
- Supabase Edge Functions for heavy image work: rejected because Supabase advises moving heavy long-running jobs to background workers.
- Only dynamic image transformations: rejected because the managed transformation feature has paid-plan quotas and does not replace protected masters, deterministic crops, review, or job recovery.

**Evidence**: [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Supabase Queues](https://supabase.com/docs/guides/queues), [Supabase Edge Function guidance](https://supabase.com/docs/guides/functions), [Netlify Background Functions](https://docs.netlify.com/build/functions/background-functions/), [Supabase image-transformation usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-image-transformations).

## Decision 8: Assisted Drafting and Translation

**Decision**: Implement an `AssistanceProvider` contract with a disabled/manual implementation and an OpenAI implementation using the Responses API, image inputs, Structured Outputs, `store: false`, and the pinned `gpt-5.4-mini-2026-03-17` snapshot. Send only staff-selected product images and verified catalog inputs; never send customer/order data. Validate every response against the shared schema and save it only as a suggestion requiring human review.

**Rationale**: The selected model accepts image inputs and structured output and is intended for efficient higher-volume work. A snapshot makes evaluation repeatable. Structured schemas keep suggestions easy to compare and validate. The manual provider keeps ingestion fully functional without credentials.

**Alternatives considered**:

- Auto-publishing model output: rejected by the product-truth requirement.
- Storing provider conversation state: rejected because each product draft can be stateless and data minimization is safer.
- A flagship model for every request: rejected until evaluation proves the balanced model misses required quality.

**Evidence**: [OpenAI Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create), [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini).

## Decision 9: Payment Provider

**Decision**: Implement a provider-neutral `PaymentProvider` and choose TBC E-Commerce as the first Georgian online-payment adapter. Build bank transfer as a separate internal method. Keep TBC disabled without sandbox/live credentials and test its contract through deterministic fixtures. Treat the callback as a notification containing a payment ID, then fetch authoritative payment details before state changes.

**Rationale**: TBC currently publishes a documented v1 API, callbacks, GEL/USD/EUR support subject to merchant enablement, cards by default, and optional Apple Pay, Google Pay, QR/BNPL, internet-bank, and installments subject to activation. The callback documentation explicitly instructs the merchant to query payment status. This provides the widest documented initial path without implementing multiple gateways.

**Alternatives considered**:

- Bank of Georgia as initial adapter: its merchant eligibility may be viable, but equivalent current public integration detail was not sufficient to justify it over the documented TBC contract; retain it as a later adapter option after commercial comparison.
- Stripe: rejected for the Georgian entity because Georgia is not currently listed as a supported payment-processing country.
- Multiple live gateways: rejected as duplicated risk without a current resilience need.

**Evidence**: [TBC API overview](https://developers.tbcbank.ge/docs/checkout-api-overview), [TBC payment creation and callback](https://developers.tbcbank.ge/docs/checkout-create-checkout-payment), [TBC payment methods](https://developers.tbcbank.ge/docs/payment-methods), [TBC E-Commerce FAQ](https://developers.tbcbank.ge/docs/e-commerce-faq), [Stripe global availability](https://stripe.com/global).

## Decision 10: Delivery, Tax, and Promotions

**Decision**: Implement configurable database-backed rule engines for delivery zones/methods, flat or table rates, free-delivery thresholds, manual quotes, tax display, explicit market prices, and discount eligibility. Do not integrate a carrier or live exchange-rate provider initially; keep narrow future adapter seams only where an actual call would occur.

**Rationale**: Real carrier/rate agreements and legal tax wording are activation inputs. A deterministic rules engine makes Georgia and worldwide zones operational as soon as verified data arrives and remains testable without fabricated rates.

**Alternatives considered**:

- Live carrier and FX providers at launch: rejected until the business supplies contracts, eligible countries, and rate ownership.
- Hardcoded Georgia/worldwide fees: rejected because they would be unverified commercial promises.

## Decision 11: Transactional Email and Contact

**Decision**: Implement an `EmailProvider` with local capture/no-op and Resend adapters, repository-owned localized templates, idempotency keys, delivery-event reconciliation, and a durable notification outbox. Keep marketing and abandoned-cart messages separately consent-gated and disabled initially.

**Rationale**: A transactional outbox prevents order success from depending on a synchronous email call. Resend documents idempotent sends and at-least-once, potentially out-of-order webhooks, which fits the project’s existing event-deduplication pattern.

**Alternatives considered**:

- Sending email directly inside order transactions: rejected because provider failure would lengthen or corrupt checkout.
- Provider-hosted-only templates: rejected because versioned four-language content and preview must remain in the repository/admin workflow.

**Evidence**: [Resend introduction](https://resend.com/docs/introduction), [Resend webhooks](https://resend.com/docs/webhooks/introduction), [Resend idempotency](https://resend.com/blog/engineering-idempotency-keys), [transactional vs marketing email](https://resend.com/docs/knowledge-base/what-sending-feature-to-use).

## Decision 12: Analytics and Observability

**Decision**: Keep `AnalyticsProvider` and `ErrorReporter` contracts. Implement PostHog for explicitly consented named product events with autocapture and session replay off by default; implement Sentry for errors/performance with `sendDefaultPii: false`, server/client scrubbing, configurable sampling, release tags, and source maps. Both remain disabled without reviewed configuration. Always keep privacy-safe structured application logs and correlation IDs independent of these providers.

**Rationale**: External analytics and monitoring must be replaceable and activation-controlled. Named events are easier to audit than automatic capture. Sentry supplies operational diagnosis while application logs preserve a provider-independent baseline.

**Alternatives considered**:

- Provider calls scattered through pages: rejected because consent, testing, and replacement would be inconsistent.
- Session replay at launch: rejected until a privacy review and explicit masking configuration are approved.
- Logging full payloads: rejected because orders, payments, addresses, tokens, and AI inputs may contain sensitive values.

## Decision 13: Testing and Quality Gates

**Decision**: Use Vitest and Testing Library for TypeScript units/components; Supabase CLI and pgTAP plus client integration tests for constraints, functions, concurrency, grants, RLS, and Storage; MSW/fixtures for provider contracts; Playwright across Chromium/Firefox/WebKit for end-to-end, visual, keyboard, reduced-motion, and locale checks; `@axe-core/playwright` for accessibility automation; k6 for bounded load/reliability scripts. Run formatting, ESLint, TypeScript, unit, database, integration, critical Playwright smoke, build, and dependency/security checks in CI.

**Rationale**: Each tool verifies the boundary where a failure matters. Database policy tests are essential because browser tests alone cannot prove denied direct access. Cross-browser Playwright and axe support the required responsive and accessibility gates while retaining manual checks for issues automation cannot find.

**Alternatives considered**:

- Only end-to-end tests: rejected because failures would be slow and business-rule edge cases hard to isolate.
- Only unit tests: rejected because RLS, provider contracts, rendering, and buying journeys require integration evidence.

**Evidence**: [Supabase database testing](https://supabase.com/docs/guides/database/testing), [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing), [Playwright browsers](https://playwright.dev/docs/browsers).

## Decision 14: Environments, Deployment, and Recovery

**Decision**: Commit Supabase migrations/configuration/safe seeds and Netlify configuration. Use local Supabase for development, separate remote staging and production projects, Netlify deploy previews, and GitHub Actions. Require reviewed migration dry runs, backup/restore evidence, smoke tests, security audit, and a rollback decision before production promotion. Recommend Supabase Pro for staging/production and a reviewed backup/PITR choice before launch.

**Rationale**: Versioned migrations and reproducible seed data eliminate undocumented dashboard schema drift. Separate data environments prevent preview deployments from touching production. Paid-plan and point-in-time recovery costs are business activation decisions, but production gates can state exactly what capability is required.

**Alternatives considered**:

- One Supabase project for every environment: rejected because test data and migrations could affect buyers.
- Dashboard-only schema changes: rejected because they cannot be reviewed, replayed, or rolled back reliably.

**Evidence**: [Supabase local workflow](https://supabase.com/docs/guides/local-development/cli-workflows), [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments), [Supabase pricing and plan capabilities](https://supabase.com/pricing).

## Resolved Version Baseline

The lockfile, compatibility checks, and security audit are authoritative. Initial planning baseline observed on 2026-08-25:

| Area                  | Baseline                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Runtime               | Node.js 24 LTS                                                                                        |
| Framework             | Next.js 16.3.2 stable; re-check the 2026-08-26 advisory and lockfile audit before external deployment |
| UI                    | React 19.2.x                                                                                          |
| Language              | TypeScript 6.0.x, strict mode; avoids unsupported parser peer overrides                               |
| Backend SDK           | `@supabase/supabase-js` 2.112.x, `@supabase/ssr` 0.12.x, Supabase CLI 2.115.x                         |
| Validation            | Zod 4.4.x                                                                                             |
| Upload                | Uppy 5.2.x with TUS 5.1.x / `tus-js-client` 4.3.x                                                     |
| Media worker          | Sharp 0.35.x                                                                                          |
| Localization          | `next-intl` 4.13.x                                                                                    |
| Unit/integration      | Vitest 4.1.x, Testing Library, MSW 2.15.x                                                             |
| Browser/accessibility | Playwright 1.62.x, `@axe-core/playwright` 4.13.x                                                      |
| Provider SDKs         | Resend 6.22.x, OpenAI 7.5.x; TBC through a repository-owned HTTP adapter                              |
| Optional telemetry    | Sentry Next.js 10.71.x, PostHog JS 1.418.x                                                            |

Exact compatible versions MUST be pinned by `package-lock.json`; do not use these ranges as permission for unreviewed production upgrades.

## External Activation Decisions Still Required

These do not block implementation but do block the named readiness gate:

- Supabase project references, region, Pro/PITR decision, keys, and backup policy.
- Netlify team/site, region, environment variables, and deploy permissions.
- TBC commercial approval, enabled currencies/methods, sandbox/live credentials, callback registration, refund capability, fees, and operational contacts.
- Bank-transfer account/instructions and deadline.
- Verified delivery zones/rates/estimates, customs wording, and carrier/tracking process.
- Legal entity, tax/invoice settings, reviewed policies, and contacts.
- Resend sender/domain, support mailbox, and deliverability records.
- OpenAI project/key and approval to send selected product imagery for drafting.
- PostHog region/project/consent review, Sentry project/retention/scrubbing, and alert recipients.
- Domain/DNS, production catalog facts, and owned/licensed imagery.
