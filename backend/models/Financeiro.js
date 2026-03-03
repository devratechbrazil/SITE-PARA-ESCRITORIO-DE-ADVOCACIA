const mongoose = require('mongoose');

const FinanceiroSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente'
  },
  casoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caso'
  },
  tipo: {
    type: String,
    enum: ['Receita', 'Despesa', 'entrada', 'saida'],
    required: true
  },
  descricao: {
    type: String,
    required: true,
    trim: true
  },
  valor: {
    type: Number,
    required: true
  },
  categoria: {
    type: String,
    default: 'outros'
  },
  data: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  status: {
    type: String,
    enum: ['Pendente', 'Pago', 'Cancelado', 'pendente', 'pago', 'cancelado'],
    default: 'pendente'
  },
  dataPagamento: {
    type: Date
  },
  metodo: {
    type: String,
    default: 'indefinido'
  },
  formaPagamento: {
    type: String,
    default: ''
  },
  usuario: {
    type: String,
    default: ''
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

module.exports = mongoose.model('Financeiro', FinanceiroSchema);
