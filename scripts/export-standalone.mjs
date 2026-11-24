#!/usr/bin/env node
// Exports a standalone, single-country copy of TnT (for a government hand-over or an on-premise install).
//
//   node scripts/export-standalone.mjs <country> <outDir> [--git]
//
// The result has only that country's folder in client/, server/, mobile/ and tests/, each package's
// countries/default.json points at it, so everything builds and runs as that country with no TNT_COUNTRY.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = ['client', 'server', 'mobile'];
// The export tool's own test needs every country, which a standalone repo doesn't have.
const EXCLUDED_FILES = ['tests/scripts/export-standalone.test.ts'];

export function listCountryFolders(pkg, base = root) {
	return fs.readdirSync(path.join(base, pkg, 'countries'), { withFileTypes: true })
		.filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

/** Whether a tracked file belongs in the export of `country`. */
export function isIncluded(file, country) {
	if (EXCLUDED_FILES.includes(file)) return false;
	if (file.startsWith('.github/')) return false;
	const m = file.match(/^(client|server|mobile|tests)\/countries\/([^/]+)\/(.*)$/);
	if (m) return m[2] === country;
	return true;
}

/** Keeps only `country` in server/countries/index.ts (its imports and registry). */
export function rewriteServerRegistry(source, country) {
	const ident = country.replace(/-(\w)/g, (_, c) => c.toUpperCase());
	const key = /^[A-Za-z_$][\w$]*$/.test(country) ? country : `'${country}'`;
	return source
		.replace(
			/\/\/ <country-imports>[\s\S]*?\/\/ <\/country-imports>\n/,
			`import ${ident} from './${country}/config';\n`,
		)
		.replace(
			/\/\/ <country-registry>\n([\s\S]*?)\/\/ <\/country-registry>\n/,
			`export const countries: Record<string, ServerCountryConfig> = {\n\t${key}${key === ident ? '' : `: ${ident}`},\n};\n`,
		);
}

export function readme(country) {
	return `# TnT (Track-and-Trace) — ${country}

Standalone export of [TnT](https://github.com/leogaudin/tnt) for **${country}**. Everything builds and runs as ${country} with no extra configuration:
each package's \`countries/default.json\` names it, and only its folder is kept.

License: AGPL-3.0 with the "Powered by TnT" attribution term of \`LICENSE\`. The notice in the web app's footer and the mobile scanner must stay.

## Where the country settings live

- \`client/countries/${country}/\`: \`config.ts\` (name, colors, API URL, fields, labels), \`public/\` icons, optional \`locales/\`.
- \`server/countries/${country}/config.ts\`: box fields, report columns, GPS match fields, feature flags.
- \`mobile/countries/${country}/\`: \`config.json\` (application id, app name, API URL, colors) and \`android/res\` icons, used by both mobile apps.

If you change a value that two packages share (box fields, colors, API URL), change it in both: \`cd tests && npx vitest run\` checks they agree.

## Run

Server (\`server/\`): needs \`STRING_URI\` (MongoDB connection string) in the environment or a \`.env\` file.

\`\`\`
cd server && npm ci && npm run build   # type-checks
npm run dev                            # local, port 3000
npm run deploy                         # pm2, production
\`\`\`

Client (\`client/\`): \`npm ci && npm run build\` produces \`dist/\`. \`VITE_API_URL\` overrides the API URL set in the config.

Mobile apps: \`./assemble release\` or \`./assemble debug\` builds the Android app (Kotlin, \`android/\`) and writes the APK to \`dist/mobile/\`.
\`./assemble release --ios\` archives the iOS app (Swift, \`ios/\`; needs Xcode and a signing team). \`./assemble debug --ios\` builds it for the simulator.
Android release builds use the debug keystore unless \`mobile/countries/${country}/signing.properties\` exists
(\`storeFile\`, \`storePassword\`, \`keyAlias\`, \`keyPassword\`). Never commit it.
The app version is \`android/version.json\`'s \`version\`, shared by both apps; an app update only installs over a higher versionCode.

## Tests

\`cd tests && npm ci && npx vitest run\`
`;
}

export function ciWorkflow() {
	return `name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - run: cd server && npm ci && npm run build
      - run: cd client && npm ci && npx tsc --noEmit && npm run build
      - run: cd tests && npm ci && npx vitest run
`;
}

function main() {
	const args = process.argv.slice(2);
	const withGit = args.includes('--git');
	const [country, outDirArg] = args.filter((a) => !a.startsWith('--'));
	if (!country || !outDirArg) {
		console.error('Usage: node scripts/export-standalone.mjs <country> <outDir> [--git]');
		process.exit(1);
	}
	const outDir = path.resolve(outDirArg);

	for (const pkg of PACKAGES) {
		if (!listCountryFolders(pkg).includes(country)) {
			console.error(`Unknown country "${country}": missing from ${pkg}/countries. Available: ${listCountryFolders('server').join(', ')}`);
			process.exit(1);
		}
	}
	if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
		console.error(`${outDir} already exists and is not empty.`);
		process.exit(1);
	}

	const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1 << 28 })
		.toString().split('\0').filter(Boolean).filter((f) => isIncluded(f, country));

	for (const f of files) {
		const dest = path.join(outDir, f);
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.copyFileSync(path.join(root, f), dest);
	}

	for (const pkg of PACKAGES) {
		fs.writeFileSync(path.join(outDir, pkg, 'countries/default.json'), JSON.stringify({ country }) + '\n');
	}
	const registry = path.join(outDir, 'server/countries/index.ts');
	fs.writeFileSync(registry, rewriteServerRegistry(fs.readFileSync(registry, 'utf8'), country));

	// tsc resolves '@country/*' through tsconfig paths, which point at _default in central
	const tsconfig = path.join(outDir, 'client/tsconfig.json');
	fs.writeFileSync(tsconfig, fs.readFileSync(tsconfig, 'utf8').replace('countries/_default/', `countries/${country}/`));

	fs.mkdirSync(path.join(outDir, '.github/workflows'), { recursive: true });
	fs.writeFileSync(path.join(outDir, '.github/workflows/ci.yml'), ciWorkflow());
	fs.writeFileSync(path.join(outDir, 'README.md'), readme(country));

	if (withGit) {
		const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
		const run = (...a) => execFileSync('git', a, { cwd: outDir, stdio: 'ignore' });
		run('init', '-q');
		run('add', '-A');
		run('-c', 'user.name=TnT export', '-c', 'user.email=export@localhost', 'commit', '-q', '-m', `Initial standalone export of TnT for ${country} from tnt@${sha}`);
	}
	console.log(`Exported ${country} (${files.length} files) to ${outDir}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
