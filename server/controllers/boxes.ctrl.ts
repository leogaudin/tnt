import express, { Request, Response } from 'express';
import Admin from '../models/admins.model.js';
import Box from '../models/boxes.model.js';
import { requireApiKey } from '../service/apiKey.js';
import { generateId, getQuery, isFinalDestination } from '../service/index.js';
import lzstring from 'lz-string';
import Scan from '../models/scans.model.js';
import { indexStatusChanges } from '../service/stats.js';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { data } = req.body;

			if (!data) {
				return res.status(400).json({ error: 'No data provided' });
			}

			const payload = lzstring.decompressFromEncodedURIComponent(data);
			const instances = JSON.parse(payload!);
			instances.forEach((instance: any) => {
				instance.createdAt = new Date().getTime();
				instance.id = generateId();
				instance.adminId = admin.id;
			});

			const inserted = await Box.insertMany(instances);
			return res.status(201).json({
				message: 'Items created!',
				insertedCount: inserted.length,
			});
		});
	} catch (error) {
		console.error('Error occurred during createMany:', error);
		return res.status(500).json({ error });
	}
});

router.get('/one/:id', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const box = await Box.findOne(
				{ id: req.params.id, adminId: admin.id },
				{ scans: 0 }
			);
			if (!box)
				return res.status(404).json({ error: `Box not found` });

			return res.status(200).json({ box });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/query', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const found = await Admin.findOne({ id: admin.id });
			if (!found)
				return res.status(404).json({ error: `Admin not found` });

			const { skip, limit, filters, sort } = getQuery(req);

			const boxes = await Box
				.find(
					{ ...filters, adminId: admin.id },
					{ scans: 0 },
				)
				.sort(sort)
				.skip(skip)
				.limit(limit);

			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			return res.status(200).json({ boxes });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/distinct/:field', async (req: Request, res: Response) => {
	try {
		const { filters } = getQuery(req);
		if (!filters.adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: filters.adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (admin.publicInsights || req.headers['x-authorization'] === admin.apiKey) {
			const field = req.params.field;
			if (!field)
				return res.status(400).json({ error: 'Field required' });

			const distinct = await Box.distinct(field, { ...filters });
			return res.status(200).json({ distinct });
		} else {
			return res.status(401).json({ error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/count', async (req: Request, res: Response) => {
	try {
		const { filters } = getQuery(req);
		if (!filters.adminId)
			return res.status(400).json({ error: 'Admin ID required' });

		const admin = await Admin.findOne({ id: filters.adminId });
		if (!admin)
			return res.status(404).json({ error: `Admin not found` });

		if (admin.publicInsights || req.headers['x-authorization'] === admin.apiKey) {
			const count = await Box.countDocuments({ ...filters });
			return res.status(200).json({ count });
		} else {
			return res.status(401).json({ error: `Unauthorized` });
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.delete('/', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { filters } = getQuery(req);

			const results = await Promise.all([
				Box.deleteMany({ ...filters, adminId: admin.id }),
			]);

			return res.status(200).json({ deletedCount: results[0].deletedCount });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/coords', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const { coords } = req.body;
			const coordsUpdate = coords.map((box: any) => ({
				updateMany: {
					filter: { schoolCode: box.schoolCode, adminId: admin.id },
					update: { $set: { schoolLatitude: box.schoolLatitude, schoolLongitude: box.schoolLongitude } },
					multi: true,
				},
			}));

			const coordsUpdateResult = await Box.bulkWrite(coordsUpdate);
			const updated = coordsUpdateResult.modifiedCount;
			const matched = coordsUpdateResult.matchedCount;

			if (updated === 0)
				return res.status(200).json({ updated, matched, recalculated: 0 });

			const boxes: any[] = await Box
				.find(
					{
						adminId: admin.id,
						$or: coords.map((box: any) => ({ schoolCode: box.schoolCode }))
					},
					{ schoolLatitude: 1, schoolLongitude: 1, id: 1, _id: 0 }
				);

			const scans = await Scan.find({ boxId: { $in: boxes.map((box) => box.id) } });

			const scansUpdate: any[] = [];

			scans.forEach((scan: any) => {
				const box = boxes.find((box) => box.id === scan.boxId);
				if (!box) return;
				const schoolCoords = {
					latitude: box.schoolLatitude,
					longitude: box.schoolLongitude,
				};
				const scanCoords = {
					latitude: scan.location.coords.latitude,
					longitude: scan.location.coords.longitude,
				};
				const newFinalDestination = isFinalDestination(schoolCoords, scanCoords);

				if (newFinalDestination !== scan.finalDestination) {
					scan.finalDestination = newFinalDestination;
					scansUpdate.push({
						updateOne: {
							filter: { id: scan.id },
							update: { $set: { finalDestination: scan.finalDestination } },
						},
					});
				}
			});

			await Scan.bulkWrite(scansUpdate);

			boxes.forEach((box: any) => {
				const newScans = scans.filter((scan) => scan.boxId === box.id);
				box.scans = newScans;
			});

			const indexing = indexStatusChanges(boxes);
			await Box.bulkWrite(indexing);

			return res.status(200).json({ updated, matched });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/boxes/reindex', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const boxes: any[] = await Box.find({ adminId: admin.id });
			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			const scans = await Scan.find({ boxId: { $in: boxes.map((box) => box.id) } });

			boxes.forEach((box: any) => {
				const newScans = scans.filter((scan) => scan.boxId === box.id);
				box.scans = newScans;
			});

			const indexing = indexStatusChanges(boxes);
			const response = await Box.bulkWrite(indexing);

			return res.status(200).json({ reindexed: response.modifiedCount });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

router.post('/boxes/recalculate', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, async (admin: any) => {
			const boxes: any[] = await Box.find({ adminId: admin.id });
			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			const scans = await Scan.find({ boxId: { $in: boxes.map((box) => box.id) } });

			const scansUpdate: any[] = [];

			scans.forEach((scan: any) => {
				const box = boxes.find((box) => box.id === scan.boxId);
				if (!box) return;
				const schoolCoords = {
					latitude: box.schoolLatitude,
					longitude: box.schoolLongitude,
				};
				const scanCoords = {
					latitude: scan.location.coords.latitude,
					longitude: scan.location.coords.longitude,
				};
				const newFinalDestination = isFinalDestination(schoolCoords, scanCoords);

				if (newFinalDestination !== scan.finalDestination) {
					scan.finalDestination = newFinalDestination;
					scansUpdate.push({
						updateOne: {
							filter: { id: scan.id },
							update: { $set: { finalDestination: scan.finalDestination } },
						},
					});
				}
			});

			const scansUpdateResponse = await Scan.bulkWrite(scansUpdate);
			const recalculated = scansUpdateResponse.modifiedCount;

			boxes.forEach((box: any) => {
				const newScans = scans.filter((scan) => scan.boxId === box.id);
				box.scans = newScans;
			});

			const indexing = indexStatusChanges(boxes);
			const response = await Box.bulkWrite(indexing);

			return res.status(200).json({ recalculated, reindexed: response.modifiedCount });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

export default router;