export type Progress = 'noScans' | 'inProgress' | 'reachedGps' | 'received' | 'reachedAndReceived' | 'validated';

export interface Scan {
	time: number;
	finalDestination: boolean;
	markedAsReceived: boolean;
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
	scans: Scan[];
	statusChanges: StatusChanges | null;
	project: string;
	progress: Progress;
	content?: Record<string, number> | null;
}

interface Repartition extends Record<Progress, number> {
	total: number;
}

interface ContentItem {
	validated: number;
	total: number;
}

interface Insights {
	timeline: Array<{ name: string } & Repartition>;
	repartition: Repartition;
	content: Record<string, ContentItem>;
}

interface ComputeOptions {
	grouped?: boolean;
	only?: string[] | null;
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

	const sc = box.statusChanges;
	return ORDERED_STATUSES.reduce<Progress>((lastStatus, status) => {
		const change = sc[status];
		if (change?.time && change.time <= notAfterTimestamp) return status;
		return lastStatus;
	}, 'noScans');
}

function sampleToRepartition(sample: Box[], notAfterTimestamp = Date.now()): Repartition {
	const repartition: Repartition = {
		noScans: 0,
		inProgress: 0,
		reachedGps: 0,
		received: 0,
		reachedAndReceived: 0,
		validated: 0,
		total: sample.length,
	};

	for (const box of sample) {
		const progress = getProgress(box, notAfterTimestamp);
		repartition[progress]++;
	}

	return repartition;
}

function getMinMax(arr: number[]): { min: number; max: number } {
	if (!arr?.length) throw new Error('Invalid array');
	return {
		min: Math.min(...arr),
		max: Math.max(...arr),
	};
}

function sampleToTimeline(sample: Box[]) {
	const allTimestamps = sample
		.flatMap((box) =>
			Object.values(box.statusChanges ?? {})
				.filter(Boolean)
				.map((change: any) => change.time as number),
		);

	if (!allTimestamps.length) return [];

	const oneDay = 86_400_000;
	const { min: minTimestamp, max: maxTimestamp } = getMinMax(allTimestamps);

	const final = maxTimestamp + oneDay;
	const initial = Math.max(minTimestamp, final - (365 * oneDay) / 2) - oneDay;

	const data: Array<{ name: string } & Repartition> = [];

	for (let i = initial; i <= final; i += oneDay) {
		const day = new Date(i).toISOString().split('T')[0];
		data.push({ name: day, ...sampleToRepartition(sample, i) });
	}

	return data;
}

export function sampleToContent(sample: Box[]): Record<string, ContentItem> {
	const content: Record<string, ContentItem> = {};

	for (const box of sample) {
		for (const [item, count] of Object.entries(box.content ?? {})) {
			content[item] ??= { validated: 0, total: 0 };
			content[item].total += count;
			if (box.progress === 'validated' || box.statusChanges?.validated) {
				content[item].validated += count;
			}
		}
	}

	return content;
}

export function computeInsights(
	boxes: Box[] | null,
	options: ComputeOptions = {},
): Record<string, Insights> | Insights | Record<string, never> {
	const { grouped = true, only = null } = options;

	if (!boxes?.length) return {};

	if (!grouped) {
		const filtered = only ? boxes.filter((box) => only.includes(box.project)) : boxes;
		return {
			timeline: sampleToTimeline(filtered),
			repartition: sampleToRepartition(filtered),
			content: sampleToContent(filtered),
		};
	}

	const projects = [...new Set(boxes.map((box) => box.project))];

	return Object.fromEntries(
		projects
			.filter((project) => !only || only.includes(project))
			.map((project) => {
				const sample = boxes.filter((box) => box.project === project);
				return [project, {
					timeline: sampleToTimeline(sample),
					repartition: sampleToRepartition(sample),
					content: sampleToContent(sample),
				}];
			}),
	);
}