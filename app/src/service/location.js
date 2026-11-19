import Geolocation from '@react-native-community/geolocation';

const getPosition = (options) => new Promise((resolve, reject) => {
	Geolocation.getCurrentPosition(resolve, reject, options);
});

/**
 * Gets the phone's position: the network location first (fast, and reliable on old phones), then GPS when there is
 * no network location to be had, e.g. on a satellite (Starlink) connection with no mobile network.
 *
 * @returns {Promise<Object>} The position, as returned by Geolocation
 */
export const getLocation = async () => {
	try {
		return await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 });
	} catch (error) {
		// Without permission the second attempt would fail the same way.
		if (error?.code === 1)
			throw error;
		return getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
	}
};

/**
 * @param {Object} error A Geolocation error
 * @returns {string} What the user can do about it
 */
export const locationErrorMessage = (error) => ({
	1: 'Location access is denied. Allow it for this app in the phone settings.',
	2: 'Location is unavailable. Turn on location in the phone settings.',
	3: 'The location search timed out. Move to an open area and retry.',
}[error?.code] ?? 'Location could not be determined.');
