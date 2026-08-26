# External activation register

Last reviewed: 2026-08-26  
Decision owner: ÉPOCA Owner  
Rule: an item is not active because a credential exists. It is active only
after configuration, provider approval, a staging proof, rollback evidence,
and Owner sign-off are all recorded.

No secret value belongs in this file, Git, screenshots, test output, support
tickets, or browser-visible environment variables.

## Current gate

Build-complete work may continue locally. Staging-operational and launch-ready
are blocked. Credentials supplied in chat are treated as disclosed and must be
rotated before any managed environment is trusted. The repository intentionally
contains only placeholders and safe local fixture configuration.

## Access audit — 2026-08-26

- The intended managed project reference is confirmed as
  `ryppdiplsdfwaobzdrim`; its public Supabase endpoint resolves.
- The machine's existing Supabase CLI access token can see only two unrelated
  MediMind projects. It cannot see or link the ÉPOCA project.
- The ÉPOCA dashboard requires a fresh sign-in before a scoped CLI personal
  access token can be created. Application publishable, secret and service-role
  keys are not substitutes for that management token.
- Netlify CLI is authenticated to the MediMind team. No visible site name or
  connected repository matches ÉPOCA, and this repository is not linked.
- Git push uses a separate working credential and the candidate branch is
  present on `LashaKh/-POCA`; GitHub CLI's saved API sessions are expired.

No deployment was redirected into a convenient but unrelated organization.
Supabase migrations and Netlify site creation remain paused until the ÉPOCA
account/team is authenticated and ownership is explicit.

## Register

| ID     | External dependency          | Current state                                   | Required Owner/provider input                                                                                                                                                                     | Safe behavior until activation                                                                                                                                    | Activation and proof                                                                                                                                                                                                                                |
| ------ | ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EXT-01 | Credential rotation          | **Blocked**                                     | Rotate the Supabase database password, secret/service key, and any account password exposed in chat; review active sessions and access tokens. Rotate other values if they were reused elsewhere. | Production environment validation requires `CREDENTIAL_ROTATION_CONFIRMED=true`; no disclosed value is stored locally.                                            | Record provider rotation timestamps and secret-version references, never values. Revoke old sessions, run the secret scan, then set the confirmation only in the deployment environment.                                                            |
| EXT-02 | Managed Supabase             | **Project confirmed; CLI access missing**       | Sign in to the ÉPOCA Supabase account, create a scoped CLI personal access token, rotate disclosed project secrets, confirm plan/region and agree a maintenance window.                           | Local Supabase is authoritative for development; application API keys are never misused as management credentials and managed migration writes are not attempted. | Link approved project `ryppdiplsdfwaobzdrim`; run linked lint and migration dry-run, backup, `db push`, type check, RLS tests, and post-migration smoke. Record the migration head and backup identifier.                                           |
| EXT-03 | Supabase backup/PITR         | **Blocked**                                     | Enable point-in-time recovery and agree retention/RPO/RTO.                                                                                                                                        | Production schema rejects `BACKUP_MODE` other than `pitr`; local restore rehearsal remains available.                                                             | Perform a managed restore rehearsal, record recovery point and elapsed time, then store its evidence reference in the deployment environment.                                                                                                       |
| EXT-04 | GitHub repository            | **Candidate branch pushed; governance pending** | Branch protection, required checks, secret scanning, approval rules and final default-branch decision.                                                                                            | Verified candidate commit `57494d03835b1e9a6ae6c2b1d8e23b62d81b0ec7` is recoverable on `001-build-production-shop`; no release or attestation is claimed.         | Require the quality/security workflows, review and merge the candidate, verify the generated SBOM and GitHub attestation, and preserve the resulting immutable release SHA.                                                                         |
| EXT-05 | Netlify site                 | **No ÉPOCA site; wrong team authenticated**     | Authenticate or select the Owner-approved ÉPOCA Netlify team, then provide site ownership, build permissions, environment scopes, function schedules and log-retention decision.                  | The authenticated MediMind team is not used for ÉPOCA; no partial site is deployed and `NETLIFY_SITE_ID` remains absent.                                          | Create/link the site in the approved team, configure secrets in Netlify UI, deploy the immutable commit to staging, verify headers/functions/schedules, and record deploy ID plus rollback deploy.                                                  |
| EXT-06 | Domain and DNS               | **Missing**                                     | Final primary domain, registrar/DNS access, redirect domains, ownership verification, and change window.                                                                                          | Canonical production URL and domain-dependent integrations remain unapproved.                                                                                     | Configure TLS, apex/`www` redirect policy, canonical `SITE_URL`, email/payment DNS records, and verify from public DNS. Record `DOMAIN_ACTIVATION_REFERENCE`.                                                                                       |
| EXT-07 | TBC payment                  | **Merchant approval missing**                   | Executed merchant agreement, supported currencies/countries/methods, sandbox/live credentials, webhook/return URLs, refund rules, settlement contacts, and incident channel.                      | Card payment is disabled outside local fixture mode; checkout states that no online payment has completed. Bank transfer remains a separately gated option.       | Exercise sandbox create/return/webhook replay/reconcile/refund, receive live approval, rotate to live credentials, run a low-value controlled transaction/refund, and record settlement reconciliation. Never enable fixture/sandbox in production. |
| EXT-08 | Bank transfer                | **Business facts missing**                      | Legal beneficiary, bank name, IBAN/account, SWIFT/BIC, supported currencies, transfer deadline, reference format, proof/review SLA, cancellation/refund terms, and approved buyer wording.        | No fabricated banking instruction is published; payment acceptance is never inferred from an upload or buyer claim.                                               | Owner/legal approves localized instructions; configure them in the admin system, test reference generation and manual review/reconciliation, then publish with version evidence. No cash on delivery or pickup is offered.                          |
| EXT-09 | Resend transactional email   | **Not authenticated**                           | Resend account/API key, webhook secret, sending domain, DNS authentication, from/reply-to addresses, suppression handling, and support ownership.                                                 | Email provider is disabled or local capture; workflows remain visible in the outbox and do not claim delivery.                                                    | Authenticate the domain, configure scoped secrets, verify webhook signatures/replay, test all four locales and bounce/complaint paths, then record provider message IDs and domain status.                                                          |
| EXT-10 | OpenAI assistance            | **Optional; disabled**                          | Approved account/key, model/data-retention decision, usage budget, prompt review, and staff disclosure.                                                                                           | Product drafting assistance is absent; manual upload/review remains fully usable. No AI-authored fact is auto-published.                                          | Configure only after privacy approval, verify structured-output/retry/cost limits and mandatory human review, then record a sandbox evidence run.                                                                                                   |
| EXT-11 | PostHog analytics            | **Optional; disabled**                          | EU project/key/host, event allowlist approval, consent/legal approval, retention, and access owners.                                                                                              | No optional event is sent without explicit consent; disabled adapter returns `DISABLED`.                                                                          | Configure the public project key and live mode, verify grant/refuse/withdraw in all locales, inspect payloads for PII, and record consent evidence.                                                                                                 |
| EXT-12 | Sentry monitoring            | **Optional; disabled**                          | Project/DSN, environment/release mapping, alert owners, retention, and privacy review.                                                                                                            | Safe local logs and health endpoints remain available; no PII is sent to an external monitor.                                                                     | Configure DSN/live mode, verify scrubbed synthetic errors, alert delivery, release mapping, and incident ownership; record `MONITORING_CHECK_REFERENCE`.                                                                                            |
| EXT-13 | Verified contact details     | **Missing**                                     | Public support email/phone/address/hours and responsible staff, with approval for each locale.                                                                                                    | Contact channels are omitted or explicitly unavailable; the contact form does not invent direct details.                                                          | Enter verified channels in admin, translate, publish, submit one staging contact, and reconcile its outbox/audit trail.                                                                                                                             |
| EXT-14 | Worldwide delivery           | **Rules incomplete**                            | Carrier/service matrix, countries/regions, size/weight limits, rates, SLAs, duties/incoterm wording, restricted destinations, damage/loss process, and quote SLA.                                 | Only enabled, configured delivery rules appear; unsupported destinations return an honest manual/unavailable result.                                              | Configure and approve rules, test boundary destinations and manual-quote products, compare sample carrier quotes, and record effective date/version.                                                                                                |
| EXT-15 | Tax, terms, privacy, returns | **Approval missing**                            | Georgian business identity, tax treatment by market, privacy controller/contact, retention/legal bases, terms, cookie text, return windows/exclusions, and dispute jurisdiction.                  | Draft/fallback policy text is disclosed and is not treated as legal approval; launch gate remains blocked.                                                        | Qualified reviewers approve four-locale versions; publish versioned entries, verify acceptance/consent records, and set `LEGAL_APPROVAL_REFERENCE`.                                                                                                 |
| EXT-16 | Production catalogue/media   | **Missing**                                     | Final product facts, prices, inventory, translations, licensed images, alt text, provenance claims, and rights evidence.                                                                          | Synthetic fixtures are local-only and excluded from production claims; incomplete products cannot publish.                                                        | Upload via the ingestion workflow, resolve duplicates/errors, approve rights/crops/translations/facts, publish a controlled set, and verify public/search/structured-data output.                                                                   |

## Activation order

1. Rotate/revoke exposed credentials and establish GitHub/Netlify/Supabase
   ownership.
2. Link staging, enable backup/PITR, apply migrations, and verify restore.
3. Activate domain-dependent email and payment sandboxes.
4. Approve business facts, delivery, tax, policy, contacts, and production media.
5. Run staging smoke, reconciliation, accessibility, SEO, monitoring, and
   rollback evidence from the immutable release candidate.
6. Approve live provider modes and domain cutover. Production remains no-go if
   any required row above is not ready.

## Revalidation commands

Run with Node 24 and environment values supplied by the deployment platform,
not a committed `.env` file:

```bash
npm run env:check
npm run security:audit -- --static
npm run db:migrations:check
npm run db:types:check
npm run build
npm run release:smoke
npm run readiness:report
```

For a managed Supabase or Netlify operation, preserve the provider-generated
deployment/migration identifier, UTC timestamp, operator, result, and rollback
point in the release-candidate evidence. Never paste command output containing
tokens or connection strings.
