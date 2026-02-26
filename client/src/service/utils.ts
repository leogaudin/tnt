import i18n from '../language';

interface Coordinates {
	latitude: number;
	longitude: number;
}

export function timeAgo(input: number | string | Date): string {
	let time: number;

	if (typeof input === 'number') {
		time = input;
	} else if (typeof input === 'string') {
		time = +new Date(input);
	} else if (input instanceof Date) {
		time = input.getTime();
	} else {
		time = Date.now();
	}

	type TimeFormat = [number, string, string | number];

	const timeFormats: TimeFormat[] = [
		[60, 'seconds', 1],
		[120, i18n.t('minutesAgo', { count: 1 }), i18n.t('minuteFromNow', { count: 1 })],
		[3600, 'minutes', 60],
		[7200, i18n.t('hoursAgo', { count: 1 }), i18n.t('hourFromNow', { count: 1 })],
		[86400, 'hours', 3600],
		[172800, i18n.t('yesterday'), i18n.t('tomorrow')],
		[604800, 'days', 86400],
		[1209600, i18n.t('lastWeek'), i18n.t('nextWeek')],
		[2419200, 'weeks', 604800],
		[4838400, i18n.t('lastMonth'), i18n.t('nextMonth')],
		[29030400, 'months', 2419200],
		[58060800, i18n.t('lastYear'), i18n.t('nextYear')],
		[2903040000, 'years', 29030400],
	];

	const seconds = (Date.now() - time) / 1000;

	if (seconds === 0) return i18n.t('justNow');
	if (seconds < 0) return i18n.t('future');

	const unitMap: Record<string, string> = {
		seconds: 'secondsAgo',
		minutes: 'minutesAgo',
		hours: 'hoursAgo',
		days: 'daysAgo',
		weeks: 'weeksAgo',
		months: 'monthsAgo',
		years: 'yearsAgo',
	};

	const format = timeFormats.find(([threshold]) => seconds < threshold);
	if (!format) return String(time);

	const [, label, divisor] = format;
	if (typeof divisor === 'string') return label;

	const key = unitMap[label] ?? 'justNow';
	return i18n.t(key, { count: Math.floor(seconds / divisor) });
}

export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
	const earthRadiusInMeters = 6378137;
	const { latitude: lat1, longitude: lon1 } = coord1;
	const { latitude: lat2, longitude: lon2 } = coord2;

	const dLat = (lat2 - lat1) * (Math.PI / 180);
	const dLon = (lon2 - lon1) * (Math.PI / 180);

	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
		Math.sin(dLon / 2) ** 2;

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return earthRadiusInMeters * c;
}

export function groupByProperty<T extends Record<string, any>>(
	boxes: T[],
	propertyName: string,
): Record<string, T[]> {
	return boxes.reduce<Record<string, T[]>>((acc, box) => {
		const property = box[propertyName];
		if (!property) return acc;
		(acc[property] ??= []).push(box);
		return acc;
	}, {});
}

export function getLatLngCenter(latLngInDegr: [number, number][]): [number, number] {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const toDeg = (rad: number) => (rad * 180) / Math.PI;

	const { sumX, sumY, sumZ } = latLngInDegr.reduce(
		(acc, [lat, lng]) => {
			const latR = toRad(lat);
			const lngR = toRad(lng);
			return {
				sumX: acc.sumX + Math.cos(latR) * Math.cos(lngR),
				sumY: acc.sumY + Math.cos(latR) * Math.sin(lngR),
				sumZ: acc.sumZ + Math.sin(latR),
			};
		},
		{ sumX: 0, sumY: 0, sumZ: 0 },
	);

	const n = latLngInDegr.length;
	const avgX = sumX / n;
	const avgY = sumY / n;
	const avgZ = sumZ / n;

	const lng = Math.atan2(avgY, avgX);
	const hyp = Math.sqrt(avgX ** 2 + avgY ** 2);
	const lat = Math.atan2(avgZ, hyp);

	return [toDeg(lat), toDeg(lng)];
}

export function getZoomLevel(markerCoords: [number, number][]): number {
	const bounds = markerCoords.reduce(
		(acc, coord) => [
			[Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
			[Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])],
		],
		[
			[Infinity, Infinity],
			[-Infinity, -Infinity],
		],
	);

	const distance = Math.sqrt(
		(bounds[1][0] - bounds[0][0]) ** 2 + (bounds[1][1] - bounds[0][1]) ** 2,
	);

	return Math.round(Math.log2((156543.03392 * 360) / distance / 200000));
}