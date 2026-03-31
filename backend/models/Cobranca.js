const mongoose = require('mongoose');

const CobrancaSchema = new mongoose.Schema({
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
  valor: {
    type: Number,
    required: true
  },
  vencimento: {
    type: Date,
    required: true
  },
  metodo: {
    type: String,
    enum: ['pix', 'boleto', 'cartao', 'manual'],
    default: 'manual'
  },
  descricao: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pendente', 'pago', 'cancelado'],
    default: 'pendente'
  },
  gateway: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  usuario: {
    type: String,
    default: ''
  },
  paidAt: {
    type: Date
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

module.exports = mongoose.model('Cobranca', CobrancaSchema);
