import Admin from '../models/admins.model.js'
import express from 'express'
import { generateApiKey, requireApiKey } from '../service/apiKey.js';
import { generateId } from '../service/index.js';
import { handle200Success } from '../service/errorHandlers.js';

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in an admin
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, description: Admin email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Logged in, returns the admin }
 *       400: { description: Missing username or password }
 *       401: { description: Invalid password }
 *       404: { description: No user with this username }
 */
router.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body;
		if (!username || !password)
			return res.status(400).json({ message: 'Missing username or password' });

		const user = await Admin.findOne({ email: username });
		if (!user)
			return res.status(404).json({ message: 'A user with this username does not exist' });

		if (password !== user.password)
			return res.status(401).json({ message: 'Invalid password' });

		return res.status(200).json({ user });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new admin and receive an API key
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, description: Admin email }
 *               password: { type: string }
 *     responses:
 *       201: { description: Admin created, returns the admin including apiKey }
 *       400: { description: Missing username or password }
 *       409: { description: User with this email already exists }
 */
router.post('/register', async (req, res) => {
	try {
		const { username, password } = req.body;

		if (!username || !password)
			return res.status(400).json({ message: 'Missing username, password or name' });

		const existent = await Admin.findOne({ email: username });
		if (existent)
			return res.status(409).json({
				success: false,
				error: `User with ID ${existent.id} already exists`,
			});

		const createdAt = new Date().getTime();

		const id = generateId();

		const apiKey = generateApiKey();
		const user = { id, email: username, password, apiKey, createdAt, publicInsights: false };

		const instance = new Admin(user);
		await instance.save();

		return res.status(201).json({ user });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Get the authenticated admin
 *     tags: [Auth]
 *     security: [{ apiKeyAuth: [] }]
 *     responses:
 *       200: { description: The authenticated admin }
 *       401: { description: Missing or invalid API key }
 */
router.get('/me', async (req, res) => {
	try {
		requireApiKey(req, res, (admin) => {
			return handle200Success(res, admin);
		})
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
})

export default router;
