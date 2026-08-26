# US9 Worldwide Selling Visual and Accessibility Evidence

Verified: 2026-08-26

## Why this gate exists

Worldwide selling combines long localized copy, exact prices, country-dependent delivery, unapproved legal text, and a high-density Manager workspace. The buyer and staff interfaces therefore need to remain truthful, readable, keyboard-accessible, and touch-safe from a 390 px phone through a 1440 px desktop.

## Automated browser evidence

| Check                             | Command                                                                                                          | Result                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer-to-Manager journey          | `playwright test tests/e2e/worldwide-selling.spec.ts --project=tablet-768-en`                                    | PASS — explicit EUR price, German language, invalid discount, Georgia customs disclosure, US manual quote, private status, Manager resolution, and settings |
| Five-project accessibility matrix | `playwright test tests/accessibility/worldwide-selling.spec.ts`                                                  | PASS — 5/5 across Georgian phone, English tablet, German Chromium desktop, Russian Firefox, and English WebKit                                              |
| Automated accessibility           | Axe 4.11 on public quote and Manager quote/promotion/currency/delivery/market routes                             | PASS — zero violations                                                                                                                                      |
| Touch sizing                      | Visible form controls, buttons, and Manager navigation                                                           | PASS — at least 44 CSS px high                                                                                                                              |
| Responsive behavior               | 390, 768, and 1440 CSS px with all four locales                                                                  | PASS — no page-level horizontal scrolling; intentionally wide tablet/desktop price rows use a contained scroller                                            |
| Long and legacy content           | Georgian/German labels, four-locale customs text, international addresses, and open-ended legacy promotion dates | PASS — text wraps, draft legal status remains visible, and open-ended dates render safely                                                                   |

## Screenshots

Public quote screens:

- `docs/quality/screenshots/worldwide-public-phone-390-ka.png`
- `docs/quality/screenshots/worldwide-public-tablet-768-en.png`
- `docs/quality/screenshots/worldwide-public-desktop-1440-de.png`
- `docs/quality/screenshots/worldwide-public-firefox-ru.png`
- `docs/quality/screenshots/worldwide-public-webkit-en.png`

Manager worldwide settings screens:

- `docs/quality/screenshots/worldwide-admin-phone-390-ka.png`
- `docs/quality/screenshots/worldwide-admin-tablet-768-en.png`
- `docs/quality/screenshots/worldwide-admin-desktop-1440-de.png`
- `docs/quality/screenshots/worldwide-admin-firefox-ru.png`
- `docs/quality/screenshots/worldwide-admin-webkit-en.png`

## Visual review notes

- The Georgian 390 px quote form keeps every label, warning, address field, and action inside the viewport. Manager price rows become stacked forms below 480 px, avoiding an unusable miniature spreadsheet.
- The German 1440 px quote form keeps a restrained reading width while the Manager market editor uses balanced two-column cards.
- Draft tax/customs wording is visibly labeled as awaiting legal approval; operational configuration never visually upgrades it into approved advice.
- Public quote language and display currency controls remain independent. Unsupported destinations receive a request form, not a fabricated delivery rate.
- The price-source selector and every repeated price control include a product-and-currency screen-reader name.
- The administration navigation is a contained horizontal region at phone width; the document itself cannot pan sideways.

## Outcome

US9 visual, responsive, keyboard, touch, and automated-accessibility quality is approved in the local production-shaped environment. Hosted staging must still prove real domain behavior, managed Supabase policies, provider delivery, monitoring, and approved legal copy before launch.
