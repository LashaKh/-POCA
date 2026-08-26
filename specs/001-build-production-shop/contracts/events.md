# Domain, Outbox, and Analytics Event Contracts

Events are versioned repository-owned facts. Provider events are normalized before entering these contracts. Event names never substitute for authoritative database constraints or current state.

## Common Envelope

```ts
type EventEnvelope<TName extends string, TPayload> = {
  id: string;
  name: TName;
  version: 1;
  occurredAt: string;
  correlationId: string;
  causationId?: string;
  actor: {
    kind: "guest" | "customer" | "manager" | "owner" | "system";
    id?: string;
  };
  entity: { type: string; id: string; reference?: string };
  payload: TPayload;
};
```

Payloads use IDs, safe status codes, exact money, counts, and message/template keys. They exclude credentials, cookies, raw provider bodies, addresses, emails, names, contact notes, images, AI prompts/output, and unrestricted text.

## Domain Events

| Event                                | Required payload                                                        | Consumers                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `catalog.product_published.v1`       | product ID, locales, collection IDs, price currencies, rendition recipe | route/cache revalidation, search projection, audit, analytics after consent |
| `catalog.product_unpublished.v1`     | product ID, reason code                                                 | cache/search removal, cart reconciliation, audit                            |
| `ingestion.batch_completed.v1`       | batch/product ID, file/job counts, duration, result                     | admin alert/dashboard, analytics after consent                              |
| `ingestion.job_failed.v1`            | job/media ID, stage/error code, attempt/next retry                      | alert/dashboard, monitoring                                                 |
| `inventory.low_stock.v1`             | product ID, available, threshold                                        | admin alert                                                                 |
| `inventory.reservation_expired.v1`   | reservation/product/order nullable, quantity                            | cart/order recovery, audit                                                  |
| `order.accepted.v1`                  | order ID/reference, payment method, exact totals, locale                | confirmation outbox, admin alert, analytics after consent                   |
| `order.status_changed.v1`            | order ID, previous/new status, reason key                               | buyer/staff timeline, notification where configured                         |
| `payment.status_changed.v1`          | payment/order ID, previous/new normalized status, exact amount          | order transition, notification, alert/reconciliation                        |
| `payment.reconciliation_required.v1` | payment/order ID, safe discrepancy code                                 | operational alert/dashboard                                                 |
| `fulfillment.shipped.v1`             | order/shipment IDs, carrier key, tracking-present flag                  | buyer notification, timeline                                                |
| `return.status_changed.v1`           | return/order ID, previous/new status, reason key                        | buyer notification, timeline                                                |
| `refund.status_changed.v1`           | refund/order/payment IDs, exact amount, previous/new status             | order summary, notification, reconciliation                                 |
| `contact.accepted.v1`                | contact ID/reference, category, locale                                  | support notification/dashboard                                              |
| `consent.changed.v1`                 | subject pseudonym, purpose, previous/current choice, disclosure version | analytics reset/start, consent audit                                        |

Domain events are inserted in the same transaction as their authoritative state effect. A unique causation/effect key prevents a retry from creating a second logical event.

## Notification Outbox Contract

```ts
type NotificationWork = {
  eventId: string;
  templateKey: string;
  templateVersion: number;
  locale: "ka" | "en" | "de" | "ru";
  recipientRef: string;
  variables: Record<AllowedVariableName, string | number | boolean>;
  idempotencyKey: string;
  notBefore?: string;
};
```

- Recipient resolution happens in the trusted worker; the event payload does not carry the address.
- Variables are allowlisted per template and escaped/rendered as both HTML and text.
- Order acceptance is successful once the outbox is durable, not once provider delivery succeeds.
- Retries reuse the same provider idempotency key. A delivery webhook updates attempts but does not resend unless an authorized retry command creates/leases work.

## Worker Queue Contract

Queue messages contain only:

```ts
type JobMessage = {
  jobId: string;
  jobType: "media" | "assistance" | "notification" | "export" | "maintenance";
  recipeVersion: number;
  correlationId: string;
};
```

The worker loads all authoritative inputs after leasing the job. Unknown type/version is quarantined and alerted, not discarded. Completion archives the message only after job output and state are committed. Failure leaves/re-enqueues under capped exponential delay and records a safe code.

`maintenance` messages reference a `scheduled_actions` record whose allowlisted action is publication/unpublication, reservation/payment/quote/discount expiry, notification retry, retention cleanup, export expiry, job recovery, or alert evaluation. The worker calls the normal idempotent domain command and never treats queue delivery itself as completion.

## Consented Product Analytics

Only these initial names are accepted. Each event includes locale, display currency, route class, viewport class, release, and a rotating pseudonymous session when consented. IDs are catalog/order pseudonyms as noted, never personal data.

| Event                     | Additional allowlisted properties                                              |
| ------------------------- | ------------------------------------------------------------------------------ |
| `search_submitted`        | normalized length bucket, result-count bucket, mixed-script boolean            |
| `filter_changed`          | filter key, action add/remove/reset, active-count bucket                       |
| `product_viewed`          | product ID, collection/source key, availability code                           |
| `wishlist_changed`        | product ID, saved boolean, guest/account class                                 |
| `cart_changed`            | product ID, action, quantity bucket, reconciliation code nullable              |
| `checkout_started`        | item-count bucket, guest/account, destination region class                     |
| `checkout_step_completed` | step key, recoverable-error count bucket                                       |
| `order_completed`         | order pseudonym, payment method key, currency, value bucket, item-count bucket |
| `upload_completed`        | batch ID, file-count bucket, duration bucket, retry-count bucket               |
| `admin_outcome`           | operation key, entity type, success boolean, error-code class                  |

Search text, product descriptions, exact contact/order values, addresses, names, emails, payment IDs, free-form notes, image URLs, and staff identity are prohibited properties.

## Operational Metrics

Operational metrics do not require optional analytics consent because they describe service health without tracking buyer behavior:

- command duration/error count by safe command key;
- database function duration/conflict count;
- checkout acceptance and duplicate-prevention outcomes as aggregate counts;
- payment event validity/reconciliation counts;
- queue depth, oldest age, job duration/retry/failure by job type;
- outbox age, send failure, bounce count;
- HTTP status/error rate and Core Web Vitals aggregates without personal identifiers;
- release/build/migration/backup/restore outcome.

Labels are bounded; record IDs, paths containing IDs, URLs with queries, and arbitrary error messages are not metric labels.

## Versioning

- Additive optional payload fields may retain version 1 when all consumers ignore unknown fields.
- Removing/renaming a field, changing meaning/type, or changing privacy classification requires a new event version and dual-consumer migration.
- Producer and consumer contract tests run together. Unknown future versions go to an alert/reconciliation state rather than being treated as current.
