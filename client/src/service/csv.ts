import Papa from 'papaparse';
import { callAPI } from '.';
import lzstring from 'lz-string';
import { boxFields, gpsUpdateFields } from './specific';

type ParseSuccess = { box: Record<string, any> };
type ParseError = { error: string };
type ParseResult = ParseSuccess | ParseError;

const DISTRIBUTION_FIELDS = [...Object.keys(boxFields), 'schoolLatitude', 'schoolLongitude'];
const GPS_FIELDS: string[] = [...gpsUpdateFields, 'schoolLatitude', 'schoolLongitude'];

function parseCoord(value: string): number {
	return parseFloat(value.replace(',', '.'));
}

export function parseDistributionRow(rowData: string[], adminId: string): ParseResult {
	const newBox: Record<string, any> = {};

	for (const [index, field] of DISTRIBUTION_FIELDS.entries()) {
		if (
			!rowData[index] &&
			(boxFields[field]?.required || field === 'schoolLatitude' || field === 'schoolLongitude')
		) {
			return { error: `Field ${field} is missing.` };
		}
		newBox[field] = rowData[index];
	}

	newBox.schoolLatitude = parseCoord(newBox.schoolLatitude);
	newBox.schoolLongitude = parseCoord(newBox.schoolLongitude);
	newBox.adminId = adminId;

	if (isNaN(newBox.schoolLatitude) || isNaN(newBox.schoolLongitude)) {
		return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
	}

	return { box: newBox };
}

export function parseGPSUpdateRow(rowData: string[], isFirstRow = false): ParseResult {
	const newBox: Record<string, any> = {};

	for (const [index, field] of GPS_FIELDS.entries()) {
		if (!rowData[index]) {
			return { error: `Field ${field} is missing.` };
		}
		newBox[field] = rowData[index];
	}

	if (!isFirstRow) {
		if (
			isNaN(parseCoord(newBox.schoolLatitude)) ||
			isNaN(parseCoord(newBox.schoolLongitude))
		) {
			return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
		}
	}

	newBox.schoolLatitude = parseCoord(newBox.schoolLatitude);
	newBox.schoolLongitude = parseCoord(newBox.schoolLongitude);

	if (isNaN(newBox.schoolLatitude) || isNaN(newBox.schoolLongitude)) {
		return { error: `Latitude ${newBox.schoolLatitude} or Longitude ${newBox.schoolLongitude} is invalid.` };
	}

	return { box: newBox };
}

type SetOutput = (updater: (prev: string[]) => string[]) => void;

export async function uploadDistributionList(file: File, setOutput: SetOutput) {
	const data = await file.text();
	const boxes: Record<string, any>[] = [];
	const user = JSON.parse(localStorage.getItem('user')!);

	Papa.parse(data, {
		skipEmptyLines: true,
		header: true,
		step: (element) => {
			const values = Object.values(element.data as Record<string, string>);
			const result = parseDistributionRow(values, user.id);

			if ('error' in result) {
				setOutput((prev) => [
					...prev,
					`Error parsing following item:`,
					JSON.stringify(values),
					result.error,
					`-------`,
				]);
				return;
			}

			const newBox = result.box;
			const contentFields = element.meta.fields!.slice(DISTRIBUTION_FIELDS.length);
			if (contentFields.length) {
				newBox.content = {};
				contentFields.forEach((field, index) => {
					newBox.content[field] = parseInt(values[index + DISTRIBUTION_FIELDS.length]);
				});
			}

			boxes.push(newBox);
		},
		complete: () => {
			setOutput((prev) => [
				...prev,
				`Retrieved ${boxes.length} items.`,
				`Uploading...`,
			]);

			const BUFFER_LENGTH = 10_000;
			const numBoxes = boxes.length;
			let uploaded = 0;
			let uploadedBytes = 0;
			const responses: any[] = [];

			const processBuffer = (buffer: Record<string, any>[]) => {
				buffer.forEach((box, i) => {
					box.packingListId = uploaded + i;
				});
				const payload = {
					data: lzstring.compressToEncodedURIComponent(JSON.stringify(buffer)),
				};
				uploadedBytes += payload.data.length;
				callAPI('POST', 'boxes', payload)
					.then((res) => {
						if (res.status >= 400) throw new Error(res.statusText);
						return res;
					})
					.then((res) => res.json())
					.then((res) => {
						responses.push(res);
						uploaded += buffer.length;
						setOutput((prev) => [
							...prev,
							`${uploaded} items uploaded (${Math.round(uploadedBytes / 1000)} KB).`,
						]);
						if (uploaded < numBoxes) {
							processBuffer(boxes.slice(uploaded, uploaded + BUFFER_LENGTH));
						} else {
							const inserted = responses.reduce((acc, r) => acc + r.insertedCount, 0);
							setOutput((prev) => [
								...prev,
								`-------`,
								`All items uploaded.`,
								`${inserted} items added to database.`,
								`-------`,
								`Reload the page to see the changes.`,
								`-------`,
							]);
						}
					})
					.catch((err) => {
						console.error(err);
						setOutput((prev) => [
							...prev,
							`Error uploading items`,
							err.response?.data?.error?.message || err.message,
						]);
					});
			};

			processBuffer(boxes.slice(0, BUFFER_LENGTH));
		},
	});
}

export async function updateGPSCoordinates(file: File, setOutput: SetOutput) {
	const data = await file.text();
	const boxes: Record<string, any>[] = [];

	Papa.parse(data, {
		skipEmptyLines: true,
		step: (element) => {
			const result = parseGPSUpdateRow(element.data as string[], boxes.length === 0);
			if ('error' in result) {
				setOutput((prev) => [
					...prev,
					`Error parsing following item:`,
					JSON.stringify(element.data),
					result.error,
					`-------`,
				]);
			} else {
				boxes.push(result.box);
			}
		},
		complete: () => {
			if (!boxes.length) {
				setOutput((prev) => [...prev, `No valid items found.`]);
				return;
			}

			setOutput((prev) => [
				...prev,
				`Retrieved ${boxes.length} items.`,
				`Uploading...`,
			]);

			const BUFFER_LENGTH = 75;
			const numBoxes = boxes.length;
			let uploaded = 0;
			let uploadedBytes = 0;
			let updated = 0;
			const responses: any[] = [];

			const processBuffer = (buffer: Record<string, any>[]) => {
				const payload = { coords: buffer };
				callAPI('POST', 'boxes/coords', payload)
					.then((res) => {
						if (res.status >= 400) throw new Error(res.statusText);
						return res;
					})
					.then((res) => res.json())
					.then((res) => {
						responses.push(res);
						uploaded += buffer.length;
						uploadedBytes += JSON.stringify({ boxes: buffer }).length;
						updated += res.updated || 0;
						setOutput((prev) => [...prev, `${res.updated} objects updated.`]);
						if (uploaded < numBoxes) {
							processBuffer(boxes.slice(uploaded, uploaded + BUFFER_LENGTH));
						} else {
							setOutput((prev) => [
								...prev,
								`-------`,
								`Uploaded ${uploaded} coordinates (${Math.round(uploadedBytes / 1000)} KB).`,
								`Updated coordinates of ${updated} objects.`,
								`-------`,
								`Reload the page to see the changes.`,
								`-------`,
							]);
						}
					})
					.catch((err) => {
						console.error(err);
						setOutput((prev) => [
							...prev,
							`Error uploading items`,
							err.response?.data?.error?.message || err.message,
						]);
					});
			};

			processBuffer(boxes.slice(0, BUFFER_LENGTH));
		},
	});
}