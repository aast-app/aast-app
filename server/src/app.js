import { writeGate } from './middlewares/writeGate.js';
import { protectApi } from './middlewares/session.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { createActionRouter } from './controllers/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null } } }));
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || (process.env.ALLOWED_ORIGINS || 'http://localhost:5174,http://127.0.0.1:5174').split(',').map(value => value.trim()).includes(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased limit for dev
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '50mb' })); // Large payloads for excel/pdf base64 if any
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// Test Route for Browser Testing
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'The Express backend is fully operational!',
    timestamp: new Date().toISOString()
  });
});



import uploadRoutes from './routes/uploadRoutes.js';
import ceptCreateRoutes from './routes/ceptCreateRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import batchRoutes from './routes/batchRoutes.js';

app.use('/api', writeGate, protectApi);

// Mount authenticated API routes
app.use('/api', createActionRouter());
app.use('/api', uploadRoutes);
app.use('/api', ceptCreateRoutes);
app.use('/api', studentRoutes);
app.use('/api', batchRoutes);

// Serve the production browser bundle from the same origin as the API.
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'API route not found.' }));
const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
app.use(express.static(dist));
app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));

// Error Handling Middleware
app.use((err, req, res, _next) => {
  if (!err.status || err.status >= 500) console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.status && err.status < 500 ? err.message : 'The operation could not be completed. No partial import was saved.' });
});

export default app;
