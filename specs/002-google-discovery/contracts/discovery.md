# Contracts: Google Discovery

## Localized route set

```ts
type LocalizedRouteSet = {
  requestedLocale: AppLocale;
  resolvedLocale: AppLocale;
  canonicalUrl: string;
  alternates: Partial<Record<AppLocale, string>>;
  xDefault: string;
  indexable: boolean;
};
```

Input translations belong to one stable identity. Output URLs are absolute and clean. Duplicate/unsupported locales and invalid slugs are rejected at the query boundary.

## Page metadata

Indexable pages return unique localized title/description, clean self-canonical, real reciprocal language URLs plus `x-default`, index/follow robots, matching Open Graph, and matching Twitter data with an approved page image or branded fallback. Fallback and arbitrary query/filter pages return `noindex,follow` with a clean canonical. Missing records return not found.

## Structured data

JSON-LD escapes `<`, `>`, `&`, U+2028, and U+2029 so authored text cannot close the script.

- Homepage: localized `WebSite` and `OnlineStore` using approved facts only.
- Product: emitted only after database and runtime gates; exact visible name, description, SKU, image, condition, URL, price, currency, availability, seller, and optional verified identifiers/origin/shipping/returns. Never ratings/reviews.
- Article: headline, language, canonical URL, approved images, publication/modification dates, and approved author/publisher.
- Breadcrumb: positions/URLs exactly match the visible component.

## Sitemap

Includes clean indexable localized homes, collection indexes, published collections/products, journal indexes/articles, approved services, and approved public images. Alternatives group by stable identity; source times supply `lastModified`. Query strings, fallback paths, private/transactional routes, drafts, redirects, and removed records are forbidden. Throw `SITEMAP_SHARDING_REQUIRED` at 45,000 entries.

## Google Merchant feed

`GET /feeds/google/{profile}.xml` recognizes `ge-en-gel`, `de-de-eur`, `de-en-eur`, and `de-ru-eur`. Unknown, disabled, incomplete, or empty profiles return HTTP 404. Enabled profiles return HTTP 200 and `application/xml; charset=utf-8`.

The RSS 2.0 document uses the Google namespace and includes stable ID, title, description, clean product route with a validated `currency` query, approved image, exact price/currency, availability, condition, identifier state, shipping, and returns. All XML is escaped.

Stable validation codes include `profile_disabled`, `domain_unapproved`, `seller_missing`, `seller_ambiguous`, `market_unapproved`, `origin_missing`, `delivery_policy_missing`, `return_policy_missing`, `price_missing`, `currency_mismatch`, `translation_missing`, `image_missing`, `description_missing`, `condition_missing`, `identifier_unresolved`, and `no_eligible_items`.

## Private-route indexing

Account, auth, admin, cart, checkout, order, payment, quote, and preview routes carry document no-index, `X-Robots-Tag: noindex, nofollow`, private/no-store caching where applicable, and sitemap exclusion.

## Redirects

`/` permanently redirects to `/ka`. Published slug changes create audited 308 redirects for the same identity with no loop/chain. Sold products remain 200/OutOfStock. Removed, invalid, or never-published records return 404.
