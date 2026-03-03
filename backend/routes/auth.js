const express = require('express');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const router = express.Router();

// Middleware de autenticação
const proteger = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id);

    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

// Registro
router.post('/registro', async (req, res) => {
  try {
    const { nome, email, senha, telefone, cargo, escritorioNome } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
    }

    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Email já registrado' });
    }

    const totalUsuarios = await Usuario.countDocuments();
    const cargoEfetivo = totalUsuarios === 0 ? 'Admin' : (cargo || 'Advogado');

    const usuario = await Usuario.create({
      nome,
      email,
      senha,
      telefone: telefone || '',
      cargo: cargoEfetivo,
      escritorioNome: escritorioNome || ''
    });

    const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token,
      usuario: usuario.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const usuario = await Usuario.findOne({ email }).select('+senha');

    if (!usuario) {
      return res.status(401).json({ message: 'Email ou senha incorretos' });
    }

    const senhaValida = await usuario.compararSenha(senha);

    if (!senhaValida) {
      return res.status(401).json({ message: 'Email ou senha incorretos' });
    }

    const existeAdmin = await Usuario.exists({ cargo: 'Admin' });
    if (!existeAdmin) {
      usuario.cargo = 'Admin';
      await usuario.save();
    }

    const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({
      message: 'Login realizado com sucesso',
      token,
      usuario: usuario.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Obter perfil do usuário
router.get('/perfil', proteger, (req, res) => {
  res.json({
    usuario: req.usuario.toJSON()
  });
});

// Atualizar perfil
router.put('/perfil', proteger, async (req, res) => {
  try {
    const { nome, telefone, escritorioNome } = req.body;

    const usuarioAtualizado = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      {
        nome: nome || req.usuario.nome,
        telefone: telefone || req.usuario.telefone,
        escritorioNome: escritorioNome || req.usuario.escritorioNome,
        dataAtualizacao: Date.now()
      },
      { new: true }
    );

    res.json({
      message: 'Perfil atualizado com sucesso',
      usuario: usuarioAtualizado.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = { router, proteger };
