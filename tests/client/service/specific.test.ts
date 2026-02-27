// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
	name,
	colors,
	API_URL,
	boxFields,
	gpsUpdateFields,
	excludedKeys,
} from '@client/service/specific.js';
import { boxFields as serverBoxFieldsRaw } from '@server/models/boxes.model.js';

const serverBoxFields: Record<string, { type: StringConstructor; required: boolean }> = serverBoxFieldsRaw;
import { colors as appColors, API_URL as appApiUrl } from '@app/service/specific.js';

// ── boxFields synchronization ──

describe('boxFields synchronization (client ↔ server)', () => {
	it('client and server boxFields have the same keys', () => {
		const clientKeys = Object.keys(boxFields).sort();
		const serverKeys = Object.keys(serverBoxFields).sort();
		expect(clientKeys).toEqual(serverKeys);
	});

	it('each field has matching required property', () => {
		for (const key of Object.keys(boxFields)) {
			expect(boxFields[key].required).toBe(
				serverBoxFields[key].required,
			);
		}
	});
});

// ── specific.js contract (client) ──

describe('client specific.js contract', () => {
	it('name is a non-empty string', () => {
		expect(name).toBeTypeOf('string');
		expect(name.length).toBeGreaterThan(0);
	});

	it('colors has all required keys', () => {
		for (const key of ['lightest', 'light', 'main', 'dark', 'darkest']) {
			expect(colors).toHaveProperty(key);
		}
	});

	it('all color values are valid hex strings', () => {
		for (const [, value] of Object.entries(colors)) {
			expect(value).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
		}
	});

	it('API_URL is a valid URL', () => {
		expect(API_URL).toMatch(/^https?:\/\//);
	});

	it('boxFields is a non-empty object with type and required on each field', () => {
		const entries = Object.entries(boxFields);
		expect(entries.length).toBeGreaterThan(0);
		for (const [key, field] of entries) {
			expect(field, `Field "${key}" missing type`).toHaveProperty('type');
			expect(field, `Field "${key}" missing required`).toHaveProperty('required');
		}
	});

	it('gpsUpdateFields is a non-empty array of strings', () => {
		expect(gpsUpdateFields).toBeInstanceOf(Array);
		expect(gpsUpdateFields.length).toBeGreaterThan(0);
		for (const field of gpsUpdateFields) {
			expect(field).toBeTypeOf('string');
		}
	});

	it('all gpsUpdateFields are keys in boxFields', () => {
		for (const field of gpsUpdateFields) {
			expect(boxFields, `gpsUpdateField "${field}" not found`).toHaveProperty(field);
		}
	});

	it('excludedKeys is a non-empty array of strings', () => {
		expect(excludedKeys).toBeInstanceOf(Array);
		expect(excludedKeys.length).toBeGreaterThan(0);
	});

});

// ── app specific.js contract ──

describe('app specific.js contract', () => {
	it('app colors has all required keys', () => {
		for (const key of ['lightest', 'light', 'main', 'dark', 'darkest']) {
			expect(appColors).toHaveProperty(key);
		}
	});

	it('app color values are valid hex strings', () => {
		for (const [, value] of Object.entries(appColors)) {
			expect(value).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
		}
	});

	it('app colors keys match client colors keys', () => {
		expect(Object.keys(appColors).sort()).toEqual(Object.keys(colors).sort());
	});

	it('app API_URL is a valid URL', () => {
		expect(appApiUrl).toMatch(/^https?:\/\//);
	});
});