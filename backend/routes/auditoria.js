const express = require('express');
const AuditLog = require('../models/AuditLog');
const { proteger } = require('./auth');

const router = express.Router();

const mapLog = (log) => {
  const plain = log.toObject ? log.toObject() : log;
  return {
    ...plain,
    id: plain._id
  };
};

router.get('/', proteger, async (req, res) => {
  try {
    const query = req.usuario?.cargo === 'Admin' ? {} : { usuarioId: req.usuario._id };
    const logs = await AuditLog.find(query).sort({ ts: -1 }).limit(1000);

    res.json({
      total: logs.length,
      logs: logs.map(mapLog)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', proteger, async (req, res) => {
  try {
    const { acao, detalhe, usuario } = req.body;

    if (!acao) {
      return res.status(400).json({ message: 'Acao e obrigatoria' });
    }

    const log = await AuditLog.create({
      usuarioId: req.usuario._id,
      usuario: usuario || req.usuario.email,
      acao,
      detalhe: detalhe || ''
    });

    res.status(201).json({
      message: 'Log registrado',
      log: mapLog(log)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
