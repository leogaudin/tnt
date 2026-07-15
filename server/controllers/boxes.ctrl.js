import express from 'express';
import Admin from '../models/admins.model.js';
import Box from '../models/boxes.model.js';
import Scan from '../models/scans.model.js';
import {
	createOne,
	createMany,
	deleteOne,
	getById,
	getAll,
	deleteMany,
} from '../service/crud.js';
import { requireApiKey } from '../service/apiKey.js';
import { isFinalDestination, getQuery } from '../service/index.js';
import { indexStatusChanges } from '../service/stats.js';

const router = express.Router();

/**
 * @swagger
 * /box:
 *   post:
 *     summary: Create a single box
 *     tags: [Boxes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Box'
 *     responses:
 *       200: { description: Box created }
 */
router.post('/box', createOne(Box));

/**
 * @swagger
 * /boxes:
 *   post:
 *     summary: Create many boxes
 *     tags: [Boxes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Box'
 *     responses:
 *       200: { description: Boxes created }
 */
router.post('/boxes', createMany(Box));

/**
 * @swagger
 * /box/{id}:
 *   delete:
 *     summary: Delete a box by id
 *     tags: [Boxes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Box deleted }
 */
router.delete('/box/:id', deleteOne(Box));

/**
 * @swagger
 * /boxes:
 *   delete:
 *     summary: Delete many boxes matching a filter
 *     tags: [Boxes]
 *     responses:
 *       200: { description: Boxes deleted }
 */
router.delete('/boxes', deleteMany(Box))
// router.get('/box/:id', getById(Box));
// router.get('/boxes', getAll(Box));

/**
 * @swagger
 * /boxes/query:
 *   post:
 *     summary: Retrieve all boxes for the authenticated admin matching the provided filters
 *     tags: [Boxes]
 *     security: [{ apiKeyAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skip: { type: integer }
 *               limit: { type: integer }
 *               filters: { type: object }
 *     responses:
 *       200: { description: Matching boxes }
 *       404: { description: No boxes available }
 */
router.post('/boxes/query', async (req, res) => {
	try {
		requireApiKey(req, res, async (admin) => {
			const found = await Admin.findOne({ id: admin.id });
			if (!found)
				return res.status(404).json({ error: `Admin not found` });

			const { skip, limit, filters } = getQuery(req);

			const boxes = await Box
				.find(
					{ ...filters, adminId: admin.id },
					{ scans: 0 },
				)
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

/**
 * @swagger
 * /boxes/count:
 *   post:
 *     summary: Retrieve the count of boxes for the authenticated admin matching the provided filters
 *     tags: [Boxes]
 *     security: [{ apiKeyAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filters: { type: object }
 *     responses:
 *       200: { description: Box count }
 */
router.post('/boxes/count', async (req, res) => {
	try {
		requireApiKey(req, res, async (admin) => {
			const { filters } = getQuery(req);
			const count = await Box.countDocuments({ ...filters, adminId: admin.id });
			return res.status(200).json({ count });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error });
	}
});

/**
 * @swagger
 * /box/{id}:
 *   get:
 *     summary: Get a box by id, scoped to the authenticated admin
 *     tags: [Boxes]
 *     security: [{ apiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: The box }
 *       404: { description: Box not found }
 */
router.get('/box/:id', async (req, res) => {
	try {
		requireApiKey(req, res, async (admin) => {
			const box = await Box.findOne({ id: req.params.id, adminId: admin.id });
			if (!box)
				return res.status(404).json({ success: false, error: `Box not found` });

			return res.status(200).json({ success: true, data: { box } });
		});
	}
	catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error: error });
	}
});

/**
 * @swagger
 * /boxes/{adminId}:
 *   get:
 *     summary: List boxes for an admin
 *     description: Returns a reduced projection (statusChanges + project only) with no auth if the admin has publicInsights enabled; otherwise requires the admin's own API key.
 *     tags: [Boxes]
 *     security: [{ apiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: skip
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Boxes for this admin }
 *       401: { description: API key does not match this adminId }
 *       404: { description: Admin not found or no boxes available }
 */
router.get('/boxes/:adminId', async (req, res) => {
	try {
		const found = await Admin.findOne({ id: req.params.adminId });
		if (!found)
			return res.status(404).json({ success: false, error: `Admin not found` });

		if (found.publicInsights && !req.headers['x-authorization']) {
			const boxes = await Box.find({ adminId: req.params.adminId }, 'statusChanges project').skip(parseInt(req.query.skip)).limit(parseInt(req.query.limit));

			if (!boxes.length)
				return res.status(404).json({ success: false, error: `No boxes available` });

			return res.status(200).json({
				success: true,
				data: {
					boxes: boxes.map(box => ({
						statusChanges: box.statusChanges,
						project: box.project,
					}))
				}
			});
		}

		requireApiKey(req, res, async (admin) => {
			if (admin.id !== req.params.adminId)
				return res.status(401).json({ success: false, error: `Unauthorized` });

			const boxes = await Box.find({ adminId: req.params.adminId }, { scans: 0 }).skip(parseInt(req.query.skip)).limit(parseInt(req.query.limit));

			if (!boxes.length)
				return res.status(404).json({ success: false, error: `No boxes available` });

			return res.status(200).json({ success: true, data: { boxes } });
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error: error });
	}
});

/**
 * @swagger
 * /boxes/coords:
 *   post:
 *     summary: Bulk-update school coordinates for matching boxes and recalculate affected scans
 *     tags: [Boxes]
 *     security: [{ apiKeyAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coords]
 *             properties:
 *               coords:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     school: { type: string }
 *                     district: { type: string }
 *                     schoolLatitude: { type: number }
 *                     schoolLongitude: { type: number }
 *     responses:
 *       200: { description: Counts of boxes updated/matched and scans recalculated }
 */
router.post('/boxes/coords', async (req, res) => {
	try {
		requireApiKey(req, res, async (admin) => {
			const { coords } = req.body;
			const coordsUpdate = coords.map((box) => {
				return {
					updateMany: {
						filter: { school: box.school, district: box.district, adminId: admin.id },
						update: { $set: { schoolLatitude: box.schoolLatitude, schoolLongitude: box.schoolLongitude } },
						multi: true,
					},
				};
			});

			const coordsUpdateResult = await Box.bulkWrite(coordsUpdate);
			const updated = coordsUpdateResult.modifiedCount;
			const matched = coordsUpdateResult.matchedCount;

			if (updated === 0)
				return res.status(200).json({ updated, matched, recalculated: 0 });

			const boxes = await Box
				.find(
					{
						adminId: admin.id,
						$or: coords.map((box) => ({ school: box.school, district: box.district }))
					},
					{ schoolLatitude: 1, schoolLongitude: 1, id: 1, _id: 0 }
				);

			const scans = await Scan.find({ boxId: { $in: boxes.map((box) => box.id) } });

			const scansUpdate = [];

			scans.forEach((scan) => {
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

			boxes.forEach((box) => {
				const newScans = scans.filter((scan) => scan.boxId === box.id);
				box.scans = newScans;
			});

			const indexing = indexStatusChanges(boxes);
			await Box.bulkWrite(indexing);

			return res.status(200).json({ updated, matched, recalculated });
		});
	} catch (error) {
		console.error(error);
		return res.status(400).json({ success: false, error: error });
	}
});

/**
 * @swagger
 * /boxes/reindex:
 *   post:
 *     summary: Recompute statusChanges/progress indexing for all of the authenticated admin's boxes
 *     tags: [Boxes]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       200: { description: Number of boxes reindexed }
 *       404: { description: No boxes available }
 */
router.post('/boxes/reindex', async (req, res) => {
	try {
		requireApiKey(req, res, async (admin) => {
			const boxes = await Box.find({ adminId: admin.id });
			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			const scans = await Scan.find({ boxId: { $in: boxes.map((box) => box.id) } });

			boxes.forEach((box) => {
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

/**
 * @swagger
 * /boxes/recalculate:
 *   post:
 *     summary: Recalculate finalDestination for all scans and reindex boxes for the authenticated admin
 *     tags: [Boxes]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       200: { description: Number of scans recalculated and boxes reindexed }
 *       404: { description: No boxes available }
 */
router.post('/boxes/recalculate', async (req, res) => {
	try {
		requireApiKey(req, res, async (admin) => {
			const boxes = await Box.find({ adminId: admin.id });
			if (!boxes.length)
				return res.status(404).json({ error: `No boxes available` });

			const scans = await Scan.find({ boxId: { $in: boxes.map((box) => box.id) } });

			const scansUpdate = [];

			scans.forEach((scan) => {
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

			boxes.forEach((box) => {
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
