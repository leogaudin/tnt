import { Request, Response } from 'express';
import Admin from '../models/admins.model.js';
import { generateId } from './index.js';

export const generateApiKey = (): string => {
	return generateId();
};

export const requireApiKey = async (
	req: Request,
	res: Response,
	next: (admin: any) => any,
) => {
	if (!req.headers['x-authorization']) {
		return res.status(401).json({ error: 'API key required' });
	}

	const apiKey = req.headers['x-authorization'];
	const admin = await Admin.findOne({ apiKey });

	if (!admin) {
		return res.status(401).json({ error: 'Invalid API key' });
	}

	return next(admin);
};