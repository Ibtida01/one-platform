const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/queue or GET /api/tickets/queue — all waiting/serving tickets
router.get(['/queue', '/'], async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.full_name, c.national_id, c.phone
       FROM tickets t
       LEFT JOIN citizens c ON t.citizen_id = c.id
       WHERE t.status IN ('waiting', 'serving')
       ORDER BY t.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'QUEUE_ERROR' });
  }
});

// GET /api/tickets/:id — single ticket with citizen join
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.full_name, c.national_id, c.phone, c.address, c.dob
       FROM tickets t
       LEFT JOIN citizens c ON t.citizen_id = c.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found', code: 'NOT_FOUND' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'TICKET_ERROR' });
  }
});

// PATCH /api/tickets/:id/status — update status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['waiting', 'serving', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', code: 'INVALID_STATUS' });
  }

  try {
    let updateQuery;
    if (status === 'serving') {
      updateQuery = `UPDATE tickets SET status = $1, served_at = now() WHERE id = $2 RETURNING *`;
    } else if (status === 'done') {
      updateQuery = `UPDATE tickets SET status = $1, completed_at = now() WHERE id = $2 RETURNING *`;
    } else {
      updateQuery = `UPDATE tickets SET status = $1 WHERE id = $2 RETURNING *`;
    }

    const result = await pool.query(updateQuery, [status, req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found', code: 'NOT_FOUND' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'STATUS_UPDATE_ERROR' });
  }
});

// POST /api/tickets/:id/notes — add officer notes
router.post('/:id/notes', async (req, res) => {
  const { notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO service_logs (ticket_id, notes) VALUES ($1, $2) RETURNING *`,
      [req.params.id, notes]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'NOTES_ERROR' });
  }
});

// GET /api/tickets/:id/notes
router.get('/:id/notes', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM service_logs WHERE ticket_id = $1 ORDER BY completed_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'NOTES_FETCH_ERROR' });
  }
});

module.exports = router;
