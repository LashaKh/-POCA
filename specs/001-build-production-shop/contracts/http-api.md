# HTTP and Command Contracts

**Version**: `v1` internal contract  
**Audience**: Next.js pages/actions, provider callbacks, background workers, and integration tests

Most same-origin UI mutations use typed Server Actions. This document defines the stable request/result semantics they share and the explicit HTTP routes required for webhooks, health, signed operations, or job triggers.

## Common Rules

- Every state-changing command validates input, resolves locale, authenticates guest/customer/staff context, authorizes the specific operation, and uses an idempotency key when retry can repeat an effect.
- Browser commands use Secure HttpOnly SameSite cookies and same-origin validation. Webhooks use their provider verification procedure and never inherit browser cookies.
- Success/failure is determined only by the authoritative command result. A redirect, toast, or provider-return page does not change money/order state.
- Request and response logs include correlation ID, route/command name, actor class, outcome, duration, and safe error code only.
- All bodies and query values have explicit byte/count/length limits. Unknown fields are rejected on commands unless the contract explicitly supports forward-compatible metadata.
- Dates are RFC 3339 UTC. Money is `{ amountMinor: integer, currency: "GEL" | "EUR" | "USD" }`.
- Public references are not secrets. Guest order detail requires a separate high-entropy proof delivered through the same browser/email context.

## Common Result Envelope

```ts
type CommandResult<T> =
  | { ok: true; data: T; correlationId: string }
  | {
      ok: false;
      correlationId: string;
      error: {
        code: string;
        messageKey: string;
        fieldErrors?: Record<string, string[]>;
        retryable: boolean;
        retryAfterSeconds?: number;
        currentVersion?: number;
      };
    };
```

No response contains stack trace, secret, raw provider payload, SQL detail, or another subject’s data.

## Storefront Commands

| Command               | Actor          | Idempotency        | Input / authoritative outcome                                                                                                       |
| --------------------- | -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `setPreferences`      | guest/customer | no monetary effect | Locale and enabled display currency; returns canonical locale URL and current preference snapshot                                   |
| `toggleWishlist`      | guest/customer | key recommended    | Product ID and desired saved boolean; returns merged list count/availability                                                        |
| `addCartItem`         | guest/customer | key required       | Product ID, quantity; returns current cart summary or unavailable/reconciliation error                                              |
| `updateCartItem`      | cart owner     | key required       | Cart item, desired quantity, cart version; returns repriced cart/version                                                            |
| `removeCartItem`      | cart owner     | key required       | Item and cart version; returns cart/version                                                                                         |
| `applyDiscount`       | cart owner     | key required       | Code and cart version; returns eligibility result and full calculated summary                                                       |
| `quoteDelivery`       | cart owner     | key required       | Validated country/address subset; returns eligible methods or manual-quote path                                                     |
| `reviewCheckout`      | cart owner     | key required       | Contact/address/delivery/payment selection and cart version; locks nothing permanently, returns authoritative review and expiry     |
| `acceptOrder`         | cart owner     | key required       | Review token/version and required consent; returns one order reference, guest proof as appropriate, payment continuation, and state |
| `requestCancellation` | order owner    | key required       | Order, reason/notes; returns request reference/status                                                                               |
| `requestReturn`       | order owner    | key required       | Order lines/quantities, reason/notes, private evidence IDs; returns return reference/status                                         |
| `submitContact`       | public         | key required       | Locale, verified contact fields, category/message, disclosure/consent, optional private evidence IDs; returns one contact reference |
| `setConsent`          | guest/customer | key required       | Purpose, grant/refuse/withdraw, disclosure version; returns current purpose choices                                                 |
| `requestNewsletter`   | public         | key required       | Email, locale, disclosure/consent; returns pending/active safe status without account enumeration                                   |

## Account and Authentication Commands

Supabase Auth owns credential verification. Application callbacks create/refresh `profiles` and `app_sessions`, then merge guest data transactionally.

| Command                   | Result                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `completeAuthCallback`    | Validates PKCE result and safe return path, creates app session, merges guest cart/wishlist, rotates guest cookie                       |
| `revokeSession`           | Customer/staff can revoke an owned application session; Owner staff changes can revoke target sessions; returns remaining session count |
| `requestDataAction`       | Creates access/correction/export/deletion request reference and identity-verification state                                             |
| `enrollMfa` / `verifyMfa` | Wrap Supabase factor flow and return current AAL; no raw TOTP secret is logged                                                          |

## Administrative Commands

All require active staff. Owner-only commands require `owner` and current `aal2`. Commands accept `expectedVersion` for mutable records.

| Command family          | Manager                                                                                | Owner-only subset                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Product/catalog/content | create/edit/duplicate/preview/readiness/publish/unpublish/archive/restore/bulk/import  | irreversible purge/export of sensitive complete data                                |
| Inventory               | adjustment/reservation review with reason                                              | destructive correction outside normal controls                                      |
| Ingestion/media         | create batch, upload auth, retry/cancel/review/crop/suggestion decision                | license override or protected-master exceptional export                             |
| Orders/payments         | notes, resend, transfer review, valid transitions, fulfillment, return/refund commands | exceptional correction and integration activation                                   |
| Customers               | task-minimized search/order support                                                    | broad export/retention/destructive request approval                                 |
| Settings                | delivery/tax/discount/content/translation/contact templates                            | staff, ownership, integration mode, secret-status, retention, production activation |

Conflict responses use `VERSION_CONFLICT`, include `currentVersion`, and never overwrite. Bulk/import returns a preview token and row results; commit requires the token, source checksum, and idempotency key.

## Upload Authorization

`POST /api/internal/uploads/authorize` is represented as a Server Action for same-origin staff UI but follows this contract:

```ts
type AuthorizeUploadInput = {
  batchId: string;
  clientFileId: string;
  fileName: string;
  declaredMime: string;
  sizeBytes: number;
};

type AuthorizeUploadOutput = {
  fileId: string;
  bucket: "product-originals" | "return-evidence" | "contact-evidence";
  objectPath: string;
  signedUploadToken: string;
  tusEndpoint: string;
  expiresAt: string;
  limits: { maxBytes: number; allowedMime: string[] };
};
```

The raw service key is never returned. Product uploads require staff; return evidence requires owned eligible return context; contact evidence is feature-flagged and bound to the draft contact proof.

## Explicit Route Handlers

### `POST /api/webhooks/tbc`

- Body: TBC-documented payment identifier only, strictly limited.
- Verification: method/body/IP allowlist where configured; callback is treated only as a hint. Fetch payment details using server credentials and compare merchant reference, amount, currency, known payment ID, and allowed state.
- Idempotency: receipt hash/provider payment status version plus normalized payment-event identity.
- Response: `200` after durable receipt even if reconciliation is queued; `400` malformed; `401/403` disallowed source when reliable; `429` abuse; `503` only if durable receipt cannot be recorded.

### `GET /api/payments/tbc/return`

Validates safe state/reference, never trusts query payment status, displays pending/reconciling/final result from ÉPOCA data, and provides order recovery. No state mutation from redirect parameters.

### `POST /api/webhooks/resend`

- Verify webhook signature using provider secret before parsing domain fields.
- Deduplicate `svix-id`; normalize delivery/bounce event; delivery order is not assumed.
- Update notification attempt/status and create suppression/alert where applicable.

### `GET /api/health`

Public response contains release, environment class, overall `ok | degraded`, and timestamp only. An authenticated Owner-only diagnostic variant includes database check, oldest queue/outbox age, and secret-free integration modes. It never performs a state mutation.

### `POST /api/internal/jobs`

Server-to-server/background trigger only. Requires a rotating internal signature and timestamp/replay window. Body contains queue name and optional maximum work count, never object bodies or secrets. A `202` means accepted, not completed.

## Pagination and Search

Public collection/search and admin lists use bounded `limit` (default 24 public, 50 admin; maximum 100) and a signed/validated cursor containing stable sort value plus identity. Page-number URLs may be exposed for crawlable collections but translate to the same bounded query. Filter parameters are allowlisted, canonicalized, and ordered for canonical URL generation.

## Error Code Families

| Family      | Examples                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------- |
| Validation  | `INVALID_INPUT`, `FILE_TYPE_INVALID`, `ADDRESS_INVALID`, `TRANSLATION_INCOMPLETE`           |
| Auth        | `AUTH_REQUIRED`, `MFA_REQUIRED`, `SESSION_REVOKED`, `FORBIDDEN`                             |
| Concurrency | `VERSION_CONFLICT`, `STOCK_CHANGED`, `PRICE_CHANGED`, `RESERVATION_EXPIRED`                 |
| Commerce    | `DISCOUNT_INELIGIBLE`, `DELIVERY_UNAVAILABLE`, `PAYMENT_DISABLED`, `ORDER_ALREADY_ACCEPTED` |
| Provider    | `PROVIDER_UNAVAILABLE`, `PAYMENT_UNCERTAIN`, `NOTIFICATION_PENDING`, `ASSISTANCE_DISABLED`  |
| Abuse       | `RATE_LIMITED`, `UPLOAD_REJECTED`, `CONTACT_REJECTED`                                       |
| Operations  | `JOB_RETRYING`, `RECONCILIATION_REQUIRED`, `CONFIGURATION_INCOMPLETE`                       |

Every code maps to localized human text at the UI boundary; stored domain state uses enums/codes, not translated text.
