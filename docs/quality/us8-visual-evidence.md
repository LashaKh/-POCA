# US8 Auth, Settings, and Audit Visual Evidence

Verified: 2026-08-26

## Why this gate exists

Access control must remain usable under pressure. An Owner needs to understand the impact of a staff or privacy action, complete MFA without guesswork, inspect evidence, and recover from a session problem on a phone as reliably as on a desktop.

## Automated browser evidence

| Check                                            | Command                                                                             | Result                                                                                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real Manager/Owner journey                       | npx playwright test tests/e2e/admin-access.spec.ts --project=desktop-1440-de        | PASS — Manager denial, first-time Owner TOTP enrollment, AAL2 challenge, secret-free settings, session revocation, exact deactivation, and audit search |
| Five-project accessibility and responsive matrix | npx playwright test tests/accessibility/admin-access.spec.ts                        | PASS — 5/5 across Chromium phone/tablet/desktop, Firefox, and WebKit                                                                                    |
| Automated accessibility                          | Axe 4.11 on integrations, privacy, staff, and audit in every project                | PASS — zero violations                                                                                                                                  |
| Keyboard/touch sizing                            | Visible button, input, select, and summary controls                                 | PASS — all at least 44 CSS px high                                                                                                                      |
| Responsive layout                                | 390, 768, and 1440 CSS px with Georgian, English, German, and Russian route content | PASS — no document-level horizontal overflow                                                                                                            |

## Screenshots

- docs/quality/screenshots/admin-access-phone-390-ka.png
- docs/quality/screenshots/admin-access-tablet-768-en.png
- docs/quality/screenshots/admin-access-desktop-1440-de.png
- docs/quality/screenshots/admin-access-firefox-ru.png
- docs/quality/screenshots/admin-access-webkit-en.png

## Manual review notes

- The mobile administration header keeps navigation in its own keyboard-scrollable region; long Georgian labels no longer widen the document.
- MFA exposes a QR code and a manual setup value, labels the one-time-code field correctly, and reports failures without disclosing account state.
- Every protected-operation panel states impact, shows a reversible alternative, requires the exact generated phrase, and requires an audit reason.
- Dense tables use contained, focusable horizontal regions where necessary.
- Session controls distinguish the current session, other sessions, and every session.

## Outcome

US8 visual and interaction quality is approved for the local production-shaped environment. A deployed staging pass remains part of the release gate because public network, browser password-manager, and managed Supabase behavior cannot be proven by the local stack alone.
