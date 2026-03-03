/* ===================================================
   DB.JS - Cache local conectado a API (sem localStorage como fonte principal)
   =================================================== */

const DB = {
  _loaded: false,
  _loadingPromise: null,

  _state: {
    usuarios: [],
    clientes: [],
    documentos: [],
    caixa: [],
    cobrancas: [],
    config: {},
    auditlogs: []
  },

  _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  _clone(val) {
    return JSON.parse(JSON.stringify(val));
  },

  _cargoToPerfil(cargo = '') {
    const c = String(cargo).toLowerCase();
    if (c === 'admin') return 'admin';
    if (c === 'contador' || c === 'financeiro') return 'financeiro';
    return 'advogado';
  },

  _perfilToCargo(perfil = '') {
    const p = String(perfil).toLowerCase();
    if (p === 'admin') return 'Admin';
    if (p === 'financeiro') return 'Contador';
    return 'Advogado';
  },

  _normUsuario(u) {
    if (!u) return null;
    return {
      ...u,
      id: u.id || u._id,
      perfil: u.perfil || this._cargoToPerfil(u.cargo),
      criadoEm: u.criadoEm || u.dataCriacao || u.createdAt || new Date().toISOString(),
      ativo: typeof u.ativo === 'boolean' ? u.ativo : true
    };
  },

  _normCliente(c) {
    if (!c) return null;
    return {
      ...c,
      id: c.id || c._id,
      status: c.status || (String(c.situacao || '').toLowerCase() === 'inativo' ? 'inativo' : 'ativo'),
      criadoEm: c.criadoEm || c.dataCriacao || c.createdAt || new Date().toISOString(),
      cpfCnpj: c.cpfCnpj || c.cpf || c.cnpj || '',
      endereco: typeof c.endereco === 'string' ? c.endereco : c.enderecoTexto || '',
      rg: c.rg || '',
      nascimento: c.nascimento || '',
      obs: c.obs || ''
    };
  },

  _normDocumento(d) {
    if (!d) return null;
    return {
      ...d,
      id: d.id || d._id,
      clienteId: d.clienteId?._id || d.clienteId,
      criadoEm: d.criadoEm || d.createdAt || new Date().toISOString()
    };
  },

  _normLancamento(l) {
    if (!l) return null;
    const data = l.data ? String(l.data).split('T')[0] : new Date().toISOString().split('T')[0];
    return {
      ...l,
      id: l.id || l._id,
      clienteId: l.clienteId?._id || l.clienteId || null,
      tipo: l.tipo === 'Receita' ? 'entrada' : l.tipo === 'Despesa' ? 'saida' : l.tipo,
      status: String(l.status || 'pendente').toLowerCase(),
      data,
      formaPagamento: l.formaPagamento || l.metodo || ''
    };
  },

  _normCobranca(c) {
    if (!c) return null;
    const vencimento = c.vencimento ? String(c.vencimento).split('T')[0] : '';
    return {
      ...c,
      id: c.id || c._id,
      clienteId: c.clienteId?._id || c.clienteId,
      vencimento,
      status: String(c.status || 'pendente').toLowerCase(),
      criadoEm: c.criadoEm || c.dataCriacao || c.createdAt || new Date().toISOString()
    };
  },

  _normConfig(cfg) {
    return {
      nomeEscritorio: cfg?.nomeEscritorio || 'Escritorio de Advocacia',
      cnpj: cfg?.cnpj || '',
      endereco: cfg?.endereco || '',
      telefone: cfg?.telefone || '',
      email: cfg?.email || '',
      asaasKey: cfg?.asaasKey || '',
      asaasAmbiente: cfg?.asaasAmbiente || 'sandbox'
    };
  },

  _normLog(log) {
    if (!log) return null;
    return {
      ...log,
      id: log.id || log._id,
      ts: log.ts || log.createdAt || new Date().toISOString(),
      usuario: log.usuario || 'sistema'
    };
  },

  _replaceIn(listName, item) {
    const list = this._state[listName];
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    return item;
  },

  _removeFrom(listName, id) {
    this._state[listName] = this._state[listName].filter((x) => x.id !== id);
  },

  async init(force = false) {
    if (this._loaded && !force) return;
    if (this._loadingPromise && !force) return this._loadingPromise;

    if (typeof api === 'undefined') {
      throw new Error('API nao inicializada. Inclua js/api.js antes de js/db.js');
    }

    this._loadingPromise = (async () => {
      const canLoadUsers = typeof Auth !== 'undefined' && typeof Auth.can === 'function' ? Auth.can('usuarios') : false;
      const usersRequest = canLoadUsers ? api.listarUsuarios() : Promise.resolve({ usuarios: [] });

      const [usuarios, clientes, documentos, financeiro, cobrancas, config, logs] = await Promise.allSettled([
        usersRequest,
        api.listarClientes(),
        api.listarDocumentos(),
        api.listarTransacoes(),
        api.listarCobrancas(),
        api.obterConfiguracoes(),
        api.listarLogs()
      ]);

      this._state.usuarios = usuarios.status === 'fulfilled'
        ? (usuarios.value.usuarios || []).map((u) => this._normUsuario(u))
        : [];

      this._state.clientes = clientes.status === 'fulfilled'
        ? (clientes.value.clientes || []).map((c) => this._normCliente(c))
        : [];

      this._state.documentos = documentos.status === 'fulfilled'
        ? (documentos.value.documentos || []).map((d) => this._normDocumento(d))
        : [];

      this._state.caixa = financeiro.status === 'fulfilled'
        ? (financeiro.value.transacoes || []).map((l) => this._normLancamento(l))
        : [];

      this._state.cobrancas = cobrancas.status === 'fulfilled'
        ? (cobrancas.value.cobrancas || []).map((c) => this._normCobranca(c))
        : [];

      this._state.config = config.status === 'fulfilled'
        ? this._normConfig(config.value.configuracao)
        : this._normConfig({});

      this._state.auditlogs = logs.status === 'fulfilled'
        ? (logs.value.logs || []).map((l) => this._normLog(l))
        : [];

      this._loaded = true;
      this._loadingPromise = null;
    })();

    return this._loadingPromise;
  },

  async refresh() {
    return this.init(true);
  },

  // ---------- compatibilidade legacy ----------
  _get(key) {
    if (key === 'config') return this._clone(this._state.config);
    return this._clone(this._state[key] || []);
  },

  _set(key, val) {
    if (key === 'config') this._state.config = this._clone(val || {});
    else this._state[key] = this._clone(Array.isArray(val) ? val : []);
  },

  // ---------- USUARIOS ----------
  getUsuarios() {
    return this._clone(this._state.usuarios);
  },

  findUsuario(email) {
    const e = String(email || '').toLowerCase();
    return this.getUsuarios().find((u) => String(u.email || '').toLowerCase() === e);
  },

  async saveUsuario(u) {
    const payload = {
      nome: u.nome,
      email: String(u.email || '').toLowerCase(),
      cargo: this._perfilToCargo(u.perfil || u.cargo),
      ativo: !!u.ativo,
      telefone: u.telefone || '',
      senha: u.senha || undefined
    };

    let saved;
    if (u.id) {
      const resp = await api.atualizarUsuario(u.id, payload);
      saved = this._normUsuario(resp.usuario);
    } else {
      const resp = await api.criarUsuario(payload);
      saved = this._normUsuario(resp.usuario);
    }

    this._replaceIn('usuarios', saved);
    return this._clone(saved);
  },

  async deleteUsuario(id) {
    await api.deletarUsuario(id);
    this._removeFrom('usuarios', id);
  },

  // ---------- CLIENTES ----------
  getClientes() {
    return this._clone(this._state.clientes);
  },

  getCliente(id) {
    return this.getClientes().find((c) => c.id === id);
  },

  async saveCliente(c) {
    const payload = {
      nome: c.nome,
      email: c.email || '',
      telefone: c.telefone || '',
      cpfCnpj: c.cpfCnpj || '',
      rg: c.rg || '',
      nascimento: c.nascimento || '',
      endereco: c.endereco || '',
      obs: c.obs || '',
      status: c.status || 'ativo',
      criadoEm: c.criadoEm || undefined
    };

    let saved;
    if (c.id) {
      const resp = await api.atualizarCliente(c.id, payload);
      saved = this._normCliente(resp.cliente);
    } else {
      const resp = await api.criarCliente(payload);
      saved = this._normCliente(resp.cliente);
    }

    this._replaceIn('clientes', saved);
    return this._clone(saved);
  },

  async deleteCliente(id) {
    await api.deletarCliente(id);
    this._removeFrom('clientes', id);

    // limpeza local de documentos vinculados
    this._state.documentos = this._state.documentos.filter((d) => d.clienteId !== id);
  },

  // ---------- DOCUMENTOS ----------
  getDocumentos(clienteId) {
    return this.getAllDocumentos().filter((d) => d.clienteId === clienteId);
  },

  getAllDocumentos() {
    return this._clone(this._state.documentos);
  },

  async saveDocumento(d) {
    const payload = {
      clienteId: d.clienteId,
      tipo: d.tipo || 'Outro',
      nome: d.nome,
      dataUrl: d.dataUrl,
      usuario: d.usuario || Auth.currentUser()?.email || ''
    };

    const resp = await api.criarDocumento(payload);
    const saved = this._normDocumento(resp.documento);
    this._replaceIn('documentos', saved);
    return this._clone(saved);
  },

  async deleteDocumento(id) {
    await api.deletarDocumento(id);
    this._removeFrom('documentos', id);
  },

  // ---------- FINANCEIRO (CAIXA) ----------
  getCaixa() {
    return this._clone(this._state.caixa);
  },

  async saveLancamento(l) {
    const payload = {
      tipo: l.tipo,
      descricao: l.descricao,
      valor: Number(l.valor),
      categoria: l.categoria || 'outros',
      clienteId: l.clienteId || null,
      data: l.data || new Date().toISOString().split('T')[0],
      status: l.status || 'pendente',
      formaPagamento: l.formaPagamento || '',
      usuario: l.usuario || Auth.currentUser()?.email || ''
    };

    let saved;
    if (l.id) {
      const resp = await api.atualizarTransacao(l.id, payload);
      saved = this._normLancamento(resp.transacao);
    } else {
      const resp = await api.criarTransacao(payload);
      saved = this._normLancamento(resp.transacao);
    }

    this._replaceIn('caixa', saved);
    return this._clone(saved);
  },

  async deleteLancamento(id) {
    await api.deletarTransacao(id);
    this._removeFrom('caixa', id);
  },

  // ---------- COBRANCAS ----------
  getCobrancas() {
    return this._clone(this._state.cobrancas);
  },

  getCobranca(id) {
    return this.getCobrancas().find((c) => c.id === id);
  },

  async saveCobranca(c) {
    const payload = {
      clienteId: c.clienteId,
      valor: Number(c.valor),
      vencimento: c.vencimento,
      metodo: c.metodo || 'manual',
      descricao: c.descricao || '',
      status: c.status || 'pendente',
      gateway: c.gateway || null,
      paidAt: c.paidAt || null,
      usuario: c.usuario || Auth.currentUser()?.email || ''
    };

    let saved;
    if (c.id) {
      const resp = await api.atualizarCobranca(c.id, payload);
      saved = this._normCobranca(resp.cobranca);
    } else {
      const resp = await api.criarCobranca(payload);
      saved = this._normCobranca(resp.cobranca);
    }

    this._replaceIn('cobrancas', saved);
    return this._clone(saved);
  },

  async deleteCobranca(id) {
    await api.deletarCobranca(id);
    this._removeFrom('cobrancas', id);
  },

  // ---------- CONFIG ----------
  getConfig() {
    return this._clone(this._state.config);
  },

  async saveConfig(cfg) {
    const resp = await api.salvarConfiguracoes(cfg);
    this._state.config = this._normConfig(resp.configuracao);
    return this.getConfig();
  },

  // ---------- AUDIT ----------
  getLogs() {
    return this._clone(this._state.auditlogs);
  },

  async addLog(log) {
    const payload = {
      usuario: log.usuario || Auth.currentUser()?.email || 'sistema',
      acao: log.acao,
      detalhe: log.detalhe || ''
    };

    const temp = this._normLog({ ...payload, id: this._id(), ts: new Date().toISOString() });
    this._state.auditlogs.unshift(temp);
    if (this._state.auditlogs.length > 1000) this._state.auditlogs.splice(1000);

    try {
      const resp = await api.criarLog(payload);
      const saved = this._normLog(resp.log);
      this._replaceIn('auditlogs', saved);
      return this._clone(saved);
    } catch (error) {
      console.warn('Falha ao sincronizar log de auditoria:', error.message);
      return this._clone(temp);
    }
  },

  async exportBackup() {
    return api.exportarBackup();
  },

  async resetData() {
    await api.resetarDados();
    this._state = {
      usuarios: [],
      clientes: [],
      documentos: [],
      caixa: [],
      cobrancas: [],
      config: {},
      auditlogs: []
    };
    this._loaded = false;
  },

  async seed() {
    return this.init();
  }
};
