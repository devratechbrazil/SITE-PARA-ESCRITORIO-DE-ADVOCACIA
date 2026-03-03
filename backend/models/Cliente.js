const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  nome: {
    type: String,
    required: [true, 'Por favor, adicione um nome do cliente'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    default: ''
  },
  telefone: {
    type: String,
    default: ''
  },
  cpfCnpj: {
    type: String,
    default: ''
  },
  cpf: {
    type: String,
    unique: true,
    sparse: true
  },
  cnpj: {
    type: String,
    unique: true,
    sparse: true
  },
  tipoCliente: {
    type: String,
    enum: ['Pessoa Fisica', 'Pessoa Juridica', 'Pessoa Física', 'Pessoa Jurídica'],
    default: 'Pessoa Fisica'
  },
  rg: {
    type: String,
    default: ''
  },
  nascimento: {
    type: String,
    default: ''
  },
  endereco: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  enderecoTexto: {
    type: String,
    default: ''
  },
  obs: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['ativo', 'inativo'],
    default: 'ativo'
  },
  situacao: {
    type: String,
    enum: ['Ativo', 'Inativo', 'Arquivado'],
    default: 'Ativo'
  },
  criadoEm: {
    type: Date,
    default: Date.now
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

module.exports = mongoose.model('Cliente', ClienteSchema);
