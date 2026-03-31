const { Configuracao } = require('../models/Configuracao');

/**
 * Asaas API Utility
 * Integração com a API do Asaas (https://asaas.com)
 */
const Asaas = {
  getHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'SistemaJuridico/1.0'
    };
  },

  getBaseUrl(env) {
    return env === 'production' 
      ? 'https://www.asaas.com/api/v3' 
      : 'https://sandbox.asaas.com/api/v3';
  },

  /**
   * Busca um cliente pelo CPF/CNPJ ou cria se não existir
   */
  async getOrCreateCustomer(config, cliente) {
    const { asaasKey, asaasAmbiente } = config;
    const baseUrl = this.getBaseUrl(asaasAmbiente);
    const headers = this.getHeaders(asaasKey);

    const cpfCnpj = cliente.cpfCnpj.replace(/\D/g, '');

    // 1. Tentar buscar por CPF/CNPJ
    const searchUrl = `${baseUrl}/customers?cpfCnpj=${cpfCnpj}`;
    const searchResp = await fetch(searchUrl, { headers });
    const searchData = await searchResp.json();

    if (searchData.data && searchData.data.length > 0) {
      return searchData.data[0].id;
    }

    // 2. Não encontrou, criar novo
    const createUrl = `${baseUrl}/customers`;
    const payload = {
      name: cliente.nome,
      email: cliente.email,
      phone: cliente.telefone.replace(/\D/g, ''),
      cpfCnpj: cpfCnpj,
      notificationDisabled: false
    };

    const createResp = await fetch(createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const createData = await createResp.json();
    if (!createResp.ok) {
      throw new Error(`Erro Asaas (Cliente): ${createData.errors?.[0]?.description || 'Erro desconhecido'}`);
    }

    return createData.id;
  },

  /**
   * Cria uma nova cobrança no Asaas
   */
  async createCharge(config, customerId, chargeData) {
    const { asaasKey, asaasAmbiente } = config;
    const baseUrl = this.getBaseUrl(asaasAmbiente);
    const headers = this.getHeaders(asaasKey);

    const billingType = {
      'pix': 'PIX',
      'boleto': 'BOLETO',
      'cartao': 'CREDIT_CARD'
    }[chargeData.metodo] || 'UNDEFINED';

    const payload = {
      customer: customerId,
      billingType: billingType,
      value: chargeData.valor,
      dueDate: chargeData.vencimento.toISOString().split('T')[0],
      description: chargeData.descricao || `Cobrança - ${config.nomeEscritorio}`,
      externalReference: chargeData.id.toString(),
      postalService: false
    };

    const resp = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(`Erro Asaas (Cobrança): ${data.errors?.[0]?.description || 'Erro desconhecido'}`);
    }

    // Se for PIX, precisamos buscar o QR Code separadamente
    let pixData = null;
    if (billingType === 'PIX') {
      const pixResp = await fetch(`${baseUrl}/payments/${data.id}/pixQrCode`, { headers });
      pixData = await pixResp.json();
    }

    return {
      asaasId: data.id,
      invoiceUrl: data.invoiceUrl,
      bankSlipUrl: data.bankSlipUrl,
      pixData: pixData
    };
  },

  /**
   * Consulta o status de uma cobrança
   */
  async getPaymentStatus(config, asaasId) {
    const { asaasKey, asaasAmbiente } = config;
    const baseUrl = this.getBaseUrl(asaasAmbiente);
    const headers = this.getHeaders(asaasKey);

    const resp = await fetch(`${baseUrl}/payments/${asaasId}`, { headers });
    const data = await resp.json();
    
    return data;
  }
};

module.exports = Asaas;
