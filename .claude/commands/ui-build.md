---
description: Build an approved ÉPOCA customer-facing interface with the shared design system
argument-hint: <surface or approved feature to build>
---

# Build ÉPOCA UI

Follow `.agents/skills/epoca-storefront-design/SKILL.md` and `docs/design/WORKFLOW.md`.

1. Read `PRODUCT.md`, the selected `DESIGN.md` direction, relevant feature artifacts, and existing implementation completely.
2. Confirm that the request authorizes implementation and that the product behavior is specified. Do not invent missing catalog, policy, price, availability, payment, or fulfillment rules.
3. Build the smallest complete vertical slice: semantic content, real navigation/wiring, usable actions, explicit states, responsive imagery, mobile/tablet/desktop composition, keyboard behavior, focus, and reduced motion.
4. Reuse tokens and components; extract new primitives only for real repetition.
5. Keep important content and actions visible without JavaScript. Add restrained progressive enhancement only after the base surface works.
6. Run the repository's targeted lint, typecheck, tests, and build commands.
7. Complete the skill's two-pass browser review and report evidence and remaining assumptions.

ARGUMENTS: $ARGUMENTS
