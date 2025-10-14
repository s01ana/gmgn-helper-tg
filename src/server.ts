import express from 'express';
import cors from 'cors';

import { Setting } from './schema/setting';
import createOrder from './order';

const initServer = () => {
    const app = express();
    const port = 3000;

    app.use(cors());
    app.use(express.json());

    app.get('/', async (req, res) => {
        res.json({ message: 'Server running...' });
    });

    app.post('/connect', async (req, res) => {
        const data = req.body;
        console.log(`connect, data: `, data);
        try {
            const userId = Number(data.userId);
            console.log('connect request userId: ', userId);
            // const setting = SettingsCache.get(userId);
            const setting = await Setting.findOne({ chatId: userId });
            if (setting) {
                res.json({ result: true, message: 'Connected.' });
            } else {
                res.json({ result: false, message: 'Invalid User ID.' });
            }
        } catch (error) {
            res.json({ result: false, message: 'Invalid User ID.' });
        }
    });

    app.post('/order/create', async (req, res) => {
        const data = req.body;
        const result = await createOrder(data);
        res.json(result);
    });

    app.listen(port, () => {
        console.log(`HTTP Server running on port ${port}`);
    });
}

export default initServer;