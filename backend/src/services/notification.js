const db = require('../config/db');

async function createNotification(userId, { title, body, type = 'info' }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, body, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, title, body, type]
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

// Notification de confirmation de réservation
async function notifyBookingConfirmed(userId, booking) {
  await createNotification(userId, {
    title: '<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> Réservation confirmée',
    body:  `Votre ticket ${booking.reference} pour ${booking.departure_city} → ${booking.arrival_city} est confirmé.`,
    type:  'booking',
  });
}

// Notification d'annulation
async function notifyBookingCancelled(userId, booking) {
  await createNotification(userId, {
    title: '❌ Réservation annulée',
    body:  `Votre ticket ${booking.reference} a été annulé. Remboursement sous 48h.`,
    type:  'booking',
  });
}

// Notification de rappel départ
async function notifyDepartureReminder(userId, booking) {
  await createNotification(userId, {
    title: '🚌 Rappel de départ',
    body:  `Votre bus part dans 2h — ${booking.departure_city} → ${booking.arrival_city} à ${booking.departure_time}.`,
    type:  'trip',
  });
}

module.exports = {
  createNotification,
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyDepartureReminder,
};