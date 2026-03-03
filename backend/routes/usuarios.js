const express = require('express');
const Usuario = require('../models/Usuario');
const { proteger } = require('./auth');
const { registrarLog } = require('../utils/audit');

const router = express.Router();

const onlyAdmin = (req, res, next) => {
  if (req.usuario?.cargo !== 'Admin') {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }
  return next();
};

const mapUsuario = (usuario) => {
  const plain = usuario.toObject ? usuario.toObject() : usuario;
  const { senha, ...safe } = plain;
  return {
    ...safe,
    id: safe._id
  };
};

router.get('/', proteger, onlyAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().sort({ nome: 1 });
    res.json({
      total: usuarios.length,
      usuarios: usuarios.map(mapUsuario)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', proteger, onlyAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario nao encontrado' });
    }

    res.json({ usuario: mapUsuario(usuario) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', proteger, onlyAdmin, async (req, res) => {
  try {
    const { nome, email, senha, cargo, ativo, telefone, escritorioNome } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: 'Nome, email e senha sao obrigatorios' });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ message: 'Email ja cadastrado' });
    }

    const usuario = await Usuario.create({
      nome,
      email,
      senha,
      cargo: cargo || 'Advogado',
      ativo: ativo !== false,
      telefone: telefone || '',
      escritorioNome: escritorioNome || req.usuario.escritorioNome || ''
    });

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Criou usuario',
      detalhe: email
    });

    res.status(201).json({
      message: 'Usuario criado com sucesso',
      usuario: mapUsuario(usuario)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', proteger, onlyAdmin, async (req, res) => {
  try {
    const { nome, email, senha, cargo, ativo, telefone, escritorioNome } = req.body;

    const usuario = await Usuario.findById(req.params.id).select('+senha');

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario nao encontrado' });
    }

    if (email && email !== usuario.email) {
      const existe = await Usuario.findOne({ email });
      if (existe) {
        return res.status(400).json({ message: 'Email ja cadastrado' });
      }
    }

    usuario.nome = nome || usuario.nome;
    usuario.email = email || usuario.email;
    usuario.cargo = cargo || usuario.cargo;
    usuario.ativo = typeof ativo === 'boolean' ? ativo : usuario.ativo;
    usuario.telefone = typeof telefone === 'string' ? telefone : usuario.telefone;
    usuario.escritorioNome = typeof escritorioNome === 'string' ? escritorioNome : usuario.escritorioNome;
    usuario.dataAtualizacao = Date.now();

    if (senha) {
      usuario.senha = senha;
    }

    await usuario.save();

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Editou usuario',
      detalhe: usuario.email
    });

    res.json({
      message: 'Usuario atualizado com sucesso',
      usuario: mapUsuario(usuario)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', proteger, onlyAdmin, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.usuario._id)) {
      return res.status(400).json({ message: 'Voce nao pode excluir o proprio usuario' });
    }

    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario nao encontrado' });
    }

    if (usuario.email === 'admin@escritorio.com') {
      return res.status(400).json({ message: 'Usuario admin padrao nao pode ser excluido' });
    }

    await Usuario.findByIdAndDelete(req.params.id);

    await registrarLog({
      usuarioId: req.usuario._id,
      usuario: req.usuario.email,
      acao: 'Excluiu usuario',
      detalhe: usuario.email
    });

    res.json({ message: 'Usuario excluido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
