/**
 * API Helper - Integracao com Backend
 * Armazena token no localStorage e faz requisicoes autenticadas
 */

const TOKEN_KEY = 'token_jwt';
const LEGACY_TOKEN_KEY = 'token';

// ============================================================
// CONFIGURACAO DE PRODUCAO - ALTERE A URL ABAIXO APOS O DEPLOY
// ============================================================
// Depois de fazer deploy no Render, substitua a URL abaixo pela
// URL real do seu servico. Exemplo:
// const RENDER_BACKEND_URL = 'https://sistema-juridico-xxxx.onrender.com/api';
const RENDER_BACKEND_URL = ''; // << COLE A URL DO RENDER AQUI (com /api no final)

function resolveApiUrl() {
  // 1) Se foi definida manualmente via script, usar essa
  if (window.__API_URL__) {
    return window.__API_URL__;
  }

  // 2) Se estamos em producao (Vercel, GitHub Pages, etc.), usar backend do Render
  const host = window.location.hostname || '';
  const isProduction = host.includes('.vercel.app')
    || host.includes('.github.io')
    || host.includes('.netlify.app')
    || (host !== 'localhost' && host !== '127.0.0.1' && !host.match(/^192\.168\./));

  if (isProduction && RENDER_BACKEND_URL) {
    return RENDER_BACKEND_URL;
  }

  // 3) Fallback: desenvolvimento local na porta 5000
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000/api`;
}

const API_URL = resolveApiUrl();
console.log('[API] URL do backend:', API_URL);

class API {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);

    if (this.token && !localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, this.token);
    }
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      const contentType = response.headers.get('content-type') || '';
      let data = {};

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.removeToken();
          window.location.href = 'login.html';
        }
        throw new Error(data.message || 'Erro na requisicao');
      }

      return data;
    } catch (error) {
      console.error('Erro API:', error);
      throw error;
    }
  }

  // ===== AUTENTICACAO =====
  async registro(nome, email, senha, telefone = '', cargo = 'Advogado') {
    const data = await this.request('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha, telefone, cargo })
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async login(email, senha) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async perfil() {
    return this.request('/auth/perfil');
  }

  async atualizarPerfil(nome, telefone, escritorioNome) {
    return this.request('/auth/perfil', {
      method: 'PUT',
      body: JSON.stringify({ nome, telefone, escritorioNome })
    });
  }

  // ===== CLIENTES =====
  async listarClientes() {
    return this.request('/clientes');
  }

  async obterCliente(id) {
    return this.request(`/clientes/${id}`);
  }

  async criarCliente(dados) {
    return this.request('/clientes', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarCliente(id, dados) {
    return this.request(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async deletarCliente(id) {
    return this.request(`/clientes/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== CASOS =====
  async listarCasos() {
    return this.request('/casos');
  }

  async obterCaso(id) {
    return this.request(`/casos/${id}`);
  }

  async criarCaso(dados) {
    return this.request('/casos', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarCaso(id, dados) {
    return this.request(`/casos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async deletarCaso(id) {
    return this.request(`/casos/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== FINANCEIRO =====
  async listarTransacoes() {
    return this.request('/financeiro');
  }

  async obterTransacao(id) {
    return this.request(`/financeiro/${id}`);
  }

  async criarTransacao(dados) {
    return this.request('/financeiro', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarTransacao(id, dados) {
    return this.request(`/financeiro/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async deletarTransacao(id) {
    return this.request(`/financeiro/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== USUARIOS =====
  async listarUsuarios() {
    return this.request('/usuarios');
  }

  async criarUsuario(dados) {
    return this.request('/usuarios', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarUsuario(id, dados) {
    return this.request(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async deletarUsuario(id) {
    return this.request(`/usuarios/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== COBRANCAS =====
  async listarCobrancas() {
    return this.request('/cobrancas');
  }

  async obterCobranca(id) {
    return this.request(`/cobrancas/${id}`);
  }

  async criarCobranca(dados) {
    return this.request('/cobrancas', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async atualizarCobranca(id, dados) {
    return this.request(`/cobrancas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  async deletarCobranca(id) {
    return this.request(`/cobrancas/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== DOCUMENTOS =====
  async listarDocumentos(clienteId = '') {
    const query = clienteId ? `?clienteId=${encodeURIComponent(clienteId)}` : '';
    return this.request(`/documentos${query}`);
  }

  async criarDocumento(dados) {
    return this.request('/documentos', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  async deletarDocumento(id) {
    return this.request(`/documentos/${id}`, {
      method: 'DELETE'
    });
  }

  // ===== CONFIGURACOES =====
  async obterConfiguracoes() {
    return this.request('/configuracoes');
  }

  async salvarConfiguracoes(dados) {
    return this.request('/configuracoes', {
      method: 'PUT',
      body: JSON.stringify(dados)
    });
  }

  // ===== AUDITORIA =====
  async listarLogs() {
    return this.request('/auditoria');
  }

  async criarLog(dados) {
    return this.request('/auditoria', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
  }

  // ===== BACKUP =====
  async exportarBackup() {
    return this.request('/backup');
  }

  async resetarDados() {
    return this.request('/backup/reset', {
      method: 'DELETE'
    });
  }

  logout() {
    this.removeToken();
  }
}

const api = new API();
