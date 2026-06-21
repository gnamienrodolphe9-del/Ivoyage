const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Email service error:', error.message);
  } else {
    console.log('<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> Email service prêt');
  }
});

async function sendBookingConfirmation(email, booking) {
  if (!email || !process.env.SMTP_USER) return;

  // Convertir base64 en buffer pour la pièce jointe
  let attachments = [];
  if (booking.qr_code_image) {
    const base64Data = booking.qr_code_image.replace(
      /^data:image\/png;base64,/, ''
    );
    attachments = [{
      filename:    'ticket-qrcode.png',
      content:     Buffer.from(base64Data, 'base64'),
      contentType: 'image/png',
      cid:         'qrcode@desircompagny',
    }];
  }

  await transporter.sendMail({
    from:        `"DésirCompagny" <${process.env.SMTP_USER}>`,
    to:          email,
    subject:     `<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> Ticket confirmé — ${booking.reference} | DésirCompagny`,
    attachments,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#f97316;padding:24px;text-align:center;
                    border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0">🚌 DésirCompagny</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e5e5;
                    border-radius:0 0 12px 12px">
          <h2 style="color:#0c0a09">🎉 Réservation confirmée !</h2>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr>
              <td style="padding:8px;background:#f5f5f4;border-radius:6px;
                          font-size:12px;color:#78716c;font-weight:700">
                RÉFÉRENCE
              </td>
              <td style="padding:8px;font-weight:700;color:#f97316">
                ${booking.reference}
              </td>
            </tr>
            <tr>
              <td style="padding:8px;font-size:12px;color:#78716c;font-weight:700">
                TRAJET
              </td>
              <td style="padding:8px;font-weight:600">
                ${booking.departure_city} → ${booking.arrival_city}
              </td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f5f5f4;border-radius:6px;
                          font-size:12px;color:#78716c;font-weight:700">
                DÉPART
              </td>
              <td style="padding:8px;font-weight:600">
                ${(booking.departure_time || '').substring(0,5)}
              </td>
            </tr>
            <tr>
              <td style="padding:8px;font-size:12px;color:#78716c;font-weight:700">
                COMPAGNIE
              </td>
              <td style="padding:8px;font-weight:600">
                ${booking.company_name}
              </td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f5f5f4;border-radius:6px;
                          font-size:12px;color:#78716c;font-weight:700">
                PASSAGER
              </td>
              <td style="padding:8px;font-weight:600">
                ${booking.passenger_name}
              </td>
            </tr>
            <tr>
              <td style="padding:8px;font-size:12px;color:#78716c;font-weight:700">
                SIÈGE(S)
              </td>
              <td style="padding:8px;font-weight:600">
                ${Array.isArray(booking.seat_number)
                  ? booking.seat_number.join(', ')
                  : booking.seat_number}
              </td>
            </tr>
            <tr>
              <td style="padding:8px;background:#fff7ed;border-radius:6px;
                          font-size:12px;color:#c2580a;font-weight:700">
                MONTANT TOTAL
              </td>
              <td style="padding:8px;font-weight:800;font-size:18px;color:#f97316">
                ${Number(booking.amount || 0).toLocaleString('fr-FR')} FCFA
              </td>
            </tr>
          </table>

          ${attachments.length ? `
          <div style="text-align:center;margin:20px 0;padding:16px;
                      background:#f5f5f4;border-radius:12px">
            <img src="cid:qrcode@desircompagny"
                 alt="QR Code"
                 style="width:160px;height:160px;border-radius:8px"/>
            <p style="color:#666;font-size:13px;margin-top:8px">
              Présentez ce QR Code à l'embarquement
            </p>
          </div>
          ` : ''}

          <div style="background:#fff7ed;border-radius:10px;
                      padding:14px;border:1px solid #fed7aa;margin-top:16px">
            <p style="margin:0;font-size:13px;color:#c2580a;font-weight:600">
              📋 Instructions
            </p>
            <ul style="margin:8px 0 0;padding-left:16px;
                       font-size:13px;color:#78716c;line-height:1.8">
              <li>Arrivez 15 minutes avant le départ</li>
              <li>Présentez ce mail ou le QR Code dans l'app</li>
              <li>Pièce d'identité requise</li>
            </ul>
          </div>

          <p style="color:#999;font-size:12px;
                    margin-top:20px;text-align:center">
            Bon voyage ! — DésirCompagny 🇨🇮
          </p>
        </div>
      </div>
    `,
  });

  console.log(`📧 Email + QR Code envoyés à ${email}`);
}

async function sendWelcomeEmail(email, firstName) {
  if (!email || !process.env.SMTP_USER) return;
  await transporter.sendMail({
    from:    `"DésirCompagny" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Bienvenue sur DésirCompagny, ${firstName} ! 🎉`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#f97316;padding:24px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0">🚌 DésirCompagny</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e5e5;border-radius:0 0 12px 12px;text-align:center">
          <h2>Bienvenue ${firstName} ! 👋</h2>
          <p style="color:#666">Votre compte DésirCompagny est créé.<br/>
          Réservez vos tickets de bus en quelques clics.</p>
          <p style="color:#999;font-size:12px;margin-top:24px">
            Bon voyage ! — DésirCompagny 🇨🇮
          </p>
        </div>
      </div>
    `,
  });
}

async function sendCompanyValidationEmail(email, companyName, status) {
  if (!email || !process.env.SMTP_USER) return;
  const isApproved = status === 'verified';
  await transporter.sendMail({
    from:    `"DésirCompagny" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: isApproved
      ? `<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> ${companyName} — Compte approuvé`
      : `❌ ${companyName} — Demande refusée`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <div style="background:${isApproved ? '#16a34a' : '#dc2626'};padding:24px;
                    text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0">🚌 DésirCompagny</h1>
        </div>
        <div style="padding:24px;border:1px solid #e5e5e5;
                    border-radius:0 0 12px 12px;text-align:center">
          <h2>${isApproved ? '🎉 Compte approuvé !' : '😔 Demande refusée'}</h2>
          <p style="color:#666">
            ${isApproved
              ? `${companyName} est maintenant active sur DésirCompagny. Connectez-vous pour gérer vos trajets.`
              : `La demande de ${companyName} n'a pas été approuvée. Contactez notre équipe.`}
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = {
  sendBookingConfirmation,
  sendWelcomeEmail,
  sendCompanyValidationEmail,
};