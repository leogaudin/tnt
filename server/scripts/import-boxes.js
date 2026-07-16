import { MongoClient } from 'mongodb';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Bulk-imports Box documents from a JSON file (an array of objects with at
 * least: project, division, district, zone, school, schoolLatitude,
 * schoolLongitude). See scripts/README.md for the full workflow, including
 * how to produce that JSON file from an .xlsx source.
 *
 * Usage:
 *   node scripts/import-boxes.js --input <path.json> --admin-id <id> --project <name> [--commit] [--batch-size 2000]
 *
 * Reads the Mongo connection string from STRING_URI (same env var the server uses).
 * Runs as a dry run (no writes) unless --commit is passed.
 */

function parseArgs() {
	const args = process.argv.slice(2);
	const get = (flag) => {
		const i = args.indexOf(flag);
		return i === -1 ? undefined : args[i + 1];
	};

	const input = get('--input');
	const adminId = get('--admin-id');
	const project = get('--project');
	const batchSize = parseInt(get('--batch-size') || '2000', 10);
	const commit = args.includes('--commit');

	if (!input || !adminId || !project) {
		console.error('Usage: node scripts/import-boxes.js --input <path.json> --admin-id <id> --project <name> [--commit] [--batch-size 2000]');
		process.exit(1);
	}

	return { input, adminId, project, batchSize, commit };
}

function generateId() {
	return crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

async function main() {
	const { input, adminId, project, batchSize, commit } = parseArgs();

	if (commit && !process.env.STRING_URI) {
		console.error('STRING_URI is not set. Add it to server/.env or export it before running.');
		process.exit(1);
	}

	const raw = JSON.parse(fs.readFileSync(input, 'utf-8'));
	console.log(`Loaded ${raw.length} rows from ${input}`);

	const required = ['school', 'district', 'division', 'schoolLatitude', 'schoolLongitude'];
	const invalid = raw.filter((r) => required.some((field) => r[field] === undefined || r[field] === null || r[field] === ''));
	if (invalid.length) {
		console.error(`${invalid.length} rows are missing a required field (${required.join(', ')}). Fix the input file before importing. First bad row:`, invalid[0]);
		process.exit(1);
	}

	const now = new Date();
	const docs = raw.map((r) => ({
		id: generateId(),
		project,
		division: r.division,
		district: r.district,
		zone: r.zone || '',
		school: r.school,
		adminId,
		createdAt: now,
		schoolLatitude: r.schoolLatitude,
		schoolLongitude: r.schoolLongitude,
		progress: 'noScans',
	}));

	console.log('Sample doc:', JSON.stringify(docs[0], null, 2));
	console.log(`Prepared ${docs.length} Box documents for admin "${adminId}", project "${project}". Mode: ${commit ? 'COMMIT (will write to DB)' : 'DRY RUN (no writes)'}`);

	if (!commit) {
		console.log('Dry run complete. Re-run with --commit to actually insert.');
		return;
	}

	const client = new MongoClient(process.env.STRING_URI);
	await client.connect();
	const boxes = client.db().collection('boxes');

	let inserted = 0;
	for (let i = 0; i < docs.length; i += batchSize) {
		const batch = docs.slice(i, i + batchSize);
		const result = await boxes.insertMany(batch, { ordered: false });
		inserted += result.insertedCount;
		console.log(`Inserted ${inserted}/${docs.length}`);
	}

	console.log('Done. Total inserted:', inserted);
	await client.close();
}

main().catch((err) => {
	console.error('FATAL:', err);
	process.exit(1);
});
