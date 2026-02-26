 import express, { Request, Response } from 'express';
import Admin from '../models/admins.model';
import Box from '../models/boxes.model';
import Scan from '../models/scans.model';
import { getQuery, haversineDistance } from '../service/index';
import { getLastScanWithConditions } from '../service/stats';
import { requireApiKey } from '../service/apiKey';

const router = express.Router();

router.post('/toggle', async (req: Request, res: Response) => {
	try {
		const apiKey = req.headers['x-authorization'];

		if (!apiKey)
			return res.status(401).json({ message: 'Unauthorized' });

		const admin = await Admin.findOne({ apiKey });

		if (!admin)
			return res.status(404).json({ message: 'Admin not found' });

		admin.publicInsights = !admin.publicInsights;
		await admin.save();
		return res.status(200).json({ message: 'Successfully set insights to ' + admin.publicInsights, publicInsights: admin.publicInsights });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

router.post('/', async (req: Request, res: Response) => {
	try {
		const { skip, limit, filters } = getQuery(req);
		if (!filters.adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: filters.adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (admin.publicInsights || req.headers['x-authorization'] === admin.apiKey) {
			const boxes = await Box
				.find(
					{ ...filters },
					{ project: 1, statusChanges: 1, content: 1, _id: 0 }
				)
				.skip(skip)
				.limit(limit);

			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			return res.status(200).json({ boxes });
		} else {
			return res.status(401).json({ error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/report', async (req: Request, res: Response) => {
	try {
		const reportFields = ['project', 'school', 'district'];

		const { skip, limit, filters } = getQuery(req);
		if (!filters.adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: filters.adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (admin.publicInsights || req.headers['x-authorization'] === admin.apiKey) {
			const boxes: any[] = await Box
				.find(
					{ ...filters },
					`id schoolLatitude schoolLongitude statusChanges lastScan content createdAt ${reportFields.join(' ')}`
				)
				.skip(skip)
				.limit(limit);

			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			const scanIds: string[] = [];
			for (const box of boxes) {
				if (box.lastScan?.scan) {
					scanIds.push(box.lastScan.scan);
				}
				for (const [_, change] of Object.entries(box.statusChanges || {})) {
					if (change && (change as any).scan) {
						scanIds.push((change as any).scan);
					}
				}
			}

			const scans = await Scan.find({ id: { $in: scanIds } });

			const indexedScans = scans.reduce<Record<string, any[]>>((acc, scan) => {
				if (!acc[scan.boxId]) {
					acc[scan.boxId] = [];
				}
				acc[scan.boxId].push(scan);
				return acc;
			}, {});

			boxes.forEach((box: any) => {
				box.scans = indexedScans[box.id] || [];
			});

			const toExport: any[] = [];

			for (const box of boxes) {
				const lastReachedScan = getLastScanWithConditions(box.scans, ['finalDestination']);
				const lastMarkedAsReceivedScan = getLastScanWithConditions(box.scans, ['markedAsReceived']);
				const lastValidatedScan = getLastScanWithConditions(box.scans, ['finalDestination', 'markedAsReceived']);
				const lastScan = getLastScanWithConditions(box.scans, []);

				const schoolCoords = {
					latitude: box.schoolLatitude,
					longitude: box.schoolLongitude,
					accuracy: 1,
				};

				const receivedCoords = lastMarkedAsReceivedScan ? {
					latitude: lastMarkedAsReceivedScan.location.coords.latitude,
					longitude: lastMarkedAsReceivedScan.location.coords.longitude,
					accuracy: lastMarkedAsReceivedScan.location.coords.accuracy,
				} : null;

				const receivedDistanceInMeters = receivedCoords ? Math.round(haversineDistance(schoolCoords, receivedCoords)) : '';
				const lastScanDistanceInMeters = lastScan ? Math.round(haversineDistance(schoolCoords, lastScan.location.coords)) : '';

				const result: any = { id: box.id };

				reportFields.forEach((field) => {
					if (box[field]) {
						result[field] = box[field];
					}
				});

				const row = {
					...result,
					schoolLatitude: box.schoolLatitude,
					schoolLongitude: box.schoolLongitude,
					lastScanLatitude: lastScan?.location?.coords.latitude || '',
					lastScanLongitude: lastScan?.location?.coords.longitude || '',
					lastScanDistanceInMeters,
					lastScanDate: lastScan ? new Date(lastScan?.location.timestamp).toLocaleDateString() : '',
					reachedGps: Number(Boolean(lastReachedScan)),
					reachedDate: lastReachedScan ? new Date(lastReachedScan?.location.timestamp).toLocaleDateString() : '',
					received: Number(Boolean(lastMarkedAsReceivedScan)),
					receivedDistanceInMeters,
					receivedDate: lastMarkedAsReceivedScan ? new Date(lastMarkedAsReceivedScan?.location.timestamp).toLocaleDateString() : '',
					receivedComment: lastMarkedAsReceivedScan?.comment || '',
					validated: Number(Boolean(lastValidatedScan)),
					validatedDate: lastValidatedScan ? new Date(lastValidatedScan?.location.timestamp).toLocaleDateString() : '',
					validatedComment: lastValidatedScan?.comment || '',
					...(box.content || {}),
				};

				toExport.push(row);
			}

			return res.status(200).json({ boxes: toExport });
		} else {
			return res.status(401).json({ error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.get('/emails', async (req: Request, res: Response) => {
	try {
		const adminId = req.query.adminId;
		if (!adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (!admin.publicInsights && req.headers['x-authorization'] !== admin.apiKey) {
			return res.status(401).json({ error: `Unauthorized` });
		}
		const emails = admin.projectEmails || {};
		return res.status(200).json({ emails });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/emails', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			admin.projectEmails = req.body.emails;
			await admin.save();
			return res.status(200).json({ message: 'Emails updated successfully' });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

export default router;