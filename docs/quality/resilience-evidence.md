# Final resilience and failure-injection evidence

**Date:** 2026-08-26  
**Result:** PASS  
**Accepted exceptions:** None

## Failure matrix

The executable scenario index is
[`tests/resilience/README.md`](../../tests/resilience/README.md). Every required
row has a safe, explicit outcome and points to the lowest-level integration or
browser test that proves it.

```bash
npm test -- \
  tests/resilience/failure-matrix.test.ts \
  tests/contract/payments/payment-provider.test.ts \
  tests/contract/payments/email-provider.test.ts \
  tests/integration/checkout/concurrency.test.ts \
  tests/integration/returns/return-workflow.test.ts \
  tests/integration/ingestion/media-pipeline.test.ts \
  tests/integration/operations/production-operations.test.ts \
  tests/integration/auth/authorization.test.ts \
  tests/integration/customer/customer-account.test.ts \
  tests/unit/operations/scheduler.test.ts \
  tests/unit/operations/external-degradation.test.ts
```

Result: **11 files and 41 tests passed** against the local Supabase stack.

```bash
EPOCA_EXTERNAL_SMOKE=1 npm run test:e2e -- \
  tests/e2e/product-ingestion-recovery.spec.ts --workers=1
```

Result: the designated English tablet recovery journey passed; the other four
browser projects were intentionally excluded by the test's deterministic
project guard. The journey interrupted a resumable upload, recovered it, and
identified a duplicate without publishing corrupt or duplicate media.

```bash
EPOCA_EXTERNAL_SMOKE=1 npm run test:e2e -- \
  tests/resilience/admin-dashboard-navigation.spec.ts --workers=1
```

Result: **36 repeated Manager dashboard navigations passed** across Georgian,
English, German and Russian at 390px, 768px and 1440px.

## Required outcomes

| Risk                       | Proven safe outcome                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Last unique item           | Concurrent checkout attempts produce one reservation and one stock conflict.                 |
| Payment uncertainty/replay | Uncertain is never paid; repeated create/refund keys preserve one provider reference/effect. |
| Refund/restock replay      | Repeated commands do not duplicate money or inventory movements.                             |
| Interrupted upload         | Missing/corrupt work is retryable and produces one clean rendition set after recovery.       |
| Queue lease contention     | Only the active lease holder can heartbeat or complete work.                                 |
| Notification failure       | Disabled/unavailable email stays unsent or retryable; no false delivery is recorded.         |
| Missed schedules           | Catch-up is bounded, oldest-first and idempotent.                                            |
| Provider outage            | Payment and email commands fail closed with typed availability results.                      |
| Export failure             | The job records a safe code, becomes failed and releases its lease.                          |
| Revoked session            | Authorization stops protected work before its command boundary.                              |

## Defect found and closed

The operations landing page previously issued eleven parallel database calls
on every render. Repeated locale/viewport changes could expose a transport
failure. It now calls the role-protected `read_order_operations_summary()` RPC,
which returns one consistent snapshot in one round trip. The database contract
adds seven pgTAP assertions for function presence, grants, exact metrics,
nonnegative age and customer denial; the browser stress matrix verifies the
real authenticated route.

The test login helper also now waits for the redirected Manager or Owner MFA
page to finish rendering before a subsequent navigation. This removes a test
race without adding retries or masking application errors.
