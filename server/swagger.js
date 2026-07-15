import swaggerJSDoc from 'swagger-jsdoc';

const definition = {
	openapi: '3.0.0',
	info: {
		title: 'TNT Module API',
		version: '1.0.0',
		description: 'API for tracking boxes and scans through their delivery lifecycle.',
	},
	servers: [
		{ url: '/api' },
	],
	components: {
		securitySchemes: {
			apiKeyAuth: {
				type: 'apiKey',
				in: 'header',
				name: 'x-authorization',
				description: 'API key returned from POST /register',
			},
		},
		schemas: {
			Admin: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					email: { type: 'string' },
					password: { type: 'string' },
					apiKey: { type: 'string' },
					createdAt: { type: 'integer', format: 'int64' },
					publicInsights: { type: 'boolean' },
				},
			},
			Box: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					project: { type: 'string' },
					division: { type: 'string' },
					district: { type: 'string' },
					zone: { type: 'string' },
					school: { type: 'string' },
					htName: { type: 'string' },
					htPhone: { type: 'string' },
					schoolCode: { type: 'string' },
					adminId: { type: 'string' },
					createdAt: { type: 'string', format: 'date-time' },
					schoolLatitude: { type: 'number' },
					schoolLongitude: { type: 'number' },
					statusChanges: { type: 'object' },
					progress: { type: 'string' },
					lastScan: { type: 'object' },
					packingListId: { type: 'integer' },
				},
			},
			Scan: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					boxId: { type: 'string' },
					adminId: { type: 'string' },
					operatorId: { type: 'string' },
					time: { type: 'integer', format: 'int64' },
					location: { type: 'object' },
					finalDestination: { type: 'boolean' },
					markedAsReceived: { type: 'boolean' },
					comment: { type: 'string' },
				},
			},
		},
	},
};

const options = {
	definition,
	apis: ['./controllers/*.js'],
};

export default swaggerJSDoc(options);
