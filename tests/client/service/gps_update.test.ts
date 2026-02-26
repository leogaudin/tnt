// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { type ParseResult, parseGPSUpdateRow } from '@client/service/csv.js';
import { gpsUpdateFields } from '@client/service/specific.js';

/**
 * These tests verify the contract between the client's CSV GPS update
 * parsing and the server's /coords endpoint expectations.
 *
 * The server's /coords endpoint (boxes.ctrl.ts) builds MongoDB filters as:
 *   { schoolCode: box.schoolCode, adminId: admin.id }
 *
 * The client's GPS CSV parsing produces objects with fields from
 * gpsUpdateFields + schoolLatitude + schoolLongitude.
 */

const GPS_FIELDS = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];

/** Type-safe check that a string is in the readonly gpsUpdateFields tuple. */
function isGpsUpdateField(field: string): boolean {
	return (gpsUpdateFields as readonly string[]).includes(field);
}

describe('GPS update CSV → server /coords contract', () => {
	it('gpsUpdateFields contains the field the server uses to match boxes', () => {
		const serverMatchFields = ['schoolCode'];
		const missingFields = serverMatchFields.filter((f) => !isGpsUpdateField(f));
		expect(missingFields).toHaveLength(0);
	});

	it('parsed GPS row contains schoolCode used by server for matching', () => {
		const row = ['SC001', '48.8566', '2.3522'];
		const result: ParseResult = parseGPSUpdateRow(row, false);
		expect('box' in result).toBe(true);
		if ('box' in result) {
			expect(result.box.schoolCode).toBe('SC001');
			expect(result.box.schoolLatitude).toBe(48.8566);
			expect(result.box.schoolLongitude).toBe(2.3522);
		}
	});

	it('simulates full CSV parse → payload shape for /coords', () => {
		const csv = [
			'SC001,48.8566,2.3522',
			'SC002,40.7128,-74.0060',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, false);
				if ('box' in result) boxes.push(result.box);
			},
		});

		expect(boxes).toHaveLength(2);

		for (const box of boxes) {
			expect(box).toHaveProperty('schoolCode');
			expect(box).toHaveProperty('schoolLatitude');
			expect(box).toHaveProperty('schoolLongitude');
		}

		expect(boxes[0].schoolCode).toBe('SC001');
		expect(boxes[1].schoolCode).toBe('SC002');
	});

	it('GPS CSV field list matches expected format', () => {
		expect(GPS_FIELDS).toEqual(['schoolCode', 'schoolLatitude', 'schoolLongitude']);
	});

	it('each parsed row has a non-empty schoolCode for server matching', () => {
		const csv = [
			'SC001,48.8566,2.3522',
			'SC002,40.7128,-74.0060',
		].join('\n');

		const boxes: Record<string, unknown>[] = [];

		Papa.parse<string[]>(csv, {
			skipEmptyLines: true,
			step: (element) => {
				const result = parseGPSUpdateRow(element.data, false);
				if ('box' in result) boxes.push(result.box);
			},
		});

		for (const box of boxes) {
			expect(box.schoolCode).toBeTruthy();
			expect(typeof box.schoolCode).toBe('string');
		}
	});
});