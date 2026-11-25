import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Every country is checked by the same rules, one `it` per rule per country,
// so a failure names the country and the rule.

// @ts-ignore: plain JS config file
import { applyCountryHtml } from '../../client/vite.config.js';

const root = path.resolve(__dirname, '../..');
const clientCfg = import.meta.glob('../../client/countries/*/config.ts', { eager: true, import: 'default' }) as Record<string, any>;
const serverCfg = import.meta.glob('../../server/countries/*/config.ts', { eager: true, import: 'default' }) as Record<string, any>;
const appCfg = import.meta.glob('../../mobile/countries/*/config.json', { eager: true, import: 'default' }) as Record<string, any>;
const localeFiles = import.meta.glob('../../client/countries/*/locales/*.json', { eager: true, import: 'default' }) as Record<string, any>;
const baseLocales = import.meta.glob('../../client/src/language/locales/*.json', { eager: true, import: 'default' }) as Record<string, Record<string, string>>;

const appTexts = import.meta.glob('../../mobile/strings/*.json', { eager: true, import: 'default' }) as Record<string, Record<string, string>>;
const appLanguages = Object.fromEntries(Object.entries(appTexts).map(([f, v]) => [path.basename(f, '.json'), v]));

const byCountry = (files: Record<string, any>) =>
	Object.fromEntries(Object.entries(files).map(([f, v]) => [f.split('/countries/')[1].split('/')[0], v]));
const client = byCountry(clientCfg);
const server = byCountry(serverCfg);
const app = byCountry(appCfg);

const dirs = (pkg: string) =>
	fs.readdirSync(path.join(root, pkg, 'countries'), { withFileTypes: true })
		.filter((d) => d.isDirectory()).map((d) => d.name).sort();

const countries = dirs('server');
// versionCode of the app each country had on the Play Store before the shared version scheme (versionCode = major*10000 + minor*100 + patch).
// The Play Store rejects a lower versionCode, so the shared one must stay above all of these.
const PUBLISHED_VERSION_CODES: Record<string, number> = { nigeria: 10000, rwanda: 10001 };

const keysWithRequired = (fields: Record<string, { required: boolean }>) =>
	Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k].required]));

const resolvedLanguage = (c: string, lng: string): Record<string, string> => {
	const fromCountry = Object.entries(localeFiles)
		.filter(([f]) => f.includes(`/countries/${c}/locales/${lng}.json`))
		.map(([, v]) => v)[0] ?? {};
	const base = baseLocales[`../../client/src/language/locales/${lng}.json`] ?? {};
	return { ...base, ...fromCountry, ...(client[c].labels[lng] ?? {}) };
};

describe('country folders', () => {
	it('client, server and mobile list the same countries', () => {
		expect(dirs('client')).toEqual(countries);
		expect(dirs('mobile')).toEqual(countries);
	});

	it('the server registry imports every country folder', async () => {
		const { countries: registry } = await import('@server/countries');
		expect(Object.keys(registry).sort()).toEqual(countries);
	});

	it('every package has a default.json naming an existing country', () => {
		for (const pkg of ['client', 'server', 'mobile']) {
			const { country } = JSON.parse(fs.readFileSync(path.join(root, pkg, 'countries/default.json'), 'utf8'));
			expect(countries, `${pkg}/countries/default.json`).toContain(country);
		}
	});
});

describe.each(countries)('country %s', (c) => {
	it('client and server boxFields have the same keys and required flags', () => {
		expect(keysWithRequired(server[c].boxFields)).toEqual(keysWithRequired(client[c].boxFields));
	});

	it('the order of boxFields is the client one (server uses the same order)', () => {
		expect(Object.keys(server[c].boxFields)).toEqual(Object.keys(client[c].boxFields));
	});

	it('client and app share the same colors and apiUrl', () => {
		expect(app[c].colors).toEqual(client[c].colors);
		expect(app[c].apiUrl).toBe(client[c].apiUrl);
	});

	it('server reportFields and gpsMatchFields are server boxFields', () => {
		for (const f of [...server[c].reportFields, ...server[c].gpsMatchFields]) {
			expect(server[c].boxFields, f).toHaveProperty(f);
		}
		expect(server[c].reportFields.length).toBeGreaterThan(0);
		expect(server[c].gpsMatchFields.length).toBeGreaterThan(0);
	});

	it('client gpsUpdateFields include the fields the server matches on', () => {
		for (const f of server[c].gpsMatchFields) expect(client[c].gpsUpdateFields, f).toContain(f);
	});

	it('client gpsUpdateFields and schoolView.fields are client boxFields', () => {
		for (const f of [...client[c].gpsUpdateFields, ...client[c].schoolView.fields]) {
			expect(client[c].boxFields, f).toHaveProperty(f);
		}
		expect(client[c].schoolView.fields.length).toBeGreaterThan(0);
	});

	it('defaultLanguage is offered, and every language has translations', () => {
		expect(client[c].languages).toContain(client[c].defaultLanguage);
		for (const lng of client[c].languages) {
			expect(Object.keys(resolvedLanguage(c, lng)).length, `language ${lng}`).toBeGreaterThan(0);
		}
	});

	it('every box field has a label in every language', () => {
		for (const lng of client[c].languages) {
			const strings = resolvedLanguage(c, lng);
			for (const f of Object.keys(client[c].boxFields)) {
				expect(strings, `${lng}: label for "${f}"`).toHaveProperty(f);
			}
		}
	});

	it('colors are hex values and apiUrl is an http(s) URL', () => {
		for (const key of ['lightest', 'light', 'main', 'dark', 'darkest']) {
			expect(client[c].colors[key], key).toMatch(/^#[0-9A-Fa-f]{6}$/);
		}
		expect(client[c].apiUrl).toMatch(/^https?:\/\/[^\s]+$/);
	});

	it('client public/ has every file index.html and the web manifest reference', () => {
		const pub = path.join(root, 'client/countries', c, 'public');
		const html = applyCountryHtml(fs.readFileSync(path.join(root, 'client/index.html'), 'utf8'), client[c]);
		const refs = [...html.matchAll(/href='\/([^']+)'/g)].map((m) => m[1]);
		const manifest = JSON.parse(fs.readFileSync(path.join(pub, 'site.webmanifest'), 'utf8'));
		refs.push(...manifest.icons.map((i: any) => i.src.replace(/^\//, '')));
		expect(refs.length).toBeGreaterThan(3);
		for (const r of refs) expect(fs.existsSync(path.join(pub, r)), `${c}/public/${r}`).toBe(true);
	});

	it('index.html fields exist', () => {
		expect(client[c].title.length).toBeGreaterThan(0);
		expect(client[c].shortName.length).toBeGreaterThan(0);
	});

	it('app has its launcher icons and a package-style applicationId', () => {
		for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
			const f = path.join(root, 'mobile/countries', c, 'android/res', `mipmap-${d}`, 'ic_launcher.png');
			// _default and countries without their own icons fall back to _default's
			if (!fs.existsSync(path.join(root, 'mobile/countries', c, 'android/res'))) continue;
			expect(fs.existsSync(f), f).toBe(true);
		}
		expect(app[c].applicationId).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/);
		expect(app[c].appName.length).toBeGreaterThan(0);
	});

	it('app is written in a language it has texts for, and overrides only texts that exist', () => {
		const language = app[c].language ?? 'en';
		expect(Object.keys(appLanguages), 'language').toContain(language);
		for (const key of Object.keys(app[c].strings ?? {})) expect(appLanguages.en, `override ${key}`).toHaveProperty(key);
		// A country's dashboard and app speak the same language.
		expect(client[c].languages, 'dashboard languages').toContain(language);
		if (language !== 'en') expect(client[c].defaultLanguage).toBe(language);
	});
});

describe('mobile texts', () => {
	it('every language has exactly the keys of English, filled in', () => {
		for (const [language, texts] of Object.entries(appLanguages)) {
			expect(Object.keys(texts).sort(), language).toEqual(Object.keys(appLanguages.en).sort());
			for (const [key, text] of Object.entries(texts)) expect(text.trim(), `${language}.${key}`).not.toBe('');
		}
	});

	it('the box title keeps its {id} in every language', () => {
		for (const texts of Object.values(appLanguages)) expect(texts.boxTitle).toContain('{id}');
	});
});

describe('app identity', () => {
	const ids = Object.values(app).map((a: any) => a.applicationId);

	it('applicationId is unique across countries', () => {
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('the shared versionCode is above every published one', () => {
		const version = JSON.parse(fs.readFileSync(path.join(root, 'android/version.json'), 'utf8')).version;
		const [major, minor, patch] = version.split('.').map(Number);
		const code = major * 10000 + minor * 100 + patch;
		expect(code).toBeGreaterThan(Math.max(...Object.values(PUBLISHED_VERSION_CODES)));
	});
});
