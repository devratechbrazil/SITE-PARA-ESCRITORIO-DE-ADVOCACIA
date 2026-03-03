const express = require('express');
const Documento = require('../models/Documento');
const { proteger } = require('./auth');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

const mapDocumento = (doc) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  return {
    ...plain,
    id: plain._id
  };
};

router.get('/', proteger, async (req, res) => {
  try {
    const filtro = { usuarioId: req.usuario._id };
    if (req.query.clienteId) {
      filtro.clienteId = req.query.clienteId;
    }

    const documentos = await Documento.find(filtro).sort({ criadoEm: -1 });

    res.json({
      total: documentos.length,
      documentos: documentos.map(mapDocumento)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', proteger, async (req, res) => {
  try {
    const { clienteId, tipo, nome, dataUrl, usuario } = req.body;

    if (!clienteId || !nome || !dataUrl) {
      return res.status(400).json({ message: 'clienteId, nome e arquivo sao obrigatorios' });
    }

    const documento = await Documento.create({
      usuarioId: req.usuario._id,
      clienteId,
      tipo: tipo || 'Outro',
      nome,
      dataUrl,
      usuario: usuario || req.usuario.email
    });

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Upload documento',
      detalhe: `${tipo || 'Outro'} - ${nome}`
    });

    res.status(201).json({
      message: 'Documento salvo com sucesso',
      documento: mapDocumento(documento)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', proteger, async (req, res) => {
  try {
    const documento = await Documento.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!documento) {
      return res.status(404).json({ message: 'Documento nao encontrado' });
    }

    await Documento.findByIdAndDelete(req.params.id);

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Excluiu documento',
      detalhe: documento.nome
    });

    res.json({ message: 'Documento excluido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
