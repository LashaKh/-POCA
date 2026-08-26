# Restore rehearsal evidence — 2026-08-26

## Decision

**Passed for the local isolated-recovery scope.** The repository can create a clean Supabase schema, seed safe fixtures, capture a PostgreSQL logical backup plus Storage object archive, restore the database into a disposable isolated database, and prove exact critical-data equivalence. This does not prove managed Supabase PITR or a production Storage restore; both remain launch gates for the managed environment.

## Execution

- Branch: `001-build-production-shop`
- Clean reset completed: 2026-08-26, immediately before the rehearsal
- Command: `npm run db:restore:rehearse`
- Rehearsal start: `2026-08-26T01:44:13.715Z`
- Backup point: `2026-08-26T01:44:15.466Z`
- Integrity complete: `2026-08-26T01:44:17.911Z`
- Local logical RPO: 0 seconds; the restored snapshot contained the last synthetic accepted order
- Local measured restore/integrity RTO: 2 seconds
- Backup: 3,073,241 bytes, SHA-256 `a3ff5d86f2f6902bfec8831a6242d9acbf061ea7aac6911d1daba082d713099f`
- Isolated database: `epoca_restore_20260826_f73cd224`; dropped after successful verification
- Temporary database dump and media exports: removed after verification
- Append-only `backup_restore_evidence` result: inserted with `status=passed`, `environment=isolated-restore`, and this document as its artifact reference

## Exact source/restore comparison

The source and restored snapshots matched exactly for all listed counts:

| Critical record                                    |        Source |      Restored |
| -------------------------------------------------- | ------------: | ------------: |
| Applied migrations                                 |            37 |            37 |
| Products                                           |         5,001 |         5,001 |
| Product translations                               |        20,001 |        20,001 |
| Product prices                                     |        15,001 |        15,001 |
| Inventory items                                    |         5,001 |         5,001 |
| Orders / lines / addresses / events                | 1 / 1 / 1 / 1 | 1 / 1 / 1 / 1 |
| Payment attempts / reservations / inventory events |     1 / 1 / 1 |     1 / 1 / 1 |
| Media assets / licenses / variants / links         | 2 / 2 / 1 / 1 | 2 / 2 / 1 / 1 |
| Storage metadata objects                           |             2 |             2 |
| Profiles / staff members / active Owners           |     1 / 1 / 1 |     1 / 1 / 1 |
| Scheduled actions / release records                |         1 / 1 |         1 / 1 |

All 81 public tables had RLS (row-level security: database rules restricting which rows a caller may access) enabled in both snapshots. The critical table policy flags also matched exactly. The compact `verify_critical_data_integrity()` result was `ok=true` before and after restore.

## Relationship and commercial invariants

Each source and restored check returned zero failures:

- orders without lines;
- orders without a delivery address;
- order and line total mismatches;
- negative or over-reserved inventory;
- orphaned inventory reservations;
- orphaned media links or variants;
- critical tables without RLS.

The exercise used a real synthetic bank-transfer order for a unique-stock product. Acceptance generated its immutable line/address/event/payment/reservation/inventory graph, so the comparison did not rely on empty commerce tables.

## Media recovery evidence

The rehearsal uploaded and downloaded actual local Storage bytes before backup, wrote them to the isolated temporary archive, reread them, and verified their SHA-256 hashes:

- private original `product-originals/rehearsal/132559026c9b/master.png`: 148 bytes, `508728235805c3c822fbe7638e6b6e4589984dba842b5cd22effa74990d7ebe7`;
- public rendition `product-renditions/rehearsal/132559026c9b/thumbnail-32.webp`: 76 bytes, `f1ea350eadc4d1eec258a274e93e583c38b76e569e732772bd5c8ac2b994d5e7`.

Their restored Storage metadata, media asset, license, rendition, product link, and checksums matched the source. Supabase database backups do not contain Storage object bytes; the separate archive step is therefore mandatory in managed rehearsals.

## Remaining production proof

Launch readiness remains blocked until an isolated managed Supabase staging project proves the configured PITR recovery point, the production-sized Storage export/restore process, provider-safe smoke journeys, and the ≤15-minute RPO / ≤4-hour RTO objectives. Local timing is implementation evidence, not a production capacity claim.
