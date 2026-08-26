# US3 ingestion visual and accessibility evidence

Validated on 2026-08-26 against the local production build with local Supabase.

## Why this was reviewed

The ingestion workspace is a dense, high-consequence staff surface. A Manager must be able to review product facts, four languages, media rights, crop focus, and every publication blocker without horizontal clipping or inaccessible controls.

## Automated two-pass review

Command:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3015 playwright test tests/accessibility/ingestion.spec.ts
```

Result: 5/5 projects passed. Each project ran axe before and after keyboard focus plus expansion of all four translation editors, and asserted zero horizontal overflow.

| Project           | Locale / viewport         | Result                            |
| ----------------- | ------------------------- | --------------------------------- |
| `phone-390-ka`    | Georgian, 390 × 844 touch | Two axe passes clean; no overflow |
| `tablet-768-en`   | English, 768 × 1024 touch | Two axe passes clean; no overflow |
| `desktop-1440-de` | German, 1440 × 1000       | Two axe passes clean; no overflow |
| `firefox-ru`      | Russian, 1440 × 1000      | Two axe passes clean; no overflow |
| `webkit-en`       | English, 1440 × 1000      | Two axe passes clean; no overflow |

The first accurate run found one real WCAG AA defect: muted explanatory text measured 4.3:1 against the admin background. `--color-muted` was darkened from `#6f685e` to `#655f56`; the complete five-project rerun then passed with zero axe violations.

## Stored captures

- `docs/quality/screenshots/ingestion-phone-390-ka.png`
- `docs/quality/screenshots/ingestion-tablet-768-en.png`
- `docs/quality/screenshots/ingestion-desktop-1440-de.png`
- `docs/quality/screenshots/ingestion-firefox-ru.png`
- `docs/quality/screenshots/ingestion-webkit-en.png`

Manual inspection confirmed readable long Georgian/German/Russian copy, visible focus treatment, usable touch-width controls, deliberate single-column collapse at 390 px, and grouped publication blockers. No clipping, overlap, inaccessible hidden action, or deceptive media state remained.
