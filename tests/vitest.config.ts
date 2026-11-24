import { defineConfig } from 'vitest/config';
import path from 'path';
import { countryDir } from './countries-select';

export default defineConfig({
	resolve: {
		alias: [
			// The client's country config, behind the alias `@country`.
			{ find: /^@country\/config$/, replacement: path.join(countryDir('client'), 'config.ts') },
			{ find: /^@country\/locales\//, replacement: path.join(countryDir('client'), 'locales') + '/' },
			...Object.entries({
			'@server': path.resolve(__dirname, '../server'),
			'@client': path.resolve(__dirname, '../client/src'),
			express: path.resolve(__dirname, '../server/node_modules/express'),
			'@chakra-ui/react': path.resolve(__dirname, '../client/node_modules/@chakra-ui/react'),
			'react-router-dom': path.resolve(__dirname, '../client/node_modules/react-router-dom'),
			'react-helmet-async': path.resolve(__dirname, '../client/node_modules/react-helmet-async'),
			react: path.resolve(__dirname, '../client/node_modules/react'),
			'react-dom': path.resolve(__dirname, '../client/node_modules/react-dom'),
			}).map(([find, replacement]) => ({ find, replacement })),
		],
	},
	// The client's font imports (`?url`) live outside this folder; newer Vite versions refuse them unless allowed.
	server: { fs: { allow: [path.resolve(__dirname, '..')] } },
	test: {
		include: ['**/*.test.ts', '**/*.test.tsx'],
		// Node 25+ has its own `localStorage` global (undefined without --localstorage-file) that hides happy-dom's.
		execArgv: ['--no-experimental-webstorage'],
		// happy-dom rejects a component's pending animation when the test unmounts it; that is teardown noise, not a failure.
		onUnhandledError(error) {
			if (error?.name === 'AbortError' && /animation was canceled/i.test(String(error.message))) return false;
		},
	},
});