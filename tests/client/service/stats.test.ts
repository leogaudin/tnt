// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
	getLastScanWithConditions,
	getLastFinalScan,
	getLastMarkedAsReceivedScan,
	getLastValidatedScan,
	getProgress,
	getStatusPercentage,
	sampleToRepartition,
	sampleToTimeline,
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

describe('getLastFinalScan', () => {
	it('returns null when scans is empty', () => {
		expect(getLastFinalScan({ scans: [] })).toBeNull();
	});

	it('returns null when no scan has finalDestination', () => {
		expect(getLastFinalScan({ scans: [makeScan(), makeScan()] })).toBeNull();
	});

	it('returns the latest finalDestination scan', () => {
		const early = makeScan({ finalDestination: true, time: 100 });
		const late = makeScan({ finalDestination: true, time: 200 });
		expect(getLastFinalScan({ scans: [early, late] })).toBe(late);
	});
});

describe('getLastMarkedAsReceivedScan', () => {
	it('returns null when scans is empty', () => {
		expect(getLastMarkedAsReceivedScan({ scans: [] })).toBeNull();
	});

	it('returns the latest markedAsReceived scan', () => {
		const early = makeScan({ markedAsReceived: true, time: 100 });
		const late = makeScan({ markedAsReceived: true, time: 200 });
		expect(getLastMarkedAsReceivedScan({ scans: [early, late] })).toBe(late);
	});
});

describe('getLastValidatedScan', () => {
	it('returns null when no scan has both flags', () => {
		expect(getLastValidatedScan({
			scans: [makeScan({ finalDestination: true }), makeScan({ markedAsReceived: true })],
		})).toBeNull();
	});

	it('returns the latest scan with both flags', () => {
		const early = makeScan({ finalDestination: true, markedAsReceived: true, time: 100 });
		const late = makeScan({ finalDestination: true, markedAsReceived: true, time: 200 });
		expect(getLastValidatedScan({ scans: [early, late] })).toBe(late);
	});
});

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

describe('getStatusPercentage', () => {
	it('returns 0 when no boxes match status', () => {
		const sample = [makeBox({ progress: 'noScans' }), makeBox({ progress: 'inProgress' })];
		expect(getStatusPercentage(sample, 'validated')).toBe(0);
	});

	it('returns 100 when all boxes match status', () => {
		const sample = [makeBox({ progress: 'validated' }), makeBox({ progress: 'validated' })];
		expect(getStatusPercentage(sample, 'validated')).toBe(100);
	});

	it('returns correct percentage for mixed statuses', () => {
		const sample = [
			makeBox({ progress: 'validated' }), makeBox({ progress: 'noScans' }),
			makeBox({ progress: 'inProgress' }), makeBox({ progress: 'validated' }),
		];
		expect(getStatusPercentage(sample, 'validated')).toBe(50);
	});

	it('defaults to validated status', () => {
		const sample = [makeBox({ progress: 'validated' }), makeBox({ progress: 'noScans' })];
		expect(getStatusPercentage(sample)).toBe(50);
	});
});

describe('sampleToRepartition', () => {
	it('returns all zeros for empty sample', () => {
		const rep = sampleToRepartition([]);
		expect(rep.total).toBe(0);
		expect(rep.noScans).toBe(0);
		expect(rep.validated).toBe(0);
	});

	it('counts boxes by progress correctly', () => {
		const sample = [
			makeBox({ statusChanges: { inProgress: { scan: 's1', time: 100 }, received: null, reachedGps: null, reachedAndReceived: null, validated: null } }),
			makeBox({ statusChanges: { inProgress: { scan: 's1', time: 100 }, received: null, reachedGps: null, reachedAndReceived: null, validated: { scan: 's2', time: 200 } } }),
			makeBox({}),
		];
		const rep = sampleToRepartition(sample);
		expect(rep.total).toBe(3);
		expect(rep.inProgress).toBe(1);
		expect(rep.validated).toBe(1);
		expect(rep.noScans).toBe(1);
	});

	it('has all expected keys', () => {
		const rep = sampleToRepartition([]);
		for (const key of ['noScans', 'inProgress', 'reachedGps', 'received', 'reachedAndReceived', 'validated', 'total']) {
			expect(rep).toHaveProperty(key);
		}
	});
});

describe('sampleToTimeline', () => {
	it('returns an array of daily snapshots', () => {
		const sample = [
			makeBox({
				statusChanges: {
					inProgress: { scan: 's1', time: Date.now() - 86400000 * 3 },
					received: null, reachedGps: null, reachedAndReceived: null,
					validated: { scan: 's2', time: Date.now() - 86400000 },
				},
			}),
		];
		const timeline = sampleToTimeline(sample);
		expect(Array.isArray(timeline)).toBe(true);
		expect(timeline.length).toBeGreaterThan(0);
		expect(timeline[0]).toHaveProperty('name');
		expect(timeline[0]).toHaveProperty('total');
		expect(timeline[0]).toHaveProperty('noScans');
	});
});

describe('computeInsights', () => {
	it('sets empty object for empty boxes', () => {
		let insights: any = null;
		computeInsights([], (val: any) => { insights = val; });
		expect(insights).toEqual({});
	});

	it('sets empty object for null boxes', () => {
		let insights: any = null;
		computeInsights(null, (val: any) => { insights = val; });
		expect(insights).toEqual({});
	});

	it('groups insights by project', () => {
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
		let insights: any = null;
		computeInsights(boxes, (val: any) => { insights = val; });
		expect(insights).toHaveProperty('A');
		expect(insights).toHaveProperty('B');
		expect(insights.A).toHaveProperty('timeline');
		expect(insights.A).toHaveProperty('repartition');
	});
});