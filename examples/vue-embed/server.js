import express from 'express';
import { Querri } from '@querri/embed/server';

const app = express();
app.use(express.json());

const client = new Querri({
  apiKey: process.env.QUERRI_API_KEY,
  orgId: process.env.QUERRI_ORG_ID,
});

app.post('/api/querri-session', async (req, res) => {
  try {
    const session = await client.getSession(req.body);
    res.json(session);
  } catch (err) {
    console.error('Session error:', err);
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('API server running on http://localhost:3001'));
