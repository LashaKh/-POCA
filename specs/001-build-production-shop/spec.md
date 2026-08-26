# Feature Specification: ÉPOCA Production Online Shop

<!-- UPGRADED:v1 -->

**Feature Branch**: `001-build-production-shop`  
**Created**: 2026-08-25  
**Status**: Draft  
**Input**: Build the complete production-grade ÉPOCA online carpet shop defined in `docs/product/EPOCA_MASTER_BUILD_GOAL.md`, including the localized Collector’s Index storefront, streamlined product ingestion, Owner and Manager administration, worldwide commerce, secure ordering and payments, and all production-quality and operational requirements.

## Scope and Product Promise

ÉPOCA is a real operational shop for selling carpets from Georgia to buyers in Georgia and worldwide. It combines a calm, trustworthy Collector’s Index storefront with a practical administration area that lets a small team take a product from photographs to publication, sale, fulfillment, return, and reporting without disconnected tools or repetitive data entry.

The initial release includes the complete buying and operating journey. Live card or wallet activation may remain disabled only while merchant approval or credentials are unavailable; the configured disabled state, sandbox-tested adapter behavior, bank-transfer journey, and all surrounding order operations remain in scope.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Discover and Evaluate a Carpet (Priority: P1)

A visitor can browse, search, filter, and compare truthful carpet records in Georgian, English, German, or Russian, then understand the selected carpet well enough to decide whether it fits their space and needs.

**Why this priority**: A buyer cannot purchase confidently unless the catalog is easy to navigate and product facts are complete, legible, and honest.

**Independent Test**: With a representative published catalog, an anonymous visitor can enter through the homepage, collection, or search; narrow results; inspect a product; and reach a clear purchase, unavailable, or delivery-quote outcome.

**Acceptance Scenarios**:

1. **Given** published products exist, **When** a visitor enters in any supported language, **Then** navigation, catalog content, prices, availability, and service information follow that language and the documented fallback policy.
2. **Given** a visitor searches or combines applicable filters and sorting, **When** results load, **Then** matching products, active criteria, result count, and clear reset/revision controls appear at a stable shareable location.
3. **Given** no product matches, **When** results load, **Then** a useful no-results explanation and recovery paths appear without fabricated alternatives.
4. **Given** a product opens, **When** the visitor evaluates it, **Then** verified images and all applicable purchase facts, delivery behavior, returns summary, availability, and next action are understandable without hover or color alone.
5. **Given** a fact is unknown, **When** the product appears, **Then** that fact is omitted or explicitly unknown rather than invented.
6. **Given** a phone, keyboard, zoom, reduced-motion setting, or assistive technology, **When** the journey is completed, **Then** the same information and actions remain usable.
7. **Given** a product has many high-resolution images or one image fails, **When** the gallery is used, **Then** buyers can inspect available detail, understand which image is unavailable, and continue evaluating without layout loss or a blocked purchase action.

---

### User Story 2 - Complete a Guest Purchase (Priority: P1)

An anonymous buyer can add an available carpet to a persistent cart, receive correct totals and delivery information, complete checkout without creating an account, use an enabled payment method, and receive confirmation.

**Why this priority**: Guest checkout is the shortest complete route from discovery to revenue.

**Independent Test**: Purchase an available unique carpet by bank transfer and verify stock protection, deterministic totals, one order, the correct payment state, confirmation, and notification.

**Acceptance Scenarios**:

1. **Given** an available product, **When** it is added to the cart, **Then** the cart persists, respects quantity boundaries, and shows current price and availability.
2. **Given** price, stock, discount, tax, or delivery changed, **When** checkout is reviewed, **Then** the exact change is explained and the buyer must accept the updated final amount.
3. **Given** valid checkout inputs, **When** a guest reviews the order, **Then** charged currency, subtotal, discounts, tax, delivery, duties notice, and final total are explicit before submission.
4. **Given** bank transfer is selected, **When** the order is submitted, **Then** one pending order receives a unique reference, configured instructions and deadline, correct stock treatment, confirmation, and notification.
5. **Given** online payment is disabled, **When** payment choices appear, **Then** card and wallet methods are not represented as available.
6. **Given** a retry, refresh, double-click, or uncertain response, **When** submission reconciles, **Then** no duplicate order, payment, discount use, or inventory effect exists.
7. **Given** a buyer leaves checkout before final submission, **When** they return within the documented cart period, **Then** recoverable cart information remains while sensitive payment input is not retained by ÉPOCA.

---

### User Story 3 - Upload, Prepare, and Publish a Product (Priority: P1)

A Manager or Owner can upload a standardized image batch plus a small set of verified facts and efficiently turn it into a complete, reviewed, four-language product ready for publication.

**Why this priority**: Streamlined ingestion determines whether a growing catalog remains practical to operate.

**Independent Test**: Upload a mixed batch, interrupt and resume it, process and order media, review assisted content, satisfy the readiness gate, publish, and find the resulting product publicly.

**Acceptance Scenarios**:

1. **Given** supported and unsupported files, **When** staff upload a batch, **Then** each file shows validation, progress, retry/cancel behavior, duplicate status, and useful failure reasons while valid files continue.
2. **Given** an interruption, **When** staff return, **Then** batch and per-file state recover without duplicating completed media.
3. **Given** valid images, **When** processing completes, **Then** protected originals, safe metadata, optimized variants, stable ordering, crops, alternative-text drafts, and explicit states are reviewable.
4. **Given** assisted drafting, **When** suggestions are generated, **Then** proposed copy, classifications, metadata, and translations remain editable and identify their suggestion status.
5. **Given** assistance is unavailable, **When** staff continue, **Then** the whole product can still be completed manually.
6. **Given** required facts, media, translations, price, stock, delivery, or review are incomplete, **When** publication is attempted, **Then** it is blocked with one grouped actionable list.
7. **Given** every gate passes, **When** authorized staff publish, **Then** the product appears once with accurate availability, search/filter facts, metadata, and audit history.

---

### User Story 4 - Operate Orders, Payments, and Fulfillment (Priority: P1)

A Manager or Owner can find orders needing attention, verify transfers or payment results, move orders through valid states, fulfill shipments, notify buyers, and recover from uncertain operations.

**Why this priority**: An accepted order has value only if staff can safely turn it into delivery.

**Independent Test**: Move a bank-transfer order through verification, fulfillment, tracking, and completion; separately handle failed and duplicate payment events and verify state, audit, inventory, and notification consistency.

**Acceptance Scenarios**:

1. **Given** operational work, **When** the dashboard opens, **Then** orders, payments, transfers, stock, ingestion failures, returns, translation gaps, and alerts link to exact records.
2. **Given** a transfer review, **When** staff verify or reject it, **Then** only valid payment/order transitions occur and the decision is audited and communicated.
3. **Given** a paid order, **When** staff fulfill it, **Then** shipment details, buyer notice, and an auditable action exist before it is shown as shipped.
4. **Given** a duplicate, delayed, invalid, or out-of-order payment event, **When** handled, **Then** authenticity and prior processing are checked and no repeated monetary or stock effect occurs.
5. **Given** partial external failure, **When** staff inspect it, **Then** an actionable reconciliation state and safe retry path are available.

---

### User Story 5 - Maintain Catalog and Store Content (Priority: P1)

A Manager or Owner can maintain products, inventory, collections, merchandising, translations, policies, journal content, navigation, and store configuration without developer intervention or accidental overwrites.

**Why this priority**: Daily operations must remain safe, clear, and maintainable.

**Independent Test**: Update and bulk-edit records, preview translations and merchandising, schedule publication, resolve an edit conflict, archive and restore a record, and verify only approved changes become public.

**Acceptance Scenarios**:

1. **Given** a staff edit, **When** work saves or the user leaves, **Then** autosave, validation, unsaved changes, and failures are explicit.
2. **Given** concurrent edits, **When** a stale session saves, **Then** it cannot silently overwrite the newer version.
3. **Given** a bulk update or import, **When** it is prepared, **Then** a preview identifies changes and row errors before commit and re-import does not duplicate records.
4. **Given** four-language content, **When** translations are reviewed, **Then** draft, assisted, reviewed, published, and missing states appear side by side.
5. **Given** a supported record is archived and restored, **When** it returns, **Then** valid relationships and history remain intact.

---

### User Story 6 - Use an Optional Customer Account (Priority: P2)

A buyer can use an optional account for saved carpets, addresses, and owned order history while guest checkout remains available.

**Why this priority**: Accounts improve repeat shopping but must not obstruct purchase.

**Independent Test**: Save products anonymously, sign in, merge the wishlist, save an address, place an account order, and verify ownership protection.

**Acceptance Scenarios**:

1. **Given** an anonymous wishlist, **When** the buyer signs in, **Then** local and account items merge without duplicates or loss.
2. **Given** a saved address, **When** it is edited, **Then** historical order address snapshots remain unchanged.
3. **Given** an authenticated buyer, **When** order history opens, **Then** only that buyer’s orders and related after-sale status appear.
4. **Given** failed or rate-limited authentication, **When** recovery is requested, **Then** account privacy is protected and a safe recovery path is offered.
5. **Given** a customer reviews active sessions or loses a device, **When** they revoke a session or complete recovery, **Then** the affected session can no longer access protected customer data.
6. **Given** a customer makes an access, correction, export, deletion, or consent request, **When** it is submitted, **Then** receipt, identity-verification expectations, status, and legally required exceptions are clear.

---

### User Story 7 - Request Cancellation, Return, or Refund (Priority: P2)

A buyer can request eligible after-sale help and follow status, while staff can evaluate, communicate, inspect, restock when appropriate, and issue correct refunds.

**Why this priority**: Auditable post-purchase service is essential to worldwide buyer trust.

**Independent Test**: Submit a return with evidence, request information, approve, record inspection, restock, partially refund, and verify buyer, money, stock, notification, and audit histories agree.

**Acceptance Scenarios**:

1. **Given** an order and configured policy, **When** a request begins, **Then** eligibility, reason, evidence, next steps, and status are clear.
2. **Given** an ineligible request, **When** reviewed, **Then** it is not silently accepted and receives a policy-based reason and support path.
3. **Given** an approval or rejection, **When** saved, **Then** its reason, actor, notification, and valid transition are recorded.
4. **Given** a retried refund or restock, **When** processing completes, **Then** monetary and inventory effects occur at most once.

---

### User Story 8 - Control Access, Configuration, and Audit (Priority: P1)

The Owner controls staff and sensitive configuration with full authority; a Manager performs normal operations but cannot take ownership, reveal secrets, bypass audit, or perform Owner-only destruction.

**Why this priority**: Broad administration is safe only when authority is enforced consistently.

**Independent Test**: Exercise every protected operation as anonymous visitor, Buyer, Manager, Owner, and stale session; verify authorization, audit, strong authentication, and recovery evidence.

**Acceptance Scenarios**:

1. **Given** a Manager, **When** an Owner-only action is attempted by bypassing the interface, **Then** the authoritative operation denies it.
2. **Given** production Owner access, **When** authentication assurance is insufficient, **Then** stronger or multi-factor verification is required.
3. **Given** a sensitive allowed or denied action, **When** it occurs, **Then** a privacy-safe audit record identifies action and outcome without secrets.
4. **Given** an irreversible action, **When** an authorized Owner starts it, **Then** exact impact and explicit confirmation are required and a reversible alternative is preferred.

---

### User Story 9 - Configure Worldwide Selling (Priority: P2)

Authorized staff can configure currencies, tax display, discounts, delivery zones, price rules, manual quotes, customs notices, and contact behavior without unsupported promises.

**Why this priority**: International ordering must adapt to real destinations and rules.

**Independent Test**: Configure Georgia, a supported international zone, and an unsupported oversized route, then verify correct checkout or quote behavior for each.

**Acceptance Scenarios**:

1. **Given** a supported destination, **When** delivery calculates, **Then** only eligible methods, charges, estimates, currency, tax display, and customs responsibility appear.
2. **Given** an unsupported route, **When** delivery is requested, **Then** no false rate appears and a manual quote/support path is offered.
3. **Given** an ineligible discount, **When** applied, **Then** it is rejected with a useful reason and totals remain correct.
4. **Given** a currency lacks merchant enablement or an approved price, **When** selected, **Then** no fabricated conversion or charge promise appears.

---

### User Story 10 - Publish Editorial and Service Content (Priority: P3)

Authorized staff can publish localized homepage, journal, FAQ, policy, menu, redirect, and contact content that shares the storefront system and remains discoverable.

**Why this priority**: Editorial material adds context and service pages add trust after core commerce works.

**Independent Test**: Publish and schedule a four-language story and service page, connect navigation and metadata, and verify redirect and fallback behavior.

**Acceptance Scenarios**:

1. **Given** reviewed content, **When** published or scheduled, **Then** its timing, navigation, metadata, canonical behavior, and translations are intact.
2. **Given** critical content lacks translation, **When** that locale opens, **Then** fallback is disclosed and languages are not silently mixed inside one critical instruction.
3. **Given** a public location changes, **When** a redirect is configured, **Then** visitors reach the replacement without loops.
4. **Given** no verified contact channel, **When** service content appears, **Then** invented contact facts or response promises do not appear.
5. **Given** a verified support email and contact configuration, **When** a visitor submits a valid contact request, **Then** consent/disclosure, submission status, a reference, and recoverable failure behavior are clear without exposing the message publicly.
6. **Given** a visitor changes optional cookie or analytics preferences, **When** the choice is saved or withdrawn, **Then** the current preference is visible and non-essential tracking follows it without disrupting commerce.

---

### User Story 11 - Operate and Recover the Service (Priority: P1)

The business can release, observe, back up, restore, and recover the shop through documented procedures while staff receive actionable alerts and customers receive honest failure states.

**Why this priority**: Production readiness includes safe operation after launch.

**Independent Test**: Release to an isolated environment, run smoke journeys, simulate failures, follow incident and rollback procedures, and restore a verified backup safely.

**Acceptance Scenarios**:

1. **Given** a degraded dependency, **When** a user acts, **Then** the service fails safely, preserves recoverable work, and presents actionable status.
2. **Given** an operational error, **When** investigated, **Then** privacy-safe events and a correlation reference connect the affected journey.
3. **Given** failed release checks, **When** promotion is evaluated, **Then** it stops or rolls back.
4. **Given** a restore rehearsal, **When** integrity checks run, **Then** catalog, orders, stock, permissions, and media references are consistent.

### Edge Cases

- Two sessions attempt to buy the last carpet; only one acquires it and the other receives a recoverable explanation.
- A reservation expires during a payment redirect and a later confirmation must reconcile without overselling.
- Checkout holds stale price, stock, discount, delivery, tax, or currency data.
- A buyer double-submits, navigates backward, loses the response, or receives an out-of-order confirmation.
- A payment event is missing, duplicated, delayed, forged, replayed, or contradicts the browser redirect.
- A bank transfer is late, mismatched, incorrectly referenced, or arrives after cancellation.
- An external refund succeeds but its response is lost, or a retry follows a partial refund.
- A returned product is damaged, incomplete, late, or ineligible for restocking.
- A referenced product, collection, translation, media item, or policy becomes unpublished.
- An upload is corrupt, huge, mislabeled, duplicate, oddly oriented, unsupported, or malicious.
- Processing stops between preserving an original and recording its derivatives.
- Assisted drafting times out, returns unsafe text, mixes languages, or conflicts with verified facts.
- A publication attempt lacks required media, facts, price, stock, delivery, translations, or approval.
- Two staff members edit the same product, stock, order, translation, or setting.
- An import has duplicate SKUs, invalid encoding, long localized strings, decimal money, mixed units, unexpected columns, or partial validity.
- Georgian, German, or Russian copy expands beyond control or layout space.
- A name/address contains non-Latin characters, long instructions, international formats, or no postal code.
- Locale or currency changes after cart creation, during checkout, or after order acceptance.
- Search includes punctuation, mixed scripts, spelling variation, no results, or terms matching unpublished records.
- Anonymous wishlist state conflicts with an account wishlist at sign-in.
- A customer attempts to read another customer’s address, order, return, or refund.
- A Manager directly attempts an Owner-only operation.
- The only Owner loses their authentication device or access.
- A staff session expires during a multi-step change.
- Shipping rules overlap, leave gaps, or become ineligible after address correction.
- A discount reaches its usage limit between cart and submission.
- A public page encounters missing media, offline transition, slow response, or dependency failure.
- A message provider rejects, delays, or duplicates a transactional notice.
- Tracking is blocked or consent withdrawn; commerce continues.
- A production credential is absent; its capability remains safely and visibly disabled.
- A gallery contains a failed rendition while its protected original remains private.
- Media ownership or license evidence is missing, expired, or conflicts with a scheduled publication.
- A contact form receives spam, unsafe attachments, repeated submissions, or a notification-provider failure.
- Consent preferences differ between anonymous and signed-in sessions or are withdrawn after tracking initialized.
- A customer or staff session is revoked while a protected request is in flight.

## Requirements _(mandatory)_

### Functional Requirements

#### Storefront, localization, and discovery

- **FR-001**: The shop MUST provide explicit public routes for Georgian, English, German, and Russian, with Georgian initially default and the language choice persistent.
- **FR-002**: The shop MUST apply a documented fallback policy and MUST NOT silently mix languages within critical checkout, payment, delivery, return, privacy, or consent instructions.
- **FR-003**: Responsive navigation MUST provide access to search, account, wishlist, cart, language, and merchant-enabled currency choices.
- **FR-004**: Authorized staff MUST be able to manage localized homepage sections, menus, footer, featured collections, product edits, journal entries, and service entry points.
- **FR-005**: Buyers MUST be able to browse stable collection locations with localized descriptions, result counts, applicable filters, sorting, and navigation-state-preserving pagination or progressive loading.
- **FR-006**: Buyers MUST be able to search published products by localized name, SKU where appropriate, description, material, origin, colors, styles, tags, and collections without exposing private or draft records.
- **FR-007**: Search MUST provide useful no-results recovery and predictable behavior for punctuation, mixed scripts, and spelling variation.
- **FR-008**: Buyers MUST be able to filter on populated price, dimension/size, shape, color, material, style, origin, condition, availability, age, and handmade attributes and clear individual or all criteria.
- **FR-009**: A public product MUST present verified ordered imagery, dimensions, material, construction, origin when known, condition, colors, style, pile and age when known, care, price, availability, delivery behavior, returns summary, related items, and factual discovery data when eligible.
- **FR-010**: Product presentation MUST communicate meaningful photography-to-product color and texture variation where applicable.
- **FR-011**: Public journeys MUST provide intentional loading, empty, validation, error, slow/offline, missing-media, unavailable, out-of-stock, and success states.
- **FR-012**: Public catalog, product, journal, and service content MUST expose localized canonical relationships, language alternatives, breadcrumbs, index controls, share metadata, and factual structured information where eligible.
- **FR-013**: The shop MUST provide a current public discovery map and crawler policy that exclude private, checkout, account, administration, draft, and unsuitable filtered locations.
- **FR-014**: The shop MUST NOT publish unverified reviews, press logos, awards, scarcity, discounts, provenance, artisan stories, authenticity, or sustainability claims.

#### Catalog, inventory, content, and merchandising

- **FR-015**: Authorized staff MUST be able to create, edit, duplicate, preview, publish, unpublish, archive, restore, and schedule products without losing history.
- **FR-016**: Every published sellable product MUST have unique identity and SKU; localized name, location, and description; publication status; price; stock model and quantity; dimensions/unit; shape; material; construction; colors; style; condition; care; delivery class; primary and ordered images with crops and alternative text; catalog relationships; and required discovery metadata.
- **FR-017**: Optional facts such as origin, age, pile, provenance, or handmade status MUST appear only when verified, otherwise be omitted or explicitly unknown under the field policy.
- **FR-018**: The catalog MUST support unique products with quantity one and stocked products with larger quantities.
- **FR-019**: Authorized staff MUST be able to manage collections, categories, tags, filter attributes, related products, featured placements, homepage order, publication schedules, and discovery fields.
- **FR-020**: Authorized staff MUST be able to bulk update supported price, stock, status, collection, tag, and translation-readiness fields through a preview of effects and errors.
- **FR-021**: Authorized staff MUST be able to import/export supported catalog records with documented fields, validation preview, row-level errors, downloadable error details, stable identities, and duplicate-safe re-import.
- **FR-022**: Administrative edits MUST provide autosave status, unsaved-change warning, field validation, recoverable save failure, and protection against silently overwriting a newer version.
- **FR-023**: Inventory MUST record auditable quantities, reservations, releases, sales, returns, low-stock thresholds, and manual corrections with reason and actor.
- **FR-024**: Inventory operations MUST prevent sale below available quantity under concurrent carts, expired sessions, retries, callbacks, cancellations, or stale data.
- **FR-025**: Public availability MUST follow authoritative inventory and publication state rather than display copy or stale assumptions.

#### Automated product ingestion and media

- **FR-026**: Authorized staff MUST be able to upload a batch of supported product images to a new draft or existing product by drag-and-drop or file selection with an accessible manual path.
- **FR-027**: Upload MUST document and validate real file type, dimensions, size, corruption, count, and naming guidance and explain each rejection.
- **FR-028**: Upload MUST provide per-file/batch progress, cancellation, retry, refresh-safe resumability, and duplicate detection without requiring a naming convention.
- **FR-029**: Ingestion MAY use SKU, folder, or filename signals to group/order media but staff MUST be able to correct each inference.
- **FR-030**: Processing MUST preserve a protected original, correct orientation, remove unnecessary location/device metadata, and generate approved responsive, thumbnail, placeholder, and modern-format renditions.
- **FR-031**: Processing MUST use deterministic checksums, filenames, paths, ordering, and records so retries do not duplicate originals or renditions.
- **FR-032**: Staff MUST be able to review and adjust focal points and crops for catalog cards, galleries, search, social previews, and editorial placements.
- **FR-033**: Ingestion jobs MUST expose queued, uploading, processing, needs-review, failed, retrying, cancelled, and complete states as applicable without blocking unrelated administration.
- **FR-034**: Failed or abandoned jobs MUST retain enough safe state to inspect, retry, continue manually, or remove without orphaned public media.
- **FR-035**: Assisted drafting MAY suggest localized titles, descriptions, search text, alternative text, colors, styles, tags, discovery metadata, and translations from images plus verified inputs.
- **FR-036**: Assisted content MUST remain a reviewable suggestion and MUST NOT overwrite verified facts or invent dimensions, material, construction, origin, age, condition, price, stock, provenance, authenticity, artisan, or sustainability claims.
- **FR-037**: Staff MUST be able to accept, edit, reject, or bulk-apply eligible suggestions and complete the same product manually when assistance is disabled or fails.
- **FR-038**: First publication MUST require human review of required facts, media, crops, alternative text, translations, price, stock, delivery, and discovery readiness and report all blockers together.

#### Cart, pricing, discounts, delivery, and checkout

- **FR-039**: Anonymous and authenticated buyers MUST have a persistent cart supporting eligible quantities, removal, and explicit item/cart states.
- **FR-040**: Cart and checkout MUST reconcile current product, publication, price, stock, discount, currency, tax, and delivery data before accepting an order.
- **FR-041**: A reconciled change MUST show the previous and current outcome and require buyer acceptance of the new final amount.
- **FR-042**: Money MUST use exact minor units and deterministic allocation, discount, tax, delivery, total, and refund rules.
- **FR-043**: GEL MUST be accounting/default display currency; independently merchant-enabled GEL, EUR, and USD prices MUST NOT be derived from language or fabricated conversion.
- **FR-044**: Charged currency and amount MUST be immutable on an accepted order except through explicit auditable refund/correction behavior.
- **FR-045**: Authorized staff MUST be able to configure tax display, enabled currencies, explicit market prices or approved conversion behavior, discounts, zones, countries, methods, service levels, price rules, free-shipping thresholds, estimates, and manual-quote rules.
- **FR-046**: Discount codes MUST enforce dates, limits, eligibility, minimums, and combination rules at the authoritative calculation boundary.
- **FR-047**: Delivery calculation MUST return only eligible methods for the cart/address/destination with charge, estimate, currency, and customs/duties responsibility.
- **FR-048**: Unsupported destinations or products MUST receive an honest quote/contact route rather than a false rate or purchase promise.
- **FR-049**: Checkout MUST support valid international names, addresses, postal conventions, phones, and delivery instructions while collecting only required information.
- **FR-050**: Guest checkout MUST be complete and account creation MUST NOT be required.
- **FR-051**: Checkout MUST validate contact, delivery address/method, enabled payment method, required consent, and final review before acceptance.
- **FR-052**: Order submission MUST be duplicate-safe and return a recoverable outcome after refresh, retry, uncertainty, or repeated action.

#### Orders, payments, notifications, and reconciliation

- **FR-053**: Manual bank transfer MUST provide configurable instructions, reference, deadline, pending-review state, optional permitted evidence, expiry/cancellation, staff verification, and audit history.
- **FR-054**: Checkout MUST present only genuinely enabled payment methods and MUST NOT imply that disabled card/wallet methods work.
- **FR-055**: Online payment behavior MUST cover initiation, external continuation, independent verification, authenticated events, duplicate protection, reconciliation, failure recovery, full/partial refund, and explicit configuration status.
- **FR-056**: Payment/order behavior MUST distinguish pending, bank-transfer-review, authorized where applicable, paid, failed, expired, cancelled, refunded, partially refunded, uncertain, and reconciliation-required outcomes as applicable.
- **FR-057**: Payment, order, inventory, discount-use, notification, return, and refund changes MUST each be at-most-once in effect across retries, duplicates, delays, and out-of-order events.
- **FR-058**: Order state changes MUST follow explicit permitted transitions enforced independently of interface controls and reject invalid/stale transitions.
- **FR-059**: An accepted order MUST preserve immutable item identity, title, SKU, fulfillment attributes, unit price, quantity, discounts, tax, delivery, currency, totals, buyer details, and applicable policy context.
- **FR-060**: Buyers MUST receive a localized confirmation view and transactional notice for accepted orders, payment updates, bank instructions, cancellation, shipment, delivery where recorded, return, and refund.
- **FR-061**: Notification failure MUST NOT corrupt order/payment state and MUST remain visible for retry or follow-up.
- **FR-062**: Authorized staff MUST be able to search/filter orders and inspect buyer, items, totals, payment, delivery, timeline, notes, notices, and audit while minimizing personal-data exposure.
- **FR-063**: Authorized staff MUST be able to add internal notes, resend eligible notices, review transfers, cancel when allowed, record fulfillment, and perform supported full/partial refunds.
- **FR-064**: An order MUST NOT appear shipped until an authorized auditable fulfillment action records applicable carrier/method and tracking/reference.
- **FR-065**: Buyers MUST have an appropriately authenticated confirmation or tracking/support view that cannot expose another buyer’s data.
- **FR-066**: Authorized staff MUST have reconciliation views for uncertain payments, mismatched transfers, failed notices, duplicate events, and refund discrepancies.

#### Accounts, wishlist, customers, and privacy

- **FR-067**: Buyers MUST be able to maintain a wishlist anonymously or by optional account, with duplicate-safe merge on sign-in.
- **FR-068**: Accounts MUST support secure sign-up/sign-in, verification where configured, recovery, sign-out, session management, order history/detail, wishlist, and saved addresses.
- **FR-069**: Customers MUST access only their own account, addresses, wishlist, orders, cancellations, returns, refunds, and preferences.
- **FR-070**: Editing a saved address MUST NOT change an accepted order’s historical address snapshot.
- **FR-071**: Authorized staff MUST be able to find customer records/order history while seeing only information required for the task.
- **FR-072**: The business MUST support documented customer access, correction, export, deletion, retention, and consent withdrawal subject to legal/order obligations.
- **FR-073**: Authentication/recovery MUST limit abuse, protect account existence where needed, and provide an accessible recovery outcome.

#### Administration, authorization, audit, and configuration

- **FR-074**: Responsive administration MUST cover dashboard, catalog, media, ingestion, stock, orders, customers, content, translations, promotions, delivery, returns, reporting, audit, and permitted settings.
- **FR-075**: The dashboard MUST summarize today’s orders/revenue, attention payments, transfer reviews, low stock, failed ingestion, returns, missing translations, and alerts and link to underlying records.
- **FR-076**: Owner MUST have all Manager powers plus staff access, ownership, integration/credential-status metadata, sensitive settings, exports, audit review, retention, recovery, and irreversible system operations.
- **FR-077**: Manager MUST operate catalog, inventory, orders, support, merchandising, content, translations, promotions, delivery, returns, refunds, and reporting but MUST NOT remove/impersonate Owner, reveal secrets, alter ownership, bypass audit, or perform reserved irreversible destruction.
- **FR-078**: Authorization MUST be enforced at every authoritative data and operation boundary, not only through interface controls.
- **FR-079**: Production staff access MUST require strong authentication, production Owner access MUST require multi-factor assurance, and risk-sensitive operations MUST support reauthentication.
- **FR-080**: Sensitive allowed/denied actions MUST record a privacy-safe audit event with actor, time, action, entity, result, source, correlation reference, and appropriate summary.
- **FR-081**: Audit MUST exclude credentials, raw authentication material, full payment payloads, unnecessary addresses, and unneeded personal data and resist ordinary alteration.
- **FR-082**: Reversible archive/disable/restore MUST be preferred; irreversible actions MUST be Owner-only, explain impact, require explicit confirmation, and remain audited.
- **FR-083**: Administrative lists MUST support practical search, filter, sort, pagination, stable views, states, and direct record access.
- **FR-084**: Staff MUST manage side-by-side Georgian, English, German, and Russian translation states: draft, assisted, reviewed, published, and missing.
- **FR-085**: Owner MUST see integration/business-configuration status as configured, disabled, test, degraded, or ready without viewing secret values.

#### Returns, promotions, communication, and content

- **FR-086**: Staff MUST be able to configure cancellation/return windows, eligibility, reasons, evidence, restock behavior, and buyer process text, while legal copy remains unapproved until supplied.
- **FR-087**: Buyers MUST be able to request eligible cancellation/return, provide reason, notes, and permitted images, and follow status.
- **FR-088**: Staff MUST be able to request information, approve/reject with reason, record receipt/inspection, restock appropriately, and initiate supported full/partial refunds.
- **FR-089**: Return transitions, notifications, inventory effects, and monetary effects MUST be valid, duplicate-safe, and auditable.
- **FR-090**: Staff MUST manage localized homepage, journal, FAQ, policy, menus, footer, discovery metadata, redirects, contact information, and schedules.
- **FR-091**: Public content MUST support preview, draft, scheduled, published, unpublished, archived, and restored states where appropriate.
- **FR-092**: About, Contact, FAQ, Delivery, Returns, Privacy, Cookie, and Terms destinations MUST exist while preventing placeholder facts from appearing approved.
- **FR-093**: Newsletter signup MUST record explicit consent; abandoned-cart messages MUST remain disabled until consent, retention, and provider rules are approved.
- **FR-094**: The shop MUST support localized buyer templates and staff alerts for new orders, uncertain payments, transfer review, low stock, ingestion failure, and returns.
- **FR-095**: Phone and messaging channels MUST remain configurable and disabled until verified details exist.
- **FR-096**: Redirect management MUST reject loops/invalid destinations and preserve discovery behavior for moved content.

#### Operations, safety, analytics, and production control

- **FR-097**: Non-essential analytics MUST remain inactive until applicable consent and MUST NOT be required for browsing, buying, or administration.
- **FR-098**: The business MUST have an event dictionary and outcome reporting for search, filter, product view, wishlist, cart, checkout, purchase, upload completion, ingestion failure, and key administrative outcomes.
- **FR-099**: Trust-boundary inputs MUST be validated, sensitive operations MUST fail safely, and abuse controls MUST cover authentication, contact, upload, checkout, payment events, and exposed writes.
- **FR-100**: Credentials/private configuration MUST never be committed or displayed as plain values; missing, test, disabled, and production-ready status MUST be distinguishable.
- **FR-101**: The service MUST provide privacy-safe structured operational events, correlation references, health status, and actionable critical-journey alerts.
- **FR-102**: The business MUST have versioned data-change procedures, safe seed data, isolated environments, pre-release verification, controlled release, post-release smoke checks, and rollback instructions.
- **FR-103**: Documented procedures MUST cover backup, integrity verification, restore rehearsal, incident response, data rollback, payment activation, domain activation, and Owner recovery.
- **FR-104**: Missing external credentials/approvals MUST leave a capability explicitly disabled or in test mode while its validation, administration, documentation, and disabled-state experience remain complete.
- **FR-105**: Privacy-safe evidence MUST support reconciliation of orders, payments, inventory, returns, refunds, imports, ingestion, and sensitive staff actions.
- **FR-106**: Readiness reporting MUST distinguish build-complete, payment-ready, staging-operational, and launch-ready with evidence and unresolved external inputs.

#### Cross-journey trust and recovery

- **FR-107**: Product imagery MUST provide an ordered gallery with usable detail inspection, keyboard/touch controls, position and selection state, appropriate zoom behavior, and a missing-rendition fallback that never exposes protected originals.
- **FR-108**: Every production media asset MUST record an owned/licensed source and approval state; unapproved or expired media MUST be prevented from first publication and surfaced for scheduled/publication review.
- **FR-109**: Language and display-currency preferences MUST persist independently, and changing either MUST NOT mutate an accepted order’s language/currency snapshot or silently convert an unapproved price.
- **FR-110**: The public service MUST provide a contact form and verified support-email path with field limits, validation, abuse protection, applicable disclosure/consent, duplicate-safe submission, reference/status feedback, and recoverable notification failure.
- **FR-111**: Visitors MUST be able to view, grant, refuse, and withdraw optional cookie/analytics preferences; the current choice and applicable disclosure version MUST be recorded without blocking essential commerce.
- **FR-112**: Customer and staff session behavior MUST support expiry, revocation, sign-out from the current session, and documented recovery; protected requests from a revoked session MUST fail safely.
- **FR-113**: Return and contact evidence uploads MUST apply documented file/count/size limits, real-type and safety validation, private access, retention rules, useful rejection reasons, and removal from abandoned submissions.
- **FR-114**: Reporting and exports MUST apply role limits, defined time/currency context, personal-data minimization, explicit generation status, secure expiry, audit, and recoverable failure rather than exposing unbounded live downloads.

### Non-Functional Requirements

- **NFR-001 Accessibility**: Buyer and staff journeys MUST meet WCAG 2.2 AA outcomes including semantics, keyboard use, focus, labels, status announcements, non-color cues, contrast, touch targets, zoom/reflow, and reduced motion.
- **NFR-002 Responsive experience**: Journeys MUST remain complete at 390px, 768px, and 1440px with realistic Georgian, German, and Russian expansion and no clipped essential control or unintended overflow.
- **NFR-003 Progressive resilience**: Essential public information/navigation MUST remain meaningful when enhancement scripts fail; state changes MUST fail recoverably rather than appear successful.
- **NFR-004 Perceived speed**: Under the defined ordinary mobile profile, primary content MUST become usable within 2.5 seconds at p75, layout shift stay below 0.1, and interaction feedback appear within 200 ms at p75.
- **NFR-005 Interaction response**: At least 95% of normal-load search, filter, cart-review, and administrative list interactions MUST show a usable result or progress response within 1 second.
- **NFR-006 Reliability**: Accepted orders, confirmed payments, inventory effects, and refunds MUST not be lost or duplicated during tested retry, concurrency, dependency-failure, and delayed-event scenarios.
- **NFR-007 Privacy and security**: Personal data MUST be minimized, access-controlled, protected in transit and at rest, redacted from unnecessary logs, and retained under documented rules; raw card data MUST never enter ÉPOCA storage or logs.
- **NFR-008 Visual integrity**: Public and staff surfaces MUST follow `DESIGN.md` and Collector’s Index while keeping facts, navigation, actions, state, and accessibility clearer than atmosphere.
- **NFR-009 Media efficiency**: Public images MUST reserve layout space, use responsive renditions, preserve honest product color/proportion, and avoid materially oversized downloads.
- **NFR-010 Operational recoverability**: Critical failures MUST be diagnosable from privacy-safe evidence and documented rollback, restore, and reconciliation paths MUST be executable by intended staff.
- **NFR-011 Testability**: Every critical rule and acceptance journey MUST have repeatable verification at the lowest useful level plus complete journey coverage before its production gate passes.
- **NFR-012 Content integrity**: No generated, sample, translated, or editorial statement may appear as verified catalog/policy truth without defined human approval and source status.

### Key Entities

- **Locale and Translation**: Supported language plus a localized value with draft, assisted, reviewed, published, missing, and fallback status.
- **Currency and Money**: Enabled currency and exact minor-unit amount fixed to its business context.
- **Product**: Carpet identity, verified facts, publication state, price references, stock model, and relationships.
- **Product Translation**: Localized name, location, description, search text, alternative text, and discovery metadata with review status.
- **Collection and Merchandising Placement**: Curated grouping or ordered public placement with localization and timing.
- **Media Asset and Rendition**: Protected original, validation/provenance state, derived presentations, crops, alternative text, order, and relationships.
- **Ingestion Batch and Job**: Upload grouping, files, progress, processing stages, failures, retries, suggestions, and review readiness.
- **Assisted Suggestion**: Proposed content/classification with source or confidence, decision, editor, and preserved verified input.
- **Inventory Record**: Authoritative quantity, low-stock threshold, unique/stocked model, and availability.
- **Inventory Event and Reservation**: Adjustment, hold, release, sale, return, correction, reason, actor, and expiry.
- **Buyer and Customer Account**: Guest order identity or optional customer with consent, preferences, addresses, wishlist, and orders.
- **Address**: Saved editable address or immutable order-time delivery snapshot with country-aware fields.
- **Wishlist**: Anonymous or account-owned saved product set and merge history.
- **Cart and Cart Line**: Pending selection, quantity, displayed price context, discounts, and reconciliation state.
- **Discount**: Code/rule, eligibility, window, limits, combinations, redemptions, and deterministic effect.
- **Delivery Zone, Method, and Quote**: Countries/cart constraints, service level, charge, estimate, customs text, or manual quote.
- **Order and Order Line**: Immutable commercial record, buyer/delivery snapshot, totals, currency, state, items, policy context, and timeline.
- **Payment Attempt and Event**: Method-neutral initiation, provider/bank reference, exact amount, status, verification, idempotency, and reconciliation evidence.
- **Fulfillment and Shipment**: Auditable packing/shipping action, carrier/method, tracking/reference, state, and notice.
- **Cancellation and Return Request**: Eligibility, reason, evidence, communication, decision, inspection, state, and stock outcome.
- **Refund**: Full/partial monetary reversal, original-payment relationship, amount, status, idempotency, and reconciliation.
- **Content Entry and Redirect**: Localized service/editorial content, timing, metadata, navigation, and safe previous-to-current mapping.
- **Notification and Template**: Localized message, purpose, consent/transactional basis, delivery attempt, failure, and retry.
- **Staff Account and Role**: Owner or Manager identity, authentication assurance, active state, and authority.
- **Audit Event**: Privacy-safe sensitive action record with actor, time, target, source, result, reference, and summary.
- **Integration Configuration**: Secret-free status/capabilities for payment, email, assistance, analytics, monitoring, storage, hosting, and delivery services.
- **Consent Record**: Purpose, disclosure/version, choice, source, time, withdrawal, and optional tracking/communication relationship.

## Assumptions

- Georgia is the home market, Georgian is initially default, and GEL is accounting/default display currency.
- English, German, and Russian are equally supported public locales; language and currency remain independent.
- Worldwide delivery means configurable eligible countries plus an honest quote path, not instant service to every address.
- Guest checkout is the minimum purchase path; accounts are optional.
- Inventory supports unique carpets and multi-unit products.
- One internal payment model supports bank transfer and one initial Georgian acquirer; online methods appear only when merchant-enabled.
- Bank transfer becomes live only after real instructions are supplied; until then configuration/test status remains explicit.
- Final taxes, invoices, duties, delivery rates, policies, contacts, product facts, and licensed imagery require verified business input.
- Assisted drafting/translation reduces repetition but never auto-publishes or overrides verified truth.
- Owner has full authority; Manager has ordinary operational authority subject to FR-077.
- Collector’s Index is the visual authority; archived directions are not production themes.

## Dependencies and Activation Inputs

The approved master brief fixes Supabase as backend, Netlify as initial host, and the named GitHub repository as planning constraints. They are not public-interface requirements and must be resolved into architecture, environments, and verification in `plan.md`.

The following external inputs MUST receive safe configuration, validation, disabled/test states, and runbooks but MUST NOT be fabricated: production platform credentials; domain/DNS; registered entity, tax, invoice, and bank details; approved acquirer and merchant credentials; delivery zones, carriers, prices, estimates, and customs wording; reviewed policies; sender and support contacts; approved assistance, analytics, consent, monitoring, and alert destinations; verified products; and owned/licensed imagery.

## Explicit Non-Goals

- Cash on delivery.
- Showroom/warehouse pickup or point-of-sale operation.
- Multi-vendor marketplace behavior.
- Native mobile applications.
- Public reviews without verified-purchase and moderation capability.
- Multiple live online-payment gateways without a later approved resilience requirement.
- Automatic publication of unreviewed generated facts or translations.
- Fabricated production data, legal language, service promises, credentials, or merchant eligibility.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of representative first-time visitors can find a specified carpet and identify price, dimensions, material, availability, delivery behavior, and next action within 2 minutes unaided.
- **SC-002**: At least 95% of usability participants can complete an eligible guest bank-transfer order on first attempt in under 4 minutes after product selection.
- **SC-003**: Across concurrency, refresh, retry, delayed-event, and duplicate-submission tests, 100% of accepted orders have exactly one commercial record and inventory effect.
- **SC-004**: A trained Manager can upload a standard 12-image batch, recover one interruption, review media/drafts, complete required facts/translations, and publish in under 10 minutes excluding processing wait.
- **SC-005**: Reprocessing/resuming a completed image batch creates zero duplicate protected originals, renditions, or products.
- **SC-006**: In representative catalog data, 100% of published products pass fact, media, price, stock, delivery, translation, and discovery-readiness validation.
- **SC-007**: All languages pass discovery-to-order at 390px, 768px, and 1440px with no critical language mixing, clipped essential control, keyboard trap, or unintended overflow.
- **SC-008**: Tested public/admin surfaces have zero critical or serious automated accessibility violations and pass documented manual keyboard/semantic review.
- **SC-009**: Representative public pages meet p75 targets of usable primary content within 2.5 seconds, layout shift below 0.1, and interaction feedback within 200 ms under the defined mobile profile.
- **SC-010**: At least 95% of normal-load search, filter, cart-review, and admin-list interactions show a usable result or progress within 1 second.
- **SC-011**: Every Buyer, Manager, Owner, anonymous, and stale-session authorization test receives the expected result; zero protected records/actions are available to an unauthorized role.
- **SC-012**: Every exposed business record and protected media class has passing access-policy tests for all applicable roles and trusted operations.
- **SC-013**: 100% of valid, invalid, duplicate, replayed, delayed, and out-of-order payment test events produce expected final payment, order, stock, and audit outcomes without repetition.
- **SC-014**: 100% of accepted transfer, shipment, cancellation, return, and refund changes agree across staff view, buyer status, notification, stock where applicable, and audit.
- **SC-015**: Staff can reach any seeded order, product, customer, ingestion failure, low-stock item, return, or translation gap requiring action in at most three navigation actions.
- **SC-016**: A release cannot promote while format, type, rule, integration, access-policy, critical journey, accessibility, migration, build, or security gates fail.
- **SC-017**: Backup/restore rehearsal recovers representative catalog, media references, customers, orders, inventory, roles, and audit relationships with every integrity check passing.
- **SC-018**: For each simulated critical failure, the intended operator can identify the journey from a privacy-safe reference and reach the documented recovery action within 10 minutes.
- **SC-019**: Production review finds zero committed secrets, raw-card paths, unapproved live providers, invented business facts, or non-essential tracking before consent.
- **SC-020**: Every approved requirement and scenario maps to implemented work and repeatable evidence, with zero critical TODOs, disabled tests, disconnected production components, or silent failures in scope.
- **SC-021**: Final reporting accurately labels build-complete, payment-ready, staging-operational, and launch-ready and lists unresolved activation inputs with tested setup/verification procedures.
- **SC-022**: In supported browsers, 100% of tested grant, refusal, withdrawal, anonymous-to-account, and tracking-blocked consent cases produce the expected optional-tracking behavior without preventing a purchase.
- **SC-023**: Across valid, invalid, spam-limited, duplicate, and notification-failure contact tests, every accepted message receives exactly one reference and remains recoverable by staff without public or cross-customer exposure.
- **SC-024**: Across product, return-evidence, and contact-media tests, zero unapproved, unsafe, expired-license, or protected-original files become publicly accessible.
- **SC-025**: Across content lifecycle, localized fallback, managed navigation/redirect, contact/newsletter, and optional-consent tests, every accepted state change remains versioned and recoverable, no unreviewed critical copy is presented as approved, and no non-essential tracking runs before consent or after withdrawal.
