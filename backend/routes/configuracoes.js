const express = require('express');
const Configuracao = require('../models/Configuracao');
const { proteger } = require('./auth');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

const DEFAULT_CONFIG = {
  nomeEscritorio: 'Escritorio de Advocacia',
  cnpj: '',
  endereco: '',
  telefone: '',
  email: '',
  asaasKey: '',
  asaasAmbiente: 'sandbox'
};

const mapConfig = (config) => {
  if (!config) {
    return { ...DEFAULT_CONFIG };
  }

  const plain = config.toObject ? config.toObject() : config;
  return {
    ...DEFAULT_CONFIG,
    ...plain,
    id: plain._id
  };
};

router.get('/', proteger, async (req, res) => {
  try {
    const config = await Configuracao.findOne({ usuarioId: req.usuario._id });
    res.json({ configuracao: mapConfig(config) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/', proteger, async (req, res) => {
  try {
    const payload = {
      ...DEFAULT_CONFIG,
      ...req.body,
      dataAtualizacao: Date.now()
    };

    const config = await Configuracao.findOneAndUpdate(
      { usuarioId: req.usuario._id },
      payload,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Atualizou configuracoes',
      detalhe: 'Dados do escritorio e integracoes'
    });

    res.json({
      message: 'Configuracoes salvas com sucesso',
      configuracao: mapConfig(config)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
