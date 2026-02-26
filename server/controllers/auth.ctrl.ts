import Admin from '../models/admins.model.js';
import express, { Request, Response } from 'express';
import { generateApiKey, requireApiKey } from '../service/apiKey.js';
import { generateId } from '../service/index.js';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
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

router.post('/register', async (req: Request, res: Response) => {
	try {
		const { username, password } = req.body;

		if (!username || !password)
			return res.status(400).json({ message: 'Missing username, password or name' });

		const existent = await Admin.findOne({ email: username });
		if (existent)
			return res.status(409).json({
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

router.get('/me', async (req: Request, res: Response) => {
	try {
		requireApiKey(req, res, (admin) => {
			return res.status(200).json({ user: admin });
		});
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

export default router;