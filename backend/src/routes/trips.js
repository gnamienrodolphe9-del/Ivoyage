const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireCompany } = require('../middleware/auth');

// ── GET /trips/search — Rechercher des trajets
router.get('/search', async (req, res) => {
  const { from, to, companyId } = req.query;

  // Recherche par compagnie
  if (companyId) {
    try {
      const { rows } = await db.query(
        `SELECT 
          t.id as trip_id,
          t.departure_city,
          t.arrival_city,
          t.departure_time,
          t.arrival_time,
          t.price,
          t.total_seats,
          t.recurrence,
          c.id as company_id,
          c.name as company_name,
          c.color as company_color
         FROM trips t
         JOIN companies c ON t.company_id = c.id
         WHERE t.company_id = $1
         AND t.is_active = TRUE
         AND c.status = 'verified'
         ORDER BY t.departure_time ASC`,
        [companyId]
      );
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  // Recherche par ville
  if (!from || !to) {
    return res.status(400).json({ error: 'Paramètres from et to requis' });
  }

  try {
    const { rows } = await db.query(
      `SELECT 
        t.id as trip_id,
        t.departure_city,
        t.arrival_city,
        t.departure_time,
        t.arrival_time,
        t.price,
        t.total_seats,
        t.recurrence,
        c.id as company_id,
        c.name as company_name,
        c.color as company_color,
        b.license_plate,
        b.amenities
       FROM trips t
       JOIN companies c ON t.company_id = c.id
       LEFT JOIN buses b ON t.bus_id = b.id
       WHERE 
         LOWER(t.departure_city) = LOWER($1)
         AND LOWER(t.arrival_city) = LOWER($2)
         AND t.is_active = TRUE
         AND c.status = 'verified'
       ORDER BY t.departure_time ASC`,
      [from, to]
    );
    res.json(rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// ── GET /trips/cities — Liste des villes disponibles
router.get('/cities', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT departure_city as city FROM trips WHERE is_active = TRUE
       UNION
       SELECT DISTINCT arrival_city FROM trips WHERE is_active = TRUE
       ORDER BY city`
    );
    res.json(rows.map(r => r.city));
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /trips/company — Trajets de la compagnie connectée
router.get('/company', requireCompany, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, b.license_plate, b.brand, b.model,
              s1.name as origin_station, s2.name as destination_station
       FROM trips t
       LEFT JOIN buses b ON t.bus_id = b.id
       LEFT JOIN stations s1 ON t.origin_station_id = s1.id
       LEFT JOIN stations s2 ON t.destination_station_id = s2.id
       WHERE t.company_id = $1
       ORDER BY t.created_at DESC`,
      [req.company.companyId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /trips — Créer un trajet (compagnie)
router.post('/', requireCompany, async (req, res) => {
  const {
    busId, departureCityId, arrivalCityId,
    departureCity, arrivalCity,
    departureTime, arrivalTime,
    price, totalSeats, recurrence,
    originStationId, destinationStationId,
  } = req.body;

  if (!departureCity || !arrivalCity || !departureTime || !price || !totalSeats) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO trips (
        company_id, bus_id, departure_city, arrival_city,
        departure_time, arrival_time, price, total_seats,
        recurrence, origin_station_id, destination_station_id
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.company.companyId, busId || null,
        departureCity, arrivalCity,
        departureTime, arrivalTime,
        price, totalSeats,
        recurrence || 'daily',
        originStationId || null,
        destinationStationId || null,
      ]
    );

    const trip = rows[0];

    // Générer automatiquement les prochains départs (30 jours)
    if (recurrence === 'daily') {
      const departures = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        departures.push([trip.id, date.toISOString().split('T')[0], totalSeats]);
      }

      for (const dep of departures) {
        await db.query(
          `INSERT INTO trip_departures (trip_id, departure_date, available_seats)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          dep
        );
      }
    }

    res.status(201).json({ message: 'Trajet créé avec succès', trip });

  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du trajet' });
  }
});

// ── PUT /trips/:id — Modifier un trajet
router.put('/:id', requireCompany, async (req, res) => {
  const { departureTime, arrivalTime, price, totalSeats, status, busId } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE trips SET
         departure_time = COALESCE($1, departure_time),
         arrival_time = COALESCE($2, arrival_time),
         price = COALESCE($3, price),
         total_seats = COALESCE($4, total_seats),
         status = COALESCE($5, status),
         bus_id = COALESCE($6, bus_id)
       WHERE id = $7 AND company_id = $8
       RETURNING *`,
      [departureTime, arrivalTime, price, totalSeats, status, busId, req.params.id, req.company.companyId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Trajet introuvable' });

    res.json({ message: 'Trajet mis à jour', trip: rows[0] });

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE /trips/:id — Supprimer un trajet
router.delete('/:id', requireCompany, async (req, res) => {
  try {
    await db.query(
      `UPDATE trips SET is_active = FALSE WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.company.companyId]
    );
    res.json({ message: 'Trajet supprimé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;