const express = require('express');
const Caso = require('../models/Caso');
const { proteger } = require('./auth');

const router = express.Router();

// Listar todos os casos
router.get('/', proteger, async (req, res) => {
  try {
    const casos = await Caso.find({ usuarioId: req.usuario._id })
      .populate('clienteId', 'nome email')
      .sort({ dataCriacao: -1 });

    res.json({
      total: casos.length,
      casos
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obter um caso específico
router.get('/:id', proteger, async (req, res) => {
  try {
    const caso = await Caso.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    }).populate('clienteId');

    if (!caso) {
      return res.status(404).json({ message: 'Caso não encontrado' });
    }

    res.json(caso);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Criar novo caso
router.post('/', proteger, async (req, res) => {
  try {
    const { numeroProcesso, titulo, clienteId, tipoProcesso, descricao, valor } = req.body;

    if (!numeroProcesso || !titulo || !clienteId || !tipoProcesso) {
      return res.status(400).json({ message: 'Preencha os campos obrigatórios' });
    }

    const caso = await Caso.create({
      usuarioId: req.usuario._id,
      numeroProcesso,
      titulo,
      clienteId,
      tipoProcesso,
      descricao: descricao || '',
      valor: valor || 0
    });

    res.status(201).json({
      message: 'Caso criado com sucesso',
      caso
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Número de processo já existe' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Atualizar caso
router.put('/:id', proteger, async (req, res) => {
  try {
    const caso = await Caso.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!caso) {
      return res.status(404).json({ message: 'Caso não encontrado' });
    }

    const casoAtualizado = await Caso.findByIdAndUpdate(
      req.params.id,
      { ...req.body, dataAtualizacao: Date.now() },
      { new: true }
    );

    res.json({
      message: 'Caso atualizado com sucesso',
      caso: casoAtualizado
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deletar caso
router.delete('/:id', proteger, async (req, res) => {
  try {
    const caso = await Caso.findOne({
      _id: req.params.id,
      usuarioId: req.usuario._id
    });

    if (!caso) {
      return res.status(404).json({ message: 'Caso não encontrado' });
    }

    await Caso.findByIdAndDelete(req.params.id);

    res.json({ message: 'Caso deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
