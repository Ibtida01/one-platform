require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { runMigrations } = require('./db');
const { securityHeaders, requestId, auditLog, generalLimiter, intakeLimiter } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(requestId);
app.use(auditLog);
app.use(securityHeaders);
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(generalLimiter);

// Routes
app.use('/api/intake',       intakeLimiter, require('./routes/intake'));
app.use('/api/tickets',      require('./routes/tickets'));
app.use('/api/queue',        require('./routes/tickets'));
app.use('/api/citizens',     require('./routes/citizens'));
app.use('/api/services',     require('./routes/services'));
app.use('/api/stats',        require('./routes/stats'));
app.use('/api/officers',     require('./routes/officers'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/feedback',     require('./routes/feedback'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    ai_provider: process.env.AI_PROVIDER || 'groq',
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.requestId}:`, err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message,
    code: err.code || 'SERVER_ERROR',
    request_id: req.requestId,
  });
});

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`\n🚀 ONE Platform running on http://localhost:${PORT}`);
      console.log(`   AI Provider : ${process.env.AI_PROVIDER || 'groq'}`);
      console.log(`   Database    : ${process.env.DATABASE_URL ? '✅' : '❌ NOT SET'}`);
      console.log(`   Groq Key    : ${process.env.GROQ_API_KEY ? '✅' : '❌ NOT SET'}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
