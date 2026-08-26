# US2 checkout load evidence

Date: 2026-08-25  
Environment: local Supabase/PostgreSQL 17, production Next.js build, fixture providers only

## Scenario

`npm run test:load:checkout` prepares 50 independent guest carts against 50 distinct in-stock parcel products, then starts 50 authoritative `reserve_guest_checkout` commands together. Each command recalculates product, price, discount, tax, delivery, and inventory before taking a reservation. Every reservation is released by the harness afterward.

## Result

| Measure                       | Result |          Gate |
| ----------------------------- | -----: | ------------: |
| Concurrent checkout reviews   |     50 |            50 |
| Successful exact reservations |     50 |            50 |
| Errors                        |      0 |             0 |
| p50                           |  83 ms | informational |
| p95                           | 108 ms |    ≤ 1,000 ms |
| maximum                       | 108 ms | informational |

Result: **PASS**. The measured command is the buyer-facing review/reservation operation; guest/cart setup is deliberately outside the timer because it occurs before the checkout review interaction.
