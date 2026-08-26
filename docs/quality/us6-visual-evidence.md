# US6 Customer Account Visual and Accessibility Evidence

Verified: 2026-08-26

## Why this gate exists

An account is optional convenience, so it must never turn a simple purchase into a confusing or inaccessible security workflow. Sign-up, recovery, addresses, orders, wishlist, preferences, sessions, and privacy controls must remain readable and operable across the supported languages and device sizes.

## Automated browser evidence

| Check                             | Command                                                                                           | Result                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete customer journey         | `npx playwright test tests/e2e/customer-account.spec.ts --project=tablet-768-en`                  | PASS — anonymous wishlist, sign-up/merge, address prefill, accepted order/history, second-session revoke, sign-out, Mailpit recovery, new-password sign-in, wishlist retention, and privacy request |
| Five-project accessibility matrix | `npx playwright test tests/accessibility/customer-account.spec.ts`                                | PASS — 5/5 across Chromium phone/tablet/desktop, Firefox, and WebKit                                                                                                                                |
| Automated accessibility           | Axe 4.11 on sign-in, sign-up, recovery, overview, orders, addresses, wishlist, and settings       | PASS — zero violations                                                                                                                                                                              |
| Touch sizing                      | Visible account/auth inputs, selects, textareas, buttons, summaries, and account navigation links | PASS — all at least 44 CSS px high                                                                                                                                                                  |
| Responsive layout                 | 390, 768, and 1440 CSS px with Georgian, English, German, and Russian content                     | PASS — no document-level horizontal overflow                                                                                                                                                        |
| Keyboard operation                | Programmatic focus plus Enter activation on account navigation in every browser project           | PASS — the focused account route activates without pointer input                                                                                                                                    |

## Screenshots

- `docs/quality/screenshots/customer-account-phone-390-ka.png`
- `docs/quality/screenshots/customer-account-tablet-768-en.png`
- `docs/quality/screenshots/customer-account-desktop-1440-de.png`
- `docs/quality/screenshots/customer-account-firefox-ru.png`
- `docs/quality/screenshots/customer-account-webkit-en.png`

## Review notes

- The 390 px Georgian view keeps the account navigation in a contained horizontal region and does not widen the page.
- Preference and privacy selects use an explicit 44 px height because mobile Safari ignored `min-height` on its native select rendering.
- Long settings content stays in a single readable column on phones and expands without excessive form width on larger viewports.
- Session controls distinguish the current session, other sessions, and every session; privacy language explains that required order and financial evidence is retained.
- The four-locale screenshots show the same information hierarchy and control order, with no clipped labels or hidden actions.

## Outcome

US6 visual, responsive, keyboard, touch, and automated-accessibility quality is approved in the local production-shaped environment. Managed staging remains a launch gate for password-manager, email-delivery, and hosted-auth behavior.
