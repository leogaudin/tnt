import express from 'express';
import Admin from '../models/admins.model.js';
import Box from '../models/boxes.model.js';
import { requireApiKey } from '../service/apiKey.js';
import { handle200Success } from '../service/errorHandlers.js';

const router = express.Router();

/**
 * @swagger
 * /toggle_insights:
 *   post:
 *     summary: Toggle whether the authenticated admin's insights are public
 *     tags: [Insights]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       200: { description: New publicInsights value }
 *       401: { description: Missing API key }
 *       404: { description: Admin not found }
 */
router.post('/toggle_insights', async (req, res) => {
	try {
		const apiKey = req.headers['x-authorization'];

		if (!apiKey)
			return res.status(401).json({ message: 'Unauthorized' });

		const admin = await Admin.findOne({ apiKey });

		if (!admin)
			return res.status(404).json({ message: 'Admin not found' });

		admin.publicInsights = !!!admin.publicInsights;
		await admin.save();
		return res.status(200).json({ message: 'Successfully set insights to ' + admin.publicInsights, publicInsights: admin.publicInsights });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

/**
 * @swagger
 * /is_public/{id}:
 *   get:
 *     summary: Check whether an admin's insights are public
 *     tags: [Insights]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: publicInsights value for this admin }
 *       404: { description: Admin not found }
 */
router.get('/is_public/:id', async (req, res) => {
	try {
		const { id } = req.params;

		const admin = await Admin.findOne({ id });
		if (!admin)
			return res.status(404).json({ message: 'Admin not found' });

		return res.status(200).json({ publicInsights: admin.publicInsights });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: List distinct project names for an admin's boxes
 *     description: Requires an API key unless the admin has publicInsights enabled.
 *     tags: [Insights]
 *     security: [{ apiKeyAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of distinct project names }
 *       404: { description: Admin not found }
 */
router.get('/projects/:id', async (req, res) => {
	const { id } = req.params;
	const user = await Admin.findOne({ id });

	if (!user)
		return res.status(404).json({ message: 'Admin not found' });

	if (!user.publicInsights) {
		requireApiKey(req, res, async (admin) => {
			const projects = await Box.find({ adminId: id }).distinct('project');
			return handle200Success(res, projects);
		});
	}
	else {
		const projects = await Box.find({ adminId: id }).distinct('project');
		return handle200Success(res, projects);
	}
});

export default router;
