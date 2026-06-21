// ══════════════════════════════════════════
// AUTH UTILISATEUR
// ══════════════════════════════════════════
function openAuth(mode) {
  document.getElementById('authLayer').classList.add('on');
  switchAuth(mode);
}

function closeAuth() {
  document.getElementById('authLayer').classList.remove('on');
}

function switchAuth(m) {
  document.getElementById('authLogin').style.display    = m === 'login'    ? 'block' : 'none';
  document.getElementById('authRegister').style.display = m === 'register' ? 'block' : 'none';
}

function reqAuth(fn) {
  if (uUser) { fn(); return; }
  pendingCb = fn;
  openAuth('register');
}

async function uLogin() {
  const phoneOrEmail = document.getElementById('a-id').value.trim();
  const password     = document.getElementById('a-pw').value;

  if (!phoneOrEmail || !password) {
    toast('Remplissez tous les champs', 'var(--red)');
    return;
  }

  const isEmail = phoneOrEmail.includes('@');
  const payload = isEmail
    ? { email: phoneOrEmail, password }
    : { phone: phoneOrEmail, password };

  try {
    toast('Connexion en cours...', 'var(--ink2)');

    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });

    setToken(data.token);
    setUser(data.user);
    uUser     = data.user;
    uBookings = [];

    if (data.refreshToken) {
      localStorage.setItem('dc_refresh', data.refreshToken);
    }

    closeAuth();
    updateDrawerUser();
    refreshAccountScreen();
    loadMyBookings().catch(() => {});
    loadPayHistory().catch(() => {});

    toast('✓ Bienvenue ' + data.user.firstName, 'var(--green)');

    if (pendingCb) { pendingCb(); pendingCb = null; }

  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

async function uRegister() {
  const fn    = document.getElementById('r-fn').value.trim();
  const ln    = document.getElementById('r-ln').value.trim();
  const tel   = document.getElementById('r-tel').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const pw    = document.getElementById('r-pw').value;

  if (!fn || !ln || !tel || !pw) {
    toast('Tous les champs obligatoires doivent être remplis', 'var(--red)');
    return;
  }

  try {
    toast('Création du compte...', 'var(--ink2)');

    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body:   JSON.stringify({
        firstName: fn,
        lastName:  ln,
        phone:     tel,
        email:     email || undefined,
        password:  pw,
      }),
    });

    setToken(data.token);
    setUser(data.user);
    uUser = data.user;

    if (data.refreshToken) {
      localStorage.setItem('dc_refresh', data.refreshToken);
    }

    closeAuth();
    updateDrawerUser();
    refreshAccountScreen();
    toast('✓ Compte créé avec succès', 'var(--green)');

    if (pendingCb) { pendingCb(); pendingCb = null; }

  } catch (e) {
    toast(e.message, 'var(--red)');
  }
}

function uLogout() {
  uUser     = null;
  uBookings = [];
  localStorage.removeItem('dc_token');
  localStorage.removeItem('dc_user');
  localStorage.removeItem('dc_refresh');
  updateDrawerUser();
  refreshAccountScreen();
  showScreen('scr-splash');
  toast('Vous êtes déconnecté', 'var(--ink2)');
}

// ══════════════════════════════════════════
// AUTH COMPAGNIE
// ══════════════════════════════════════════
function openCoLoginModal() {
  const emailEl = document.getElementById('co-login-email');
  const pwEl    = document.getElementById('co-login-pw');
  const errEl   = document.getElementById('coLoginError');
  if (emailEl) emailEl.value       = '';
  if (pwEl)    pwEl.value          = '';
  if (errEl)   errEl.style.display = 'none';
  openModal('coLoginModal');
}

async function coLogin() {
  const email    = document.getElementById('co-login-email')?.value.trim();
  const password = document.getElementById('co-login-pw')?.value;
  const errEl    = document.getElementById('coLoginError');

  if (!email || !password) {
    if (errEl) {
      errEl.textContent   = 'Email et mot de passe obligatoires';
      errEl.style.display = 'block';
    }
    return;
  }

  const btn = document.querySelector('#coLoginModal .btn-reg-next');
  if (btn) { btn.textContent = 'Connexion...'; btn.disabled = true; }

  try {
    const data = await apiFetch('/auth/company/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    });

    // Sauvegarder APRÈS avoir reçu data
    setCoToken(data.token);
    setCoData(data.company);
    coData = data.company;

    if (data.refreshToken) {
      localStorage.setItem('dc_co_refresh', data.refreshToken);
    }

    closeModal('coLoginModal');

    if (isDesktop()) {
      const phone     = document.querySelector('.phone');
      const uiUser    = document.getElementById('ui-user');
      const uiCompany = document.getElementById('ui-company');
      if (phone)     phone.style.display     = 'none';
      if (uiUser)    uiUser.style.display    = 'none';
      if (uiCompany) uiCompany.style.display = 'flex';
      requestAnimationFrame(() => initDesktopDash());
    } else {
      initDash();
      showScreen('scr-coDash');
    }

    toast('✓ Bienvenue ' + data.company.name, 'var(--green)');

  } catch (e) {
    if (errEl) {
      errEl.textContent   = e.message;
      errEl.style.display = 'block';
    }
  } finally {
    if (btn) { btn.textContent = 'Se connecter →'; btn.disabled = false; }
  }
}

function coDashLogout() {
  coData    = null;
  coTrajets = [];
  coGares   = [];
  coBuses   = [];
  localStorage.removeItem('dc_co_token');
  localStorage.removeItem('dc_co_data');
  localStorage.removeItem('dc_co_refresh');

  if (isDesktop()) {
    const uiCompany = document.getElementById('ui-company');
    const uiUser    = document.getElementById('ui-user');
    const phone     = document.querySelector('.phone');
    if (uiCompany) uiCompany.style.display = 'none';
    if (phone)     phone.style.display     = 'none';
    if (uiUser) {
      uiUser.style.display = 'flex';
      requestAnimationFrame(() => showDesktopUser());
    }
  } else {
    showScreen('scr-coOb');
  }

  toast('Déconnecté du dashboard', 'var(--ink2)');
}

function switchToCompanyDesktop() {
  if (isDesktop()) {
    openCoLoginModal();
  } else {
    showScreen('scr-coOb');
  }
}