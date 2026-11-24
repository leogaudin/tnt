import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

const NOTICE = 'Powered by TnT (Track-and-Trace)';
const URL = 'https://github.com/leogaudin/tnt';

describe('attribution notice required by LICENSE (AGPL section 7(b))', () => {
	it('LICENSE still requires exactly this notice and URL', () => {
		const license = read('LICENSE');
		expect(license).toContain(NOTICE);
		expect(license).toContain(URL);
	});

	it.each([
		['web footer', 'client/src/components/RouteWrapper.tsx'],
	])('%s shows the notice and links to the upstream repository', (_name, file) => {
		const src = read(file);
		expect(src).toContain(NOTICE);
		expect(src).toContain(URL);
	});
});

describe('attribution notice in the native Android scanner', () => {
	const strings = 'android/app/src/main/res/values/strings.xml';

	it('shows the notice and links to the upstream repository', () => {
		const src = read(strings);
		expect(src).toContain(NOTICE);
		expect(src).toContain(URL);
	});

	it('the scanner screen displays the notice and opens the link', () => {
		expect(read('android/app/src/main/res/layout/activity_main.xml')).toContain('@string/powered_by"');
		expect(read('android/app/src/main/kotlin/com/tnt/scanner/MainActivity.kt')).toContain('R.string.powered_by_url');
	});
});

describe('attribution notice in the native iOS scanner', () => {
	const strings = 'ios/TnT/UI/Strings.swift';

	it('shows the notice and links to the upstream repository', () => {
		const src = read(strings);
		expect(src).toContain(NOTICE);
		expect(src).toContain(URL);
	});

	it('the scanner screen displays the notice and opens the link', () => {
		const src = read('ios/TnT/UI/ScannerScreen.swift');
		expect(src).toContain('Strings.poweredBy');
		expect(src).toContain('Strings.poweredByURL');
	});
});

describe('declared package licenses match LICENSE', () => {
	it.each(['server', 'client'])('%s/package.json', (pkg) => {
		expect(JSON.parse(read(`${pkg}/package.json`)).license).toBe('AGPL-3.0-only');
	});

	it('server/package-lock.json root entry', () => {
		expect(JSON.parse(read('server/package-lock.json')).packages[''].license).toBe('AGPL-3.0-only');
	});

	it('LICENSE is the AGPL v3', () => {
		expect(read('LICENSE')).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
	});
});
