/**
 * AUTH API - Autenticacao com backend
 */

const Auth = {
  SESSION_KEY: 'usuario_atual',
  TOKEN_KEY: 'token_jwt',
  LEGACY_TOKEN_KEY: 'token',
  LEGACY_UI_SESSION_KEY: 'adv_session',

  mapCargoToPerfil(cargo = '') {
    const value = String(cargo).toLowerCase();
    if (value === 'admin') return 'admin';
    if (value === 'contador' || value === 'financeiro') return 'financeiro';
    return 'advogado';
  },

  normalizeUser(usuario) {
    if (!usuario || typeof usuario !== 'object') return null;

    const perfil = (usuario.perfil || '').toLowerCase() || this.mapCargoToPerfil(usuario.cargo);

    return {
      ...usuario,
      id: usuario.id || usuario._id || null,
      perfil,
      cargo: usuario.cargo || (perfil === 'admin' ? 'Admin' : perfil === 'financeiro' ? 'Financeiro' : 'Advogado')
    };
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.LEGACY_TOKEN_KEY);
  },

  persistAuth(usuario, token = null) {
    const normalizedUser = this.normalizeUser(usuario);
    if (!normalizedUser) return null;

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(normalizedUser));
    sessionStorage.setItem(this.LEGACY_UI_SESSION_KEY, JSON.stringify({ user: normalizedUser, ts: Date.now() }));

    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.LEGACY_TOKEN_KEY, token);
    }

    return normalizedUser;
  },

  clearAuth() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(this.LEGACY_UI_SESSION_KEY);
  },

  // Verificar se esta logado
  isLoggedIn() {
    return !!this.getToken();
  },

  // Obter usuario atual
  currentUser() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.SESSION_KEY));
      return this.normalizeUser(raw);
    } catch {
      return null;
    }
  },

  guard() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  // Fazer login
  async login(email, senha) {
    try {
      const result = await api.login(email, senha);
      const user = this.persistAuth(result.usuario, result.token);
      return { ok: true, user };
    } catch (error) {
      return { ok: false, msg: error.message };
    }
  },

  // Fazer registro
  async registro(nome, email, senha, telefone = '', cargo = 'Advogado') {
    try {
      const result = await api.registro(nome, email, senha, telefone, cargo);
      const user = this.persistAuth(result.usuario, result.token);
      return { ok: true, user };
    } catch (error) {
      return { ok: false, msg: error.message };
    }
  },

  // Logout
  logout() {
    this.clearAuth();
    if (typeof api !== 'undefined' && typeof api.logout === 'function') {
      api.logout();
    }
    window.location.href = 'login.html';
  },

  // Verificar se token e valido
  async verificarToken() {
    try {
      const result = await api.perfil();
      this.persistAuth(result.usuario);
      return true;
    } catch {
      this.logout();
      return false;
    }
  },

  // Atualizar perfil
  async atualizarPerfil(nome, telefone, escritorioNome) {
    try {
      const result = await api.atualizarPerfil(nome, telefone, escritorioNome);
      const user = this.persistAuth(result.usuario);
      return { ok: true, user };
    } catch (error) {
      return { ok: false, msg: error.message };
    }
  }
};

// Controle de acesso basico ao carregar paginas
document.addEventListener('DOMContentLoaded', () => {
  const caminhoPublico = ['login.html', 'index.html'];
  const pagina = window.location.pathname.split('/').pop() || 'index.html';

  if (!caminhoPublico.includes(pagina) && !Auth.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  if (caminhoPublico.includes(pagina) && Auth.isLoggedIn()) {
    window.location.href = 'dashboard.html';
  }
});
