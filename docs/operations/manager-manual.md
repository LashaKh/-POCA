# ÉPOCA Manager manual

Audience: day-to-day shop operators  
Last reviewed: 2026-08-26  
Authority: a Manager can run commercial operations but cannot change staff,
security/privacy retention, secret-status, protected audit, or production
release controls.

## Operating principle

The database is the shop’s ledger. Use the action provided on the record; do
not “fix” an order, payment, stock count, return, or publication by editing a
different table or by treating an email/screenshot as proof. If a result is
uncertain, leave it uncertain and escalate with its reference and correlation
ID.

## Start and end of shift

Start:

1. Sign in through `/<locale>/admin` on a trusted device.
2. Review the dashboard, open alerts visible to your role, overdue work,
   ingestion failures, pending bank transfers, unfulfilled orders, returns,
   manual quotes, and expiring exports.
3. Confirm the active locale and remember that content/product readiness is
   independent in Georgian, English, German, and Russian.
4. Record any handover item by its stable reference—not buyer PII—in the
   approved team channel.

End:

1. Finish or explicitly leave notes on leased/manual work; never leave an
   order marked fulfilled merely because a label was printed.
2. Reconcile actions completed during the shift against timelines and queues.
3. Sign out. Revoke an unfamiliar session from the session menu and notify the
   Owner immediately.

## Catalogue and product workflow

Use `/admin/products` for list, filters, saved views, bulk operations, exports,
and stock visibility.

For one product:

1. Create/open the product and use a stable SKU.
2. Enter only verified facts. Dimensions, material, construction, origin, age,
   pile, handmade status, provenance, condition, price, and stock are facts—not
   marketing guesses.
3. Maintain all four translations. A translation may remain draft; it must not
   be silently copied and presented as translated truth.
4. Add explicit GEL/USD/EUR prices as approved. Do not infer an exchange rate
   unless the configured rate snapshot is approved and the UI identifies it.
5. Set the stock model correctly: unique means at most one; stocked means the
   reasoned count is authoritative.
6. Review approved public renditions, alt text, rights/license state, and crop.
   Private originals are not storefront images.
7. Read readiness failures, correct them, preview, and publish/schedule only
   when the record passes. Use version/conflict recovery rather than
   overwriting a colleague’s change.
8. Use History to understand who changed what and why.

Bulk actions return partial results. Inspect every failed row; never assume the
whole selection succeeded. Catalogue exports are private and expire—download
only to an approved device and delete local copies under policy.

## Automated ingestion

Use `/admin/ingestion` for the preferred photo-to-draft path.

1. Start one batch for a coherent upload set and keep the files in the agreed
   naming/photo standard.
2. Let upload registration, checksum, byte/MIME/dimension inspection,
   deduplication, rendition generation, and job processing finish.
3. Retry only retryable failed jobs. A duplicate is reviewed, not uploaded
   repeatedly under a new filename.
4. In review, approve/reject media, set crop and alt text, attach rights
   evidence, and correct product facts/translations/prices/stock.
5. AI assistance, if enabled later, is drafting only. It cannot verify material,
   origin, age, authenticity, provenance, size, condition, price, or inventory.
6. Save the draft, resolve every readiness issue, preview, then publish through
   the normal catalogue command.

If an upload is interrupted, return to the batch. Registered completed files
remain authoritative; do not create a second product until duplicate/recovery
state is clear.

## Collections and merchandising

Use `/admin/collections` to create localized collection records, assign
products, select one featured item, and set an explicit order strategy.

- Only published, eligible products may appear publicly.
- Reordering is versioned; on conflict, reload and reapply the intended order.
- A scheduled collection is not public until the scheduler records successful
  publication. Check its event/evidence after the due time.

## Orders, bank transfers, payments, and fulfillment

Use `/admin/orders` and the individual order timeline.

1. Verify reference, accepted totals/currency/address snapshot, payment method,
   inventory state, delivery method, and timeline.
2. For bank transfer, match the bank statement/provider evidence to the exact
   reference, amount, currency, beneficiary, and received date. Buyer upload or
   message is supporting evidence, not settlement proof.
3. Approve/reject with a reason and idempotency key through the provided action.
   If evidence is incomplete, keep pending and contact the buyer through the
   approved channel.
4. For online payment, use provider reconciliation status. A return URL alone
   never proves payment. Leave timeouts/unknown callbacks uncertain until the
   durable provider event/reconciliation resolves them.
5. Fulfill only a confirmed, paid/approved order. Record shipment/carrier-safe
   reference and the actual transition.
6. Do not mark delivered without delivery evidence. Do not edit an accepted
   order snapshot; use the supported event/correction flow.

If the same action is retried, use the same idempotency key. If the outcome is
uncertain, do not invent a replacement action—escalate.

## Manual worldwide quotes

Use `/admin/quotes` for products/destinations that require a manual quote.

1. Check destination, item/delivery class, requested currency, expiry, and
   buyer-safe contact proof.
2. Obtain the approved carrier/delivery amount and customs responsibility text.
3. Enter amount, method, estimate range, expiry, and buyer message. Do not state
   duties/tax as guaranteed unless the approved rule says so.
4. Send/record the quote; acceptance creates only the supported commercial
   transition and does not prove payment.

## Returns and refunds

Use `/admin/returns` and the request timeline.

1. Confirm ownership/proof, eligible order line, request type, policy version,
   deadline calculation, reason, and evidence state.
2. Triage request, request safe additional information if needed, and record all
   buyer/staff messages on the case.
3. Inspect the physical item/evidence and record a structured inspection.
4. Make an approve/reject/partial decision with reason. Separate policy outcome
   from provider refund outcome.
5. Initiate/reconcile refund through the supported provider or approved manual
   process. Pending/uncertain is not refunded.
6. Restock once, only after the inspection/decision permits it. The linked
   restock event prevents double stock.

Private return evidence uses short-lived access. Do not download/share it
outside the case workflow.

## Content, navigation, redirects, contact, and consent

Use `/admin/content` for pages, journal entries, policies/disclosures, menus,
redirects, contact channels, and visitor contact work.

- Draft, preview with an expiring token, review each locale, then
  publish/schedule. A preview URL is private and temporary.
- Menus link only to approved internal/HTTPS targets. Check keyboard order and
  every locale after publishing.
- Redirects cannot loop. Confirm source, destination, status, locale, and
  expiry before activation.
- Contact submissions are private. Use the stable message reference and events;
  do not copy PII into audit notes or team chat.
- Newsletter consent is independent from contact/order communication.
  Withdrawal stops future optional sends.
- Do not change legal/policy meaning without Owner and qualified-reviewer
  approval.

## Delivery, currencies, markets, promotions, and return settings

Use the appropriate Settings/Promotions pages.

- Every rule has explicit enablement, effective window, version, priority, and
  reason.
- Test boundary subtotal, country/zone, delivery class, disabled currency, and
  expiry behavior in preview/staging before publication.
- A promotion is applied by the pricing engine; never promise a discount from
  draft admin state.
- Unsupported destinations/currencies remain unavailable or manual-quote; do
  not create a false checkout option.
- Return-policy changes require approved wording and a version/effective date;
  accepted orders retain their applicable snapshot.

## Reports, exports, and reconciliation

Use `/admin/reports` for bounded Asia/Tbilisi sales, payments, stock,
ingestion, returns, and operational metrics.

- Choose an explicit inclusive date range and GEL/USD/EUR.
- Metrics are operational aids; reconcile financial totals with provider/bank
  records and accounting rules before external reporting.
- Report/catalog/order exports are private, short-lived, row-bounded, and
  spreadsheet-safe. Share only through approved storage/access.

Daily reconciliation:

1. accepted orders vs payment/bank outcomes;
2. paid/approved orders vs fulfillment;
3. refunds vs provider/bank settlement;
4. reservations/restocks vs available inventory;
5. queued/failed notifications vs required buyer communication;
6. failed/scheduled content and ingestion work vs alerts.

## Incident escalation

Stop the affected workflow and contact the Owner for any suspected credential
leak, wrong-buyer access, payment/refund discrepancy, oversell, private-media
exposure, repeated provider event, missing audit trail, unapproved content, or
provider outage that creates uncertainty.

Provide: UTC time, environment, safe reference, correlation ID, expected vs
observed state, actions already attempted, and screenshots with PII removed.
Do not paste secrets, full addresses, raw webhook bodies, or evidence files.

Follow `docs/operations/runbooks/incident-rollback.md`; only the Owner controls
release rollback, staff/security recovery, and provider secret changes.
