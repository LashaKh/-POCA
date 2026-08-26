# US8 Security Verification Evidence

Verified: 2026-08-26

## Automated security audit

npm run security:audit passed all six gates:

1. npm reports no moderate, high, or critical dependency advisory.
2. the commit-candidate scan finds no Supabase secret, private key, or service-role JWT pattern;
3. nonce Content Security Policy, HSTS in production, MIME sniffing protection, referrer policy, and refreshed-session enforcement are present;
4. forced RLS, rate limits, last-Owner protection, exact confirmations, and audit redaction are present in migrations;
5. the 47-assertion authorization pgTAP suite passes against local Postgres; and
6. authorization unit tests and real local Supabase Auth integration tests pass.

## Database boundary

| Evidence                                 | Result                                                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete database suite, npm run db:test | PASS — 9 files, 389 assertions                                                                                                                                    |
| US8 role matrix                          | PASS — 47 assertions                                                                                                                                              |
| Direct table writes                      | Authenticated browser roles cannot mutate staff, forge audit, or write protected-operation evidence                                                               |
| Manager boundary                         | Can read only its own staff record and non-sensitive settings; cannot manage roles, read audit, or invoke Owner commands                                          |
| Owner AAL1 boundary                      | Cannot enumerate staff, read audit, view sensitive settings, or create protected-operation evidence                                                               |
| Owner AAL2 boundary                      | Can perform Owner work only after verified TOTP assurance                                                                                                         |
| Last Owner                               | Database trigger and lifecycle command both prevent removal of the final active Owner                                                                             |
| Exact confirmation                       | Staff deactivation, role change, cross-account session revocation, privacy deletion/export, and audit export require recent matching protected-operation evidence |
| Audit privacy                            | Sensitive summary keys are rejected; evidence is append-only; UI applies defensive redaction                                                                      |
| Session safety                           | JWT session registration cannot spoof another session ID; current/other/all revocation is server recorded                                                         |
| Maintenance                              | Service-only task expires invitations/exports, revokes stale sessions, archives/purges audit by retention class, and alerts if no Owner remains                   |

## Application and provider boundary

- The server action boundary resolves the current JWT session ID, checks the app-session revocation record, requires an active Manager, and records denied command attempts through the central audit wrapper.
- Owner pages independently require role and AAL2; hiding a link is never the permission boundary.
- Integration cards query integration_status_safe, which has no credential column. Sensitive business-setting values are omitted from the route projection.
- Recovery returns a generic response whether or not an account exists. The callback validates a local return path before exchanging the authorization code.
- TOTP enrollment and verification are enabled in local Supabase using the current official auth.mfa.totp.enroll_enabled and verify_enabled settings.
- Audit exports are Owner/AAL2-only, bounded to 10,000 rows, spreadsheet-safe, asynchronously generated, and expire after two hours.

## Credential handling

No user-provided Supabase value was written to the repository. The Supabase credentials disclosed in chat must still be rotated before cloud linking or launch; that remains a release blocker, not a code defect.

## Residual launch checks

- Rotate the disclosed Supabase database password, secret/service keys, anon key, and publishable key.
- Verify TOTP enrollment and recovery email redirect allow-lists in the managed Supabase project.
- Repeat headers, audit, recovery, and role bypass tests against Netlify staging.
- Confirm production provider modes and webhook secrets only after the credentials are supplied through environment management.
