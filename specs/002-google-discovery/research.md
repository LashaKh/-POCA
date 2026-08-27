# Research: Google Discovery

## Localized identity

**Decision**: Build alternates from all published translations for one stable product, collection, or content identity.  
**Rationale**: Slugs are localized copy, not identity; one route set prevents drift across metadata, sitemap, JSON-LD, and links.  
**Alternatives considered**: Reuse one slug across locales; translate slugs in code; duplicate routing logic per page.

## Fallback indexing

**Decision**: Keep customer-friendly fallback rendering, disclose it, mark it `noindex,follow`, and canonicalize to the real resolved translation.  
**Rationale**: Customers still receive content while search engines avoid a false-language duplicate.  
**Alternatives considered**: 404 every missing translation; index fallback; canonicalize to a nonexistent URL.

## Public catalog truth

**Decision**: Extend `public_catalog_products` rather than create an SEO catalog.  
**Rationale**: Existing guarded price, availability, publication, and approved-media sources remain authoritative.  
**Alternatives considered**: Parallel SEO tables; privileged page queries; static catalog exports.

## Identifier honesty

**Decision**: Store optional brand, GTIN, and MPN plus explicit `identifier_exists`. Never infer manufacturer from seller.  
**Rationale**: Vintage carpets may genuinely lack manufacturer identifiers; explicit absence distinguishes “none” from “unknown.”  
**Alternatives considered**: Treat SKU as GTIN/MPN; call ÉPOCA the manufacturer; silently omit unresolved state.

## Rich-result gate

**Decision**: Keep `structured_data_eligible` authoritative and add runtime checks for description, approved image, price, currency, availability, and condition.  
**Rationale**: Editorial readiness plus runtime checks prevent claims from stale or incomplete projections.  
**Alternatives considered**: Always emit Product; hide ordinary pages; infer missing facts.

## Metadata and social image

**Decision**: Prefer localized SEO fields, then visible page copy; use approved page images or a generated branded fallback.  
**Rationale**: Deterministic, truthful output without relying on unreviewed external assets.  
**Alternatives considered**: Generic metadata everywhere; arbitrary product imagery; invented promotional imagery.

## Crawl structure

**Decision**: Add a light collection directory and semantic breadcrumbs; do not expose filters as landing pages.  
**Rationale**: Ordinary anchor paths serve shoppers and crawlers with negligible JavaScript or performance cost.  
**Alternatives considered**: Sitemap-only discovery; mass filter pages; client-only navigation.

## Sitemap scale

**Decision**: Keep one grouped sitemap and throw before 45,000 entries; shard only when necessary.  
**Rationale**: Current scale does not justify a sitemap index, but silent truncation is unacceptable.  
**Alternatives considered**: Always shard; cap output; wait until the 50,000 ceiling.

## Merchant delivery

**Decision**: Implement strict XML profile/item validation without a Merchant SDK; start with scheduled retrieval and automatic updates after activation.  
**Rationale**: Current catalog scale and blocked activation do not justify API credentials and synchronization.  
**Alternatives considered**: Merchant API now; static CSV; third-party feed service.

## Merchant readiness

**Decision**: Model GE/English/GEL and DE/German/EUR plus later DE/English/EUR and DE/Russian/EUR; keep all disabled until exact seller, origin, price, shipping, return, market, and domain evidence exists.  
**Rationale**: The two-seller model is unresolved and Google currently supports Georgia/GEL but not Georgian as a feed language. Georgian organic pages remain indexable.  
**Alternatives considered**: Guess a seller; merge legal sellers; publish incomplete items; remove Georgian organic pages.

## External activation

**Decision**: Record Search Console, Merchant Center, Bing, and domain activation in an operational runbook, not application credentials.  
**Rationale**: These are external, evidence-based operations. Search Console is the required search source; no new analytics or Business Profile is added.  
**Alternatives considered**: Automate account mutations now; add Google Analytics by default; create a Business Profile without a customer-facing location.

## Performance

**Decision**: Keep new navigation server-rendered, preserve reserved image dimensions and responsive loading, and add no tracking script.  
**Rationale**: Discovery improvements must not undermine Core Web Vitals.  
**Alternatives considered**: Client-only schema/navigation builders; unbounded imagery; additional tracking.
