import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import compression from 'compression';

import boxesController from './controllers/boxes.ctrl.js';
import scansController from './controllers/scans.ctrl.js';
import authController from './controllers/auth.ctrl.js';
import insightsController from './controllers/insights.ctrl.js';
import inventoryController from './controllers/inventory.ctrl.js';

dotenv.config();

import mongoose from 'mongoose';
const mongoString = process.env.STRING_URI;

mongoose.connect(mongoString, {
	serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
	socketTimeoutMS: 300000, // Close sockets after 5 minutes of inactivity
});
const database = mongoose.connection;

database.on('error', (error) => {
	console.error(error)
})

database.once('connected', () => {
	console.info('Database Connected');
})

const app = express();
app.disable('x-powered-by');
const apiPort = 3000;
const payloadLimit = '4.5mb';

app.use(compression({
	threshold: 0,
}));
app.use(bodyParser.urlencoded({ extended: true, limit: payloadLimit }));
app.use(
	cors({
		origin: '*',
		methods: 'GET,POST,PUT,DELETE, PATCH',
		credentials: true,
		maxAge: 3600,
	})
);
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: payloadLimit }));
app.use(bodyParser.json({ limit: payloadLimit }));

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.use('/api/boxes', boxesController);
app.use('/api/scan', scansController);
app.use('/api/auth', authController);
app.use('/api/insights', insightsController);
app.use('/api/inventory', inventoryController);

app.listen(apiPort, () => console.info(`Server running on port ${apiPort}`));

export default app;
