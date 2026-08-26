---
description: Harden the active implementation plan after /speckit.plan with repository reuse, commerce architecture, storefront design completeness, testing, and production strategy.
handoffs:
  - label: Generate Tasks
    agent: speckit.tasks
    prompt: Break the upgraded plan into executable tasks
    send: true
---

## User Input

```text
$ARGUMENTS
```

Run `.specify/scripts/bash/check-prerequisites.sh --json` from the repository root and resolve `FEATURE_DIR/plan.md` plus its `spec.md`. Abort with a clear message if either required artifact is missing.

Read the plan and spec completely, plus `research.md`, `data-model.md`, and contracts when present. Read `CLAUDE.md`, `.specify/memory/constitution.md`, `PRODUCT.md`, `DESIGN.md`, and `.agents/skills/epoca-storefront-design/SKILL.md` when UI is involved. Then read the complete **Upgrade the implementation plan** section in `.agents/skills/spec-driven-development/references/upgrade-pipelines.md` and execute its shared protocol and three lenses.

Verify repository paths before adding them. Resolve technology unknowns through research, create a recoverable backup, make the pass idempotent, validate the merged artifact, show its diff, and report readiness for `/speckit.tasks`.
