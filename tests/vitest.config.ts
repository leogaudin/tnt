import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@server': path.resolve(__dirname, '../server'),
			'@client': path.resolve(__dirname, '../client/src'),
			'@app': path.resolve(__dirname, '../app/src'),
		},
	},
	test: {
		include: ['**/*.test.ts'],
	},
});