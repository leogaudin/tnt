// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { loadPage } from '@client/service/lazy-page';

const memory = () => {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		removeItem: (k: string) => void data.delete(k),
	};
};

describe('loadPage', () => {
	it('gives the page when the chunk loads', async () => {
		const reload = vi.fn();
		await expect(loadPage(() => Promise.resolve('page'), memory(), reload)).resolves.toBe('page');
		expect(reload).not.toHaveBeenCalled();
	});

	it('reloads once when the chunk is gone (a deploy happened since the tab was opened) and never settles', async () => {
		const storage = memory();
		const reload = vi.fn();
		const outcome = vi.fn();
		loadPage(() => Promise.reject(new Error('Failed to fetch dynamically imported module')), storage, reload).then(outcome, outcome);
		await new Promise((r) => setTimeout(r, 10));
		expect(reload).toHaveBeenCalledTimes(1);
		expect(outcome).not.toHaveBeenCalled();
	});

	it('does not reload in a loop: the second failure in a row is an error', async () => {
		const storage = memory();
		const reload = vi.fn();
		const failing = () => Promise.reject(new Error('offline'));
		loadPage(failing, storage, reload).catch(() => {});
		await new Promise((r) => setTimeout(r, 10));
		await expect(loadPage(failing, storage, reload)).rejects.toThrow('offline');
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it('forgets the failure once a chunk loads, so a later deploy can reload again', async () => {
		const storage = memory();
		const reload = vi.fn();
		loadPage(() => Promise.reject(new Error('gone')), storage, reload).catch(() => {});
		await new Promise((r) => setTimeout(r, 10));
		await loadPage(() => Promise.resolve('page'), storage, reload);
		loadPage(() => Promise.reject(new Error('gone again')), storage, reload).catch(() => {});
		await new Promise((r) => setTimeout(r, 10));
		expect(reload).toHaveBeenCalledTimes(2);
	});
});
