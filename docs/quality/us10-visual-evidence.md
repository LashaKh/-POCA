# US10 Content, Contact, and Consent Visual Evidence

Verified: 2026-08-26

## Why this gate exists

Editorial and service content combines long localized copy, private contact data, optional newsletter/analytics choices, and a dense Manager workspace. These surfaces must remain readable and fully operable from a 390 px phone through a 1440 px desktop, including when expandable privacy controls are open.

## Automated browser evidence

| Check                             | Command                                                                                                                          | Result                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stateful content/support journey  | `playwright test tests/e2e/content-and-consent.spec.ts --project=tablet-768-en --workers=1`                                      | PASS — create, private preview, schedule/catch-up, managed menu, redirect, private contact status, newsletter subscribe/withdraw, and analytics grant/withdraw |
| Five-project accessibility matrix | `playwright test tests/accessibility/content-and-consent.spec.ts --workers=2`                                                    | PASS — 5/5 across Georgian phone, English tablet, German Chromium desktop, Russian Firefox, and English WebKit                                                 |
| Automated accessibility           | Axe 4.11 on homepage, About, Privacy, Contact, content queue/editor, menus, and redirects with expandable controls open          | PASS — zero violations                                                                                                                                         |
| Touch sizing                      | Visible buttons, inputs, selects, textareas, summaries, and Manager navigation                                                   | PASS — at least 44 CSS px high                                                                                                                                 |
| Responsive behavior               | 390, 768, and 1440 CSS px with all four locales                                                                                  | PASS — no document-level horizontal scrolling; long Manager navigation is contained in its own scroller                                                        |
| Progressive state                 | Native-valid editor form, server-action hydration, status announcements, private references, and explicit legal/fallback notices | PASS — actions remain recoverable and do not visually claim success early                                                                                      |

## Screenshots

Public contact, newsletter, and expanded privacy controls:

- `docs/quality/screenshots/content-public-phone-390-ka.png`
- `docs/quality/screenshots/content-public-tablet-768-en.png`
- `docs/quality/screenshots/content-public-desktop-1440-de.png`
- `docs/quality/screenshots/content-public-firefox-ru.png`
- `docs/quality/screenshots/content-public-webkit-en.png`

Manager content/navigation/redirect surfaces:

- `docs/quality/screenshots/content-admin-phone-390-ka.png`
- `docs/quality/screenshots/content-admin-tablet-768-en.png`
- `docs/quality/screenshots/content-admin-desktop-1440-de.png`
- `docs/quality/screenshots/content-admin-firefox-ru.png`
- `docs/quality/screenshots/content-admin-webkit-en.png`

## Visual review notes

- The Georgian 390 px service title now wraps within the viewport. Contact fields, newsletter controls, and privacy choices stack with readable spacing and 44 px interactions.
- Managed storefront navigation remains visible on phones/tablets as a contained horizontal row; publishing a one-item menu was verified in the production build.
- The German desktop contact form keeps a restrained reading width. Expanded consent choices form one logical column instead of scattering related controls.
- Manager navigation has its own bounded horizontal lane, preventing long translated labels and eleven operational destinations from overlapping the brand or session controls.
- The 390 px Manager editor/cards stack without document panning; 768/1440 layouts progressively use additional columns.
- Legal-dependent Privacy, Cookie, Terms, Delivery, and Returns fallback pages visibly state that final legal wording is not approved and are excluded from indexing until reviewed copy is published.

## Outcome

US10 visual, responsive, keyboard, touch, and automated-accessibility quality is approved in the local production-shaped environment. Hosted staging must still prove the managed domain, real support channel, provider delivery, monitoring, and legally approved copy before launch.
