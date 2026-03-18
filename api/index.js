/**
 * MediSetu — api/index.js
 * Vercel serverless entry point.
 * Wraps the full Express app for serverless deployment.
 * MongoDB connection is cached across invocations (critical for serverless).
 */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');

// ── Routes ────────────────────────────────────────────────────
const authRoutes     = require('../routes/auth');
const medicineRoutes = require('../routes/medicines');
const requestRoutes  = require('../routes/requests');
const userRoutes     = require('../routes/users');
const alertRoutes    = require('../routes/alerts');

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://medi-setu-inc.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    /\.vercel\.app$/,           // allow all Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/requests',  requestRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/alerts',    alertRoutes);

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MediSetu API',
    platform: 'Vercel Serverless',
    time: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
  });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// ── Error ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── MongoDB — cached connection (essential for serverless) ────
let cachedDb = null;

async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  cachedDb = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });
  console.log('✅ MongoDB connected (serverless)');
  return cachedDb;
}

// ── Vercel handler ────────────────────────────────────────────
module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};
