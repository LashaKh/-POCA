# Abuse-control matrix

Verified: 2026-08-26. Counters live in the server-only `rate_limit_windows` table and store only peppered/hash identifiers, never raw IP addresses or email addresses. Limits are atomic database increments and therefore work across concurrent Netlify instances.

| Boundary                              | Policy                   | Subject                                  | Safe failure                                                                             |
| ------------------------------------- | ------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Sign in                               | 10 / 15 min              | normalized email, server-peppered        | Generic credential response plus bounded retry metadata; no account enumeration          |
| Customer sign-up                      | 5 / hour                 | normalized email, server-peppered        | Generic verification response                                                            |
| Account recovery                      | 5 / hour                 | normalized email, server-peppered        | Always the same success-shaped response                                                  |
| Contact                               | 5 / 15 min               | privacy subject hash                     | Localized retryable rejection; database fingerprint deduplication remains active         |
| Product upload authorization          | 120 / hour               | authenticated staff profile hash         | No signed upload URL is issued                                                           |
| Upload completion/exposed staff write | 120 / 15 min             | authenticated staff profile hash         | Work is not queued twice; idempotent file state remains authoritative                    |
| Checkout review / accept              | 30 / 10 min; 10 / 10 min | guest secret hash                        | Localized cart/checkout error; order acceptance remains idempotent                       |
| Manual quote                          | 8 / hour                 | guest secret hash                        | Localized retryable result; request idempotency still applies                            |
| Return/cancellation request           | 8 / hour                 | customer, guest, or order ownership hash | Retryable localized result; no duplicate return is created                               |
| TBC payment events                    | 600 / min                | server-peppered source address           | HTTP 429 with `Retry-After`; signature and event-id replay checks still decide authority |
| Resend events                         | 600 / min                | server-peppered source address           | HTTP 429 with `Retry-After`; Svix signature/idempotency still decide authority           |
| Newsletter subscribe / withdraw       | 5 / hour; 10 / hour      | privacy subject hash                     | Localized retryable result; withdrawal remains proof-bound                               |

Authenticated administration commands also pass role, session, version, idempotency, validation, and audit boundaries. The generic `exposedWrite` policy is reserved for high-frequency authenticated writes where a domain-specific policy would add no useful distinction.

Rate limiting is defense in depth: it never replaces origin checks, RLS (row-level security), authentication, provider signatures, file validation, idempotency, or concurrency constraints.
