import Papa from 'papaparse';
import { callAPI } from '.';
import lzstring from 'lz-string';
import { boxFields, gpsUpdateFields } from './specific';

/**
 * Parses a single CSV row into a box object for distribution list upload.
 *
 * @param {Array<string>}	rowData		The CSV row data array
 * @param {string}			adminId		The admin user ID
 * @returns {{ box: Object }|{ error: string }}	Parsed box or error message
 */
export function parseDistributionRow(rowData, adminId) {
	const fields = [...Object.keys(boxFields), 'schoolLatitude', 'schoolLongitude'];
	const newBox = {};

	for (let index = 0; index < fields.length; index++) {
		const field = fields[index];
		if (
			!rowData[index] &&
			(boxFields[field]?.required || field === 'schoolLatitude' || field === 'schoolLongitude')
		) {
			return { error: `Field ${field} is missing.` };
		}
		newBox[field] = rowData[index];
	}

	newBox.schoolLatitude = parseFloat(newBox.schoolLatitude.replace(',', '.'));
	newBox.schoolLongitude = parseFloat(newBox.schoolLongitude.replace(',', '.'));
	newBox.adminId = adminId;

	if (isNaN(newBox.schoolLatitude) || isNaN(newBox.schoolLongitude)) {
		return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
	}

	return { box: newBox };
}

/**
 * Parses a single CSV row into a GPS update object.
 *
 * @param {Array<string>}	rowData		The CSV row data array
 * @param {boolean}			isFirstRow	Whether this is the first row (header detection)
 * @returns {{ box: Object }|{ error: string }}	Parsed box or error message
 */
export function parseGPSUpdateRow(rowData, isFirstRow = false) {
	const fields = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];
	const newBox = {};

	for (let index = 0; index < fields.length; index++) {
		const field = fields[index];
		if (!rowData[index]) {
			return { error: `Field ${field} is missing.` };
		}
		newBox[field] = rowData[index];
	}

	// Skip lat/lng validation for first row (might be header)
	if (!isFirstRow) {
		if (
			isNaN(parseFloat(newBox.schoolLatitude.replace(',', '.'))) ||
			isNaN(parseFloat(newBox.schoolLongitude.replace(',', '.')))
		) {
			return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
		}
	}

	newBox.schoolLatitude = parseFloat(newBox.schoolLatitude.replace(',', '.'));
	newBox.schoolLongitude = parseFloat(newBox.schoolLongitude.replace(',', '.'));

	if (isNaN(newBox.schoolLatitude) || isNaN(newBox.schoolLongitude)) {
		return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
	}

	return { box: newBox };
}

/**
 *
 * @param {File}		file		The file to be uploaded
 * @param {Function}	setOutput	Function to set the output of the upload
 */
export async function uploadDistributionList(file, setOutput) {
	const data = await file.text();
	const boxes = [];
	const user = JSON.parse(localStorage.getItem('user'));

	Papa.parse(data, {
		skipEmptyLines: true,
		step: (element) => {
			const result = parseDistributionRow(element.data, user.id);
			if (result.error) {
				setOutput(prev => {
					return [...prev,
						`Error parsing following item:`,
						JSON.stringify(element.data),
						result.error,
						`-------`,
					];
				});
			} else {
				boxes.push(result.box);
			}
		},
		complete: () => {
			setOutput(prev => {
				return [...prev,
					`Retrieved ${boxes.length} items.`,
					`Uploading...`,
				];
			});

			const BUFFER_LENGTH = 15000;
			const numBoxes = boxes.length;
			let uploaded = 0;
			let uploadedBytes = 0;
			const responses = [];

			const processBuffer = (buffer) => {
				buffer.forEach((box, i) => {
					box.packingListId = uploaded + i;
				});
				const payload = {
					data: lzstring.compressToEncodedURIComponent(JSON.stringify(buffer)),
				};
				uploadedBytes += payload.data.length;
				callAPI('POST', 'boxes', payload)
				// addBoxes(payload)
					.then((res) => {
						if (res.status >= 400)
							throw new Error(res.statusText);
						return res;
					})
					.then((res) => res.json())
					.then((res) => {
						responses.push(res);
						uploaded += buffer.length;
						setOutput(prev => {
							return [...prev,
								`${uploaded} items uploaded (${Math.round(uploadedBytes / 1000)} KB).`,
							];
						})
						if (uploaded < numBoxes) {
							// There are more boxes
							const nextBuffer = boxes.slice(uploaded, uploaded + BUFFER_LENGTH);
							processBuffer(nextBuffer);
						} else {
							// All boxes have been uploaded
							const inserted = responses.reduce((acc, res) => acc + res.insertedCount, 0);

							setOutput(prev => {

								return [...prev,
									`-------`,
									`All items uploaded.`,
									`${inserted} items added to database.`,
									`-------`,
									`Reload the page to see the changes.`,
									`-------`,
								];
							});
						}
					})
					.catch((err) => {
						console.error(err);
						setOutput(prev => {
							return [...prev,
								`Error uploading items`,
								err.response?.data?.error?.message || err.message,
							];
						})
					});
			};

			processBuffer(boxes.slice(0, BUFFER_LENGTH));
		}
	})
}

/**
 *
 * @param {File}		file		The file to be uploaded
 * @param {Function}	setOutput	Function to set the output of the upload
 */
export async function updateGPSCoordinates(file, setOutput) {
	const data = await file.text();
	const boxes = [];

	Papa.parse(data, {
		skipEmptyLines: true,
		step: (element) => {
			const result = parseGPSUpdateRow(element.data, boxes.length === 0);
			if (result.error) {
				setOutput(prev => {
					return [...prev,
						`Error parsing following item:`,
						JSON.stringify(element.data),
						result.error,
						`-------`,
					];
				});
			} else {
				boxes.push(result.box);
			}
		},
		complete: () => {
			if (!boxes.length) {
				setOutput(prev => {
					return [...prev,
						`No valid items found.`,
					];
				});
				return;
			}

			setOutput(prev => {
				return [...prev,
					`Retrieved ${boxes.length} items.`,
					`Uploading...`,
				];
			});

			const BUFFER_LENGTH = 10;
			const numBoxes = boxes.length;
			let uploaded = 0;
			let uploadedBytes = 0;
			let updated = 0;
			let recalculated = 0;
			const responses = [];

			const processBuffer = (buffer) => {
				callAPI('POST', 'boxes/coords', { coords: buffer })
					.then((res) => {
						if (res.status >= 400)
							throw new Error(res.statusText);
						return res;
					})
					.then((res) => res.json())
					.then((res) => {
						responses.push(res);
						uploaded += buffer.length;
						uploadedBytes += JSON.stringify({boxes: buffer}).length;
						updated += res.updated;
						recalculated = res.recalculated;
						setOutput(prev => {
							return [...prev,
								`${res.updated} objects updated.`,
							];
						})
						if (uploaded < numBoxes) {
							// There are more boxes
							const nextBuffer = boxes.slice(uploaded, uploaded + BUFFER_LENGTH);
							processBuffer(nextBuffer);
						} else {
							// All boxes have been uploaded
							setOutput(prev => {
								return [...prev,
									`-------`,
									`Uploaded ${uploaded} coordinates (${Math.round(uploadedBytes / 1000)} KB).`,
									`Updated coordinates of ${updated} objects.`,
									`Recalculated scans in ${recalculated} objects.`,
									`-------`,
									`Reload the page to see the changes.`,
									`-------`,
								];
							});
						}
					})
					.catch((err) => {
						console.error(err);
						setOutput(prev => {
							return [...prev,
								`Error uploading items`,
								err.response?.data?.error?.message || err.message,
							];
						})
					});
			};

			processBuffer(boxes.slice(0, BUFFER_LENGTH));
		}
	});
}
