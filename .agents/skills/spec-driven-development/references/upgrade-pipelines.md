# ÉPOCA Artifact Upgrade Pipelines

Use these focused second passes after Spec Kit creates `spec.md`, `plan.md`, or `tasks.md`. An upgrade is a hardening pass, not permission to change the feature's intent or silently expand scope.

## Shared protocol

1. Run the appropriate `.specify/scripts/bash/check-prerequisites.sh` command and resolve absolute artifact paths.
2. Read the target artifact completely. Also read its upstream artifacts, `CLAUDE.md`, `.specify/memory/constitution.md`, and—when UI is involved—`PRODUCT.md`, `DESIGN.md`, and `.agents/skills/epoca-storefront-design/SKILL.md`.
3. Check for `<!-- UPGRADED:v1 -->`. If present, make the pass idempotent: audit what changed since the previous upgrade and add only genuinely missing material.
4. Create a recoverable sibling backup before editing. Preserve the first `*.pre-upgrade` backup; use a timestamped suffix if another backup is needed.
5. Analyze through the stage-specific lenses below. Independent agents may handle lenses in parallel only when the user or active runtime instructions authorize delegation; otherwise perform the lenses sequentially in the current thread.
6. Every finding needs evidence from the artifact, project files, or explicit user input. Classify it as CRITICAL, HIGH, or MEDIUM and provide exact proposed wording or tasks.
7. Consolidate findings, remove duplicates, and reconcile contradictions. Preserve correct existing intent, but revise incorrect or conflicting text instead of blindly appending.
8. Add `<!-- UPGRADED:v1 -->` immediately after the artifact title.
9. Validate structure, traceability, and absence of empty or duplicate sections. Run `git diff -- <artifact>` and summarize the material changes.

Do not put implementation detail in the spec, business requirements in the plan as invented facts, or vague work such as “handle errors” in tasks.

## Upgrade the specification

Run after `speckit.specify` and before `speckit.clarify`.

### Lens A — Buyer journey and commerce truth

Check every user story and functional requirement for:

- Clear entry, action, feedback, success, cancellation, retry, and exit paths.
- Discovery and evaluation needs: navigation, search, filters, dimensions, material, construction, origin, condition, care, imagery, color variation, availability, price, and delivery information when in scope.
- Cart and checkout correctness: quantity boundaries, price changes, stock changes, duplicate submission, totals, discounts, taxes, delivery charges, payment outcomes, order confirmation, and recovery.
- Policy visibility: fulfillment regions, delivery expectations, returns, exchanges, privacy, and customer support when relevant.
- Testable acceptance scenarios and measurable customer outcomes.

### Lens B — Unhappy paths, trust, and inclusion

Check for missing requirements covering:

- Empty results, missing media, unavailable items, stale inventory, concurrent purchase attempts, slow or failed networks, timeouts, partial saves, and provider failures.
- Input limits, unusual names and addresses, long localized strings, currency formatting, special characters, and realistic minimum/maximum values.
- Authentication, authorization, privacy, auditability, fraud/abuse boundaries, and payment-provider responsibilities.
- Keyboard and assistive-technology use, visible focus, touch targets, contrast, reduced motion, and non-color status cues.
- Responsive behavior and intentional loading, empty, error, unavailable, and success states.

### Lens C — Scope, evidence, and experience integration

Check that:

- Personas and roles are explicit without inventing unsupported customer segments.
- Claims, testimonials, scarcity messages, provenance, and sustainability statements have evidence or are excluded.
- The customer can navigate to and from the feature, and cross-feature effects are named.
- Public surfaces cover discoverability/SEO requirements when relevant.
- UI requirements reference the selected direction in `DESIGN.md` without leaking CSS or framework choices into the spec.
- Every acceptance criterion can become an observable test.

### Merge rules

- Put customer behavior into user stories and acceptance scenarios.
- Put business rules into Functional Requirements.
- Put measurable, technology-neutral outcomes into Success Criteria.
- Put failure and boundary behavior into Edge Cases.
- Create a Non-Functional Requirements section only for experience outcomes such as accessibility, performance as perceived by users, privacy, and resilience.
- Do not add a requirement merely because a technology can support it.

## Upgrade the implementation plan

Run after `speckit.plan` and before `speckit.tasks`.

### Lens A — Architecture, reuse, and business integrity

Inspect the actual repository and check for:

- The closest existing patterns and exact reusable file paths once application code exists.
- Clear boundaries among catalog content, media, pricing, inventory, cart, checkout/payment, customer identity, order state, and presentation.
- Data ownership, validation boundaries, server-side authorization, idempotency, concurrency handling, provider failure behavior, and secrets management.
- Explicit integration contracts, provider choices, webhooks, retry/reconciliation behavior, migrations, and rollback considerations.
- Justification for new dependencies and abstractions; prefer existing primitives when they fit.

### Lens B — Storefront design and frontend completeness

For each customer-facing surface, ensure the plan names:

- Routes, navigation entry points, page hierarchy, and the connection to surrounding journeys.
- `DESIGN.md` and `.agents/skills/epoca-storefront-design/SKILL.md` as the visual implementation authority.
- Reusable tokens and components rather than page-local visual drift.
- Image aspect ratios, responsive sources, crops, alt text, lazy loading, failure fallbacks, and provenance.
- Mobile-first layouts and representative widths; keyboard, focus, semantics, touch, contrast, and reduced-motion behavior.
- Loading, empty, error, unavailable, success, overflow, long-copy, and no-JavaScript/static-first states.
- A restrained motion narrative; no smooth-scroll, animation, WebGL, or third-party visual dependency without a clear purpose and fallback.

### Lens C — Verification, operations, and delivery

Check for:

- Unit tests for business rules and utilities, integration/contract tests at service boundaries, and an end-to-end test for each P1 buying journey.
- Visual/browser checks at phone, tablet, and desktop sizes, plus keyboard and reduced-motion verification.
- Performance budgets for page weight, responsive images, layout shift, interaction latency, and any animation work.
- Error monitoring, structured logging, analytics events tied to stated outcomes, privacy/consent boundaries, and operational recovery.
- SEO metadata, structured product data, canonical behavior, and crawlability when the surface is public.
- Deployment, environment configuration, migrations, rollback, and post-deploy checks.

### Merge rules

- Add exact repository paths only after verifying they exist.
- Put unresolved technology choices into `research.md`, then resolve them before tasks are generated.
- Add a Testing Strategy and a Storefront Experience section when relevant.
- Record design decisions as constraints and systems, not pixel-by-pixel prescriptions unless an approved comp is the explicit authority.

## Upgrade implementation tasks

Run after `speckit.tasks` and before `speckit.analyze`.

### Lens A — Traceability and verification

- Map every functional requirement and acceptance scenario to at least one implementation or verification task.
- Ensure P1 journeys have end-to-end tests and critical business rules have unit or integration coverage.
- Add failure-path, empty-state, authorization, concurrency, payment outcome, and recovery tests where applicable.
- Keep tests beside the behavior or in the real test structure chosen by the plan; never invent framework-specific paths.

### Lens B — UI, content, and journey integration

- Ensure every UI task references `DESIGN.md` and the ÉPOCA storefront-design skill.
- Add missing tasks for routes, navigation, parent-component wiring, design tokens/primitives, responsive layouts, imagery, alt text, loading/empty/error/unavailable/success states, keyboard/focus, reduced motion, and long localized content.
- Add content and metadata tasks for product truth, SEO, structured data, and policy copy when in scope.
- UI verification tasks must include phone (390px), tablet (768px), and desktop (1440px) unless the plan establishes different evidence-based targets.

### Lens C — Production and integration wiring

- Add missing server validation, authorization, secret/configuration, idempotency, stale-stock/price reconciliation, logging, monitoring, performance, deployment, and rollback tasks.
- Every created service, hook, component, route, schema, and provider adapter needs a named consumer or an explicit `[W]` wiring task.
- A producer and its consumer must not be marked parallel when the consumer depends on the producer.
- Cross-story shared infrastructure needs wiring in every consuming story, not one vague final integration task.

### Task format and merge rules

- Preserve the project's checklist format: `- [ ] TNNN [P?] [USx?] Description with exact file path`.
- Use `[W]` for a separate integration-wiring task and place it in the consumer's phase after its producer.
- Keep task IDs unique and sequential. Renumber new tasks after consolidation.
- Put work in the phase where its consumer becomes usable. Do not exile essential accessibility, state, or wiring work to a vague polish phase.
- Preserve valid tasks; rewrite vague, duplicate, conflicting, or technically impossible tasks when evidence requires it.
- End with task count before/after, categories added, backup path, validation performed, and any remaining decision that blocks implementation.
