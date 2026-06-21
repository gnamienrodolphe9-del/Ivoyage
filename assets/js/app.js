// ══════════════════════════════════════════
// DÉTECTION ÉCRAN
// ══════════════════════════════════════════
function isDesktop() {
  return window.innerWidth >= 768;
}

// ══════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // Dates par défaut
  const today = new Date().toISOString().split('T')[0];
  ['s-date', 'qs-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = today; el.min = today; }
  });

  // Villes statiques
  populateCitySelects(['s-from', 's-to', 'qs-from', 'qs-to']);

  // QR Code + Gares
  buildQR('qrSample');
  initGaresChecklist();

  // Restaurer sessions
  if (getToken() && uUser) {
    updateDrawerUser();
    refreshAccountScreen();
  }
  if (getCoToken() && coData) {
  // Rediriger vers l'espace compagnie
  window.location.href = 'company.html';
}

  // Retour paiement
  checkPaymentReturn().catch(() => {});

  // Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Layout — on attend que le navigateur ait fini de rendre le DOM
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      handleLayout();
    });
  });

  // API en arrière-plan — ne bloque pas l'affichage
  setTimeout(() => {
    loadCitiesFromAPI().catch(() => {});
    loadCompaniesFromAPI().catch(() => {});
    if (getToken() && uUser) {
      loadMyBookings().catch(() => {});
      loadPayHistory().catch(() => {});
    }
  }, 300);
});

// ══════════════════════════════════════════
// LAYOUT MOBILE / DESKTOP
// ══════════════════════════════════════════
function handleLayout() {
  const phone     = document.querySelector('.phone');
  const uiUser    = document.getElementById('ui-user');
  const uiCompany = document.getElementById('ui-company');

  if (isDesktop()) {
    if (phone) phone.style.display = 'none';

    if (getCoToken() && coData) {
      if (uiUser)    { uiUser.style.cssText    = 'display:none '; }
      if (uiCompany) { uiCompany.style.cssText = 'display:flex ; width:100vw; height:100vh; position:fixed; top:0; left:0;'; }
      requestAnimationFrame(() => initDesktopDash());
    } else {
      if (uiCompany) { uiCompany.style.cssText = 'display:none '; }
      if (uiUser)    { uiUser.style.cssText    = 'display:flex ; width:100vw; height:100vh; position:fixed; top:0; left:0; background:var(--bg);'; }
      requestAnimationFrame(() => showDesktopUser());
    }
  } else {
    if (phone)     phone.style.display     = '';
    if (uiUser)    uiUser.style.cssText    = 'display:none';
    if (uiCompany) uiCompany.style.cssText = 'display:none';
  }
}

window.addEventListener('resize', () => {
  handleLayout();
});

// ══════════════════════════════════════════
// DESKTOP USER — INITIALISATION
// ══════════════════════════════════════════
function showDesktopUser() {

  // console.log(
  //     document.getElementById('dpage-home')
  //  );
  // Forcer dpage-home visible avec style direct
  // document.querySelectorAll('[id^="dpage-"]').forEach(p => {
  //   p.style.cssText = 'display:none !important';
  // });

  const home = document.getElementById('dpage-home');
  if (home) {
    home.style.cssText = 'display:block ';
  }

  const titleEl = document.getElementById('desktopPageTitle');
  if (titleEl) titleEl.textContent = 'Accueil';

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('on'));
  const firstLink = document.querySelector('.sidebar-link');
  if (firstLink) firstLink.classList.add('on');

  updateSidebarUser();
  populateDesktopSearchCities();
  loadDesktopCompanies();
  buildDesktopChart();
}

function updateSidebarUser() {
  if (!uUser) return;
  const initials = (uUser.firstName[0] + (uUser.lastName[0] || '')).toUpperCase();
  const av   = document.getElementById('sidebarAv');
  const name = document.getElementById('sidebarName');
  const sub  = document.getElementById('sidebarSub');
  if (av)   av.textContent   = initials;
  if (name) name.textContent = uUser.firstName + ' ' + uUser.lastName;
  if (sub)  sub.textContent  = uUser.email || uUser.phone;
}

function populateDesktopSearchCities() {
  ['ds-from', 'ds-to'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML =
      '<option value="">Choisir</option>' +
      CITIES.map(c => `<option>${c}</option>`).join('');
  });
}

// ══════════════════════════════════════════
// NAVIGATION DESKTOP USER
// ══════════════════════════════════════════
function desktopNav(page, el) {
  // Sidebar
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('on'));
  if (el) el.classList.add('on');

  // Cacher toutes les pages via classe
  document.querySelectorAll('[id^="dpage-"]').forEach(p => {
    p.classList.remove('dpage-active');
    p.classList.add('dpage-hidden');
    p.style.display = 'none';
  });

  // Afficher la cible
  const target = document.getElementById('dpage-' + page);
  if (target) {
    target.classList.remove('dpage-hidden');
    target.classList.add('dpage-active');
    target.style.display = 'block';
  }

  // Titre
  const titles = {
    home:      'Accueil',
    search:    'Résultats de recherche',
    companies: 'Compagnies',
    bookings:  'Mes réservations',
    payments:  'Paiements',
    account:   'Mon compte',
  };
  const titleEl = document.getElementById('desktopPageTitle');
  if (titleEl) titleEl.textContent = titles[page] || page;

  if (page === 'bookings')  loadDesktopBookings();
  if (page === 'account')   loadDesktopProfile();
  if (page === 'payments')  loadDesktopPayments();
  if (page === 'companies') loadDesktopAllCompanies();
  if (page === 'home') {
    loadDesktopCompanies();
    buildDesktopChart();
  }
}

// ══════════════════════════════════════════
// NAVIGATION DASHBOARD DESKTOP
// ══════════════════════════════════════════
function dashDesktopNav(el, panel) {
  // Mettre à jour sidebar
  document.querySelectorAll('.dash-sidebar-link').forEach(l => {
    l.classList.remove('on');
  });
  el.classList.add('on');

  // Cacher toutes les pages dashboard
  document.querySelectorAll('[id^="ddp-"]').forEach(p => {
    p.style.display = 'none';
  });

  // Afficher la page cible
  const target = document.getElementById('ddp-' + panel);
  if (target) target.style.display = 'block';

  // Titre
  const titles = {
    overview: "Vue d'ensemble",
    trajets:  'Mes trajets',
    gares:    'Mes gares',
    buses:    'Ma flotte',
    bookings: 'Réservations reçues',
    stats:    'Statistiques',
    settings: 'Paramètres',
  };
  const titleEl = document.getElementById('dashPageTitle');
  if (titleEl) titleEl.textContent = titles[panel] || panel;

  // Bouton d'action contextuel
  const btn      = document.getElementById('dashAddBtn');
  const btnLabel = document.getElementById('dashAddLabel');

  const actions = {
    trajets: { label: 'Nouveau trajet', modal: 'addTrajetModal' },
    gares:   { label: 'Nouvelle gare',  modal: 'addGareModal'   },
    buses:   { label: 'Nouveau bus',    modal: 'addBusModal'    },
  };

  if (btn) {
    if (actions[panel]) {
      btn.style.display = 'flex';
      if (btnLabel) btnLabel.textContent = actions[panel].label;
      btn.onclick = () => {
        // Peupler les selects avant d'ouvrir le modal
        if (panel === 'trajets') populateDashSelects();
        openModal(actions[panel].modal);
      };
    } else {
      btn.style.display = 'none';
    }
  }

  // Charger les données avec vérification du token
if (panel === 'trajets') {
  if (!getCoToken()) { openCoLoginModal(); return; }
  loadDashTrajets().then(() => renderDesktopTrajets()).catch(() => {});
}
if (panel === 'gares') {
  if (!getCoToken()) { openCoLoginModal(); return; }
  loadDashGares().then(() => renderDesktopGares()).catch(() => {});
}
if (panel === 'buses') {
  if (!getCoToken()) { openCoLoginModal(); return; }
  loadDashBuses().then(() => renderDesktopBuses()).catch(() => {});
}
if (panel === 'overview') {
  if (!getCoToken()) { openCoLoginModal(); return; }
  loadDashStats().catch(() => {});
  renderDesktopOverviewTrips();
}
}

// ══════════════════════════════════════════
// CHARGER VILLES
// ══════════════════════════════════════════
async function loadCitiesFromAPI() {
  try {
    const cities = await apiFetch('/trips/cities');
    if (cities && cities.length) {
      ['s-from', 's-to', 'qs-from', 'qs-to', 'ds-from', 'ds-to'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML =
          '<option value="">Choisir</option>' +
          cities.map(c => `<option>${c}</option>`).join('');
      });
    }
  } catch (e) {
    console.log('Villes statiques utilisées');
  }
}

// ══════════════════════════════════════════
// CHARGER COMPAGNIES
// ══════════════════════════════════════════
async function loadCompaniesFromAPI() {
  try {
    const companies = await apiFetch('/companies');
    if (companies && companies.length) {
      renderCompaniesFromAPI(companies);
    }
  } catch (e) {
    console.log('Erreur chargement compagnies');
  }
}

function renderCompaniesFromAPI(companies) {
  const el = document.getElementById('panel-companies');
  if (!el) return;
  el.innerHTML = companies.map(co => `
    <div class="co-card">
      <div class="co-logo" style="background:${co.color || '#f97316'}">
        ${co.name.substring(0, 3).toUpperCase()}
      </div>
      <div class="co-info">
        <div class="co-name">${co.name}</div>
        <div class="co-meta">${co.trip_count || 0} destinations</div>
        <span class="co-approved">✓ Approuvée DésirCompagny</span>
      </div>
      <button class="btn-see" onclick="openCoTrajets('${co.id}')">
        Voir les<br>trajets
      </button>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
// STATS DASHBOARD
// ══════════════════════════════════════════
async function loadDashStats() {
  try {
    const stats = await apiFetch('/companies/dashboard/stats', {}, true);
    if (!stats) return null;
    const caEl = document.getElementById('kCA');
    if (caEl) caEl.textContent = Number(stats.revenue).toLocaleString('fr-FR');
    return stats;
  } catch (e) {
    return null;
  }
}

// ══════════════════════════════════════════
// COMPAGNIES DESKTOP
// ══════════════════════════════════════════
async function loadDesktopCompanies() {
  try {
    const companies = await apiFetch('/companies');
    renderDesktopCompanies(companies, 'desktopCompaniesList', 4);
  } catch (e) {
    console.error('Erreur compagnies desktop:', e);
  }
}

async function loadDesktopAllCompanies() {
  try {
    const companies = await apiFetch('/companies');
    renderDesktopCompanies(companies, 'desktopAllCompanies', companies.length);
  } catch (e) {
    console.error(e);
  }
}

function renderDesktopCompanies(companies, containerId, limit) {
  const el = document.getElementById(containerId);
  if (!el || !companies) return;
  el.innerHTML = companies.slice(0, limit).map(co => `
    <div class="desktop-company-card">
      <div class="desktop-co-logo"
           style="background:${co.color || '#f97316'}">
        ${co.name.substring(0, 3).toUpperCase()}
      </div>
      <div style="font-family:'arial',sans-serif;font-weight:700;
                  font-size:15px;margin-bottom:4px">
        ${co.name}
      </div>
      <div style="font-size:12px;color:var(--ink5);margin-bottom:8px">
        ${co.trip_count || 0} destinations disponibles
      </div>
      <span class="chip chip-green">✓ Approuvée DésirCompagny</span>
      <button class="btn-desktop-primary"
              style="width:100%;justify-content:center;margin-top:12px"
              onclick="desktopViewCompanyTrips('${co.id}','${co.name}')">
        Voir les trajets
      </button>
    </div>
  `).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function filterDesktopCompanies(query) {
  document.querySelectorAll('#desktopAllCompanies .desktop-company-card')
    .forEach(card => {
      const name = card.querySelector('[style*="Syne"]')?.textContent?.toLowerCase() || '';
      card.style.display = name.includes(query.toLowerCase()) ? 'block' : 'none';
    });
}

async function desktopViewCompanyTrips(coId, coName) {
  try {
    const trips = await apiFetch(`/trips/search?companyId=${coId}`);
    const titEl = document.getElementById('dres-title');
    const subEl = document.getElementById('dres-sub');
    if (titEl) titEl.textContent = coName + ' — Trajets';
    if (subEl) subEl.textContent = trips.length + ' trajet(s)';

    const list = document.getElementById('desktopResultsList');
    if (list) {
      list.innerHTML = trips.length
        ? trips.map(r => `
            <div class="desktop-result-card">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
                <div style="width:48px;height:48px;border-radius:12px;
                            background:${r.company_color || '#f97316'};
                            display:flex;align-items:center;justify-content:center;
                            font-family:'arial',sans-serif;font-weight:800;
                            font-size:14px;color:white">
                  ${r.company_name.substring(0, 3).toUpperCase()}
                </div>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:15px">${r.company_name}</div>
                  <div style="font-family:'arial',sans-serif;font-size:18px;font-weight:800">
                    ${r.departure_time.substring(0, 5)}
                    <span style="font-size:14px;font-weight:400;color:var(--ink5)">
                      → ${r.arrival_time.substring(0, 5)}
                    </span>
                  </div>
                  <div style="font-size:12px;color:var(--ink5)">
                    ${r.departure_city} → ${r.arrival_city}
                  </div>
                </div>
                <div style="font-family:'Syne',sans-serif;font-size:20px;
                            font-weight:800;color:var(--or)">
                  ${Number(r.price).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;
                          padding-top:12px;border-top:1px solid var(--border)">
                <span style="font-size:13px;color:var(--ink4)">
                  🪑 ${r.total_seats} places · ${r.recurrence || 'Tous les jours'}
                </span>
                <button class="btn-desktop-primary"
                  onclick="bookFlow(${JSON.stringify(r).replace(/"/g, "'")})">
                  💳 Réserver et payer
                </button>
              </div>
            </div>
          `).join('')
        : `<div class="empty" style="grid-column:1/-1">
             <div class="ei">🚌</div>
             <p>Aucun trajet disponible</p>
           </div>`;
    }

    desktopNav('search', null);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// RECHERCHE DESKTOP
// ══════════════════════════════════════════
async function desktopSearch() {
  const from = document.getElementById('ds-from')?.value;
  const to   = document.getElementById('ds-to')?.value;

  if (!from || !to) {
    toast('Choisissez départ et destination', 'var(--red)');
    return;
  }

  try {
    toast('Recherche en cours...', 'var(--ink2)');
    const results = await apiFetch(
      `/trips/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );

    const titEl = document.getElementById('dres-title');
    const subEl = document.getElementById('dres-sub');
    if (titEl) titEl.textContent = `${from} → ${to}`;
    if (subEl) subEl.textContent =
      results.length + ' trajet' + (results.length > 1 ? 's' : '') + ' disponible(s)';

    const list = document.getElementById('desktopResultsList');
    if (list) {
      list.innerHTML = !results.length
        ? `<div class="empty" style="grid-column:1/-1">
             <div class="ei">🔍</div>
             <p>Aucun trajet disponible pour cette route.</p>
           </div>`
        : results.map(r => `
            <div class="desktop-result-card">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
                <div style="width:48px;height:48px;border-radius:12px;
                            background:${r.company_color || '#f97316'};
                            display:flex;align-items:center;justify-content:center;
                            font-family:'arial',sans-serif;font-weight:800;
                            font-size:14px;color:white">
                  ${r.company_name.substring(0, 3).toUpperCase()}
                </div>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:15px">${r.company_name}</div>
                  <div style="font-family:'arial',sans-serif;font-size:18px;font-weight:800">
                    ${r.departure_time.substring(0, 5)}
                    <span style="font-size:14px;font-weight:400;color:var(--ink5)">
                      → ${r.arrival_time.substring(0, 5)}
                    </span>
                  </div>
                  <div style="font-size:12px;color:var(--ink5)">
                    ${r.recurrence || 'Tous les jours'} · Bus climatisé
                  </div>
                </div>
                <div style="font-family:'Syne',sans-serif;font-size:20px;
                            font-weight:800;color:var(--or)">
                  ${Number(r.price).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;
                          padding-top:12px;border-top:1px solid var(--border)">
                <span style="font-size:13px;color:var(--ink4)">
                  🪑 ${r.total_seats} places disponibles
                </span>
                <button class="btn-desktop-primary"
                  onclick="bookFlow(${JSON.stringify(r).replace(/"/g, "'")})">
                  💳 Réserver et payer
                </button>
              </div>
            </div>
          `).join('');
    }

    desktopNav('search', null);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// PROFIL & RÉSERVATIONS DESKTOP
// ══════════════════════════════════════════
function loadDesktopProfile() {
  if (!uUser) return;
  const fields = {
    'dpf-fn':    uUser.firstName || '',
    'dpf-ln':    uUser.lastName  || '',
    'dpf-tel':   uUser.phone     || '',
    'dpf-email': uUser.email     || '',
    'dpf-city':  uUser.city      || '',
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

function loadDesktopBookings() {
  const tbody = document.getElementById('desktopBookingsTable');
  if (!tbody) return;

  if (!uBookings.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8"
            style="text-align:center;color:var(--ink5);padding:32px">
          Aucune réservation
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = uBookings.map(b => `
    <tr>
      <td><strong>${b.reference || b.id}</strong></td>
      <td>${b.passenger_name || ''}</td>
      <td>${b.departure_city || ''} → ${b.arrival_city || ''}</td>
      <td>${b.departure_date
            ? new Date(b.departure_date).toLocaleDateString('fr-FR')
            : ''}</td>
      <td>${b.seat_number || '—'}</td>
      <td>${Number(b.amount || 0).toLocaleString('fr-FR')} FCFA</td>
      <td>${getStatusBadge(b.status)}</td>
      <td>
        <button class="btn-sm btn-sm-or"
          onclick="reShowTicket(${JSON.stringify(b).replace(/"/g, "'")})">
          🎫 Ticket
        </button>
      </td>
    </tr>
  `).join('');
}

function loadDesktopPayments() {
  loadPayHistory().then(() => {
    setTimeout(() => {
      const src  = document.getElementById('payHistBody');
      const dest = document.getElementById('desktopPaymentsContent');
      if (src && dest) dest.innerHTML = src.innerHTML;
    }, 600);
  });
}

// ══════════════════════════════════════════
// DASHBOARD COMPAGNIE DESKTOP
// ══════════════════════════════════════════
function initDesktopDash() {
  if (!coData) return;

  setTheme(coData.color || '#f97316');

  const els = {
    'dashCoNameDesktop': coData.name,
    'dashAdminName':     coData.adminName || 'Admin',
    'dashAdminEmail':    coData.email     || '',
  };
  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  const inputs = {
    'set-name':   coData.name   || '',
    'set-slogan': coData.slogan || '',
    'set-email':  coData.email  || '',
  };
  Object.entries(inputs).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && el.tagName === 'INPUT') el.value = val;
  });

  const av = document.getElementById('dashAvDesktop');
  if (av) av.textContent = (coData.name || 'C')[0].toUpperCase();

  // Afficher overview
  document.querySelectorAll('[id^="ddp-"]').forEach(p => {
    p.style.display = 'none';
  });
  const overview = document.getElementById('ddp-overview');
  if (overview) overview.style.display = 'block';

  // Chart desktop uniquement
  buildDesktopChart();

  // Peupler les selects
  populateCitySelects(['nt-from', 'nt-to', 'ng-city']);

  // Charger données
  loadDashTrajets().then(() => {
    renderDesktopTrajets();
    renderDesktopOverviewTrips();
  }).catch(() => {});
  loadDashGares().then(() => renderDesktopGares()).catch(() => {});
  loadDashBuses().then(() => {
    renderDesktopBuses();
    populateDashSelects();
  }).catch(() => {});
  loadDashStats().then(stats => {
    if (stats) {
      const dkCA    = document.getElementById('dkCA');
      const dkTrips = document.getElementById('dkTrips');
      const dkBuses = document.getElementById('dkBuses');
      if (dkCA)    dkCA.textContent    = Number(stats.revenue || 0).toLocaleString('fr-FR');
      if (dkTrips) dkTrips.textContent = stats.trips || 0;
      if (dkBuses) dkBuses.textContent = stats.buses || 0;
    }
  }).catch(() => {});

  // Cacher l'alerte de vérification si la compagnie est validée
const alertEl = document.getElementById('verificationAlert');
if (alertEl) {
  if (coData.status === 'verified') {
    alertEl.style.display = 'none';
  } else {
    alertEl.style.display = 'flex';
  }
}
}

function populateDashSelects() {
  populateCitySelects(['nt-from', 'nt-to', 'ng-city']);

  const busSelect = document.getElementById('nt-bus');
  if (busSelect) {
    busSelect.innerHTML =
      '<option value="">Sélectionner un bus</option>' +
      coBuses
        .filter(b => b.status === 'active')
        .map(b => `<option value="${b.id}">
          ${b.license_plate} — ${b.brand} ${b.model}
        </option>`)
        .join('');
  }
}

function buildDesktopChart() {
  const vals  = [42, 68, 55, 80, 92, 120, 74];
  const days  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const mx    = Math.max(...vals);

  const barsEl = document.getElementById('desktopChartBars');
  const lblsEl = document.getElementById('desktopChartLbls');

  if (barsEl) {
    barsEl.innerHTML = vals.map((v, i) => `
      <div class="desktop-bar${i === 5 ? ' hi' : ''}"
           style="height:${(v / mx * 100)}%">
        <div class="desktop-bar-tooltip">${v} tickets</div>
      </div>
    `).join('');
  }

  if (lblsEl) {
    lblsEl.innerHTML = days
      .map(d => `<div class="desktop-bar-lbl">${d}</div>`)
      .join('');
  }
}

// ══════════════════════════════════════════
// RENDER TABLES DASHBOARD
// ══════════════════════════════════════════
function renderDesktopTrajets() {
  const tbody = document.getElementById('desktopTrajetsTable');
  if (!tbody) return;

  const filtered = trajetFilter === 'all'
    ? coTrajets
    : coTrajets.filter(t => t.status === trajetFilter);

  tbody.innerHTML = filtered.length
    ? filtered.map(t => `
        <tr>
          <td><strong>${t.departure_city} → ${t.arrival_city}</strong></td>
          <td>${(t.departure_time || '').substring(0,5)} → ${(t.arrival_time || '').substring(0,5)}</td>
          <td>${Number(t.price).toLocaleString('fr-FR')} FCFA</td>
          <td>${t.total_seats} places</td>
          <td>${t.recurrence}</td>
          <td>
            <span class="chip ${
              t.status === 'active' ? 'chip-green' :
              t.status === 'draft'  ? 'chip-amber' : 'chip-red'
            }">
              ${t.status === 'active' ? 'Actif' :
                t.status === 'draft'  ? 'Brouillon' : 'Complet'}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="icon-btn" onclick="openTrajetDetail('${t.id}')">📊</button>
              <button class="icon-btn" onclick="openEditTrajet('${t.id}')">✏️</button>
              <button class="icon-btn" onclick="delTrajet('${t.id}')">🗑</button>
            </div>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="7"
             style="text-align:center;color:var(--ink5);padding:32px">
         Aucun trajet
       </td></tr>`;
}

function renderDesktopGares() {
  const tbody = document.getElementById('desktopGaresTable');
  if (!tbody) return;

  tbody.innerHTML = coGares.length
    ? coGares.map(g => `
        <tr onclick="openGareDetail('${g.id}')">
          <td><strong>${g.name}</strong></td>
          <td>${g.city}</td>
          <td>${g.country}</td>
          <td><span class="chip chip-green">${g.type}</span></td>
          <td>${g.capacity || 0} / jour</td>
          <td>${g.manager_name || '—'}</td>
          <td>
            <span class="chip ${g.is_active ? 'chip-green' : 'chip-red'}">
              ${g.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td><button class="icon-btn">👁</button></td>
        </tr>
      `).join('')
    : `<tr><td colspan="8"
             style="text-align:center;color:var(--ink5);padding:32px">
         Aucune gare
       </td></tr>`;
}

function renderDesktopBuses() {
  const tbody = document.getElementById('desktopBusesTable');
  if (!tbody) return;

  tbody.innerHTML = coBuses.length
    ? coBuses.map(b => `
        <tr onclick="openBusDetail('${b.id}')">
          <td><strong>${b.license_plate}</strong></td>
          <td>${b.brand} ${b.model}</td>
          <td>${b.year}</td>
          <td>${b.capacity} places</td>
          <td style="font-size:12px">${(b.amenities || []).join(', ') || '—'}</td>
          <td>${b.last_revision || '—'}</td>
          <td>
            <span class="chip ${
              b.status === 'active'      ? 'chip-green' :
              b.status === 'maintenance' ? 'chip-amber' : 'chip-blue'
            }">
              ${b.status === 'active'      ? 'En service' :
                b.status === 'maintenance' ? 'Maintenance' : 'Réserve'}
            </span>
          </td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="icon-btn"
                onclick="event.stopPropagation();openEditBus('${b.id}')">✏️</button>
              <button class="icon-btn"
                onclick="event.stopPropagation();deleteBus('${b.id}')">🗑</button>
            </div>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="8"
             style="text-align:center;color:var(--ink5);padding:32px">
         Aucun bus
       </td></tr>`;
}

function renderDesktopOverviewTrips() {
  const el = document.getElementById('dashOverviewTrips');
  if (!el) return;

  el.innerHTML = coTrajets.slice(0, 4).map(t => `
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:14px">
          ${t.departure_city} → ${t.arrival_city}
        </div>
        <div style="font-size:12px;color:var(--ink5)">
          ${(t.departure_time || '').substring(0,5)} · ${t.recurrence}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:'arial',sans-serif;font-size:14px;
                    font-weight:800;color:var(--or)">
          ${Number(t.price).toLocaleString('fr-FR')} F
        </div>
        <span class="chip ${t.status === 'active' ? 'chip-green' : 'chip-amber'}">
          ${t.status === 'active' ? 'Actif' : 'Brouillon'}
        </span>
      </div>
    </div>
  `).join(''); 
}


 // ══════════════════════════════════════════
// RENOUVELLEMENT PROACTIF DU TOKEN
// Vérifie toutes les 30 minutes
// ══════════════════════════════════════════
function startTokenRefreshTimer() {
  // Renouveler toutes les 45 minutes
  // (access token expire dans 1h, on renouvelle 15 min avant)
  setInterval(async () => {
    if (getToken() && uUser) {
      await refreshAccessToken(false);
    }
    if (getCoToken() && coData) {
      await refreshAccessToken(true);
    }
  }, 45 * 60 * 1000); // 45 minutes
}