# Final visual review

**Date:** 2026-08-26  
**Direction:** Collector’s Index  
**Result:** PASS

> Correction — 2026-08-26: the original critical-route matrix did not include
> `/journal`, and its automation checked rendering mechanics rather than judging
> the screenshots it captured. The Journal and shared storefront-shell
> remediation described below was reviewed separately across the full browser
> matrix, and `/journal` is now part of future critical-route runs.

## Review method

The critical-route matrix ran twice: first as a diagnostic pass and then as a
confirmation pass after review. It covered Georgian, English, German and
Russian at 390×844, 768×1024 and 1440×1000.

```bash
EPOCA_EXTERNAL_SMOKE=1 SITE_URL=http://127.0.0.1:3015 \
  npm run test:e2e -- tests/visual/final-critical-routes.spec.ts \
  --project=desktop-1440-de --workers=1
```

| Scope                        | Result |
| ---------------------------- | -----: |
| Critical routes              |     24 |
| Locale/viewport combinations |     12 |
| Diagnostic route checks      |    288 |
| Confirmation route checks    |    288 |
| Confirmation screenshots     |    288 |
| Maximum document overflow    |   0 px |
| Client errors                |      0 |

These figures describe the original 24-route run. They are retained as its
historical record and must not be cited as evidence for the Journal page.

The focused remediation gate ran with:

```bash
EPOCA_EXTERNAL_SMOKE=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3005 \
  npx playwright test tests/visual/journal-shell.spec.ts --workers=1
```

It passed in Georgian at 390 px, English at 768 px, German at 1440 px,
Russian in Firefox, and English in WebKit. It verifies the compact header,
single-line localized Journal title, intentional empty state, collection
recovery link, footer structure, zero overflow, 44 px controls, and zero Axe
violations.

The ignored local manifest at
`artifacts/visual-review/final-critical-routes/manifest.json` records every
route, locale, viewport, overflow measurement and screenshot filename. Generated
screenshots are evidence artifacts rather than repository source.

## Surfaces reviewed

- Public: home, collection, product, search, cart, checkout, delivery, returns,
  contact, Journal and sign-in.
- Manager: dashboard, products, product creation, ingestion, orders, returns,
  reports, content and delivery settings.
- Owner with MFA: audit, operations, staff, privacy and integrations.

The review checked the Collector’s Index typography, rules, spacing, image
hierarchy, empty/loading/error states, localized expansion, focus treatment,
table behavior and mobile reflow. It also rejected HTTP error surfaces and
unexpected loading/system-state pages.

## Defects found and resolved

1. Georgian catalogue administration exposed internal English status and sort
   values. Those labels are now localized in all four languages and covered by
   unit tests.
2. A native return-evidence file input retained a desktop intrinsic width and
   pushed the 390 px page five pixels sideways. Account form controls now stay
   within their panel; the complete buyer/Manager returns accessibility journey
   passes at 390 px.
3. Large administration catalogues originally produced an impractical wall of
   pagination links. Pagination is now a bounded first/nearby/last window with
   previous and next actions.
4. The empty Journal exposed an oversized stacked utility header, an
   uncomposed text-only state, and a raw newsletter/footer. The shared shell is
   now a compact two-level Collector’s Index frame; Journal has a truthful
   editorial empty state and a direct route back to the collection. A focused
   five-project regression test now checks composition and accessibility, not
   merely screenshot generation.

No visual exception or unresolved responsive defect is accepted for the local
release candidate. Production imagery and final business copy remain an Owner
activation responsibility and must be reviewed again on the real domain.
