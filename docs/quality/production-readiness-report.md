# Production readiness report

**Decision date:** 2026-08-26  
**Release:** `001-build-production-shop`  
**Decision owner:** ÉPOCA Owner  
**Current decision:** **HOLD production promotion**  
**Highest proven stage:** **Payment-ready**

## Executive decision

The ÉPOCA shop is build-complete locally and its payment boundaries are ready
for approved bank-transfer facts and a live hosted-payment provider. The public
shop, four languages, catalogue and ingestion, administration, authentication,
inventory, checkout, order operations, customer accounts, returns, worldwide
delivery rules, content, privacy, audit, reporting, observability and recovery
controls are implemented and verified.

This is not yet a live-production claim. Managed staging, merchant and bank
facts, approved policies, licensed production products, the real domain and live
service configuration require external Owner/provider action. The application
keeps those capabilities disabled or explicitly degraded until activation.

The ÉPOCA Supabase account is now authenticated, the approved managed project
has all 55 migrations, remote lint and targeted regression checks pass, no
synthetic seed was uploaded, and the first MFA-required application Owner is
auditable. The installed Netlify session still belongs to the MediMind team and
contains no ÉPOCA site. The release therefore pauses instead of deploying the
application into the wrong organization.

## Stage decision

| Stage               | Result                   | Owner               | Proof or missing proof                                                                                                                                                  |
| ------------------- | ------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build-complete      | **PASS**                 | Engineering         | Final verification, traceability, clean migrations, optimized build, security, accessibility, visual and recovery evidence                                              |
| Payment-ready       | **PASS (adapter-ready)** | Engineering + Owner | Hosted-payment and bank-transfer boundaries, callbacks, replay/reconciliation and disabled-state tests pass; real merchant credentials and bank facts are not activated |
| Staging-operational | **NOT PROVEN**           | Owner + Engineering | Managed Supabase baseline passes; no approved Netlify site, public preview smoke, deployed Auth/Storage/jobs proof or live monitoring evidence                          |
| Launch-ready        | **NO**                   | ÉPOCA Owner         | Production environment, PITR, domain, legal/tax/delivery facts, production catalogue/media and external provider approvals are incomplete                               |

The machine-readable evaluation in ignored local evidence reports
`payment-ready: hold`; its next run must consume the new managed-service
evidence. “Payment-ready” means the controlled
integration boundary is ready for activation; it does not mean a real payment
method is currently accepting money.

## Repository-controlled evidence

| Area                | Result       | Evidence                                                                                                                      |
| ------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Requirements        | PASS         | `docs/quality/requirements-traceability.md` covers FR-001–FR-114, NFR-001–NFR-012, SC-001–SC-025 and acceptance/edge cases    |
| Source/build        | PASS         | `docs/quality/final-verification.md`; 60 test files/236 tests, strict types, lint, formatting and 206 generated page variants |
| Database            | PASS         | 55 migrations, 17 pgTAP files/654 local assertions, clean managed lint/parity and 29-assertion targeted remote regression     |
| Browser journeys    | PASS         | Five-profile WCAG, 20/20 production smoke, focused stateful journey and resilience evidence                                   |
| Visual/localization | PASS         | 576 route checks, 288 screenshots, four locales, 390/768/1440 widths, no client errors or overflow                            |
| Load/performance    | PASS         | Catalogue, 50-way checkout and 250-file ingestion tests plus JS/query/queue budgets                                           |
| Security/privacy    | PASS         | Threat model, RLS/role boundaries, private evidence/media, CSP, dependency/license/secret gates and SBOM/checksum generation  |
| Recovery            | PASS locally | Logical database and Storage restore rehearsal with RPO 0 and local RTO 13 seconds                                            |
| Operations          | PASS locally | Owner/Manager manuals, activation register, health/readiness, queues, reconciliation, incidents and rollback controls         |

## Unresolved external inputs

| Blocker                             | Accountable owner           | Closure evidence                                                                                                                                                         |
| ----------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ROTATE_DISCLOSED_CREDENTIALS`      | ÉPOCA Owner                 | Rotate the account password, database password and Supabase secret/service credentials disclosed in chat; revoke prior sessions and record non-secret version/timestamps |
| `MANAGED_SUPABASE_CONFIGURATION`    | Owner + Engineering         | Configure deployed Auth URLs/environment scopes, run HTTPS Storage/job/health smoke, enroll Owner TOTP and reference `managed-supabase-evidence.md`                      |
| `BACKUP_RESTORE_UNPROVEN`           | Owner + Engineering         | Enable PITR and complete a managed restore rehearsal with recorded RPO/RTO                                                                                               |
| `NETLIFY_SITE_LINK`                 | Owner + Engineering         | Link the Netlify site, configure scoped environment values and preserve immutable preview/rollback deploy IDs                                                            |
| `STAGING_SMOKE_UNPROVEN`            | Engineering                 | Run the release smoke, reconciliation, accessibility and SEO gates on the public HTTPS preview                                                                           |
| `MONITORING_UNPROVEN`               | Owner/operations            | Activate approved monitoring, prove scrubbed synthetic alert delivery and name the responder                                                                             |
| `DOMAIN_NOT_ACTIVATED`              | ÉPOCA Owner                 | Approve domain/DNS, TLS, canonical redirects, email/payment records and public verification                                                                              |
| `LEGAL_COPY_NOT_APPROVED`           | Owner + qualified reviewers | Approve Georgian business/tax/privacy/terms/returns/delivery facts and all four published locale versions                                                                |
| `PRODUCTION_ENVIRONMENT_INCOMPLETE` | ÉPOCA Owner                 | Activate approved payment/bank/email configuration, production catalogue/media, contacts, delivery rules and PITR-backed production variables                            |

The detailed dependency-by-dependency procedure is in
`docs/operations/external-activation-register.md`. No supplied secret was written
to repository source or evidence.

## Risk acceptance

No waiver is accepted for a launch-ready gate. Local fixture providers,
synthetic products, draft legal copy and disabled optional services are valid
development states only. They cannot be promoted by relabelling them as
production.

## Go/no-go

- **Local release candidate / further activation work:** GO.
- **Managed staging deployment:** NO-GO until the approved Netlify site is
  linked and the existing managed Supabase baseline is configured for that
  preview. Credential rotation remains mandatory before production promotion.
- **Production launch:** NO-GO until every required activation row is proven,
  the machine-readable report reaches `launch-ready`, and the Owner explicitly
  approves the immutable candidate.

After external activation, rerun the commands in the deployment runbook and
replace this hold decision with provider IDs, timestamps, evidence references,
rollback point and Owner sign-off. Never paste secret values into the report.
