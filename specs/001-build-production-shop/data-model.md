# Data Model: ÉPOCA Production Online Shop

**Date**: 2026-08-25  
**Database**: Supabase managed PostgreSQL  
**Authority**: `spec.md` requirements and `plan.md` boundaries

This document defines the logical schema. Migrations may split a table for policy or performance reasons, but must preserve these identities, constraints, transitions, and ownership boundaries.

## Shared Conventions

- Primary keys are UUIDs generated in the database unless an external immutable identifier is the natural subordinate key.
- Human references (`SKU`, order reference, return reference) are separate, non-secret, unique values and never authorize access by themselves.
- Mutable records use `created_at timestamptz`, `updated_at timestamptz`, and `version bigint` for optimistic concurrency.
- Archivable records use `archived_at`; deletion is reserved for data whose retention and relationships permit it.
- User/role references point to `auth.users.id` through application profile tables; external/provider identities remain separate strings.
- Money is `amount_minor bigint` plus `currency char(3)`, constrained to a safe non-negative business range. Rates/percentages use bounded integer basis points or explicit rational inputs, not binary floats.
- Measurements store numeric value plus unit, with normalized millimetres/grams used for comparisons and the original entered value retained when operationally useful.
- Locale is constrained to `ka | en | de | ru`; translation records are unique by `(entity_id, locale)`.
- States use database enum/check constraints and authorized transition functions. Pages never issue arbitrary state updates.
- Free-text/search fields have length limits. Every exposed table has explicit grants and RLS; tables without a safe browser consumer revoke `anon` and `authenticated` grants.
- JSONB is limited to versioned provider payload summaries, CMS block configuration, or structured metadata with validation; business-critical money, stock, roles, states, and relationships stay typed.

## Canonical State Types

| Type                  | Values                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staff_role`          | `owner`, `manager`                                                                                                                                                  |
| `publication_status`  | `draft`, `ready`, `published`, `unpublished`, `archived`                                                                                                            |
| `translation_status`  | `draft`, `assisted`, `reviewed`, `published`, `missing`                                                                                                             |
| `integration_mode`    | `disabled`, `fixture`, `sandbox`, `live`, `degraded`                                                                                                                |
| `job_status`          | `queued`, `uploading`, `processing`, `needs_review`, `failed`, `retrying`, `cancelled`, `complete`                                                                  |
| `reservation_status`  | `active`, `converted`, `released`, `expired`                                                                                                                        |
| `order_status`        | `pending_payment`, `payment_review`, `confirmed`, `processing`, `fulfilled`, `completed`, `cancelled`, `return_in_progress`, `closed`                               |
| `payment_status`      | `pending`, `bank_transfer_review`, `authorized`, `paid`, `failed`, `expired`, `cancelled`, `uncertain`, `partially_refunded`, `refunded`, `reconciliation_required` |
| `fulfillment_status`  | `unfulfilled`, `preparing`, `partially_shipped`, `shipped`, `delivered`, `exception`, `returned`                                                                    |
| `return_status`       | `requested`, `needs_information`, `approved`, `rejected`, `in_transit`, `received`, `inspected`, `refund_pending`, `refunded`, `closed`, `cancelled`                |
| `notification_status` | `pending`, `leased`, `sent`, `delivered`, `failed`, `bounced`, `cancelled`                                                                                          |
| `consent_choice`      | `granted`, `refused`, `withdrawn`                                                                                                                                   |

## Identity, Staff, Customer, and Consent

### `profiles`

One-to-one application profile for `auth.users`.

| Field              | Rule                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `id`               | PK and FK to `auth.users.id`, cascade only through controlled account deletion |
| `profile_kind`     | `customer` or `staff`; staff promotion is Owner-only                           |
| `display_name`     | optional, bounded; not used for authorization                                  |
| `locale`           | supported locale, default `ka`                                                 |
| `display_currency` | enabled ISO currency preference, default `GEL`                                 |
| `marketing_status` | derived convenience only; source is consent records                            |
| timestamps/version | standard mutable fields                                                        |

### `staff_members`

| Field                                          | Rule                                                           |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `profile_id`                                   | PK/FK to `profiles`; profile must be staff                     |
| `role`                                         | `owner` or `manager`                                           |
| `active`                                       | inactive staff denied by server and RLS                        |
| `mfa_required`                                 | true for Owner; configurable true for sensitive Manager access |
| `invited_by`, `activated_at`, `deactivated_at` | staff lifecycle/audit references                               |
| `version`                                      | optimistic staff-control concurrency                           |

Constraints prevent removing/deactivating/demoting the last active Owner through ordinary operations. Role changes update protected auth app metadata and revoke affected sessions transactionally through the staff command path.

### `customer_addresses`

Customer-owned saved address: label, recipient name, organization, country code, administrative area, city/locality, postal code when applicable, lines, phone, delivery instructions, default flag, timestamps/version. Unique partial index allows one default address per customer. Historical orders never reference this row as mutable truth; they copy a snapshot.

### `guest_sessions`

Opaque guest identity for cart/wishlist/checkout: UUID PK, hashed secret, created/last-seen/expiry, locale/currency, merge target, revoked timestamp. The raw high-entropy secret exists only in a Secure HttpOnly SameSite cookie. Rotation/merge is transactional.

### `app_sessions`

Application control record keyed by the Supabase authentication session identifier: profile, assurance level last observed, created/last-seen, user-agent summary, IP prefix hash when approved, revoked time/reason, and actor. Middleware/server commands deny revoked staff/customer sessions. Retention is short and documented.

### `consent_records`

Append-only: subject (`profile_id` or `guest_session_id`), purpose (`analytics`, `newsletter`, `marketing`, future approved purpose), choice, disclosure version, locale, source, timestamp, and superseded record. Exactly one subject type is present. A projection yields current choice; withdrawal never deletes evidence required to prove the choice.

## Catalog, Translation, and Merchandising

### `products`

| Field group             | Fields / rules                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity                | `id`, unique case-insensitive `sku`; SKU reuse after archive remains prohibited by default                                                                                                 |
| Workflow                | publication status, readiness result/version, scheduled/published/unpublished/archived timestamps, `version`                                                                               |
| Physical truth          | width/length/diameter normalized millimetres as applicable, entered unit/value, shape, material, construction, dominant colors, style, condition, care code/text reference, delivery class |
| Optional verified facts | origin, age/year range, pile, handmade flag, provenance summary; each nullable and accompanied by source/verification metadata where necessary                                             |
| Catalog                 | primary media asset, category, search visibility, structured-data eligibility                                                                                                              |
| Audit                   | creator/updater/reviewer/publisher references and timestamps                                                                                                                               |

Checks enforce positive measurements, compatible shape/dimension fields, required verification for truth-sensitive optional claims, and complete readiness before `published`.

### `product_translations`

Product, locale, slug, name, short/long description, care text, search document source, SEO title/description, localized alternative-text readiness, status, assisted-source indicator, reviewer/publisher, timestamps/version. Unique `(locale, slug)` for public-capable rows and `(product_id, locale)`. Critical public checkout labels remain in versioned interface messages rather than product fallback.

### `product_prices`

Product, currency, amount minor, market code nullable, active interval, enabled flag, source (`explicit`, approved provider rate snapshot), source reference, version. Unique active price per `(product, currency, market)`; no implicit conversion. Accepted orders copy the chosen price.

### `collections` and `collection_translations`

Collection identity/type, status, schedule, hero media, order strategy, timestamps/version; translations contain locale slug/name/description/SEO/status. Unique locale slug. `collection_products` joins product to collection with position, featured flag, active interval, and uniqueness.

### `tags`, `tag_translations`, `product_tags`

Canonical tag identity/type and localized labels/slugs. Junction uniqueness prevents duplicates. Only configured filter-visible tag types enter public facets.

### `product_relations`

Directed `(source_product, target_product, relation_type, position)`. No self relation; unique tuple. Public query excludes unpublished target products.

### `merchandising_slots`

Named placement, locale/market applicability, linked product/collection/content, position, active interval, status, version. A database constraint permits exactly one target type.

## Media and Automated Ingestion

### `media_assets`

Identity, owner entity/purpose, original private bucket/path, checksum/algorithm, actual MIME, byte size, pixel dimensions, orientation, protected status, approval status, license record, upload actor, processing recipe version, timestamps/version. Checksum plus purpose scope prevents duplicate protected originals; no public URL is stored for originals.

### `media_licenses`

Asset, ownership basis (`owned`, `licensed`, `generated`), creator/source, evidence/private reference, usage URL, territory/expiry nullable, approval actor/time, status. Publication queries require active approved status.

### `media_variants`

Asset, recipe version, role (`catalog_square`, `card_4x5`, `gallery_3x4`, `editorial_16x9`, `og`, `thumbnail`, `placeholder`), format, width/height, crop/focal coordinates, public/private bucket/path, checksum, byte size, status. Unique `(asset, recipe_version, role, format, width)` makes retries idempotent.

### `media_links`

Asset, entity type/id, purpose, position, locale nullable, primary flag, alternative text/translation reference, approved crop version. Unique ordered position per entity/purpose; partial unique primary per entity/purpose.

### `ingestion_batches`

Product nullable until draft creation, creator, optional grouping hint, status, total/completed/failed counts, resumed timestamp, error summary, timestamps/version.

### `ingestion_files`

Batch, client file identity, original name, hinted SKU/order, upload fingerprint, TUS/storage path, expected/actual bytes and MIME, checksum, linked media asset, status, progress, failure code, retry count, timestamps. Unique batch/client identity and safe storage-path constraints.

### `media_jobs`

File/asset, job type, recipe version, status, attempt/max attempts, lease owner/expiry, next attempt, progress stage, privacy-safe error code/summary, correlation ID, queued/started/completed times. Durable queue message contains this ID only. Unique active job by `(asset, job_type, recipe_version)`.

### `assisted_suggestions`

Product/batch, provider, model snapshot, schema/prompt version, field path, locale nullable, proposed JSON value, source inputs summary (no image bytes), confidence/source status, review decision, reviewer, timestamps. Suggestions never update verified product fields without an explicit review command; raw provider responses have short restricted retention if stored at all.

## Inventory

### `inventory_items`

One per sellable product: stock model (`unique`, `stocked`), on-hand quantity, reserved quantity, available generated/validated quantity, low threshold, version. Checks keep quantities non-negative and unique model on-hand ≤1.

### `inventory_events`

Append-only product/inventory item, event type (`opening`, `adjustment`, `reservation`, `release`, `sale`, `return`, `damage`, `correction`), signed quantity delta, resulting quantity snapshot, reason, order/reservation/return reference, actor/system source, idempotency key, timestamp. Unique idempotency key per effect.

### `inventory_reservations`

Cart/order/product, quantity, status, expiry, converted/released times/reason, idempotency key. Partial unique active reservation rules plus row locks prevent the available quantity becoming negative. Expiry worker calls the same release function as manual cancellation.

## Wishlist, Cart, Pricing, Delivery, and Checkout

### `wishlists` and `wishlist_items`

Wishlist belongs to exactly one customer or guest session. Items use `(wishlist, product)` uniqueness, added timestamp, and unavailable/published status resolved at read. Merge locks both lists, inserts missing items, records `wishlist_merge_events`, and revokes the guest list.

### `carts` and `cart_items`

Cart belongs to exactly one customer or guest session and has locale, display currency, status (`active`, `converted`, `abandoned`, `expired`), expiry, version. Items store product, requested quantity, last-presented price/currency/version and added/updated time; these are not authoritative acceptance values. One active cart per subject. Accepted checkout snapshots into the order transaction.

### `discounts`

Code normalized unique, status, type (`fixed`, `percent`, `free_shipping`), currency/amount or bounded basis points, active interval, total/per-customer limits, minimum amount, combination policy, first-time/customer eligibility, version. `discount_products`, `discount_collections`, and `discount_markets` define scope. `discount_redemptions` joins discount/order/customer or guest, amount, status, and unique idempotency effect.

### `tax_rules`

Named rule, market/country, tax category, inclusive/exclusive display, bounded basis points or explicit zero, priority, active interval, version. Production enablement requires reviewed legal source/status. Accepted order stores calculated tax lines and source version.

### `shipping_zones`, `shipping_zone_countries`, `shipping_methods`

Zone has name, priority, enabled flag, version; country membership is unique and overlap is rejected unless explicit priority behavior passes validation. Method stores service level, localized labels, delivery-class eligibility, estimate range/unit, tracking expectation, enabled flag, and version.

### `shipping_rate_rules`

Method, currency, rule type (`flat`, `order_value`, `weight`, `dimension`, `manual_quote`), bounded min/max inputs, amount minor, free threshold, priority, active interval/version. Validation rejects ambiguous overlapping ranges at publish/enable time.

### `delivery_quotes`

Cart/order, contact/address snapshot, requested products, status (`requested`, `quoted`, `accepted`, `expired`, `declined`), quoted method/amount/currency/estimate, expiry, staff notes/private, buyer message, version. Quote acceptance revalidates cart/product/stock and never mutates an accepted order silently.

## Orders, Payments, Fulfillment, and Returns

### `orders`

| Field group | Fields / rules                                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity    | UUID PK, unique non-secret order reference                                                                                                    |
| Ownership   | customer nullable, guest contact proof hash, cart source                                                                                      |
| Snapshot    | locale, market, charged currency, product subtotal, discount, tax, delivery, grand total in minor units; tax/duties/policy version references |
| State       | order, payment-summary, fulfillment-summary statuses; accepted/version timestamps                                                             |
| Contact     | email and phone encrypted/protected as approved; normalized hashes only when needed for lookup                                                |
| Operations  | correlation ID, internal risk/reconciliation flags, timestamps/version                                                                        |

Totals satisfy `grand_total = subtotal - discount + tax + delivery + other_explicit_adjustments` and each component is non-negative unless its adjustment type explicitly permits a signed amount.

### `order_lines`

Order, position, product identity, SKU/name/facts/primary rendition snapshot, unit price, quantity, line discount/tax/total, delivery class. Immutable after acceptance. Unique `(order, position)`.

### `order_addresses`

Immutable order/billing-or-delivery address snapshot with country-aware fields and disclosure version. Exactly one delivery address per shippable order.

### `order_adjustments`

Order/line nullable, type (`discount`, `tax`, `delivery`, `manual_correction`, `refund_allocation`), label/code, signed amount, currency, source/version, actor/reason. Accepted pricing adjustments are immutable; later correction requires an auditable compensating record.

### `order_events`

Append-only order timeline: event type, previous/new status where applicable, actor/source, privacy-safe public message key and internal summary, correlation/idempotency keys, timestamp. Public views expose only approved buyer-visible events.

### `payment_attempts`

Order, internal method (`bank_transfer`, `tbc`), provider mode, amount/currency, status, merchant idempotency/reference, provider payment ID encrypted/restricted as needed, initiation/expiry/final times, reconciliation flag, version. Unique merchant reference and one active attempt per configured retry rule.

### `payment_events` and `webhook_receipts`

Payment event is append-only normalized provider/bank event with external event/payment ID, observed provider status, amount/currency, authenticity method/result, provider timestamp, receipt hash, processing result, correlation, created time. Receipt stores provider, unique delivery identity/hash, headers allowlist, raw payload in short-retention restricted storage only if operationally required, response/result, replay count. Unique provider event/delivery IDs prevent duplicates.

### `bank_transfer_reviews`

Payment attempt, submitted reference/evidence asset nullable, observed amount/currency/date, decision (`pending`, `matched`, `mismatch`, `rejected`), reviewer/reason/time, version. Only a matched review may call the paid transition; evidence remains private.

### `refunds`

Order/payment attempt, unique reference, amount/currency, reason, requested/approved/processed actors and times, status (`pending`, `processing`, `succeeded`, `failed`, `uncertain`, `cancelled`), provider refund ID, idempotency key, allocations. Sum of succeeded/pending-safe refunds cannot exceed captured amount.

### `fulfillments` and `shipments`

Fulfillment groups order lines/quantities and preparation state. Shipment stores fulfillment, carrier/method, tracking/reference, shipped/delivered/exception timestamps, status, public tracking URL only after allowlist validation, actor/version. Line quantity across fulfillments cannot exceed ordered quantity. `shipment_events` preserves carrier/manual events and notice state.

### `cancellation_requests`

Order, requester, reason/notes, eligibility snapshot, status, decision/reason/actor, inventory/payment effects, timestamps/version. Approval calls the order cancellation function, reservation release, and refund initiation as one controlled workflow.

### `return_requests`, `return_items`, `return_events`

Return has unique reference, order/customer, policy version, reason/notes, status, eligibility/decision, receipt/inspection, refund/restock summary, timestamps/version. Items identify order line and quantity with condition, restock decision, refund amount allocation. Evidence uses private media links. Transitions are append-only events; total return quantity cannot exceed delivered less previously accepted return quantity.

## Content, Communication, Reporting, and Operations

### `content_entries` and `content_translations`

Typed entries (`page`, `journal`, `faq`, `homepage_section`, `menu`, `footer`, `policy`), status, schedule, schema version, placement, media links, timestamps/version. Translation contains locale slug/title/summary/body blocks/SEO/status/reviewer. Body blocks are allowlisted/versioned and sanitized; critical policies carry reviewed version and activation readiness.

### `redirects`

Locale, source path unique, destination path, status code constrained to approved permanent/temporary values, active interval, creator/version. Validation rejects external destinations unless approved, loops, chains beyond one managed hop, private targets, and locale ambiguity.

### `contact_requests`

Unique reference, locale, email/contact fields, subject/category, bounded message, consent/disclosure version, customer/guest nullable, status, assigned staff, resolution, spam/rate-limit signals, timestamps/version. Evidence assets are private and constrained. Public submit idempotency prevents duplicates.

### `newsletter_subscriptions`

Normalized email hash/secured address, locale, status (`pending`, `subscribed`, `unsubscribed`, `suppressed`), consent record, verification/source, provider contact ID, timestamps/version. Marketing send requires active consent and non-suppressed status.

### `notification_templates`, `notifications`, `notification_attempts`

Template key/locale/channel/version, subject/body, status/review. Notification outbox stores domain event, recipient reference, template/version, variable allowlist, idempotency key, state, schedule/lease; attempts store provider ID, result/error code, times. Accepted order transaction inserts outbox row; sending is asynchronous.

### `integration_configs`

Provider key, mode/status, supported capabilities/currencies/methods, public metadata, last check, last error code, updated actor/version. Secret values are never stored here; only environment/secret-manager presence and non-secret identifiers.

### `business_settings`

Versioned typed setting records for business identity, locale/currency defaults, bank instructions, checkout deadlines, policy versions, retention, tax display, contacts, and feature flags. Values have per-type schemas and activation status; secret material is prohibited.

### `idempotency_keys`

Scope, key hash, subject, request hash, status, response reference/summary, expiry, timestamps. Unique `(scope, key_hash)`; replay with a different request hash is rejected.

### `audit_events`

Append-only actor/profile/role/assurance, action, entity type/id, outcome, source, before/after allowlisted summary, correlation/request ID, IP/user-agent summaries under approved retention, timestamp. Insert through controlled functions; no ordinary update/delete grant.

### `analytics_events`

Consent-eligible named event, anonymous rotating subject or customer pseudonym, session, locale/currency, allowlisted properties, occurred time, provider-delivery status. No address, name, email, free text, product image, payment payload, or secret. Essential operational events remain separate and do not depend on analytics consent.

### `export_jobs`

Requester/role, export type, filter/time/currency context, status, private output path, expiry, row count, error code, lease/attempts, created/completed/downloaded times. Owner-only for sensitive exports; signed downloads expire; access/downloads are audited.

### `operational_alerts`

Alert type/severity, entity reference, dedupe key, status (`open`, `acknowledged`, `resolved`), first/last seen, count, assignee, resolution, correlation. Dashboard summaries link to these records or their owning work list.

### `scheduled_actions`

Action type (`publish`, `unpublish`, `reservation_expiry`, `payment_expiry`, `quote_expiry`, `discount_expiry`, `notification_retry`, `retention`, `export_expiry`, `job_recovery`, `alert_evaluation`), target type/ID, due time in UTC, business-timezone source, status (`pending`, `leased`, `complete`, `failed`, `cancelled`), attempt/max attempts, lease owner/expiry, idempotency key, correlation ID, result/error code, timestamps. Unique active `(action_type, target_type, target_id, due_at)` prevents duplicate effects; the coordinator calls the normal domain function rather than updating target state directly.

## Transactional Database Functions

All use server-validated inputs, set a local correlation/actor context, authorize again in SQL, write audit/events, and return repository-owned result types.

| Function                             | Atomic responsibility                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `create_or_merge_guest_context`      | Create/rotate guest session and safely associate one cart/wishlist                                                            |
| `merge_customer_guest_data`          | Merge wishlist/cart at sign-in and revoke guest ownership without duplicates                                                  |
| `publish_product`                    | Lock product, validate readiness/translations/media/license/price/stock/delivery, publish, audit, enqueue revalidation        |
| `adjust_inventory`                   | Validate reason/role/version, apply bounded quantity change, append event/audit                                               |
| `reserve_checkout`                   | Lock items/discount usage, reprice/revalidate delivery/tax/stock, create/refresh reservations, return review result           |
| `accept_order`                       | Idempotently convert cart/review into immutable order/lines/address/adjustments, reservations, payment attempt, events/outbox |
| `expire_reservations`                | Lease expired active reservations, release stock once, update affected orders/payments, alert as needed                       |
| `transition_payment`                 | Validate normalized event/allowed transition/amount/currency, apply once, update order/reservation, outbox/audit              |
| `review_bank_transfer`               | Record review and call the appropriate payment transition without duplicate effects                                           |
| `transition_order`                   | Apply permitted operational state transition, timeline, audit, and notification                                               |
| `record_fulfillment`                 | Validate line quantities, create shipment/action, move fulfillment state, notify                                              |
| `transition_return`                  | Enforce return lifecycle, inspection/restock/refund prerequisites, timeline/audit/outbox                                      |
| `apply_return_inventory`             | Restock/damage effect once from inspected return item                                                                         |
| `request_refund` / `finalize_refund` | Bound cumulative amount, create provider work, reconcile one final money/order state effect                                   |
| `claim_outbox` / `complete_outbox`   | Lease bounded pending notifications/events and record retry-safe outcome                                                      |
| `claim_job` / `complete_job`         | Lease/checkpoint durable worker jobs and archive/retry safely                                                                 |
| `record_sensitive_command`           | Central allowlisted audit insertion for actions not covered by a domain transition                                            |

## State Transition Rules

### Product

`draft -> ready` only after readiness validation; `ready -> published` only with current human review; `published -> unpublished`; `unpublished -> published` after revalidation; any non-sold administrative record may archive under relationship checks; restore returns to `draft`/`unpublished`, never directly public.

### Reservation

`active -> converted | released | expired`; terminal states never return to active. A new reservation is a new identity. Conversion and release each have one inventory event.

### Payment

`pending -> bank_transfer_review | authorized | paid | failed | expired | cancelled | uncertain`; `bank_transfer_review -> paid | failed | expired | cancelled | reconciliation_required`; `authorized -> paid | cancelled | expired | uncertain`; `paid -> partially_refunded | refunded | reconciliation_required`; `partially_refunded -> partially_refunded | refunded | reconciliation_required`; uncertain/reconciliation states resolve only from authoritative evidence and never repeat effects.

### Order

`pending_payment -> payment_review | confirmed | cancelled`; `payment_review -> confirmed | cancelled`; `confirmed -> processing | cancelled`; `processing -> fulfilled | cancelled where eligible | return_in_progress`; `fulfilled -> completed | return_in_progress`; `completed -> return_in_progress | closed`; return completion moves back to completed/closed based on remaining items and money. Status summary is not used as the sole proof of payment or fulfillment.

### Return

`requested -> needs_information | approved | rejected | cancelled`; `needs_information -> requested | approved | rejected | cancelled`; `approved -> in_transit | received | cancelled`; `in_transit -> received`; `received -> inspected`; `inspected -> refund_pending | closed`; `refund_pending -> refunded | needs_information`; `refunded -> closed`. Every branch records reason/actor and validates order/quantity/policy.

## Authorization Matrix

| Data/operation                              | Anonymous           | Customer                           | Manager                                               | Owner                           | Trusted worker           |
| ------------------------------------------- | ------------------- | ---------------------------------- | ----------------------------------------------------- | ------------------------------- | ------------------------ |
| Published catalog/content/renditions        | Read                | Read                               | Read/manage                                           | Read/manage                     | Scoped                   |
| Guest cart/wishlist                         | Hashed guest proof  | Merge only                         | No ordinary access                                    | Audited support only            | Scoped expiry            |
| Customer cart/wishlist/address/order/return | No                  | Own only                           | Task-minimized read/manage                            | Audited full operational access | Scoped                   |
| Product/inventory/admin content             | Published read only | Published read only                | Operational CRUD/valid commands                       | All plus reserved actions       | Named job only           |
| Staff/roles/integrations/retention/exports  | No                  | No                                 | Own profile/status only; no secrets                   | Manage with MFA                 | Named status/job only    |
| Payment/refund/provider events              | No direct           | Own safe projection                | Operational safe projection/commands                  | Full safe projection/commands   | Webhook/reconcile scope  |
| Private originals/evidence/exports          | No                  | Own permitted evidence only        | Task-scoped signed access                             | Audited signed access           | Named processing scope   |
| Audit                                       | No                  | Own request-status projection only | Operational read excluding Owner-only secret metadata | Full privacy-safe read          | Insert only where named  |
| Queue/outbox/idempotency                    | No                  | No                                 | Status through owning UI only                         | Status through owning UI only   | Lease/update named queue |

RLS tests cover every row class and operation. Views use invoker security. Service role is never accepted from a browser and cannot replace application-level authorization in a worker.

## Indexing and Query Guarantees

- Unique/foreign-key indexes for every identity and relationship above.
- Partial indexes for published products/content, active carts/reservations/prices/discounts/jobs/outbox/alerts, and work queues by status/time.
- GIN full-text indexes per product translation; trigram indexes on normalized name/SKU/search fields; B-tree facet indexes on normalized product/price/inventory fields.
- Admin list composites follow measured filters such as `(status, updated_at desc)`, `(payment_status, accepted_at)`, `(job_status, next_attempt_at)`, and `(translation_status, locale)`.
- All list endpoints use stable cursor or bounded page pagination and deterministic secondary identity ordering.
- Query-plan fixtures use at least 5,000 products, four translations, media, stock, and representative orders; sequential scans on critical bounded paths require review, not blanket prohibition.

## Retention and Deletion Classes

Exact production durations require legal approval, but behavior is implemented by class:

1. **Commercial/legal record**: orders, payment/refund evidence, invoices/policies, essential audit; restricted retention with deletion exception reporting.
2. **Operational recovery**: jobs, outbox attempts, webhook receipts, correlation logs; short configurable retention after reconciliation.
3. **Customer convenience**: saved addresses/wishlists/preferences; deletable on verified request except referenced order snapshots.
4. **Consent proof**: retained as needed to prove grant/refusal/withdrawal; no marketing after withdrawal.
5. **Media**: public approved renditions while referenced; private masters under catalog/license policy; abandoned upload/evidence cleanup after configured period; exports expire quickly.
6. **Analytics/monitoring**: minimal pseudonymous fields and provider retention configured before activation.

Deletion jobs first produce a dry-run count and exceptions, then use Storage APIs for objects and database functions for metadata so no billed orphan is created by direct storage-schema deletion.
