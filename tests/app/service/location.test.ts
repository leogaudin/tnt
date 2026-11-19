import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCurrentPosition } = vi.hoisted(() => ({ getCurrentPosition: vi.fn() }));
vi.mock('@react-native-community/geolocation', () => ({ default: { getCurrentPosition } }));

// @ts-ignore (plain JS module)
import { getLocation, locationErrorMessage } from '@app/service/location';

const position = (accuracy: number) => ({ coords: { latitude: 6.3, longitude: -10.8, accuracy } });
/** Answers each getCurrentPosition call in turn: a position, or `{ code }` for an error. */
const answer = (...results: any[]) => {
	for (const result of results)
		getCurrentPosition.mockImplementationOnce((ok: Function, fail: Function) => (result.coords ? ok(result) : fail(result)));
};

beforeEach(() => getCurrentPosition.mockReset());

describe('getLocation', () => {
	it('asks for the network location first, as before', async () => {
		answer(position(500));
		expect(await getLocation()).toEqual(position(500));
		expect(getCurrentPosition).toHaveBeenCalledTimes(1);
		expect(getCurrentPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: false });
	});

	it('falls back to GPS when the network location times out or is unavailable', async () => {
		for (const code of [2, 3]) {
			getCurrentPosition.mockReset();
			answer({ code }, position(5));
			expect(await getLocation()).toEqual(position(5));
			expect(getCurrentPosition.mock.calls[1][2]).toMatchObject({ enableHighAccuracy: true });
		}
	});

	it('does not retry when permission is denied', async () => {
		answer({ code: 1 });
		await expect(getLocation()).rejects.toEqual({ code: 1 });
		expect(getCurrentPosition).toHaveBeenCalledTimes(1);
	});

	it('rejects with the GPS error when both attempts fail', async () => {
		answer({ code: 2 }, { code: 3 });
		await expect(getLocation()).rejects.toEqual({ code: 3 });
	});
});

describe('locationErrorMessage', () => {
	it('says what to do for each error, with a generic message otherwise', () => {
		expect(locationErrorMessage({ code: 1 })).toMatch(/settings/);
		expect(locationErrorMessage({ code: 2 })).toMatch(/Turn on location/);
		expect(locationErrorMessage({ code: 3 })).toMatch(/timed out/);
		expect(locationErrorMessage(undefined)).toBe('Location could not be determined.');
	});
});
