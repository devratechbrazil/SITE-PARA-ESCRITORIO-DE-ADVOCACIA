const express = require('express');
const { proteger } = require('./auth');
const Usuario = require('../models/Usuario');
const Cliente = require('../models/Cliente');
const Caso = require('../models/Caso');
const Financeiro = require('../models/Financeiro');
const Cobranca = require('../models/Cobranca');
const Documento = require('../models/Documento');
const Configuracao = require('../models/Configuracao');
const AuditLog = require('../models/AuditLog');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

const onlyAdmin = (req, res, next) => {
  if (req.usuario?.cargo !== 'Admin') {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }
  return next();
};

const mapWithId = (doc) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain._id
  };
};

router.get('/', proteger, onlyAdmin, async (req, res) => {
  try {
    const [usuarios, clientes, caixa, cobrancas, documentos, config, audit] = await Promise.all([
      Usuario.find().sort({ nome: 1 }),
      Cliente.find({ usuarioId: req.usuario._id }).sort({ dataCriacao: -1 }),
      Financeiro.find({ usuarioId: req.usuario._id }).sort({ data: -1 }),
      Cobranca.find({ usuarioId: req.usuario._id }).sort({ dataCriacao: -1 }),
      Documento.find({ usuarioId: req.usuario._id }).sort({ criadoEm: -1 }),
      Configuracao.findOne({ usuarioId: req.usuario._id }),
      AuditLog.find({ usuarioId: req.usuario._id }).sort({ ts: -1 })
    ]);

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Exportou backup',
      detalhe: 'Gerou arquivo de backup pelo sistema'
    });

    res.json({
      usuarios: usuarios.map(mapWithId),
      clientes: clientes.map(mapWithId),
      caixa: caixa.map(mapWithId),
      cobrancas: cobrancas.map(mapWithId),
      documentos: documentos.map(mapWithId),
      config: config ? mapWithId(config) : {},
      audit: audit.map(mapWithId),
      exportDate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/reset', proteger, onlyAdmin, async (req, res) => {
  try {
    await Promise.all([
      Cliente.deleteMany({ usuarioId: req.usuario._id }),
      Caso.deleteMany({ usuarioId: req.usuario._id }),
      Financeiro.deleteMany({ usuarioId: req.usuario._id }),
      Cobranca.deleteMany({ usuarioId: req.usuario._id }),
      Documento.deleteMany({ usuarioId: req.usuario._id }),
      Configuracao.deleteMany({ usuarioId: req.usuario._id }),
      AuditLog.deleteMany({ usuarioId: req.usuario._id })
    ]);

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Resetou base de dados',
      detalhe: 'Limpou dados do ambiente'
    });

    res.json({ message: 'Dados resetados com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
