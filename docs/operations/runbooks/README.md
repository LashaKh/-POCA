# ÉPOCA operator runbooks

Use these in order. Every command is expected to produce dated evidence; never continue a promotion after a failed gate.

1. [Environment, migrations, and deployment](./environment-deployment.md)
2. [Incidents, degraded dependencies, and rollback](./incident-rollback.md)
3. [Payment and domain activation](./payment-domain-activation.md)
4. [Owner access recovery](./owner-recovery.md)
5. [Backup and restore](../backup-restore.md)
6. [Data governance](../data-governance.md)

The operations Owner is accountable for release and recovery decisions. Managers may handle normal catalog, ingestion, order, fulfillment, and reconciliation work but cannot activate production integrations, change ownership, inspect broad audit evidence, or approve irreversible data operations.
