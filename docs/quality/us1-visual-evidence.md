# Storefront Discovery Visual Evidence

**Verified:** 2026-08-25  
**Design authority:** Collector’s Index in `DESIGN.md`  
**Automated contract:** `tests/visual/storefront-discovery.spec.ts`

## Why this gate exists

Catalog functionality is not complete when it merely returns records. The customer must be able to understand and operate it at real viewport widths, in every supported writing system, without clipped copy, ambiguous missing media, or inaccessible controls.

## Recorded viewports

| View                                | Evidence                                                       | Result |
| ----------------------------------- | -------------------------------------------------------------- | ------ |
| Georgian phone, 390 × 844 CSS px    | [us1-phone-390-ka.png](screenshots/us1-phone-390-ka.png)       | PASS   |
| English tablet, 768 × 1024 CSS px   | [us1-tablet-768-en.png](screenshots/us1-tablet-768-en.png)     | PASS   |
| German desktop, 1440 × 1000 CSS px  | [us1-desktop-1440-de.png](screenshots/us1-desktop-1440-de.png) | PASS   |
| Russian desktop, 1440 × 1000 CSS px | [us1-firefox-ru.png](screenshots/us1-firefox-ru.png)           | PASS   |

## Pass 1 — composition and design language

- Warm paper, near-black ink, hard rules, editorial serif hierarchy, and restrained oxblood accent consistently follow Collector’s Index.
- Large collection titles establish editorial presence while product controls remain visually secondary and legible.
- The layout avoids rounded card chrome, decorative badges, shadows, fake claims, and invented imagery.
- Missing product media has a stable 4:5 reserved area and an explicit accessible label; it does not collapse the grid or imply that a synthetic fixture is a real product.
- The 768 px layout is a deliberate two-column intermediate composition, not a compressed four-column desktop grid.

## Pass 2 — responsive behavior and interaction

- No horizontal overflow was measured at 390, 768, or 1440 CSS px.
- Long Georgian, German, and Russian headings, labels, and navigation remain contained without overlap.
- Visible inputs, selects, and buttons have a minimum 44 px rendered height. A Safari-specific 22 px native-select rendering issue found during this pass was corrected with an explicit control height.
- Keyboard-visible focus, semantic labels, result announcements, missing-media roles, and pagination landmarks remain present.
- Axe reported zero automated violations on all four reviewed variants.
- The full browser gate passed 29 tests across Chromium, Firefox, and WebKit; one duplicate WebKit visual capture was intentionally skipped because the English desktop layout was already represented.

## Honest boundary

These captures intentionally use synthetic local catalog records and missing-media fallbacks. They approve the structure, responsive behavior, and states—not production photography, merchandising copy, or a public launch.
