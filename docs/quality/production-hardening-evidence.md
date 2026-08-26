# Production hardening evidence

Date: 2026-08-26  
Scope: tasks T326–T335  
Environment: macOS, Node 24, local Supabase CLI 2.115.0, Next.js production build

## Outcome

The cross-cutting production-hardening slice passed. This evidence does not
claim that external production services are active. Provider credentials,
merchant approvals, DNS, final legal content, and deployment activation remain
tracked separately in the external activation register.

## Implemented controls

| Task                      | Evidence                                                                                                                                                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T326 localization         | All four catalogs contain the same 953 leaf keys; localized route, metadata, validation, admin, and email coverage is checked by `tests/unit/localization/catalogs.test.ts` and inventoried in `docs/quality/localization-inventory.md`.                                                  |
| T327 fonts and formatting | Inter/Noto Sans Georgian and Noto Serif/Noto Serif Georgian are loaded at the document boundary. The five-project browser matrix passed `tests/visual/fonts.spec.ts` at phone, tablet, desktop, Firefox, and WebKit sizes.                                                                |
| T328 design states        | Shared tokens and primitives cover focus, hover, disabled, invalid, busy, success/error/loading, reduced motion, responsive administration, and print-safe order output. Unit state tests pass.                                                                                           |
| T329 media delivery       | Every image consumer has reserved geometry, an explicit loading/priority policy, fallback behavior, and protected-original boundaries. See `docs/quality/media-delivery-audit.md` and `tests/unit/media/media-delivery.test.ts`.                                                          |
| T330 headers              | CSP, production-only HSTS, MIME, frame, referrer, permissions, cache, and route-specific private/no-store controls are aligned across the proxy, Netlify configuration, and static headers. Header tests and the static security audit pass.                                              |
| T331 abuse controls       | Central policies protect authentication, contact, uploads, checkout, quotes, returns, payment/email events, newsletters, and generic exposed writes. Identifiers are irreversibly keyed before storage and useful retry metadata is returned.                                             |
| T332 supply chain         | CI performs secret/dependency/license/migration controls, produces a CycloneDX SBOM, checksums release subjects, inventories provider egress, and requests GitHub artifact attestations on eligible builds. Local generation produced 58 checksummed subjects.                            |
| T333 query plans          | Purpose-specific indexes cover catalog, orders, payment, inventory, ingestion, jobs, audit, content, returns, and reports. The pgTAP plan suite verifies index availability and representative planner choices.                                                                           |
| T334 reports              | Owner and Manager can read bounded Asia/Tbilisi operational reports in GEL, USD, or EUR and queue private two-hour exports. Database, unit, and five-browser E2E tests pass, including PostgreSQL offset timestamps and 390 px reflow.                                                    |
| T335 safe states          | Four-locale error, not-found, loading, offline, maintenance, JavaScript-limited, and provider-degraded states make no false completion promise and offer an honest recovery path. The system-state browser suite passed six applicable checks with four intentional route-specific skips. |

## Verification record

| Gate                                                        | Result                                                                                                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                                      | PASS; all tracked source formats matched Prettier.                                                                           |
| `npm run lint`                                              | PASS; zero warnings.                                                                                                         |
| `npm run typecheck`                                         | PASS.                                                                                                                        |
| `npm test`                                                  | PASS; 55 files, 212 assertions.                                                                                              |
| `npm run db:reset`                                          | PASS; clean application of 52 migrations and all seed groups.                                                                |
| `npm run db:test`                                           | PASS; 15 pgTAP files, 638 assertions.                                                                                        |
| `npm run db:types:check`                                    | PASS; generated types match the reset schema.                                                                                |
| `npm run db:migrations:check`                               | PASS; unique ordered migrations through `202608250121`.                                                                      |
| `npm run security:audit -- --static`                        | PASS; dependency, secret, header, database, and runtime-boundary controls.                                                   |
| `npm run security:licenses`                                 | PASS; 701 locked packages checked.                                                                                           |
| `npm run security:artifacts`                                | PASS; SBOM/provider inventory/manifest generated and 58 subjects checksummed.                                                |
| `npm run build:local`                                       | PASS; Next.js 16.3.2 generated 206 localized/static variants and the dynamic route set, including `/[locale]/admin/reports`. |
| `playwright test tests/e2e/reporting.spec.ts`               | PASS; 5/5 browser/viewport profiles.                                                                                         |
| `playwright test tests/visual/fonts.spec.ts`                | PASS; 5/5 browser/locale profiles.                                                                                           |
| `playwright test tests/accessibility/system-states.spec.ts` | PASS; 6 applicable checks, 4 intentional skips.                                                                              |

## Defects found and closed

1. Font variables were initially declared below the element that consumed them;
   moving loaded font variables to the body-facing typography rules restored the
   intended families.
2. Static offline/maintenance files were initially intercepted by locale
   routing; the proxy matcher now excludes static HTML documents.
3. PostgreSQL returned valid ISO timestamps with numeric UTC offsets while the
   report boundary accepted only trailing `Z`; both ISO forms are now accepted
   and regression-tested.
4. A long currency value and export filename exposed 390 px overflow; the
   metric and event layouts now use constrained grid tracks and safe wrapping.
