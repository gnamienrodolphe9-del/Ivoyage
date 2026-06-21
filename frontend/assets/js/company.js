// ══════════════════════════════════════════
// REGISTER COMPAGNIE
// ══════════════════════════════════════════
function regNext(to) {
  document.getElementById('regStep' + regStep).style.display = 'none';
  for (let i = 1; i <= to; i++) {
    document.getElementById('rs' + i).classList.add('done');
  }
  document.getElementById('regStep' + to).style.display = 'block';
  document.getElementById('stepCounter').textContent = to + ' / 4';
  regStep = to;
}

function pickColor(el) {
  document.querySelectorAll('#regSwatches .cswatch').forEach(s => s.classList.remove('on'));
  el.classList.add('on');
  regColor = el.dataset.c;
  document.getElementById('colorPreview').style.background = regColor;
  document.getElementById('colorPicker').value = regColor;
}

function customColor(v) {
  regColor = v;
  document.getElementById('colorPreview').style.background = v;
}

function previewLogo(input) {
  if (input.files && input.files[0]) {
    const r = new FileReader();
    r.onload = e => {
      document.getElementById('logoPreview').innerHTML =
        `<img src="${e.target.result}"
              style="width:48px;height:48px;border-radius:8px;object-fit:cover;margin:0 auto"/>`;
    };
    r.readAsDataURL(input.files[0]);
  }
}

async function submitReg() {
  if (!document.getElementById('cgu').checked) {
    toast('Acceptez les conditions générales', 'var(--red)');
    return;
  }

  const payload = {
    name:           document.getElementById('co-name').value,
    email:          document.getElementById('co-email').value,
    phone:          document.getElementById('co-tel1').value,
    password:       document.getElementById('co-pw').value,
    adminFirstName: document.getElementById('co-fn').value,
    adminLastName:  document.getElementById('co-ln').value,
    adminRole:      'admin',
    country:        document.getElementById('co-country').value,
    address:        document.getElementById('co-addr').value,
    rccm:           document.getElementById('co-rccm').value,
    description:    document.getElementById('co-desc').value,
    color:          regColor,
    slogan:         document.getElementById('co-slogan').value,
  };

  if (!payload.name || !payload.email || !payload.phone ||
      !payload.password || !payload.adminFirstName || !payload.adminLastName) {
    toast('Remplissez tous les champs obligatoires', 'var(--red)');
    return;
  }

  try {
    toast('Envoi de la demande...', 'var(--ink2)');
    await apiFetch('/companies/register', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    showScreen('scr-coSuccess');
    toast('✓ Demande envoyée avec succès', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// DASHBOARD MOBILE — INIT
// ══════════════════════════════════════════
function initDash() {
  if (!coData) return;

  // Peupler les selects villes — CORRECTION : populateCitySelects avec 's'
  populateCitySelects(['nt-from', 'nt-to', 'ng-city']);

  setTheme(coData.color || '#f97316');

  const dashCoName = document.getElementById('dashCoName');
  const dashAv     = document.getElementById('dashAv');
  const setName    = document.getElementById('set-name');
  const setSlogan  = document.getElementById('set-slogan');
  const setEmail   = document.getElementById('set-email');

  if (dashCoName) dashCoName.textContent = coData.name;
  if (dashAv)     dashAv.textContent     = (coData.name || 'C')[0].toUpperCase();
  if (setName)    setName.value          = coData.name   || '';
  if (setSlogan)  setSlogan.value        = coData.slogan || '';
  if (setEmail)   setEmail.value         = coData.email  || '';

  buildChart();
  loadDashTrajets();
  loadDashGares();
  loadDashBuses();
}

// ══════════════════════════════════════════
// DASHBOARD MOBILE — NAVIGATION
// ══════════════════════════════════════════
function dashNav(el, panel) {
  document.querySelectorAll('.dbnav').forEach(n => n.classList.remove('on'));
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  const target = document.getElementById('dp-' + panel);
  if (target) target.classList.add('on');
  const scroll = document.getElementById('dashScroll');
  if (scroll) scroll.scrollTop = 0;
}

// ══════════════════════════════════════════
// THÈME COULEUR
// ══════════════════════════════════════════
function setTheme(color) {
  document.documentElement.style.setProperty('--accent', color);
  const topbar = document.getElementById('dashTopbar');
  if (topbar) topbar.style.background = color;

  document.querySelectorAll('#setSwatches .cswatch').forEach(s => s.classList.remove('on'));
  document.querySelector(`#setSwatches [data-c="${color}"]`)?.classList.add('on');

  if (coData) {
    coData.color = color;
    setCoData(coData);
  }
}

// ══════════════════════════════════════════
// CHART MOBILE
// ══════════════════════════════════════════
function buildChart() {

  const vals = [42,68,55,80,92,120,74];
  const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const mx = Math.max(...vals);

  const barsEl =
      document.getElementById('desktopChartBars') ||
      document.getElementById('chartBars');

  const lblsEl =
      document.getElementById('desktopChartLbls') ||
      document.getElementById('chartLbls');

  if(barsEl){
      barsEl.innerHTML = vals.map((v,i)=>
          `<div class="bar${i===5?' hi':''}"
               style="height:${(v/mx)*100}%"></div>`
      ).join('');
  }

  if(lblsEl){
      lblsEl.innerHTML = days.map(d =>
          `<div class="bar-lbl">${d}</div>`
      ).join('');
  }
}

// ══════════════════════════════════════════
// TRAJETS — CHARGEMENT
// ══════════════════════════════════════════
async function loadDashTrajets() {
  try {
    coTrajets = await apiFetch('/trips/company', {}, true);
    renderDashTrajets();

    function renderDesktopTrajets(){

    const tb = document.getElementById('desktopTrajetsTable');

    if(!tb) return;

    tb.innerHTML = coTrajets.map(t=>`

        <tr>
            <td>${t.departure_city} → ${t.arrival_city}</td>
            <td>${(t.departure_time||'').substring(0,5)}</td>
            <td>${Number(t.price).toLocaleString('fr-FR')} FCFA</td>
            <td>${t.total_seats}</td>
            <td>${t.recurrence}</td>
            <td>${t.status}</td>
            <td>
                <button onclick="openEditTrajet('${t.id}')">
                    Modifier
                </button>
            </td>
        </tr>

    `).join('');
}

    renderOverviewTrajets();
    const countEl = document.getElementById('trajetCount');
    if (countEl) countEl.textContent =
      coTrajets.length + ' trajet' + (coTrajets.length > 1 ? 's' : '');
  } catch (e) {
    console.error('Erreur trajets:', e);
  }
}

function filterTrajets(el, filter) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  trajetFilter = filter;
  renderDashTrajets();
  if (isDesktop()) renderDesktopTrajets();
}

function renderDashTrajets() {
  const el = document.getElementById('trajetsList');
  if (!el) return;

  const filtered = trajetFilter === 'all'
    ? coTrajets
    : coTrajets.filter(t => t.status === trajetFilter);

  el.innerHTML = filtered.length
    ? filtered.map(t => `
        <div class="trow">
          <div class="trow-info">
            <div class="trow-route">${t.departure_city} → ${t.arrival_city}</div>
            <div class="trow-meta">
              ${(t.departure_time || '').substring(0,5)} · ${Number(t.price).toLocaleString('fr-FR')} FCFA · ${t.recurrence}
            </div>
            <div style="margin-top:5px">
              <span class="chip ${
                t.status === 'active' ? 'chip-green' :
                t.status === 'draft'  ? 'chip-amber' : 'chip-red'
              }">
                ${t.status === 'active' ? '● Actif' :
                  t.status === 'draft'  ? '● Brouillon' : '● Complet'}
              </span>
            </div>
          </div>
          <div class="trow-actions">
            <button class="icon-btn" onclick="openTrajetDetail('${t.id}')">📊</button>
            <button class="icon-btn" onclick="openEditTrajet('${t.id}')">✏️</button>
            <button class="icon-btn" onclick="delTrajet('${t.id}')">🗑</button>
          </div>
        </div>
      `).join('')
    : '<div class="empty"><div class="ei">  🚌</div><p>Aucun trajet dans cette catégorie</p></div>';
}

function renderOverviewTrajets() {
  const el = document.getElementById('overviewTrajets');
  if (!el) return;

  el.innerHTML = coTrajets.slice(0, 3).map(t => `
    <div class="trow" style="margin-bottom:8px">
      <div class="trow-info">
        <div class="trow-route">${t.departure_city} → ${t.arrival_city}</div>
        <div class="trow-meta">
          ${(t.departure_time || '').substring(0,5)} ·
          <strong style="color:var(--ink)">${Number(t.price).toLocaleString('fr-FR')} FCFA</strong>
        </div>
      </div>
      <span class="chip ${
        t.status === 'active' ? 'chip-green' :
        t.status === 'draft'  ? 'chip-amber' : 'chip-red'
      }">
        ${t.status === 'active' ? 'Actif' : t.status === 'draft' ? 'Brouillon' : 'Complet'}
      </span>
    </div>
  `).join('');
}

// ══════════════════════════════════════════
// TRAJETS — ACTIONS
// ══════════════════════════════════════════
async function addTrajet() {
  const from   = document.getElementById('nt-from')?.value;
  const to     = document.getElementById('nt-to')?.value;
  const dep    = document.getElementById('nt-dep')?.value;
  const arr    = document.getElementById('nt-arr')?.value;
  const prix   = document.getElementById('nt-prix')?.value;
  const places = document.getElementById('nt-places')?.value;

  if (!from || !to || !prix || !places) {
    toast('Remplissez tous les champs obligatoires', 'var(--red)');
    return;
  }
  if (from === to) {
    toast('Départ et destination doivent être différents', 'var(--red)');
    return;
  }

  try {
    await apiFetch('/trips', {
      method: 'POST',
      body:   JSON.stringify({
        departureCity: from,
        arrivalCity:   to,
        departureTime: dep,
        arrivalTime:   arr,
        price:         Number(prix),
        totalSeats:    Number(places),
        busId:         document.getElementById('nt-bus')?.value || undefined,
        recurrence:    document.getElementById('nt-rec')?.value || 'daily',
      }),
    }, true);

    await loadDashTrajets();
    if (isDesktop()) renderDesktopTrajets();
    closeModal('addTrajetModal');
    toast('<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> Trajet publié sur DésirCompagny !', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

async function delTrajet(id) {
  if (!confirm('Supprimer ce trajet ?')) return;
  try {
    await apiFetch(`/trips/${id}`, { method: 'DELETE' }, true);
    await loadDashTrajets();
    if (isDesktop()) renderDesktopTrajets();
    toast('Trajet supprimé', 'var(--or)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

function openTrajetDetail(id) {
  const t = coTrajets.find(x => x.id === id);
  if (!t) return;

  const titEl  = document.getElementById('tdTit');
  const bodyEl = document.getElementById('tdBody');
  if (titEl)  titEl.textContent = `${t.departure_city} → ${t.arrival_city}`;
  if (bodyEl) bodyEl.innerHTML  = `
    <div style="background:var(--bg2);border-radius:var(--r);padding:13px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--ink5);
                  text-transform:uppercase;margin-bottom:6px">Taux d'occupation</div>
      <div style="height:9px;background:var(--border2);border-radius:100px;overflow:hidden">
        <div style="height:100%;width:60%;background:var(--accent);border-radius:100px"></div>
      </div>
      <div style="font-size:12px;color:var(--ink5);margin-top:4px">Données en temps réel</div>
    </div>
    <div class="set-section">
      <div class="set-title">Informations</div>
      <div class="set-row">
        <div class="set-row-lbl">Horaire</div>
        <div style="font-size:14px;color:var(--ink4)">
          ${(t.departure_time || '').substring(0,5)} → ${(t.arrival_time || '').substring(0,5)}
        </div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Prix</div>
        <div style="font-size:14px;color:var(--ink4)">${Number(t.price).toLocaleString('fr-FR')} FCFA</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Places</div>
        <div style="font-size:14px;color:var(--ink4)">${t.total_seats} places</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Récurrence</div>
        <div style="font-size:14px;color:var(--ink4)">${t.recurrence}</div>
      </div>
    </div>
  `;
  openModal('trajetDetailModal');
}

function openEditTrajet(id) {
  const t = coTrajets.find(x => x.id === id);
  if (!t) return;

  const etId     = document.getElementById('et-id');
  const etDep    = document.getElementById('et-dep');
  const etArr    = document.getElementById('et-arr');
  const etPrix   = document.getElementById('et-prix');
  const etPlaces = document.getElementById('et-places');
  const etRec    = document.getElementById('et-rec');
  const etStatus = document.getElementById('et-status');

  if (etId)     etId.value     = t.id;
  if (etDep)    etDep.value    = (t.departure_time || '').substring(0,5);
  if (etArr)    etArr.value    = (t.arrival_time   || '').substring(0,5);
  if (etPrix)   etPrix.value   = t.price;
  if (etPlaces) etPlaces.value = t.total_seats;
  if (etRec)    etRec.value    = t.recurrence;
  if (etStatus) etStatus.value = t.status;

  openModal('editTrajetModal');
}

async function saveEditTrajet() {
  const id = document.getElementById('et-id')?.value;
  try {
    await apiFetch(`/trips/${id}`, {
      method: 'PUT',
      body:   JSON.stringify({
        departureTime: document.getElementById('et-dep')?.value,
        arrivalTime:   document.getElementById('et-arr')?.value,
        price:         Number(document.getElementById('et-prix')?.value),
        totalSeats:    Number(document.getElementById('et-places')?.value),
        status:        document.getElementById('et-status')?.value,
      }),
    }, true);

    await loadDashTrajets();
    if (isDesktop()) renderDesktopTrajets();
    closeModal('editTrajetModal');
    toast('✓ Trajet mis à jour', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// GARES
// ══════════════════════════════════════════
async function loadDashGares() {
  try {
    coGares = await apiFetch('/companies/stations', {}, true);
    renderGares();
    const countEl = document.getElementById('gareCount');
    if (countEl) countEl.textContent =
      coGares.length + ' gare' + (coGares.length > 1 ? 's' : '');
  } catch (e) {
    console.error('Erreur gares:', e);
  }


  function renderDesktopGares(){

    const tb = document.getElementById('desktopGaresTable');

    if(!tb) return;

    tb.innerHTML = coGares.map(g=>`

        <tr>
            <td>${g.name}</td>
            <td>${g.city}</td>
            <td>${g.country}</td>
            <td>${g.type}</td>
            <td>${g.capacity || 0}</td>
            <td>${g.manager_name || '-'}</td>
            <td>${g.is_active ? 'Active' : 'Inactive'}</td>
            <td>...</td>
        </tr>

    `).join('');
}
}

function renderGares() {
  const el = document.getElementById('garesList');
  if (!el) return;

  el.innerHTML = coGares.length
    ? coGares.map(g => `
        <div class="gare-card">
          <div class="gare-hd">
            <div>
              <div class="gare-name">${g.name}</div>
              <div class="gare-city">📍 ${g.city}, ${g.country}</div>
              <div style="margin-top:5px">
                <span class="chip chip-green">${g.type}</span>
              </div>
            </div>
            <button class="icon-btn" onclick="openGareDetail('${g.id}')">📊</button>
          </div>
          <div class="gare-metrics">
            <div class="gm">
              <div class="gm-val">${g.capacity || 0}</div>
              <div class="gm-lbl">Capacité/jour</div>
            </div>
            <div class="gm">
              <div class="gm-val">${g.is_active ? '✓' : '✗'}</div>
              <div class="gm-lbl">Statut</div>
            </div>
            <div class="gm">
              <div class="gm-val">—</div>
              <div class="gm-lbl">Note</div>
            </div>
          </div>
        </div>
      `).join('')
    : '<div class="empty"><div class="ei">📍</div><p>Aucune gare enregistrée</p></div>';
}

function openGareDetail(id) {
  const g = coGares.find(x => x.id === id);
  if (!g) return;

  const titEl  = document.getElementById('gdTit');
  const bodyEl = document.getElementById('gdBody');
  if (titEl)  titEl.textContent = g.name;
  if (bodyEl) bodyEl.innerHTML  = `
    <div class="set-section">
      <div class="set-title">Informations</div>
      <div class="set-row">
        <div class="set-row-lbl">Ville</div>
        <div style="font-size:14px;color:var(--ink4)">${g.city}</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Adresse</div>
        <div style="font-size:13px;color:var(--ink4)">${g.address || '—'}</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Type</div>
        <div style="font-size:14px;color:var(--ink4)">${g.type}</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Capacité</div>
        <div style="font-size:14px;color:var(--ink4)">${g.capacity || 0} voyageurs/jour</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Responsable</div>
        <div style="font-size:14px;color:var(--ink4)">${g.manager_name || '—'}</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Téléphone</div>
        <div style="font-size:14px;color:var(--ink4)">${g.manager_phone || '—'}</div>
      </div>
    </div>
  `;
  openModal('gareDetailModal');
}

async function addGare() {
  const name = document.getElementById('ng-name')?.value;
  const city = document.getElementById('ng-city')?.value;

  if (!name || !city) {
    toast('Nom et ville obligatoires', 'var(--red)');
    return;
  }

  try {
    await apiFetch('/companies/stations', {
      method: 'POST',
      body:   JSON.stringify({
        name,
        city,
        country:      document.getElementById('ng-country')?.value || "Côte d'Ivoire",
        address:      document.getElementById('ng-addr')?.value    || '',
        type:         document.getElementById('ng-type')?.value    || 'main',
        capacity:     Number(document.getElementById('ng-cap')?.value) || 0,
        managerName:  document.getElementById('ng-manager')?.value || '',
        managerPhone: document.getElementById('ng-tel')?.value     || '',
      }),
    }, true);

    await loadDashGares();
    if (isDesktop()) renderDesktopGares();
    closeModal('addGareModal');
    toast('<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> Gare enregistrée !', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// BUSES
// ══════════════════════════════════════════
async function loadDashBuses() {
  try {
    coBuses = await apiFetch('/companies/buses', {}, true);
    renderBuses();
    const countEl = document.getElementById('busCount');
    if (countEl) countEl.textContent = coBuses.length + ' bus';
  } catch (e) {
    console.error('Erreur bus:', e);
  }

  function renderDesktopBuses(){

    const tb = document.getElementById('desktopBusesTable');

    if(!tb) return;

    tb.innerHTML = coBuses.map(b=>`

        <tr>
            <td>${b.license_plate}</td>
            <td>${b.brand} ${b.model}</td>
            <td>${b.year}</td>
            <td>${b.capacity}</td>
            <td>${(b.amenities || []).join(', ')}</td>
            <td>${b.last_revision || '-'}</td>
            <td>${b.status}</td>
            <td>...</td>
        </tr>

    `).join('');
}
}

function renderBuses() {
  const el = document.getElementById('busesList');
  if (!el) return;

  el.innerHTML = coBuses.length
    ? coBuses.map(b => `
        <div class="bus-card" onclick="openBusDetail('${b.id}')">
          <div class="bus-ico">🚌</div>
          <div class="bus-info">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div class="bus-immat">${b.license_plate}</div>
              <span class="chip ${
                b.status === 'active'      ? 'chip-green' :
                b.status === 'maintenance' ? 'chip-amber' : 'chip-blue'
              }">
                ${b.status === 'active'      ? 'En service' :
                  b.status === 'maintenance' ? 'Maintenance' : 'Réserve'}
              </span>
            </div>
            <div class="bus-detail">${b.brand} ${b.model} · ${b.year} · ${b.capacity} places</div>
            <div class="bus-detail">Révision : ${b.last_revision || '—'}</div>
            <div class="bus-tags">
              ${(b.amenities || []).map(e => `<span class="btag">${e}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('')
    : '<div class="empty"><div class="ei">🚌</div><p>Aucun bus enregistré</p></div>';
}

function openBusDetail(id) {
  const b = coBuses.find(x => x.id === id);
  if (!b) return;

  const titEl  = document.getElementById('busDTit');
  const bodyEl = document.getElementById('busDBody');
  if (titEl)  titEl.textContent = b.license_plate;
  if (bodyEl) bodyEl.innerHTML  = `
    <div class="bus-detail-grid">
      <div class="bus-detail-kpi">
        <div class="bus-detail-kpi-val">${b.capacity}</div>
        <div class="bus-detail-kpi-lbl">Places</div>
      </div>
      <div class="bus-detail-kpi">
        <div class="bus-detail-kpi-val">${b.year}</div>
        <div class="bus-detail-kpi-lbl">Année</div>
      </div>
    </div>
    <div class="set-section">
      <div class="set-title">Caractéristiques</div>
      <div class="set-row">
        <div class="set-row-lbl">Marque / Modèle</div>
        <div style="font-size:14px;color:var(--ink4)">${b.brand} ${b.model}</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Immatriculation</div>
        <div style="font-size:14px;color:var(--ink4)">${b.license_plate}</div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Kilométrage</div>
        <div style="font-size:14px;color:var(--ink4)">
          ${b.mileage ? Number(b.mileage).toLocaleString('fr-FR') + ' km' : '—'}
        </div>
      </div>
      <div class="set-row">
        <div class="set-row-lbl">Équipements</div>
        <div style="font-size:13px;color:var(--ink4)">
          ${(b.amenities || []).join(' · ') || '—'}
        </div>
      </div>
    </div>
    <button class="btn-reg-next"
      onclick="closeModal('busDetailModal');openEditBus('${b.id}')">
      ✏️ Modifier ce bus
    </button>
    <button style="width:100%;margin-top:8px;padding:12px;border-radius:11px;
                   background:var(--red-bg);color:var(--red);font-size:14px;
                   font-weight:700;border:1.5px solid #fca5a5"
      onclick="deleteBus('${b.id}')">
      Retirer de la flotte
    </button>
  `;
  openModal('busDetailModal');
}

async function addBus() {
  const immat = document.getElementById('nb-immat')?.value.trim();
  const cap   = document.getElementById('nb-cap')?.value;

  if (!immat || !cap) {
    toast('Immatriculation et capacité obligatoires', 'var(--red)');
    return;
  }

  const amenities = [];
  if (document.getElementById('eq-ac')?.checked)     amenities.push('Climatisation');
  if (document.getElementById('eq-wifi')?.checked)   amenities.push('WiFi');
  if (document.getElementById('eq-usb')?.checked)    amenities.push('USB');
  if (document.getElementById('eq-toilet')?.checked) amenities.push('Toilettes');

  try {
    await apiFetch('/companies/buses', {
      method: 'POST',
      body:   JSON.stringify({
        licensePlate: immat,
        brand:        document.getElementById('nb-brand')?.value  || '',
        model:        document.getElementById('nb-model')?.value  || '',
        year:         Number(document.getElementById('nb-year')?.value) || 2023,
        capacity:     Number(cap),
        amenities,
        lastRevision: document.getElementById('nb-rev')?.value   || null,
        status:       document.getElementById('nb-stat')?.value  || 'active',
      }),
    }, true);

    await loadDashBuses();
    if (isDesktop()) renderDesktopBuses();
    closeModal('addBusModal');

    // Réinitialiser
    ['nb-immat','nb-model','nb-year','nb-cap','nb-rev'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['eq-ac','eq-wifi','eq-usb','eq-toilet'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });

    toast('<i data-lucide="check" style="width:14px;height:14px, color: var(--or)"></i> Bus ajouté à la flotte !', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

function openEditBus(id) {
  const b = coBuses.find(x => x.id === id);
  if (!b) return;

  const fields = {
    'eb-immat': b.license_plate,
    'eb-model': b.model,
    'eb-year':  b.year,
    'eb-cap':   b.capacity,
    'eb-stat':  b.status,
  };
  Object.entries(fields).forEach(([elId, val]) => {
    const el = document.getElementById(elId);
    if (el) el.value = val;
  });

  const ebId = document.getElementById('eb-id');
  if (ebId) ebId.value = b.id;

  openModal('editBusModal');
}

async function saveEditBus() {
  const id = document.getElementById('eb-id')?.value;
  try {
    await apiFetch(`/companies/buses/${id}`, {
      method: 'PUT',
      body:   JSON.stringify({
        licensePlate: document.getElementById('eb-immat')?.value,
        model:        document.getElementById('eb-model')?.value,
        year:         Number(document.getElementById('eb-year')?.value),
        capacity:     Number(document.getElementById('eb-cap')?.value),
        status:       document.getElementById('eb-stat')?.value,
      }),
    }, true);

    await loadDashBuses();
    if (isDesktop()) renderDesktopBuses();
    closeModal('editBusModal');
    toast('✓ Bus mis à jour', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

async function deleteBus(id) {
  if (!confirm('Retirer ce bus de la flotte ?')) return;
  try {
    await apiFetch(`/companies/buses/${id}`, { method: 'DELETE' }, true);
    await loadDashBuses();
    if (isDesktop()) renderDesktopBuses();
    closeModal('busDetailModal');
    toast('Bus retiré de la flotte', 'var(--or)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

// ══════════════════════════════════════════
// PARAMÈTRES COMPAGNIE
// ══════════════════════════════════════════
async function saveCoSettings() {
  try {
    const updated = await apiFetch('/companies/profile', {
      method: 'PUT',
      body:   JSON.stringify({
        name:   document.getElementById('set-name')?.value,
        slogan: document.getElementById('set-slogan')?.value,
        email:  document.getElementById('set-email')?.value,
        phone:  document.getElementById('set-tel')?.value,
        color:  coData?.color,
      }),
    }, true);

    if (updated.company) {
      coData = { ...coData, ...updated.company };
      setCoData(coData);
      setTheme(coData.color || '#f97316');
    }

    toast('✓ Paramètres enregistrés', 'var(--green)');
  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

function setStatTab(el, tab) {
  document.querySelectorAll('.stat-tab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('[id^="statPanel-"]').forEach(p => p.style.display = 'none');
  const target = document.getElementById('statPanel-' + tab);
  if (target) target.style.display = 'block';
}