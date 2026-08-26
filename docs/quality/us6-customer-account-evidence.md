# US6 Optional Customer Account Evidence

Verified: 2026-08-26

## Quality result

| Gate                            | Result                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Customer database contract      | PASS — 52 pgTAP assertions, including a repeat run against populated local state                                  |
| Unit and local integration      | PASS — 3 files, 10 tests for schemas, UI, isolation, merge replay, address/order snapshots, sessions, and privacy |
| End-to-end journey              | PASS — 1 stateful account lifecycle in a production build                                                         |
| Accessibility/responsive matrix | PASS — 5 browser/device projects, zero Axe violations, no overflow, 44 px controls                                |
| Recovery handoff                | PASS — Mailpit link exchange retains the recovery session on the canonical origin and accepts the new password    |

## Requirement trace

| Requirement | Repeatable evidence                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-067      | Guest wishlists persist behind an opaque server-held proof. Sign-in performs one idempotent cart/wishlist merge, suppresses duplicates, rotates the guest proof, and keeps the saved product after recovery.                                                              |
| FR-068      | The four-locale app provides sign-up, sign-in, verification guidance, existence-safe recovery, current/other/all-session sign-out, order history/detail, wishlist, and saved-address management.                                                                          |
| FR-069      | Forced RLS, self-scoped queries, guarded RPCs, and integration tests deny a second customer access to the first customer's addresses, wishlist, orders, and privacy requests.                                                                                             |
| FR-070      | Checkout copies delivery facts into immutable order-address rows. Updating the saved address does not mutate the accepted order snapshot; pgTAP and integration tests prove the original line remains.                                                                    |
| FR-071      | Existing Owner/Manager authorization remains separate from customer self-access. Staff-safe customer projections expose operational identity only; customers cannot enumerate staff or other customers.                                                                   |
| FR-072      | Settings record access, portable-export, correction, deletion, and consent choices as stateful requests. Deletion becomes a reviewed lifecycle state while legally required orders and financial evidence remain restricted and retained.                                 |
| FR-073      | Sign-up and recovery validate bounded inputs, recovery always returns a generic outcome, requests are rate-limited, and the canonical callback prevents recovery-cookie loss across hostnames.                                                                            |
| FR-109      | Locale and display currency persist on the customer profile. Accepted orders keep their own locale/currency and address/pricing snapshots; preference changes do not rewrite them.                                                                                        |
| FR-112      | Application sessions record assurance, device, activity, expiry, and revocation. Customer UI supports current, other, and all-session sign-out; revoked sessions fail the existing proxy and command checks.                                                              |
| SC-020      | T238–T258 map the approved account requirements to migrations, typed services, routes/components, database/unit/integration/browser/accessibility tests, and these evidence records. No disabled account test or disconnected account surface remains in the story scope. |

## Security and data boundaries

- Authentication lives in Supabase Auth; application profile, session, address, wishlist, merge, preference, and privacy state lives behind forced RLS.
- Anonymous wishlist/cart identifiers are opaque, HTTP-only, rotated after merge, and never accepted as raw database ownership.
- Account order claiming changes only validated ownership fields after a normal accepted checkout; price, currency, locale, address, consent, and line-item facts stay immutable.
- Recovery does not reveal whether an email exists. The browser journey proves the delivered link, callback exchange, password update, and subsequent sign-in.
- Merge evidence is append-only and keyed by customer plus idempotency hash. Its pgTAP assertion is scoped so repeated test runs remain valid after other customers use the system.

## Primary implementation and verification surfaces

- `supabase/migrations/202608250080_customer_accounts.sql` through `202608250082_customer_accounts_rls.sql`
- `features/customer/`, `features/wishlist/`, and customer paths in `features/auth/`
- `app/[locale]/account/` and `app/[locale]/auth/`
- `tests/unit/customer/`, `tests/integration/customer/customer-account.test.ts`, `tests/e2e/customer-account.spec.ts`, and `tests/accessibility/customer-account.spec.ts`

## Decision

US6 is complete for the local production-shaped system. Guest checkout remains fully available. Managed Supabase/Netlify staging, rotated credentials, and a real email provider are still required before launch approval.
