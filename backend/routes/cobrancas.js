const express = require('express');
const Cobranca = require('../models/Cobranca');
const { proteger } = require('./auth');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const mapCobranca = (cobranca) => {
  const plain = cobranca.toObject ? cobranca.toObject() : cobranca;
  return {
    ...plain,
    id: plain._id
  };
};

router.get('/', proteger, async (req, res) => {
  try {
    const cobrancas = await Cobranca.find({ usuarioId: req.usuario._id })
      .populate('clienteId', 'nome email telefone')
      .sort({ dataCriacao: -1 });

    res.json({
      total: cobrancas.length,
      cobrancas: cobrancas.map(mapCobranca)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', proteger, async (req, res) => {
  try {
    const cobranca = await Cobranca.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    }).populate('clienteId', 'nome email telefone');

    if (!cobranca) {
      return res.status(404).json({ message: 'Cobranca nao encontrada' });
    }

    res.json({ cobranca: mapCobranca(cobranca) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', proteger, async (req, res) => {
  try {
    const {
      clienteId,
      valor,
      vencimento,
      metodo,
      descricao,
      status,
      gateway,
      usuario,
      paidAt
    } = req.body;

    if (!clienteId || !valor || !vencimento) {
      return res.status(400).json({ message: 'clienteId, valor e vencimento sao obrigatorios' });
    }

    const cobranca = await Cobranca.create({
      usuarioId: req.usuario._id,
      clienteId,
      valor: Number(valor),
      vencimento: normalizeDate(vencimento),
      metodo: metodo || 'manual',
      descricao: descricao || '',
      status: status || 'pendente',
      gateway: gateway || null,
      usuario: usuario || req.usuario.email,
      paidAt: normalizeDate(paidAt)
    });

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Criou cobranca',
      detalhe: `${cobranca._id} - ${Number(cobranca.valor).toFixed(2)}`
    });

    res.status(201).json({
      message: 'Cobranca criada com sucesso',
      cobranca: mapCobranca(cobranca)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', proteger, async (req, res) => {
  try {
    const cobranca = await Cobranca.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!cobranca) {
      return res.status(404).json({ message: 'Cobranca nao encontrada' });
    }

    const payload = { ...req.body, dataAtualizacao: Date.now() };

    if (payload.valor != null) payload.valor = Number(payload.valor);
    if (payload.vencimento) payload.vencimento = normalizeDate(payload.vencimento);
    if (payload.paidAt) payload.paidAt = normalizeDate(payload.paidAt);
    if (payload.usuario == null) payload.usuario = req.usuario.email;

    const cobrancaAtualizada = await Cobranca.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true }
    );

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Atualizou cobranca',
      detalhe: String(req.params.id)
    });

    res.json({
      message: 'Cobranca atualizada com sucesso',
      cobranca: mapCobranca(cobrancaAtualizada)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', proteger, async (req, res) => {
  try {
    const cobranca = await Cobranca.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!cobranca) {
      return res.status(404).json({ message: 'Cobranca nao encontrada' });
    }

    await Cobranca.findByIdAndDelete(req.params.id);

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Excluiu cobranca',
      detalhe: String(req.params.id)
    });

    res.json({ message: 'Cobranca excluida com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
