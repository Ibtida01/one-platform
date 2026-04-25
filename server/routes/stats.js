const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/stats — today's analytics
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totals, bySector, avgTime, recentTickets] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'done' THEN 1 END) as completed,
           COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
           COUNT(CASE WHEN status = 'serving' THEN 1 END) as serving
         FROM tickets
         WHERE DATE(created_at) = $1`,
        [today]
      ),
      pool.query(
        `SELECT sector, COUNT(*) as count
         FROM tickets
         WHERE DATE(created_at) = $1
         GROUP BY sector`,
        [today]
      ),
      pool.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60)::numeric(10,1) as avg_minutes
         FROM tickets
         WHERE DATE(created_at) = $1 AND status = 'done' AND completed_at IS NOT NULL`,
        [today]
      ),
      pool.query(
        `SELECT t.token_number, t.sector, t.ai_summary, t.status, t.created_at, c.full_name
         FROM tickets t
         LEFT JOIN citizens c ON t.citizen_id = c.id
         WHERE DATE(t.created_at) = $1
         ORDER BY t.created_at DESC
         LIMIT 20`,
        [today]
      ),
    ]);

    // Extract most common services from JSONB array
    const serviceFreq = await pool.query(
      `SELECT jsonb_array_elements_text(detected_services) as service, COUNT(*) as count
       FROM tickets
       WHERE DATE(created_at) = $1 AND array_length(string_to_array(detected_services::text, ','), 1) > 0
       GROUP BY service
       ORDER BY count DESC
       LIMIT 10`,
      [today]
    );

    res.json({
      today: totals.rows[0],
      by_sector: bySector.rows,
      avg_service_time_minutes: avgTime.rows[0]?.avg_minutes || 0,
      recent_tickets: recentTickets.rows,
      top_services: serviceFreq.rows,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message, code: 'STATS_ERROR' });
  }
});

module.exports = router;
