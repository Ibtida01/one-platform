const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// POST /api/officers/login
router.post('/login', async (req, res) => {
  const { employee_id, password } = req.body;
  if (!employee_id || !password) {
    return res.status(400).json({ error: 'Employee ID and password required', code: 'MISSING_FIELDS' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, employee_id, role, counter FROM officers WHERE employee_id = $1 AND password = $2 AND is_active = true',
      [employee_id, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    const officer = result.rows[0];
    res.json({ officer, token: Buffer.from(`${officer.id}:${officer.employee_id}`).toString('base64') });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'LOGIN_ERROR' });
  }
});

// GET /api/officers — list all officers (admin only)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, employee_id, role, counter, is_active, created_at FROM officers ORDER BY created_at'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/officers/:id/stats
router.get('/:id/stats', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_served,
        AVG(EXTRACT(EPOCH FROM (completed_at - served_at))/60)::numeric(10,1) as avg_service_minutes,
        COUNT(CASE WHEN DATE(created_at) = $1 THEN 1 END) as today_count
       FROM tickets
       WHERE officer_id = $2 AND status = 'done'`,
      [today, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
