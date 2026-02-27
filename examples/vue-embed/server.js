import express from 'express';
import { createSessionHandler } from '@querri-inc/embed/server/express';

const app = express();
app.use(express.json());

app.post('/api/querri-session', createSessionHandler({
  resolveParams: async () => ({
    user: {
      external_id: 'demo-user',
      email: 'demo@example.com',
    },
    ttl: 3600,
  }),
}));

app.listen(3001, () => console.log('API server running on http://localhost:3001'));
