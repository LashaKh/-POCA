# Environment, migrations, and deployment

## Purpose

Keep local, preview, staging, and production separate. Think of them as four workshops: tools may look alike, but inventory and keys never cross doors.

## Initial setup

1. Install the Node version in `.nvmrc`, run `npm ci`, and install Docker plus the pinned Supabase CLI dependency.
2. Do not create a local secret file for the normal path. `dev:local`, `build:local`, and `start:local` read only the running `supabase status -o env` values into the child process. Copy `.env.example` only when testing an explicit external-environment contract.
3. Run `npm run db:start`, `npm run db:reset`, `npm run db:seed:verify`, `npm run db:test`, and `npm run db:types:check`.
4. Run `npm run env:check`. It reports field names and modes only, never values.
5. Rotate every credential disclosed during development before linking a managed project.

## Optimized local preview

Use the same explicit origin for build and start because `robots.txt` is static
production output:

```bash
SITE_URL=http://127.0.0.1:3015 npm run build:local
PORT=3015 SITE_URL=http://127.0.0.1:3015 npm run start:local
SMOKE_BASE_URL=http://127.0.0.1:3015 npm run release:smoke
```

`npm run test:e2e` performs this optimized build/start automatically. The
Netlify configuration is validated by the build and release scripts; a real
deploy preview additionally requires the approved Netlify account/site inputs
in the external activation register. A local preview is not a staging or live
deployment.

## Database change procedure

1. Add an append-only, uniquely ordered migration under `supabase/migrations/`.
2. Prefer additive schema and compatible code across one rollback window. Split destructive changes into expand, migrate, verify, then contract releases.
3. Run a clean local reset, pgTAP, generated-type check, and `npm run db:drift:check`.
4. Apply to an isolated preview project, then staging. Never seed staging or production with customer-like fixtures.
5. Take or verify the applicable backup/PITR point before an irreversible migration.
6. Record schema version, release ID, migration result, and repair/rollback strategy in release evidence.

## Controlled deployment

1. Run CI and the release-gates workflow. A failed source, test, database, contract, build, accessibility, security, migration-drift, smoke, or performance gate stops promotion.
2. Test the immutable Netlify deploy permalink with `SMOKE_BASE_URL=https://... npm run release:smoke`.
3. Run `npm run readiness:report`. Preview requires build-complete, staging requires payment-ready, and production requires launch-ready with zero blockers.
4. Validate a candidate with `RELEASE_TARGET=staging NETLIFY_DEPLOY_ID=... npm run release:promote`.
5. Production requires the explicit `CONFIRM_PRODUCTION_PROMOTION=publish` value and an approved change record. Prefer Git-enforced production deploys when enabled in Netlify.
6. Repeat health, discovery, checkout, admin, notification, and reconciliation smoke checks after publishing. Watch alerts, queue age, error rate, payment uncertainty, and inventory invariants.

## Roll-forward preference

For an additive schema with a faulty application, publish a corrected application. Use deploy rollback only when the previous application remains compatible with the current schema. Database rollback or restore is a separate high-impact decision and never happens automatically with a Netlify rollback.
