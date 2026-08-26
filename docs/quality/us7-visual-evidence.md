# US7 Returns Visual and Accessibility Evidence

Verified: 2026-08-26

## Why this gate exists

Returns combine private buyer material, consequential staff decisions, money, and inventory. The buyer and Manager interfaces therefore need an unambiguous status hierarchy, full keyboard and touch access, readable long translations, and no hidden controls at phone size.

## Automated browser evidence

| Check                             | Command                                                                       | Result                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Complete buyer-to-Manager journey | `npx playwright test tests/e2e/returns.spec.ts --project=tablet-768-en`       | PASS — private buyer evidence, information request, approval, receipt, inspection, partial refund, and duplicate-safe restock |
| Exception journey                 | same command                                                                  | PASS — expired return window, ineligible explanation, reasoned rejection, buyer-visible decision, and private account status  |
| Five-project accessibility matrix | `npx playwright test tests/accessibility/returns.spec.ts`                     | PASS — 5/5 across Chromium phone/tablet/desktop, Firefox, and WebKit                                                          |
| Automated accessibility           | Axe 4.11 on buyer request/status and Manager queue/detail/settings            | PASS — zero violations                                                                                                        |
| Touch sizing                      | Visible buyer/admin inputs, selects, textareas, buttons, and navigation links | PASS — all at least 44 CSS px high                                                                                            |
| Responsive layout                 | 390, 768, and 1440 CSS px with Georgian, English, German, and Russian         | PASS — no document-level horizontal overflow                                                                                  |

## Screenshots

- `docs/quality/screenshots/returns-phone-390-ka.png`
- `docs/quality/screenshots/returns-tablet-768-en.png`
- `docs/quality/screenshots/returns-desktop-1440-de.png`
- `docs/quality/screenshots/returns-firefox-ru.png`
- `docs/quality/screenshots/returns-webkit-en.png`

## Visual review notes

- The Georgian 390 px Manager view keeps administration navigation in a contained horizontal region, uses a single-column decision flow, and keeps all controls at least 44 px high.
- The German 1440 px view uses balanced buyer/evidence cards and operational forms without excessive line length.
- Request kind, evidence state, status, reason, decision reason, operations, policy controls, and event labels are localized rather than exposing database vocabulary.
- Private evidence is presented only through short-lived signed links. The upload form documents permitted image types and never exposes a public object URL.
- Policy configuration visibly separates operational settings from unapproved legal wording.

## Outcome

US7 visual, responsive, touch, keyboard, and automated-accessibility quality is approved in the local production-shaped environment. Managed staging remains required to verify hosted Storage links, real payment-provider refunds, and production email delivery.
