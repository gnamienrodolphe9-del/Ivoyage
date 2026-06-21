const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /notifications — Mes notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /notifications/read — Marquer tout comme lu
router.put('/read', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ message: 'Notifications lues' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;