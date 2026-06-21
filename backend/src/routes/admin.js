const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Import unique — pas de doublon
let sendCompanyValidationEmail;
try {
  sendCompanyValidationEmail = require('../services/email').sendCompanyValidationEmail;
} catch (e) {
  sendCompanyValidationEmail = null;
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  next();
}

router.get('/companies', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, status,
              country, created_at, color, slogan
       FROM companies ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/companies/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, status,
              country, created_at, color, slogan,
              rccm, description, address
       FROM companies WHERE status = 'pending'
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/companies/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE companies SET status = 'verified', updated_at = NOW()
       WHERE id = $1 RETURNING id, name, email, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Compagnie introuvable' });

    if (sendCompanyValidationEmail && rows[0].email) {
      sendCompanyValidationEmail(rows[0].email, rows[0].name, 'verified')
        .catch(err => console.error('Email error:', err.message));
    }

    res.json({ message: 'Compagnie approuvée', company: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/companies/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE companies SET status = 'suspended', updated_at = NOW()
       WHERE id = $1 RETURNING id, name, email, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Compagnie introuvable' });

    if (sendCompanyValidationEmail && rows[0].email) {
      sendCompanyValidationEmail(rows[0].email, rows[0].name, 'suspended')
        .catch(err => console.error('Email error:', err.message));
    }

    res.json({ message: 'Compagnie rejetée', company: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/companies/:id/suspend', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE companies SET status = 'suspended', updated_at = NOW()
       WHERE id = $1 RETURNING id, name, status`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Compagnie introuvable' });
    res.json({ message: 'Compagnie suspendue', company: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [companies, users, bookings, revenue] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM companies WHERE status = 'verified'`),
      db.query(`SELECT COUNT(*) FROM users`),
      db.query(`SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'`),
      db.query(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'success'`),
    ]);
    res.json({
      companies:    parseInt(companies.rows[0].count),
      users:        parseInt(users.rows[0].count),
      bookings:     parseInt(bookings.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;