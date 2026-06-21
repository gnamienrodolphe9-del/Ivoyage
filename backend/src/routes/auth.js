const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const db         = require('../config/db');
const { auth: authLimit } = require('../middleware/rateLimit');

// Import email service — EN HAUT du fichier
let sendWelcomeEmail;
try {
  sendWelcomeEmail = require('../services/email').sendWelcomeEmail;
} catch (e) {
  sendWelcomeEmail = null;
}

// ══════════════════════════════════════════
// GÉNÉRER LES TOKENS
// ══════════════════════════════════════════
function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
}

// ══════════════════════════════════════════
// POST /auth/register — Inscription utilisateur
// ══════════════════════════════════════════
router.post('/register', authLimit, async (req, res) => {
  const { firstName, lastName, phone, email, password, city } = req.body;

  if (!firstName || !lastName || !phone || !password) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const exists = await db.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );

    if (exists.rows.length) {
      return res.status(409).json({ error: 'Ce numéro est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await db.query(
      `INSERT INTO users (first_name, last_name, phone, email, password_hash, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, phone, email, city`,
      [firstName, lastName, phone, email || null, passwordHash, city || null]
    );

    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens({
      id:    user.id,
      phone: user.phone,
      type:  'user',
    });

    // Envoyer email de bienvenue en arrière-plan
    if (email && sendWelcomeEmail) {
      sendWelcomeEmail(email, firstName).catch(err =>
        console.error('Email welcome error:', err.message)
      );
    }

    res.status(201).json({
      message: 'Compte créé avec succès',
      token:   accessToken,
      refreshToken,
      user: {
        id:        user.id,
        firstName: user.first_name,
        lastName:  user.last_name,
        phone:     user.phone,
        email:     user.email,
        city:      user.city,
      },
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

// ══════════════════════════════════════════
// POST /auth/login — Connexion utilisateur
// ══════════════════════════════════════════
router.post('/login', authLimit, async (req, res) => {
  const { phone, email, password } = req.body;

  if ((!phone && !email) || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  }

  try {
    let query, param;

    if (email) {
      query = `SELECT id, first_name, last_name, phone, email, city,
                      password_hash, preferred_payment
               FROM users WHERE email = $1`;
      param = email;
    } else {
      query = `SELECT id, first_name, last_name, phone, email, city,
                      password_hash, preferred_payment
               FROM users WHERE phone = $1`;
      param = phone;
    }

    const { rows } = await db.query(query, [param]);

    if (!rows.length) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id:    user.id,
      phone: user.phone,
      type:  'user',
    });

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        id:               user.id,
        firstName:        user.first_name,
        lastName:         user.last_name,
        phone:            user.phone,
        email:            user.email,
        city:             user.city,
        preferredPayment: user.preferred_payment,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// ══════════════════════════════════════════
// POST /auth/company/login — Connexion compagnie
// ══════════════════════════════════════════
router.post('/company/login', authLimit, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const { rows } = await db.query(
      `SELECT cu.id, cu.first_name, cu.last_name, cu.email, cu.password_hash,
              cu.role, cu.company_id,
              c.name as company_name, c.color, c.status as company_status,
              c.logo_url, c.slogan, c.email as company_email
       FROM company_users cu
       JOIN companies c ON cu.company_id = c.id
       WHERE cu.email = $1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const cu    = rows[0];
    const valid = await bcrypt.compare(password, cu.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const { accessToken, refreshToken } = generateTokens({
      id:        cu.id,
      companyId: cu.company_id,
      email:     cu.email,
      type:      'company',
      role:      cu.role,
    });

    res.json({
      token: accessToken,
      refreshToken,
      company: {
        id:        cu.company_id,
        name:      cu.company_name,
        color:     cu.color,
        status:    cu.company_status,
        logoUrl:   cu.logo_url,
        slogan:    cu.slogan,
        email:     cu.company_email,
        adminName: `${cu.first_name} ${cu.last_name}`,
        role:      cu.role,
      },
    });

  } catch (err) {
    console.error('Company login error:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// ══════════════════════════════════════════
// POST /auth/refresh — Renouveler le token
// ══════════════════════════════════════════
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token manquant' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { accessToken, refreshToken: newRefresh } = generateTokens({
      id:        decoded.id,
      phone:     decoded.phone,
      companyId: decoded.companyId,
      email:     decoded.email,
      type:      decoded.type,
      role:      decoded.role,
    });

    res.json({ token: accessToken, refreshToken: newRefresh });

  } catch (err) {
    res.status(401).json({ error: 'Refresh token invalide ou expiré' });
  }
});

module.exports = router;