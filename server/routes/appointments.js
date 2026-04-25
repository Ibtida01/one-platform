const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/appointments — today's appointments
router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT a.*, c.full_name, c.national_id, c.phone
       FROM appointments a
       LEFT JOIN citizens c ON a.citizen_id = c.id
       WHERE DATE(a.scheduled_at AT TIME ZONE 'Asia/Dhaka') = $1
       ORDER BY a.scheduled_at ASC`,
      [date]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments — book an appointment
router.post('/', async (req, res) => {
  const { national_id, service_slug, scheduled_at, notes } = req.body;
  if (!national_id || !service_slug || !scheduled_at) {
    return res.status(400).json({ error: 'national_id, service_slug, scheduled_at required' });
  }
  try {
    // Find or create citizen
    let citizenResult = await pool.query('SELECT id FROM citizens WHERE national_id = $1', [national_id]);
    let citizen_id;
    if (citizenResult.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO citizens (national_id, full_name) VALUES ($1, 'Verify at desk') RETURNING id`,
        [national_id]
      );
      citizen_id = ins.rows[0].id;
    } else {
      citizen_id = citizenResult.rows[0].id;
    }

    // Check for conflicts (same citizen, same day)
    const conflict = await pool.query(
      `SELECT id FROM appointments
       WHERE citizen_id = $1 AND DATE(scheduled_at) = DATE($2::timestamptz) AND status = 'booked'`,
      [citizen_id, scheduled_at]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Citizen already has an appointment this day', code: 'CONFLICT' });
    }

    const result = await pool.query(
      `INSERT INTO appointments (citizen_id, service_slug, scheduled_at, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [citizen_id, service_slug, scheduled_at, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/appointments/:id — update status
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments/slots — available slots for a date
router.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });

  // Generate slots: 9am - 4pm, every 30 minutes
  const slots = [];
  const booked = new Set();

  try {
    const existing = await pool.query(
      `SELECT scheduled_at FROM appointments WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Dhaka') = $1 AND status = 'booked'`,
      [date]
    );
    existing.rows.forEach(r => {
      const d = new Date(r.scheduled_at);
      booked.add(`${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2,'0')}`);
    });

    for (let h = 9; h < 16; h++) {
      for (let m = 0; m < 60; m += 30) {
        const label = `${h}:${String(m).padStart(2,'0')}`;
        slots.push({ time: label, available: !booked.has(label) });
      }
    }
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
