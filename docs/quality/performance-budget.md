# Initial performance budget

These budgets turn “fast” into a release check and may become stricter after real-device evidence.

| Surface            | Initial JavaScript | Initial route data | Largest image |    CLS | Interaction feedback |
| ------------------ | -----------------: | -----------------: | ------------: | -----: | -------------------: |
| Public listing     |        170 KB gzip |         75 KB gzip |        220 KB | < 0.10 |         < 200 ms p75 |
| Product detail     |        190 KB gzip |        100 KB gzip |        300 KB | < 0.10 |         < 200 ms p75 |
| Cart/checkout step |        210 KB gzip |         75 KB gzip |        120 KB | < 0.10 |         < 200 ms p75 |
| Admin list/editor  |        260 KB gzip |        150 KB gzip |        180 KB | < 0.10 |         < 200 ms p75 |

Primary content must be usable within 2.5 seconds at p75 under the ordinary mobile profile defined
by the load-test harness. Search, filter, cart review, and admin list operations must show a usable
result or progress within one second in at least 95% of normal-load attempts.
