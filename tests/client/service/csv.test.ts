// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
	type ParseResult,
	type ParseSuccess,
	type ParseError,
	parseDistributionRow,
	parseGPSUpdateRow,
} from '@client/service/csv.js';
import { boxFields, gpsUpdateFields } from '@client/service/specific.js';

const distributionFields = [...Object.keys(boxFields), 'schoolLatitude', 'schoolLongitude'];
const gpsFields: string[] = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];

/** Narrow a ParseResult to ParseSuccess, failing the test if it's an error. */
function expectSuccess(result: ParseResult): ParseSuccess {
	expect('box' in result).toBe(true);
	return result as ParseSuccess;
}

/** Narrow a ParseResult to ParseError, failing the test if it's a success. */
function expectError(result: ParseResult): ParseError {
	expect('error' in result).toBe(true);
	return result as ParseError;
}

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
		const { box } = expectSuccess(parseDistributionRow(row, 'admin1'));
		expect(box.adminId).toBe('admin1');
		expect(box.schoolLatitude).toBe(48.8566);
		expect(box.schoolLongitude).toBe(2.3522);
	});

	it('populates all boxFields keys', () => {
		const row = makeDistributionRow();
		const { box } = expectSuccess(parseDistributionRow(row, 'admin1'));
		for (const field of Object.keys(boxFields)) {
			expect(box).toHaveProperty(field);
		}
	});

	it('returns error when a required field is missing', () => {
		const requiredField = Object.keys(boxFields).find((k) => boxFields[k].required);
		if (!requiredField) return;
		const row = makeDistributionRow({ [requiredField]: '' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain(requiredField);
	});

	it('returns error when schoolLatitude is empty', () => {
		const row = makeDistributionRow({ schoolLatitude: '' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain('schoolLatitude');
	});

	it('returns error when schoolLongitude is empty', () => {
		const row = makeDistributionRow({ schoolLongitude: '' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain('schoolLongitude');
	});

	it('returns error for invalid latitude', () => {
		const row = makeDistributionRow({ schoolLatitude: 'abc' });
		const { error } = expectError(parseDistributionRow(row, 'admin1'));
		expect(error).toContain('Latitude');
	});

	it('returns error for invalid longitude', () => {
		const row = makeDistributionRow({ schoolLongitude: 'xyz' });
		expectError(parseDistributionRow(row, 'admin1'));
	});

	it('handles comma-separated decimals', () => {
		const row = makeDistributionRow({ schoolLatitude: '48,8566', schoolLongitude: '2,3522' });
		const { box } = expectSuccess(parseDistributionRow(row, 'admin1'));
		expect(box.schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(box.schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('allows optional fields to be empty', () => {
		const optionalField = Object.keys(boxFields).find((k) => !boxFields[k].required);
		if (!optionalField) return;
		const row = makeDistributionRow({ [optionalField]: '' });
		expectSuccess(parseDistributionRow(row, 'admin1'));
	});
});

// ── parseGPSUpdateRow ──

describe('parseGPSUpdateRow', () => {
	it('parses a valid row into a box object', () => {
		const row = makeGPSRow();
		const { box } = expectSuccess(parseGPSUpdateRow(row, false));
		expect(box.schoolLatitude).toBe(48.8566);
		expect(box.schoolLongitude).toBe(2.3522);
	});

	it('populates all gpsUpdateFields keys', () => {
		const row = makeGPSRow();
		const { box } = expectSuccess(parseGPSUpdateRow(row, false));
		for (const field of gpsUpdateFields) {
			expect(box).toHaveProperty(field);
		}
	});

	it('returns error when a field is missing', () => {
		const field = gpsFields[0];
		const row = makeGPSRow({ [field]: '' });
		const { error } = expectError(parseGPSUpdateRow(row, false));
		expect(error).toContain(field);
	});

	it('returns error for invalid latitude', () => {
		const row = makeGPSRow({ schoolLatitude: 'abc' });
		const { error } = expectError(parseGPSUpdateRow(row, false));
		expect(error).toContain('Latitude');
	});

	it('handles comma-separated decimals', () => {
		const row = makeGPSRow({ schoolLatitude: '48,8566', schoolLongitude: '2,3522' });
		const { box } = expectSuccess(parseGPSUpdateRow(row, false));
		expect(box.schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(box.schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('is more lenient with first row (header detection)', () => {
		const row = makeGPSRow();
		expectSuccess(parseGPSUpdateRow(row, true));
	});
});

// ── E2E-like: inline CSV → Papa Parse → parse functions ──

describe('E2E: distribution list CSV', () => {
	const CSV_VALID = [
		'project,division,district,zone,school,htName,htPhone,schoolCode,schoolLatitude,schoolLongitude',
		'Alpha,North,D1,Z1,Springfield Elementary,Seymour Skinner,+1555123,SPR001,48.8566,2.3522',
		'Alpha,South,D2,Z2,Shelbyville School,Mr Burns,+1555999,SHE002,40.7128,-74.0060',
	].join('\n');

	it('parses all rows successfully', () => {
		const boxes: Record<string, unknown>[] = [];
		const errors: string[] = [];

		Papa.parse<Record<string, string>>(CSV_VALID, {
			skipEmptyLines: true,
			header: true,
			step: (element) => {
				const values: string[] = Object.values(element.data);
				const result = parseDistributionRow(values, 'admin1');
				if ('error' in result) errors.push(result.error);
				else boxes.push(result.box);
			},
		});

		expect(errors).toHaveLength(0);
		expect(boxes).toHaveLength(2);
		expect(boxes[0].project).toBe('Alpha');
		expect(boxes[0].school).toBe('Springfield Elementary');
		expect(boxes[0].schoolLatitude).toBe(48.8566);
		expect(boxes[0].adminId).toBe('admin1');
		expect(boxes[1].schoolLongitude).toBe(-74.006);
	});

	it('handles extra content columns', () => {
		const csv = [
			'project,division,district,zone,school,htName,htPhone,schoolCode,schoolLatitude,schoolLongitude,books,pens',
			'Alpha,North,D1,Z1,School A,Teacher,+1555000,SC001,48.8566,2.3522,100,50',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];
		const fields = [...Object.keys(boxFields), 'schoolLatitude', 'schoolLongitude'];

		Papa.parse<Record<string, string>>(csv, {
			skipEmptyLines: true,
			header: true,
			step: (element) => {
				const values: string[] = Object.values(element.data);
				const result = parseDistributionRow(values, 'admin1');
				if ('box' in result) {
					const contentFields = element.meta.fields!.slice(fields.length);
					if (contentFields.length) {
						result.box.content = {} as Record<string, number>;
						contentFields.forEach((field: string, index: number) => {
							result.box.content[field] = parseInt(values[index + fields.length]);
						});
					}
					boxes.push(result.box);
				}
			},
		});

		expect(boxes).toHaveLength(1);
		expect(boxes[0].content).toBeDefined();
		expect((boxes[0].content as Record<string, number>).books).toBe(100);
		expect((boxes[0].content as Record<string, number>).pens).toBe(50);
	});

	it('reports errors for rows with missing required fields', () => {
		const csv = [
			'project,division,district,zone,school,htName,htPhone,schoolCode,schoolLatitude,schoolLongitude',
			',North,D1,Z1,School A,Teacher,+1555000,SC001,48.8566,2.3522',
		].join('\n');

		const errors: string[] = [];
		Papa.parse<Record<string, string>>(csv, {
			skipEmptyLines: true,
			header: true,
			step: (element) => {
				const values: string[] = Object.values(element.data);
				const result = parseDistributionRow(values, 'admin1');
				if ('error' in result) errors.push(result.error);
			},
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('project');
	});

	it('reports errors for invalid coordinates', () => {
		const csv = [
			'project,division,district,zone,school,htName,htPhone,schoolCode,schoolLatitude,schoolLongitude',
			'Alpha,North,D1,Z1,School A,Teacher,+1555000,SC001,not_a_number,2.3522',
		].join('\n');

		const errors: string[] = [];
		Papa.parse<Record<string, string>>(csv, {
			skipEmptyLines: true,
			header: true,
			step: (element) => {
				const values: string[] = Object.values(element.data);
				const result = parseDistributionRow(values, 'admin1');
				if ('error' in result) errors.push(result.error);
			},
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('Latitude');
	});

	it('handles comma-separated decimals in CSV', () => {
		const csv = [
			'project;division;district;zone;school;htName;htPhone;schoolCode;schoolLatitude;schoolLongitude',
			'Alpha;North;D1;Z1;School A;Teacher;+1555000;SC001;48,8566;2,3522',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];
		Papa.parse<Record<string, string>>(csv, {
			skipEmptyLines: true,
			header: true,
			delimiter: ';',
			step: (element) => {
				const values: string[] = Object.values(element.data);
				const result = parseDistributionRow(values, 'admin1');
				if ('box' in result) boxes.push(result.box);
			},
		});

		expect(boxes).toHaveLength(1);
		expect(boxes[0].schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(boxes[0].schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('allows optional fields to be empty in CSV', () => {
		const csv = [
			'project,division,district,zone,school,htName,htPhone,schoolCode,schoolLatitude,schoolLongitude',
			'Alpha,,D1,,School A,,,SC001,48.8566,2.3522',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];
		Papa.parse<Record<string, string>>(csv, {
			skipEmptyLines: true,
			header: true,
			step: (element) => {
				const values: string[] = Object.values(element.data);
				const result = parseDistributionRow(values, 'admin1');
				if ('box' in result) boxes.push(result.box);
			},
		});

		expect(boxes).toHaveLength(1);
		expect(boxes[0].project).toBe('Alpha');
		expect(boxes[0].division).toBe('');
	});
});

describe('E2E: GPS coordinates CSV', () => {
	it('parses a valid GPS CSV', () => {
		const csv = [
			'SC001,48.8566,2.3522',
			'SC002,40.7128,-74.0060',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];
		const errors: string[] = [];
		let rowIdx = 0;

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, rowIdx === 0);
				if ('error' in result) errors.push(result.error);
				else boxes.push(result.box);
				rowIdx++;
			},
		});

		expect(errors).toHaveLength(0);
		expect(boxes).toHaveLength(2);
		expect(boxes[0].schoolCode).toBe('SC001');
		expect(boxes[0].schoolLatitude).toBe(48.8566);
		expect(boxes[1].schoolLongitude).toBe(-74.006);
	});

	it('skips header row gracefully', () => {
		const csv = [
			'schoolCode,schoolLatitude,schoolLongitude',
			'SC001,48.8566,2.3522',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];
		let rowIdx = 0;

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, rowIdx === 0);
				if ('box' in result) boxes.push(result.box);
				rowIdx++;
			},
		});

		expect(boxes).toHaveLength(1);
		expect(boxes[0].schoolCode).toBe('SC001');
	});

	it('reports errors for missing fields', () => {
		const csv = [
			',48.8566,2.3522',
		].join('\n');

		const errors: string[] = [];
		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, false);
				if ('error' in result) errors.push(result.error);
			},
		});

		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('schoolCode');
	});

	it('handles semicolon-delimited GPS CSV with comma decimals', () => {
		const csv = 'SC001;48,8566;2,3522';
		const boxes: Record<string, unknown>[] = [];

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			delimiter: ';',
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, false);
				if ('box' in result) boxes.push(result.box);
			},
		});

		expect(boxes).toHaveLength(1);
		expect(boxes[0].schoolLatitude).toBeCloseTo(48.8566, 3);
		expect(boxes[0].schoolLongitude).toBeCloseTo(2.3522, 3);
	});

	it('processes multi-row CSV with mixed valid/invalid rows', () => {
		const csv = [
			'SC001,48.8566,2.3522',
			'SC002,invalid,2.3522',
			'SC003,40.7128,-74.0060',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];
		const errors: string[] = [];

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, false);
				if ('error' in result) errors.push(result.error);
				else boxes.push(result.box);
			},
		});

		expect(boxes).toHaveLength(2);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain('Latitude');
		expect(boxes[0].schoolCode).toBe('SC001');
		expect(boxes[1].schoolCode).toBe('SC003');
	});
});