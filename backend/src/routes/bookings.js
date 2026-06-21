const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// Générer une référence unique IVG-XXXX
function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'IVG-';
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

// ── POST /bookings — Créer une réservation
// Dans src/routes/bookings.js
// Remplace le POST / par ceci

router.post('/', requireAuth, async (req, res) => {
  const { tripDepartureId, tripId, seatNumber } = req.body;

  if ((!tripDepartureId && !tripId) || !seatNumber) {
    return res.status(400).json({ error: 'tripId et seatNumber requis' });
  }

  try {
    let depId  = tripDepartureId;
    let tripData;

    // Si pas de departure_id, utiliser tripId directement
    if (!depId && tripId) {
      const tripRes = await db.query(
        `SELECT t.*, c.id as company_id
         FROM trips t
         JOIN companies c ON t.company_id = c.id
         WHERE t.id = $1 AND t.is_active = TRUE`,
        [tripId]
      );

      if (!tripRes.rows.length) {
        return res.status(404).json({ error: 'Trajet introuvable' });
      }

      tripData = tripRes.rows[0];

      // Chercher ou créer un départ pour aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      let depRes = await db.query(
        `SELECT id FROM trip_departures 
         WHERE trip_id = $1 AND departure_date = $2`,
        [tripId, today]
      );

      if (!depRes.rows.length) {
        // Créer le départ
        depRes = await db.query(
          `INSERT INTO trip_departures (trip_id, departure_date, available_seats)
           VALUES ($1, $2, $3) RETURNING id`,
          [tripId, today, tripData.total_seats]
        );
      }

      depId = depRes.rows[0].id;
    }

    // Récupérer les infos du départ
    const depRes = await db.query(
      `SELECT td.*, t.price, t.company_id, t.id as trip_id,
              t.departure_city, t.arrival_city, t.total_seats
       FROM trip_departures td
       JOIN trips t ON td.trip_id = t.id
       WHERE td.id = $1 AND td.available_seats > 0`,
      [depId]
    );

    if (!depRes.rows.length) {
      return res.status(409).json({ error: 'Ce départ n\'est plus disponible' });
    }

    // Vérifier siège disponible
    const seatTaken = await db.query(
      `SELECT id FROM bookings 
       WHERE trip_departure_id = $1 AND seat_number = $2 
       AND status NOT IN ('cancelled')`,
      [depId, seatNumber]
    );

    if (seatTaken.rows.length) {
      return res.status(409).json({ error: 'Ce siège est déjà réservé' });
    }

    const dep = depRes.rows[0];

    const userRes = await db.query(
      'SELECT first_name, last_name, phone FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];

    // Générer référence unique
    const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let ref      = 'IVG-';
    for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];

    const { rows } = await db.query(
      `INSERT INTO bookings (
         reference, user_id, trip_departure_id, trip_id,
         company_id, passenger_name, passenger_phone,
         seat_number, amount, status
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING *`,
      [
        ref, req.user.id, depId, dep.trip_id,
        dep.company_id,
        `${user.first_name} ${user.last_name}`,
        user.phone,
        seatNumber,
        dep.price,
      ]
    );

    res.status(201).json({
      message: 'Réservation créée, procédez au paiement',
      booking: rows[0],
    });

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Erreur lors de la réservation' });
  }
});

// GET /bookings/:id/status — Statut d'une réservation
router.get('/:id/status', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.reference, b.status, b.amount,
              b.passenger_name, b.seat_number,
              t.departure_city, t.arrival_city, t.departure_time,
              td.departure_date,
              c.name as company_name,
              p.status as payment_status,
              p.payment_method,
              p.paid_at
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN trip_departures td ON b.trip_departure_id = td.id
       JOIN companies c ON b.company_id = c.id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.id = $1 AND b.user_id = $2
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    const bk = rows[0];

    // Retourner le statut lisible
    const statusMap = {
      pending:   { label: 'En attente de paiement', color: '#f59e0b', icon: '⏳' },
      confirmed: { label: 'Payé — Confirmé',         color: '#16a34a', icon: '<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i>' },
      cancelled: { label: 'Annulé',                  color: '#dc2626', icon: '❌' },
      used:      { label: 'Utilisé',                 color: '#6b7280', icon: '✓'  },
    };

    res.json({
      ...bk,
      statusInfo: statusMap[bk.status] || { label: bk.status, color: '#6b7280', icon: '?' },
    });

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /bookings/me — Mes réservations
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, 
              t.departure_city, t.arrival_city, t.departure_time, t.arrival_time,
              td.departure_date,
              c.name as company_name, c.color as company_color
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN trip_departures td ON b.trip_departure_id = td.id
       JOIN companies c ON b.company_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── PUT /bookings/:id/cancel — Annuler une réservation
router.put('/:id/cancel', requireAuth, async (req, res) => {
  const { reason } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE bookings 
       SET status = 'cancelled', cancellation_reason = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status = 'confirmed'
       RETURNING *`,
      [reason || 'Annulation utilisateur', req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Réservation introuvable ou déjà annulée' });
    }

    // Restituer la place
    await db.query(
      `UPDATE trip_departures SET available_seats = available_seats + 1
       WHERE id = $1`,
      [rows[0].trip_departure_id]
    );

    res.json({ message: 'Réservation annulée, remboursement sous 48h', booking: rows[0] });

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// POST /bookings/:id/confirm-test
// Route de test — génère QR Code + envoie email sans paiement réel
router.post('/:id/confirm-test', requireAuth, async (req, res) => {
  try {
    // 1. Récupérer la réservation
    const { rows } = await db.query(
      `SELECT b.*,
              t.departure_city, t.arrival_city, t.departure_time,
              td.departure_date,
              c.name as company_name,
              u.email as user_email
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       LEFT JOIN trip_departures td ON b.trip_departure_id = td.id
       JOIN companies c ON b.company_id = c.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    const booking = rows[0];

    // 2. Générer QR Code
    const { generateTicketQR } = require('../services/qrcode');
    const { qrData, qrImageBase64 } = await generateTicketQR({
      reference:      booking.reference,
      departure_city: booking.departure_city,
      arrival_city:   booking.arrival_city,
      departure_time: booking.departure_time,
      departure_date: booking.departure_date
                      || new Date().toISOString().split('T')[0],
      company_name:   booking.company_name,
      seat_number:    booking.seat_number,
      passenger_name: booking.passenger_name,
      amount:         booking.amount,
    });

    // 3. Confirmer la réservation en base
    await db.query(
      `UPDATE bookings
       SET status = 'confirmed',
           qr_code_data  = $1,
           qr_code_image = $2,
           updated_at    = NOW()
       WHERE id = $3`,
      [qrData, qrImageBase64, booking.id]
    );

    // 4. Créer entrée paiement test
    await db.query(
      `INSERT INTO payments
        (booking_id, user_id, provider, payment_method, amount, status, paid_at)
       VALUES ($1, $2, 'test', 'test', $3, 'success', NOW())`,
      [booking.id, req.user.id, booking.amount]
    );

    // 5. Envoyer email avec QR Code
    if (booking.user_email) {
      const { sendBookingConfirmation } = require('../services/email');
      sendBookingConfirmation(booking.user_email, {
        reference:      booking.reference,
        departure_city: booking.departure_city,
        arrival_city:   booking.arrival_city,
        departure_time: booking.departure_time,
        departure_date: booking.departure_date,
        company_name:   booking.company_name,
        seat_number:    booking.seat_number,
        passenger_name: booking.passenger_name,
        amount:         booking.amount,
        qr_code_image:  qrImageBase64,
      }).catch(err => console.error('Email error:', err.message));
    }

    res.json({
      message:  'Réservation confirmée avec QR Code',
      booking: {
        id:             booking.id,
        reference:      booking.reference,
        status:         'confirmed',
        qr_code_image:  qrImageBase64,
        departure_city: booking.departure_city,
        arrival_city:   booking.arrival_city,
        departure_time: booking.departure_time,
        company_name:   booking.company_name,
        seat_number:    booking.seat_number,
        passenger_name: booking.passenger_name,
        amount:         booking.amount,
        company_color:  '#f97316',
      },
    });

  } catch (err) {
    console.error('Confirm test error:', err);
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
});

module.exports = router;