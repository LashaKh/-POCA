# Feature Specifications

Each non-trivial feature gets a numbered directory created by the shared Spec Kit workflow:

```text
specs/001-feature-name/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

Only the artifacts needed by a feature have to exist. Do not hand-pick numbers; use `.specify/scripts/bash/create-new-feature.sh` through the Claude commands or the Codex spec-driven skill.
