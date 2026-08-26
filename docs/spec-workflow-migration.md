# Spec Workflow Migration

**Source inspected:** `/Users/toko/Desktop/medplum_medimind/.claude/commands/`  
**Migration date:** 2026-08-25

The source repository contains exactly three artifact-upgrade command pipelines. All three now have ÉPOCA equivalents:

| Source pipeline   | ÉPOCA command                      | Shared implementation contract                                                                             |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `upgradeSpec.md`  | `.claude/commands/upgradeSpec.md`  | `.agents/skills/spec-driven-development/references/upgrade-pipelines.md` → Upgrade the specification       |
| `upgradePlan.md`  | `.claude/commands/upgradePlan.md`  | `.agents/skills/spec-driven-development/references/upgrade-pipelines.md` → Upgrade the implementation plan |
| `upgradeTasks.md` | `.claude/commands/upgradeTasks.md` | `.agents/skills/spec-driven-development/references/upgrade-pipelines.md` → Upgrade implementation tasks    |

## Rigor preserved

- A focused second pass after the corresponding Spec Kit artifact is created.
- Recoverable pre-upgrade backups and an idempotent upgrade marker.
- Independent review lenses, evidence-based severity, consolidation, and contradiction resolution.
- Exact artifact edits, structural validation, diff review, and a clear handoff to the next stage.
- Spec/plan/task responsibility boundaries and requirement-to-task traceability.

## Project-specific adaptation

The source commands contained medical assumptions such as FHIR resources, EMR routes, Georgian identifiers, healthcare roles, Mantine components, and `MockClient` tests. Those were deliberately replaced rather than copied:

- Buyer discovery, product evaluation, catalog truth, cart, checkout, inventory, fulfillment, and policy journeys.
- Stale price/stock, concurrent purchase, payment failure, recovery, and commerce trust boundaries.
- ÉPOCA's `PRODUCT.md`, `DESIGN.md`, storefront-design skill, responsive imagery, accessibility, and visual browser checks.
- Provider-neutral architecture, testing, operations, deployment, SEO, structured product data, and rollback gates.

The canonical substantial-feature sequence is now:

```text
specify → upgradeSpec → clarify → plan → upgradePlan → tasks → upgradeTasks → analyze → implement
```

This sequence is aligned in `CLAUDE.md`, `.specify/memory/constitution.md`, the Codex spec-driven skill, and the root `README.md`.
