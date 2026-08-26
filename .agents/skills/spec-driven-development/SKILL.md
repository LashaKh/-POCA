---
name: spec-driven-development
description: Use ÉPOCA's Spec Kit workflow to create, clarify, plan, decompose, analyze, or implement a non-trivial feature. Trigger for feature specs, product requirements, implementation plans, task breakdowns, consistency checks, or requests to build a meaningful feature; skip for tiny fixes and simple documentation edits.
---

# Spec-Driven Development

Use the repository's shared `.specify/` engine so Codex and Claude produce compatible feature artifacts.

## Route the request

Choose only the stage the user requested. Read the matching workflow file completely before acting:

| Request                                | Shared workflow reference                   |
| -------------------------------------- | ------------------------------------------- |
| Create or amend project principles     | `.claude/commands/speckit.constitution.md`  |
| Turn an idea into a feature spec       | `.claude/commands/speckit.specify.md`       |
| Harden a completed feature spec        | `.claude/commands/upgradeSpec.md`           |
| Resolve important ambiguity            | `.claude/commands/speckit.clarify.md`       |
| Design the implementation              | `.claude/commands/speckit.plan.md`          |
| Harden a completed implementation plan | `.claude/commands/upgradePlan.md`           |
| Create an implementation checklist     | `.claude/commands/speckit.checklist.md`     |
| Break the plan into executable tasks   | `.claude/commands/speckit.tasks.md`         |
| Harden a completed task breakdown      | `.claude/commands/upgradeTasks.md`          |
| Check artifact consistency             | `.claude/commands/speckit.analyze.md`       |
| Implement approved tasks               | `.claude/commands/speckit.implement.md`     |
| Convert tasks to GitHub issues         | `.claude/commands/speckit.taskstoissues.md` |

The files are shared workflow references even though they live under `.claude/commands`. Ignore Claude-only frontmatter such as `handoffs` or unavailable tool declarations; follow the workflow body and preserve the user's authorization boundaries.

## Project rules

- Read `CLAUDE.md` and `.specify/memory/constitution.md` before producing or changing feature artifacts.
- Run from the repository root and inspect the current branch and working tree first.
- Keep product intent in `spec.md`, technical choices in `plan.md`, and exact implementation steps in `tasks.md`.
- Store each feature under `specs/NNN-feature-name/` and use the provided scripts and templates rather than recreating their behavior.
- Do not select a framework, database, provider, or architecture during specification unless the user made that choice a requirement.
- Do not jump ahead: a request for a spec does not authorize a plan or implementation. A request to build a substantial feature should ensure the prerequisite artifacts exist, then proceed through missing stages.
- Ask only for decisions that materially change the outcome and cannot safely be derived from repository context. Record resolved answers in the feature artifacts.
- Keep the first user story independently valuable and testable as the MVP (minimum viable product).
- Before implementation, run the consistency analysis and resolve critical gaps.
- For substantial features, use the upgrade passes in sequence: `specify -> upgradeSpec -> clarify -> plan -> upgradePlan -> tasks -> upgradeTasks -> analyze -> implement`. Read `references/upgrade-pipelines.md` for their shared contract.
- During implementation, follow dependency order, mark completed tasks, make small changes, and run targeted verification after each coherent slice.
- Use the GitHub-issues stage only when the user requests issues and a GitHub integration is available.

## Shared mechanics

The canonical helpers are:

- `.specify/scripts/bash/create-new-feature.sh` for numbering, branch creation, and the initial `spec.md`.
- `.specify/scripts/bash/setup-plan.sh` for creating `plan.md` from the maintained template.
- `.specify/scripts/bash/check-prerequisites.sh` for locating the active feature and required artifacts.
- `.specify/scripts/bash/update-agent-context.sh claude` for reflecting chosen technology in the shared assistant instructions after planning. Use the `claude` target in this repository because `AGENTS.md` is a symbolic link to `CLAUDE.md`; writing the Codex target atomically would replace that link.

Prefer these helpers because they keep branch names and artifact paths consistent across assistants.
