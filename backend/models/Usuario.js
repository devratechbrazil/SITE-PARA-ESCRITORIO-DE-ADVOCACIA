const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: [true, 'Por favor, adicione um nome'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Por favor, adicione um email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, adicione um email válido']
  },
  senha: {
    type: String,
    required: [true, 'Por favor, adicione uma senha'],
    minlength: 6,
    select: false
  },
  telefone: {
    type: String,
    default: ''
  },
  cargo: {
    type: String,
    enum: ['Admin', 'Advogado', 'Secretário', 'Contador'],
    default: 'Advogado'
  },
  escritorioNome: {
    type: String,
    trim: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  dataAtualizacao: {
    type: Date,
    default: Date.now
  }
});

// Hash da senha antes de salvar
UsuarioSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
UsuarioSchema.methods.compararSenha = async function(senhaDigitada) {
  return await bcrypt.compare(senhaDigitada, this.senha);
};

// Remover senha do retorno JSON
UsuarioSchema.methods.toJSON = function() {
  const { senha, ...usuario } = this.toObject();
  return usuario;
};

module.exports = mongoose.model('Usuario', UsuarioSchema);
