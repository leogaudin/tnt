import type { CountryConfig } from '../index';

export default {
	name: 'TnT Liberia 🇱🇷',
	title: 'TnT Liberia',
	shortName: 'TnT',
	apiUrl: 'https://tnt-liberia-api.vercel.app/api',
	colors: {
		lightest: '#E7EBF2',
		light: '#A9B4CC',
		main: '#00205B',
		dark: '#001845',
		darkest: '#000F2C',
	},
	defaultLanguage: 'en',
	languages: ['en', 'fr'],
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
	gpsUpdateFields: ['schoolCode'],
	schoolView: { fields: ['school'] },
	labels: {
		en: {
			county: 'County',
			city: 'City',
			school: 'School Name',
			schoolType: 'School Type',
			schoolSession: 'School Session',
		},
		fr: {
			county: 'Comté',
			city: 'Ville',
			school: 'Nom de l\'école',
			schoolType: 'Type d\'école',
			schoolSession: 'Session scolaire',
		},
	},
	features: { projectEmails: false },
} satisfies CountryConfig;
