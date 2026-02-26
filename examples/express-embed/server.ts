import express from 'express';
import { createSessionHandler } from '@querri-inc/embed/server/express';

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/querri-session', createSessionHandler());

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
