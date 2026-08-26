# ÉPOCA privacy and security threat model

Review date: 2026-08-26  
Method: asset/trust-boundary review with STRIDE-style spoofing, tampering,
repudiation, disclosure, denial-of-service, and privilege-escalation analysis  
Scope: storefront, customer/staff authentication, Supabase database/storage,
Netlify application/functions, provider callbacks, jobs, exports, CI, and
operational access

## Security objective

Protect buyers, staff, commercial state, and licensed media while preserving an
honest recovery trail. A failed or uncertain dependency must not create an
order, payment, refund, stock, email-delivery, or publication claim.

## Assets and sensitivity

| Asset                                                 | Classification           | Required property                                                                                   |
| ----------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| Staff identity, MFA, sessions, invitations            | Restricted               | Owner/Manager separation, revocation, AAL2 for Owner-sensitive operations, no credential disclosure |
| Buyer identity, addresses, contact, account recovery  | Confidential             | Customer/guest isolation, purpose limitation, short-lived proof tokens, redacted logs               |
| Orders, totals, payment/refund/reconciliation state   | Confidential/financial   | Immutable accepted snapshot, idempotency, exact provider evidence, no raw card data                 |
| Inventory and reservations                            | Commercially sensitive   | Atomic last-item protection, reversible reasoned adjustments, no negative/oversold state            |
| Product facts, prices, translations, publishing state | Internal until published | Verified-claim gates, optimistic versions, audit history, safe public projection                    |
| Originals, return evidence, exports, backups          | Restricted               | Private storage, signed short-lived delivery, explicit retention, least privilege                   |
| Audit, consent, policy versions                       | Restricted evidence      | Append-only or versioned, correlation, redaction, bounded retention/export                          |
| Service/provider keys and job signing secret          | Secret                   | Server-only storage, rotation, scoped access, never logged or committed                             |

## Trust boundaries

```text
Guest/customer/staff browser
        |
        | HTTPS, CSP, same-origin mutations
        v
Next.js / Netlify application and functions
        |
        | scoped anon/user JWT or server-only service command
        v
Supabase Auth + PostgREST + PostgreSQL + private/public Storage
        |
        +---- signed callbacks ---- TBC / Resend
        +---- consent-bounded ---- PostHog (optional)
        +---- redacted errors ---- Sentry (optional)
        +---- reviewed drafting -- OpenAI (optional)
        |
        +---- signed internal dispatch ---- scheduled/background workers

GitHub CI/release evidence -> Netlify/Supabase deployment boundary
Owner operations -> provider consoles, DNS, backups, incident response
```

The service-role key crosses only server/worker-to-Supabase boundaries. Public
clients receive the publishable key plus a guest or user-scoped proof; they do
not receive service credentials, private object paths, or provider secrets.

## Principal and authorization model

- Anonymous guests use unguessable, hashed cart/order/quote/contact proofs and
  see only their own bounded workflow state.
- Customers use Supabase Auth and row policies tied to `auth.uid()`; a second
  customer cannot read account, address, wishlist, order, return, or evidence
  data belonging to another customer.
- Managers can operate catalogue, ingestion, orders, transfers, fulfillment,
  returns, content, configuration, and reports, but cannot perform Owner-only
  access/security/privacy operations.
- Owners have Manager capability plus staff, audit, privacy/retention,
  integrations/operations, protected exports, and recovery controls. Sensitive
  routes require AAL2 (MFA).
- Provider and worker identities call narrow server routes/functions with
  signatures, replay keys, leases, and service-only grants. They are not human
  staff accounts.

## Threat and control register

| Threat                                   | Control and fail-safe behavior                                                                                                                                                                                                                                                                                       | Verification                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Credential theft/session replay          | HttpOnly/SameSite cookies, bounded application sessions, MFA for Owner-sensitive work, staff deactivation/session revocation, last-Owner protection, safe recovery. Disclosed launch credentials must be rotated before production.                                                                                  | Auth/admin browser tests; `080_authorization.test.sql`; credential gate in environment schema and activation register |
| Horizontal/vertical privilege escalation | Forced RLS on confidential tables, `auth.uid()` ownership policies, role-checked security-definer commands, Manager/Owner route guards, browser roles denied direct domain writes.                                                                                                                                   | pgTAP authorization suites; customer/return/staff E2E; static security audit                                          |
| CSRF/cross-site mutation                 | Browser writes use Next Server Actions with framework Origin/Host checks and SameSite cookies; signed webhook routes remain separate from browser commands. `isSameOriginRequest` is contract-tested for any future custom browser mutation route. Restrictive frame/CSP/COOP/CORP headers provide defense in depth. | `lib/security/headers.ts`; header tests; security workflow                                                            |
| XSS/content injection                    | React escaping, schema/length bounds, constrained content models, nonce-based CSP, no inline attribute scripts, formula-safe CSV export, redirect-loop/target validation.                                                                                                                                            | content tests; header tests; export/database assertions                                                               |
| SQL/filter injection                     | Supabase parameter binding/RPC parameters, Zod bounds, enum allowlists, no user-built SQL. Search wildcards remain data, not executable SQL.                                                                                                                                                                         | unit schemas, migration functions, pgTAP invalid-input cases                                                          |
| SSRF/provider URL abuse                  | Provider base URLs come only from server environment, canonical origin is validated, user input cannot select arbitrary fetch targets, storage paths reject traversal. Optional OpenAI receives reviewed image/data inputs rather than arbitrary URLs.                                                               | environment schema; storage-path tests; provider contract tests                                                       |
| Malicious/polyglot upload                | Server authorization before upload, UUID-derived private paths, byte size/type/dimension/checksum validation, registered-object completion, queued processing, approval/license/readiness gates. Browser filename and MIME claims are not authoritative.                                                             | ingestion integration/E2E/load tests; storage RLS pgTAP                                                               |
| Private media/evidence disclosure        | Originals, imports, return evidence, and exports remain private; access is user/role checked and downloads are short-lived/signed. Public views expose approved renditions only.                                                                                                                                     | media/returns RLS tests; media-delivery audit; cross-customer E2E                                                     |
| Payment callback forgery/replay          | Provider signature verification, payload hashes, unique event keys, durable inbox, atomic claim lease, idempotent application, reconciliation before operational truth. Invalid/unknown events are rejected or quarantined.                                                                                          | order/payment integration and pgTAP suites; webhook rate/signature tests                                              |
| Return/refund double application         | Versioned decisions, provider event linkage, idempotency, explicit refund uncertainty, single restock link, append-only events. No buyer upload alone proves a refund.                                                                                                                                               | returns integration/E2E and database tests                                                                            |
| Last-item oversell/concurrent mutation   | Database transaction locks, reservation expiry, idempotent checkout acceptance, generated available quantity constraint, optimistic versions. Loser receives a safe unavailable/conflict result.                                                                                                                     | checkout concurrency and recovery tests; inventory constraints                                                        |
| Queue double execution/stuck work        | Leases with expiry/owner, bounded claims, retry/dead-letter states, replay-safe commands, operational alerts and catch-up coordinator.                                                                                                                                                                               | operations coordinator/job tests; resilience matrix                                                                   |
| Denial of service/automation abuse       | Central hashed-identifier limits for auth/contact/upload/checkout/quote/returns/newsletter/provider events, bounded page/export/report windows, statement timeouts, indexed queues, payload limits. Useful 429 responses do not expose identifiers.                                                                  | rate-limit unit/pgTAP tests; abuse matrix; load budgets                                                               |
| PII leakage in logs/monitoring/audit     | Structured event allowlist, safe error codes/correlation IDs, recursive redaction, Sentry PII-off contract, hashed network/source identifiers, audit-summary forbidden keys, no request bodies/raw provider payloads in logs.                                                                                        | observability/redaction tests; audit pgTAP; static secret scan                                                        |
| Consent bypass/continued tracking        | Optional analytics is disabled by default, event allowlist plus explicit current consent, refusal/withdrawal stops future sends, consent versions are retained. Operational logging stays PII-minimized and is not repurposed as marketing.                                                                          | consent unit/integration/E2E tests; provider adapter tests                                                            |
| Excessive retention/export disclosure    | Purpose-specific retention classes, scheduled purge/archive, identity-checked privacy cases, Owner/AAL2 export/deletion, row limits, private expiring exports, spreadsheet-safe output. Financial/audit legal holds are separated from mutable profile data.                                                         | security maintenance/exports pgTAP; data-governance runbook                                                           |
| Dependency/supply-chain compromise       | Locked exact dependencies, advisory/license/secret scans, migration/RLS audit, CycloneDX SBOM, checksums, GitHub artifact attestations, provider-egress inventory, protected release workflow.                                                                                                                       | `.github/workflows/security.yml`; local security artifact evidence                                                    |
| Misconfiguration/secret in client        | Typed environment contract, public/server split, live-mode credential requirements, fixture/sandbox rejected in production, health output is secret-free, CSP origins derive from configured allowlist.                                                                                                              | environment/unit tests; production smoke; `env:check`                                                                 |
| Backup/deployment compromise             | Production requires PITR, restore evidence, immutable release/migration evidence, staging smoke, monitored rollback point, scoped provider console access. No launch is claimed without external proofs.                                                                                                             | backup/restore rehearsal; readiness and activation registers                                                          |

## Privacy review

- Data minimization: checkout/contact/returns collect only workflow fields; card
  data remains with the payment provider. Public catalogue projections exclude
  private notes, unverified provenance, originals, and buyer/staff data.
- Purpose and consent: transactional order/return messages are operational;
  newsletter and analytics have distinct disclosures and consent/withdrawal.
- Retention: contact, return evidence, invitations, sessions, exports, audit,
  and provider work each have explicit expiry or retention classes. Final legal
  periods remain an external approval gate.
- Data subject requests: access/correction/deletion/export are private cases;
  destructive or sensitive outcomes require Owner/AAL2, identity proof, reason,
  impact confirmation, and audit evidence.
- Processors: Supabase, Netlify, TBC, Resend, and optional OpenAI/PostHog/Sentry
  require DPA/region/retention/disablement review before activation.

## Residual risks and launch decisions

| Residual risk                                                      | Current decision                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Credentials were disclosed in chat                                 | **Unaccepted for production.** Rotate/revoke and record evidence before setting the rotation gate.                      |
| Legal/tax/privacy/delivery facts are not approved                  | **No-go.** Keep policy/rule placeholders or disabled states; do not publish unsupported claims.                         |
| Managed Supabase/Netlify/domain/provider configuration is untested | **No-go for staging-operational/launch-ready.** Local evidence is build-complete only.                                  |
| Optional AI/analytics/monitoring processors lack privacy approval  | Keep disabled; they do not block core shop operation except monitoring must have an approved alternative before launch. |
| Synthetic catalogue/media are not saleable content                 | Keep local-only; production publication requires facts, price, stock, translations, rights, and alt-text approval.      |

## Review cadence and incident trigger

Re-review before the first staging deployment, before enabling each provider,
after material schema/auth/upload/payment changes, after a security incident,
and at least quarterly in production. Any suspected key disclosure, cross-tenant
read, forged callback, incorrect payment/refund, oversell, private-media leak, or
unapproved tracking pauses promotion and invokes the incident/rollback runbook.
