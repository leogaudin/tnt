// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { parseDistributionRow, parseGPSUpdateRow } from '@client/service/csv.js';
import { boxFields, gpsUpdateFields } from '@client/service/specific.js';

const distributionFields = [...Object.keys(boxFields), 'schoolLatitude', 'schoolLongitude'];
const gpsFields = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];

function makeDistributionRow(overrides: Record<string, string> = {}): string[] {
	const defaults: Record<string, string> = {};
	for (const field of distributionFields) {
		if (field === 'schoolLatitude') defaults[field] = '48.8566';
		else if (field === 'schoolLongitude') defaults[field] = '2.3522';
		else defaults[field] = `val_${field}`;
	}
	Object.assign(defaults, overrides);
	return distributionFields.map((f) => defaults[f]);
}

function makeGPSRow(overrides: Record<string, string> = {}): string[] {
	const defaults: Record<string, string> = {};
	for (const field of gpsFields) {
		if (field === 'schoolLatitude') defaults[field] = '48.8566';
		else if (field === 'schoolLongitude') defaults[field] = '2.3522';
		else defaults[field] = `val_${field}`;
	}
	Object.assign(defaults, overrides);
	return gpsFields.map((f) => defaults[f]);
}

// ── parseDistributionRow ──

describe('parseDistributionRow', () => {
	it('parses a valid row into a box object', () => {
		const row = makeDistributionRow();
		const result = parseDistributionRow(row, 'admin1') as any;
		expect(result.box).toBeDefined();
		expect(result.error).toBeUndefined();
		expect(result.box.adminId).toBe('admin1');
		expect(result.box.schoolLatitude).toBe(48.8566);
		expect(result.box.schoolLongitude).toBe(2.3522);
	});

	it('populates all boxFields keys', () => {
		const row = makeDistributionRow();
		const { box } = parseDistributionRow(row, 'admin1') as any;
		for (const field of Object.keys(boxFields)) {
			expect(box).toHaveProperty(field);
		}
	});

	it('returns error when a required field is missing', () => {
		// Find a required field
		const requiredField = Object.keys(boxFields).find((k) => (boxFields as any)[k].required);
		if (!requiredField) return; // no required fields, skip
		const row = makeDistributionRow({ [requiredField]: '' });
		const result = parseDistributionRow(row, 'admin1') as any;
		expect(result.error).toBeDefined();
		expect(result.error).toContain(requiredField);
	});

	it('returns error when schoolLatitude is empty', () => {
		const row = makeDistributionRow({ schoolLatitude: '' });
		const result = parseDistributionRow(row, 'admin1') as any;
		expect(result.error).toBeDefined();
		expect(result.error).toContain('schoolLatitude');
	});

	it('returns error when schoolLongitude is empty', () => {
		const row = makeDistributionRow({ schoolLongitude: '' });
		const result = parseDistributionRow(row, 'admin1') as any;
		expect(result.error).toBeDefined();
		expect(result.error).toContain('schoolLongitude');
	});

	it('returns error for invalid latitude', () => {
		const row = makeDistributionRow({ schoolLatitude: 'abc' });
		const result = parseDistributionRow(row, 'admin1') as any;
		expect(result.error).toBeDefined();
		expect(result.error).toContain('Latitude');
	});

	it('returns error for invalid longitude', () => {
		const row = makeDistributionRow({ schoolLongitude: 'xyz' });
		const result = parseDistributionRow(row, 'admin1') as any;
		expect(result.error).toBeDefined();
	});

	it('handles comma-separated decimals', () => {
		const row = makeDistributionRow({ schoolLatitude: '48,8566', schoolLongitude: '2,3522' });
		const { box } = parseDistributionRow(row, 'admin1') as any;
		expect(box.schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(box.schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('allows optional fields to be empty', () => {
		const optionalField = Object.keys(boxFields).find((k) => !(boxFields as any)[k].required);
		if (!optionalField) return;
		const row = makeDistributionRow({ [optionalField]: '' });
		const result = parseDistributionRow(row, 'admin1') as any;
		expect(result.box).toBeDefined();
	});
});

// ── parseGPSUpdateRow ──

describe('parseGPSUpdateRow', () => {
	it('parses a valid row into a box object', () => {
		const row = makeGPSRow();
		const result = parseGPSUpdateRow(row, false) as any;
		expect(result.box).toBeDefined();
		expect(result.error).toBeUndefined();
		expect(result.box.schoolLatitude).toBe(48.8566);
		expect(result.box.schoolLongitude).toBe(2.3522);
	});

	it('populates all gpsUpdateFields keys', () => {
		const row = makeGPSRow();
		const { box } = parseGPSUpdateRow(row, false) as any;
		for (const field of gpsUpdateFields) {
			expect(box).toHaveProperty(field);
		}
	});

	it('returns error when a field is missing', () => {
		const field = gpsFields[0];
		const row = makeGPSRow({ [field]: '' });
		const result = parseGPSUpdateRow(row, false) as any;
		expect(result.error).toBeDefined();
		expect(result.error).toContain(field);
	});

	it('returns error for invalid latitude', () => {
		const row = makeGPSRow({ schoolLatitude: 'abc' });
		const result = parseGPSUpdateRow(row, false) as any;
		expect(result.error).toBeDefined();
		expect(result.error).toContain('Latitude');
	});

	it('handles comma-separated decimals', () => {
		const row = makeGPSRow({ schoolLatitude: '48,8566', schoolLongitude: '2,3522' });
		const { box } = parseGPSUpdateRow(row, false) as any;
		expect(box.schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(box.schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('is more lenient with first row (header detection)', () => {
		// First row with text headers should still fail validation of lat/lng
		// but let's test the flag works — when isFirstRow=true and valid data, it passes
		const row = makeGPSRow();
		const result = parseGPSUpdateRow(row, true) as any;
		expect(result.box).toBeDefined();
	});
});