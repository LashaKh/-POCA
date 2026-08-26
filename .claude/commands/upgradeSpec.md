---
description: Harden the active feature spec after /speckit.specify with storefront journeys, edge cases, trust requirements, and complete acceptance scenarios.
handoffs:
  - label: Clarify Requirements
    agent: speckit.clarify
    prompt: Resolve the remaining material decisions in the upgraded spec
    send: true
---

## User Input

```text
$ARGUMENTS
```

Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` from the repository root and resolve `FEATURE_DIR/spec.md`. Abort with a clear message if it is missing.

Read the spec, `CLAUDE.md`, `.specify/memory/constitution.md`, `PRODUCT.md`, and `DESIGN.md` when present. Then read the complete **Upgrade the specification** section in `.agents/skills/spec-driven-development/references/upgrade-pipelines.md` and execute its shared protocol and three lenses.

Keep the result business-focused: customer behavior, commerce rules, edge cases, and measurable outcomes. Do not select technologies or add unsupported product claims. Create a recoverable backup, make the pass idempotent, validate the merged artifact, show its diff, and report readiness for `/speckit.clarify`.
