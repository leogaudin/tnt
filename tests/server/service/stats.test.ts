import { describe, it, expect } from 'vitest';
import {
	getLastScanWithConditions,
	getProgress,
	indexStatusChanges,
} from '@server/service/stats.js';

function makeScan(overrides: Record<string, any> = {}): any {
	return {
		id: 'scan-' + Math.random().toString(36).slice(2, 8),
		time: Date.now(),
		finalDestination: false,
		markedAsReceived: false,
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

	it('returns the latest scan matching single condition (finalDestination)', () => {
		const early = makeScan({ finalDestination: true, time: 100 });
		const late = makeScan({ finalDestination: true, time: 200 });
		expect(getLastScanWithConditions([early, late], ['finalDestination'])).toBe(late);
		expect(getLastScanWithConditions([late, early], ['finalDestination'])).toBe(late);
	});

	it('returns the latest scan matching single condition (markedAsReceived)', () => {
		const early = makeScan({ markedAsReceived: true, time: 100 });
		const late = makeScan({ markedAsReceived: true, time: 200 });
		expect(getLastScanWithConditions([early, late], ['markedAsReceived'])).toBe(late);
	});

	it('returns null when no scan has markedAsReceived', () => {
		expect(getLastScanWithConditions([makeScan(), makeScan()], ['markedAsReceived'])).toBeNull();
	});

	it('returns the latest scan matching multiple conditions', () => {
		const s1 = makeScan({ finalDestination: true, time: 100 });
		const s2 = makeScan({ finalDestination: true, markedAsReceived: true, time: 200 });
		expect(getLastScanWithConditions([s1, s2], ['finalDestination', 'markedAsReceived'])).toBe(s2);
	});

	it('returns null when no scan has both finalDestination and markedAsReceived', () => {
		const scans = [makeScan({ finalDestination: true }), makeScan({ markedAsReceived: true })];
		expect(getLastScanWithConditions(scans, ['finalDestination', 'markedAsReceived'])).toBeNull();
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

	it('returns noScans when statusChanges is empty', () => {
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

	it('returns reachedGps when only GPS-reached is set', () => {
		expect(getProgress({
			statusChanges: { inProgress: { scan: 's1', time: 100 }, received: null, reachedGps: { scan: 's2', time: 200 }, reachedAndReceived: null, validated: null },
		})).toBe('reachedGps');
	});

	it('returns received when only received is set', () => {
		expect(getProgress({
			statusChanges: { inProgress: { scan: 's1', time: 100 }, received: { scan: 's2', time: 200 }, reachedGps: null, reachedAndReceived: null, validated: null },
		})).toBe('received');
	});

	it('returns reachedAndReceived when both GPS + received are set', () => {
		expect(getProgress({
			statusChanges: {
				inProgress: { scan: 's1', time: 100 }, received: { scan: 's2', time: 200 },
				reachedGps: { scan: 's3', time: 300 }, reachedAndReceived: { scan: 's4', time: 400 }, validated: null,
			},
		})).toBe('reachedAndReceived');
	});
});

// ── indexStatusChanges ──

describe('indexStatusChanges', () => {
	it('returns empty statusChanges for a box with no scans', () => {
		const ops = indexStatusChanges([{ id: 'box1', scans: [] }]) as any[];
		const update = ops[0].updateOne.update.$set;
		expect(update.statusChanges.inProgress).toBeNull();
		expect(update.statusChanges.validated).toBeNull();
		expect(update.progress).toBe('noScans');
	});

	it('sets inProgress on the first non-final, non-received scan', () => {
		const scan = makeScan({ time: 100, finalDestination: false, markedAsReceived: false });
		const ops = indexStatusChanges([{ id: 'box1', scans: [scan] }]) as any[];
		expect(ops[0].updateOne.update.$set.statusChanges.inProgress).toEqual({ scan: scan.id, time: 100 });
	});

	it('sets reachedGps when a scan has finalDestination', () => {
		const s1 = makeScan({ time: 100 });
		const s2 = makeScan({ time: 200, finalDestination: true });
		const ops = indexStatusChanges([{ id: 'box1', scans: [s1, s2] }]) as any[];
		expect(ops[0].updateOne.update.$set.statusChanges.reachedGps).toEqual({ scan: s2.id, time: 200 });
	});

	it('sets received when a scan has markedAsReceived', () => {
		const s1 = makeScan({ time: 100 });
		const s2 = makeScan({ time: 200, markedAsReceived: true });
		const ops = indexStatusChanges([{ id: 'box1', scans: [s1, s2] }]) as any[];
		expect(ops[0].updateOne.update.$set.statusChanges.received).toEqual({ scan: s2.id, time: 200 });
	});

	it('sets reachedAndReceived when GPS comes after received', () => {
		const s1 = makeScan({ time: 100 });
		const s2 = makeScan({ time: 200, markedAsReceived: true });
		const s3 = makeScan({ time: 300, finalDestination: true });
		const ops = indexStatusChanges([{ id: 'box1', scans: [s1, s2, s3] }]) as any[];
		const sc = ops[0].updateOne.update.$set.statusChanges;
		expect(sc.received).toEqual({ scan: s2.id, time: 200 });
		expect(sc.reachedAndReceived).toEqual({ scan: s3.id, time: 300 });
	});

	it('sets validated when a scan has both flags', () => {
		const s1 = makeScan({ time: 100 });
		const s2 = makeScan({ time: 200, finalDestination: true, markedAsReceived: true });
		const ops = indexStatusChanges([{ id: 'box1', scans: [s1, s2] }]) as any[];
		expect(ops[0].updateOne.update.$set.statusChanges.validated).toEqual({ scan: s2.id, time: 200 });
		expect(ops[0].updateOne.update.$set.progress).toBe('validated');
	});

	it('sorts scans by time before processing', () => {
		const s1 = makeScan({ time: 300, finalDestination: true, markedAsReceived: true });
		const s2 = makeScan({ time: 100 });
		const ops = indexStatusChanges([{ id: 'box1', scans: [s1, s2] }]) as any[];
		const sc = ops[0].updateOne.update.$set.statusChanges;
		expect(sc.inProgress).toEqual({ scan: s2.id, time: 100 });
		expect(sc.validated).toEqual({ scan: s1.id, time: 300 });
	});

	it('returns correct bulkWrite operations format', () => {
		const ops = indexStatusChanges([{ id: 'box1', scans: [makeScan({ time: 100 })] }]) as any[];
		expect(ops).toHaveLength(1);
		expect(ops[0].updateOne).toBeDefined();
		expect(ops[0].updateOne.filter).toEqual({ id: 'box1' });
	});
});