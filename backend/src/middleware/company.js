// Ce fichier est géré dans auth.js via requireCompany
// Tu peux l'utiliser pour des vérifications spécifiques aux compagnies

const db = require('../config/db');

async function requireVerifiedCompany(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT status FROM companies WHERE id = $1',
      [req.company.companyId]
    );

    if (!rows.length || rows[0].status !== 'verified') {
      return res.status(403).json({
        error: 'Votre compte est en attente de vérification par Deircompany. Veuillez patienter ou contacter le support.',
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { requireVerifiedCompany };