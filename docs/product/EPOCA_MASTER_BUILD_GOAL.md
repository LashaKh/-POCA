# ÉPOCA Production Shop — Master Build Goal

**Status:** Approved input for specification generation  
**Decision date:** 2026-08-25  
**Visual direction:** Collector’s Index  
**Business registration:** Georgia  
**Target repository:** [github.com/LashaKh/-POCA](https://github.com/LashaKh/-POCA) — verified public and empty on 2026-08-25

> **Later operating-strategy decision (2026-08-25):** ÉPOCA is now intended to use a German seller for German/EU-held inventory and a Georgian seller for Georgian-held inventory under one brand. That decision changes this brief's single-Georgian-merchant, worldwide-from-Georgia, payment, and non-marketplace assumptions. Treat this file and the generated `001` feature artifacts as the current build record, but reconcile seller, checkout, payment, invoice, refund, tax, policy, and delivery requirements through specification clarification before implementing those areas. See `docs/business/OPERATING_AND_GO_TO_MARKET_STRATEGY.md`.

## How Claude must use this document

Treat this file as the authoritative product brief across the complete delivery. Do not turn it into one enormous implementation step. Execute the repository workflow in order:

```text
specify → upgradeSpec → clarify → plan → upgradePlan → tasks → upgradeTasks → analyze → implement → verify → stage → production-readiness audit
```

Keep product behavior in `spec.md`, architecture in `plan.md`, and exact dependency-ordered work in `tasks.md`. Preserve all requirements below, but do not leak framework details into customer-facing requirements. Resolve implementation choices during research and planning. Continue autonomously through non-destructive work; stop only for a decision or credential that cannot safely be inferred.

## Master objective

Design, build, test, document, and prepare for deployment a complete production-grade online carpet shop for ÉPOCA. It must let the business upload and maintain products with minimal manual effort, present them through the selected Collector’s Index storefront, sell to buyers in Georgia and worldwide, and operate catalog, inventory, customers, orders, delivery, returns, content, and reporting through a clear administration system.

The result must be a real operational system, not a prototype, disconnected UI, static demo, or collection of unfinished components.

## Meaning of “production-ready”

Production-ready means every in-scope system area is implemented, wired to a real consumer, migrated, secured, tested, observable, documented, and deployable with production configuration.

The only permitted activation exception is the live online-payment provider if merchant approval or credentials are not yet available. In that case:

- Bank-transfer ordering must work end to end if bank details have been supplied.
- Card and wallet flows must be fully implemented behind a payment-provider adapter, exercised with sandbox or contract fixtures, and disabled by a visible configuration flag in production.
- Webhook verification, idempotency, payment state transitions, retries, reconciliation, refunds, and failure recovery must be implemented and tested.
- The administration system must clearly distinguish pending, paid, failed, expired, refunded, partially refunded, and bank-transfer-review states.
- The shop must never claim that card payments are available while the provider is disabled.

Call the system **build-complete and payment-ready** when all of the above is true. Call it **launch-ready** only after live payment credentials, real business policies, tax settings, shipping prices, email sender, domain, and production smoke tests are verified.

## Fixed product decisions

### Market and languages

- Georgia is the initial home market; worldwide ordering and delivery must be supported.
- Supported storefront languages: Georgian (`ka`), English (`en`), German (`de`), and Russian (`ru`).
- Georgian is the initial default language, with a persistent language selector and explicit locale routes.
- Navigation, interface copy, email templates, policy pages, SEO metadata, structured data, and product content must support all four languages.
- Missing translations must be visible in administration. The public site must follow an explicit fallback policy and must never silently mix languages in critical checkout content.

### Currency, tax, and international sales

- GEL is the accounting and default storefront currency.
- Architecture must support merchant-enabled GEL, EUR, and USD checkout without equating a language with a currency.
- The charged currency and amount must be explicit before payment; money must use integer minor units and deterministic rounding.
- Taxes, duties, customs responsibility, delivery charges, and tax-inclusive or tax-exclusive display must be configurable and legally reviewed before launch.
- Do not fabricate live exchange rates. Multi-currency pricing must use verified provider rates or explicit market prices chosen during planning.

### Inventory

- Support unique carpets with quantity `1` and stocked products with larger quantities.
- Reserve or revalidate stock during checkout so the last unit cannot be sold twice.
- Prevent overselling under concurrent orders, expired sessions, payment retries, duplicate callbacks, or stale browser data.
- Maintain auditable inventory adjustments, low-stock thresholds, reservations, releases, sales, returns, and manual corrections.

### Accounts

- Guest checkout is required.
- Optional customer accounts provide order history, saved addresses, wishlist, and saved carpets.
- Account creation must never be required to complete a purchase.

## Users and permissions

### Buyer

An anonymous or signed-in buyer can discover products, evaluate verified details, save products, manage a cart, check out, pay through an enabled method, receive confirmation, and track or request support for an order.

### Owner

The Owner has complete system authority, including staff access, business configuration, integrations, credentials metadata, destructive operations, exports, audit review, and every Manager capability. Require strong authentication and MFA (multi-factor authentication) before production access.

### Manager

The Manager combines catalog, inventory, order, customer-support, merchandising, content, translation, promotion, return, refund, and reporting responsibilities. The Manager must not remove or impersonate the Owner, reveal secrets, alter ownership, bypass audit logging, or perform irreversible system-level destruction reserved for the Owner.

Enforce authorization on the server and in Supabase Row Level Security, not only by hiding interface controls.

## Customer storefront scope

Build a complete Collector’s Index storefront with:

- Global promotional/utility area, responsive navigation, language and currency controls, search, account, wishlist, and cart access.
- Editorial homepage with configurable hero, featured collections, product edit, journal stories, and policy/service entry points.
- Collection pages with meaningful descriptions, filters, sorting, pagination or tested progressive loading, stable URLs, and empty/error states.
- Search across product name, SKU, description, material, origin, colors, styles, tags, and collections, with suggestions, no-results recovery, and typo-tolerant behavior if justified by the plan.
- Filters for price, dimensions/size, shape, color, material, style, origin, condition, availability, age, and handmade status when those attributes are populated.
- Product pages with verified imagery, zoom/gallery, dimensions, material, construction, origin, condition, colors, style, pile, age when known, care, price, availability, delivery estimate or quote status, returns summary, related products, and structured product data.
- Wishlist for anonymous and signed-in buyers, with safe merging on sign-in.
- Persistent cart with quantity boundaries, removal, price/stock reconciliation, delivery estimate, discount handling, subtotal, tax, duties notice, delivery charge, and final total.
- Guest and account checkout with contact, address, delivery method, payment method, consent, final review, duplicate-submission protection, and recoverable failures.
- Order confirmation, buyer emails, account order history, order detail, shipment tracking, cancellation request, return request, and refund status.
- About, contact, FAQ, delivery, returns, privacy, cookie, and terms pages managed through administration.
- Journal/editorial content that uses the same design system and supports all four languages.
- Useful loading, empty, validation, error, offline/slow-network, unavailable, out-of-stock, and success states.

Do not publish fake reviews, press logos, awards, discounts, scarcity, provenance, artisan stories, or sustainability claims. Verified-purchase reviews are not required for the initial launch.

## Administration application

Create a secure, responsive administration area optimized for a small team. It must be fast to learn, practical under daily use, and safe against accidental loss.

### Dashboard

- Today’s orders, revenue summary, payments needing attention, bank transfers awaiting review, low stock, failed ingestion jobs, return requests, unpublished translations, and operational alerts.
- Links from every metric to the exact records needing action.

### Catalog and merchandising

- Create, edit, duplicate, preview, publish, unpublish, archive, and restore products.
- Manage collections, categories, tags, filters, related products, featured placements, homepage ordering, and scheduled publication.
- Bulk update price, stock, status, collection, tags, and translation readiness.
- CSV import/export with validation preview, row-level errors, idempotent re-import, and downloadable error report.
- Draft autosave, unsaved-change warnings, optimistic concurrency protection, and change history.

### Orders and customers

- Search and filter orders; inspect buyer, line items, totals, payment, delivery, timeline, notes, and audit events.
- Transition orders only through valid server-enforced states.
- Add internal notes, resend notifications, record tracking, cancel where allowed, review bank transfers, handle return requests, and issue full or partial refunds through enabled providers.
- Search customer records and order history while minimizing exposed personal data.

### Content, translations, and settings

- Manage homepage sections, journal entries, menus, footer, FAQs, policy pages, SEO fields, redirects, and publication schedules.
- Side-by-side translation status for Georgian, English, German, and Russian with draft, machine-assisted, reviewed, and published states.
- Manage shipping zones and methods, tax/display settings, currencies, discounts, email templates, business contact details, and integration status.
- Owner-only staff, role, secret-status, export, retention, and destructive settings.

### Auditability and recovery

- Record actor, timestamp, action, entity, before/after summary, request or correlation ID, and source for sensitive changes without storing secrets or unnecessary personal data.
- Support reversible archive/restore wherever possible and require confirmation for irreversible operations.

## Automated product ingestion and media workflow

This is a primary product capability, not optional polish. The goal is to turn a standardized photo batch and a small amount of verified product data into a publication-ready product with as little repetitive work as safely possible.

### Upload experience

- Support drag-and-drop and file selection for batches of common product images. Define documented accepted formats, size limits, naming conventions, and an accessible manual fallback.
- Use resumable uploads, progress per file and batch, cancellation, retry, duplicate detection, and recovery after page refresh or network failure.
- Allow uploading into an existing product or creating a new draft from the batch.
- Allow optional SKU/folder/file naming to group and order images automatically without making naming a hard requirement.

### Automatic media processing

- Validate real file type, dimensions, size, and corruption; reject unsafe or unsupported content with a useful explanation.
- Correct orientation, strip unnecessary EXIF/location metadata, preserve an untouched protected master, and generate optimized responsive variants, thumbnails, placeholders, and modern browser formats.
- Suggest focal points and crops for Collector’s Index card, product gallery, search, social/OG, and editorial placements; allow fast human adjustment.
- Generate deterministic filenames, checksums, ordering, storage paths, and media records. Re-running a job must not create duplicates.
- Run processing asynchronously with explicit queued, processing, needs-review, failed, retrying, and complete states. Long jobs must not block the administration page.

Supabase Storage supports resumable uploads, access policies, and image transformations; production planning must verify plan-level costs because managed image resizing is currently associated with paid plans. Supabase also advises moving heavy long-running work to background workers, while Netlify offers background functions for asynchronous jobs. Use these capabilities only after comparing limits, reliability, observability, and cost in `research.md`. See [Supabase Storage](https://supabase.com/docs/guides/storage), [Supabase image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations), [Supabase Edge Functions](https://supabase.com/docs/guides/functions), and [Netlify Background Functions](https://docs.netlify.com/build/functions/background-functions/).

### Assisted product drafting

- Generate draft titles, descriptions, short descriptions, search text, alt text, color/style/tag suggestions, SEO metadata, and translations from uploaded imagery plus verified structured inputs.
- Treat generated content as assistance, never as catalog truth. AI must not invent dimensions, material, construction, origin, age, condition, price, stock, provenance, authenticity, artisan, or sustainability claims.
- Show generated suggestions with confidence or source status, make them easy to accept/edit/reject in bulk, and preserve the original verified values.
- Require a human review gate before first publication. Permit one-click publish only after required facts, media, translations, price, stock, delivery behavior, SEO checks, and validation are complete.
- Keep the drafting provider behind an adapter so credentials and providers can change. Provide a deterministic manual workflow when AI is disabled or fails.

### Minimum product record

Every published sellable product must have verified:

- Internal ID, SKU, localized name/slug, localized description, status, and publication timestamps.
- Base price, enabled market prices where applicable, stock model, quantity, and low-stock threshold.
- Dimensions with unit, shape, material, construction, dominant colors, style, origin if known, condition, care guidance, and delivery class.
- Ordered images, useful alt text, designated primary image, and approved crops.
- Collection/category/tags, filter attributes, SEO title/description, canonical behavior, and structured-data eligibility.
- Explicit `unknown` or omitted values rather than fabricated facts.

## Payments

Provide buyers the widest reliable set of methods supported by a Georgian merchant account without building unsafe parallel payment logic.

- Required: manual bank transfer with configurable bank instructions, payment deadline, pending review, proof/reference capture where legally appropriate, owner/manager verification, cancellation/expiry, and complete audit trail.
- Desired through the selected Georgian acquiring provider: Visa/Mastercard and any merchant-enabled Apple Pay, Google Pay, bank/QR, or installment methods that are contractually available.
- No cash on delivery.
- Use one stable internal payment contract and provider adapters. Orders, refunds, and administration must not depend on provider-specific display strings.
- Research TBC E-Commerce, Bank of Georgia, and other eligible Georgian providers for currencies, international cards, wallets, installments, fees, onboarding, refunds, chargebacks, webhook signatures, test environment, and operational support. Choose one initial card provider in `research.md`; do not implement multiple gateways merely for appearance.
- TBC’s current official API documents merchant-enabled payment methods, callbacks, and GEL/USD/EUR support. Stripe’s current global availability page does not list Georgia for payment processing, so do not assume a Georgian ÉPOCA entity can use Stripe. See [TBC E-Commerce FAQ](https://developers.tbcbank.ge/docs/e-commerce-faq), [TBC payment creation](https://developers.tbcbank.ge/docs/checkout-create-checkout-payment), and [Stripe global availability](https://stripe.com/global).
- Verify callbacks/webhooks independently of redirect results. Make payment initiation and webhook handling idempotent and reconcile final state from the provider.

## Worldwide delivery

- No pickup workflow is required initially.
- Support Georgia and configurable worldwide shipping zones from launch.
- Shipping methods may use flat rates, price/weight/dimension tables, carrier rates, or manual quote according to the approved plan.
- Oversized or unsupported destinations must offer a clear quote/contact path instead of a false delivery promise.
- Capture validated international addresses, country-specific phone/postal formats, delivery instructions, and buyer consent to customs/duties responsibility.
- Administration must manage zones, allowed countries, service levels, price rules, free-shipping thresholds, estimated ranges, tracking carrier/reference, fulfillment status, and exceptions.
- Never mark an order shipped without an auditable fulfillment action.

## Returns, cancellations, and refunds

- Provide configurable policy windows and eligibility rules; legal wording must be supplied or professionally reviewed before launch.
- Buyers can request cancellation or return, choose a reason, add notes and images, and see status.
- Managers can request more information, approve/reject with a reason, record receipt/inspection, restock when appropriate, and issue full or partial refunds through the original method when supported.
- Every transition, notification, inventory effect, and monetary effect must be idempotent and auditable.

## Promotions, communication, and support

- Discount codes with dates, usage limits, minimums, eligible collections/products/customers, combination rules, and server-side calculation.
- Featured collections, homepage merchandising, scheduled content, and newsletter signup with explicit consent.
- Abandoned-cart communication only after consent, retention, and email-provider rules are approved.
- Buyer email templates for account verification, order receipt, payment status, bank-transfer instructions, cancellation, shipment, delivery, return, and refund in four languages.
- Admin alerts for new orders, failed/uncertain payments, transfer review, low stock, ingestion failure, and return requests.
- Contact form and support email are required. Keep phone or WhatsApp configurable but disabled until real contact details are supplied.

## Technical constraints and planned defaults

These are explicit implementation constraints, not customer requirements:

- Backend platform: Supabase managed Postgres, Auth, Storage, Row Level Security, migrations, and appropriate Edge Functions.
- Initial hosting and deployment: Netlify with preview, staging, and production contexts.
- Preferred storefront/admin default for planning: current stable Next.js with TypeScript, using supported production features and avoiding experimental dependencies. Netlify officially supports App Router, SSR, ISR, route handlers, server actions, image optimization, and internationalization; verify exact versions and limitations during planning. See [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
- Remote repository: `https://github.com/LashaKh/-POCA`. The remote was empty when verified. Add it only after reconciling local and remote state; never force-push over unknown history.
- Keep secrets in Supabase/Netlify environment management and local ignored environment files. Commit only documented `.env.example` placeholders.
- Credentials will be provided later. Development and tests must use local Supabase, sandbox providers, safe fixtures, or explicit disabled adapters—never hidden production fallbacks.
- Use database migrations and seed data; do not manage production schema through undocumented dashboard clicks.
- Keep third-party email, AI drafting, payment, analytics, error monitoring, and carrier services behind narrow adapters with contract tests.

Supabase tables exposed through its Data API must use grants and Row Level Security, with separate policies for operations and tests for those policies. Authorization data belongs in protected app metadata or database roles, not user-editable metadata. See [Supabase secure data guidance](https://supabase.com/docs/guides/database/secure-data) and [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Security and privacy requirements

- Owner and Manager authentication, MFA, secure recovery, session expiry, device/session visibility where supported, and rate-limited sign-in.
- Least-privilege RLS on every exposed table and Storage bucket; service-role credentials remain server-only.
- Server-side validation and authorization for catalog writes, prices, stock, discounts, shipping, order transitions, refunds, exports, and staff actions.
- Signed webhook verification, replay protection, idempotency keys, rate limiting, bot/spam protection, secure headers, dependency scanning, secret scanning, and safe logs.
- Collect only necessary customer data, define retention/deletion/export behavior, redact sensitive fields, and document processor/subprocessor decisions.
- Do not store raw card data. Do not log tokens, credentials, full payment payloads, or unnecessary addresses.
- Backups, restore rehearsal, migration rollback, incident response, owner access recovery, and documented production runbooks.

## Design, accessibility, and content quality

- `DESIGN.md` and the Collector’s Index concept are the visual authority.
- Use the repo’s ÉPOCA storefront-design skill and two-pass browser workflow for every customer-facing or administrative surface.
- Preserve the product-first paper-toned grid, expressive serif hierarchy, precise sans metadata, hard rules, generous whitespace, quiet product cards, and image-led editorial interludes.
- Do not sacrifice navigation, search, product facts, focus, readability, or touch usability for atmosphere.
- Meet WCAG 2.2 AA, including keyboard use, visible focus, semantics, labels, status announcements, contrast, non-color cues, touch targets, zoom/reflow, and reduced motion.
- Verify representative phone, tablet, and desktop widths and realistic German/Russian text expansion.
- Content must remain meaningful without JavaScript; important interface behavior uses progressive enhancement and recoverable failure states.

## SEO, analytics, and performance

- Localized, crawlable routes; canonical URLs; `hreflang`; sitemap; robots policy; metadata; Open Graph; redirects; breadcrumbs; and valid Product, Offer, Organization, Article, and Breadcrumb structured data where facts allow.
- Consent-aware analytics with a documented event dictionary for search, filter, product view, wishlist, cart, checkout, purchase, upload completion, and admin operational outcomes.
- Cookie/consent controls appropriate to the selected analytics and target markets; no non-essential tracking before consent where required.
- Define and pass budgets for responsive image weight, JavaScript, fonts, layout shift, interaction latency, server response, and Core Web Vitals on representative catalog data.

## Testing and verification

- Unit tests for money, tax, discounts, stock, reservations, shipping, order/payment/return state machines, permissions, localization, and media-job logic.
- Database tests for constraints, functions, migrations, concurrency, and every RLS policy.
- Integration and contract tests for Supabase, Storage, email, AI drafting, payment adapters/webhooks, analytics, and any shipping integration.
- End-to-end tests for product ingestion and review, publishing, discovery, search/filter, product evaluation, wishlist, guest checkout, account checkout, bank transfer, card sandbox success/failure, concurrent last-item purchase, order management, fulfillment, cancellation, return, and refund.
- Browser/visual tests at 390px, 768px, and 1440px in all four languages, including keyboard, reduced motion, slow/failing network, missing media, long content, and empty/error/unavailable states.
- Accessibility automation plus manual keyboard and screen-reader-oriented semantic review.
- Load and reliability checks for product search, catalog browsing, image upload/processing, checkout, and webhook bursts.
- Security review for authorization bypass, IDOR (insecure direct object reference), injection, upload abuse, XSS, CSRF where applicable, replay, rate limits, secret exposure, and dependency risk.

## Delivery and operations

- Local development setup with one documented command path and safe seed data.
- CI checks for formatting, lint, types, tests, migrations, build, accessibility smoke, and dependency/security audits.
- Netlify deploy previews for branches/PRs, isolated staging configuration, and controlled production deployment.
- Supabase local/staging/production separation, versioned migrations, backup policy, restore test, and environment drift checks.
- Error monitoring, structured logs, correlation IDs, uptime/health monitoring, alert ownership, and actionable dashboards.
- Deployment, rollback, data migration, payment activation, domain/DNS, incident, backup/restore, and staff-operation runbooks.
- Owner and Manager onboarding documentation for products, ingestion failures, translations, orders, bank transfers, delivery, returns, refunds, and recovery.

## Required delivery phases

The implementation plan and tasks must produce independently verifiable vertical slices, at minimum:

1. Repository, environments, design tokens, application shells, Supabase baseline, CI, and deployment preview.
2. Authentication, Owner/Manager authorization, RLS foundations, audit infrastructure, and admin shell.
3. Catalog data model, collections, inventory, media storage, and manual product administration.
4. Automated ingestion, image processing, assisted drafting/translations, review gate, and publishing.
5. Localized Collector’s Index storefront, navigation, homepage, collections, search/filter, and product pages.
6. Wishlist, customer accounts, address book, cart, discounts, delivery calculation, and checkout review.
7. Order/payment state machines, bank transfer, card-provider sandbox adapter, webhooks, notifications, and reconciliation.
8. Order administration, fulfillment/tracking, cancellation, returns, refunds, and customer self-service.
9. CMS/journal/policies, translations, SEO, structured data, consent-aware analytics, and support surfaces.
10. Accessibility, performance, security, reliability, backup/restore, monitoring, staging, operational documentation, and production-readiness audit.

Do not defer essential wiring, states, accessibility, authorization, tests, or operations to a vague final “polish” phase.

## External inputs that must not be invented

Claude must build safe configuration and clear setup guides, then mark these as activation dependencies until the user supplies them:

- Supabase project URL/keys and paid-plan decision.
- Netlify site/team credentials and environment variables.
- GitHub authentication for connecting and pushing the local repository.
- Domain and DNS access.
- Registered legal entity name, address, tax/VAT status, invoice requirements, and bank-transfer details.
- Approved payment provider, merchant account, sandbox/live credentials, webhook secrets, enabled currencies/methods, and refund capabilities.
- Real shipping countries/zones, carriers, prices, delivery estimates, customs/duties wording, and tracking process.
- Legally reviewed terms, privacy, cookies, returns, cancellation, delivery, warranty, and contact information.
- Transactional email sender/domain/provider and support channels.
- AI drafting/translation provider credentials and approved usage/privacy rules, if AI assistance is enabled.
- Analytics, consent, error-monitoring, and alert destinations.
- Verified product records and owned/licensed production imagery.

Missing external inputs may block activation, but must not justify leaving code paths, validation, tests, administration, documentation, or disabled-state UX incomplete.

## Definition of done

The master goal is achieved only when evidence proves:

- Every approved requirement and acceptance scenario maps to implemented and verified work.
- No placeholder, mock, sample claim, disconnected component, unconsumed service, disabled test, critical TODO, or silent failure remains in an in-scope production path.
- All customer and administration journeys work with realistic data in four languages and at all target widths.
- Owner/Manager permissions and every exposed Supabase table/bucket pass authorization tests.
- Product upload through review and publication is demonstrably streamlined, resumable, recoverable, and safe against invented catalog facts.
- Inventory, totals, discounts, shipping, payment state, orders, returns, and refunds remain correct under retries, concurrency, and provider failure.
- CI, production build, migrations, tests, accessibility, performance, security, SEO, monitoring, backup/restore, deployment, and rollback gates pass.
- Staging deployment is operational and the remaining live activation dependencies are listed precisely with tested setup/runbook steps.
- The final report distinguishes build-complete, payment-ready, staging-operational, and launch-ready status without overstating any missing credential or external approval.

## Explicit non-goals for the initial release

- Cash on delivery.
- Showroom pickup or point-of-sale operations.
- Multi-vendor marketplace behavior.
- Native mobile applications.
- Unverified public reviews or testimonials.
- Multiple live card gateways unless planning proves a concrete resilience or business requirement.
- AI auto-publication of unreviewed product facts.

## Exact Claude invocation for specification generation

From the repository root, start Claude and enter:

```text
/speckit.specify Read docs/product/EPOCA_MASTER_BUILD_GOAL.md completely and use it as the authoritative input for the ÉPOCA production online carpet shop specification. Preserve the full operational scope, automated product-ingestion workflow, four-language and worldwide-commerce requirements, Owner/Manager administration, Supabase and Netlify constraints, payment-activation exception, production quality gates, and explicit non-goals. Write technology-neutral customer and business requirements in spec.md; record Supabase, Netlify, GitHub, and other implementation constraints for the later planning stage without turning them into UI requirements. Do not invent legal policies, credentials, provider eligibility, shipping prices, tax rules, or product facts. Make every requirement and success criterion observable and testable.
```

After `spec.md` is created, execute the full pipeline:

```text
/upgradeSpec
/speckit.clarify
/speckit.plan
/upgradePlan
/speckit.tasks
/upgradeTasks
/speckit.analyze
/speckit.implement
```

At every stage, reread this master goal and prove that no approved area disappeared. After implementation, continue with verification, staging, and the production-readiness audit described above; do not stop merely because the generated task checklist is empty.
