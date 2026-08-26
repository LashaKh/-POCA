# Storefront Discovery Performance Evidence

**Verified:** 2026-08-25  
**Dataset:** 5,000 synthetic products, 20,000 translations, 15,000 active prices  
**Runtime:** optimized Next.js 16.3.2 server, Node.js 24.19.0, local Supabase/PostgreSQL

## Why this gate exists

Search correctness is not useful if a normal catalog stalls under routine concurrency. This gate checks the database work and the complete server-rendered routes separately, much like checking both an engine and the vehicle around it.

## Database plans

The following were executed with `EXPLAIN (ANALYZE, BUFFERS)` against the rebuilt scale seed:

| Scenario                                                     | Rows returned | Execution time | Result |
| ------------------------------------------------------------ | ------------: | -------------: | ------ |
| Exact indexed SKU `SYN-00001`                                |             1 |        58.5 ms | PASS   |
| Collection + silk + ivory + in-stock + price-desc            |     24 of 384 |       144.4 ms | PASS   |
| Material/color facet counts for the 5,000-product collection |             6 |       125.6 ms | PASS   |

Exact SKU input preserves its canonical hyphen and uses a public partial index. Filtering, availability, counting, stable sorting, and pagination occur inside PostgreSQL before records reach the application.

## Public route budget

Command: `npm run test:load:catalog`

The repeatable Node load contract made 40 requests with concurrency 8 across Georgian filtered collection, English exact search, German product, and Russian deep-pagination routes.

| Measure                   | Observed |     Budget | Result |
| ------------------------- | -------: | ---------: | ------ |
| First-byte p50            |    43 ms |          — | PASS   |
| First-byte p95            |   253 ms |   1,000 ms | PASS   |
| Complete-response p95     |   962 ms |   2,000 ms | PASS   |
| Maximum complete response | 1,123 ms | Diagnostic | PASS   |

The first-byte budget represents the specification’s “usable result or progress response” threshold. The stricter full-response measurement is retained as a separate completion budget. The script fails either threshold and validates successful ÉPOCA HTML rather than timing empty responses.

## Reproducibility and boundary

- The database is reconstructed with `npm run db:reset`; plans are measured after the normal local warm-up request.
- `tests/load/catalog-search.js` accepts `BASE_URL`, `ITERATIONS`, `CONCURRENCY`, `MAX_P95_MS`, and `MAX_COMPLETE_P95_MS` for staging reruns.
- These figures approve local phase development. Staging and production readiness must rerun the same contract with deployed network, cache, image, and observability conditions before launch.
