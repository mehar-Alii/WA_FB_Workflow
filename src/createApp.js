'use strict';

const express = require('express');
const cors = require('cors');
const config = require('./config');
const webhookRoutes = require('./routes/webhook');
const productRoutes = require('./routes/products');

const app = express();
app.disable('x-powered-by');

// Keep the raw body: Meta's webhook signature is computed over the exact bytes.
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// API responses hold private data (cost prices) — never cache them.
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/webhook', webhookRoutes);

// Frontend and API share one origin on Vercel, so CORS is only needed if you
// host the frontend somewhere else — list those origins in ALLOWED_ORIGINS.
if (config.allowedOrigins.length > 0) {
  app.use('/api', cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }));
}
app.use('/api/products', productRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
