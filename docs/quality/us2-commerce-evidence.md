# US2 commerce requirement evidence

Date: 2026-08-25  
Status: local commerce slice complete; live banking/shipping values remain an explicit production activation gate

## Outcome

A guest can add a published in-stock carpet, retain the cart in an HTTP-only opaque guest context, review an authoritative quote, reserve inventory, accept a bank-transfer order exactly once, refresh the confirmation, and open it in another supported language. The browser never receives the Supabase service role or a stored guest-secret hash.

The local fixture is deliberately non-payable (`TEST BANK — NOT PAYABLE`). Production mode refuses fixture bank instructions.

## Evidence map

| Requirement                           | Implementation and proof                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-039–FR-043 cart and reconciliation | `guest_sessions`, `carts`, `cart_items`; service-only cart RPCs; version invalidation; cart/component/property tests; exact quote function                  |
| FR-044–FR-047 discount/tax/delivery   | versioned discount, tax, zone, method, and rate tables; deterministic minor-unit math; manual-worldwide quote fails closed                                  |
| FR-048–FR-052 guest checkout/order    | 15-minute locked reservations, immutable order snapshots, international address schema, no account dependency, guest proof recovery                         |
| FR-053–FR-057 payment and idempotency | configurable bank-transfer adapter; production fixture block; request/idempotency hashes; duplicate acceptance returns the original order                   |
| FR-058–FR-061 notification/recovery   | transactional outbox row, four localized escaped templates, local capture attempt, 90-day HTTP-only proof, scheduled checkout/transfer expiry               |
| SC-002/003                            | production browser journey passes product → cart → checkout → confirmation → refresh → German recovery                                                      |
| SC-013                                | 50 simultaneous authoritative reservations: 50 successes, 0 errors, p95 108 ms                                                                              |
| SC-014                                | browser/database assertion proves one active reservation and one captured notification for the accepted order; pgTAP proves release and immutable snapshots |

## Verification summary

- Database: **165 pgTAP assertions passed** across foundation, catalog, checkout, contention, stale price, changed country/total, expiry, RLS, and idempotency.
- Unit/property/component/integration: commerce minor-unit allocation, totals, delivery decisions, Unicode addresses, four templates, cart/checkout rendering, local guest rotation, and last-item contention.
- Browser: one complete bank-transfer purchase passed; confirmation survived refresh and locale change. Four non-owning projects were intentionally skipped to keep the stateful purchase single-owner.
- Accessibility/visual: 5 checkout and 5 empty-cart viewport/browser cases passed with no axe violations or overflow.
- Load: 50 concurrent checkout reservations passed at p95 108 ms.

## Production activation gates

- Replace fixture bank beneficiary/account/instructions with Owner-approved Georgian banking data.
- Configure live transactional email and verified sending domain.
- Configure real delivery zones/rates or a staff-reviewed worldwide quote workflow.
- Rotate the database password and service-role credential exposed in chat before any production launch.
