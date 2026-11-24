# Scripts

## `export-standalone.mjs`

Exports a single-country copy of TnT, for a hand-over or an on-premise install:

    node scripts/export-standalone.mjs <country> <outDir> [--git]

It keeps only that country's folder in `client/`, `server/`, `mobile/` and `tests/`, points each `default.json` at it
and writes a README and a CI workflow for the copy. Tested by `tests/scripts/export-standalone.test.ts` and exercised
by the `standalone-export` job of CI.

The October 2026 database migration tools (`scripts/migration/`) were removed once every country was migrated; they
are in the git history (last present in commit `9550df5`).
