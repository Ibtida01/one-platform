const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { processIntakeWithAI } = require('../lib/ai');
const { generateToken } = require('../lib/tokenGen');

// POST /api/intake
router.post('/', async (req, res) => {
  const { rawInput, nationalId } = req.body;

  if (!rawInput || !nationalId) {
    return res.status(400).json({ error: 'rawInput and nationalId are required', code: 'MISSING_FIELDS' });
  }

  const client = await pool.connect();
  try {
    // 1. Look up citizen
    let citizenResult = await client.query(
      'SELECT * FROM citizens WHERE national_id = $1',
      [nationalId]
    );

    let citizen;
    let tempCitizen = false;

    if (citizenResult.rows.length === 0) {
      // Create temporary citizen record
      const insertResult = await client.query(
        `INSERT INTO citizens (national_id, full_name, sector)
         VALUES ($1, $2, 'general')
         ON CONFLICT (national_id) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING *`,
        [nationalId, 'Unknown — verify at desk']
      );
      citizen = insertResult.rows[0];
      tempCitizen = true;
    } else {
      citizen = citizenResult.rows[0];
    }

    const citizenProfile = {
      name: citizen.full_name,
      national_id: citizen.national_id,
      phone: citizen.phone || 'Not on file',
      address: citizen.address || 'Not on file',
      dob: citizen.dob || 'Not on file',
    };

    // 2. Call AI
    let aiResult;
    try {
      aiResult = await processIntakeWithAI(rawInput, citizenProfile);
    } catch (aiErr) {
      console.error('AI processing error:', aiErr);
      aiResult = {
        sector: 'mixed',
        detected_services: [],
        confidence: 0,
        generated_forms: {},
        doc_checklist: [{ doc: 'National ID Card', likely_have: true, mandatory: true }],
        officer_briefing: `AI unavailable. Citizen stated: "${rawInput}". Please assist manually.`,
        ai_summary: 'See officer directly',
        clarification_needed: null,
        needs_manual_review: true,
      };
    }

    // 3. Generate token
    const tokenNumber = generateToken(aiResult.sector || 'mixed');

    // 4. Store ticket
    const ticketResult = await client.query(
      `INSERT INTO tickets (
        citizen_id, token_number, sector, raw_input,
        detected_services, generated_forms, doc_checklist,
        officer_briefing, ai_summary, status, needs_manual_review
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'waiting', $10)
       RETURNING *`,
      [
        citizen.id,
        tokenNumber,
        aiResult.sector || 'mixed',
        rawInput,
        JSON.stringify(aiResult.detected_services || []),
        JSON.stringify(aiResult.generated_forms || {}),
        JSON.stringify(aiResult.doc_checklist || []),
        aiResult.officer_briefing || '',
        aiResult.ai_summary || '',
        aiResult.needs_manual_review || false,
      ]
    );

    const ticket = ticketResult.rows[0];

    return res.json({
      ticket: {
        ...ticket,
        citizen: {
          full_name: citizen.full_name,
          national_id: citizen.national_id,
          phone: citizen.phone,
          address: citizen.address,
        },
        temp_citizen: tempCitizen,
      },
      ai: aiResult,
      token_number: tokenNumber,
    });
  } catch (err) {
    console.error('Intake error:', err);
    return res.status(500).json({ error: err.message, code: 'INTAKE_ERROR' });
  } finally {
    client.release();
  }
});

module.exports = router;
