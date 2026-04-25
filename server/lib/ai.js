/**
 * AI Integration — Ollama (Local LLM, completely free, works offline)
 * Model: llama3.1 running on your Mac via Ollama
 */

async function processIntakeWithAI(rawInput, citizenProfile) {
  const systemPrompt = `You are an AI intake assistant for ONE — a unified citizen service center in Bangladesh.

LANGUAGE SUPPORT — handle ALL three perfectly:
1. Pure Bangla: "আমি টাকা জমা দিতে চাই"
2. Pure English: "I want to deposit money"
3. Banglish (Bangla in Latin script): "ami taka joma dite chai", "fd khulte chai", "passport renew korbo", "nid harie gese", "nid update korte chai"

DETECTION RULES:
- "harie gese / lost" → reissue/replacement services
- "notun / new / naya" → new application
- "nobikayon / renew" → renewal services
- "thaka / joma / deposit" → cash_deposit
- "tola / tulbo / withdraw" → cash_withdrawal
- "update / poriborton / sংশোধন / correction" → correction services
- Extract amounts: "50 hajar"=50000, "1 lakh"=100000
- Extract tenure: "3 bochor"=36 months, "6 mas"=6 months
- "acil / urgent" → flag is_urgent=true
- Mixed requests → sector="mixed"

Return ONLY valid JSON. No markdown. No explanation. No preamble.`;

  const userContent = `Citizen said: "${rawInput}"
Citizen profile: ${JSON.stringify(citizenProfile)}

AVAILABLE SERVICES:

BANKING: cash_deposit, cash_withdrawal, fd_open, fd_close, fd_renew, account_open, account_open_savings, account_open_current, account_open_student, account_close, cheque_book_request, statement_request, loan_inquiry, loan_apply_personal, loan_apply_home, loan_apply_car, loan_apply_business, utility_bill_payment, dps_open, dps_close, pay_order, card_issue_debit, card_issue_credit, card_block, card_replacement, mobile_banking_register, remittance_receive, nominee_update, address_update, signature_update

GOVERNMENT — IDENTITY: nid_correction, nid_reissue, nid_smart_card_new, birth_certificate_new, birth_certificate_correction, death_certificate, marriage_certificate, citizenship_certificate, character_certificate

GOVERNMENT — TRAVEL: passport_new, passport_renewal, passport_correction, passport_emergency, police_clearance, visa_noc

GOVERNMENT — BUSINESS: trade_license_new, trade_license_renewal, tin_registration, vat_registration, company_registration

GOVERNMENT — LAND: land_mutation, khatian_copy, deed_registration, land_tax_payment

GOVERNMENT — TAX: tax_clearance, income_tax_return, wealth_statement

GOVERNMENT — UTILITIES: utility_connection_gas, utility_connection_water, utility_connection_electricity, utility_connection_broadband

GOVERNMENT — VEHICLE: driving_license_new, driving_license_renewal, vehicle_registration, vehicle_fitness_certificate, vehicle_tax_token

GOVERNMENT — HEALTH: disability_certificate, old_age_allowance_enroll, widow_allowance_enroll, freedom_fighter_certificate

GOVERNMENT — LABOUR: labour_card, work_permit_foreign, eobi_registration

Return ONLY this exact JSON structure, nothing else:
{
  "sector": "banking" | "government" | "mixed",
  "detected_services": ["slug1", "slug2"],
  "confidence": 0-100,
  "language_detected": "bangla" | "english" | "banglish" | "mixed",
  "generated_forms": {
    "service_slug": {
      "applicant_name": "from profile",
      "national_id": "from profile",
      "phone": "from profile",
      "address": "from profile",
      "date": "today",
      "amount": "extracted or null",
      "tenure_months": "extracted or null",
      "purpose": "inferred or null"
    }
  },
  "doc_checklist": [
    { "doc": "National ID Card", "likely_have": true, "mandatory": true }
  ],
  "officer_briefing": "2-3 sentences for the officer about what this citizen needs, urgency, and processing order.",
  "ai_summary": "Max 10 words for queue display",
  "is_urgent": false,
  "clarification_needed": null,
  "banglish_normalized": "English translation if Banglish or Bangla, else null"
}`;

  async function makeRequest() {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.1',
        prompt: systemPrompt + '\n\n' + userContent,
        stream: false,
        options: {
          temperature: 0.1,      // low = more consistent JSON output
          num_predict: 2000,     // max tokens
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama API ${response.status}: ${err}`);
    }

    const data = await response.json();
    const text = data.response || '';
    return parseAIResponse(text);
  }

  // Try once, retry once, then fallback
  try {
    return await makeRequest();
  } catch (err) {
    console.error('AI attempt 1 failed:', err.message);
    try {
      await new Promise(r => setTimeout(r, 2000));
      return await makeRequest();
    } catch (err2) {
      console.error('AI attempt 2 failed:', err2.message);
      return getFallbackResponse(rawInput, citizenProfile);
    }
  }
}

function parseAIResponse(text) {
  // Strip any markdown fences the model might add
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  // Sometimes local models add text before/after JSON — extract just the JSON
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.sector || !Array.isArray(parsed.detected_services)) {
    throw new Error('AI response missing required fields');
  }
  return { ...parsed, needs_manual_review: false };
}

function getFallbackResponse(rawInput, citizenProfile) {
  return {
    sector: 'mixed',
    detected_services: [],
    confidence: 0,
    language_detected: 'unknown',
    generated_forms: {},
    doc_checklist: [{ doc: 'National ID Card', likely_have: true, mandatory: true }],
    officer_briefing: `AI unavailable. Citizen said: "${rawInput}". Please assist manually.`,
    ai_summary: 'Manual review needed',
    is_urgent: false,
    clarification_needed: null,
    banglish_normalized: null,
    needs_manual_review: true,
  };
}

module.exports = { processIntakeWithAI };