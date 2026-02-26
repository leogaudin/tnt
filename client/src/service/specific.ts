export const name = 'TnT 🇺🇳';

export const colors = {
	lightest: '#F0F5FF',
	light: '#EBF0FE',
	main: '#0949FF',
	dark: '#0033C0',
	darkest: '#001D6A',
} as const;

export const API_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:3000/api'
		: 'https://track-and-trace-api-git-optimized-leogaudin-s-team.vercel.app/api';

interface FieldDef {
	type: StringConstructor;
	required: boolean;
}

export const boxFields: Record<string, FieldDef> = {
	project: { type: String, required: true },
	division: { type: String, required: false },
	district: { type: String, required: true },
	zone: { type: String, required: false },
	school: { type: String, required: true },
	htName: { type: String, required: false },
	htPhone: { type: String, required: false },
	schoolCode: { type: String, required: false },
};

export const gpsUpdateFields = ['schoolCode'] as const;

export const excludedKeys = [
	'_id',
	'__v',
	'id',
	'adminId',
	'scans',
	'schoolLatitude',
	'schoolLongitude',
	'statusChanges',
	'progress',
	'content',
	'lastScan',
	'packingListId',
] as const;