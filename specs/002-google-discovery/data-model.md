# Data Model: Google Discovery

## LocalizedRouteSet

| Field             | Type               | Rule                                                                         |
| ----------------- | ------------------ | ---------------------------------------------------------------------------- |
| `requestedLocale` | `AppLocale`        | Locale in requested URL                                                      |
| `resolvedLocale`  | `AppLocale`        | Locale actually rendered                                                     |
| `canonicalUrl`    | absolute URL       | Clean real route, no filters/tracking/currency                               |
| `alternates`      | partial locale map | Real published translations for one stable identity only                     |
| `xDefault`        | absolute URL       | Georgian, else English, else deterministic first alternate                   |
| `indexable`       | boolean            | False for fallback/private/transaction/search/filter/draft/redirected output |

Identity is a product ID, collection ID, or content entry key. A slug never establishes cross-language identity.

## PublicProductDiscoveryRecord

Extends `CatalogProduct` with `seoTitle`, `seoDescription`, `condition`, `structuredDataEligible`, optional `brand`, `gtin`, `mpn`, explicit `identifierExists`, `publishedAt`, `updatedAt`, approved image records, and `routeSet`.

GTIN accepts 8, 12, 13, or 14 digits. MPN is 1–70 printable characters. `identifierExists = false` cannot coexist with GTIN or MPN. Brand never implies manufacturer. Existing SKU remains ÉPOCA’s stable internal identifier.

## PublishedCollectionDiscoveryRecord

Stable collection ID, locale, real slug, localized name/description/SEO fields, publication/update timestamps, and count of active public products. Both collection and translation must be published.

## FeedProfile

Fields: known profile ID, exactly one approved seller reference, target country, supported language, currency, explicit activation state, market code, fulfillment origin, delivery policy reference, return policy reference, and stable validation errors.

State: `disabled` → `ready` only after domain/seller/market/price/origin/shipping/return/language checks; `ready` → `active` requires explicit activation. Any missing fact returns it to disabled.

## FeedItem

One product in one profile with stable ID, localized title/description, real landing route and validated currency query, approved images, exact price/availability/condition, identifier state, one seller, shipping, and returns. Ambiguous or mismatched candidates are excluded.

## SlugRedirect

Reuse existing audited `content_redirects`: old localized public path, current localized path for the same identity, HTTP 308, version/audit facts. Redirects are loop-free and never send removed products to the homepage.

## DiscoveryReadinessFinding

Fields: surface, stable code, warning/blocker severity, entity reference, owner, and evidence reference. The first catalog warning is `product_without_public_collection_path`; external blockers remain in the operations register.
