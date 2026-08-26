# Final visual review

**Date:** 2026-08-26  
**Direction:** Collector’s Index  
**Result:** PASS

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

The ignored local manifest at
`artifacts/visual-review/final-critical-routes/manifest.json` records every
route, locale, viewport, overflow measurement and screenshot filename. Generated
screenshots are evidence artifacts rather than repository source.

## Surfaces reviewed

- Public: home, collection, product, search, cart, checkout, delivery, returns,
  contact and sign-in.
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

No visual exception or unresolved responsive defect is accepted for the local
release candidate. Production imagery and final business copy remain an Owner
activation responsibility and must be reviewed again on the real domain.
