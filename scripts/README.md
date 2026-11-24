# Scripts

## `export-standalone.mjs`

Exports a single-country copy of TnT, for a hand-over or an on-premise install:

    node scripts/export-standalone.mjs <country> <outDir> [--git]

It keeps only that country's folder in `client/`, `server/`, `mobile/` and `tests/`, points each `default.json` at it
and writes a README and a CI workflow for the copy. Tested by `tests/scripts/export-standalone.test.ts` and exercised
by the `standalone-export` job of CI.

## `migration/`

Tools used in October 2026 to bring the legacy (JavaScript-era) country databases to the current server. They run
against the MongoDB named by `STRING_URI`, are read-only unless given `--confirm`, and refuse to write anywhere but a
`tnt_staging_*` database unless given `--production`. Always read the `Database:` line they print.

- `audit.mjs`, `verify.ts`: read-only checks before and after a migration.
- `indexes.mjs`: creates the indexes the server needs (idempotent, never drops).
- `backfill-embedded-scans.mjs`: copies scans stored inside legacy boxes into the `scans` collection.
- `recompute.ts`: recomputes `statusChanges`, `progress` and `lastScan` of boxes with the server's own code.
- `restore-derived-fields.mjs`: emergency rollback of the recompute from a restored backup.
- `drop-staging.mjs`: drops a `tnt_staging_*` copy.

They are kept for that rollback and for any country still to migrate; the shared helpers are covered by
`tests/scripts/migration-lib.test.ts`. Each script starts with a comment saying how to run it.
