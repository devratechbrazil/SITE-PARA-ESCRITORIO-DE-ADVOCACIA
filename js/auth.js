/* ===================================================
   AUTH.JS - Compatibilidade de autenticacao para telas internas
   =================================================== */

const Auth = {
  SESSION_KEY: 'adv_session',
  USER_KEY: 'usuario_atual',
  TOKEN_KEY: 'token_jwt',
  LEGACY_TOKEN_KEY: 'token',
  TIMEOUT_MS: 30 * 60 * 1000,

  mapCargoToPerfil(cargo = '') {
    const value = String(cargo).toLowerCase();
    if (value === 'admin') return 'admin';
    if (value === 'contador' || value === 'financeiro') return 'financeiro';
    return 'advogado';
  },

  normalizeUser(user) {
    if (!user || typeof user !== 'object') return null;

    const perfil = (user.perfil || '').toLowerCase() || this.mapCargoToPerfil(user.cargo);

    return {
      ...user,
      id: user.id || user._id || null,
      perfil,
      cargo: user.cargo || (perfil === 'admin' ? 'Admin' : perfil === 'financeiro' ? 'Financeiro' : 'Advogado')
    };
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.LEGACY_TOKEN_KEY);
  },

  getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(this.SESSION_KEY));
    } catch {
      return null;
    }
  },

  setSession(user) {
    const normalizedUser = this.normalizeUser(user);
    if (!normalizedUser) return null;

    const session = { user: normalizedUser, ts: Date.now() };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(this.USER_KEY, JSON.stringify(normalizedUser));
    return session;
  },

  getStoredUser() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.USER_KEY));
      return this.normalizeUser(raw);
    } catch {
      return null;
    }
  },

  hydrateSessionFromStorage() {
    if (!this.getToken()) return null;

    const currentSession = this.getSession();
    if (currentSession?.user) return currentSession;

    const storedUser = this.getStoredUser();
    if (!storedUser) return null;

    return this.setSession(storedUser);
  },

  isSessionExpired(session) {
    return !session || !session.ts || Date.now() - session.ts > this.TIMEOUT_MS;
  },

  isLoggedIn() {
    const session = this.getSession() || this.hydrateSessionFromStorage();
    if (!session || !this.getToken()) return false;

    if (this.isSessionExpired(session)) {
      this.logout(false);
      return false;
    }

    return true;
  },

  currentUser() {
    const session = this.getSession() || this.hydrateSessionFromStorage();
    return this.normalizeUser(session?.user);
  },

  touchSession() {
    const session = this.getSession() || this.hydrateSessionFromStorage();
    if (!session?.user) return;

    session.ts = Date.now();
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  async login(email, senha) {
    if (typeof api === 'undefined' || typeof api.login !== 'function') {
      return { ok: false, msg: 'API nao inicializada' };
    }

    try {
      const result = await api.login(email, senha);
      const session = this.setSession(result.usuario);

      if (result.token) {
        localStorage.setItem(this.TOKEN_KEY, result.token);
        localStorage.setItem(this.LEGACY_TOKEN_KEY, result.token);
      }

      return { ok: true, user: session.user };
    } catch (error) {
      return { ok: false, msg: error.message };
    }
  },

  async registro(nome, email, senha, telefone = '', cargo = 'Advogado') {
    if (typeof api === 'undefined' || typeof api.registro !== 'function') {
      return { ok: false, msg: 'API nao inicializada' };
    }

    try {
      const result = await api.registro(nome, email, senha, telefone, cargo);
      const session = this.setSession(result.usuario);

      if (result.token) {
        localStorage.setItem(this.TOKEN_KEY, result.token);
        localStorage.setItem(this.LEGACY_TOKEN_KEY, result.token);
      }

      return { ok: true, user: session.user };
    } catch (error) {
      return { ok: false, msg: error.message };
    }
  },

  clearAuthStorage() {
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.LEGACY_TOKEN_KEY);
  },

  logout(redirect = true) {
    this.clearAuthStorage();

    if (typeof api !== 'undefined' && typeof api.logout === 'function') {
      api.logout();
    }

    if (redirect) {
      window.location.href = 'login.html';
    }
  },

  guard() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }

    this.touchSession();
    return true;
  },

  can(perm) {
    const user = this.currentUser();
    if (!user) return false;

    if (user.perfil === 'admin') return true;

    const perms = {
      financeiro: ['admin', 'financeiro'],
      cobrancas: ['admin', 'financeiro'],
      relatorios: ['admin', 'financeiro'],
      usuarios: ['admin'],
      documentos: ['admin', 'advogado', 'financeiro'],
      clientes: ['admin', 'advogado', 'financeiro']
    };

    return (perms[perm] || []).includes(user.perfil);
  },

  renderUserInfo() {
    const user = this.currentUser();
    if (!user) return;

    const avatarEl = document.getElementById('sidebarAvatar');
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');

    const profileMap = {
      admin: 'Administrador',
      financeiro: 'Financeiro',
      advogado: 'Advogado'
    };

    if (avatarEl) avatarEl.textContent = String(user.nome || '?').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.nome || 'Usuario';
    if (roleEl) roleEl.textContent = profileMap[user.perfil] || user.cargo || user.perfil;
  }
};

// Inatividade: renova sessao a cada interacao
document.addEventListener('click', () => Auth.touchSession());
document.addEventListener('keydown', () => Auth.touchSession());
document.addEventListener('mousemove', () => Auth.touchSession());
