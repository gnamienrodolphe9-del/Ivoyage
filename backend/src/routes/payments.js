const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { initPayment, checkPaymentStatus } = require('../services/cinetpay');
const { generateTicketQR } = require('../services/qrcode');
const { sendTicketSMS } = require('../services/sms');
const { requireAuth } = require('../middleware/auth');
const { sendBookingConfirmation } = require('../services/email');

// POST /payments/initiate — Lance le paiement
router.post('/initiate', requireAuth, async (req, res) => {
  const { bookingId, paymentMethod } = req.body;

  try {
    const { rows } = await db.query(
      `SELECT b.*, 
              t.departure_city, t.arrival_city, t.departure_time,
              c.name as company_name,
              u.first_name, u.last_name, u.phone
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN companies c ON b.company_id = c.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'pending'`,
      [bookingId, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    const booking = rows[0];

    // Créer l'entrée paiement
    const payRes = await db.query(
      `INSERT INTO payments (booking_id, user_id, provider, payment_method, amount)
       VALUES ($1, $2, 'cinetpay', $3, $4) RETURNING id`,
      [bookingId, req.user.id, paymentMethod, booking.amount]
    );
    const paymentId = payRes.rows[0].id;

    // Initier chez CinetPay
    const { paymentUrl, transactionId } = await initPayment({
      amount: booking.amount,
      bookingRef: booking.reference,
      description: `${booking.departure_city} → ${booking.arrival_city} | ${booking.company_name}`,
      customerPhone: booking.phone,
      customerName: `${booking.first_name} ${booking.last_name}`,
    });

    // Sauvegarder le transaction_id
    await db.query(
      `UPDATE payments SET transaction_id = $1, payment_url = $2 WHERE id = $3`,
      [transactionId, paymentUrl, paymentId]
    );

    res.json({ paymentUrl, paymentId });

  } catch (err) {
    console.error('Initiate payment error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'initiation du paiement' });
  }
});

// POST /payments/notify — Webhook CinetPay
router.post('/notify', async (req, res) => {
  const { cpm_trans_id } = req.body;

  try {
    const check = await checkPaymentStatus(cpm_trans_id);

    if (check.data?.status !== 'ACCEPTED') {
      await db.query(
        `UPDATE payments SET status = 'failed' WHERE transaction_id = $1`,
        [cpm_trans_id]
      );
      return res.status(200).send('FAILED');
    }

    const { rows } = await db.query(
      `SELECT p.*, 
              b.id as booking_id, b.reference, b.seat_number,
              b.passenger_name, b.passenger_phone, b.amount as booking_amount,
              b.trip_departure_id,
              t.departure_city, t.arrival_city, t.departure_time,
              td.departure_date,
              c.name as company_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN trips t ON b.trip_id = t.id
       JOIN trip_departures td ON b.trip_departure_id = td.id
       JOIN companies c ON b.company_id = c.id
       WHERE p.transaction_id = $1`,
      [cpm_trans_id]
    );

    if (!rows.length) return res.status(200).send('NOT_FOUND');

    const payment = rows[0];

    // Générer le QR Code
    const { qrData, qrImageBase64 } = await generateTicketQR({
      reference: payment.reference,
      departure_city: payment.departure_city,
      arrival_city: payment.arrival_city,
      departure_time: payment.departure_time,
      departure_date: payment.departure_date,
      company_name: payment.company_name,
      seat_number: payment.seat_number,
      passenger_name: payment.passenger_name,
      amount: payment.booking_amount,
    });

    // Transaction base de données
    await db.query('BEGIN');

    await db.query(
      `UPDATE payments 
       SET status = 'success', paid_at = NOW() 
       WHERE transaction_id = $1`,
      [cpm_trans_id]
    );

    await db.query(
      `UPDATE bookings 
       SET status = 'confirmed', qr_code_data = $1, 
           qr_code_image = $2, updated_at = NOW()
       WHERE id = $3`,
      [qrData, qrImageBase64, payment.booking_id]
    );

    await db.query(
      `UPDATE trip_departures 
       SET available_seats = available_seats - 1
       WHERE id = $1`,
      [payment.trip_departure_id]
    );

    await db.query('COMMIT');

    // Récupérer l'email de l'utilisateur
const userRes = await db.query(
  'SELECT email FROM users WHERE id = $1',
  [payment.user_id]
);
const userEmail = userRes.rows[0]?.email;

if (userEmail) {
  sendBookingConfirmation(userEmail, {
    reference:      payment.reference,
    departure_city: payment.departure_city,
    arrival_city:   payment.arrival_city,
    departure_time: payment.departure_time,
    departure_date: payment.departure_date,
    company_name:   payment.company_name,
    seat_number:    payment.seat_number,
    passenger_name: payment.passenger_name,
    amount:         payment.booking_amount,
    qr_code_image:  qrImageBase64,
  }).catch(err => console.error('Email error:', err.message));
}

    // Envoyer SMS
    await sendTicketSMS(payment.passenger_phone, {
      reference: payment.reference,
      departure_city: payment.departure_city,
      arrival_city: payment.arrival_city,
      departure_date: payment.departure_date,
      departure_time: payment.departure_time,
      company_name: payment.company_name,
      seat_number: payment.seat_number,
      amount: payment.booking_amount,
    });

    res.status(200).send('OK');

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Webhook error:', err);
    res.status(500).send('ERROR');
  }
});

// GET /payments/verify/:ref — Vérifier après retour de paiement
router.get('/verify/:ref', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.status, b.qr_code_image, b.reference, b.seat_number,
              b.amount, b.passenger_name,
              t.departure_city, t.arrival_city, t.departure_time,
              td.departure_date,
              c.name as company_name, c.color as company_color
       FROM bookings b
       JOIN trips t ON b.trip_id = t.id
       JOIN trip_departures td ON b.trip_departure_id = td.id
       JOIN companies c ON b.company_id = c.id
       WHERE b.reference = $1 AND b.user_id = $2`,
      [req.params.ref, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /payments/history — Historique des paiements
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.amount, p.payment_method, p.status, p.paid_at,
              b.reference, b.seat_number,
              t.departure_city, t.arrival_city,
              c.name as company_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN trips t ON b.trip_id = t.id
       JOIN companies c ON b.company_id = c.id
       WHERE p.user_id = $1 AND p.status = 'success'
       ORDER BY p.paid_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;