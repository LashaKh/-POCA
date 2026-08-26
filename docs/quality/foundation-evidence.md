# Foundation Verification Evidence

**Verified:** 2026-08-25  
**Branch:** `001-build-production-shop`  
**Runtime:** Node.js 24.19.0, Next.js 16.3.2, React 19.2.8, TypeScript 6.0.3

## Why this gate exists

The shop cannot safely add products, carts, payments, or uploads until its shared trust boundary works. This gate proves the base in the same way a building inspection proves the foundation before adding upper floors: database privileges, configuration, sessions, localization, security headers, and basic accessible rendering must all hold first.

## Executed evidence

| Area                          | Command or evidence                              | Result                                                                                                     |
| ----------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Local database reconstruction | `npm run db:reset`                               | PASS — six migrations applied from an empty local database                                                 |
| Database/RLS behavior         | `npm run db:test`                                | PASS — 40 pgTAP assertions across foundation and rate-limit suites                                         |
| Generated database contract   | `npm run db:types:check`                         | PASS — committed types match the rebuilt local schema                                                      |
| Formatting                    | `npm run format:check`                           | PASS at the final foundation baseline                                                                      |
| Static analysis               | `npm run lint`                                   | PASS with zero warnings                                                                                    |
| Type safety                   | `npm run typecheck`                              | PASS under strict TypeScript                                                                               |
| Unit/component behavior       | `npm run test`                                   | PASS — 31 tests across environment, auth, money, headers, redaction, locale preferences, and UI primitives |
| Responsive browser smoke      | `npm run test:e2e`                               | PASS — 10 journeys at 390, 768, and 1440 widths across Chromium, Firefox, and WebKit                       |
| Accessibility smoke           | Axe checks inside `tests/e2e/foundation.spec.ts` | PASS — no automated violations on ka/en/de/ru foundation routes                                            |
| Production compilation        | `npm run build`                                  | PASS — localized storefront, admin, auth, error, instrumentation, and proxy compiled                       |
| Dependency audit              | `npm audit --audit-level=moderate`               | PASS — zero known vulnerabilities at verification time                                                     |

## Boundary cases proved

- Georgian, English, German, and Russian routes render the correct document language and localized truthful state.
- The 390 px, 768 px, and 1440 px layouts have no horizontal overflow.
- Anonymous access to localized administration routes redirects to the matching localized sign-in route and does not render administrative copy.
- Browser responses include MIME-sniffing and frame-denial headers; the complete header contract is covered by unit tests.
- Rate-limit counters are server-only, force RLS, reject raw/invalid subjects, and return a bounded retry time after the limit.
- Environment parsing rejects insecure URLs, missing live-provider credentials, and fixture providers in production without including secret values in errors.
- Local development obtains only local Supabase values at process start; no credential file is generated.

## Known activation boundary

This evidence approves the foundation for feature development. It does not approve a public deployment, live payment, production email, domain cutover, or cloud database mutation. Those remain blocked by their later production-readiness tasks and the Next.js security advisory gate recorded in `README.md`.
