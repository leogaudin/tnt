export type Progress = 'noScans' | 'inProgress' | 'reachedGps' | 'received' | 'reachedAndReceived' | 'validated';

export interface Scan {
	id: string;
	time: number;
	finalDestination: boolean;
	markedAsReceived: boolean;
	comment?: string;
	[key: string]: any;
}

export interface StatusChange {
	scan: string;
	time: number;
}

export interface StatusChanges {
	inProgress: StatusChange | null;
	received: StatusChange | null;
	reachedGps: StatusChange | null;
	reachedAndReceived: StatusChange | null;
	validated: StatusChange | null;
}

export interface Box {
	id: string;
	scans: Scan[];
	statusChanges: StatusChanges | null;
	project: string;
	progress: Progress;
	content?: Record<string, number>;
}

const ORDERED_STATUSES = [
	'inProgress',
	'received',
	'reachedGps',
	'reachedAndReceived',
	'validated',
] as const satisfies readonly (keyof StatusChanges)[];

export function getLastScanWithConditions(
	scans: Scan[] | null | undefined,
	conditions: string[] = [],
): Scan | null {
	return (scans ?? []).reduce<Scan | null>((last, scan) => {
		const matchesAll = conditions.every((cond) => scan[cond]);
		if (matchesAll && scan.time > (last?.time ?? 0)) return scan;
		return last;
	}, null);
}

export function getProgress(box: Pick<Box, 'statusChanges'>, notAfterTimestamp = Date.now()): Progress {
	if (!box.statusChanges) return 'noScans';

	const sc = box.statusChanges!;
	return ORDERED_STATUSES.reduce<Progress>((lastStatus, status) => {
		const change = sc[status];
		if (change?.time && change.time <= notAfterTimestamp) return status;
		return lastStatus;
	}, 'noScans');
}

export function indexStatusChanges(sample: Box[]) {
	return sample.map((box) => {
		const scans = [...box.scans].sort((a, b) => a.time - b.time);

		const statusChanges: StatusChanges = {
			inProgress: null,
			received: null,
			reachedGps: null,
			reachedAndReceived: null,
			validated: null,
		};

		for (const scan of scans) {
			if (scan.finalDestination && scan.markedAsReceived && !statusChanges.validated) {
				statusChanges.validated = { scan: scan.id, time: scan.time };
			} else if (scan.finalDestination) {
				if (statusChanges.received && !statusChanges.reachedAndReceived) {
					statusChanges.reachedAndReceived = { scan: scan.id, time: scan.time };
				} else if (!statusChanges.reachedGps) {
					statusChanges.reachedGps = { scan: scan.id, time: scan.time };
				}
			} else if (scan.markedAsReceived) {
				if (statusChanges.reachedGps && !statusChanges.reachedAndReceived) {
					statusChanges.reachedAndReceived = { scan: scan.id, time: scan.time };
				} else if (!statusChanges.received) {
					statusChanges.received = { scan: scan.id, time: scan.time };
				}
			} else if (Object.values(statusChanges).every((s) => !s)) {
				statusChanges.inProgress = { scan: scan.id, time: scan.time };
			}
		}

		return {
			updateOne: {
				filter: { id: box.id },
				update: { $set: { statusChanges, progress: getProgress({ statusChanges }) } },
			},
		};
	});
}