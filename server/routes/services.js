const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/services — list all services grouped by sector
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY sector, name');
    const grouped = result.rows.reduce((acc, s) => {
      if (!acc[s.sector]) acc[s.sector] = [];
      acc[s.sector].push(s);
      return acc;
    }, {});
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SERVICES_ERROR' });
  }
});

// PATCH /api/services/:slug — toggle active/inactive
router.patch('/:slug', async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE services SET is_active = $1 WHERE slug = $2 RETURNING *',
      [is_active, req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found', code: 'NOT_FOUND' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'SERVICE_UPDATE_ERROR' });
  }
});

module.exports = router;
