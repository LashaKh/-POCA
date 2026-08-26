# Quickstart: ÉPOCA Production Online Shop

The root `README.md` is the authoritative fresh-clone guide. This feature copy
records the same verified route without introducing a second environment
contract.

## Prerequisites

- Node.js 24 LTS and npm 11.
- Docker Desktop with enough memory for local Supabase and browsers.
- Git. Local work does not need cloud credentials.

## First run

```bash
git clone https://github.com/LashaKh/-POCA.git epoca
cd epoca
npm ci
npm run db:start
npm run db:reset
npm run staff:local -- --role owner --email owner@epoca.local
npm run dev:local
```

Open `http://127.0.0.1:3000/ka`. The helper prints a random local-only password;
Owner sign-in continues to authenticator enrolment. Local startup obtains its
Supabase values from `supabase status -o env` without writing a secret file.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run db:test
npm run db:types:check
npm run db:migrations:check
npm run cleanup:check
npm run security:audit
npm run test:e2e
```

`npm run test:e2e` uses an optimized local build and covers Chromium mobile,
tablet and desktop plus Firefox and WebKit. Load, performance, restore, license,
SBOM and production-output commands are recorded in
`docs/quality/final-verification.md`.

## Safety contract

- `npm run db:reset` is local Docker only and never targets a linked project.
- Seed products and identities are synthetic, marked and unsuitable for launch.
- `.env.example` contains names/placeholders only. Real secrets belong in the
  approved platform secret store and must never be committed.
- Production rejects fixture/sandbox provider modes.
- Assistance may draft suggestions but cannot auto-publish or override facts.
- Private originals, return/contact evidence and exports are never public.
- Schema changes are append-only migrations followed by reset, pgTAP, type and
  migration-order checks.

## Activation

Build-complete does not mean payment-ready, staging-operational or launch-ready.
Before any remote deployment follow, in order:

1. `docs/operations/external-activation-register.md`
2. `docs/operations/runbooks/environment-deployment.md`
3. `docs/operations/runbooks/payment-domain-activation.md`
4. `docs/operations/backup-restore.md`
5. `docs/operations/owner-manual.md`

If a required approval or verified business fact is missing, keep that
capability disabled and record the blocker; never fabricate it from local data.
