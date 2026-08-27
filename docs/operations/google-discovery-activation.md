# Google discovery activation

Last reviewed: 2026-08-27  
Owner: ÉPOCA Owner  
Current state: **Organic implementation verified locally; external activation blocked**

No credential, DNS token, Search Console token, Merchant secret, or private seller fact belongs in this file. Record provider-generated evidence references only.

## Current blockers

- Final public domain and apex-versus-`www` policy are not selected.
- Netlify site ownership and TLS deployment do not exist.
- Production catalog, imagery, translations, contact details, seller identities, fulfillment origin, market prices, delivery, returns, tax, and legal copy are unapproved.
- The Georgian/German two-seller model does not assign each feed item to exactly one legal seller and policy set.
- Search Console Domain property, Merchant Center site claim/free listings, and Bing property do not exist.

Organic code may ship behind the existing production readiness gate. Merchant feeds remain intentionally disabled and return 404 until every relevant blocker is resolved.

## Before domain activation

- [x] Run database migration/tests and verify public projections contain no drafts or private facts.
- [ ] Crawl all locale homes, collection index/pages, products, journal, and approved services from ordinary navigation.
- [ ] Confirm every sitemap URL is 200, indexable, canonical, query-free, reachable, and not redirected.
- [x] Validate eligible Product/Offer, WebSite/OnlineStore, Article, and Breadcrumb JSON-LD contracts; confirm ineligible products omit Product claims.
- [ ] Confirm product image rights, filenames, localized alt text, responsive sizes, and reserved dimensions.
- [x] Review breadcrumbs and collection navigation at 390px, 768px, and 1440px across the four locales.
- [ ] Pass performance budgets: p75/representative LCP ≤2.5s, INP <200ms, CLS <0.1.
- [ ] Reconcile each proposed feed profile and item to one seller, origin, country, language, currency, price, shipping policy, and return policy.

## Domain and Netlify

1. Record the owner-approved final domain, DNS operator, and change window in EXT-06.
2. Connect the approved Netlify site, enable TLS, configure `SITE_URL`, and deploy the immutable release.
3. Verify HTTP to HTTPS, alternate host to canonical host, `/` to `/ka`, and old-slug redirects with no chains.
4. Confirm metadata, sitemap, robots, feed endpoints, security headers, private `X-Robots-Tag`, and public image URLs from the real origin.
5. Store the deploy ID, DNS evidence reference, UTC time, operator, and rollback point; set `DOMAIN_ACTIVATION_REFERENCE` only after proof.

## Search Console and Bing

1. Create a Google Search Console **Domain property** and verify it through DNS.
2. Submit the canonical `/sitemap.xml`; do not submit parameter, private, or feed landing URLs separately.
3. Inspect representative homepage, collection index, collection, product, journal article, approved service, sold product, and locale URLs.
4. Record coverage/canonical/hreflang/rich-result observations and fix only affected output; use sitemap submission for normal bulk discovery.
5. Import the verified property into Bing Webmaster Tools and submit the same sitemap.

## Merchant Center free listings

1. Verify/claim the final domain in the owner-approved Merchant Center account.
2. Configure legal business identity, support contacts, shipping, returns, tax/market facts, and free listings.
3. Activate `ge-en-gel` only with an English Georgia landing experience and exact GEL page/feed price. Georgian organic pages remain indexable.
4. Activate `de-de-eur` only with German/DE/EUR seller and policy truth. Keep `de-en-eur` and `de-ru-eur` disabled until those market experiences are approved.
5. Schedule daily retrieval, enable automatic price/availability updates, and validate XML plus every sampled landing page with zero seller, price, availability, language, image, shipping, or return mismatch.
6. Record feed URL/profile, retrieval time, item/error counts, account evidence ID, and rollback (disable profile). Do not add Merchant API synchronization until update latency or scale demonstrates a need.

## Eight-week review, then monthly

| Signal                                              | Source                                           | Action threshold                                                                        |
| --------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Indexed/excluded pages and sitemap status           | Search Console                                   | Investigate unexpected canonical, duplicate, blocked, soft-404, or sitemap errors       |
| Queries, impressions, clicks, CTR                   | Search Console                                   | Improve misleading titles/descriptions or weak intent-page fit; never stuff keywords    |
| Product/article/breadcrumb errors                   | Search Console/Rich Results                      | Fix source fact or serializer and revalidate affected templates                         |
| Feed disapprovals and item counts                   | Merchant Center                                  | Disable affected items/profile on business-fact mismatch; correct source, then resubmit |
| LCP, INP, CLS                                       | Search Console plus approved monitoring          | Treat p75 target breach as a release-quality issue                                      |
| Organic product views, cart/checkout starts, orders | Consent-aware approved analytics/order reporting | Compare by landing page/locale without collecting unapproved personal data              |

Review weekly for eight weeks after activation, then monthly. Record date, owner, evidence link, finding, action, affected URLs/profiles, and resolution. Google decides rankings and rich appearances; the log tracks eligibility and customer outcomes, not ranking promises.

## Authority guardrails

Pursue attributable stories and legitimate relationships with interior designers, hospitality partners, relevant editors, Pinterest, and consistent marketplace profiles. Verify rights and claims. Never buy links, exchange hidden links, fabricate reviews, or create a Google Business Profile without a verified customer-facing physical location.
