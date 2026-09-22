/**
 * News Pulse Backend Express Server.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging in dev
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Mount routes at both root and /api for full compatibility
app.use('/api', routes);
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server if not running in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n==============================================`);
    console.log(`🚀 News Pulse API running on port ${PORT} (0.0.0.0)`);
    console.log(`📊 Endpoints:`);
    console.log(`   - GET  /`);
    console.log(`   - GET  /health`);
    console.log(`   - GET  /clusters`);
    console.log(`   - GET  /clusters/:id`);
    console.log(`   - GET  /timeline`);
    console.log(`   - POST /ingest/trigger`);
    console.log(`   - GET  /ingest/status/:jobId`);
    console.log(`==============================================\n`);
  });
}

module.exports = app;
