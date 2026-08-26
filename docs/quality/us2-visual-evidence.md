# US2 visual and accessibility evidence

Date: 2026-08-25  
Authority: `DESIGN.md` — Collector’s Index

## Automated review matrix

`tests/visual/checkout.spec.ts` completed the product → cart → exact checkout review path and captured full-page evidence. `tests/accessibility/checkout.spec.ts` separately verified empty-cart recovery. Both suites ran axe and horizontal-overflow gates.

| Surface  | Locale   | Browser / viewport    | Result | Evidence                                   |
| -------- | -------- | --------------------- | ------ | ------------------------------------------ |
| Checkout | Georgian | Chromium, 390 × 844   | PASS   | `screenshots/checkout-phone-390-ka.png`    |
| Checkout | English  | Chromium, 768 × 1024  | PASS   | `screenshots/checkout-tablet-768-en.png`   |
| Checkout | German   | Chromium, 1440 × 1000 | PASS   | `screenshots/checkout-desktop-1440-de.png` |
| Checkout | Russian  | Firefox, 1440 × 1000  | PASS   | `screenshots/checkout-firefox-ru.png`      |
| Checkout | English  | WebKit, 1440 × 1000   | PASS   | `screenshots/checkout-webkit-en.png`       |

## Two-pass findings

Pass 1 checked hierarchy and truthfulness: the contact/address form remains the primary task; the exact total and fixture bank instructions are clearly separated; no test bank data can be mistaken for payable production instructions.

Pass 2 checked long Georgian/German/Russian copy, keyboard-visible native controls, touch-sized actions, responsive stacking, full-page overflow, and WCAG axe findings. Result: **5 passed, zero axe violations, zero horizontal overflow**. The narrow Georgian view stacks the total after the form without truncating fields or payment facts; the wide German view keeps the exact order review visible in a bounded side column.
