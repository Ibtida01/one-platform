/**
 * ONE Platform — AI Integration
 * ─────────────────────────────────────────────────────────────────────────────
 * PROVIDER CHAIN (automatic fallback):
 *   1. Primary   → Groq (llama-3.3-70b, 0.3s, free)
 *   2. Secondary → Ollama (local llama3.1, offline)
 *   3. Tertiary  → Rule-based NLP (zero API, always works)
 *
 * POST-PROCESSING: catches false positives like spurious cash_deposit detection
 */

'use strict';

// ── SECTION 1: PROMPTS ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI intake assistant for ONE — a unified citizen service center in Bangladesh.

LANGUAGES YOU MUST HANDLE:
1. Pure Bangla (Unicode): "আমি টাকা জমা দিতে চাই এবং FD খুলতে চাই"
2. Pure English: "I want to deposit money and open a fixed deposit"
3. Banglish (Bangla phonetics in Latin script): "ami taka joma dite chai ar ekta fd khulte chai"

DETECTION RULES:

CORRECTION services:
- "bhul/thik korte/update/poriborton/shongshogdhon/correction/সংশোধন" → correction service
- "nid bhul/nid update/nid thik" → nid_correction
- "passport bhul/passport thik" → passport_correction

REISSUE/LOST:
- "harie gese/hariye/lost" → reissue service for that document

RENEWAL:
- "nobikayon/renew/expired/meiad shesh" → renewal service

FIXED DEPOSIT:
- "fd/fixed deposit/এফডি" + "khulte/open/korte/notun" → fd_open
- Extract tenure and amount from context

CRITICAL RULES — READ CAREFULLY:

RULE 1: "taka" does NOT always mean cash_deposit.
  WRONG: "50 hajar taka diye fd khulte chai" → [fd_open, cash_deposit]
  RIGHT: "50 hajar taka diye fd khulte chai" → [fd_open] with amount=50000
  
  "taka" near fd/account/loan/dps = the AMOUNT for that service, NOT a deposit.
  ONLY detect cash_deposit when citizen explicitly wants to deposit cash with NO other service.

RULE 2: Explicit deposit phrases only:
  cash_deposit ONLY if: "taka joma dibo" or "joma dite chai" or "cash deposit korbo" ALONE.

RULE 3: Multiple services — detect ALL that are mentioned.

RULE 4: Amounts: "50 hajar"=50000, "1 lakh"=100000, "5k"=5000, "1 crore"=10000000
RULE 5: Tenure: "3 bochor"=36months, "6 mas"=6months, "2 year"=24months
RULE 6: "acil/urgent/jotoshigghir/ekhuni" → is_urgent=true

VERIFIED EXAMPLES:

Input:  "ami nid te nam bhul ache thik korte chai ar 50 hajar taka fd korte chai 3 bochor"
Output: detected_services=["nid_correction","fd_open"], amount="50000", tenure_months="36"
NEVER: ["nid_correction","fd_open","cash_deposit"] — cash_deposit is WRONG here

Input:  "fd khulte chai 3 bochor er jonno 50 hajar taka"
Output: detected_services=["fd_open"], amount="50000", tenure_months="36"

Input:  "taka joma dite chai" (standalone)
Output: detected_services=["cash_deposit"]

Input:  "passport renew korbo expired hoise"
Output: detected_services=["passport_renewal"], is_urgent=true

Input:  "account open lagbe ar trade license nabo"
Output: detected_services=["account_open","trade_license_renewal"], sector="mixed"

Input:  "ami loan nite chai 2 lakh taka gari kinte"
Output: detected_services=["loan_apply_car"], amount="200000"
NEVER: ["loan_apply_car","cash_deposit"]

Return ONLY valid JSON. No markdown. No explanation. No text before or after.`;

function buildUserContent(rawInput, citizenProfile) {
  return `Citizen said: "${rawInput}"

Citizen profile:
${JSON.stringify(citizenProfile, null, 2)}

AVAILABLE SERVICES:

BANKING:
cash_deposit, cash_withdrawal, fd_open, fd_close, fd_renew,
account_open, account_open_savings, account_open_current, account_open_student,
account_open_salary, account_close, cheque_book_request, statement_request,
loan_inquiry, loan_apply_personal, loan_apply_home, loan_apply_car,
loan_apply_business, loan_apply_agriculture, loan_apply_sme, loan_apply_education,
loan_apply_women_entrepreneur, utility_bill_payment, dps_open, dps_close, dps_inquiry,
pay_order, demand_draft, card_issue_debit, card_issue_credit, card_issue_prepaid,
card_block, card_replacement, card_pin_reset, mobile_banking_register,
mobile_banking_unblock, internet_banking_register, remittance_receive, remittance_send,
locker_rent, bank_solvency_certificate, account_statement_notarized, nominee_update,
signature_update, address_update, standing_instruction_setup, emi_inquiry,
emi_reschedule, account_freeze_unfreeze

GOVERNMENT — IDENTITY:
nid_correction, nid_reissue, nid_smart_card_new, nid_smart_card_collect,
birth_certificate_new, birth_certificate_correction, death_certificate,
marriage_certificate, divorce_certificate, citizenship_certificate, character_certificate

GOVERNMENT — TRAVEL:
passport_new, passport_renewal, passport_correction, passport_emergency,
visa_noc, police_clearance, travel_clearance_minor

GOVERNMENT — BUSINESS:
trade_license_new, trade_license_renewal, trade_license_correction,
tin_registration, tin_correction, vat_registration, vat_return,
company_registration, partnership_registration, import_registration,
export_registration, fire_license, environment_clearance, bida_registration

GOVERNMENT — LAND:
land_mutation, land_record_correction, khatian_copy, deed_registration,
deed_correction, land_tax_payment, building_plan_approval, rajuk_clearance

GOVERNMENT — TAX:
tax_clearance, income_tax_return, income_tax_assessment, wealth_statement, source_tax_refund

GOVERNMENT — UTILITIES:
utility_connection_gas, utility_connection_water, utility_connection_electricity,
utility_connection_broadband, utility_transfer_ownership, utility_reconnection,
utility_meter_change, utility_complaint_register

GOVERNMENT — EDUCATION:
ssc_certificate_attestation, hsc_certificate_attestation,
university_certificate_attestation, foreign_degree_equivalence,
student_visa_noc, board_migration_certificate

GOVERNMENT — HEALTH:
disability_certificate, disability_allowance_enroll, freedom_fighter_certificate,
widow_allowance_enroll, old_age_allowance_enroll, maternity_allowance, medical_certificate_govt

GOVERNMENT — VEHICLE:
driving_license_new, driving_license_renewal, driving_license_correction,
vehicle_registration, vehicle_fitness_certificate, vehicle_route_permit,
vehicle_ownership_transfer, vehicle_tax_token

GOVERNMENT — LABOUR:
labour_card, work_permit_foreign, work_permit_renewal, eobi_registration,
provident_fund_claim, gratuity_claim

Return EXACTLY this JSON, nothing else:
{
  "sector": "banking" | "government" | "mixed",
  "detected_services": ["slug1", "slug2"],
  "confidence": 0-100,
  "language_detected": "bangla" | "english" | "banglish" | "mixed",
  "generated_forms": {
    "service_slug": {
      "applicant_name": "from citizen profile",
      "national_id": "from citizen profile",
      "phone": "from citizen profile",
      "address": "from citizen profile",
      "date": "${new Date().toISOString().split('T')[0]}",
      "amount": "extracted number as string, or null",
      "tenure_months": "extracted number as string, or null",
      "purpose": "inferred from context, or null",
      "account_type": "inferred if relevant, or null"
    }
  },
  "doc_checklist": [
    { "doc": "National ID Card", "likely_have": true, "mandatory": true }
  ],
  "officer_briefing": "2-3 sentences: what citizen needs, language used, urgency, processing order.",
  "ai_summary": "10 words maximum for queue display",
  "is_urgent": false,
  "clarification_needed": null,
  "banglish_normalized": "English translation if Banglish or Bangla detected, else null"
}`;
}

// ── SECTION 2: PROVIDER CALLS ─────────────────────────────────────────────────

async function callGroq(rawInput, citizenProfile) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserContent(rawInput, citizenProfile) },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error(`Groq ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return parseAIResponse(data.choices?.[0]?.message?.content || '', 'groq');
}

async function callOllama(rawInput, citizenProfile) {
  const model = process.env.OLLAMA_MODEL || 'llama3.1';
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  // Quick health check with 2s timeout
  const health = await fetch(`${ollamaUrl}/api/tags`, {
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  if (!health || !health.ok) throw new Error(`Ollama not reachable at ${ollamaUrl}`);

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: SYSTEM_PROMPT + '\n\n' + buildUserContent(rawInput, citizenProfile),
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 2000 },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Ollama ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return parseAIResponse(data.response || '', 'ollama');
}

// ── SECTION 3: RULE-BASED FALLBACK ───────────────────────────────────────────

const KEYWORD_MAP = {
  cash_deposit:        ['taka joma dite','taka joma dibo','joma dite chai','cash deposit','টাকা জমা দিতে','জমা দিতে চাই','জমা দেব'],
  cash_withdrawal:     ['taka tulte','tulbo','taka tola','withdraw','টাকা তুলতে','টাকা তোলা','cash tulbo'],
  fd_open:             ['fd khulte','fd korte','fd nite','fixed deposit','fd open','এফডি খুলতে','fd চাই',' fd ','FD khulte'],
  fd_close:            ['fd band','fd bondo','fd close','fd vangte','fd ভাঙতে'],
  fd_renew:            ['fd renew','fd nobikayon','fd নবায়ন'],
  account_open:        ['account khulte','account open','notun account','new account','account korte','একাউন্ট খুলতে'],
  account_open_student:['student account','ছাত্র একাউন্ট'],
  account_close:       ['account band','account bondo','account close','account বন্ধ'],
  cheque_book_request: ['cheque book','chequebook','চেক বই','check boi'],
  statement_request:   ['statement','স্টেটমেন্ট','bank statement','hisab','হিসাব'],
  loan_inquiry:        ['loan lagbe','loan nite','loan চাই','rin lagbe','ঋণ চাই','loan korte'],
  loan_apply_personal: ['personal loan','personal rin'],
  loan_apply_home:     ['home loan','house loan','bari r loan','গৃহঋণ','bari loan'],
  loan_apply_car:      ['car loan','garir loan','vehicle loan','gari kinte loan','car kinte'],
  loan_apply_business: ['business loan','byabosa loan','ব্যবসার লোন'],
  loan_apply_sme:      ['sme loan','sme rin'],
  utility_bill_payment:['bill dite','bill payment','bill জমা','bijli bill','gas bill','water bill','বিল দিতে'],
  dps_open:            ['dps khulte','dps korte','dps চাই','ডিপিএস খুলতে','monthly savings dps'],
  dps_close:           ['dps band','dps close','dps ভাঙতে'],
  pay_order:           ['pay order','পে অর্ডার','demand draft',' dd '],
  card_issue_debit:    ['debit card','atm card','card nite','কার্ড নিতে','atm চাই'],
  card_issue_credit:   ['credit card','ক্রেডিট কার্ড'],
  card_block:          ['card block','card বন্ধ','card hariye','lost card','card harie','card চুরি'],
  card_replacement:    ['card replace','নতুন কার্ড','card নষ্ট'],
  card_pin_reset:      ['pin reset','pin bhule','pin change','পিন ভুলে'],
  mobile_banking_register:['mobile banking','bkash','nagad','rocket','মোবাইল ব্যাংকিং'],
  remittance_receive:  ['remittance','বিদেশ থেকে','bidesh theke taka','foreign money','প্রবাসী টাকা'],
  nominee_update:      ['nominee','নমিনি','nominee change','nominee update'],
  address_update:      ['address update','address change','ঠিকানা পরিবর্তন','thikana change'],
  signature_update:    ['signature update','signature change','স্বাক্ষর পরিবর্তন'],
  nid_correction:      ['nid bhul','nid thik','nid te','nid update','nid correction','nid shongshogdhon','nid poriborton','nid info','জাতীয় পরিচয়পত্র সংশোধন','voter id thik','nid সংশোধন','id card thik','nid name','nid address','nam bhul','name bhul','naam thik'],
  nid_reissue:         ['nid lost','nid harie','nid hariye','হারিয়ে গেছে nid','lost nid','nid reissue','nid চুরি','nid নষ্ট'],
  nid_smart_card_new:  ['smart card','স্মার্ট কার্ড','smart nid'],
  birth_certificate_new:['birth certificate','জন্ম নিবন্ধন','jonmo nibondhon','birth cert','sontaner jonmo','baby birth'],
  birth_certificate_correction:['birth certificate thik','jonmo nibondhon shongshogdhon','জন্ম সনদ সংশোধন'],
  death_certificate:   ['death certificate','মৃত্যু সনদ','mrittu','মারা গেছেন certificate'],
  marriage_certificate:['marriage certificate','বিবাহ সনদ','biye certificate','nikah certificate'],
  citizenship_certificate:['citizenship','নাগরিকত্ব','nagorikotto certificate'],
  character_certificate:['character certificate','চারিত্রিক সনদ','charitrik shonod'],
  passport_new:        ['new passport','notun passport','নতুন পাসপোর্ট','passport korte','first time passport'],
  passport_renewal:    ['passport renew','passport nobikayon','passport expired','renew passport','passport er meiad shesh','passport শেষ','passport নবায়ন'],
  passport_correction: ['passport thik','passport shongshogdhon','passport correction','passport সংশোধন'],
  passport_emergency:  ['emergency passport','urgent passport','acil passport'],
  police_clearance:    ['police clearance','পুলিশ ক্লিয়ারেন্স','pcc','police certificate'],
  visa_noc:            ['visa noc','travel noc','ভিসা noc'],
  trade_license_new:   ['trade license nite','trade license korte','notun trade license','নতুন ট্রেড লাইসেন্স','business license nite','new trade license'],
  trade_license_renewal:['trade license renew','license nobikayon','trade license নবায়ন','renew license','purano license','trade license nabo','trade license nebo','license nabo','trade license নেব'],
  tin_registration:    ['tin registration','tin nite','tin korte','টিন নিতে','tax number nite'],
  vat_registration:    ['vat registration','ভ্যাট রেজিস্ট্রেশন'],
  company_registration:['company registration','কোম্পানি রেজিস্ট্রেশন'],
  fire_license:        ['fire license','ফায়ার লাইসেন্স'],
  land_mutation:       ['land mutation','জমি','mutation','খারিজ','kharij','jomi mutation'],
  khatian_copy:        ['khatian','খতিয়ান','rs khatian','bs khatian'],
  deed_registration:   ['deed registration','দলিল','dolil register'],
  land_tax_payment:    ['land tax','khajna','জমির খাজনা'],
  tax_clearance:       ['tax clearance','কর ছাড়পত্র','kor chadpotro'],
  income_tax_return:   ['tax return','আয়কর রিটার্ন','aykor return','income tax file'],
  wealth_statement:    ['wealth statement','সম্পদ বিবরণী'],
  utility_connection_gas:['gas connection','গ্যাস সংযোগ','gas line nite','new gas'],
  utility_connection_water:['water connection','পানির সংযোগ','wasa','pani line'],
  utility_connection_electricity:['electricity connection','বিদ্যুৎ সংযোগ','bijli connection','electric line','new bijli','বিদ্যুৎ লাইন'],
  utility_connection_broadband:['broadband connection','internet connection'],
  driving_license_new: ['driving license nite','dl korte','ড্রাইভিং লাইসেন্স','new dl'],
  driving_license_renewal:['driving license renew','dl renew','dl nobikayon'],
  vehicle_registration:['vehicle registration','গাড়ি রেজিস্ট্রেশন'],
  vehicle_fitness_certificate:['fitness certificate','ফিটনেস','vehicle fitness'],
  vehicle_tax_token:   ['tax token','ট্যাক্স টোকেন'],
  disability_certificate:['disability certificate','প্রতিবন্ধী সনদ'],
  old_age_allowance_enroll:['old age allowance','বয়স্ক ভাতা'],
  widow_allowance_enroll:['widow allowance','বিধবা ভাতা'],
  freedom_fighter_certificate:['freedom fighter','মুক্তিযোদ্ধা সনদ'],
  labour_card:         ['labour card','শ্রমিক কার্ড','worker card'],
  work_permit_foreign: ['work permit','ওয়ার্ক পারমিট'],
  eobi_registration:   ['eobi','provident fund registration'],
  provident_fund_claim:['provident fund claim','pf claim'],
};

const BANKING_SLUGS = new Set([
  'cash_deposit','cash_withdrawal','fd_open','fd_close','fd_renew',
  'account_open','account_open_savings','account_open_current','account_open_student',
  'account_open_salary','account_close','cheque_book_request','statement_request',
  'loan_inquiry','loan_apply_personal','loan_apply_home','loan_apply_car',
  'loan_apply_business','loan_apply_agriculture','loan_apply_sme','loan_apply_education',
  'loan_apply_women_entrepreneur','utility_bill_payment','dps_open','dps_close','dps_inquiry',
  'pay_order','demand_draft','card_issue_debit','card_issue_credit','card_issue_prepaid',
  'card_block','card_replacement','card_pin_reset','mobile_banking_register',
  'mobile_banking_unblock','internet_banking_register','remittance_receive','remittance_send',
  'locker_rent','bank_solvency_certificate','account_statement_notarized','nominee_update',
  'signature_update','address_update','standing_instruction_setup','emi_inquiry',
  'emi_reschedule','account_freeze_unfreeze',
]);

const AMOUNT_CONTEXT_SERVICES = new Set([
  'fd_open','fd_renew','account_open','account_open_savings','account_open_current',
  'account_open_student','account_open_salary','loan_inquiry','loan_apply_personal',
  'loan_apply_home','loan_apply_car','loan_apply_business','loan_apply_agriculture',
  'loan_apply_sme','loan_apply_education','loan_apply_women_entrepreneur',
  'dps_open','pay_order','demand_draft','remittance_send',
]);

const TENURE_SERVICES = new Set([
  'fd_open','fd_renew','dps_open','loan_apply_personal','loan_apply_home',
  'loan_apply_car','loan_apply_business','loan_apply_sme',
]);

const SERVICE_DOCS = {
  cash_deposit:        [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Account Passbook', likely_have: true, mandatory: true }],
  fd_open:             [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Passport Photo (2 copies)', likely_have: false, mandatory: true },{ doc: 'Account Passbook', likely_have: true, mandatory: true },{ doc: 'TIN Certificate', likely_have: false, mandatory: false }],
  account_open:        [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Passport Photo (2 copies)', likely_have: false, mandatory: true },{ doc: 'Nominee Photo (1 copy)', likely_have: false, mandatory: true }],
  nid_correction:      [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Birth Certificate', likely_have: false, mandatory: true },{ doc: 'SSC Certificate', likely_have: false, mandatory: false }],
  nid_reissue:         [{ doc: 'Police GD Copy', likely_have: false, mandatory: true },{ doc: 'Birth Certificate', likely_have: false, mandatory: true },{ doc: 'Passport Photo (2 copies)', likely_have: false, mandatory: true }],
  passport_new:        [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Birth Certificate', likely_have: false, mandatory: true },{ doc: 'Passport Photo (4 copies)', likely_have: false, mandatory: true },{ doc: 'Bank Payment Receipt', likely_have: false, mandatory: true }],
  passport_renewal:    [{ doc: 'Existing Passport', likely_have: true, mandatory: true },{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Passport Photo (4 copies)', likely_have: false, mandatory: true },{ doc: 'Bank Payment Receipt', likely_have: false, mandatory: true }],
  trade_license_new:   [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Business Premises Proof', likely_have: false, mandatory: true },{ doc: 'TIN Certificate', likely_have: false, mandatory: false }],
  trade_license_renewal:[{ doc: 'Existing Trade License', likely_have: true, mandatory: true },{ doc: 'National ID Card', likely_have: true, mandatory: true }],
  loan_inquiry:        [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Income Proof', likely_have: false, mandatory: true },{ doc: 'Bank Statement (6 months)', likely_have: false, mandatory: true }],
  police_clearance:    [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Passport', likely_have: false, mandatory: true },{ doc: 'Passport Photo (4 copies)', likely_have: false, mandatory: true }],
  driving_license_new: [{ doc: 'National ID Card', likely_have: true, mandatory: true },{ doc: 'Medical Certificate', likely_have: false, mandatory: true },{ doc: 'Passport Photo (2 copies)', likely_have: false, mandatory: true }],
  birth_certificate_new:[{ doc: 'Hospital Birth Record', likely_have: false, mandatory: true },{ doc: 'Parents National ID', likely_have: true, mandatory: true }],
  death_certificate:   [{ doc: 'Hospital Death Certificate', likely_have: false, mandatory: true },{ doc: 'Deceased NID', likely_have: false, mandatory: true }],
};
const DEFAULT_DOCS = [
  { doc: 'National ID Card', likely_have: true, mandatory: true },
  { doc: 'Passport Photo (2 copies)', likely_have: false, mandatory: false },
];

const BRIEFINGS = {
  nid_correction:    'Citizen wants to correct National ID information. Verify which field needs updating. Supporting proof documents required.',
  nid_reissue:       'Citizen has lost their NID and needs a replacement. Police GD copy is mandatory. Verify identity carefully.',
  passport_renewal:  'Citizen needs passport renewal. Check if already expired — flag as urgent if so. Bank payment receipt required.',
  passport_new:      'First-time passport applicant. All documents must be originals. Birth certificate mandatory.',
  fd_open:           'Citizen wants to open a Fixed Deposit. Confirm amount and tenure. Verify linked savings account exists first.',
  cash_deposit:      'Citizen wants to deposit cash. Verify account number and depositor identity.',
  cash_withdrawal:   'Citizen wants to withdraw cash. Check balance and daily withdrawal limit.',
  account_open:      'New account opening. Determine account type. Nominee details and introducer required.',
  trade_license_new: 'New trade license application. Verify business address and type of business.',
  trade_license_renewal:'Trade license renewal. Check existing license number and expiry date.',
  loan_inquiry:      'Loan inquiry. Determine loan type and amount required. Income proof needed.',
  loan_apply_car:    'Car loan application. Income proof and vehicle quotation required.',
  loan_apply_home:   'Home loan application. Property documents and income proof required.',
  loan_apply_business:'Business loan. Trade license, business plan, and income proof required.',
  driving_license_new:'New driving license. Medical certificate and photo required.',
  police_clearance:  'Police clearance certificate. Verify purpose and destination country.',
  birth_certificate_new:'New birth certificate. Hospital birth record and parents NID required.',
  death_certificate: 'Death certificate application. Hospital death certificate required.',
  utility_connection_electricity:'New electricity connection. Property ownership documents required.',
  tin_registration:  'TIN registration. Income source details required.',
};

function extractAmount(input) {
  const l = input.toLowerCase().replace(/,/g, '');
  const crore = l.match(/(\d+(?:\.\d+)?)\s*(?:crore|কোটি|koti)/);
  if (crore) return String(Math.round(parseFloat(crore[1]) * 10000000));
  const lakh = l.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|লাখ)/);
  if (lakh) return String(Math.round(parseFloat(lakh[1]) * 100000));
  const hajar = l.match(/(\d+(?:\.\d+)?)\s*(?:hajar|হাজার)/);
  if (hajar) return String(Math.round(parseFloat(hajar[1]) * 1000));
  const kilo = l.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (kilo) return String(Math.round(parseFloat(kilo[1]) * 1000));
  const plain = l.match(/\b(\d{4,})\b/);
  if (plain) return plain[1];
  return null;
}

function extractTenure(input) {
  const l = input.toLowerCase();
  const year = l.match(/(\d+)\s*(?:bochor|year|বছর|yr)/);
  if (year) return String(parseInt(year[1]) * 12);
  const month = l.match(/(\d+)\s*(?:mas|month|মাস|mo)/);
  if (month) return month[1];
  return null;
}

function detectLanguage(input) {
  if (/[\u0980-\u09FF]/.test(input)) return 'bangla';
  const bWords = ['chai','korbo','lagbe','khulte','tulbo','joma','harie','gese','bochor',
    'notun','acil','dibo','nite','korte','thik','bhul','hariye','nobikayon','renew'];
  if (bWords.some(w => input.toLowerCase().includes(w))) return 'banglish';
  return 'english';
}

function isUrgentInput(input) {
  return ['urgent','acil','jotoshigghir','ekhuni','emergency','immediately','today e','আজকেই','এখনি']
    .some(w => input.toLowerCase().includes(w));
}

function ruleBasedDetect(rawInput, citizenProfile) {
  const lower = rawInput.toLowerCase();
  const detected = [];

  for (const [slug, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      detected.push(slug);
    }
  }

  const cleaned = postProcessServices(detected, rawInput);
  const amount   = extractAmount(rawInput);
  const tenure   = extractTenure(rawInput);
  const lang     = detectLanguage(rawInput);
  const urgent   = isUrgentInput(rawInput);

  const hasBank = cleaned.some(s => BANKING_SLUGS.has(s));
  const hasGovt = cleaned.some(s => !BANKING_SLUGS.has(s));
  const sector  = hasBank && hasGovt ? 'mixed' : hasBank ? 'banking' : hasGovt ? 'government' : 'mixed';

  const generated_forms = {};
  for (const slug of cleaned) {
    generated_forms[slug] = {
      applicant_name: citizenProfile.name        || null,
      national_id:    citizenProfile.national_id || null,
      phone:          citizenProfile.phone        || null,
      address:        citizenProfile.address      || null,
      date:           new Date().toISOString().split('T')[0],
      amount:         AMOUNT_CONTEXT_SERVICES.has(slug) ? amount : null,
      tenure_months:  TENURE_SERVICES.has(slug)         ? tenure : null,
      purpose:        null,
    };
  }

  const docMap = new Map();
  for (const slug of cleaned) {
    const docs = SERVICE_DOCS[slug] || DEFAULT_DOCS;
    for (const d of docs) { if (!docMap.has(d.doc)) docMap.set(d.doc, d); }
  }
  const doc_checklist = docMap.size > 0 ? Array.from(docMap.values()) : DEFAULT_DOCS;

  let officer_briefing = cleaned.length === 0
    ? `Citizen said: "${rawInput}". Could not auto-detect services. Please ask what they need.`
    : [cleaned.map(s => BRIEFINGS[s]).filter(Boolean).join(' '),
       `Input language: ${lang}.`].filter(Boolean).join(' ');
  if (urgent && !officer_briefing.startsWith('⚡')) officer_briefing = '⚡ URGENT — ' + officer_briefing;

  const ai_summary = cleaned.length > 0
    ? cleaned.slice(0, 2).map(s => s.replace(/_/g,' ')).join(' + ')
    : 'Manual review needed';

  return {
    sector,
    detected_services: cleaned,
    confidence: cleaned.length > 0 ? Math.min(55 + cleaned.length * 10, 82) : 0,
    language_detected: lang,
    generated_forms,
    doc_checklist,
    officer_briefing,
    ai_summary,
    is_urgent: urgent,
    clarification_needed: cleaned.length === 0 ? 'Could not understand request. Please ask the citizen.' : null,
    banglish_normalized: null,
    needs_manual_review: cleaned.length === 0,
    _source: 'rule_based',
  };
}

// ── SECTION 4: POST-PROCESSING ────────────────────────────────────────────────

function postProcessServices(services, rawInput) {
  let result = [...services];
  const lower = rawInput.toLowerCase();

  // Rule 1: Remove false cash_deposit when an amount-context service exists
  const hasAmountContext = result.some(s => AMOUNT_CONTEXT_SERVICES.has(s));
  const hasExplicitDeposit = (
    lower.includes('taka joma dite') ||
    lower.includes('taka joma dibo') ||
    lower.includes('joma dite chai') ||
    lower.includes('cash deposit') ||
    lower.includes('আলাদাভাবে জমা')
  );
  if (result.includes('cash_deposit') && hasAmountContext && !hasExplicitDeposit) {
    result = result.filter(s => s !== 'cash_deposit');
    console.log('[POST-PROCESS] Removed false cash_deposit — amount context');
  }

  // Rule 2: Deduplicate account open variants — keep most specific
  const accountVariants = ['account_open','account_open_savings','account_open_current','account_open_student','account_open_salary'];
  const foundAccounts = result.filter(s => accountVariants.includes(s));
  if (foundAccounts.length > 1) {
    const specific = foundAccounts.filter(s => s !== 'account_open');
    result = result.filter(s => !accountVariants.includes(s));
    result.push(...specific);
  }

  // Rule 3: Refine generic loan to specific type
  if (result.includes('loan_inquiry')) {
    if (lower.includes('car') || lower.includes('gari') || lower.includes('vehicle')) {
      result = result.filter(s => s !== 'loan_inquiry');
      if (!result.includes('loan_apply_car')) result.push('loan_apply_car');
    } else if (lower.includes('home') || lower.includes('bari') || lower.includes('house') || lower.includes('flat')) {
      result = result.filter(s => s !== 'loan_inquiry');
      if (!result.includes('loan_apply_home')) result.push('loan_apply_home');
    } else if (lower.includes('business') || lower.includes('byabosa') || lower.includes('shop')) {
      result = result.filter(s => s !== 'loan_inquiry');
      if (!result.includes('loan_apply_business')) result.push('loan_apply_business');
    }
  }

  // Rule 4: Remove duplicates
  return [...new Set(result)];
}

function postProcessResult(aiResult, rawInput) {
  const r = { ...aiResult };

  // Fix detected_services
  if (Array.isArray(r.detected_services)) {
    r.detected_services = postProcessServices(r.detected_services, rawInput);
  }

  // Correct sector if it doesn't match services
  if (r.detected_services && r.detected_services.length > 0) {
    const hasBank = r.detected_services.some(s => BANKING_SLUGS.has(s));
    const hasGovt = r.detected_services.some(s => !BANKING_SLUGS.has(s));
    if (hasBank && hasGovt) r.sector = 'mixed';
    else if (hasBank)       r.sector = 'banking';
    else if (hasGovt)       r.sector = 'government';
  }

  // Fill missing doc_checklist
  if (!r.doc_checklist || r.doc_checklist.length === 0) {
    const docMap = new Map();
    for (const slug of (r.detected_services || [])) {
      const docs = SERVICE_DOCS[slug] || DEFAULT_DOCS;
      for (const d of docs) { if (!docMap.has(d.doc)) docMap.set(d.doc, d); }
    }
    r.doc_checklist = docMap.size > 0 ? Array.from(docMap.values()) : DEFAULT_DOCS;
  }

  // Apply urgency from raw input if AI missed it
  if (!r.is_urgent) r.is_urgent = isUrgentInput(rawInput);
  if (r.is_urgent && r.officer_briefing && !r.officer_briefing.startsWith('⚡')) {
    r.officer_briefing = '⚡ URGENT — ' + r.officer_briefing;
  }

  return r;
}

// ── SECTION 5: RESPONSE PARSER ────────────────────────────────────────────────

function parseAIResponse(text, source) {
  if (!text || !text.trim()) throw new Error('Empty AI response');

  const cleaned = text
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.sector)                           throw new Error('Missing: sector');
  if (!Array.isArray(parsed.detected_services)) throw new Error('Missing: detected_services array');

  return { ...parsed, needs_manual_review: false, _source: source };
}

// ── SECTION 6: MAIN FUNCTION ──────────────────────────────────────────────────

async function processIntakeWithAI(rawInput, citizenProfile) {
  const primary   = process.env.AI_PROVIDER || 'groq';
  const secondary = primary === 'groq' ? 'ollama' : 'groq';
  const callMap   = { groq: callGroq, ollama: callOllama };

  const providers = [
    { name: primary,   fn: callMap[primary] },
    { name: secondary, fn: callMap[secondary] },
  ].filter(p => p.fn);

  for (const { name, fn } of providers) {
    try {
      console.log(`[AI] Trying: ${name}`);
      const raw       = await fn(rawInput, citizenProfile);
      const processed = postProcessResult(raw, rawInput);
      console.log(`[AI] ✅ ${name} → [${processed.detected_services.join(', ')}]`);
      return processed;
    } catch (err) {
      console.warn(`[AI] ❌ ${name} failed: ${err.message}`);
    }
  }

  console.log('[AI] All providers failed → using rule-based NLP');
  const rule = ruleBasedDetect(rawInput, citizenProfile);
  console.log(`[AI] Rule-based → [${rule.detected_services.join(', ')}]`);
  return rule;
}

module.exports = { processIntakeWithAI };