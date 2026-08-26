---
name: epoca-storefront-design
description: Design, build, critique, audit, harden, or polish customer-facing ÉPOCA storefront interfaces. Use for landing pages, catalog and product pages, cart or checkout UI, design directions, visual systems, responsive layouts, or any request to make ÉPOCA's UI look or work better.
---

# ÉPOCA Storefront Design

Create original, production-minded storefront UI using the repository's shared visual authority. This skill unifies the context-and-audit discipline of Impeccable, the art-direction bar of Meng To's Awwwards-quality workflow, and ÉPOCA's commerce rules.

## Required context

Before designing or changing UI, read completely:

1. `PRODUCT.md`
2. `DESIGN.md`
3. `docs/design/WORKFLOW.md`
4. The relevant feature `spec.md`, `plan.md`, and `tasks.md` when they exist
5. Existing components, tokens, routes, and styling conventions in the affected code

Use `docs/design/reference-analysis.md` for the exploration rationale and `docs/design/quality-scorecard.md` for browser review.

## Choose the operation

### Direct

Use when exploring a new page or visual direction. State the visitor goal, page mode, art-direction sentence, composition, type/palette relationship, content truth, states, and responsive behavior before implementation.

### Build

Use when implementing an approved direction. Start with semantic, static-visible content. Reuse the existing system, build mobile-first, add explicit states, and keep motion purposeful and optional.

### Critique

Use when the user wants feedback but did not authorize edits. Inspect real browser renders and explain the highest-impact hierarchy, clarity, consistency, and trust problems with concrete fixes.

### Audit and harden

Use when correctness is the goal. Verify responsive behavior, keyboard and assistive-technology foundations, contrast, reduced motion, imagery, performance, product truth, content integrity, and failure states. Implement fixes only when the request authorizes changes.

### Polish

Use after the surface works. Tighten typography, spacing, crops, optical alignment, transitions, and microcopy without changing product scope or adding decorative noise.

## Quality rules

- Build an original interpretation; never reproduce a competitor page.
- Follow the selected Collector’s Index direction in `DESIGN.md`. Treat the other candidates as archived exploration and do not merge their vocabularies into production work.
- Use licensed, owned, generated, or clearly attributed media and maintain the source ledger.
- Favor one strong composition over a collection of disconnected effects.
- Keep search, navigation, product facts, availability, price, policies, and actions legible.
- Use no fake testimonials, logos, awards, urgency, scarcity, discounts, provenance, or sustainability claims.
- Avoid generic bento grids, glass styling, ornamental gradient fields, excessive pills, deep shadows, and template-like icon rows.
- Do not add smooth scrolling, GSAP, Three.js, WebGL, or another visual dependency unless it has a specific user-facing purpose, a static fallback, a reduced-motion path, and an acceptable performance cost.
- Keep content visible without JavaScript. Use progressive enhancement for animation and interaction.
- Design phone, tablet, desktop, focus, hover, pressed, loading, empty, error, unavailable, success, missing-media, and long-copy behavior as applicable.

## Verification contract

Follow the bounded two-pass review in `docs/design/WORKFLOW.md`:

1. Render at 390px, 768px, and 1440px.
2. Review with `docs/design/quality-scorecard.md` and inspect the buying journey.
3. Fix the highest-impact issues.
4. Re-render affected views and verify keyboard focus and reduced-motion behavior.
5. Report evidence, remaining assumptions, and any intentionally deferred state.

Do not claim visual quality based only on reading source code.
