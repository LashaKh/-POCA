# Feature Specification: Google Discovery

<!-- UPGRADED:v1 -->

**Feature Branch**: `002-google-discovery`  
**Created**: 2026-08-27  
**Status**: Approved for planning  
**Input**: Improve ÉPOCA’s multilingual search visibility, product discovery, crawlable storefront structure, Google eligibility, measurement readiness, and honest authority without promising rankings or publishing unverified claims.

## Context

ÉPOCA has a useful search foundation, but a search engine can still receive the wrong language URL, generic metadata, incomplete product facts, thin navigation, or private shopping routes. This feature makes every public page behave like a well-labelled gallery room: search engines and customers can see what it is, how it relates to other rooms, and which language version is authoritative.

## Clarifications

### Session 2026-08-27

- Q: Which production domain should be used for activation? → A: Use the project placeholder now; keep external activation blocked until a final domain is chosen.

## User Scenarios & Testing

### User Story 1 - Reach the correct language page (Priority: P1)

As a shopper arriving from a search result, I reach the real Georgian, English, German, or Russian URL for that translation and see a trustworthy title and summary that match the page.

**Why this priority**: Correct, unique URLs and indexability are the foundation for every other discovery improvement.

**Independent Test**: Crawl representative home, collection, product, journal, and service pages in every locale and confirm that each indexable page identifies itself, exposes only real reciprocal alternatives, and excludes private or fallback experiences.

**Acceptance Scenarios**:

1. **Given** an approved product has different published slugs by locale, **when** any translation is requested, **then** its canonical and language alternatives use the real slugs for the same product identity.
2. **Given** a requested translation is unavailable and fallback content is shown, **when** the page renders, **then** it is `noindex,follow` and its canonical points to a real published translation.
3. **Given** a shopper or crawler requests the bare domain root, **when** routing completes, **then** it receives one permanent redirect to the Georgian homepage.
4. **Given** a private or transactional route, **when** it is requested or the sitemap is generated, **then** the route carries explicit no-index instructions and never appears in a sitemap.

---

### User Story 2 - Discover carpets through ordinary navigation (Priority: P1)

As a shopper or crawler, I can move from the homepage to the collection index, into a curated collection, and then to a published carpet using ordinary links and visible breadcrumbs.

**Why this priority**: A search engine cannot reliably understand or value an orphan product, and a shopper cannot confidently explore an invisible catalog structure.

**Independent Test**: Start at each localized homepage without using the sitemap, follow header/footer links to collections, and verify every published product under test is reachable from at least one published collection path.

**Acceptance Scenarios**:

1. **Given** published curated collections exist, **when** a visitor opens the localized collection index, **then** the collections appear as meaningful links with localized names and descriptions.
2. **Given** a visitor opens a collection, product, journal article, or approved service page, **when** the page renders, **then** visible semantic breadcrumbs identify its place in the storefront.
3. **Given** a published product has no public collection path, **when** administrators assess publication readiness, **then** they see an actionable warning.
4. **Given** a visitor applies search, filter, sort, or currency parameters, **when** the result renders, **then** arbitrary combinations are not indexed and the clean relevant page remains canonical.

---

### User Story 3 - Understand a product in Google surfaces (Priority: P2)

As a shopper comparing carpets in search or image results, I receive factual product, seller, image, availability, and article information that matches the visible storefront.

**Why this priority**: Rich appearances can improve understanding and qualified visits, but only after correct URLs and crawl paths exist.

**Independent Test**: Validate representative eligible and ineligible pages against automated structured-data contracts and confirm no output contains unsupported facts, fake reviews, or unsafe serialized content.

**Acceptance Scenarios**:

1. **Given** a product passes the existing rich-result eligibility gate, **when** its structured data is emitted, **then** approved images, description, SKU, condition, identifiers, price, currency, availability, seller reference, and canonical URL match the page.
2. **Given** a product lacks a required image or verified fact, **when** its page renders, **then** it does not claim product rich-result eligibility.
3. **Given** business, shipping, return, identifier, author, or publisher facts are unapproved, **when** structured data is built, **then** those claims are omitted rather than inferred.
4. **Given** a sold carpet remains part of the catalog history, **when** it is requested, **then** its page remains available and reports `OutOfStock`; removed or invalid records return a true not-found response.

---

### User Story 4 - Publish accurate Merchant feeds when ready (Priority: P2)

As an operator, I can activate a market-specific public product feed only after every item resolves to one approved seller, market, price, currency, delivery policy, and return policy.

**Why this priority**: Merchant feeds expand free-listing eligibility, but a partially correct feed can mislead buyers and create disapprovals.

**Independent Test**: Request enabled, disabled, valid, and ambiguous feed profiles; validate generated XML and compare every item to its landing page.

**Acceptance Scenarios**:

1. **Given** a feed profile is disabled or incomplete, **when** its URL is requested, **then** it returns not found and publishes no partial claims.
2. **Given** an item has ambiguous seller or policy ownership, **when** feed eligibility is assessed, **then** the item is excluded and an administrative blocker identifies the missing decision.
3. **Given** an eligible feed item, **when** Google follows its link, **then** a validated currency parameter produces the submitted price on first render while the clean product URL remains canonical.
4. **Given** the Georgia feed is activated, **when** it is generated, **then** it uses an approved English storefront experience with Georgia and GEL rather than an unsupported feed-language claim.

---

### User Story 5 - Grow useful discovery and monitor outcomes (Priority: P3)

As the business owner, I can publish a restrained four-language keyword-to-page map based on real inventory and monitor organic discovery after a final domain is activated.

**Why this priority**: Technical eligibility creates the doorway; useful original pages and measurement determine whether the right buyers find and value the catalog.

**Independent Test**: Review the keyword map and activation runbook, then verify that every proposed indexable page has distinct buyer value, a real catalog or editorial purpose, and an owner-readable success signal.

**Acceptance Scenarios**:

1. **Given** a proposed collection or article topic, **when** it is approved for indexing, **then** it is supported by verified inventory or distinct editorial value rather than automated keyword variations.
2. **Given** relevant journal and product content exists, **when** a shopper reads it, **then** meaningful links connect advice, collections, products, delivery, care, and returns.
3. **Given** a final domain is not configured, **when** readiness is checked, **then** Search Console, Merchant Center, Bing, and public indexing activation remain visibly blocked.
4. **Given** the site is activated, **when** the first eight weekly reviews and later monthly reviews occur, **then** indexing, impressions, clicks, click-through rate, rich-result errors, feed disapprovals, experience metrics, and organic conversions are recorded without a ranking guarantee.

### Edge Cases

- A product has Georgian and German translations but no English or Russian translation.
- A translation exists but is draft, withdrawn, or falls back to another language.
- Two products or collections attempt to publish the same locale and slug.
- A published slug changes while old search results and saved links still exist.
- A localized collection has no products, or a product belongs only to a draft collection.
- A request includes unsupported currency, repeated query parameters, filter combinations, or tracking parameters.
- A product is sold, withdrawn, deleted, missing its primary image, or has inconsistent price and availability facts.
- Seller, origin, shipping, or return information differs between Georgia and Germany/EU.
- A product has a known brand, GTIN, or MPN; has no manufacturer identifier; or has not yet been assessed.
- Structured-data text contains markup-like characters or a closing script sequence.
- Sitemap generation approaches the 45,000-URL readiness threshold or contains a redirect, query string, fallback, or non-indexable URL.
- A feed profile is known but disabled, unknown, incomplete, or contains zero eligible items.
- Longer translations wrap breadcrumbs or navigation on phone, tablet, or desktop widths.

### Journey Hardening

- **Entry and continuity**: Search-result, direct-link, sitemap, social-preview, and internal-navigation entry points MUST converge on the same localized canonical entity without a redirect chain.
- **Empty and degraded states**: Empty collections remain useful only when intentionally curated; missing optional media or facts are omitted cleanly, while missing required product facts remove rich-result and feed eligibility without hiding the ordinary page.
- **Interruption and recovery**: Slug changes preserve old public links through an audited permanent redirect, while an unavailable external Google service never prevents the storefront from rendering its own factual metadata.
- **Trust and inclusion**: Breadcrumbs, page titles, image descriptions, seller facts, prices, delivery, returns, and availability MUST agree with visible content and remain understandable at keyboard, screen-reader, phone, tablet, and desktop breakpoints.
- **Operational ownership**: Every activation blocker names the missing fact, affected market or surface, responsible owner, and evidence location; no operator must infer why a page or item was excluded.

## Requirements

### Functional Requirements

- **FR-001**: The storefront MUST build localized route sets from stable content identities and each approved translation’s real slug.
- **FR-002**: Every indexable localized page MUST emit a self-canonical and reciprocal language alternatives only for real approved translations, plus an intentional `x-default`.
- **FR-003**: A fallback-language rendering MUST be `noindex,follow` and canonicalize to a real published translation.
- **FR-004**: Public product discovery MUST expose localized SEO title and description, condition, rich-result eligibility, identifier facts, publication timestamps, and approved image URLs.
- **FR-005**: Every indexable surface MUST have a unique localized title, description, social preview, and truthful fallback social image when no approved page image exists.
- **FR-006**: Account, authentication, cart, checkout, order, payment, quote, preview, and administration routes MUST emit explicit no-index response and document metadata and MUST NOT enter any sitemap.
- **FR-007**: The domain root MUST permanently redirect to Georgian; final apex-versus-`www` behavior MUST remain an activation decision.
- **FR-008**: Published slug changes MUST create audited permanent redirects; sold products MUST remain addressable as out of stock, while removed or invalid records MUST return not found.
- **FR-009**: The storefront MUST expose a localized collection index linked from the default header and footer.
- **FR-010**: Collection, product, journal article, and approved service pages MUST display semantic localized breadcrumbs.
- **FR-011**: Publication readiness MUST identify published products that have no ordinary anchor-link path from a published collection.
- **FR-012**: Curated collection pages MAY be indexable; internal search, arbitrary filters, sorting, and query combinations MUST be `noindex,follow` with a clean relevant canonical.
- **FR-013**: The sitemap MUST include eligible localized homepages, collection index, published collections and products, journal index and articles, approved service pages, and approved product or article images.
- **FR-014**: Sitemap entries MUST group real language alternatives, use source modification times where available, and exclude fallback, draft, private, transactional, redirected, removed, and query-string URLs.
- **FR-015**: Sitemap readiness MUST fail before 45,000 URLs so sharding is designed before the 50,000-URL protocol limit.
- **FR-016**: Localized homepages MUST emit `WebSite` and verified online-store organization data using approved business facts only.
- **FR-017**: Eligible product pages MUST emit factual `Product` and `Offer` data matching visible images, description, SKU, condition, identifiers, price, currency, availability, seller, and canonical URL.
- **FR-018**: Origin, shipping, returns, brand, GTIN, MPN, and explicit no-identifier facts MUST appear only when their authoritative source is approved and matches the page.
- **FR-019**: Ineligible products MUST NOT emit product rich-result claims, and the storefront MUST NOT emit aggregate ratings or reviews until a verified-purchase review system exists.
- **FR-020**: Collection, product, journal, and service routes MUST emit matching `BreadcrumbList`; articles MUST identify canonical entity URL, approved images, publication and modification dates, author, and publisher when approved.
- **FR-021**: Safe JSON-LD serialization MUST prevent page content from ending or injecting an executable script.
- **FR-022**: The system MUST define feed profiles with one seller, target country, supported language, currency, activation state, delivery reference, return reference, and validation results.
- **FR-023**: Public Google feed endpoints MUST return valid XML containing public facts only and MUST require no credential in the URL.
- **FR-024**: Disabled or incomplete feed profiles MUST return not found; ambiguous items MUST be excluded and reported as blockers.
- **FR-025**: Eligible feed items MUST contain stable ID, localized title and description, landing URL, approved images, price, availability, condition, identifiers, shipping, and returns that match the rendered page.
- **FR-026**: Feed landing links MUST accept only enabled currencies for the item, override cookie preference for that request, and preserve a clean organic canonical.
- **FR-027**: Initial feed profiles MUST model Georgia/English/GEL and Germany/German/EUR; later Germany/English/EUR and Germany/Russian/EUR profiles remain disabled until approved.
- **FR-028**: Organic SEO MUST remain independently deployable while Merchant activation stays blocked on seller, legal, shipping, return, domain, and market readiness.
- **FR-029**: The project MUST maintain a four-language keyword-to-page map grounded in verified catalog inventory and buyer intent, without indexing automated keyword or filter variations.
- **FR-030**: Relevant editorial, collection, product, care, delivery, and return pages MUST support contextual internal links without paid-link schemes or invented authority.
- **FR-031**: Approved images MUST use descriptive filenames, reviewed localized alternative text, responsive delivery, reserved dimensions, and sitemap inclusion; optional captions MUST remain factual.
- **FR-032**: The storefront MUST preserve 75th-percentile experience targets of LCP at or below 2.5 seconds, INP below 200 milliseconds, and CLS below 0.1.
- **FR-033**: Domain activation MUST include TLS and host redirect verification, Search Console Domain-property verification and sitemap submission, Merchant verification and free listings, Bing import, representative URL inspection, and an eight-week weekly then monthly review cadence.
- **FR-034**: A Google Business Profile MUST remain out of scope until ÉPOCA has a verified customer-facing physical location.

### Key Entities

- **Localized Route Set**: A stable entity’s requested and resolved locale, canonical URL, real published alternatives, `x-default`, and indexability decision.
- **Public Product Discovery Record**: Public catalog facts, localized SEO fields, condition, identifiers, rich-result eligibility, publication timestamps, approved images, prices, seller readiness, and route set.
- **Feed Profile**: Seller reference, target country, language, currency, activation state, delivery and return references, validation errors, and eligible catalog scope.
- **Feed Item**: One public product in one market profile, with an exact seller, price, availability, condition, identifiers, images, policies, and landing URL.
- **Slug Redirect**: An audited mapping from an old public localized path to a current public localized path with a permanent redirect status.
- **Discovery Page**: A curated collection, article, or service surface with a distinct audience need, localized metadata, navigation links, and indexing state.
- **Activation Check**: An owner-visible prerequisite and evidence record for domain, search-console, merchant, sitemap, rich-result, performance, and review readiness.

## Assumptions

- Georgian remains the default locale, while Georgian, English, German, and Russian receive equal organic technical support.
- Initial commercial discovery focuses on Georgia and Germany/EU; Russian content serves Russian-speaking users only in approved countries.
- The final domain remains a placeholder. Public indexing, Search Console, Merchant Center, and production host activation cannot complete until an owner chooses the real domain.
- The two-seller model is unresolved. Merchant profiles and ambiguous items remain disabled rather than guessing a seller or policy.
- Search Console is the required search measurement source; consent-aware conversion analytics may be used after approval, but Google Analytics is not added by default.
- Production catalog, legal policies, seller identities, shipping, returns, contact information, and imagery must be verified before public claims are emitted.
- Search engines decide rankings and rich appearances; this feature improves eligibility and discoverability but does not promise placement.

## Out of Scope

- Choosing, purchasing, or activating the final domain.
- Creating external Search Console, Merchant Center, Bing, Netlify, or Google Business Profile accounts without their prerequisites.
- Merchant API synchronization before scheduled retrieval proves insufficient.
- Review or aggregate-rating markup before a verified-purchase review system exists.
- Automated mass landing pages, keyword stuffing, purchased backlinks, cloaking, or invented product and business claims.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In a generated crawl across all four locales, 100% of indexable sample pages have one self-canonical, unique localized metadata, and only reciprocal alternatives that resolve successfully without redirects.
- **SC-002**: 100% of tested fallback, private, transactional, search, and arbitrary filtered URLs are excluded from the sitemap and carry `noindex,follow` through both response and document signals where applicable.
- **SC-003**: Every sitemap URL is indexable, canonical, free of query strings and redirect chains, reachable through ordinary navigation, and below a 45,000-URL readiness ceiling.
- **SC-004**: 100% of eligible structured-data samples pass automated Product, Offer, WebSite, organization, Article, and Breadcrumb contracts with no unsupported reviews or unsafe serialization.
- **SC-005**: 100% of ineligible products omit Product rich-result claims, while sold retained products remain available and report out-of-stock status.
- **SC-006**: Every enabled Merchant profile and item passes feed validation with zero price, availability, language, seller, shipping, return, or landing-page mismatches; every disabled or incomplete profile returns not found.
- **SC-007**: At 390px, 768px, and 1440px, collection navigation and breadcrumbs remain readable, operable by keyboard, and free of clipping or horizontal overflow in all four locales.
- **SC-008**: The 75th percentile of field or representative lab measurements remains at LCP ≤2.5 seconds, INP <200 milliseconds, and CLS <0.1.
- **SC-009**: Before activation, every unavailable external prerequisite has an owner, status, and evidence location; after activation, representative URLs and feeds are inspected and recorded with zero unresolved critical errors.
- **SC-010**: For eight weeks after activation, weekly reviews record indexing, sitemap state, queries, impressions, clicks, click-through rate, rich-result errors, Merchant disapprovals, experience metrics, and organic conversions; monthly reviews continue thereafter.
- **SC-011**: 100% of indexable collection and editorial pages map to a distinct verified inventory or buyer-information need, with no automatically indexed filter combinations or keyword variants.
