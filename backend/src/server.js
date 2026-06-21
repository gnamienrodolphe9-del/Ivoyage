require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { general } = require('./middleware/rateLimit');

const app = express();


// ── Sécurité & parsing
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,

}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(general); // Rate limiting global

// ── Routes
app.use('/auth',      require('./routes/auth'));
app.use('/trips',     require('./routes/trips'));
app.use('/bookings',  require('./routes/bookings'));
app.use('/payments',  require('./routes/payments'));
app.use('/companies', require('./routes/compagnies'));
app.use('/admin',     require('./routes/admin'));
app.use('/notifications', require('./routes/notifications'));

// ── Santé du serveur
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'DésirCompagny API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Route inconnue
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ── Erreur globale
app.use((err, req, res, next) => {
  console.error('Erreur non gérée :', err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ── Démarrage
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚌 DésirCompagny API démarré`);
  console.log(`📡 Port        : ${PORT}`);
  console.log(`🌍 Environnement : ${process.env.NODE_ENV}`);
  console.log(`🔗 URL         : http://localhost:${PORT}`);
  console.log(`❤️  Health      : http://localhost:${PORT}/health\n`);
});