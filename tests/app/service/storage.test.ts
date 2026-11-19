import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
	default: {
		getItem: vi.fn(async (k: string) => store.get(k) ?? null),
		setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
		removeItem: vi.fn(async (k: string) => { store.delete(k); }),
	},
}));
vi.mock('@app/service/api', () => ({ sendScan: vi.fn() }));
vi.mock('@app/service/toast', () => ({ showToast: vi.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore (plain JS module)
import { storeOfflineData, dedupeOfflineData, sendOfflineData, submitScan } from '@app/service/storage';
// @ts-ignore
import { sendScan } from '@app/service/api';
// @ts-ignore
import { showToast } from '@app/service/toast';
// @ts-ignore
import { offlineKey } from '@app/constants';

const scan = (boxId: string, time: number) => ({
	boxId, time, operatorId: '+33600000000', location: { coords: { latitude: 1, longitude: 2, accuracy: 3 } },
	markedAsReceived: false, comment: '',
});
const stored = () => JSON.parse(store.get(offlineKey) ?? 'null');
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
	store.clear();
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('storeOfflineData', () => {
	it('overwrites the stored queue instead of appending to it', async () => {
		const queue = [scan('a', 1), scan('b', 2)];
		storeOfflineData(queue);
		await flush();
		storeOfflineData(queue);
		await flush();
		storeOfflineData(queue); // same state saved again (re-render / app relaunch)
		await flush();
		expect(stored()).toEqual(queue);
	});

	it('stores an empty queue as an empty JSON array', async () => {
		storeOfflineData([]);
		await flush();
		expect(store.get(offlineKey)).toBe('[]');
	});

	it('keeps the stored format: a JSON array of the scan objects', async () => {
		const queue = [scan('a', 1)];
		storeOfflineData(queue);
		await flush();
		expect(Array.isArray(stored())).toBe(true);
		expect(Object.keys(stored()[0]).sort()).toEqual(
			['boxId', 'comment', 'location', 'markedAsReceived', 'operatorId', 'time'],
		);
	});

	it('does not throw when storage fails', async () => {
		(AsyncStorage.setItem as any).mockRejectedValueOnce(new Error('disk full'));
		expect(() => storeOfflineData([scan('a', 1)])).not.toThrow();
		await flush();
	});
});

describe('dedupeOfflineData', () => {
	it('removes duplicates (same box and time), keeping the first', () => {
		const a = scan('a', 1);
		const result = dedupeOfflineData([a, scan('b', 2), { ...a }, scan('b', 2), scan('a', 3)]);
		expect(result.map((s: any) => `${s.boxId}@${s.time}`)).toEqual(['a@1', 'b@2', 'a@3']);
	});

	it('keeps two scans of the same box at different times', () => {
		expect(dedupeOfflineData([scan('a', 1), scan('a', 2)])).toHaveLength(2);
	});

	it('shrinks a queue that was doubled by the old append bug', () => {
		const real = [scan('a', 1), scan('b', 2), scan('c', 3)];
		expect(dedupeOfflineData([...real, ...real, ...real, ...real])).toEqual(real);
	});

	it('handles an empty queue', () => {
		expect(dedupeOfflineData([])).toEqual([]);
	});
});

describe('queue survives relaunches without growing (store -> load -> store)', () => {
	it('stays at 2 scans across many relaunches', async () => {
		let state: any[] = [scan('a', 1), scan('b', 2)];
		storeOfflineData(state);
		await flush();
		for (let launch = 0; launch < 5; launch++) {
			state = dedupeOfflineData(JSON.parse(store.get(offlineKey)!)); // load at startup
			storeOfflineData(state);                                       // effect after load
			await flush();
		}
		expect(stored()).toHaveLength(2);
	});
});

describe('sendOfflineData', () => {
	function makeState(initial: any[]) {
		let state = [...initial];
		const setOfflineData = vi.fn((fn: any) => { state = typeof fn === 'function' ? fn(state) : fn; });
		return { setOfflineData, get: () => state };
	}

	it('sends every scan once, in order, and empties the queue', async () => {
		const queue = [scan('a', 1), scan('b', 2)];
		(sendScan as any).mockResolvedValue({});
		const s = makeState(queue);
		await sendOfflineData(queue, s.setOfflineData);
		expect((sendScan as any).mock.calls.map((c: any) => c[0])).toEqual(queue);
		expect(s.get()).toEqual([]);
		expect(showToast).not.toHaveBeenCalled();
	});

	it('sends the same payload it stored (no fields added or removed)', async () => {
		const queue = [scan('a', 1)];
		(sendScan as any).mockResolvedValue({});
		await sendOfflineData(queue, makeState(queue).setOfflineData);
		expect((sendScan as any).mock.calls[0][0]).toEqual(queue[0]);
	});

	it('keeps failed scans in the queue and shows one error toast', async () => {
		const queue = [scan('a', 1), scan('b', 2), scan('c', 3)];
		(sendScan as any)
			.mockResolvedValueOnce({})
			.mockRejectedValueOnce(new Error('404'))
			.mockRejectedValueOnce(new Error('500'));
		const s = makeState(queue);
		await sendOfflineData(queue, s.setOfflineData);
		expect(s.get().map((x: any) => x.boxId)).toEqual(['b', 'c']);
		expect(showToast).toHaveBeenCalledTimes(1);
		expect(showToast).toHaveBeenCalledWith('error', 'Error sending offline data', expect.any(String));
	});

	it('keeps scans that were added while sending', async () => {
		const queue = [scan('a', 1)];
		const s = makeState(queue);
		(sendScan as any).mockImplementation(async () => {
			s.setOfflineData((prev: any[]) => [...prev, scan('new', 9)]); // user scans during upload
			return {};
		});
		await sendOfflineData(queue, s.setOfflineData);
		expect(s.get().map((x: any) => x.boxId)).toEqual(['new']);
	});

	it('does not mutate the array it was given', async () => {
		const queue = [scan('a', 1), scan('b', 2)];
		const copy = JSON.stringify(queue);
		(sendScan as any).mockResolvedValue({});
		await sendOfflineData(queue, makeState(queue).setOfflineData);
		expect(JSON.stringify(queue)).toBe(copy);
	});

	it('does nothing for an empty queue', async () => {
		await sendOfflineData([], makeState([]).setOfflineData);
		expect(sendScan).not.toHaveBeenCalled();
		expect(showToast).not.toHaveBeenCalled();
	});
});

describe('submitScan', () => {
	it('sends the scan without queuing it when the server accepts it', async () => {
		(sendScan as any).mockResolvedValueOnce({});
		const setOfflineData = vi.fn();
		await submitScan(scan('a', 1), setOfflineData);
		expect(sendScan).toHaveBeenCalledWith(scan('a', 1));
		expect(setOfflineData).not.toHaveBeenCalled();
	});

	it('queues the scan and says so when it cannot be sent', async () => {
		(sendScan as any).mockRejectedValueOnce(new Error('Network request failed'));
		let queue: any[] = [scan('a', 1)];
		await submitScan(scan('b', 2), (update: Function) => { queue = update(queue); });
		expect(queue).toEqual([scan('a', 1), scan('b', 2)]);
		expect(showToast).toHaveBeenCalledWith('info', 'Scan saved offline', expect.any(String));
	});
});
