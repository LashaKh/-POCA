---
description: Harden the active tasks after /speckit.tasks with requirement traceability, UI integration, wiring, testing, accessibility, and production-readiness work.
handoffs:
  - label: Analyze Consistency
    agent: speckit.analyze
    prompt: Check the upgraded spec, plan, and tasks for consistency
    send: true
---

## User Input

```text
$ARGUMENTS
```

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from the repository root and resolve `FEATURE_DIR/tasks.md`, `plan.md`, and `spec.md`. Abort with a clear message if a required artifact is missing.

Read all three artifacts completely and note the existing task count and highest task ID. Read `CLAUDE.md`, `DESIGN.md`, and `.agents/skills/epoca-storefront-design/SKILL.md` when UI is involved. Then read the complete **Upgrade implementation tasks** section in `.agents/skills/spec-driven-development/references/upgrade-pipelines.md` and execute its shared protocol and three lenses.

Use exact verified file paths, maintain dependencies and `[W]` wiring semantics, keep IDs unique and sequential, and do not invent tool-specific tests before the plan selects a stack. Create a recoverable backup, make the pass idempotent, validate the merged artifact, show its diff, and report readiness for `/speckit.analyze`.
