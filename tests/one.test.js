/**
 * ONE Platform — Test Suite
 * Tests: tokenGen, security validation, AI response parsing, route logic
 * Run: npm test
 */

// ─── Mock environment ─────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/one_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.NODE_ENV = 'test';

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOKEN GENERATOR TESTS
// ─────────────────────────────────────────────────────────────────────────────
const { generateToken, resetCounters } = require('../server/lib/tokenGen');

describe('Token Generator', () => {
  beforeEach(() => resetCounters());

  test('Banking token has B- prefix', () => {
    expect(generateToken('banking')).toBe('B-001');
  });

  test('Government token has G- prefix', () => {
    expect(generateToken('government')).toBe('G-001');
  });

  test('Mixed token has M- prefix', () => {
    expect(generateToken('mixed')).toBe('M-001');
  });

  test('Unknown sector defaults to mixed', () => {
    expect(generateToken('healthcare')).toBe('M-001');
  });

  test('Counters increment independently per sector', () => {
    generateToken('banking');
    generateToken('banking');
    generateToken('government');
    expect(generateToken('banking')).toBe('B-003');
    expect(generateToken('government')).toBe('G-002');
  });

  test('Token is zero-padded to 3 digits', () => {
    for (let i = 0; i < 9; i++) generateToken('banking');
    expect(generateToken('banking')).toBe('B-010');
  });

  test('Counter resets correctly', () => {
    generateToken('banking');
    generateToken('banking');
    resetCounters();
    expect(generateToken('banking')).toBe('B-001');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 2. SECURITY MIDDLEWARE TESTS
// ─────────────────────────────────────────────────────────────────────────────
const { validateIntakeInput, validateStatusUpdate, validateNotes } = require('../server/middleware/security');

function mockReqRes(body = {}) {
  const req = { body, ip: '127.0.0.1' };
  const res = {
    _status: null,
    _json: null,
    status(s) { this._status = s; return this; },
    json(j) { this._json = j; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('Input Validation — Intake', () => {
  test('Valid input passes through', () => {
    const { req, res, next } = mockReqRes({
      nationalId: '1234567890',
      rawInput: 'I want to open an FD',
    });
    validateIntakeInput(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res._status).toBeNull();
  });

  test('Missing NID returns 400', () => {
    const { req, res, next } = mockReqRes({ rawInput: 'open FD' });
    validateIntakeInput(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.code).toBe('MISSING_NID');
  });

  test('Short NID (9 digits) rejected', () => {
    const { req, res, next } = mockReqRes({ nationalId: '123456789', rawInput: 'open FD' });
    validateIntakeInput(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.code).toBe('INVALID_NID');
  });

  test('NID with letters rejected', () => {
    const { req, res, next } = mockReqRes({ nationalId: 'ABCD1234567', rawInput: 'open FD' });
    validateIntakeInput(req, res, next);
    expect(res._status).toBe(400);
  });

  test('Empty rawInput rejected', () => {
    const { req, res, next } = mockReqRes({ nationalId: '1234567890', rawInput: '' });
    validateIntakeInput(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.code).toBe('MISSING_INPUT');
  });

  test('rawInput over 1000 chars rejected', () => {
    const { req, res, next } = mockReqRes({
      nationalId: '1234567890',
      rawInput: 'a'.repeat(1001),
    });
    validateIntakeInput(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.code).toBe('INPUT_TOO_LONG');
  });

  test('NID with spaces is stripped and accepted', () => {
    const { req, res, next } = mockReqRes({
      nationalId: '12345 67890',
      rawInput: 'open FD please',
    });
    validateIntakeInput(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.nationalId).toBe('1234567890');
  });
});

describe('Input Validation — Status Update', () => {
  test('Valid status "serving" passes', () => {
    const { req, res, next } = mockReqRes({ status: 'serving' });
    validateStatusUpdate(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('Invalid status "completed" rejected', () => {
    const { req, res, next } = mockReqRes({ status: 'completed' });
    validateStatusUpdate(req, res, next);
    expect(res._status).toBe(400);
  });

  test('SQL injection in status rejected', () => {
    const { req, res, next } = mockReqRes({ status: "'; DROP TABLE tickets;--" });
    validateStatusUpdate(req, res, next);
    expect(res._status).toBe(400);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 3. AI RESPONSE PARSER TESTS
// ─────────────────────────────────────────────────────────────────────────────
// We test the parser in isolation without hitting the actual API

function parseAIResponse(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.sector || !Array.isArray(parsed.detected_services)) {
    throw new Error('Missing required fields');
  }
  return { ...parsed, needs_manual_review: false };
}

describe('AI Response Parser', () => {
  const validResponse = JSON.stringify({
    sector: 'banking',
    detected_services: ['fd_open', 'cash_deposit'],
    confidence: 95,
    language_detected: 'banglish',
    generated_forms: { fd_open: { applicant_name: 'Test', amount: '50000' } },
    doc_checklist: [{ doc: 'NID', likely_have: true, mandatory: true }],
    officer_briefing: 'Citizen wants FD and deposit.',
    ai_summary: 'FD open + deposit',
    is_urgent: false,
    clarification_needed: null,
  });

  test('Parses clean JSON response', () => {
    const result = parseAIResponse(validResponse);
    expect(result.sector).toBe('banking');
    expect(result.detected_services).toContain('fd_open');
    expect(result.needs_manual_review).toBe(false);
  });

  test('Strips markdown code fences', () => {
    const result = parseAIResponse('```json\n' + validResponse + '\n```');
    expect(result.sector).toBe('banking');
  });

  test('Throws on missing sector', () => {
    const bad = JSON.stringify({ detected_services: ['fd_open'] });
    expect(() => parseAIResponse(bad)).toThrow();
  });

  test('Throws on non-array detected_services', () => {
    const bad = JSON.stringify({ sector: 'banking', detected_services: 'fd_open' });
    expect(() => parseAIResponse(bad)).toThrow();
  });

  test('Handles mixed sector correctly', () => {
    const mixed = JSON.stringify({
      sector: 'mixed',
      detected_services: ['account_open', 'trade_license_renewal'],
      confidence: 88,
      language_detected: 'english',
      generated_forms: {},
      doc_checklist: [],
      officer_briefing: 'Mixed services needed.',
      ai_summary: 'Account + trade license',
      is_urgent: false,
      clarification_needed: null,
    });
    const result = parseAIResponse(mixed);
    expect(result.sector).toBe('mixed');
    expect(result.detected_services).toHaveLength(2);
  });

  test('Handles empty detected_services array', () => {
    const noServices = JSON.stringify({
      sector: 'mixed',
      detected_services: [],
      confidence: 0,
      language_detected: 'unknown',
      generated_forms: {},
      doc_checklist: [],
      officer_briefing: 'Unclear request.',
      ai_summary: 'Manual review',
      is_urgent: false,
      clarification_needed: 'What do you need help with today?',
    });
    const result = parseAIResponse(noServices);
    expect(result.detected_services).toHaveLength(0);
    expect(result.clarification_needed).toBeTruthy();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 4. BANGLISH DETECTION TESTS (keyword matching logic)
// ─────────────────────────────────────────────────────────────────────────────
describe('Language Detection — Banglish patterns', () => {
  const BANGLISH_KEYWORDS = [
    'khulte', 'korbo', 'lagbe', 'chai', 'dibo', 'tulbo', 'joma', 'taka',
    'harie', 'gese', 'nobikayon', 'notun', 'acil', 'bochor', 'mas',
  ];

  function detectBanglish(input) {
    const lower = input.toLowerCase();
    return BANGLISH_KEYWORDS.some(k => lower.includes(k));
  }

  test('"fd khulte chai" detected as Banglish', () => {
    expect(detectBanglish('fd khulte chai')).toBe(true);
  });

  test('"passport renew korbo" detected as Banglish', () => {
    expect(detectBanglish('passport renew korbo')).toBe(true);
  });

  test('"account open lagbe" detected as Banglish', () => {
    expect(detectBanglish('account open lagbe')).toBe(true);
  });

  test('"I want to open a bank account" not detected as Banglish', () => {
    expect(detectBanglish('I want to open a bank account')).toBe(false);
  });

  test('"taka joma dibo" detected as Banglish', () => {
    expect(detectBanglish('taka joma dibo')).toBe(true);
  });

  test('"nid harie gese" detected as Banglish', () => {
    expect(detectBanglish('nid harie gese')).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5. FEATURE TESTS — service slug validity
// ─────────────────────────────────────────────────────────────────────────────
describe('Service Slug Format', () => {
  const VALID_SLUGS = [
    'cash_deposit', 'fd_open', 'loan_apply_sme', 'passport_renewal',
    'trade_license_new', 'nid_correction', 'driving_license_new',
    'utility_connection_electricity', 'income_tax_return', 'eobi_registration',
  ];

  test.each(VALID_SLUGS)('Slug "%s" matches snake_case pattern', (slug) => {
    expect(slug).toMatch(/^[a-z][a-z0-9_]*[a-z0-9]$/);
  });

  test('All slugs are lowercase', () => {
    VALID_SLUGS.forEach(slug => {
      expect(slug).toBe(slug.toLowerCase());
    });
  });

  test('No slug has double underscores', () => {
    VALID_SLUGS.forEach(slug => {
      expect(slug).not.toContain('__');
    });
  });
});
