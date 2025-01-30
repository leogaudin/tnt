import Box from '../models/boxes.model.js'
import express from 'express'

const router = express.Router();

const phoneField = 'htPhone'; // TODO: move this to boxes.model.js

router.get('/phone/:phone', async (req, res) => {
    try {
        const { phone } = req.params;

        const box = await Box.findOne({ [phoneField]: phone });

        if (!box)
            return res.status(404).json({ exists: false });

        return res.status(200).json({ exists: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/boxes/:phone', async (req, res) => {
    try {
        const { phone } = req.params;

        const boxes = await Box.find(
            { [phoneField]: phone },
            { _id: 0, htPhone: 1, htName: 1, project: 1, content: 1, statusChanges: 1 }
        );

        return res.status(200).json(boxes);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
