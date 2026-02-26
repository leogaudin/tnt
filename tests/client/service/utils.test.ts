// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
	haversineDistance,
	groupByProperty,
	getLatLngCenter,
	getZoomLevel,
} from '@client/service/utils.js';

describe('haversineDistance', () => {
	it('returns 0 for identical points', () => {
		const c = { latitude: 48.8566, longitude: 2.3522 };
		expect(haversineDistance(c, c)).toBe(0);
	});

	it('returns known distance Paris→London ≈ 334 km', () => {
		const paris = { latitude: 48.8566, longitude: 2.3522 };
		const london = { latitude: 51.5074, longitude: -0.1278 };
		const d = haversineDistance(paris, london) / 1000;
		expect(d).toBeGreaterThan(330);
		expect(d).toBeLessThan(345);
	});

	it('is symmetric', () => {
		const paris = { latitude: 48.8566, longitude: 2.3522 };
		const london = { latitude: 51.5074, longitude: -0.1278 };
		const ab = haversineDistance(paris, london);
		const ba = haversineDistance(london, paris);
		expect(ab).toBeCloseTo(ba, 5);
	});

	it('handles antipodal points', () => {
		const a = { latitude: 0, longitude: 0 };
		const b = { latitude: 0, longitude: 180 };
		const d = haversineDistance(a, b) / 1000;
		expect(d).toBeGreaterThan(20000);
	});

	it('handles equator distance', () => {
		const a = { latitude: 0, longitude: 0 };
		const b = { latitude: 0, longitude: 1 };
		const d = haversineDistance(a, b) / 1000;
		expect(d).toBeGreaterThan(110);
		expect(d).toBeLessThan(112);
	});
});

describe('groupByProperty', () => {
	it('groups objects by a given property', () => {
		const items = [
			{ type: 'a', val: 1 },
			{ type: 'b', val: 2 },
			{ type: 'a', val: 3 },
		];
		const grouped = groupByProperty(items, 'type');
		expect(Object.keys(grouped)).toEqual(expect.arrayContaining(['a', 'b']));
		expect(grouped.a).toHaveLength(2);
		expect(grouped.b).toHaveLength(1);
	});

	it('returns empty object for empty array', () => {
		expect(groupByProperty([], 'type')).toEqual({});
	});
});

describe('getLatLngCenter', () => {
	it('returns the single point when only one coordinate', () => {
		const center = getLatLngCenter([[48.8566, 2.3522]]);
		expect(center[0]).toBeCloseTo(48.8566, 2);
		expect(center[1]).toBeCloseTo(2.3522, 2);
	});

	it('returns midpoint for two symmetric points', () => {
		const center = getLatLngCenter([[10, 0], [-10, 0]]);
		expect(center[0]).toBeCloseTo(0, 1);
	});

	it('returns an array with two elements', () => {
		const center = getLatLngCenter([[48.8566, 2.3522], [51.5074, -0.1278]]);
		expect(Array.isArray(center)).toBe(true);
		expect(center).toHaveLength(2);
	});
});

describe('getZoomLevel', () => {
	it('returns a number', () => {
		const zoom = getZoomLevel([[48.8566, 2.3522], [51.5074, -0.1278]]);
		expect(typeof zoom).toBe('number');
	});

	it('returns higher zoom for closer points', () => {
		const close = getZoomLevel([[48.8566, 2.3522], [48.8570, 2.3530]]);
		const far = getZoomLevel([[48.8566, 2.3522], [51.5074, -0.1278]]);
		expect(close).toBeGreaterThan(far);
	});

	it('returns max zoom for identical points', () => {
		const zoom = getZoomLevel([[48.8566, 2.3522], [48.8566, 2.3522]]);
		expect(zoom).toBeGreaterThanOrEqual(10);
	});
});