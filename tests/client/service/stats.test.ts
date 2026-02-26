// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
	getLastScanWithConditions,
	getProgress,
	sampleToContent,
	computeInsights,
} from '@client/service/stats.js';

function makeScan(overrides: Record<string, any> = {}): any {
	return {
		id: 'scan-' + Math.random().toString(36).slice(2, 8),
		time: Date.now(),
		finalDestination: false,
		markedAsReceived: false,
		...overrides,
	};
}

function makeBox(overrides: Record<string, any> = {}): any {
	return {
		id: 'box-' + Math.random().toString(36).slice(2, 8),
		scans: [],
		statusChanges: null,
		progress: 'noScans',
		project: 'TestProject',
		...overrides,
	};
}

// ── getLastScanWithConditions ──

describe('getLastScanWithConditions', () => {
	it('returns null for empty scans', () => {
		expect(getLastScanWithConditions([], ['finalDestination'])).toBeNull();
	});

	it('returns null for null/undefined scans', () => {
		expect(getLastScanWithConditions(null, ['finalDestination'])).toBeNull();
		expect(getLastScanWithConditions(undefined, ['finalDestination'])).toBeNull();
	});

	it('returns null when no scan matches conditions', () => {
		expect(getLastScanWithConditions([makeScan(), makeScan()], ['finalDestination'])).toBeNull();
	});

	it('returns the latest scan matching single condition', () => {
		const early = makeScan({ finalDestination: true, time: 100 });
		const late = makeScan({ finalDestination: true, time: 200 });
		expect(getLastScanWithConditions([early, late], ['finalDestination'])).toBe(late);
	});

	it('returns the latest scan matching multiple conditions', () => {
		const s1 = makeScan({ finalDestination: true, time: 100 });
		const s2 = makeScan({ finalDestination: true, markedAsReceived: true, time: 200 });
		expect(getLastScanWithConditions([s1, s2], ['finalDestination', 'markedAsReceived'])).toBe(s2);
	});

	it('returns the scan when no conditions are specified', () => {
		const s1 = makeScan({ time: 100 });
		const s2 = makeScan({ time: 200 });
		expect(getLastScanWithConditions([s1, s2], [])).toBe(s2);
	});
});

// ── getProgress ──

describe('getProgress', () => {
	it('returns noScans when statusChanges is undefined', () => {
		expect(getProgress({})).toBe('noScans');
	});

	it('returns noScans when all statusChanges are null', () => {
		expect(getProgress({
			statusChanges: { inProgress: null, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
		})).toBe('noScans');
	});

	it('returns inProgress when only inProgress is set', () => {
		expect(getProgress({
			statusChanges: { inProgress: { scan: 's1', time: 100 }, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
		})).toBe('inProgress');
	});

	it('returns validated when all statuses are set', () => {
		expect(getProgress({
			statusChanges: {
				inProgress: { scan: 's1', time: 100 }, received: { scan: 's2', time: 200 },
				reachedGps: { scan: 's3', time: 300 }, reachedAndReceived: { scan: 's4', time: 400 },
				validated: { scan: 's5', time: 500 },
			},
		})).toBe('validated');
	});

	it('respects notAfterTimestamp', () => {
		const box = {
			statusChanges: {
				inProgress: { scan: 's1', time: 100 }, received: null,
				reachedGps: { scan: 's3', time: 300 }, reachedAndReceived: null,
				validated: { scan: 's5', time: 500 },
			},
		};
		expect(getProgress(box, 150)).toBe('inProgress');
		expect(getProgress(box, 350)).toBe('reachedGps');
		expect(getProgress(box, 600)).toBe('validated');
	});
});

// ── sampleToContent ──

describe('sampleToContent', () => {
	it('returns empty object for empty sample', () => {
		expect(sampleToContent([])).toEqual({});
	});

	it('aggregates content across boxes', () => {
		const boxes = [
			makeBox({ content: { books: 10, pens: 5 }, progress: 'validated', statusChanges: { validated: { scan: 's1', time: 100 } } }),
			makeBox({ content: { books: 20 }, progress: 'inProgress' }),
		];
		const result = sampleToContent(boxes);
		expect(result.books.total).toBe(30);
		expect(result.books.validated).toBe(10);
		expect(result.pens.total).toBe(5);
		expect(result.pens.validated).toBe(5);
	});

	it('handles boxes with no content', () => {
		const boxes = [makeBox({}), makeBox({})];
		expect(sampleToContent(boxes)).toEqual({});
	});

	it('counts validated items only for validated boxes', () => {
		const boxes = [
			makeBox({ content: { books: 10 }, progress: 'inProgress', statusChanges: { inProgress: { scan: 's1', time: 100 } } }),
			makeBox({ content: { books: 5 }, progress: 'validated', statusChanges: { validated: { scan: 's2', time: 200 } } }),
		];
		const result = sampleToContent(boxes);
		expect(result.books.total).toBe(15);
		expect(result.books.validated).toBe(5);
	});

	it('handles mixed content keys across boxes', () => {
		const boxes = [
			makeBox({ content: { books: 10 }, progress: 'noScans' }),
			makeBox({ content: { pens: 5 }, progress: 'noScans' }),
		];
		const result = sampleToContent(boxes);
		expect(result.books.total).toBe(10);
		expect(result.books.validated).toBe(0);
		expect(result.pens.total).toBe(5);
		expect(result.pens.validated).toBe(0);
	});

	it('treats boxes with null/undefined content as empty', () => {
		const boxes = [
			makeBox({ content: null }),
			makeBox({ content: undefined }),
			makeBox({ content: { books: 3 }, progress: 'noScans' }),
		];
		const result = sampleToContent(boxes);
		expect(result.books.total).toBe(3);
	});
});

// ── computeInsights ──

describe('computeInsights', () => {
	it('returns empty object for empty boxes', () => {
		const result = computeInsights([]);
		expect(result).toEqual({});
	});

	it('returns empty object for null boxes', () => {
		const result = computeInsights(null);
		expect(result).toEqual({});
	});

	it('groups insights by project by default', () => {
		const boxes = [
			makeBox({
				project: 'A',
				statusChanges: { inProgress: { scan: 's1', time: Date.now() - 86400000 }, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
			}),
			makeBox({
				project: 'B',
				statusChanges: { inProgress: { scan: 's2', time: Date.now() - 86400000 }, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
			}),
		];
		const insights = computeInsights(boxes);
		expect(insights).toHaveProperty('A');
		expect(insights).toHaveProperty('B');
		expect(insights.A).toHaveProperty('timeline');
		expect(insights.A).toHaveProperty('repartition');
		expect(insights.A).toHaveProperty('content');
	});

	it('returns ungrouped insights when grouped=false', () => {
		const boxes = [
			makeBox({
				project: 'A',
				statusChanges: { inProgress: { scan: 's1', time: Date.now() - 86400000 }, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
			}),
		];
		const insights = computeInsights(boxes, { grouped: false });
		expect(insights).toHaveProperty('timeline');
		expect(insights).toHaveProperty('repartition');
		expect(insights).toHaveProperty('content');
	});

	it('filters by project with only option', () => {
		const boxes = [
			makeBox({
				project: 'A',
				statusChanges: { inProgress: { scan: 's1', time: Date.now() - 86400000 }, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
			}),
			makeBox({
				project: 'B',
				statusChanges: { inProgress: { scan: 's2', time: Date.now() - 86400000 }, received: null, reachedGps: null, reachedAndReceived: null, validated: null },
			}),
		];
		const insights = computeInsights(boxes, { only: ['A'] });
		expect(insights).toHaveProperty('A');
		expect(insights).not.toHaveProperty('B');
	});
});