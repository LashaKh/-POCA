# US3 media-ingestion load evidence

Validated on 2026-08-26 with `npm run test:load:ingestion` against a freshly migrated local Supabase stack.

## Envelope and budgets

- Register a 250-file burst without registration errors.
- Process 12 real JPEG originals through all nine version-1 rendition recipes.
- Finish representative local processing and maximum queue age within 120 seconds.
- Stay below 1,024 MB peak resident memory.
- Produce zero duplicate rendition paths.
- Make a completed second pass perform zero inspection, claim, or completion work.

## Result

| Measure                 |                              Observed |             Gate |
| ----------------------- | ------------------------------------: | ---------------: |
| Burst registrations     |                                   250 |              250 |
| Burst registration time |                                360 ms |    Informational |
| Images completed        |                                    12 |               12 |
| Renditions              |                                   108 |              108 |
| Unique rendition paths  |                                   108 |              108 |
| Duplicate outputs       |                                     0 |                0 |
| Processing duration     |                              7,784 ms |     < 120,000 ms |
| Maximum queue age       |                              7,621 ms |     < 120,000 ms |
| Peak RSS                |                                476 MB |       < 1,024 MB |
| Maximum job attempts    |                                     1 | 1 on healthy run |
| Idempotent second pass  | 0 inspected / 0 claimed / 0 completed |         All zero |

The harness removes all generated originals, renditions, batch rows, media records, and draft products in `finally`, so a failed assertion does not deliberately leave load fixtures behind.

These numbers are local representative evidence, not a promise about hosted Supabase or Netlify throughput. Staging must rerun the same harness with production-equivalent limits before traffic is enabled.
