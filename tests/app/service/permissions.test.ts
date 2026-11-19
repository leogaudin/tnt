import { describe, it, expect, vi, beforeEach } from 'vitest';

const { requestMultiple } = vi.hoisted(() => ({ requestMultiple: vi.fn() }));
vi.mock('react-native', () => ({
	Platform: { OS: 'android' },
	PermissionsAndroid: {
		requestMultiple,
		PERMISSIONS: {
			ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
			ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
			CAMERA: 'android.permission.CAMERA',
		},
	},
}));
vi.mock('react-native-permissions', () => ({ PERMISSIONS: {}, request: vi.fn() }));

// @ts-ignore (plain JS module)
import { requestAllPermissions } from '@app/service/permissions';

const grant = (fine: string, coarse: string, camera = 'granted') => requestMultiple.mockResolvedValueOnce({
	'android.permission.ACCESS_FINE_LOCATION': fine,
	'android.permission.ACCESS_COARSE_LOCATION': coarse,
	'android.permission.CAMERA': camera,
});

beforeEach(() => requestMultiple.mockReset());

describe('requestAllPermissions (Android)', () => {
	it('asks for precise location so the GPS fallback can work', async () => {
		grant('granted', 'granted');
		expect(await requestAllPermissions()).toEqual({ location: true, camera: true });
		expect(requestMultiple.mock.calls[0][0]).toContain('android.permission.ACCESS_FINE_LOCATION');
	});

	it('still accepts approximate location only', async () => {
		grant('denied', 'granted');
		expect((await requestAllPermissions()).location).toBe(true);
	});

	it('reports missing location and camera', async () => {
		grant('denied', 'denied', 'denied');
		expect(await requestAllPermissions()).toEqual({ location: false, camera: false });
	});
});
