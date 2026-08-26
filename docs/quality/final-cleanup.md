# Final repository cleanup

**Date:** 2026-08-26  
**Command:** `npm run cleanup:check`

The cleanup gate treats the repository like a shop floor before opening: local
test labels and tools may exist, but none may be mistaken for a real product,
provider, contact, credential, or launch promise.

## Corrections completed

- Removed the synthetic seed collection from production fallback navigation;
  the fallback collection link now opens the complete published search index.
- Replaced local-fixture wording in normal homepage descriptions with neutral,
  truthful four-language buying information.
- Restricted the synthetic-catalog warning to `DEPLOY_ENV=local` so local seed
  data is unmistakable without leaking test claims into a real catalogue.
- Kept fixture adapters for deterministic local/CI verification while the
  environment validator rejects fixture or sandbox modes in production.
- Kept all real integration values as environment placeholders; no supplied
  credential, secret key, database password, service JWT, or account password
  is stored in the repository.
- Ignored reproducible build, security, screenshot, trace, video, readiness and
  release artifacts. CI/release storage preserves them for a candidate; they do
  not become stale source files.
- Reviewed the small `public/` allowlist: Netlify headers/redirects, offline and
  maintenance states, the catalog import template, and its provenance README.

## Automated rejection rules

`scripts/final-cleanup.mjs` fails on:

- Supabase secret/service JWT, private key, or credential-bearing database URL;
- tracked generated build/test/preview evidence;
- runtime TODO/FIXME/HACK markers, debugger statements, or console log/debug;
- runtime `.test`/`.example.invalid` fixture facts;
- an ungated synthetic-catalog disclosure or synthetic fallback navigation;
- loss of the production fixture/sandbox provider rejection; or
- any public asset outside the reviewed allowlist.

The broader final gate additionally runs formatting, lint, TypeScript, all
tests, migrations, database type/drift checks, build, dependency audit, license
policy, SBOM/checksum generation, SEO, accessibility and resilience checks.

## Intentional placeholders retained

The values named in `.env.example` and
`docs/operations/external-activation-register.md` are configuration contracts,
not sample secrets or claims. Disabled/test/degraded states remain intentional
until the listed Owner revalidation passes. Production media, legal copy,
contact channels, bank details, delivery promises and online payment must never
be inferred from local fixtures.
