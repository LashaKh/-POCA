# ÉPOCA Project Instructions

## Purpose

ÉPOCA is an online carpet shop. Build it as a trustworthy, visually distinctive commerce experience that helps customers understand a carpet, choose confidently, and complete a purchase without friction.

The repository is currently at the specification and architecture stage. Collector’s Index is the selected visual direction, Supabase is the required backend platform, and Netlify is the initial hosting target. The exact application framework, payment provider, email/AI/analytics services, and implementation architecture must be resolved in the implementation plan using `docs/product/EPOCA_MASTER_BUILD_GOAL.md`.

## Working Agreement

1. Explain the goal and customer impact in plain language before technical details.
2. Prefer the smallest change that fully solves the current problem.
3. Preserve existing work and inspect the repository before editing.
4. Never commit secrets, credentials, private customer data, or production tokens.
5. Use the full spec workflow for meaningful features. Tiny fixes and documentation-only changes do not need ceremonial artifacts.
6. Do not implement when the user requested only research, a specification, or a plan.
7. When a technical term is useful, define it briefly the first time.

## Spec-Driven Workflow

The shared workflow lives in `.specify/`. Its artifacts are the source of truth for non-trivial features:

1. `constitution` — durable project principles and quality gates.
2. `specify` — customer needs, user stories, requirements, edge cases, and measurable outcomes.
3. `upgradeSpec` — harden journeys, unhappy paths, trust, inclusion, and testability.
4. `clarify` — resolve decisions that would materially change scope or behavior.
5. `plan` — architecture, stack choices, data model, interfaces, and verification approach.
6. `upgradePlan` — harden architecture, storefront integration, operations, and verification.
7. `tasks` — dependency-ordered, file-specific implementation work.
8. `upgradeTasks` — harden traceability, UI/state coverage, wiring, and production readiness.
9. `analyze` — check the spec, plan, and tasks for gaps or contradictions.
10. `implement` — build in small, independently verifiable slices.

Claude commands include the Spec Kit stages, `/upgradeSpec`, `/upgradePlan`, and `/upgradeTasks` hardening passes, plus `/ui-direction`, `/ui-build`, and `/ui-audit` for storefront design work.

Codex should use the repo skill at `.agents/skills/spec-driven-development/SKILL.md`. The skill points to the same workflow and templates, so Codex and Claude create compatible artifacts.

## Storefront Design Workflow

- Read `PRODUCT.md` for known product intent and unresolved business decisions.
- Read `DESIGN.md` as the visual authority. Collector’s Index is selected.
- Use `.agents/skills/epoca-storefront-design/SKILL.md` and `docs/design/WORKFLOW.md` for any customer-facing UI.
- Treat the other three directions as archived exploration; do not mix their vocabularies into Collector’s Index.
- Use attributable imagery, truthful sample labeling, semantic static-first content, keyboard access, responsive layouts, and reduced-motion fallbacks.
- Verify UI in a browser at 390px, 768px, and 1440px using `docs/design/quality-scorecard.md`.

Feature artifacts belong in `specs/NNN-feature-name/`. Keep the responsibilities separate:

- `spec.md` says what customers and the business need, without prescribing implementation.
- `plan.md` says how the feature will be built and why those technical choices fit.
- `tasks.md` says exactly what to change, in dependency order, with real file paths.

## Engineering Quality

- Follow `.specify/memory/constitution.md` for project-wide gates.
- Make customer-facing work mobile-first, keyboard-accessible, and usable with assistive technology.
- Treat product attributes, prices, availability, order totals, and order states as business-critical data.
- Put payment details behind a trusted payment provider; the application must not store raw card data.
- Add focused tests for changed behavior and run the narrowest relevant lint, test, typecheck, and build commands.
- Verify important shopping journeys at phone and desktop widths once a runnable interface exists.
- Do not invent commands. Discover them from the selected toolchain and keep this file updated when the project structure becomes real.

## Communication

Lead with what changed and why it matters. Keep explanations concise, teach without lecturing, and use a short real-world analogy when it makes a complex decision easier to understand.

## Active Technologies
- TypeScript 6.0.x strict mode; SQL/PostgreSQL migrations; Node.js 24 LTS + Next.js 16.3.2 App Router, React 19.2, Supabase JS/SSR 2.112.4, next-intl 4.13.7, Zod 4.4.3 (002-google-discovery)
- Existing Supabase Postgres catalog/content tables and approved public media renditions; no new external store (002-google-discovery)

- TypeScript 6.0.x in strict mode; SQL/PostgreSQL migrations; Node.js 24 LTS; small shell scripts only for reproducible developer/CI operations + Next.js 16.3.2 stable (confirm the announced security advisory before external deployment), React 19.2, Supabase JS/SSR, next-intl, Zod, Uppy/TUS, Sharp, OpenAI SDK, Resend SDK, optional Sentry/PostHog adapters (001-build-production-shop)
- Supabase managed Postgres and Storage; private originals/evidence/export buckets, public approved-rendition bucket; Supabase Queues for durable background work (001-build-production-shop)

## Recent Changes

- 001-build-production-shop: Added TypeScript 6.0.x in strict mode; SQL/PostgreSQL migrations; Node.js 24 LTS; small shell scripts only for reproducible developer/CI operations + Next.js 16.3.2 stable (confirm the announced security advisory before external deployment), React 19.2, Supabase JS/SSR, next-intl, Zod, Uppy/TUS, Sharp, OpenAI SDK, Resend SDK, optional Sentry/PostHog adapters

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
