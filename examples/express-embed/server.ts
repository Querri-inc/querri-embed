import express from 'express';
import { readFileSync } from 'fs';
import { createSessionHandler } from '@querri-inc/embed/server/express';

const app = express();
app.use(express.json());

const querriUrl = process.env.QUERRI_URL || 'https://app.querri.com';

// Serve index.html with QUERRI_URL injected
const indexHtml = readFileSync('public/index.html', 'utf-8');
app.get('/', (_req, res) => {
  res.type('html').send(
    indexHtml.replace('</head>', `<script>window.__QUERRI_URL__="${querriUrl}"</script></head>`),
  );
});

app.use(express.static('public'));
app.post('/api/querri-session', createSessionHandler());

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
