const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendTicketSMS(phone, booking) {
  const message = [
    '🎫 iVoyage — TICKET CONFIRMÉ',
    `Réf: ${booking.reference}`,
    `${booking.departure_city} → ${booking.arrival_city}`,
    `📅 ${booking.departure_date} à ${booking.departure_time}`,
    `🚌 ${booking.company_name}`,
    `🪑 Siège ${booking.seat_number}`,
    `💰 ${Number(booking.amount).toLocaleString('fr-FR')} FCFA`,
    'Présentez ce SMS ou votre QR Code à l\'embarquement.',
    'Bon voyage ! — iVoyage',
  ].join('\n');

  const formattedPhone = phone.startsWith('+')
    ? phone
    : `+225${phone.replace(/\s/g, '')}`;

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to: formattedPhone,
  });
}

module.exports = { sendTicketSMS };