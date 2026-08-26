# Final SEO and discovery evidence

**Date:** 2026-08-26  
**Generated-output origin:** `http://127.0.0.1:3015`  
**Result:** PASS

## Production-output verification

```bash
SITE_URL=http://127.0.0.1:3015 npm run build:local
PORT=3015 SITE_URL=http://127.0.0.1:3015 npm run start:local
EPOCA_EXTERNAL_SMOKE=1 npm run test:e2e -- \
  tests/seo/final-output.spec.ts --project=desktop-1440-de --workers=1
```

Result: **1 Playwright test passed**. The test makes real HTTP/browser requests
to the optimized build; it does not inspect source files as a substitute for
generated markup.

Verified outcomes:

- `/robots.txt` returns 200, points to the same canonical sitemap origin, and
  excludes admin, auth, account, cart, checkout and API routes.
- `/sitemap.xml` returns 200 and contains all four localized home and seeded
  published-product URLs.
- Georgian, English, German and Russian product output each carries its exact
  canonical URL, all four `hreflang` relationships and a Georgian `x-default`.
- Open Graph and Twitter titles equal the localized on-page product title.
- Product JSON-LD contains the factual SKU/name/URL, `GEL` offer currency and
  authoritative `InStock` availability; it omits facts the record does not have.
- Search and preview output is `noindex`; authenticated administration output
  is also `noindex, nofollow, nocache`.
- A newly published managed redirect returns 308 and preserves the locale while
  reaching the replacement route.

## Lowest-level metadata contracts

```bash
npm test -- --run tests/integration/seo/catalog-metadata.test.ts
```

Result: **3 tests passed** for canonical/four-language/`x-default` relationships,
localized social output, exact minor-unit offer serialization, absent-claim
omission and safe structured-data escaping.

## Defects found and closed

1. Middleware was intercepting `robots.txt` and `sitemap.xml`; both metadata
   endpoints are now excluded from locale/auth proxy matching.
2. The optimized test build originally baked port 3000 into static robots while
   serving on 3015. The Playwright web-server contract now supplies one explicit
   `SITE_URL` to both build and start, matching real Netlify activation.
3. Homepage metadata now uses localized catalogue copy and Twitter metadata is
   emitted alongside Open Graph.
4. Admin metadata now explicitly prevents indexing; crawler disallow is defense
   in depth rather than the only control.
5. Fallback navigation no longer links to the synthetic seed collection, and
   normal homepage descriptions no longer mention test fixtures.

## Activation boundary

The local sitemap/product records are intentionally synthetic evidence, not
production content. Before launch, the Owner must set the approved HTTPS
`SITE_URL`, verify the production domain in crawler tools, publish only approved
products/media/content, and rerun this suite against staging and production.
Those external items remain in `docs/operations/external-activation-register.md`.
