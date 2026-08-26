# Supabase environments

ÉPOCA uses four isolated environment classes:

| Environment | Supabase project                            | Data                             | Provider modes                       |
| ----------- | ------------------------------------------- | -------------------------------- | ------------------------------------ |
| Local       | Local CLI stack                             | Deterministic synthetic fixtures | Fixture or disabled                  |
| Preview     | Dedicated disposable/non-production project | Synthetic test data only         | Fixture or disabled                  |
| Staging     | Dedicated long-lived staging project        | Synthetic rehearsal data only    | Sandbox, fixture, or disabled        |
| Production  | Dedicated production project                | Real business data               | Approved live or explicitly disabled |

Never link local development directly to production. A project reference belongs to exactly one environment, database migrations move forward from version control, and `supabase/seed.sql` plus `supabase/seeds/` are never applied to production.

The normal local verification flow is:

```sh
npm run db:start
npm run db:reset
npm run db:migrations:check
npm run db:seed:verify
npm run db:test
npm run db:types:check
```

Managed project linking happens only after disclosed credentials have been rotated. Store access tokens and database passwords in the operator's secret manager or deployment environment, never in this repository.
