import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendScan } from './api';
import { offlineKey } from '../constants';
import { showToast } from './toast';

/**
 * @typedef {import('./api').Scan} Scan
 */

/**
 * Stores a string in AsyncStorage.
 *
 * @param {String} key   The key to store the value under
 * @param {String} value The value to store
 */
export const storeString = async (key, value) => {
	try {
		await AsyncStorage.setItem(key, value);
	} catch (e) {
		console.error(e);
	}
};

/**
 * Retrieves a string from AsyncStorage.
 *
 * @param {String} key The key to retrieve the value from
 * @returns {String} The value stored under the key
 */
export const getString = async (key) => {
	try {
		const value = await AsyncStorage.getItem(key);
		if (value !== null) {
			return value;
		}
	} catch (e) {
		console.error(e);
	}
};

/**
 * Removes a string from AsyncStorage.
 *
 * @param {String} key The key to remove the value from
 */
export const removeValue = async (key) => {
	try {
		await AsyncStorage.removeItem(key);
	} catch (e) {
		console.error(e);
	}
	console.info('Removed ' + key + '.');
};

/**
 * Saves the offline queue in the offline storage (overwrites it).
 *
 * @param {Array<Scan>}	dataToStore	The full offline queue
 */
export const storeOfflineData = (dataToStore) => {
	AsyncStorage.setItem(offlineKey, JSON.stringify(dataToStore))
		.catch((error) => {
			console.error('Error storing offline data:', error);
		});
};

/**
 * Removes duplicated scans (same box and same time) from a queue.
 *
 * @param {Array<Scan>}	queue	The offline queue
 * @returns {Array<Scan>}		The queue without duplicates
 */
export const dedupeOfflineData = (queue) => {
	const seen = new Set();
	return queue.filter((scan) => {
		const key = `${scan.boxId}|${scan.time}`;
		if (seen.has(key))
			return false;
		seen.add(key);
		return true;
	});
};

/**
 * Sends offline scans to the server, one at a time.
 * Sent scans are removed from the queue; failed ones are kept.
 *
 * @param {Array<Scan>}	offlineData		The offline data to send
 * @param {Function}	setOfflineData	The function to set the offline data
 */
export const sendOfflineData = async (offlineData, setOfflineData) => {
	let failed = 0;

	for (const scan of [...offlineData]) {
		try {
			await sendScan(scan);
			setOfflineData((prev) => prev.filter((s) => s !== scan));
		} catch (error) {
			failed++;
			console.error('Error sending offline data:', error);
		}
	}

	if (failed > 0) {
		showToast(
			'error',
			'Error sending offline data',
			'Offline data will be sent when connection is restored',
		);
	}
};

/**
 * Sends a scan, or keeps it in the offline queue if it cannot be sent.
 * Always tries the network first: the phone's connectivity status can be wrong or late.
 *
 * @param {Scan} scan
 * @param {Function} setOfflineData The setter of the offline queue
 */
export const submitScan = async (scan, setOfflineData) => {
	try {
		await sendScan(scan);
	} catch (error) {
		console.error('Error sending scan:', error);
		setOfflineData((prev) => [...prev, scan]);
		showToast(
			'info',
			'Scan saved offline',
			'Send it later from the offline scans list',
		);
	}
};
