import type { ServerCountryConfig } from '../types';

export default {
	boxFields: {
		project: { required: true },
		county: { required: true },
		schoolCode: { required: true },
		district: { required: true },
		city: { required: false },
		school: { required: true },
		schoolType: { required: true },
		schoolSession: { required: true },
		htName: { required: false },
		htPhone: { required: false },
	},
	reportFields: ['project', 'school', 'district'],
	gpsMatchFields: ['schoolCode'],
	features: { dailyReport: false },
} satisfies ServerCountryConfig;
