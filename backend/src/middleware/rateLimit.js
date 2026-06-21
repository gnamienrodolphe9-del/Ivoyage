const rateLimit = require('express-rate-limit');

// Limite générale — 100 requêtes / 15 min par IP
const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite stricte pour auth — 10 tentatives / 15 min
const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limite paiements — 20 / 15 min
const payment = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: 'Trop de tentatives de paiement' },
});

module.exports = { general, auth, payment };