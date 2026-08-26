# Incident, degraded dependency, and rollback

## Severity and ownership

| Severity | Example                                                                                                        | Response                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Critical | Accepted-order loss risk, confirmed-payment mismatch, stock corruption, no active Owner, credential compromise | Owner immediately; stop writes or checkout when safer; preserve evidence |
| High     | Checkout or scheduler unavailable, queue beyond hard age, repeated invalid webhooks, notification outage       | Owner within 15 minutes; activate degraded path                          |
| Warning  | Single provider degraded, growing retries, budget above 70%                                                    | Assign and resolve during operating window                               |

## First response

1. Record start time, environment, release, safe symptom, and one correlation ID. Do not paste personal data, credentials, raw provider payloads, or customer free text into logs or tickets.
2. Check `/api/health/ready?details=1`, the Owner operations dashboard, audit correlation search, provider status, queue age, and the last successful scheduler run.
3. Protect commercial truth first: do not mark payment from a browser redirect, do not recreate an accepted order, and do not manually change stock without the audited command.
4. If payment is uncertain, stop automatic fulfillment and reconcile authoritatively. If email is down, keep durable outbox rows and tell staff notices are pending. If optional analytics/monitoring is down, disable it without blocking purchases.
5. If Supabase is unavailable, show honest unavailability and stop checkout writes. If Netlify is unhealthy, use the atomic-deploy rollback decision below.

## Rollback decision

1. Confirm the chosen deploy is successful and still retained.
2. Confirm the current database schema is backward-compatible. If not, roll forward or perform the separately approved database recovery plan.
3. Smoke-test the deploy permalink.
4. Set `ROLLBACK_DEPLOY_ID`, `ROLLBACK_REASON_CODE`, `DATABASE_COMPATIBILITY_CONFIRMED=true`, and `CONFIRM_PRODUCTION_ROLLBACK=rollback`; run `npm run release:rollback`.
5. Run post-rollback smoke, payment/order/inventory reconciliation, outbox recovery, scheduler catch-up, and integrity checks.
6. Record the incident timeline, impact, evidence, decision owner, restored deploy, and corrective action. Netlify deploy rollback does not restore Supabase data or Storage objects.

## Recovery closure

Close only after critical journeys work, delayed jobs catch up idempotently, alerts stop recurring, integrity passes, affected buyers receive approved communication, and the cause plus prevention work has an owner and due date.
