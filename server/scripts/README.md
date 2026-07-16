# Bulk box import

Two-step workflow for importing a large list of schools (e.g. a GRID3-format
Nigeria schools export) as `Box` documents.

## 1. Convert the source .xlsx to JSON

```bash
python3 scripts/xlsx-schools-to-json.py path/to/schools.xlsx /tmp/schools.json
```

No installs needed — this reads the `.xlsx` directly as a zip of XML using
only Python's standard library. It expects a sheet with `name`, `lganame`,
`statename`, `wardname`, `x` (longitude), and `y` (latitude) columns, and
picks the largest sheet in the workbook automatically (GRID3 exports also
ship a small pivot "Summary" sheet that should be ignored).

## 2. Import the JSON into MongoDB

```bash
# dry run first — no writes, just a preview
node scripts/import-boxes.js --input /tmp/schools.json --admin-id <adminId> --project "<Project Name>"

# then actually write
node scripts/import-boxes.js --input /tmp/schools.json --admin-id <adminId> --project "<Project Name>" --commit
```

- `--admin-id`: the `id` of the admin account (not the email) that should own these boxes. Look it up via `GET /api/me` with that admin's API key, or query the `admins` collection directly.
- `--project`: value for the required `project` field on every imported box.
- `--batch-size`: optional, defaults to 2000.
- Reads the Mongo connection string from `STRING_URI` (same env var the server itself uses — set it in `server/.env` or export it before running).
- Always run without `--commit` first and check the row count and sample doc before committing to a live database.

## Notes

- `import-boxes.js` requires every row to already have `school`, `district`, `division`, `schoolLatitude`, and `schoolLongitude` — it will refuse to run if any row is missing one of these rather than silently skipping or inserting bad data.
- If a future source file has a different column layout, write a new `xlsx-*-to-json.py`-style converter that outputs the same JSON shape (`division`, `district`, `zone`, `school`, `schoolLatitude`, `schoolLongitude`) — `import-boxes.js` itself doesn't need to change.
