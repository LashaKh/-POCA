# US7 Cancellation, Returns, Refund, and Restock Evidence

Verified: 2026-08-26

## Quality result

| Gate                             | Result                                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Clean database contract          | PASS — 43 ordered migrations through 092; 11 pgTAP files and 506 assertions, including 63 return assertions            |
| Seed, generated types, and drift | PASS — safe 5,000-product seed, schema marker 092, matching generated types, and no local drift                        |
| Unit and integration             | PASS — full 44-file/168-test Vitest suite; return domain/UI tests and guest/account/private-evidence workflow included |
| Production build                 | PASS — Next.js production build generated 130 pages/routes                                                             |
| Browser journeys                 | PASS — complete refund/restock journey plus expired/ineligible/rejected exception journey                              |
| Accessibility/responsive matrix  | PASS — 5 browser/device projects, zero Axe violations, no overflow, and 44 px controls                                 |

## Requirement trace

| Requirement | Repeatable evidence                                                                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-086      | Versioned active return policies configure cancellation/return windows, reasons, evidence limits/types, and restock mode. Each request stores an immutable policy version/snapshot. The UI and readiness evidence explicitly label legal copy `draft_unapproved` until business/legal approval.                                            |
| FR-087      | Guest-proof and authenticated-account paths evaluate eligibility, select an order line/quantity, record reason/note, return a stable reference, upload permitted private images, and show localized status, messages, decision reason, and timeline. Cross-customer and wrong-proof access is denied.                                      |
| FR-088      | Manager-only commands request information, approve/reject with a buyer-visible reason, record transit/receipt, inspect every item, allocate bounded partial/full refunds, select restock outcome, issue provider-aware refunds, and apply inventory effects.                                                                               |
| FR-089      | Database transition rules and optimistic versions reject invalid/stale changes. Refund and restock links make retries idempotent. Outbox notifications, immutable events/decisions, audit events, dashboard counts, and cleanup jobs remain independent so a notification failure cannot reverse money or stock state.                     |
| FR-113      | The private `return-evidence` bucket accepts bounded JPEG/PNG/WebP objects only after actual magic-byte validation. Count/size/type policy is snapshotted; metadata is ownership-scoped; customer access uses short-lived signed URLs; removal and abandoned-object cleanup delete metadata and Storage objects.                           |
| SC-021      | This phase is accurately labeled build-complete in the local production-shaped environment, not staging-operational or launch-ready. Managed Supabase linking, Netlify linking, rotated disclosed credentials, real payment/email providers, domain activation, monitoring proof, and approved legal copy remain explicit launch blockers. |
| SC-022      | No optional-tracking claim is made by US7. Return flows do not activate analytics or require optional consent. The complete grant/refuse/withdraw tracking matrix remains owned by US10/T301–T325 and must pass before launch-ready status.                                                                                                |

## Security and transactional boundaries

- Forced RLS protects policies, requests, items, events, messages, evidence metadata, inspections, decisions, refund links, and restock links. Staff operations still require an authenticated active Manager or Owner at the command boundary.
- Guest access requires the accepted order's expiring proof; account access requires matching `customer_profile_id`. Service-role evidence reads occur only after an RLS-authorized order/request lookup.
- Evidence is validated from bytes, stored in a private bucket, and served only by five-minute signed links. A second customer cannot query its metadata or download the object directly.
- Hosted-payment refunds use the latest explicitly ordered payment attempt and the configured provider adapter. Bank-transfer refunds require a bounded external reference. Database effects remain idempotent in either mode.
- The buyer success receipt remains stable after submission; subsequent navigation loads the authoritative request. Manager sign-in scopes profile resolution to the authenticated token subject even when many profiles exist.

## Primary implementation and verification surfaces

- `supabase/migrations/202608250090_returns.sql` through `202608250092_returns_rls.sql`
- `features/returns/`, `components/returns/`, and `components/admin/returns/`
- `app/[locale]/order/[reference]/request`, `app/[locale]/account/returns/`, and `app/[locale]/admin/returns/`
- `emails/returns/` and the scheduled coordinator evidence cleanup
- `supabase/tests/database/070_returns.test.sql`
- `tests/unit/returns/`, `tests/integration/returns/return-workflow.test.ts`, `tests/e2e/returns.spec.ts`, and `tests/accessibility/returns.spec.ts`

## Decision

US7 is complete for the local production-shaped system. Returns and cancellations are private, stateful, auditable operations rather than informal support messages. Launch approval still depends on the managed-environment and legal/provider inputs listed under SC-021.
