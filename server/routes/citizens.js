const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/citizens/lookup/:nid — citizen profile + full history
router.get('/lookup/:nid', async (req, res) => {
  try {
    const citizenResult = await pool.query(
      'SELECT * FROM citizens WHERE national_id = $1',
      [req.params.nid]
    );
    if (citizenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Citizen not found', code: 'NOT_FOUND' });
    }
    const citizen = citizenResult.rows[0];

    const history = await pool.query(
      `SELECT t.id, t.token_number, t.sector, t.detected_services, t.ai_summary,
              t.status, t.created_at, t.completed_at,
              ROUND(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/60) as duration_minutes
       FROM tickets t WHERE t.citizen_id = $1
       ORDER BY t.created_at DESC LIMIT 10`,
      [citizen.id]
    );

    const nextAppt = await pool.query(
      `SELECT * FROM appointments
       WHERE citizen_id = $1 AND scheduled_at > now() AND status = 'booked'
       ORDER BY scheduled_at ASC LIMIT 1`,
      [citizen.id]
    );

    res.json({
      ...citizen,
      visit_history: history.rows,
      visit_count: history.rowCount,
      next_appointment: nextAppt.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'LOOKUP_ERROR' });
  }
});

module.exports = router;
