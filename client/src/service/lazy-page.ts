import { lazy } from 'react';
import type { ComponentType } from 'react';

const FLAG = 'chunk-reload';

/**
 * Loads a page chunk. A tab opened before a deploy asks for chunks that no longer exist, and the import fails: one
 * reload brings the new ones. The flag stops a loop if the failure is something else (no network, a real error).
 */
export function loadPage<T>(
	load: () => Promise<T>,
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = sessionStorage,
	reload: () => void = () => window.location.reload(),
): Promise<T> {
	return load().then(
		(page) => {
			storage.removeItem(FLAG);
			return page;
		},
		(error) => {
			if (storage.getItem(FLAG)) throw error;
			storage.setItem(FLAG, '1');
			reload();
			// The page is going away: leave the Suspense fallback up rather than show an error for a moment.
			return new Promise<T>(() => {});
		},
	);
}

export const lazyPage = <P extends { default: ComponentType }>(load: () => Promise<P>) => lazy(() => loadPage(load));
