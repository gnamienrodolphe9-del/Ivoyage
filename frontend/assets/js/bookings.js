// ══════════════════════════════════════════
// FLOW DE RÉSERVATION
// ══════════════════════════════════════════
function bookFlow(trip) {
  pendingBooking = trip;
  reqAuth(() => showBookConfirm(trip));
}

function showBookConfirm(trip) {
  selectedSeat     = null;
  seatPlanSelected = null;

  const body = document.getElementById('bookBody');
  if (!body) return;

  body.innerHTML = `
    <div style="background:var(--bg2);border-radius:var(--r);
                padding:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:11px">
        <div style="width:40px;height:40px;border-radius:11px;
                    background:${trip.company_color || '#f97316'};
                    display:flex;align-items:center;justify-content:center;
                    font-family:'arial',sans-serif;font-weight:800;
                    font-size:12px;color:white;flex-shrink:0">
          ${(trip.company_name || '').substring(0, 3).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:700;font-size:15px">
            ${trip.departure_city} → ${trip.arrival_city}
          </div>
          <div style="font-size:13px;color:var(--ink5)">
            ${trip.company_name} ·
            ${trip.departure_time.substring(0,5)} → ${trip.arrival_time.substring(0,5)}
          </div>
        </div>
      </div>
    </div>

    <!-- Type de billet -->
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--ink5);
                  text-transform:uppercase;margin-bottom:8px">
        Type de billet
      </div>
      <div style="display:flex;gap:8px">
        <button id="btn-aller" onclick="selectTicketType('aller')"
          style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--or);
                 background:var(--or);color:white;font-weight:700;font-size:13px">
          Aller simple
        </button>
        <button id="btn-ar" onclick="selectTicketType('ar')"
          style="flex:1;padding:10px;border-radius:10px;border:1.5px solid var(--border2);
                 background:white;color:var(--ink3);font-weight:700;font-size:13px">
          Aller-retour
        </button>
      </div>
    </div>

    <!-- Date de retour (cachée par défaut) -->
    <div id="returnDateSection" style="display:none;margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--ink5);
                  text-transform:uppercase;margin-bottom:6px">
        Date de retour
      </div>
      <input type="date" id="returnDate"
             style="width:100%;border:1.5px solid var(--border2);border-radius:10px;
                    padding:11px 13px;font-size:14px;background:var(--bg)"/>
    </div>

    <!-- Nombre de passagers -->
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:700;color:var(--ink5);
                  text-transform:uppercase;margin-bottom:8px">
        Nombre de passagers
      </div>
      <div style="display:flex;align-items:center;gap:12px;
                  background:var(--bg2);border-radius:10px;padding:10px 14px">
        <button onclick="changePassengers(-1)"
          style="width:32px;height:32px;border-radius:8px;background:var(--white);
                 border:1.5px solid var(--border2);font-size:18px;font-weight:700;
                 display:flex;align-items:center;justify-content:center">
          −
        </button>
        <div style="flex:1;text-align:center">
          <span id="passengerCount"
                style="font-family:'arial',sans-serif;font-size:22px;font-weight:800">
            1
          </span>
          <div style="font-size:11px;color:var(--ink5)">passager(s)</div>
        </div>
        <button onclick="changePassengers(1)"
          style="width:32px;height:32px;border-radius:8px;background:var(--white);
                 border:1.5px solid var(--border2);font-size:18px;font-weight:700;
                 display:flex;align-items:center;justify-content:center">
          +
        </button>
      </div>
    </div>

    <!-- Résumé prix -->
    <div id="pricesSummary"
         style="display:flex;align-items:center;justify-content:space-between;
                padding:14px;background:var(--or3);border-radius:var(--r);
                border:1px solid var(--or4);margin-bottom:14px">
      <div>
        <div style="font-weight:600;font-size:14px">Total à payer</div>
        <div style="font-size:12px;color:var(--or2)" id="priceDetail">
          1 passager × ${Number(trip.price).toLocaleString('fr-FR')} FCFA
        </div>
      </div>
      <span style="font-family:'arial',sans-serif;font-size:20px;
                   font-weight:800;color:var(--or)" id="totalPrice">
        ${Number(trip.price).toLocaleString('fr-FR')} FCFA
      </span>
    </div>

    <button class="btn-main"
      onclick="closeModal('bookModal');openSeatPlan(pendingBooking)">
      🪑 Choisir mon/mes siège(s) →
    </button>
  `;

  // Initialiser les variables
  window.ticketType      = 'aller';
  window.passengerCount  = 1;
  window.tripBasePrice   = trip.price;

  openModal('bookModal');
}

// Type de billet
function selectTicketType(type) {
  window.ticketType = type;

  const btnAller = document.getElementById('btn-aller');
  const btnAR    = document.getElementById('btn-ar');
  const section  = document.getElementById('returnDateSection');

  if (type === 'aller') {
    btnAller.style.background   = 'var(--or)';
    btnAller.style.color        = 'white';
    btnAller.style.borderColor  = 'var(--or)';
    btnAR.style.background      = 'white';
    btnAR.style.color           = 'var(--ink3)';
    btnAR.style.borderColor     = 'var(--border2)';
    section.style.display       = 'none';
  } else {
    btnAR.style.background      = 'var(--or)';
    btnAR.style.color           = 'white';
    btnAR.style.borderColor     = 'var(--or)';
    btnAller.style.background   = 'white';
    btnAller.style.color        = 'var(--ink3)';
    btnAller.style.borderColor  = 'var(--border2)';
    section.style.display       = 'block';
    // Date retour min = demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ret = document.getElementById('returnDate');
    if (ret) ret.min = tomorrow.toISOString().split('T')[0];
  }

  updatePriceSummary();
}

// Changer nombre de passagers
function changePassengers(delta) {
  const max = Math.min(pendingBooking?.total_seats || 10, 8);
  window.passengerCount = Math.max(1, Math.min(max, (window.passengerCount || 1) + delta));
  const el = document.getElementById('passengerCount');
  if (el) el.textContent = window.passengerCount;
  updatePriceSummary();
}

// Mettre à jour le résumé prix
function updatePriceSummary() {
  const base     = window.tripBasePrice  || 0;
  const count    = window.passengerCount || 1;
  const isAR     = window.ticketType     === 'ar';
  const total    = base * count * (isAR ? 2 : 1);
  const detailEl = document.getElementById('priceDetail');
  const totalEl  = document.getElementById('totalPrice');

  if (detailEl) {
    detailEl.textContent = isAR
      ? `${count} passager(s) × ${Number(base).toLocaleString('fr-FR')} × 2 (A/R)`
      : `${count} passager(s) × ${Number(base).toLocaleString('fr-FR')} FCFA`;
  }
  if (totalEl) {
    totalEl.textContent = Number(total).toLocaleString('fr-FR') + ' FCFA';
  }
}

// ══════════════════════════════════════════
// PLAN DE SIÈGE — MULTI-PASSAGERS
// ══════════════════════════════════════════
function openSeatPlan(trip) {
  seatPlanSelected = [];
  const count    = window.passengerCount || 1;
  const total    = trip.total_seats     || 30;
  const taken    = Math.max(0, (trip.total_seats || 30) - (trip.available_seats || trip.total_seats || 30));
  const takenSet = new Set();

  while (takenSet.size < taken) {
    takenSet.add(Math.floor(Math.random() * total) + 1);
  }

  const sub = document.getElementById('seatPlanSub');
  if (sub) sub.textContent =
    `${trip.departure_city} → ${trip.arrival_city} · Choisissez ${count} siège(s)`;

  const lbl = document.getElementById('seatSelectedLabel');
  if (lbl) lbl.textContent = `0 / ${count} siège(s) sélectionné(s)`;

  const rows = Math.ceil(total / 4);
  let html   = '';

  for (let r = 0; r < rows; r++) {
    html += '<div class="seat-row-plan">';
    html += `<div class="seat-plan-num">${r + 1}</div>`;

    for (let s = 0; s < 2; s++) {
      const n = r * 4 + s + 1;
      if (n <= total) {
        const isTaken = takenSet.has(n);
        html += `<div class="seat-unit ${isTaken ? 'taken-s' : 'free'}"
                      id="seat-${n}"
                      ${isTaken ? '' : `onclick="toggleSeat(${n},this,${count})"`}>
                   ${String.fromCharCode(65 + s)}
                 </div>`;
      } else {
        html += '<div style="width:36px"></div>';
      }
    }

    html += '<div class="seat-aisle"></div>';

    for (let s = 2; s < 4; s++) {
      const n = r * 4 + s + 1;
      if (n <= total) {
        const isTaken = takenSet.has(n);
        html += `<div class="seat-unit ${isTaken ? 'taken-s' : 'free'}"
                      id="seat-${n}"
                      ${isTaken ? '' : `onclick="toggleSeat(${n},this,${count})"`}>
                   ${String.fromCharCode(65 + s)}
                 </div>`;
      } else {
        html += '<div style="width:36px"></div>';
      }
    }

    html += '</div>';
  }

  const grid = document.getElementById('seatPlanGrid');
  if (grid) grid.innerHTML = html;
  openModal('seatPlanModal');
}

function toggleSeat(n, el, maxCount) {
  if (!Array.isArray(seatPlanSelected)) seatPlanSelected = [];

  const idx = seatPlanSelected.indexOf(n);

  if (idx > -1) {
    // Désélectionner
    seatPlanSelected.splice(idx, 1);
    el.classList.remove('selected-s');
    el.classList.add('free');
  } else {
    if (seatPlanSelected.length >= maxCount) {
      toast(`Maximum ${maxCount} siège(s) pour ${maxCount} passager(s)`, 'var(--or)');
      return;
    }
    seatPlanSelected.push(n);
    el.classList.remove('free');
    el.classList.add('selected-s');
  }

  const lbl = document.getElementById('seatSelectedLabel');
  if (lbl) {
    lbl.textContent = seatPlanSelected.length > 0
      ? `${seatPlanSelected.length} / ${maxCount} — Sièges : [${seatPlanSelected.join(', ')}]`
      : `0 / ${maxCount} siège(s) sélectionné(s)`;
  }
}

function confirmSeatPlan() {
  const count = window.passengerCount || 1;

  if (!seatPlanSelected || seatPlanSelected.length < count) {
    toast(`Sélectionnez ${count} siège(s) pour continuer`, 'var(--red)');
    return;
  }

  selectedSeat = seatPlanSelected;
  closeModal('seatPlanModal');
  goToPay();
}


// ══════════════════════════════════════════
// CHARGER MES RÉSERVATIONS
// ══════════════════════════════════════════
async function loadMyBookings() {
  if (!getToken()) return;
  try {
    const bookings = await apiFetch('/bookings/me');
    uBookings = bookings;
    renderBookings();
  } catch (e) {
    console.error('Erreur réservations:', e);
  }
}

// ══════════════════════════════════════════
// ANNULATION
// ══════════════════════════════════════════
async function cancelBookingAPI(id) {
  try {
    const reason = document.getElementById('cancelReason');
    await apiFetch(`/bookings/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({
        reason: reason ? reason.value : 'Annulation utilisateur',
      }),
    });
    await loadMyBookings();
    closeModal('cancelBkModal');
    toast('✓ Réservation annulée · Remboursement sous 48h', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}