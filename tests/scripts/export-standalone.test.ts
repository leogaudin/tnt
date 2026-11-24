import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore: plain JS script
import { isIncluded, rewriteServerRegistry } from '../../scripts/export-standalone.mjs';

const root = path.resolve(__dirname, '../..');
const script = path.join(root, 'scripts/export-standalone.mjs');

describe('isIncluded', () => {
	it('keeps only the chosen country in every package', () => {
		expect(isIncluded('client/countries/liberia/config.ts', 'liberia')).toBe(true);
		expect(isIncluded('client/countries/senegal/config.ts', 'liberia')).toBe(false);
		expect(isIncluded('server/countries/_default/config.ts', 'liberia')).toBe(false);
		expect(isIncluded('mobile/countries/rwanda/config.json', 'liberia')).toBe(false);
		expect(isIncluded('tests/countries/malawi/anything.ts', 'liberia')).toBe(false);
	});

	it('keeps shared files and drops central CI', () => {
		expect(isIncluded('client/countries/index.ts', 'liberia')).toBe(true);
		expect(isIncluded('client/countries/default.json', 'liberia')).toBe(true);
		expect(isIncluded('server/index.ts', 'liberia')).toBe(true);
		expect(isIncluded('LICENSE', 'liberia')).toBe(true);
		expect(isIncluded('.github/workflows/ci.yml', 'liberia')).toBe(false);
		expect(isIncluded('tests/scripts/export-standalone.test.ts', 'liberia')).toBe(false);
	});
});

describe('rewriteServerRegistry', () => {
	const src = fs.readFileSync(path.join(root, 'server/countries/index.ts'), 'utf8');

	it('imports and registers only the chosen country', () => {
		const out = rewriteServerRegistry(src, 'liberia');
		expect(out).toContain("import liberia from './liberia/config';");
		expect(out).not.toContain('senegal');
		expect(out).not.toContain('_default/config');
		expect(out).toMatch(/countries: Record<string, ServerCountryConfig> = \{\n\tliberia,\n\};/);
	});

	it('handles hyphenated country names', () => {
		const out = rewriteServerRegistry(src, 'guine-bissau');
		expect(out).toContain("import guineBissau from './guine-bissau/config';");
		expect(out).toContain("'guine-bissau': guineBissau,");
	});
});

describe('export-standalone run', () => {
	let out: string;
	beforeAll(() => {
		out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tnt-export-')), 'x');
		execFileSync('node', [script, 'senegal', out], { cwd: root, stdio: 'pipe' });
	});
	afterAll(() => fs.rmSync(path.dirname(out), { recursive: true, force: true }));

	it('has only senegal, and each default.json names it', () => {
		for (const pkg of ['client', 'server', 'mobile']) {
			const dirs = fs.readdirSync(path.join(out, pkg, 'countries'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
			expect(dirs).toEqual(['senegal']);
			expect(JSON.parse(fs.readFileSync(path.join(out, pkg, 'countries/default.json'), 'utf8'))).toEqual({ country: 'senegal' });
		}
	});

	it('has no env files, node_modules or central CI; has a README and a single-country CI', () => {
		const all = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? all(path.join(dir, d.name)).map((f) => `${d.name}/${f}`) : [d.name]));
		const files = all(out);
		expect(files.filter((f) => /(^|\/)\.env/.test(f) || f.includes('node_modules'))).toEqual([]);
		expect(files).toContain('README.md');
		expect(fs.readFileSync(path.join(out, '.github/workflows/ci.yml'), 'utf8')).not.toContain('setup-matrix');
		expect(fs.readFileSync(path.join(out, 'client/tsconfig.json'), 'utf8')).toContain('countries/senegal/*');
	});

	it('refuses a non-empty output folder and an unknown country', () => {
		expect(() => execFileSync('node', [script, 'senegal', out], { cwd: root, stdio: 'pipe' })).toThrow();
		expect(() => execFileSync('node', [script, 'atlantis', path.join(out, 'y')], { cwd: root, stdio: 'pipe' })).toThrow();
	});
});
