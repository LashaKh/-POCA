# Provider Adapter Contracts

Provider SDKs and payloads stay inside `lib/providers/<provider>/`. Feature modules depend only on these contracts. All adapters implement `getStatus()` returning `disabled | fixture | sandbox | live | degraded`, supported capabilities, and a secret-free reason when unavailable.

## Shared Provider Error

```ts
type ProviderError = {
  code: string;
  retryable: boolean;
  uncertain: boolean;
  safeMessage: string;
  providerRequestId?: string;
};
```

`uncertain: true` means the external effect may have happened and reconciliation is required before retry.

## Payment Provider

```ts
interface PaymentProvider {
  getStatus(): Promise<PaymentProviderStatus>;
  initiate(
    input: PaymentInitiation,
  ): Promise<Result<PaymentContinuation, ProviderError>>;
  fetchStatus(
    providerPaymentId: string,
  ): Promise<Result<NormalizedPayment, ProviderError>>;
  cancel(
    input: PaymentCancellation,
  ): Promise<Result<NormalizedPayment, ProviderError>>;
  refund(
    input: PaymentRefund,
  ): Promise<Result<NormalizedRefund, ProviderError>>;
}
```

Inputs use internal order reference, idempotency key, exact money, locale mapping, return/callback URLs, and allowlisted line summaries. Outputs use normalized status; provider display strings are diagnostic metadata only.

### TBC mapping

- `KA` for Georgian; `EN` for English/German/Russian hosted checkout until TBC supports those locales. The ÉPOCA review page and return page remain fully localized.
- Currency is only `GEL | USD | EUR` and only when merchant-enabled.
- Method list is derived from Owner-approved capability configuration. Card may be default; Apple Pay, Google Pay, QR/BNPL, internet bank, and installment are never assumed enabled.
- Callback payment ID triggers `fetchStatus`; it does not itself prove success.
- Provider amounts are converted at the adapter edge from internal minor units with exact two-decimal rules and round-trip checked.
- Network timeout after initiation/refund is `uncertain`; reconcile by merchant reference/provider ID before any retry.

The fixture adapter covers success, failure, expiry, authorization if enabled, duplicate callback, delayed callback, amount/currency mismatch, unknown payment, cancel, full/partial refund, lost response, and out-of-order status.

## Email Provider

```ts
interface EmailProvider {
  getStatus(): Promise<EmailProviderStatus>;
  send(
    message: RenderedEmail,
    idempotencyKey: string,
  ): Promise<Result<EmailReceipt, ProviderError>>;
  verifyWebhook(
    headers: Headers,
    rawBody: Uint8Array,
  ): Result<VerifiedEmailEvent, ProviderError>;
}
```

- Templates render inside ÉPOCA from reviewed locale/version and allowlisted variables.
- `RenderedEmail` includes from key, recipient, reply-to key, subject, HTML, text, tags, and no arbitrary headers.
- The local adapter captures messages for preview/tests. Disabled mode leaves the outbox actionable; it never marks a message sent.
- Resend webhook `svix-id` is the dedupe key; delivery is at least once and not ordered.

## Assistance Provider

```ts
interface AssistanceProvider {
  getStatus(): Promise<AssistanceProviderStatus>;
  draftProduct(
    input: ProductDraftInput,
  ): Promise<Result<ProductDraftSuggestions, ProviderError>>;
}
```

`ProductDraftInput` contains product/batch reference, selected time-limited media inputs, verified structured facts with source flags, target locales, and prompt/schema version. It contains no customer/order/staff personal data.

`ProductDraftSuggestions` is schema-validated and includes suggestions for title, short/long description, search text, tags/colors/styles, alternative text, SEO, and translations plus provider/model/schema version and usage. It cannot include price, quantity, dimensions, material, construction, origin, age, condition, provenance, authenticity, artisan, or sustainability as verified values.

### OpenAI implementation

- Responses API with `gpt-5.4-mini-2026-03-17`, image inputs, strict JSON Schema Structured Output, `store: false`, bounded output, no tools, and a stable hashed safety identifier for the staff account when permitted.
- Incomplete, refused, malformed, rate-limited, timed-out, or unsafe output becomes a retryable/non-retryable suggestion-job state; it never changes product facts.
- Product images are sent only after Owner privacy/provider approval. Logs exclude images, prompts containing catalog-sensitive notes, and model output; retain only hashes/versions/usage/safe errors.
- A contract evaluation fixture checks forbidden-claim leakage, locale separation, schema conformance, alternative-text usefulness, and deterministic manual fallback.

## Analytics Provider

```ts
interface AnalyticsProvider {
  getStatus(): AnalyticsStatus;
  capture(event: ConsentedAnalyticsEvent): Promise<Result<void, ProviderError>>;
  identify?(subject: PseudonymousSubject): Promise<Result<void, ProviderError>>;
  reset(): void;
}
```

- `capture` is unreachable before current consent for optional analytics.
- Events and properties must exist in `contracts/events.md`; arbitrary free-form property bags are rejected.
- PostHog adapter disables autocapture and replay initially. Identify uses an internal pseudonym, never email/name/order address.
- Refusal/withdrawal calls `reset`, stops new capture, and follows approved deletion/retention behavior. Commerce never awaits analytics.

## Error Reporter

```ts
interface ErrorReporter {
  capture(error: unknown, context: SafeErrorContext): string;
  startSpan<T>(name: AllowedSpanName, work: () => Promise<T>): Promise<T>;
}
```

The no-op/local implementation returns the application correlation ID. The Sentry adapter uses PII-off defaults, allowlisted tags, configurable sampling, release/environment tags, and server/client scrubbers. It never records request bodies, cookies, authorization headers, addresses, contact messages, provider payloads, image/AI data, or secrets.

## Future Delivery-Rate Provider

No live carrier adapter is implemented initially because no carrier contract exists. The internal delivery calculator returns deterministic configured methods or `manual_quote`. A future adapter must accept a normalized cart/address/delivery-class snapshot and return expiring quotes; it must not change order totals after acceptance without buyer review.

## Contract Test Rule

Every live adapter shares the same conformance suite with its fixture adapter. The suite proves status handling, exact money, idempotency, timeout uncertainty, duplicate/out-of-order events, redaction, disabled-state behavior, and mapping of unknown provider values to `reconciliation_required` rather than silent success.
