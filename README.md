# ÉPOCA Online Carpet Shop

ÉPOCA is a production-oriented, multilingual carpet shop built in the
Collector’s Index visual direction. It includes the public catalogue and guest
checkout plus product ingestion, catalogue/content administration, worldwide
selling rules, orders, payments, fulfillment, returns, customer accounts,
privacy, audit, reporting, observability and recovery controls.

The application is build-complete locally. Live commerce remains gated by the
external approvals and business facts in
`docs/operations/external-activation-register.md`; the interface never presents
an unconfigured provider or delivery promise as live.

## Prerequisites

- Node.js 24 LTS and npm 11 (`.nvmrc` and `.node-version` are authoritative).
- Docker Desktop with at least 8 GB available for Supabase and browser tests.
- Git. No cloud credential is required for local development.

## Fresh-clone setup

```bash
git clone https://github.com/LashaKh/-POCA.git epoca
cd epoca
npm ci
npm run db:start
npm run db:reset
npm run staff:local -- --role owner --email owner@epoca.local
npm run dev:local
```

Open `http://127.0.0.1:3000/ka`. The staff helper prints a random local password
once. Owner sign-in at `http://127.0.0.1:3000/en/admin` skips MFA
(multi-factor authentication) only for the reserved `@epoca.local` account on
the local Supabase stack; hosted and production Owner access still requires
MFA. Create a separate Manager if needed:

```bash
npm run staff:local -- --role manager --email manager@epoca.local
```

`dev:local` reads the running local Supabase values into its child process. It
does not create a credential file. The local stack uses clearly marked
synthetic products, fixture payment/email behavior and disabled external
telemetry. Never treat the seed catalogue as an offer for sale.

Do not copy the supplied chat credentials into this repository. Any credential
ever pasted into chat must be rotated before production activation.

## Daily development

```bash
npm run db:reset
npm run dev:local
```

Useful commands:

| Command                             | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `npm run format:check`              | Verify deterministic formatting                                   |
| `npm run lint`                      | Run ESLint with zero warnings                                     |
| `npm run typecheck`                 | Run strict TypeScript checks                                      |
| `npm test`                          | Run unit, component, contract, integration and resilience tests   |
| `npm run db:test`                   | Run all pgTAP database/RLS tests                                  |
| `npm run db:types:check`            | Confirm committed Supabase types match the local schema           |
| `npm run db:migrations:check`       | Check migration ordering/safety rules                             |
| `npm run db:seed:verify`            | Confirm the local catalogue is synthetic and held from launch     |
| `npm run test:e2e`                  | Build/start the optimized local application and run Playwright    |
| `npm run build:local`               | Produce an optimized build using the local backend                |
| `npm run security:audit`            | Audit dependencies, secrets, headers, RLS and authorization       |
| `npm run cleanup:check`             | Reject secrets, debug output, stale artifacts and unsafe fixtures |
| `npm run release:rollback:rehearse` | Rehearse the recoverable release-control path                     |

The short baseline is:

```bash
npm run verify:baseline
npm run db:test
npm run db:types:check
npm run db:migrations:check
npm run cleanup:check
npm run security:audit
```

The complete release gate additionally runs all Playwright, load, performance,
license, SBOM/checksum, restore and production-output checks documented in
`docs/quality/final-verification.md`.

## Local data and recovery

`npm run db:reset` rebuilds only the Docker-hosted local database from the 54
ordered migrations and safe seed. It does not use a linked cloud project. The
same command restores the four-locale seed catalogue after a test or experiment.

For a schema change:

```bash
npx supabase migration new <short_name>
# edit the new migration
npm run db:reset
npm run db:test
npm run db:types
npm run db:types:check
npm run db:migrations:check
```

Never make a schema change only in a remote dashboard. Remote migration, reset,
restore or production seed operations require the environment deployment and
backup/restore runbooks.

## Provider modes

Local startup uses:

- fixture hosted-payment and captured-email adapters;
- manual product completion with optional assistance disabled;
- analytics and external monitoring disabled;
- local Supabase Auth, Postgres and private/public Storage.

Production configuration rejects fixture or sandbox provider modes. Missing
live inputs remain explicitly disabled/degraded, with activation and revalidation
steps in the external activation register. Raw card data never enters ÉPOCA.

## Operations

- Manager handbook: `docs/operations/manager-manual.md`
- Owner/security/launch handbook: `docs/operations/owner-manual.md`
- Environment and deployment: `docs/operations/runbooks/environment-deployment.md`
- Incident and rollback: `docs/operations/runbooks/incident-rollback.md`
- Backup and restore: `docs/operations/backup-restore.md`
- Owner recovery: `docs/operations/runbooks/owner-recovery.md`
- Payment activation: `docs/operations/runbooks/payment-domain-activation.md`
- External activation register: `docs/operations/external-activation-register.md`

The four readiness labels are deliberately separate:

1. **Build-complete** — local implementation and verification pass.
2. **Payment-ready** — approved production payment/bank configuration passes.
3. **Staging-operational** — managed Supabase/Netlify deployment and smoke pass.
4. **Launch-ready** — every legal, tax, delivery, contact, media, privacy,
   credential and operational approval passes.

A build or preview must never be described as live merely because it renders.

## Architecture and specification

- `PRODUCT.md` — product decisions and unresolved external facts.
- `DESIGN.md` — Collector’s Index visual authority.
- `docs/product/EPOCA_MASTER_BUILD_GOAL.md` — approved master build goal.
- `specs/001-build-production-shop/` — specification, plan, tasks and contracts.
- `docs/quality/requirements-traceability.md` — requirements → code → tests → evidence.
- `supabase/migrations/` and `supabase/tests/database/` — append-only schema and pgTAP.
- `app/`, `components/`, `features/`, `lib/` — Next.js application boundaries.
- `.github/workflows/` — CI/security/release automation.
- `netlify.toml` and `netlify/` — initial hosting/functions/schedule contract.

## Spec-driven workflow

Claude and Codex share the repository-owned Spec Kit pipeline. Claude commands
live in `.claude/commands/`; Codex uses
`.agents/skills/spec-driven-development/SKILL.md`. For a new meaningful feature,
start from the existing specification and run clarify → plan → tasks → analyze →
implement rather than opening a disconnected design document.

`CLAUDE.md` is the shared instruction source and `AGENTS.md` is its Codex link.
The workflow migration record is in `docs/spec-workflow-migration.md`.
