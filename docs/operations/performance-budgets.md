# Performance, capacity, and cost budgets

These are release gates, not aspirations. Local and staging evidence must pass before promotion; production telemetry is compared with the same thresholds and alerts before exhaustion.

| Surface                         |                                      Budget | Gate                                           |
| ------------------------------- | ------------------------------------------: | ---------------------------------------------- |
| Shared browser JavaScript       |                                170 KiB gzip | `npm run performance:check`                    |
| Public browse/search first byte |                              p95 ≤ 1,000 ms | Node and k6 browse scenarios                   |
| Checkout review/reservation     |                              p95 ≤ 1,000 ms | 50-way local contention plus k6 route pressure |
| Admin list response             |                              p95 ≤ 1,000 ms | Authenticated k6 scenario                      |
| Invalid webhook rejection       |                                p95 ≤ 500 ms | k6 burst scenario                              |
| Catalog database search         | p95 ≤ 250 ms locally against 5,000 fixtures | `npm run performance:check`                    |
| Oldest due critical queue item  |                               ≤ 900 seconds | health/alert and performance gate              |
| Largest catalog image           |                                   ≤ 220 KiB | rendition recipe and media review              |
| Largest product-detail image    |                                   ≤ 300 KiB | rendition recipe and media review              |
| LCP                             |                                 p75 ≤ 2.5 s | staging Web Vitals/Lighthouse evidence         |
| INP                             |                                p75 ≤ 200 ms | staging Web Vitals evidence                    |
| CLS                             |                                  p75 < 0.10 | staging Web Vitals/Lighthouse evidence         |

Default monthly guardrails are 300 Netlify credits, 20 GiB Supabase egress, and 50,000 monitoring events. `npm run performance:cost` compares provider-exported usage with configurable environment budgets; fixture/local execution uses zero synthetic usage. Owner alerts should trigger at 70%, 85%, and 100% of each production budget.

The k6 files under `tests/load/k6/` cover public browse/search, checkout pressure, admin lists, ingestion bursts, invalid webhook bursts, and scheduled catch-up. Scheduled-function pressure is run only through Netlify Dev or the Netlify UI because production scheduled functions do not accept public URL invocation.
