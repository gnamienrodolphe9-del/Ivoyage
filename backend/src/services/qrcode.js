const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

async function generateTicketQR(booking) {
  const qrData = JSON.stringify({
    ref: booking.reference,
    trip: `${booking.departure_city}→${booking.arrival_city}`,
    company: booking.company_name,
    dep: booking.departure_time,
    date: booking.departure_date,
    seat: booking.seat_number,
    passenger: booking.passenger_name,
    amount: booking.amount,
    token: uuidv4(),
  });

  const qrImageBase64 = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 2,
  });

  return { qrData, qrImageBase64 };
}

module.exports = { generateTicketQR };