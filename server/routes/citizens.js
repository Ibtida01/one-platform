const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/citizens/lookup/:nid
router.get('/lookup/:nid', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM citizens WHERE national_id = $1',
      [req.params.nid]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Citizen not found', code: 'NOT_FOUND' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'LOOKUP_ERROR' });
  }
});

module.exports = router;
