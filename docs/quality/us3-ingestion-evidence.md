# US3 ingestion acceptance evidence

Validated on 2026-08-26. This document maps the automated product-ingestion implementation to its acceptance criteria; it contains no credentials or customer data.

## Verification summary

| Layer                               | Command / evidence                                                              | Result                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fresh schema                        | `npm run db:reset`                                                              | Migrations 001–033 and seeds applied in order; Docker Desktop reported a Storage health-check timeout afterward while `/storage/v1/status` returned HTTP 200 |
| Database contracts                  | `npm run db:test`                                                               | 6 files, 218 assertions passed; ingestion file contributed 53 assertions                                                                                     |
| Ingestion unit/contract/integration | Focused Vitest run over ingestion, assistance, admin review, and media pipeline | 6 files, 17 tests passed                                                                                                                                     |
| Publish journey                     | `product-ingestion.spec.ts`, tablet production build                            | Passed in 7.3 s                                                                                                                                              |
| Recovery journey                    | `product-ingestion-recovery.spec.ts`, tablet production build                   | Passed in 8.1 s                                                                                                                                              |
| Accessibility / responsive          | `tests/accessibility/ingestion.spec.ts`                                         | 5/5 projects, two clean axe passes each                                                                                                                      |
| Load / idempotency                  | `npm run test:load:ingestion`                                                   | 250 registrations; 12 images; 108 unique renditions; 0 duplicates                                                                                            |

## Success criteria

- **SC-004**: The UI journey proves Manager sign-in, standardized TUS upload, review of authoritative facts and all four languages, media rights/crop approval, one current publication confirmation, and public discovery. Recovery E2E proves a real interrupted PATCH resumes. Twelve-image processing completes in 7.8 seconds locally; the assisted/manual review remains the human-controlled portion of the ten-minute criterion.
- **SC-005**: Checksum-owned assets, recipe output uniqueness, idempotent file registration, corrupt-partial checksum replacement, duplicate-batch recognition, and a zero-work second worker pass produced zero duplicate originals/assets/renditions/products in the exercised paths.
- **SC-006**: `evaluate_product_readiness` blocks incomplete grouped facts, translations, commerce, and media; the pgTAP publication transaction and browser journey publish only after every authoritative check passes.
- **SC-024**: Anonymous download of `product-originals` is denied. Only human-approved renditions become readable publicly. Rights/license state is part of the publication gate.

## Functional requirements

| Requirement     | Evidence                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-026 / FR-027 | Batch/file rows exist before upload; Uppy TUS uses signed permission plus the current staff bearer token, 6 MiB chunks, persisted fingerprints, retry delays, and no browser service key.                                         |
| FR-028          | Declared limits are enforced before upload; Sharp checks magic bytes, actual type/size/dimensions/pages/pixel ceiling and strips metadata. Mislabeled and corrupt cases pass.                                                     |
| FR-029          | Stable batch/file identities and deterministic paths preserve ordering/group context; staff retains final review control.                                                                                                         |
| FR-030          | Recipe version 1 deterministically creates placeholder, thumbnail, catalog, card, gallery, editorial, and OG outputs with crop/focal/checksum metadata.                                                                           |
| FR-031 / FR-032 | Assistance defaults disabled. The optional OpenAI adapter uses a pinned Responses model, strict schema, `store:false`, a selected approved image, verified context, forbidden-fact guard, and human accept/edit/reject decisions. |
| FR-033 / FR-034 | Durable jobs have bounded leases, checkpoints, retries, stale recovery, safe errors, cancellation, corrupt-partial recovery, and owner-removable private orphans.                                                                 |
| FR-035 / FR-036 | Originals remain private; approved renditions use a distinct public bucket; actual checksums deduplicate assets and recipe constraints prevent duplicate variants.                                                                |
| FR-037 / FR-038 | Four-language copy, factual fields, price, stock, delivery, rights, alt text, crops, and discovery readiness are saved/reviewed before the transactional publish function accepts one current confirmation.                       |
| FR-108          | Every product asset receives a media-license row. Pending/unapproved rights block publication; approval records ownership basis and creator/evidence source.                                                                      |

## Recovery cases exercised

- TUS upload larger than one chunk with the first PATCH interrupted, then resumed by the client.
- Duplicate Storage path rejected when overwrite is disabled.
- Same-byte upload in a second batch reuses the checksum-owned asset and becomes `duplicate`.
- Expired worker lease reclaimed; missing original moves the job to `retrying`; restoring the original completes it.
- Corrupt pre-existing partial rendition is detected by checksum, removed, and regenerated.
- Cancelled pre-processing original can be removed by its owning Manager through the narrow Storage policy.
- Disabled assistance presents a manual fallback, and incomplete review presents one grouped blocker list with no publish control.
