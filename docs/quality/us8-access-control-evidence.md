# US8 Access-Control Requirements Evidence

Verified: 2026-08-26

## Quality result

| Gate                           | Result                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Format, lint, and TypeScript   | PASS                                                                                                |
| Application tests              | PASS — 32 files, 132 tests                                                                          |
| Database tests                 | PASS — 9 files, 389 assertions                                                                      |
| Real Supabase Auth integration | PASS — Manager, Owner AAL1/AAL2, TOTP, protected action, revocation, export, redaction, maintenance |
| Browser journey                | PASS — Manager denial through Owner audit evidence                                                  |
| Accessibility matrix           | PASS — 5 projects, zero Axe violations, no unintended overflow, 44px controls                       |
| Security audit                 | PASS — dependency, secret, RLS, header/CSP, abuse, and authorization checks                         |

## Requirement trace

| Requirement | Evidence                                                                                                                                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-076      | Owner/AAL2 routes cover staff lifecycle, integration and setting metadata, audit, privacy/retention, session recovery, and protected exports.                                                                                             |
| FR-077      | Existing catalog, ingestion, collection, order, fulfillment, refund, and reporting commands use the Manager boundary; RLS denies Owner-only staff/audit/secret/irreversible work. Later operational areas inherit the same command guard. |
| FR-078      | Authorization is enforced by proxy, server layouts/actions, RPC assertions, grants, forced RLS, Storage policies, and direct-boundary tests.                                                                                              |
| FR-079      | Password sessions register server-side; every Owner admin login enters the TOTP MFA flow; sensitive pages and commands require AAL2.                                                                                                      |
| FR-080      | Database commands and the central denied-command wrapper record actor, action, entity, result, source, correlation ID, retention class, and safe summary.                                                                                 |
| FR-081      | Audit rejects forbidden credential/contact/address/IP keys, is append-only, applies defensive display/export redaction, and is readable only by Owner AAL2.                                                                               |
| FR-082      | Archive/disable is preferred. Protected action UI describes impact and alternative and requires an exact phrase plus reason; database commands require matching recent evidence.                                                          |
| FR-083      | Audit supports query/action/result/correlation filters, pagination, direct correlation links, empty states, and explicit export status. Existing order/catalog lists retain their richer stable views and sorting.                        |
| FR-084      | Existing catalog administration retains the four-locale draft/review/published/missing matrix under the newly enforced Manager boundary.                                                                                                  |
| FR-085      | Owner cards distinguish disabled, test, degraded, needs-configuration, and ready states without selecting any secret value.                                                                                                               |
| FR-100      | Secret values are absent from UI projections and repository scan; environment validation distinguishes provider modes and readiness.                                                                                                      |
| FR-112      | Sessions support expiry, database revocation, current/other/all sign-out, signed-out/session-ended views, generic recovery, and revoked-session rejection at proxy and command boundaries.                                                |
| FR-114      | Audit and catalog exports are role-scoped, bounded, asynchronous/status-bearing, private, expiring, formula-safe, and failure-bearing.                                                                                                    |
| SC-007      | Access surfaces pass the four route languages at 390/768/1440 without unintended overflow; wider end-to-end language journeys remain covered by their story suites.                                                                       |
| SC-008      | Five access-control projects have zero Axe violations and pass focus, control-size, table-region, and semantic checks.                                                                                                                    |
| SC-019      | The automated review finds no committed credential pattern; provider status never returns a secret; no raw-card path or tracking expansion was introduced.                                                                                |

## Files that carry the boundary

- supabase/migrations/202608250060_staff_security.sql through 202608250065_security_maintenance.sql
- features/auth/, features/audit/, features/privacy/, and features/operations/security-maintenance.ts
- app/[locale]/auth/, app/[locale]/admin/settings/, and app/[locale]/admin/audit/
- tests/integration/auth/authorization.test.ts, tests/e2e/admin-access.spec.ts, and tests/accessibility/admin-access.spec.ts

## Decision

US8 is complete for the local production-shaped system. Cloud launch remains intentionally closed until disclosed credentials are rotated and the same gates pass on managed Supabase and Netlify staging.
