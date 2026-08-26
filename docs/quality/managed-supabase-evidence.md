# Managed Supabase activation evidence

**Verified:** 2026-08-26 12:33 UTC  
**Project ref:** `ryppdiplsdfwaobzdrim`  
**Region:** West EU (Ireland)  
**Verified change set:** `a499f3711c37c99862dc63217f2e0bca709c1628`  
**Decision:** managed backend baseline operational; staging and production remain on hold

## Customer impact

The real ÉPOCA backend now has the complete database, Storage policy, role,
catalogue, ingestion, checkout, order, return, content, reporting and operations
foundation required by the shop. It remains empty of synthetic products and
cannot be mistaken for a live store. An MFA-required application Owner exists
so the administrative workflow can be completed after deployment.

## Managed verification

| Check                         | Result                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Project ownership and link    | PASS — the ÉPOCA account can manage the intended project and the repository is linked to its ref     |
| Migration history             | PASS — 55 local and 55 remote migrations match through `202608250124`                                |
| Migration dry-run after apply | PASS — remote database reports up to date; no migration, seed or role write remains                  |
| Remote PostgreSQL lint        | PASS — no `public` or `app_private` schema errors or warnings                                        |
| Remote regression             | PASS — `001_foundation.test.sql`, including the idempotency regression, passes 29/29 transactionally |
| Local database suite          | PASS — 17 files and 654 assertions on a clean 55-migration reset                                     |
| Generated database types      | PASS — committed types match the clean local schema                                                  |
| Production seed isolation     | PASS — no local 5,000-product fixture seed was pushed                                                |
| Initial application Owner     | PASS — exactly one active Owner, MFA required, with one successful bootstrap audit event             |

The new append-only migration fixes an ambiguous idempotency conflict target
that managed PostgreSQL lint caught, plus three safe typing/unused-variable
warnings. The original 54 migrations remain immutable.

## Test-scope note

The complete pgTAP suite is designed for the isolated seeded test database. A
diagnostic run against the empty managed project was not accepted as a pass:
seed-dependent catalogue, delivery and checkout cases correctly lacked their
local fixtures. Uploading 5,000 synthetic products to the real project merely
to satisfy those tests would contaminate production data. The full suite
therefore remains a clean local/staging-clone gate, while the managed project
uses schema lint, migration parity and targeted transactional regressions.

## Secret and access handling

- No credential or token is present in Git, generated evidence or command
  output.
- Reusable database/API credentials and the application Owner password are in
  labeled macOS Keychain entries on the authorized workstation.
- The scoped CLI personal access token was created with a one-hour lifetime. It
  was not revoked; Supabase will expire it automatically.
- Credentials disclosed in chat were not rotated in this activation pass, per
  Owner direction. Rotation remains a mandatory launch gate.

## Remaining managed-service gates

- enable and prove the approved PITR/backup tier and a managed restore;
- configure deployed Auth site/redirect URLs after the Netlify preview exists;
- set scoped Netlify environment values and run live Storage/job/health smoke;
- enroll and verify Owner TOTP at AAL2 through the deployed administrative UI;
- rotate the disclosed account/database/API credentials before production; and
- record monitoring, rollback and Owner sign-off evidence.
