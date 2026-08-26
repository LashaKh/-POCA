# Release candidate record

**Prepared:** 2026-08-26  
**Candidate branch:** `001-build-production-shop`  
**Candidate application/database commit:** `a499f3711c37c99862dc63217f2e0bca709c1628`

**Current scope:** verified GitHub candidate plus managed Supabase baseline; application deployment not attempted

## Preserved evidence

- final source/database/browser/load/security results:
  `docs/quality/final-verification.md`;
- WCAG and visual review:
  `docs/quality/final-accessibility-audit.md` and
  `docs/quality/final-visual-review.md`;
- migration and restore state: 55 migrations through `202608250124`, local
  restore evidence in `docs/quality/restore-rehearsal.md`, and managed parity,
  lint, targeted regression and Owner evidence in
  `docs/quality/managed-supabase-evidence.md`;
- security artifacts: reproducible SBOM, provider inventory and 60-subject
  checksum generation via `npm run security:artifacts`; and
- release decision: `docs/quality/production-readiness-report.md`.

## Promotion state

The prior candidate branch is pushed to GitHub and the managed backend is
linked at migration head `202608250124`. No release tag, Netlify deploy ID or
staging URL is recorded yet because branch governance and the correct Netlify
site have not been activated. Creating a release tag before review and a
matching immutable deploy would overstate the candidate state.

When those external inputs exist, the operator must:

1. record the immutable commit SHA and create a reviewed release-candidate tag;
2. deploy that exact commit to Netlify staging against the confirmed managed
   Supabase project after configuring preview-scoped Auth/environment values;
3. run the HTTPS release smoke, SEO, accessibility, reconciliation and
   monitoring checks;
4. preserve the Netlify deploy ID, migration head, backup/restore reference and
   rollback deploy; and
5. update this record without including any credential.

Production promotion remains forbidden while the readiness decision is
`hold`. The release script independently enforces a `launch-ready` report and an
explicit production confirmation.
