const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const db         = require('../config/db');
const { requireCompany } = require('../middleware/auth');

// ════════════════════════════════════════
// ROUTES PUBLIQUES (sans auth)
// ════════════════════════════════════════

// GET /companies — Liste des compagnies approuvées
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, color, logo_url, slogan,
              (SELECT COUNT(*) FROM trips 
               WHERE company_id = companies.id 
               AND is_active = TRUE) as trip_count
       FROM companies
       WHERE status = 'verified'
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /companies/register — Inscription compagnie
router.post('/register', async (req, res) => {
  const {
    name, email, phone, whatsapp, website,
    address, country, rccm, ncc, description,
    color, slogan, fleetSize, foundedDate,
    adminFirstName, adminLastName, adminRole, password,
  } = req.body;

  if (!name || !email || !phone || !password || !adminFirstName || !adminLastName) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const exists = await db.query(
      'SELECT id FROM companies WHERE email = $1', [email]
    );
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const coRes = await db.query(
      `INSERT INTO companies 
        (name, slug, email, phone, whatsapp, website, address, country,
         rccm, ncc, description, color, slogan, fleet_size, founded_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, name, status`,
      [
        name, slug, email, phone,
        whatsapp || null, website || null, address || null,
        country || "Côte d'Ivoire",
        rccm || null, ncc || null, description || null,
        color || '#f97316', slogan || null,
        fleetSize || null, foundedDate || null,
      ]
    );

    const company = coRes.rows[0];

    await db.query(
      `INSERT INTO company_users 
        (company_id, first_name, last_name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [company.id, adminFirstName, adminLastName,
       email, passwordHash, adminRole || 'admin']
    );

    res.status(201).json({
      message: "Demande d'inscription envoyée. Validation sous 48h.",
      company: { id: company.id, name: company.name, status: company.status },
    });

  } catch (err) {
    console.error('Company register error:', err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

// ════════════════════════════════════════
// ROUTES DASHBOARD (avec auth compagnie)
// ════════════════════════════════════════

// GET /companies/dashboard/stats
router.get('/dashboard/stats', requireCompany, async (req, res) => {
  const companyId = req.company.companyId;
  try {
    const [tickets, revenue, trips, buses, stations] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM bookings 
         WHERE company_id=$1 AND status='confirmed'
         AND created_at >= NOW() - INTERVAL '30 days'`,
        [companyId]
      ),
      db.query(
        `SELECT COALESCE(SUM(p.amount),0) as total
         FROM payments p
         JOIN bookings b ON p.booking_id=b.id
         WHERE b.company_id=$1 AND p.status='success'
         AND p.paid_at >= NOW() - INTERVAL '30 days'`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*) FROM trips WHERE company_id=$1 AND is_active=TRUE`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*) FROM buses WHERE company_id=$1`,
        [companyId]
      ),
      db.query(
        `SELECT COUNT(*) FROM stations WHERE company_id=$1 AND is_active=TRUE`,
        [companyId]
      ),
    ]);
    res.json({
      tickets:  parseInt(tickets.rows[0].count),
      revenue:  parseFloat(revenue.rows[0].total),
      trips:    parseInt(trips.rows[0].count),
      buses:    parseInt(buses.rows[0].count),
      stations: parseInt(stations.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /companies/stations
router.get('/stations', requireCompany, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM stations WHERE company_id=$1 ORDER BY created_at DESC`,
      [req.company.companyId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /companies/stations
router.post('/stations', requireCompany, async (req, res) => {
  const { name, city, country, address, type, capacity, managerName, managerPhone } = req.body;
  if (!name || !city) {
    return res.status(400).json({ error: 'Nom et ville obligatoires' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO stations
        (company_id, name, city, country, address, type, capacity, manager_name, manager_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.company.companyId, name, city,
       country || "Côte d'Ivoire", address,
       type || 'main', capacity || 0, managerName, managerPhone]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /companies/buses
router.get('/buses', requireCompany, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM buses WHERE company_id=$1 ORDER BY created_at DESC`,
      [req.company.companyId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /companies/buses
router.post('/buses', requireCompany, async (req, res) => {
  const { licensePlate, brand, model, year, capacity, amenities, lastRevision, status } = req.body;
  if (!licensePlate || !capacity) {
    return res.status(400).json({ error: 'Immatriculation et capacité obligatoires' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO buses
        (company_id, license_plate, brand, model, year, capacity, amenities, last_revision, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.company.companyId, licensePlate, brand, model, year,
       capacity, amenities || [], lastRevision || null, status || 'active']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /companies/profile
router.put('/profile', requireCompany, async (req, res) => {
  const { name, slogan, phone, whatsapp, website, color } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE companies
       SET name=COALESCE($1,name), slogan=COALESCE($2,slogan),
           phone=COALESCE($3,phone), whatsapp=COALESCE($4,whatsapp),
           website=COALESCE($5,website), color=COALESCE($6,color),
           updated_at=NOW()
       WHERE id=$7
       RETURNING id, name, slogan, phone, color`,
      [name, slogan, phone, whatsapp, website, color, req.company.companyId]
    );
    res.json({ message: 'Profil mis à jour', company: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ════════════════════════════════════════
// ROUTE AVEC PARAMÈTRE — EN DERNIER
// ════════════════════════════════════════

// GET /companies/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, color, logo_url, slogan, phone, whatsapp, website, country
       FROM companies WHERE id=$1 AND status='verified'`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Compagnie introuvable' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /companies/bookings — Réservations reçues par la compagnie
router.get('/bookings', requireCompany, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.reference, b.passenger_name, b.passenger_phone,
              b.seat_number, b.amount, b.status, b.created_at,
              t.departure_city, t.arrival_city, t.departure_time,
              td.departure_date
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       LEFT JOIN trip_departures td ON b.trip_departure_id = td.id
       WHERE b.company_id = $1
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [req.company.companyId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Bookings company error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// PUT /companies/stations/:id
router.put('/stations/:id', requireCompany, async (req, res) => {
  const { name, city, country, address, capacity, managerName, managerPhone } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE stations SET
        name = COALESCE($1, name),
        city = COALESCE($2, city),
        country = COALESCE($3, country),
        address = COALESCE($4, address),
        capacity = COALESCE($5, capacity),
        manager_name = COALESCE($6, manager_name),
        manager_phone = COALESCE($7, manager_phone)
       WHERE id = $8 AND company_id = $9
       RETURNING *`,
      [name, city, country, address, capacity, managerName, managerPhone,
       req.params.id, req.company.companyId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Gare introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /companies/buses/:id
router.put('/buses/:id', requireCompany, async (req, res) => {
  const { licensePlate, brand, model, year, capacity, status, amenities } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE buses SET
        license_plate = COALESCE($1, license_plate),
        brand = COALESCE($2, brand),
        model = COALESCE($3, model),
        year = COALESCE($4, year),
        capacity = COALESCE($5, capacity),
        status = COALESCE($6, status),
        amenities = COALESCE($7, amenities)
       WHERE id = $8 AND company_id = $9
       RETURNING *`,
      [licensePlate, brand, model, year, capacity, status,
       amenities, req.params.id, req.company.companyId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Bus introuvable' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /companies/stations/:id
router.delete('/stations/:id', requireCompany, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM stations WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.company.companyId]
    );
    res.json({ message: 'Gare supprimée' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /companies/buses/:id
router.delete('/buses/:id', requireCompany, async (req, res) => {
  try {
    await db.query(
      `DELETE FROM buses WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.company.companyId]
    );
    res.json({ message: 'Bus supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


module.exports = router;
