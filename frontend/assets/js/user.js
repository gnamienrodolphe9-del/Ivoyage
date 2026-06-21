// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function switchToUser()    { showScreen('scr-uHome'); }
function switchToCompany() { 
  window.location.href = 'Company.html'; 
}





function uNav(tab) {
  if (tab === 'home') {
    showScreen('scr-uHome');
    document.querySelectorAll('#scr-uHome .bnav-item').forEach(n => n.classList.remove('on'));
    const el = document.getElementById('bn-home');
    if (el) el.classList.add('on');
  } else if (tab === 'account') {
    showScreen('scr-uAccount');
    refreshAccountScreen();
    document.querySelectorAll('#scr-uAccount .bnav-item').forEach(n => n.classList.remove('on'));
    const el = document.getElementById('bn2-account');
    if (el) el.classList.add('on');
  }
}

function openDrawer() {
  document.getElementById('drawer').classList.add('on');
  document.getElementById('overlay').classList.add('on');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('on');
  document.getElementById('overlay').classList.remove('on');
}

// ══════════════════════════════════════════
// DRAWER UTILISATEUR
// ══════════════════════════════════════════
function updateDrawerUser() {
  if (uUser) {
    const initials = (uUser.firstName[0] + (uUser.lastName[0] || '')).toUpperCase();
    document.getElementById('drAv').textContent   = initials;
    document.getElementById('drName').textContent = uUser.firstName + ' ' + uUser.lastName;
    document.getElementById('drSub').textContent  = uUser.email || uUser.phone;
    const logout = document.getElementById('drLogout');
    if (logout) logout.style.display = 'flex';
  } else {
    document.getElementById('drAv').textContent   = '👤';
    document.getElementById('drName').textContent = 'Bonjour !';
    document.getElementById('drSub').textContent  = 'Connectez-vous';
    const logout = document.getElementById('drLogout');
    if (logout) logout.style.display = 'none';
  }
}

// ══════════════════════════════════════════
// COMPTE
// ══════════════════════════════════════════
function refreshAccountScreen() {
  const gw = document.getElementById('accGuestWrap');
  const lw = document.getElementById('accLoggedWrap');
  if (!gw || !lw) return;

  if (uUser) {
    gw.style.display = 'none';
    lw.style.display = 'flex';
    const initials = (uUser.firstName[0] + (uUser.lastName[0] || '')).toUpperCase();
    const av = document.getElementById('profAv');
    if (av) av.textContent = initials;
    const nm = document.getElementById('profName');
    if (nm) nm.textContent = uUser.firstName + ' ' + uUser.lastName;
    const em = document.getElementById('profEmail');
    if (em) em.textContent = uUser.email || uUser.phone;

    const fields = {
      'pf-fn':    uUser.firstName || '',
      'pf-ln':    uUser.lastName  || '',
      'pf-tel':   uUser.phone     || '',
      'pf-email': uUser.email     || '',
      'pf-city':  uUser.city      || '',
    };
    Object.entries(fields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  } else {
    gw.style.display = 'block';
    lw.style.display = 'none';
  }

  renderBookings();
}

function setAccTab(tab) {
  document.querySelectorAll('.acc-tab').forEach(t => t.classList.remove('on'));
  const profPanel = document.getElementById('accProfPanel');
  const bkPanel   = document.getElementById('accBkPanel');
  if (profPanel) profPanel.style.display = 'none';
  if (bkPanel)   bkPanel.style.display   = 'none';

  if (tab === 'prof') {
    const el = document.getElementById('at-prof');
    if (el) el.classList.add('on');
    if (profPanel) profPanel.style.display = 'block';
  } else {
    const el = document.getElementById('at-bk');
    if (el) el.classList.add('on');
    if (bkPanel) bkPanel.style.display = 'block';
    loadMyBookings();
  }
}

async function saveProfile() {
  if (!uUser) return;
  uUser.firstName = document.getElementById('pf-fn').value;
  uUser.lastName  = document.getElementById('pf-ln').value;
  uUser.phone     = document.getElementById('pf-tel').value;
  uUser.email     = document.getElementById('pf-email').value;
  uUser.city      = document.getElementById('pf-city').value;
  setUser(uUser);
  updateDrawerUser();
  toast('✓ Profil enregistré', 'var(--green)');
}

// ══════════════════════════════════════════
// SEARCH TABS & EXPLORE
// ══════════════════════════════════════════
function setStab(el) {
  document.querySelectorAll('.stab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
}

function swapCities() {
  const a = document.getElementById('s-from');
  const b = document.getElementById('s-to');
  if (!a || !b) return;
  const tmp = a.value;
  a.value = b.value;
  b.value = tmp;
}

// ══════════════════════════════════════════
// LOCALISATION RÉELLE
// ══════════════════════════════════════════
function openLocModal() {
  openModal('locModal');
  loadNearbyStations();
}

const STATIC_STATIONS = [
  { name: "Gare d'Adjamé",        city: 'Abidjan',      address: "Gare routière d'Adjamé", lat: 5.3600, lng: -4.0200 },
  { name: 'Gare de Yopougon',      city: 'Abidjan',      address: 'Yopougon, Abidjan',      lat: 5.3500, lng: -4.0700 },
  { name: 'Gare de Bouaké Centre', city: 'Bouaké',       address: 'Centre-ville, Bouaké',   lat: 7.6900, lng: -5.0300 },
  { name: 'Gare de Korhogo',       city: 'Korhogo',      address: 'Av. Centrale, Korhogo',  lat: 9.4580, lng: -5.6290 },
  { name: 'Gare de Man',           city: 'Man',          address: 'Quartier Commerce, Man', lat: 7.4127, lng: -7.5551 },
  { name: 'Gare de Yamoussoukro',  city: 'Yamoussoukro', address: 'Centre, Yamoussoukro',   lat: 6.8276, lng: -5.2893 },
];

async function loadNearbyStations() {
  const mapEl    = document.getElementById('locMapContainer');
  const listEl   = document.getElementById('nearbyList');
  const statusEl = document.getElementById('locStatus');

  if (statusEl) statusEl.textContent = 'Localisation en cours...';
  if (listEl)   listEl.innerHTML     = '<p style="text-align:center;color:var(--ink5);padding:20px">Recherche des gares proches...</p>';

  if (!navigator.geolocation) {
    if (statusEl) statusEl.textContent = 'Géolocalisation non supportée par ce navigateur';
    renderNearbyStations(STATIC_STATIONS, 5.3484, -4.0167); // Abidjan par défaut
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      if (statusEl) statusEl.textContent =
        `Votre position : ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      // Carte Google Maps
      if (mapEl) {
        mapEl.innerHTML = `
          <iframe
            width="100%"
            height="180"
            style="border:0;border-radius:var(--r)"
            loading="lazy"
            src="https://maps.google.com/maps?q=${latitude},${longitude}&z=13&output=embed">
          </iframe>
        `;
      }

      renderNearbyStations(STATIC_STATIONS, latitude, longitude);
    },
    (error) => {
      const msgs = {
        1: 'Accès refusé. Autorisez la géolocalisation.',
        2: 'Position introuvable.',
        3: 'Délai dépassé. Réessayez.',
      };
      if (statusEl) statusEl.textContent = msgs[error.code] || 'Erreur';
      if (listEl) listEl.innerHTML =
        `<div class="empty"><div class="ei">📍</div><p>${msgs[error.code] || 'Erreur de localisation'}</p></div>`;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function renderNearbyStations(stations, userLat, userLng) {
  const listEl = document.getElementById('nearbyList');
  if (!listEl) return;

  const withDist = stations.map(s => ({
    ...s,
    dist: calcDistance(userLat, userLng, s.lat, s.lng),
  })).sort((a, b) => a.dist - b.dist);

  listEl.innerHTML = withDist.map(s => `
    <div class="nearby-card">
      <div style="width:38px;height:38px;border-radius:10px;
                  background:var(--or3);display:flex;align-items:center;
                  justify-content:center;font-size:18px;flex-shrink:0">
        🏢
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${s.name}</div>
        <div style="font-size:12px;color:var(--ink5)">${s.address}</div>
      </div>
      <div class="nearby-dist">${s.dist.toFixed(1)} km</div>
    </div>
  `).join('');
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function setEtab(el, panel) {
  document.querySelectorAll('.etab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  const target = document.getElementById('panel-' + panel);
  if (target) target.classList.add('on');
}

function openExploreTab(panel) {
  const map   = { companies: 0, features: 1, how: 2, payments: 3 };
  const tabs  = document.querySelectorAll('.etab');
  const index = map[panel];
  if (index === undefined || !tabs[index]) return;
  setEtab(tabs[index], panel);
  setTimeout(() => {
    const scroll = document.getElementById('homeScroll');
    if (scroll) scroll.scrollBy({ top: 300, behavior: 'smooth' });
  }, 100);
}

// ══════════════════════════════════════════
// COMPAGNIES
// ══════════════════════════════════════════
function renderCompanies() {
  const el = document.getElementById('panel-companies');
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:24px;color:var(--ink5)">
      Chargement des compagnies...
    </div>
  `;
}

async function openCoTrajets(companyId) {
  try {
    toast('Chargement des trajets...', 'var(--ink2)');
    const trips = await apiFetch(
      `/trips/search?companyId=${companyId}`
    );

    const titEl = document.getElementById('coTrTit');
    const subEl = document.getElementById('coTrSub');
    const body  = document.getElementById('coTrBody');
    if (titEl) titEl.textContent = 'Trajets disponibles';
    if (subEl) subEl.textContent = trips.length + ' trajet(s)';

    if (body) {
      body.innerHTML = trips.length
        ? trips.map(t => `
            <div style="background:var(--white);border:1.5px solid var(--border);
                        border-radius:var(--r);padding:14px;margin-bottom:10px;
                        box-shadow:var(--sh)">
              <div style="font-weight:700;font-size:15px;margin-bottom:8px">
                ${t.departure_city} → ${t.arrival_city}
              </div>
              <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">
                <span class="chip chip-or">🕐 ${t.departure_time.substring(0,5)}</span>
                <span class="chip chip-or">🏁 ${t.arrival_time.substring(0,5)}</span>
                <span class="chip chip-green">🪑 ${t.total_seats} places</span>
                <span class="chip chip-or">
                  💰 ${Number(t.price).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <button class="btn-main"
                onclick="closeModal('coTrajetModal');bookFlow(${JSON.stringify(t).replace(/"/g,"'")})">
                💳 Réserver et payer
              </button>
            </div>
          `).join('')
        : '<div class="empty"><div class="ei">🚌</div><p>Aucun trajet disponible</p></div>';
    }

    openModal('coTrajetModal');

  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// RECHERCHE
// ══════════════════════════════════════════
async function searchTrips() {
  const from = document.getElementById('s-from').value;
  const to   = document.getElementById('s-to').value;

  if (!from || !to) {
    toast('Choisissez une ville de départ et une destination', 'var(--red)');
    return;
  }
  if (from === to) {
    toast('Le départ et la destination doivent être différents', 'var(--red)');
    return;
  }

  try {
    toast('Recherche en cours...', 'var(--ink2)');
    const results = await apiFetch(
      `/trips/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    displayResults(from, to, results);
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

async function quickSearch() {
  const from = document.getElementById('qs-from').value;
  const to   = document.getElementById('qs-to').value;

  if (!from || !to) {
    toast('Choisissez départ et destination', 'var(--red)');
    return;
  }

  closeModal('quickSearchModal');

  try {
    toast('Recherche en cours...', 'var(--ink2)');
    const results = await apiFetch(
      `/trips/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    displayResults(from, to, results);
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

function displayResults(from, to, results) {
  const titEl = document.getElementById('resTit');
  const subEl = document.getElementById('resSub');
  const body  = document.getElementById('resBody');

  if (titEl) titEl.textContent = `${from} → ${to}`;
  if (subEl) subEl.textContent =
    `${results.length} trajet${results.length > 1 ? 's' : ''} disponible${results.length > 1 ? 's' : ''}`;

  if (body) {
    body.innerHTML = !results.length
      ? `<div class="empty">
           <div class="ei">🔍</div>
           <p>Aucun trajet disponible pour cette route.<br>
           Essayez une autre destination.</p>
         </div>`
      : results.map(r => `
          <div class="result-card">
            <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
              <div class="result-co-badge"
                   style="background:${r.company_color || '#f97316'}">
                ${r.company_name.substring(0, 3).toUpperCase()}
              </div>
              <div style="flex:1">
                <div style="font-weight:700;font-size:15px">${r.company_name}</div>
                <div class="result-times">
                  ${r.departure_time.substring(0, 5)}
                  <span>→ ${r.arrival_time.substring(0, 5)}</span>
                </div>
                <div style="font-size:12px;color:var(--ink5);margin-top:2px">
                  ${r.recurrence || 'Tous les jours'} · Bus climatisé
                </div>
              </div>
              <div class="result-price">
                ${Number(r.price).toLocaleString('fr-FR')} F
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
              <span class="chip chip-or">🕐 Départ ${r.departure_time.substring(0, 5)}</span>
              <span class="chip chip-or">🏁 Arrivée ${r.arrival_time.substring(0, 5)}</span>
              <span class="chip chip-green">🪑 ${r.total_seats} places</span>
            </div>
            <button class="btn-main"
              onclick="closeModal('resultsModal');bookFlow(${JSON.stringify(r).replace(/"/g, "'")})">
              💳 Réserver et payer ce trajet
            </button>
          </div>
        `).join('');
  }

  openModal('resultsModal');
}

 function getStatusBadge(status) {
   const map = {
    pending:   { label: '⏳ En attente',  cls: 'chip-amber' },
    confirmed: { label: '<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> Payé',        cls: 'chip-green' },
    cancelled: { label: '❌ Annulé',      cls: 'chip-red'   },
    used:      { label: '✓ Utilisé',      cls: ''           },
   };
   const s = map[status] || { label: status, cls: '' };
    return `<span class="chip ${s.cls}"
               style="${status === 'used' ? 'background:var(--bg2);color:var(--ink5)' : ''}">
            ${s.label}
          </span>`;
  }

// ══════════════════════════════════════════
// RÉSERVATIONS AFFICHAGE
// ══════════════════════════════════════════
function renderBookings() {
  const list  = document.getElementById('bkList');
  const count = document.getElementById('bk-count');
  if (!list) return;

  if (!uUser) {
    list.innerHTML = '';
    if (count) count.textContent = '0 réservation';
    return;
  }

  const all = uBookings.length ? uBookings : [];
  if (count) count.textContent = all.length + ' réservation' + (all.length > 1 ? 's' : '');

  if (!all.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="ei">🎫</div>
        <p>Aucune réservation pour l'instant.<br>Réservez votre premier ticket !</p>
      </div>
    `;
    return;
  }

  list.innerHTML = all.map(b => `
    <div class="bk-card">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">
        <div class="bk-co" style="background:${b.company_color || b.coColor || '#f97316'}">
          ${(b.company_name || b.company || 'CO').substring(0, 3).toUpperCase()}
        </div>
        <div style="flex:1">
          <div class="bk-route">
            ${b.departure_city || b.from} → ${b.arrival_city || b.to}
          </div>
          <div class="bk-meta">
            ${b.company_name || b.company} ·
            ${b.departure_date
              ? new Date(b.departure_date).toLocaleDateString('fr-FR')
              : (b.date || '')} ·
            ${(b.departure_time || b.dep || '').substring(0, 5)}
          </div>
        </div>
        
        ${getStatusBadge(b.status)}

      </div>
      <div style="padding-top:10px;border-top:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="bk-price">
            ${Number(b.amount || b.prix || 0).toLocaleString('fr-FR')} FCFA
          </div>
          <span style="font-size:12px;color:var(--ink5)">
            Siège ${b.seat_number || b.seat || '—'}
          </span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-sm btn-sm-or"
            onclick="reShowTicket(${JSON.stringify(b).replace(/"/g, "'")})"><i data-lucide="map-pin" style="color: var(--or);">
            🎫 Ticket
          </button>
          ${b.status === 'confirmed' ? `
            <button class="btn-sm"
              style="background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe"
              onclick="openTrajetTimeline(${JSON.stringify(b).replace(/"/g, "'")})">
              📡 Suivi
            </button>
            <button class="btn-sm"
              style="background:var(--red-bg);color:var(--red);border:1px solid #fca5a5"
              onclick="openCancelBooking('${b.id}')">
              ❌ Annuler
            </button>
          ` : ''}
          ${b.status === 'past' ? `
            <button class="btn-sm"
              style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d"
              onclick="openRating(${JSON.stringify(b).replace(/"/g, "'")})">
              ⭐ Avis
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function reShowTicket(bk) { showTicket(bk); }

// ══════════════════════════════════════════
// TICKET
// ══════════════════════════════════════════
function showTicket(bk) {
  const body = document.getElementById('ticketBody');
  if (!body) return;

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:44px;margin-bottom:8px"> <i data-lucide="party-popper" style="color:var(--or)"></i> 🎉</div>
      <div style="font-family:'arial',sans-serif;font-size:19px;
                  font-weight:800;margin-bottom:4px">
        Réservation confirmée !
      </div>
      <div style="font-size:13px;color:var(--ink5)">
        Référence : <strong>${bk.reference || bk.id}</strong>
      </div>
    </div>

    <div class="ticket">
      <div class="ticket-hd"
           style="background:${bk.company_color || bk.coColor || '#f97316'}">
        <img src="assets/images/DesirCompagny.jpg"
             alt="DésirCompagny"
             style="height:35px;width:auto;object-fit:contain; border-radius:5px; "/>
        <span class="ticket-badge-sm">Aller simple</span>
      </div>
      <div class="ticket-route">
        <div class="ticket-city">
          <div class="ticket-city-code">
            ${(bk.departure_city || bk.from || '').substring(0, 3).toUpperCase()}
          </div>
          <div class="ticket-city-name">${bk.departure_city || bk.from}</div>
        </div>
        <div class="ticket-arrow">→</div>
        <div class="ticket-city">
          <div class="ticket-city-code">
            ${(bk.arrival_city || bk.to || '').substring(0, 3).toUpperCase()}
          </div>
          <div class="ticket-city-name">${bk.arrival_city || bk.to}</div>
        </div>
      </div>
      <div class="ticket-grid">
        <div>
          <div class="tg-lbl">Compagnie</div>
          <div class="tg-val">${bk.company_name || bk.company || '—'}</div>
        </div>
        <div>
          <div class="tg-lbl">Départ</div>
          <div class="tg-val">
            ${(bk.departure_time || bk.dep || '').substring(0, 5)}
          </div>
        </div>
        <div>
          <div class="tg-lbl">Siège</div>
          <div class="tg-val">${bk.seat_number || bk.seat || '—'}</div>
        </div>
        <div>
          <div class="tg-lbl">Prix</div>
          <div class="tg-val" style="color:var(--or)">
            ${Number(bk.amount || bk.prix || 0).toLocaleString('fr-FR')} FCFA
          </div>
        </div>
        <div>
          <div class="tg-lbl">Passager</div>
          <div class="tg-val">
            ${bk.passenger_name ||
              (uUser ? uUser.firstName + ' ' + uUser.lastName : 'Voyageur')}
          </div>
        </div>
        <div>
          <div class="tg-lbl">Référence</div>
          <div class="tg-val">${bk.reference || bk.id}</div>
        </div>
      </div>
      <div class="qr-area">
        ${bk.qr_code_image
          ? `<img src="${bk.qr_code_image}"
                  style="width:100px;height:100px;margin:0 auto 8px;border-radius:8px"/>`
          : `<div class="qr-box" id="bkQR"></div>`
        }
        <div class="qr-note">Scanner à l'embarquement</div>
      </div>
    </div>

    <button class="btn-main"
      onclick="closeModal('ticketModal');uNav('account');setAccTab('bk')">
      Voir mes réservations →
    </button>
  `;

  if (!bk.qr_code_image) buildQR('bkQR');
  openModal('ticketModal');
}


function showMultiTicket(bookings, totalAmount, isAR) {
  if (!bookings || !bookings.length) return;

  const first = bookings[0];
  const seats = bookings.map(b => b.seat_number).join(', ');
  const refs  = bookings.map(b => b.reference).join(' · ');
  const count = bookings.length;

  const body = document.getElementById('ticketBody');
  if (!body) return;

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:44px;margin-bottom:8px">🎉</div>
      <div style="font-family:'arial',sans-serif;font-size:19px;font-weight:800;margin-bottom:4px">
        ${count} ticket(s) confirmé(s) !
      </div>
      <div style="font-size:13px;color:var(--ink5)">
        ${isAR ? '↔️ Aller-Retour' : '→ Aller simple'}
      </div>
    </div>
    <div class="ticket">
      <div class="ticket-hd" style="background:${first.company_color || '#f97316'}">
        <span style="font-family:'arial',sans-serif;font-weight:800;color:white">
          DésirCompagny
        </span>
        <span class="ticket-badge-sm">${count} passager(s)</span>
      </div>
      <div class="ticket-route">
        <div class="ticket-city">
          <div class="ticket-city-code">
            ${(first.departure_city || '').substring(0,3).toUpperCase()}
          </div>
          <div class="ticket-city-name">${first.departure_city}</div>
        </div>
        <div class="ticket-arrow">${isAR ? '↔' : '→'}</div>
        <div class="ticket-city">
          <div class="ticket-city-code">
            ${(first.arrival_city || '').substring(0,3).toUpperCase()}
          </div>
          <div class="ticket-city-name">${first.arrival_city}</div>
        </div>
      </div>
      <div class="ticket-grid">
        <div>
          <div class="tg-lbl">Compagnie</div>
          <div class="tg-val">${first.company_name}</div>
        </div>
        <div>
          <div class="tg-lbl">Départ</div>
          <div class="tg-val">${(first.departure_time || '').substring(0,5)}</div>
        </div>
        <div>
          <div class="tg-lbl">Siège(s)</div>
          <div class="tg-val">${seats}</div>
        </div>
        <div>
          <div class="tg-lbl">Passagers</div>
          <div class="tg-val">${count} personne(s)</div>
        </div>
        <div style="grid-column:1/-1">
          <div class="tg-lbl">Référence(s)</div>
          <div class="tg-val" style="font-size:11px">${refs}</div>
        </div>
        <div style="grid-column:1/-1">
          <div class="tg-lbl">Total payé</div>
          <div class="tg-val" style="color:var(--or);font-size:18px">
            ${Number(totalAmount).toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>
      <div class="qr-area">
        ${bookings.map((bk, i) => `
          <div style="margin-bottom:12px;text-align:center">
            <div style="font-size:11px;font-weight:700;color:var(--ink5);margin-bottom:6px">
              Passager ${i + 1} — Siège ${bk.seat_number}
            </div>
            ${bk.qr_code_image
              ? `<img src="${bk.qr_code_image}"
                      style="width:80px;height:80px;border-radius:6px;
                             border:1.5px solid var(--border)"/>`
              : `<div class="qr-box" id="qr-${i}" style="margin:0 auto;width:80px;height:80px"></div>`
            }
          </div>
        `).join('')}
        <div class="qr-note">Présentez chaque QR Code à l'embarquement</div>
      </div>
    </div>
    <button class="btn-main"
      onclick="closeModal('ticketModal');uNav('account');setAccTab('bk')">
      Voir mes réservations →
    </button>
  `;

  bookings.forEach((bk, i) => {
    if (!bk.qr_code_image) buildQR(`qr-${i}`);
  });

  openModal('ticketModal');
}

function showMultiTicket(bookings, totalAmount, isAR) {
  if (!bookings || !bookings.length) return;

  const first   = bookings[0];
  const seats   = bookings.map(b => b.seat_number).join(', ');
  const refs    = bookings.map(b => b.reference).join(' · ');
  const count   = bookings.length;

  const body = document.getElementById('ticketBody');
  if (!body) return;

  body.innerHTML = `
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:44px;margin-bottom:8px">🎉</div>
      <div style="font-family:'arial',sans-serif;font-size:19px;
                  font-weight:800;margin-bottom:4px">
        ${count} ticket(s) confirmé(s) !
      </div>
      <div style="font-size:13px;color:var(--ink5)">
        ${isAR ? '↔️ Aller-Retour' : '→ Aller simple'}
      </div>
    </div>

    <div class="ticket">
      <div class="ticket-hd"
           style="background:${first.company_color || '#f97316'}">
        <img src="assets/images/DesirCompagny.jpg"
             alt="DésirCompagny"
             style="height:28px;width:auto;object-fit:contain"
             onerror="this.style.display='none'"/>
        <span class="ticket-badge-sm">
          ${count} passager(s)
        </span>
      </div>

      <div class="ticket-route">
        <div class="ticket-city">
          <div class="ticket-city-code">
            ${(first.departure_city || '').substring(0,3).toUpperCase()}
          </div>
          <div class="ticket-city-name">${first.departure_city}</div>
        </div>
        <div class="ticket-arrow">
          ${isAR ? '↔' : '→'}
        </div>
        <div class="ticket-city">
          <div class="ticket-city-code">
            ${(first.arrival_city || '').substring(0,3).toUpperCase()}
          </div>
          <div class="ticket-city-name">${first.arrival_city}</div>
        </div>
      </div>

      <div class="ticket-grid">
        <div>
          <div class="tg-lbl">Compagnie</div>
          <div class="tg-val">${first.company_name}</div>
        </div>
        <div>
          <div class="tg-lbl">Départ</div>
          <div class="tg-val">
            ${(first.departure_time || '').substring(0,5)}
          </div>
        </div>
        <div>
          <div class="tg-lbl">Siège(s)</div>
          <div class="tg-val">${seats}</div>
        </div>
        <div>
          <div class="tg-lbl">Passagers</div>
          <div class="tg-val">${count} personne(s)</div>
        </div>
        <div style="grid-column:1/-1">
          <div class="tg-lbl">Référence(s)</div>
          <div class="tg-val" style="font-size:11px">${refs}</div>
        </div>
        <div style="grid-column:1/-1">
          <div class="tg-lbl">Total payé</div>
          <div class="tg-val" style="color:var(--or);font-size:18px">
            ${Number(totalAmount).toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      <!-- QR Codes -->
      <div class="qr-area">
        ${bookings.map((bk, i) => `
          <div style="margin-bottom:12px;text-align:center">
            <div style="font-size:11px;font-weight:700;color:var(--ink5);
                        margin-bottom:6px">
              Passager ${i+1} — Siège ${bk.seat_number}
            </div>
            ${bk.qr_code_image
              ? `<img src="${bk.qr_code_image}"
                      style="width:80px;height:80px;border-radius:6px;
                             border:1.5px solid var(--border)"/>`
              : `<div class="qr-box" id="qr-${i}" style="margin:0 auto;
                       width:80px;height:80px"></div>`
            }
          </div>
        `).join('')}
        <div class="qr-note">Présentez chaque QR Code à l'embarquement</div>
      </div>
    </div>

    <button class="btn-main"
      onclick="closeModal('ticketModal');uNav('account');setAccTab('bk')">
      Voir mes réservations →
    </button>
  `;

  // Générer QR codes manquants
  bookings.forEach((bk, i) => {
    if (!bk.qr_code_image) buildQR(`qr-${i}`);
  });

  openModal('ticketModal');
}

// ══════════════════════════════════════════
// PLAN DE SIÈGE
// ══════════════════════════════════════════
function openSeatPlan(trip) {
  seatPlanSelected = null;
  selectedSeat     = null;

  const total  = trip.total_seats || 30;
  const taken  = trip.total_seats - (trip.available_seats || trip.total_seats);
  const takenSet = new Set();
  while (takenSet.size < taken) {
    takenSet.add(Math.floor(Math.random() * total) + 1);
  }

  const sub = document.getElementById('seatPlanSub');
  if (sub) sub.textContent =
    `${trip.departure_city} → ${trip.arrival_city} · ${trip.available_seats || total} places`;

  const lbl = document.getElementById('seatSelectedLabel');
  if (lbl) lbl.textContent = 'Aucun siège sélectionné';

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
          ${isTaken ? '' : `onclick="selectSeatPlan(${n},this)"`}>
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
          ${isTaken ? '' : `onclick="selectSeatPlan(${n},this)"`}>
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

function selectSeatPlan(n, el) {
  document.querySelectorAll('.seat-unit.free, .seat-unit.selected-s').forEach(s => {
    s.classList.remove('selected-s');
    s.classList.add('free');
  });
  el.classList.remove('free');
  el.classList.add('selected-s');
  seatPlanSelected = n;
  selectedSeat     = n;
  const row = Math.ceil(n / 4);
  const col = ['A', 'B', 'C', 'D'][(n - 1) % 4];
  const lbl = document.getElementById('seatSelectedLabel');
  if (lbl) lbl.textContent = `✓ Siège ${row}${col} sélectionné`;
}

function confirmSeatPlan() {
  if (!seatPlanSelected) {
    toast('Veuillez sélectionner un siège', 'var(--red)');
    return;
  }
  selectedSeat = seatPlanSelected;
  closeModal('seatPlanModal');
  goToPay();
}

// ══════════════════════════════════════════
// CHAT SUPPORT
// ══════════════════════════════════════════
function sendChat() {
  const inp  = document.getElementById('chatInp');
  const msgs = document.getElementById('chatMsgs');
  if (!inp || !msgs) return;
  const msg = inp.value.trim();
  if (!msg) return;
  msgs.innerHTML += `<div class="bubble user">${msg}</div>`;
  inp.value = '';
  setTimeout(() => {
    msgs.innerHTML += `<div class="bubble bot">${botReplies[botIdx % botReplies.length]}</div>`;
    botIdx++;
    msgs.scrollTop = msgs.scrollHeight;
  }, 900);
  msgs.scrollTop = msgs.scrollHeight;
}

// ══════════════════════════════════════════
// ANNULATION
// ══════════════════════════════════════════
function openCancelBooking(id) {
  cancelBkId = id;
  const bk = uBookings.find(b => b.id === id);
  if (!bk) return;
  const info = document.getElementById('cancelBkInfo');
  if (info) {
    info.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:6px">
        ${bk.departure_city || bk.from} → ${bk.arrival_city || bk.to}
      </div>
      <div style="font-size:13px;color:var(--ink4)">
        ${bk.company_name || bk.company}
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:13px;color:var(--ink4)">Remboursement estimé</span>
        <span style="font-family:'arial',sans-serif;font-size:16px;
                     font-weight:800;color:var(--green)">
          ${Math.round(Number(bk.amount || bk.prix || 0) * 0.8).toLocaleString('fr-FR')} FCFA
        </span>
      </div>
    `;
  }
  openModal('cancelBkModal');
}

async function confirmCancel() {
  if (!cancelBkId) return;
  await cancelBookingAPI(cancelBkId);
  cancelBkId = null;
}

// ══════════════════════════════════════════
// AVIS
// ══════════════════════════════════════════
function openRating(bk) {
  const info = document.getElementById('ratingTripInfo');
  if (info) info.textContent =
    `${bk.company_name || bk.company} · ${bk.departure_city || bk.from} → ${bk.arrival_city || bk.to}`;
  ratingVal = 0;
  document.querySelectorAll('#starsRow .star').forEach(s => s.textContent = '☆');
  const lbl = document.getElementById('ratingLabel');
  if (lbl) lbl.textContent = 'Touchez une étoile';
  const cmt = document.getElementById('ratingComment');
  if (cmt) cmt.value = '';
  openModal('ratingModal');
}

function rateStar(n) {
  ratingVal = n;
  const labels = ['', '😞 Très mauvais', '😐 Décevant', '😊 Correct', '👍 Bien', '🌟 Excellent !'];
  document.querySelectorAll('#starsRow .star').forEach((s, i) => {
    s.textContent = i < n ? '⭐' : '☆';
  });
  const lbl = document.getElementById('ratingLabel');
  if (lbl) lbl.textContent = labels[n] || '';
}

async function submitRating() {
  if (!ratingVal) {
    toast('Sélectionnez une note', 'var(--red)');
    return;
  }
  closeModal('ratingModal');
  toast('⭐ Merci pour votre avis !', 'var(--green)');
}

// ══════════════════════════════════════════
// SUIVI TRAJET
// ══════════════════════════════════════════
function openTrajetTimeline(bk) {
  const tit = document.getElementById('ttTit');
  const sub = document.getElementById('ttSub');
  const bod = document.getElementById('ttBody');
  if (tit) tit.textContent =
    `${bk.departure_city || bk.from} → ${bk.arrival_city || bk.to}`;
  if (sub) sub.textContent =
    `${bk.company_name || bk.company} · Réf. ${bk.reference || bk.id}`;

  const steps = [
    { time: '05:45', text: 'Embarquement ouvert', sub: "Gare d'Adjamé — Porte 3", done: true },
    { time: '06:00', text: 'Départ',               sub: 'Bus en route',            done: true },
    { time: '08:30', text: 'Arrêt intermédiaire',  sub: '15 min de pause',         done: true },
    { time: '11:30', text: 'Arrivée à destination',sub: 'Gare centrale',           done: false },
  ];

  if (bod) {
    bod.innerHTML = `
      <div style="background:var(--or3);border-radius:var(--r);padding:13px;
                  margin-bottom:18px;border:1px solid var(--or4)">
        <div style="font-size:12px;color:var(--or2);margin-bottom:4px">
          STATUT EN TEMPS RÉEL
        </div>
        <div style="font-weight:700;font-size:15px;color:var(--or2)">
          🚌 En route — Arrivée estimée 11h30
        </div>
      </div>
      <div class="timeline">
        ${steps.map((s, i) => `
          <div class="tl-item">
            <div class="tl-left">
              <div class="tl-dot ${s.done ? 'filled' : ''}"></div>
              ${i < steps.length - 1 ? '<div class="tl-line"></div>' : ''}
            </div>
            <div class="tl-content">
              <div class="tl-time">${s.time}</div>
              <div class="tl-text"
                   style="color:${s.done ? 'var(--ink2)' : 'var(--ink5)'}">
                ${s.text}
              </div>
              <div class="tl-sub">${s.sub}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ══════════════════════════════════════════
// NOTIFICATIONS RÉELLES
// ══════════════════════════════════════════
async function loadNotifications() {
  if (!getToken()) return;

  try {
    const notifs = await apiFetch('/notifications');
    renderNotifications(notifs);
    updateNotifBadge(notifs.filter(n => !n.read).length);
  } catch (e) {
    console.error('Erreur notifications:', e);
  }
}

function renderNotifications(notifs) {
  const body = document.getElementById('notifBody');
  if (!body) return;

  if (!notifs.length) {
    body.innerHTML = `
      <div class="empty">
        <div class="ei">🔔</div>
        <p>Aucune notification pour l'instant.</p>
      </div>
    `;
    return;
  }

  body.innerHTML = notifs.map(n => `
    <div class="notif-item" style="${!n.read ? 'background:var(--or3)' : ''}">
      <div class="notif-dot"
           style="background:${
             n.type === 'booking' ? 'var(--green)' :
             n.type === 'trip'    ? 'var(--or)'    : 'var(--blue)'
           }">
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${n.title}</div>
        <div class="notif-text">${n.body}</div>
        <div class="notif-time">
          ${new Date(n.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  `).join('');
}

function updateNotifBadge(count) {
  const badges = document.querySelectorAll('.notif-badge');
  badges.forEach(b => {
    b.style.display = count > 0 ? 'block' : 'none';
  });
}

async function markNotifsRead() {
  if (!getToken()) return;
  try {
    await apiFetch('/notifications/read', { method: 'PUT' });
    updateNotifBadge(0);
  } catch (e) {}
}

  openModal('trajetTimelineModal');
}