# Release candidate record

**Prepared:** 2026-08-26  
**Candidate branch:** `001-build-production-shop`  
**Current scope:** verified local candidate; managed deployment not attempted

## Preserved evidence

- final source/database/browser/load/security results:
  `docs/quality/final-verification.md`;
- WCAG and visual review:
  `docs/quality/final-accessibility-audit.md` and
  `docs/quality/final-visual-review.md`;
- migration and restore state: 54 migrations through `202608250123`, plus
  `docs/quality/restore-rehearsal.md`;
- security artifacts: reproducible SBOM, provider inventory and 60-subject
  checksum generation via `npm run security:artifacts`; and
- release decision: `docs/quality/production-readiness-report.md`.

## Promotion state

No release tag, Netlify deploy ID or staging URL is recorded yet because the
remote repository/site and managed staging backend have not been activated.
Creating a tag before preserving an immutable remote commit and a deploy would
overstate the candidate state.

When those external inputs exist, the operator must:

1. record the immutable commit SHA and create a reviewed release-candidate tag;
2. deploy that exact commit to Netlify staging against isolated managed
   Supabase;
3. run the HTTPS release smoke, SEO, accessibility, reconciliation and
   monitoring checks;
4. preserve the Netlify deploy ID, migration head, backup/restore reference and
   rollback deploy; and
5. update this record without including any credential.

Production promotion remains forbidden while the readiness decision is
`hold`. The release script independently enforces a `launch-ready` report and an
explicit production confirmation.
