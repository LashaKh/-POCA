# Fresh-clone onboarding evidence

**Date:** 2026-08-26  
**Verified commit:** `1f560510e37a58159669d1f12b6f89e9c97ab474`  
**Result:** PASS for repository-controlled onboarding

## Method

The committed branch was cloned with Git into a new temporary directory. No
untracked source, existing `node_modules`, `.next` output, environment file or
credential was copied. The commands and operating expectations came from
`README.md` and the linked operations runbooks.

```bash
git clone --branch 001-build-production-shop <local-repository> <new-directory>
cd <new-directory>
npm ci
npm run db:start
npm run db:reset
npm run db:types:check
npm run db:seed:verify
npm run format:check
npm run lint
npm run typecheck
npm test
SITE_URL=http://127.0.0.1:3016 npm run build:local
npm run staff:local -- --role owner --email fresh-clone-owner@epoca.local
PORT=3016 SITE_URL=http://127.0.0.1:3016 npm run start:local
```

## Results

| Check                       | Result                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency install          | PASS; 592 packages, zero npm vulnerabilities                                                                                             |
| Local Supabase start        | PASS; no cloud credential or environment file required                                                                                   |
| Database reset              | PASS; all 54 migrations and three seed groups applied                                                                                    |
| Generated database types    | PASS; committed types match                                                                                                              |
| Seed safety/catalogue       | PASS; 5,000 explicitly synthetic products with four-locale catalogue content and a launch hold                                           |
| Formatting/lint/types       | PASS; Prettier, zero-warning ESLint and strict TypeScript                                                                                |
| Tests                       | PASS; 60 files, 236 tests                                                                                                                |
| Optimized application build | PASS; 206 generated page variants plus dynamic routes                                                                                    |
| Local Owner bootstrap       | PASS; random one-time local password and MFA enrolment path generated                                                                    |
| Runtime                     | PASS; Georgian home returned HTTP 200 and contained ÉPOCA; secret-free readiness returned HTTP 200 with an honest local `degraded` state |
| Clone cleanliness           | PASS; `git status --short` was empty after validation                                                                                    |

## Fixture and recovery behavior

Local startup obtained its Supabase values directly from the CLI and used
fixture payment/email plus disabled optional external providers. The seed
catalogue is visibly synthetic and never a production offer. `npm run db:reset`
restored the documented state without relying on a dashboard or unpublished
manual step.

The backup/restore, incident/rollback, Owner recovery and environment deployment
runbooks are reachable from the README and contain the exact evidence and
confirmation boundaries needed for managed operations.

## Netlify boundary

The same optimized build consumed by Netlify passed from the clean clone, and
the repository includes `netlify.toml`, functions, scheduled coordinator,
headers, redirects, environment validation, smoke and promotion/rollback
scripts. An actual public Netlify preview cannot be created from a clone without
the external team/site ID and authentication token. That provider-owned proof is
correctly deferred to T349 and the external activation register; it is not
silently replaced with a local deployment claim.

The temporary clone was used only for validation and contained no production
secret or customer data.
