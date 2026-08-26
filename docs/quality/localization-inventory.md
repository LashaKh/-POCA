# Localization inventory

Verified: 2026-08-26. Supported locales: Georgian (`ka`), English (`en`), German (`de`), and Russian (`ru`).

## Contract

- All four JSON catalogs contain the same 953 leaf keys. The automated catalog test rejects a missing or extra key.
- The single `[locale]` route tree supplies all 73 public, customer, authentication, preview, and administration pages to every supported locale.
- Public metadata, validation/result messages, consent and fallback disclosures, administration labels, and safe system states use the same locale catalog contract.
- Order, quote, return, contact, content/newsletter, and operational notification renderers select copy by the typed `AppLocale`; the automated test renders the primary order/quote/return subjects and bodies in all four languages.
- Editorial content can use a reviewed localized fallback only when its content policy permits it. The public page explicitly discloses the fallback language; strict content refuses publication until every locale is reviewed.

## Formatting and scripts

- Numbers, currencies, dates, and addresses are formatted with locale-aware `Intl` APIs while monetary arithmetic remains in integer minor units.
- Inter covers Latin/Cyrillic utility copy, Noto Sans Georgian covers Georgian utility copy, Noto Serif covers Latin/Cyrillic display copy, and Noto Serif Georgian covers Georgian display copy.
- `tests/visual/fonts.spec.ts` waits for browser font loading, checks the computed font stacks, exercises Georgian/Latin/Cyrillic text and numerals, rejects replacement glyphs, and verifies localized currency output across the configured browser/viewports.

## Deliberate exceptions

- Stable business identifiers, SKUs, ISO currency codes, IBAN, provider names, and immutable status codes remain machine-readable rather than translated.
- The root catastrophic error and static offline/maintenance documents carry concise copy for all four languages because the normal locale runtime may be unavailable.
- Legal copy marked draft stays visibly unapproved and `noindex`; localization never turns it into an approved claim.
