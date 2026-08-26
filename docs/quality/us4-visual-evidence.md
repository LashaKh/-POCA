# US4 order-operations visual and accessibility evidence

Validated on 2026-08-26 against the optimized local application and freshly migrated local Supabase services.

## Why this was reviewed

Order operations combine money, customer contact, shipping, and irreversible state changes. The interface therefore has to remain readable and keyboard-operable under narrow touch layouts and longer localized copy, while keeping the current status and the next safe action unmistakable.

## Automated two-pass review

Command:

```bash
playwright test tests/accessibility/order-operations.spec.ts
```

Result: **5/5 projects passed**. Every project rendered a paid order-detail workspace, measured horizontal overflow and visible control height, ran axe before and after keyboard focus plus a long unsaved note, and captured a full-page screenshot.

| Project           | Locale / viewport         | Result                                             | Evidence                                           |
| ----------------- | ------------------------- | -------------------------------------------------- | -------------------------------------------------- |
| `phone-390-ka`    | Georgian, 390 × 844 touch | Two axe passes clean; no overflow; controls ≥44 px | `screenshots/order-operations-phone-390-ka.png`    |
| `tablet-768-en`   | English, 768 × 1024 touch | Two axe passes clean; no overflow; controls ≥44 px | `screenshots/order-operations-tablet-768-en.png`   |
| `desktop-1440-de` | German, 1440 × 1000       | Two axe passes clean; no overflow; controls ≥44 px | `screenshots/order-operations-desktop-1440-de.png` |
| `firefox-ru`      | Russian, 1440 × 1000      | Two axe passes clean; no overflow; controls ≥44 px | `screenshots/order-operations-firefox-ru.png`      |
| `webkit-en`       | English, 1440 × 1000      | Two axe passes clean; no overflow; controls ≥44 px | `screenshots/order-operations-webkit-en.png`       |

## Two-pass findings

The first pass checked hierarchy and truthfulness. The accepted snapshot, payment state, fulfillment state, allowed transitions, immutable event history, notes, and notification status remain visually separate. Payment controls explicitly state that there is no force-paid shortcut, and shipment controls are absent until authoritative payment permits them.

The second pass checked keyboard focus, long input wrapping, 390/768/1440 responsive behavior, Chromium/Firefox/WebKit rendering, touch-sized controls, and automated WCAG findings. Result: **zero axe violations and zero horizontal overflow** in all five variants. The narrow layout deliberately stacks operational panels into one reading order without hiding actions.

The screenshots contain synthetic local records only. They approve structure, accessibility, and responsive behavior; they are not production customer data or proof of live provider activation.
