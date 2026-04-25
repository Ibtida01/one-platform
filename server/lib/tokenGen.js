// In-memory counters for token generation
const counters = {
  banking: 0,
  government: 0,
  mixed: 0,
};

const prefixes = {
  banking: 'B',
  government: 'G',
  mixed: 'M',
};

function generateToken(sector) {
  const key = counters.hasOwnProperty(sector) ? sector : 'mixed';
  counters[key] += 1;
  const prefix = prefixes[key];
  const num = String(counters[key]).padStart(3, '0');
  return `${prefix}-${num}`;
}

function resetCounters() {
  counters.banking = 0;
  counters.government = 0;
  counters.mixed = 0;
}

module.exports = { generateToken, resetCounters };
