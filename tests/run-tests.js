// ONE Platform — Manual Test Runner
// Run with: node tests/run-tests.js

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/one_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.NODE_ENV = 'test';

const { generateToken, resetCounters } = require('../server/lib/tokenGen');
const { validateIntakeInput, validateStatusUpdate } = require('../server/middleware/security');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  PASS: ' + name);
    passed++;
  } catch (e) {
    console.log('  FAIL: ' + name + ' --> ' + e.message);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function mockReqRes(body) {
  const req = { body: { ...body }, ip: '127.0.0.1' };
  const res = {
    _status: null,
    _json: null,
    status(s) { this._status = s; return this; },
    json(j) { this._json = j; return this; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  next.wasCalled = () => nextCalled;
  return { req, res, next };
}

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

const BANGLISH_KEYWORDS = [
  'khulte', 'korbo', 'lagbe', 'chai', 'dibo', 'tulbo',
  'joma', 'taka', 'harie', 'gese', 'nobikayon', 'bochor',
];
function isBanglish(input) {
  return BANGLISH_KEYWORDS.some(k => input.toLowerCase().includes(k));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 1. TOKEN GENERATOR ═══');

resetCounters();
test('B- prefix for banking', () => assert(generateToken('banking') === 'B-001'));

resetCounters();
test('G- prefix for government', () => assert(generateToken('government') === 'G-001'));

resetCounters();
test('M- prefix for mixed', () => assert(generateToken('mixed') === 'M-001'));

resetCounters();
test('Unknown sector defaults to mixed (M-)', () => assert(generateToken('healthcare') === 'M-001'));

resetCounters();
test('Counters are independent per sector', () => {
  generateToken('banking');
  generateToken('banking');
  generateToken('government');
  assert(generateToken('banking') === 'B-003', 'Banking should be B-003');
  assert(generateToken('government') === 'G-002', 'Government should be G-002');
});

resetCounters();
test('Token zero-padded to 3 digits', () => {
  for (let i = 0; i < 9; i++) generateToken('banking');
  assert(generateToken('banking') === 'B-010');
});

resetCounters();
test('Reset works correctly', () => {
  generateToken('banking');
  generateToken('banking');
  resetCounters();
  assert(generateToken('banking') === 'B-001');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 2. INPUT VALIDATION ═══');

test('Valid NID + input passes next()', () => {
  const { req, res, next } = mockReqRes({ nationalId: '1234567890', rawInput: 'open FD please' });
  validateIntakeInput(req, res, next);
  assert(next.wasCalled(), 'next() should have been called');
  assert(res._status === null, 'Should not set error status');
});

test('Missing NID returns 400', () => {
  const { req, res, next } = mockReqRes({ rawInput: 'open FD' });
  validateIntakeInput(req, res, next);
  assert(res._status === 400, 'Expected 400');
  assert(res._json.code === 'MISSING_NID');
});

test('9-digit NID rejected', () => {
  const { req, res, next } = mockReqRes({ nationalId: '123456789', rawInput: 'open FD' });
  validateIntakeInput(req, res, next);
  assert(res._status === 400);
  assert(res._json.code === 'INVALID_NID');
});

test('17-digit NID accepted', () => {
  const { req, res, next } = mockReqRes({ nationalId: '12345678901234567', rawInput: 'open FD' });
  validateIntakeInput(req, res, next);
  assert(next.wasCalled(), 'next() should have been called for 17-digit NID');
});

test('18-digit NID rejected', () => {
  const { req, res, next } = mockReqRes({ nationalId: '123456789012345678', rawInput: 'open FD' });
  validateIntakeInput(req, res, next);
  assert(res._status === 400);
});

test('NID with letters rejected', () => {
  const { req, res, next } = mockReqRes({ nationalId: 'ABCD1234567', rawInput: 'open FD' });
  validateIntakeInput(req, res, next);
  assert(res._status === 400);
});

test('Empty rawInput returns 400', () => {
  const { req, res, next } = mockReqRes({ nationalId: '1234567890', rawInput: '' });
  validateIntakeInput(req, res, next);
  assert(res._status === 400);
  assert(res._json.code === 'MISSING_INPUT');
});

test('Single char rawInput rejected', () => {
  const { req, res, next } = mockReqRes({ nationalId: '1234567890', rawInput: 'x' });
  validateIntakeInput(req, res, next);
  assert(res._status === 400);
});

test('rawInput over 1000 chars rejected', () => {
  const { req, res, next } = mockReqRes({ nationalId: '1234567890', rawInput: 'a'.repeat(1001) });
  validateIntakeInput(req, res, next);
  assert(res._status === 400);
  assert(res._json.code === 'INPUT_TOO_LONG');
});

test('NID with spaces gets stripped and accepted', () => {
  const { req, res, next } = mockReqRes({ nationalId: '12345 67890', rawInput: 'open FD please' });
  validateIntakeInput(req, res, next);
  assert(next.wasCalled(), 'next() should have been called');
  assert(req.body.nationalId === '1234567890', 'Spaces should be stripped');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 3. STATUS VALIDATION ═══');

test('Status "waiting" passes', () => {
  const { req, res, next } = mockReqRes({ status: 'waiting' });
  validateStatusUpdate(req, res, next);
  assert(next.wasCalled());
});

test('Status "serving" passes', () => {
  const { req, res, next } = mockReqRes({ status: 'serving' });
  validateStatusUpdate(req, res, next);
  assert(next.wasCalled());
});

test('Status "done" passes', () => {
  const { req, res, next } = mockReqRes({ status: 'done' });
  validateStatusUpdate(req, res, next);
  assert(next.wasCalled());
});

test('Status "completed" rejected', () => {
  const { req, res, next } = mockReqRes({ status: 'completed' });
  validateStatusUpdate(req, res, next);
  assert(res._status === 400);
});

test('SQL injection in status rejected', () => {
  const { req, res, next } = mockReqRes({ status: "'; DROP TABLE tickets;--" });
  validateStatusUpdate(req, res, next);
  assert(res._status === 400);
});

test('Empty status rejected', () => {
  const { req, res, next } = mockReqRes({ status: '' });
  validateStatusUpdate(req, res, next);
  assert(res._status === 400);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 4. AI RESPONSE PARSER ═══');

const validAI = JSON.stringify({
  sector: 'banking',
  detected_services: ['fd_open', 'cash_deposit'],
  confidence: 95,
  language_detected: 'banglish',
  generated_forms: { fd_open: { applicant_name: 'Test', amount: '50000', tenure_months: '36' } },
  doc_checklist: [{ doc: 'NID', likely_have: true, mandatory: true }],
  officer_briefing: 'Citizen wants FD and deposit.',
  ai_summary: 'FD open + deposit',
  is_urgent: false,
  clarification_needed: null,
});

test('Parses clean JSON response', () => {
  const r = parseAIResponse(validAI);
  assert(r.sector === 'banking');
  assert(r.detected_services.includes('fd_open'));
  assert(r.needs_manual_review === false);
});

test('Detected services array has correct length', () => {
  const r = parseAIResponse(validAI);
  assert(r.detected_services.length === 2, 'Expected 2 services');
});

test('Generated form fields preserved', () => {
  const r = parseAIResponse(validAI);
  assert(r.generated_forms.fd_open.amount === '50000');
  assert(r.generated_forms.fd_open.tenure_months === '36');
});

test('Throws on missing sector field', () => {
  const bad = JSON.stringify({ detected_services: ['fd_open'] });
  try {
    parseAIResponse(bad);
    throw new Error('Should have thrown');
  } catch (e) {
    assert(e.message !== 'Should have thrown', 'Expected parser to throw on missing sector');
  }
});

test('Throws when detected_services is not an array', () => {
  const bad = JSON.stringify({ sector: 'banking', detected_services: 'fd_open' });
  try {
    parseAIResponse(bad);
    throw new Error('Should have thrown');
  } catch (e) {
    assert(e.message !== 'Should have thrown');
  }
});

test('Handles government sector correctly', () => {
  const govt = JSON.stringify({
    sector: 'government', detected_services: ['passport_renewal', 'nid_correction'],
    confidence: 90, language_detected: 'english', generated_forms: {},
    doc_checklist: [], officer_briefing: 'Govt services', ai_summary: 'Passport + NID',
    is_urgent: false, clarification_needed: null,
  });
  const r = parseAIResponse(govt);
  assert(r.sector === 'government');
  assert(r.detected_services.length === 2);
});

test('Handles mixed sector correctly', () => {
  const mixed = JSON.stringify({
    sector: 'mixed', detected_services: ['account_open', 'trade_license_renewal'],
    confidence: 88, language_detected: 'english', generated_forms: {},
    doc_checklist: [], officer_briefing: 'Mixed', ai_summary: 'Account + license',
    is_urgent: false, clarification_needed: null,
  });
  const r = parseAIResponse(mixed);
  assert(r.sector === 'mixed');
  assert(r.detected_services.length === 2);
});

test('Handles empty detected_services with clarification', () => {
  const unclear = JSON.stringify({
    sector: 'mixed', detected_services: [], confidence: 0,
    language_detected: 'unknown', generated_forms: {}, doc_checklist: [],
    officer_briefing: 'Unclear', ai_summary: 'Manual review',
    is_urgent: false, clarification_needed: 'What do you need help with?',
  });
  const r = parseAIResponse(unclear);
  assert(r.detected_services.length === 0);
  assert(r.clarification_needed !== null);
});

test('is_urgent flag preserved', () => {
  const urgent = JSON.parse(validAI);
  urgent.is_urgent = true;
  urgent.officer_briefing = 'URGENT: Citizen needs immediate assistance.';
  const r = parseAIResponse(JSON.stringify(urgent));
  assert(r.is_urgent === true);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 5. BANGLISH DETECTION ═══');

const banglishCases = [
  ['fd khulte chai', true],
  ['passport renew korbo', true],
  ['account open lagbe', true],
  ['taka joma dibo', true],
  ['nid harie gese', true],
  ['tin bochor er jonno fd', true],
  ['I want to open a bank account', false],
  ['Please renew my passport', false],
  ['deposit money into account', false],
];

banglishCases.forEach(([input, expected]) => {
  test(
    (expected ? 'Banglish detected' : 'English not flagged') + ': "' + input + '"',
    () => assert(isBanglish(input) === expected, 'Detection mismatch for: ' + input)
  );
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 6. SERVICE SLUG FORMAT ═══');

const SLUGS = [
  'cash_deposit', 'cash_withdrawal', 'fd_open', 'fd_close', 'fd_renew',
  'account_open', 'loan_apply_sme', 'loan_apply_women_entrepreneur',
  'passport_renewal', 'nid_correction', 'trade_license_new',
  'driving_license_renewal', 'income_tax_return', 'eobi_registration',
  'utility_connection_electricity', 'vehicle_fitness_certificate',
];

SLUGS.forEach(slug => {
  test('Slug "' + slug + '" is valid snake_case', () => {
    assert(/^[a-z][a-z0-9_]*[a-z0-9]$/.test(slug), 'Bad format: ' + slug);
    assert(slug === slug.toLowerCase(), 'Must be lowercase');
    assert(!slug.includes('__'), 'No double underscores');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ RESULTS ═══');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
console.log('Total : ' + (passed + failed));
if (failed > 0) {
  console.log('\nSome tests failed!');
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
