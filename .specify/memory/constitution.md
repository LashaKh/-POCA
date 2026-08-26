<!--
SYNC IMPACT REPORT
==================
Version Change: 1.1.0 -> 1.1.1
Rationale: Record Collector’s Index as the user-approved storefront direction.
Principles Reviewed:
  - I. Specification Before Construction
  - II. Product Truth & Commerce Correctness
  - III. Customer-First, Accessible Design
  - IV. Security & Privacy by Default
  - V. Tested Buying Journeys
  - VI. Simplicity & Incremental Delivery
Expanded Guidance:
  - Customer-facing work uses PRODUCT.md, DESIGN.md, and the ÉPOCA storefront-design workflow.
  - Substantial features pass through upgradeSpec, upgradePlan, and upgradeTasks before implementation.
Templates Status:
  - plan-template.md: compatible
  - spec-template.md: compatible
  - tasks-template.md: compatible
  - checklist-template.md: compatible
Follow-up TODOs:
  - Select languages, currencies, markets, stack, providers, and hosting through feature specs and plans.
-->

# ÉPOCA Constitution

## Core Principles

### I. Specification Before Construction

Every meaningful feature MUST begin with a customer-centered specification that states the problem, prioritized user stories, acceptance scenarios, edge cases, and measurable outcomes. Product requirements MUST remain independent of implementation choices. Architecture and provider choices belong in `plan.md`, after the desired behavior is clear.

**Rationale**: A specification is like agreeing on the room and its purpose before buying construction materials. It prevents the chosen technology from quietly deciding what the shop becomes.

### II. Product Truth & Commerce Correctness

Product information MUST be accurate, explicit, and traceable to a source of truth. A sellable carpet MUST support the attributes customers need to decide confidently, including dimensions, material, color, origin, construction, condition, care guidance, price, availability, and representative imagery when applicable. Prices, discounts, taxes, delivery charges, inventory, order totals, and order-state transitions MUST use deterministic business rules and MUST NOT be inferred from display text.

Color and texture variation between photography and the physical carpet MUST be communicated where relevant. An item that cannot be fulfilled MUST NOT be presented as immediately available for purchase.

**Rationale**: In commerce, the catalog is a promise. Attractive presentation cannot compensate for incorrect size, price, stock, or delivery expectations.

### III. Customer-First, Accessible Design

Customer-facing experiences MUST be mobile-first, responsive, keyboard-operable, and designed toward WCAG 2.2 AA accessibility. Essential information and actions MUST not depend on color alone, hover alone, or images without useful alternative text. Loading, empty, error, unavailable, and success states MUST be intentionally designed.

Image quality MUST be balanced with page speed. Plans for image-heavy surfaces MUST define responsive image behavior, sensible formats, and measurable performance targets. The visual system SHOULD express ÉPOCA's premium identity without reducing legibility or shopping clarity.

`DESIGN.md` MUST remain the visual authority for customer-facing work. Collector’s Index is the approved direction; archived exploration MUST remain distinct and MUST NOT be blended into production work. The selected direction and `.agents/skills/epoca-storefront-design/SKILL.md` MUST guide relevant specifications, plans, tasks, implementation, and browser review.

**Rationale**: The storefront is the shop entrance, salesperson, and fitting room at once. It must welcome people on small screens, slow connections, keyboards, and assistive technology.

### IV. Security & Privacy by Default

Secrets and credentials MUST remain outside version control. Customer and order data MUST be collected only when needed, protected in transit and at rest by the chosen platform, and exposed only to authorized roles. Payment card handling MUST be delegated to a trusted, compliant payment provider; ÉPOCA application code MUST NOT store raw card numbers or security codes.

Input validation MUST exist at trust boundaries, authorization MUST be enforced on the server side, and sensitive operations MUST fail safely with actionable logs that omit private values.

**Rationale**: Trust takes years to earn and one careless checkout flow to lose.

### V. Tested Buying Journeys

Behavior changes MUST include focused automated tests at the lowest useful level. Critical journeys—finding a product, viewing correct product details, selecting a purchasable option, adding or removing cart items, calculating totals, beginning checkout, handling payment outcomes, and confirming an order—MUST receive integration or end-to-end coverage as soon as those surfaces exist.

User-facing work MUST also be checked at representative phone and desktop widths. Tests MUST validate observable behavior and business rules rather than implementation details.

**Rationale**: A shop is only open when the whole path from discovery to order confirmation works, not when its individual pages merely render.

### VI. Simplicity & Incremental Delivery

The smallest independently valuable user story MUST be delivered first. Code, dependencies, services, and abstractions MUST be introduced only for a concrete requirement. Each task MUST name its consumer or integration point so newly created code is connected to a real journey. Complexity MUST be justified in the implementation plan with the simpler alternative that was rejected.

**Rationale**: A smaller complete shop is more useful than a sophisticated collection of disconnected rooms.

## Product and Technical Constraints

- Supported languages, currencies, tax rules, fulfillment regions, and return policies MUST be explicit requirements before the related behavior is implemented.
- Locale, currency, and market-specific content MUST be configurable rather than scattered as hardcoded assumptions.
- Search and product pages SHOULD expose structured, indexable content when public discovery is in scope.
- External platforms and providers MUST be selected in `plan.md` using current requirements, cost, operational burden, data ownership, and exit risk.
- The project MUST maintain a clear boundary between catalog content, inventory state, checkout/payment state, and presentation.
- Production data mutations, payment activation, domain changes, and deployments require explicit user direction for that environment.

## Development Workflow and Quality Gates

1. Follow `specify -> upgradeSpec -> clarify -> plan -> upgradePlan -> tasks -> upgradeTasks -> analyze -> implement` for substantial features. A hardening pass MUST preserve product intent, remain evidence-based and idempotent, and create a recoverable pre-upgrade backup.
2. Give each prioritized user story an independent test and acceptance scenarios.
3. Resolve all critical `[NEEDS CLARIFICATION]` items before implementation.
4. Record chosen technologies, project structure, data boundaries, integrations, and verification commands in `plan.md`.
5. Make `tasks.md` dependency-ordered and file-specific; every created service, component, or helper needs an explicit wiring task when integration is not part of the creation task.
6. Run the artifact consistency analysis before implementation.
7. Before considering a slice complete, run the narrowest relevant format, lint, typecheck, test, and build checks available in the selected stack.
8. For customer-facing slices, follow `docs/design/WORKFLOW.md` and verify accessibility and responsive behavior at the representative phone, tablet, and desktop widths defined by `DESIGN.md` in addition to automated tests.

## Governance

This constitution is the highest project-level authority for product and engineering work. Specifications and plans MUST pass its gates, and exceptions MUST be documented in the relevant plan with their scope and rationale.

Amendments require a reason, a semantic version change, a review of affected templates and active feature artifacts, and a migration note when existing work must change.

- **MAJOR**: Removes or redefines a core principle in an incompatible way.
- **MINOR**: Adds a principle or materially expands mandatory guidance.
- **PATCH**: Clarifies wording without changing required behavior.

**Version**: 1.1.1 | **Ratified**: 2026-08-25 | **Last Amended**: 2026-08-25
