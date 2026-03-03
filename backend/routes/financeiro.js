const express = require('express');
const Financeiro = require('../models/Financeiro');
const { proteger } = require('./auth');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

const mapLancamento = (lancamento) => {
  const plain = lancamento.toObject ? lancamento.toObject() : lancamento;

  const tipo = plain.tipo === 'Receita' ? 'entrada' : plain.tipo === 'Despesa' ? 'saida' : plain.tipo;
  const status = String(plain.status || 'pendente').toLowerCase();

  return {
    ...plain,
    id: plain._id,
    tipo,
    status,
    data: plain.data || (plain.dataCriacao ? new Date(plain.dataCriacao).toISOString().split('T')[0] : ''),
    formaPagamento: plain.formaPagamento || plain.metodo || ''
  };
};

const toDbTipo = (tipo) => {
  if (tipo === 'entrada') return 'Receita';
  if (tipo === 'saida') return 'Despesa';
  return tipo || 'Receita';
};

// Listar transacoes
router.get('/', proteger, async (req, res) => {
  try {
    const transacoes = await Financeiro.find({ usuarioId: req.usuario._id })
      .populate('clienteId', 'nome')
      .populate('casoId', 'titulo')
      .sort({ dataCriacao: -1 });

    const mapped = transacoes.map(mapLancamento);

    const receita = mapped
      .filter((t) => t.tipo === 'entrada')
      .reduce((sum, t) => sum + Number(t.valor || 0), 0);

    const despesa = mapped
      .filter((t) => t.tipo === 'saida')
      .reduce((sum, t) => sum + Number(t.valor || 0), 0);

    res.json({
      total: mapped.length,
      receita,
      despesa,
      saldo: receita - despesa,
      transacoes: mapped
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obter uma transacao especifica
router.get('/:id', proteger, async (req, res) => {
  try {
    const transacao = await Financeiro.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!transacao) {
      return res.status(404).json({ message: 'Transacao nao encontrada' });
    }

    res.json({ transacao: mapLancamento(transacao) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Criar nova transacao
router.post('/', proteger, async (req, res) => {
  try {
    const {
      tipo,
      descricao,
      valor,
      categoria,
      clienteId,
      casoId,
      data,
      status,
      formaPagamento,
      usuario
    } = req.body;

    if (!tipo || !descricao || !valor) {
      return res.status(400).json({ message: 'tipo, descricao e valor sao obrigatorios' });
    }

    const transacao = await Financeiro.create({
      usuarioId: req.usuario._id,
      tipo: toDbTipo(tipo),
      descricao,
      valor: Number(valor),
      categoria: categoria || 'outros',
      clienteId: clienteId || null,
      casoId: casoId || null,
      data: data || new Date().toISOString().split('T')[0],
      status: status || 'pendente',
      formaPagamento: formaPagamento || '',
      metodo: formaPagamento || '',
      usuario: usuario || req.usuario.email
    });

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: tipo === 'saida' ? 'Registrou saida' : 'Registrou entrada',
      detalhe: descricao
    });

    res.status(201).json({
      message: 'Transacao criada com sucesso',
      transacao: mapLancamento(transacao)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Atualizar transacao
router.put('/:id', proteger, async (req, res) => {
  try {
    const transacao = await Financeiro.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!transacao) {
      return res.status(404).json({ message: 'Transacao nao encontrada' });
    }

    const payload = { ...req.body, dataAtualizacao: Date.now() };

    if (payload.tipo) payload.tipo = toDbTipo(payload.tipo);
    if (payload.valor != null) payload.valor = Number(payload.valor);
    if (payload.formaPagamento && !payload.metodo) payload.metodo = payload.formaPagamento;

    const transacaoAtualizada = await Financeiro.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true }
    );

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Atualizou transacao',
      detalhe: String(req.params.id)
    });

    res.json({
      message: 'Transacao atualizada com sucesso',
      transacao: mapLancamento(transacaoAtualizada)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deletar transacao
router.delete('/:id', proteger, async (req, res) => {
  try {
    const transacao = await Financeiro.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!transacao) {
      return res.status(404).json({ message: 'Transacao nao encontrada' });
    }

    await Financeiro.findByIdAndDelete(req.params.id);

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Excluiu transacao',
      detalhe: String(req.params.id)
    });

    res.json({ message: 'Transacao deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
