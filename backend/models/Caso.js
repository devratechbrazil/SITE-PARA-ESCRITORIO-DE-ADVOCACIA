const mongoose = require('mongoose');

const CasoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  numeroProcesso: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  descricao: {
    type: String,
    default: ''
  },
  tipoProcesso: {
    type: String,
    enum: ['Civil', 'Penal', 'Trabalhista', 'Administrativo', 'Outro'],
    required: true
  },
  status: {
    type: String,
    enum: ['Aberto', 'Em Andamento', 'Resolvido', 'Arquivado'],
    default: 'Aberto'
  },
  prioridade: {
    type: String,
    enum: ['Baixa', 'Média', 'Alta', 'Urgente'],
    default: 'Média'
  },
  dataFim: {
    type: Date
  },
  valor: {
    type: Number,
    default: 0
  },
  advogado: {
    type: String,
    default: ''
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

module.exports = mongoose.model('Caso', CasoSchema);
