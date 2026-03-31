const express = require('express');
const Cobranca = require('../models/Cobranca');
const Financeiro = require('../models/Financeiro');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

/**
 * Webhook do Asaas
 * Recebe notificações de alteração de status de cobranças
 */
router.post('/asaas', async (req, res) => {
  try {
    const { event, payment } = req.body;

    console.log(`[Webhook Asaas] Evento: ${event}, ID: ${payment.id}`);

    // Só interessam eventos de confirmação de pagamento
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const cobranca = await Cobranca.findOne({ 
        $or: [
          { 'gateway.asaasId': payment.id },
          { _id: payment.externalReference }
        ]
      });

      if (cobranca && cobranca.status !== 'pago') {
        cobranca.status = 'pago';
        cobranca.paidAt = payment.confirmedDate || new Date();
        await cobranca.save();

        // 1. Adicionar ao fluxo de caixa (Financeiro)
        await Financeiro.create({
          usuarioId: cobranca.usuarioId,
          tipo: 'entrada',
          descricao: `Recebimento: ${cobranca.descricao || 'Cobrança Asaas'}`,
          valor: cobranca.valor,
          categoria: 'honorarios',
          clienteId: cobranca.clienteId,
          data: new Date(),
          status: 'pago',
          formaPagamento: cobranca.metodo,
          usuario: 'Sistema (Asaas)'
        });

        // 2. Registrar log
        await registrarLog({
          usuarioId: cobranca.usuarioId,
          usuario: 'sistema',
          acao: 'Pagamento Confirmado (Asaas)',
          detalhe: `Cobrança ${cobranca._id} paga via ${payment.billingType}`
        });

        console.log(`[Webhook Asaas] Cobranca ${cobranca._id} atualizada para PAGO.`);
      }
    }

    // Sempre retornar 200 para o Asaas não reenviar
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook Asaas] Erro:', error.message);
    res.status(500).json({ message: 'Erro interno' });
  }
});

module.exports = router;
