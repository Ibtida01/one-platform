/**
 * Security Middleware for ONE Platform
 * Covers: Rate limiting, input sanitization, security headers,
 * request size limits, NID validation, SQL injection prevention
 */

// ─── Simple in-memory rate limiter (no Redis needed for demo) ───────────────
const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;      // per IP per minute for general routes
const MAX_INTAKE = 5;         // per IP per minute for AI intake (expensive)

function getRateLimiter(max = MAX_REQUESTS) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    const record = requestCounts.get(key);

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + WINDOW_MS;
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({
        error: 'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMITED',
        retry_after_seconds: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    next();
  };
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) requestCounts.delete(key);
  }
}, 5 * 60 * 1000);


// ─── Security headers (replaces helmet for zero-dependency) ─────────────────
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data:; connect-src 'self' api.anthropic.com"
  );
  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');
  next();
}


// ─── Input sanitization ──────────────────────────────────────────────────────
function sanitizeString(str, maxLength = 2000) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove SQL injection attempts (basic — pg parameterized queries handle the rest)
    .replace(/(['";\\])/g, (match) => `\\${match}`);
}

function validateIntakeInput(req, res, next) {
  let { rawInput, nationalId } = req.body;

  // Validate National ID: must be 10–17 digits
  if (!nationalId || typeof nationalId !== 'string') {
    return res.status(400).json({ error: 'National ID is required', code: 'MISSING_NID' });
  }
  const nidClean = nationalId.replace(/\s/g, '');
  if (!/^\d{10,17}$/.test(nidClean)) {
    return res.status(400).json({
      error: 'National ID must be 10–17 digits',
      code: 'INVALID_NID',
    });
  }

  // Validate raw input
  if (!rawInput || typeof rawInput !== 'string' || rawInput.trim().length < 2) {
    return res.status(400).json({
      error: 'Please describe what you need (minimum 2 characters)',
      code: 'MISSING_INPUT',
    });
  }
  if (rawInput.length > 1000) {
    return res.status(400).json({
      error: 'Description too long (maximum 1000 characters)',
      code: 'INPUT_TOO_LONG',
    });
  }

  // Sanitize and pass forward
  req.body.nationalId = nidClean;
  req.body.rawInput = sanitizeString(rawInput, 1000);
  next();
}

function validateStatusUpdate(req, res, next) {
  const { status } = req.body;
  const valid = ['waiting', 'serving', 'done'];
  if (!valid.includes(status)) {
    return res.status(400).json({
      error: `Status must be one of: ${valid.join(', ')}`,
      code: 'INVALID_STATUS',
    });
  }
  next();
}

function validateNotes(req, res, next) {
  let { notes } = req.body;
  if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
    return res.status(400).json({ error: 'Notes cannot be empty', code: 'EMPTY_NOTES' });
  }
  req.body.notes = sanitizeString(notes, 2000);
  next();
}


// ─── Admin auth middleware ───────────────────────────────────────────────────
// In production replace with JWT. For demo, use hardcoded token.
const ADMIN_TOKEN = Buffer.from('admin:demo2024').toString('base64');

function requireAdmin(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Basic ', '');
  if (token !== ADMIN_TOKEN) {
    res.setHeader('WWW-Authenticate', 'Basic realm="ONE Admin"');
    return res.status(401).json({ error: 'Admin authentication required', code: 'UNAUTHORIZED' });
  }
  next();
}


// ─── Request ID for tracing ──────────────────────────────────────────────────
let reqCounter = 0;
function requestId(req, res, next) {
  reqCounter += 1;
  req.requestId = `REQ-${Date.now()}-${reqCounter}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
}


// ─── Audit logger ────────────────────────────────────────────────────────────
function auditLog(req, res, next) {
  const start = Date.now();
  const ip = req.ip || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(
      `[${level}] ${new Date().toISOString()} | ${req.requestId} | ${ip} | ${req.method} ${req.path} | ${res.statusCode} | ${duration}ms`
    );
  });

  next();
}


module.exports = {
  getRateLimiter,
  securityHeaders,
  validateIntakeInput,
  validateStatusUpdate,
  validateNotes,
  requireAdmin,
  requestId,
  auditLog,
  // Pre-configured limiters
  intakeLimiter: getRateLimiter(MAX_INTAKE),
  generalLimiter: getRateLimiter(MAX_REQUESTS),
};
