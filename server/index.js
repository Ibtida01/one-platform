require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { runMigrations } = require('./db');
const {
  securityHeaders, requestId, auditLog,
  generalLimiter, intakeLimiter,
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Core middleware ──────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(requestId);
app.use(auditLog);
app.use(securityHeaders);
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '50kb' }));   // reject huge payloads
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/intake',   intakeLimiter, require('./routes/intake'));
app.use('/api/tickets',  require('./routes/tickets'));
app.use('/api/queue',    require('./routes/tickets'));
app.use('/api/citizens', require('./routes/citizens'));
app.use('/api/services', require('./routes/services'));
app.use('/api/stats',    require('./routes/stats'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Static frontend (production) ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.requestId}:`, err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An internal error occurred'
      : err.message,
    code: err.code || 'SERVER_ERROR',
    request_id: req.requestId,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`\n🚀 ONE Platform running on http://localhost:${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Database    : ${process.env.DATABASE_URL ? '✅ connected' : '❌ NOT SET'}`);
      console.log(`   AI          : ${process.env.ANTHROPIC_API_KEY ? '✅ configured' : '❌ NOT SET'}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
