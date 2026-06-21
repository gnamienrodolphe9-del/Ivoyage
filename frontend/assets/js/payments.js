// ══════════════════════════════════════════
// PAIEMENT
// ══════════════════════════════════════════
function openPayHist() {
  openModal('payHistModal');
  loadPayHistory();
}

function goToPay() {
  if (!selectedSeat || (Array.isArray(selectedSeat) && !selectedSeat.length)) {
    toast('Veuillez sélectionner un siège', 'var(--red)');
    return;
  }

  const t       = pendingBooking;
  const count   = window.passengerCount || 1;
  const isAR    = window.ticketType     === 'ar';
  const base    = window.tripBasePrice  || t.price || 0;
  const total   = base * count * (isAR ? 2 : 1);
  const seats   = Array.isArray(selectedSeat) ? selectedSeat : [selectedSeat];

  const body = document.getElementById('payBody');
  if (!body) return;

  body.innerHTML = `
    <div style="background:var(--bg2);border-radius:var(--r);
                padding:13px;margin-bottom:16px;text-align:center">
      <div style="font-size:12px;color:var(--ink5)">
        ${count > 1 ? count + ' passagers' : '1 passager'} ·
        Siège${seats.length > 1 ? 's' : ''} ${seats.join(', ')}
        ${isAR ? ' · Aller-Retour' : ''}
      </div>
      <div style="font-family:'arial',sans-serif;font-size:28px;
                  font-weight:800;color:var(--or);margin:6px 0">
        ${Number(total).toLocaleString('fr-FR')} FCFA
      </div>
      <div style="font-size:13px;font-weight:600">
        ${t.departure_city} → ${t.arrival_city} ·
        ${(t.departure_time || '').substring(0, 5)}
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;color:var(--ink5);
                text-transform:uppercase;margin-bottom:10px">
      Mode de paiement
    </div>

    <div id="payOpts">
      ${PAYMENT_METHODS.map((m, i) => `
        <div class="pay-option${i === 0 ? ' on' : ''}"
             onclick="pickPay(this)"
             data-method="${m.id}">
          <img src="${m.img}" alt="${m.label}"
               style="width:40px;height:32px;object-fit:contain;
                      flex-shrink:0;border-radius:6px"/>
          <span style="font-weight:600;font-size:14px;flex:1">${m.label}</span>
          <div class="pay-option-dot">
            ${i === 0 ? '<span style="width:10px;height:10px;border-radius:50%;background:var(--or);display:block"></span>' : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin:14px 0">
      <label style="font-size:11px;font-weight:700;color:var(--ink5);
                    text-transform:uppercase;display:block;margin-bottom:6px">
        Numéro Mobile Money
      </label>
      <input id="payPhone" type="tel"
             placeholder="+225 07 00 00 00 00"
             style="width:100%;border:1.5px solid var(--border2);
                    border-radius:11px;padding:12px 14px;font-size:14px;
                    background:var(--bg)"/>
    </div>

    <button class="btn-main" onclick="confirmPay()">
      💳 Payer maintenant
    </button>
    <p style="font-size:11px;color:var(--ink5);text-align:center;margin-top:10px">
      🔒 Paiement 100% sécurisé
    </p>
  `;

  openModal('payModal');
}

function pickPay(el) {
  document.querySelectorAll('#payOpts .pay-option').forEach(o => {
    o.classList.remove('on');
    o.querySelector('.pay-option-dot').innerHTML = '';
  });
  el.classList.add('on');
  el.querySelector('.pay-option-dot').innerHTML =
    '<span style="width:10px;height:10px;border-radius:50%;background:var(--or);display:block"></span>';
}

async function confirmPay() {
  const phoneEl = document.getElementById('payPhone');
  if (!phoneEl || !phoneEl.value.trim()) {
    toast('Entrez votre numéro Mobile Money', 'var(--red)');
    return;
  }

  const seats = Array.isArray(selectedSeat)
    ? selectedSeat
    : [selectedSeat].filter(Boolean);

  if (!seats.length) {
    toast('Aucun siège sélectionné', 'var(--red)');
    return;
  }

  const isAR    = window.ticketType    === 'ar';
  const count   = window.passengerCount || 1;
  const base    = window.tripBasePrice  || pendingBooking.price || 0;
  const total   = base * seats.length * (isAR ? 2 : 1);

  try {
    toast('Création des réservations...', 'var(--ink2)');

    const bookings = [];

    for (const seat of seats) {
      const bookingData = await apiFetch('/bookings', {
        method: 'POST',
        body:   JSON.stringify({
          tripId:     pendingBooking.trip_id,
          seatNumber: String(seat),
        }),
      });
      bookings.push(bookingData.booking);
    }

    toast('Confirmation en cours...', 'var(--or)');

    const confirmed = [];
    for (const bk of bookings) {
      const result = await apiFetch(
        `/bookings/${bk.id}/confirm-test`,
        { method: 'POST' }
      );
      confirmed.push(result.booking);
    }

    closeModal('payModal');
    showMultiTicket(confirmed, total, isAR);
    toast('<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> ' + seats.length + ' ticket(s) confirmé(s) !', 'var(--green)');
    loadMyBookings().catch(() => {});

  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// VÉRIFICATION RETOUR PAIEMENT CINETPAY
// ══════════════════════════════════════════
async function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const ref    = params.get('ref');
  if (!ref) return;

  try {
    const booking = await apiFetch(`/payments/verify/${ref}`);
    if (booking.status === 'confirmed') {
      showTicket(booking);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      toast('Paiement en attente de confirmation', 'var(--or)');
    }
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// HISTORIQUE PAIEMENTS
// ══════════════════════════════════════════
async function loadPayHistory() {
  if (!getToken()) return;
  try {
    const history = await apiFetch('/payments/history');
    renderPayHist(history);
  } catch (e) {
    renderPayHist([]);
  }
}

function renderPayHist(payments) {
  const body = document.getElementById('payHistBody');
  if (!body) return;

  if (!payments.length) {
    body.innerHTML = `
      <div class="empty">
        <div class="ei">💳</div>
        <p>Aucun paiement effectué pour l'instant.</p>
      </div>`;
    return;
  }

  const total = payments.reduce((s, p) => s + Number(p.amount), 0);

  body.innerHTML = `
    <div style="background:var(--or);border-radius:var(--r);padding:15px;
                color:white;text-align:center;margin-bottom:16px">
      <div style="font-size:12px;opacity:.85">Total dépensé</div>
      <div style="font-family:'arial',sans-serif;font-size:26px;font-weight:800">
        ${total.toLocaleString('fr-FR')} FCFA
      </div>
      <div style="font-size:12px;opacity:.85">
        ${payments.length} transaction${payments.length > 1 ? 's' : ''}
      </div>
    </div>
    ${payments.map(p => `
      <div class="ph-card">
        <div class="ph-ico">🎫</div>
        <div style="flex:1">
          <div class="ph-lbl">${p.departure_city || '—'} → ${p.arrival_city || '—'}</div>
          <div class="ph-date">Réf. ${p.reference || '—'} · ${p.payment_method || '—'}</div>
        </div>
        <div class="ph-amount">${Number(p.amount).toLocaleString('fr-FR')} F</div>
      </div>
    `).join('')}
  `;
}