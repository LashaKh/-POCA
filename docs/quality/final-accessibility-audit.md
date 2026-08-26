# Final WCAG 2.2 AA accessibility audit

**Date:** 2026-08-26  
**Optimized-build result:** PASS  
**Exceptions:** None

## Final cross-browser command

```bash
EPOCA_EXTERNAL_SMOKE=1 npm run test:e2e -- \
  tests/accessibility/final-wcag.spec.ts --workers=1
```

Result: **5 tests passed in 5.2 minutes** against the final optimized
application:

- Chromium, Georgian, 390×844;
- Chromium, English, 768×1024;
- Chromium, German, 1440×1000;
- Firefox, Russian, 1440×1000; and
- WebKit, English, 1440×1000.

Each project audited seven critical public and seven authenticated Manager
routes. This produced 70 real route-level Axe audits plus responsive, focus,
status and motion checks. The role/MFA-specific accessibility suites remain part
of the full Playwright gate for Owner-only staff, audit, privacy and operations
surfaces.

## Outcomes checked

| WCAG outcome            | Verification                                                                                            | Result                |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | --------------------- |
| Semantics and names     | Axe WCAG 2 A/AA, 2.1 AA and 2.2 AA tags on every route                                                  | Pass; zero violations |
| Keyboard and focus      | Skip link can receive/visibly expose focus; route-specific suites tab through controls and dialogs      | Pass                  |
| Status announcements    | Collection result and command/error states use populated `aria-live`/status regions                     | Pass                  |
| Contrast/non-color cues | Axe contrast plus text/state labels independent of color                                                | Pass                  |
| Target size             | Axe 2.2 target spacing; every visible form/button control is at least 44px high                         | Pass                  |
| Zoom/reflow             | Product, checkout and operational report at 320px have ≤1px document overflow                           | Pass                  |
| Reduced motion          | `prefers-reduced-motion: reduce` caps transitions at effectively zero and stops looping progress motion | Pass                  |
| Locale expansion        | Georgian, German and Russian content audited in their native browser projects                           | Pass                  |
| Browser breadth         | Chromium mobile/tablet/desktop, Firefox and Safari/WebKit                                               | Pass                  |

## Defects found and resolved

1. A 5,000-product administration catalogue rendered hundreds of tiny numbered
   page links. Pagination is now a bounded first/nearby/last window with
   previous/next controls, and every link has a 44px target.
2. Empty responsive tables on content administration could scroll on a narrow
   screen but were not focusable in Safari. Every shared scrollable table region
   now has keyboard focus and an accessible region label.
3. The final test initially assumed the first synthetic keyboard Tab event was
   identical on touch-emulated browsers. It now directly verifies the skip-link
   focus state on every engine; the separate journey suites retain real Tab
   traversal and focus-visible assertions.
4. The staff settings table repeated the outer section's accessible label,
   causing duplicate landmark names. The scrollable table now has its own
   explicit label.
5. A native return-evidence file input exceeded its 390 px panel by five pixels.
   Account form controls now have a constrained width; the complete buyer and
   Manager returns journey passes on the Georgian phone profile.

## Broader journey coverage

The final gate also runs the dedicated accessibility suites for checkout,
catalogue administration, ingestion, order operations, accounts, returns,
access control, worldwide selling, content/consent and degraded system states.
Those suites add field-error association, modal focus, table navigation,
translation controls, MFA/security controls, file-upload alternatives and
offline/maintenance semantics beyond the critical-route matrix.

No WCAG exception or risk acceptance is recorded. Any future component that
introduces an Axe violation, sub-44px core form control, keyboard-inaccessible
scrolling, or 320px horizontal overflow fails the release gate.
