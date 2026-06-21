// ══════════════════════════════════════════
// CONFIG & API
// ══════════════════════════════════════════
const API = 'http://localhost:3000';

const getToken   = () => localStorage.getItem('dc_token');
const setToken   = (t) => localStorage.setItem('dc_token', t);
const getUser    = () => JSON.parse(localStorage.getItem('dc_user') || 'null');
const setUser    = (u) => localStorage.setItem('dc_user', JSON.stringify(u));
const getCoToken = () => localStorage.getItem('dc_co_token');
const setCoToken = (t) => localStorage.setItem('dc_co_token', t);
const getCoData  = () => JSON.parse(localStorage.getItem('dc_co_data') || 'null');
const setCoData  = (c) => localStorage.setItem('dc_co_data', JSON.stringify(c));

// ══════════════════════════════════════════
// FETCH AUTHENTIFIÉ
// ══════════════════════════════════════════

async function apiFetch(path, options = {}, useCoToken = false) {
  const token = useCoToken ? getCoToken() : getToken();

  const makeRequest = async (tkn) => {
    return fetch(`${API}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(tkn ? { Authorization: `Bearer ${tkn}` } : {}),
        ...(options.headers || {}),
      },
    });
  };

  let res = await makeRequest(token);

  // Si token expiré → essayer de renouveler
  if (res.status === 401) {
    const refreshed = await refreshAccessToken(useCoToken);

    if (refreshed) {
      // Réessayer avec le nouveau token
      const newToken = useCoToken ? getCoToken() : getToken();
      res = await makeRequest(newToken);
    } else {
      // Impossible de renouveler → déconnecter proprement
      handleSessionExpired(useCoToken);
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// ══════════════════════════════════════════
// RENOUVELER LE TOKEN AUTOMATIQUEMENT
// ══════════════════════════════════════════
async function refreshAccessToken(useCoToken = false) {
  const refreshKey   = useCoToken ? 'dc_co_refresh' : 'dc_refresh';
  const refreshToken = localStorage.getItem(refreshKey);

  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();

    if (useCoToken) {
      setCoToken(data.token);
      if (data.refreshToken) {
        localStorage.setItem('dc_co_refresh', data.refreshToken);
      }
    } else {
      setToken(data.token);
      if (data.refreshToken) {
        localStorage.setItem('dc_refresh', data.refreshToken);
      }
    }

    console.log('🔄 Token renouvelé automatiquement');
    return true;

  } catch (err) {
    console.error('Refresh failed:', err);
    return false;
  }
}

// ══════════════════════════════════════════
// SESSION EXPIRÉE — DÉCONNEXION PROPRE
// ══════════════════════════════════════════
function handleSessionExpired(useCoToken = false) {
  if (useCoToken) {
    coData = null;
    localStorage.removeItem('dc_co_token');
    localStorage.removeItem('dc_co_data');
    localStorage.removeItem('dc_co_refresh');
    toast('Session compagnie expirée. Reconnectez-vous.', 'var(--or)');
    setTimeout(() => {
      if (isDesktop()) {
        const uiCompany = document.getElementById('ui-company');
        const uiUser    = document.getElementById('ui-user');
        if (uiCompany) uiCompany.style.display = 'none';
        if (uiUser)    uiUser.style.display    = 'flex';
        showDesktopUser();
        setTimeout(() => openCoLoginModal(), 500);
      } else {
        showScreen('scr-coOb');
      }
    }, 1500);
  } else {
    uUser     = null;
    uBookings = [];
    localStorage.removeItem('dc_token');
    localStorage.removeItem('dc_user');
    localStorage.removeItem('dc_refresh');
    toast('Session expirée. Reconnectez-vous.', 'var(--or)');
    setTimeout(() => {
      if (typeof updateDrawerUser === 'function') updateDrawerUser();
      if (typeof refreshAccountScreen === 'function') refreshAccountScreen();
    }, 500);
  }
}

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function toast(msg, color = 'var(--ink2)') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = color;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ══════════════════════════════════════════
// NAVIGATION ÉCRANS
// ══════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
  const el = document.getElementById(id);
  if (el) el.classList.add('on');
}

// ══════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════
function openModal(id) {
  // Fermer TOUS les modals ouverts d'abord
  document.querySelectorAll('.modal-wrap').forEach(m => {
    m.classList.remove('on');
    m.style.display = 'none';
  });

  // Ouvrir uniquement celui demandé
  const el = document.getElementById(id);
  if (!el) {
    console.warn('Modal introuvable :', id);
    return;
  }
  el.classList.add('on');
  el.style.display = 'flex';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('on');
    el.style.display = 'none';
  }
}

// ══════════════════════════════════════════
// VARIABLES GLOBALES
// ══════════════════════════════════════════
let uUser          = getUser();
let uBookings      = [];
let coData         = getCoData();
let coTrajets      = [];
let coGares        = [];
let coBuses        = [];
let pendingBooking = null;
let selectedSeat   = null;
let pendingCb      = null;
let regColor       = '#f97316';
let regStep        = 1;
let trajetFilter   = 'all';
let seatPlanSelected = null;
let botIdx         = 0;
let cancelBkId     = null;
let ratingVal      = 0;

// ══════════════════════════════════════════
// DONNÉES STATIQUES
// ══════════════════════════════════════════
const CITIES = [
  'Abidjan', 'Bouaké', 'Korhogo', 'Man', 'Yamoussoukro',
  'San-Pédro', 'Daloa', 'Gagnoa', 'Odienné', 'Bondoukou',
  'Aboisso', 'Agboville', 'Divo', 'Soubré', 'Abengourou', 'Grand-Bassam',
];

const ALL_GARES = [
  "Gare d'Adjamé (Abidjan)", "Gare de Yopougon", "Gare de Cocody",
  "Gare de Bouaké Centre", "Gare de Korhogo", "Gare de Man",
  "Gare de Yamoussoukro", "Gare de San-Pédro", "Gare de Daloa",
  "Gare de Gagnoa", "Terminal d'Abidjan (International)",
];

const PAYMENT_METHODS = [
  {
    id: 'orange_money',
    label: 'Orange Money',
    img: 'assets/images/Orange.jpg',
  },
  {
    id: 'mtn',
    label: 'MTN MoMo',
    img: 'assets/images/MTN-CI.jpg',
  },
  {
    id: 'wave',
    label: 'Wave',
    img: 'assets/images/Wave.jpg',
  },
  {
    id: 'card',
    label: 'Carte bancaire',
    img: 'assets/images/Visa.jpeg',
  },
];

const botReplies = [
  'Je comprends. Votre numéro de réservation svp ?',
  'Je vais vérifier cela immédiatement.',
  'Un conseiller vous rappellera sous 30 min.',
  'Les remboursements sont traités sous 48h ouvrées.',
  "Merci de votre patience. Autre question ?",
];

// ══════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════
function populateCitySelects(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML =
      '<option value="">Choisir</option>' +
      CITIES.map(c => `<option${c === current ? ' selected' : ''}>${c}</option>`).join('');
  });
}

function buildQR(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const pattern = [
    1,1,1,1,1,0,0,
    1,0,0,0,1,1,0,
    1,0,1,0,1,0,1,
    1,0,0,0,1,1,1,
    1,1,1,1,1,0,1,
    0,1,0,1,0,0,1,
    1,0,1,1,0,1,1,
  ];
  el.innerHTML = pattern
    .map(v => `<div class="qc${v ? '' : ' e'}"></div>`)
    .join('');
}

function initGaresChecklist() {
  const el = document.getElementById('garesChecklist');
  if (!el) return;
  el.innerHTML = ALL_GARES.map((g, i) => `
    <div class="gares-check-item">
      <input type="checkbox" ${i < 3 ? 'checked' : ''}/>
      <span style="font-size:14px">${g}</span>
    </div>
  `).join('');
}