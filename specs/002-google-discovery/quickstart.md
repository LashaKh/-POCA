# Quickstart: Verify Google Discovery

## Database and contracts

```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:types:check
npm test -- tests/integration/seo tests/unit/storefront/breadcrumbs.test.tsx
npm run typecheck
npm run lint
npm run build
```

Confirm public SEO/identifier fields exclude drafts, real translation maps group by stable identity, collection reachability warnings appear, contradictory identifiers fail, fallback pages no-index, canonicals exclude query parameters, JSON-LD/XML are safely escaped, and disabled feeds return 404.

## Storefront crawl

Run `npm run dev:local`. From `/ka`, `/en`, `/de`, and `/ru`, follow the ordinary Collections link into a collection and product. Inspect visible breadcrumbs, title/description, canonical, real `hreflang`, social metadata, structured data, clean filtered canonical, missing-record 404, and sold-product out-of-stock state.

Inspect `/robots.txt` and `/sitemap.xml`; no sitemap URL may contain a query string, private route, draft, redirect, or false alternate. `/feeds/google/ge-en-gel.xml` and `/feeds/google/de-de-eur.xml` must return 404 until activation evidence exists.

## Responsive and operational gates

Review all locales at 390px, 768px, and 1440px for keyboard/focus order, breadcrumb wrapping, horizontal overflow, empty states, missing images, and long translations against `docs/design/quality-scorecard.md`.

```bash
npm run performance:check
npm run security:audit
npm run cleanup:check
```

Do not submit placeholder-domain URLs. After final-domain and seller/policy approval, follow `docs/operations/google-discovery-activation.md` for Netlify/TLS, Search Console, Rich Results Test, Merchant free listings/feeds, Bing import, and monitoring.

## Verification record — 2026-08-27

- A clean database reset applied all 58 migrations; pgTAP passed 20 files and 675 assertions. Generated database types match the migrated schema.
- Vitest passed 64 files and 249 tests. Focused SEO contracts passed after the final sitemap pagination and shared-fixture changes.
- Production build completed all 213 routes. Lint, typecheck, focused formatting, security audit, and performance budgets passed; catalog search measured 6 ms p95 against a 250 ms budget.
- The generated local sitemap returned 20,028 URLs and 100,140 `hreflang` links in 13,135,991 bytes. It included all four translations of the representative product and contained zero private or query-string URLs.
- Production-style Playwright checks passed crawler headers, the 308 Georgian root redirect, clean currency canonicals, search `noindex`, ordinary collection-to-product links, closed Merchant feed responses, and truthful omission of Product markup for the missing-image synthetic fixture.
- Responsive/accessibility review passed Georgian at 390 px, English at 768 px, German at 1440 px, and Russian at 1440 px in Firefox. Breadcrumbs were visible, horizontal overflow was zero, and axe reported no violations. The review also found and fixed transient low-contrast header text during its entrance motion.
- The repository-wide format command remains red because of pre-existing formatting in Meta-operation files and generated project guidance. The cleanup command likewise flags the preserved pre-existing `public/social/meta-test-post-2026-08-27.png`; neither belongs to this feature, and both were intentionally left untouched.
- T043 remains blocked: the placeholder domain cannot be submitted to Rich Results Test, Search Console, Merchant Center, or Bing. Merchant profiles correctly return 404 until the final domain, seller, origin, shipping, return, and market evidence is approved.
