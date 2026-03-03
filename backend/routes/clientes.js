const express = require('express');
const Cliente = require('../models/Cliente');
const Documento = require('../models/Documento');
const Cobranca = require('../models/Cobranca');
const Financeiro = require('../models/Financeiro');
const { proteger } = require('./auth');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

const mapCliente = (cliente) => {
  const plain = cliente.toObject ? cliente.toObject() : cliente;
  const cpfCnpj = plain.cpfCnpj || plain.cpf || plain.cnpj || '';

  return {
    ...plain,
    id: plain._id,
    cpfCnpj,
    status: (plain.status || plain.situacao || 'Ativo').toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
    criadoEm: plain.criadoEm || plain.dataCriacao,
    dataAtualizacao: plain.dataAtualizacao,
    rg: plain.rg || '',
    nascimento: plain.nascimento || '',
    obs: plain.obs || '',
    endereco: typeof plain.endereco === 'string' ? plain.endereco : plain.enderecoTexto || ''
  };
};

const fromPayloadToDb = (payload) => {
  const cpfCnpjDigits = String(payload.cpfCnpj || '').replace(/\D/g, '');
  const hasDoc = cpfCnpjDigits.length > 0;
  const isCpf = cpfCnpjDigits.length <= 11;

  const status = payload.status === 'inativo' ? 'Inativo' : 'Ativo';

  return {
    nome: payload.nome,
    email: payload.email || '',
    telefone: payload.telefone || '',
    cpfCnpj: payload.cpfCnpj || '',
    cpf: hasDoc && isCpf ? payload.cpfCnpj : undefined,
    cnpj: hasDoc && !isCpf ? payload.cpfCnpj : undefined,
    tipoCliente: payload.tipoCliente || (!cpfCnpjDigits ? 'Pessoa Fisica' : isCpf ? 'Pessoa Fisica' : 'Pessoa Juridica'),
    endereco: payload.endereco || '',
    enderecoTexto: payload.endereco || '',
    rg: payload.rg || '',
    nascimento: payload.nascimento || '',
    obs: payload.obs || '',
    status: payload.status || 'ativo',
    situacao: status,
    criadoEm: payload.criadoEm || undefined,
    dataAtualizacao: Date.now()
  };
};

// Listar todos os clientes do usuario
router.get('/', proteger, async (req, res) => {
  try {
    const clientes = await Cliente.find({ usuarioId: req.usuario._id }).sort({ dataCriacao: -1 });
    res.json({
      total: clientes.length,
      clientes: clientes.map(mapCliente)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obter um cliente especifico
router.get('/:id', proteger, async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente nao encontrado' });
    }

    res.json({ cliente: mapCliente(cliente) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Criar novo cliente
router.post('/', proteger, async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.nome) {
      return res.status(400).json({ message: 'Nome e obrigatorio' });
    }

    const data = fromPayloadToDb(payload);

    const cliente = await Cliente.create({
      usuarioId: req.usuario._id,
      ...data
    });

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Criou cliente',
      detalhe: payload.nome
    });

    res.status(201).json({
      message: 'Cliente criado com sucesso',
      cliente: mapCliente(cliente)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'CPF/CNPJ ja cadastrado' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Atualizar cliente
router.put('/:id', proteger, async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente nao encontrado' });
    }

    const data = fromPayloadToDb(req.body || {});

    const clienteAtualizado = await Cliente.findByIdAndUpdate(
      req.params.id,
      { ...data, dataAtualizacao: Date.now() },
      { new: true }
    );

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Atualizou cliente',
      detalhe: clienteAtualizado.nome
    });

    res.json({
      message: 'Cliente atualizado com sucesso',
      cliente: mapCliente(clienteAtualizado)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deletar cliente
router.delete('/:id', proteger, async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente nao encontrado' });
    }

    await Cliente.findByIdAndDelete(req.params.id);
    await Documento.deleteMany({ usuarioId: req.usuario._id, clienteId: req.params.id });
    await Cobranca.deleteMany({ usuarioId: req.usuario._id, clienteId: req.params.id });
    await Financeiro.deleteMany({ usuarioId: req.usuario._id, clienteId: req.params.id });

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Excluiu cliente',
      detalhe: cliente.nome
    });

    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
