const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// POST /api/feedback — submit rating
router.post('/', async (req, res) => {
  const { ticket_id, rating, comment } = req.body;
  if (!ticket_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'ticket_id and rating (1-5) required' });
  }
  try {
    // Check ticket exists and is done
    const ticketCheck = await pool.query('SELECT id, status FROM tickets WHERE id = $1', [ticket_id]);
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    // Check no duplicate feedback
    const existing = await pool.query('SELECT id FROM feedback WHERE ticket_id = $1', [ticket_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Feedback already submitted for this ticket' });
    }

    const result = await pool.query(
      'INSERT INTO feedback (ticket_id, rating, comment) VALUES ($1, $2, $3) RETURNING *',
      [ticket_id, rating, comment]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/summary — aggregate ratings
router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_ratings,
        ROUND(AVG(rating), 2) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM feedback`
    );
    const recent = await pool.query(
      `SELECT f.rating, f.comment, f.created_at, t.token_number, t.ai_summary
       FROM feedback f
       JOIN tickets t ON f.ticket_id = t.id
       ORDER BY f.created_at DESC LIMIT 10`
    );
    res.json({ summary: result.rows[0], recent: recent.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
