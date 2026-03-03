const mongoose = require('mongoose');

const ConfiguracaoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    unique: true,
    required: true
  },
  nomeEscritorio: {
    type: String,
    default: 'Escritorio de Advocacia'
  },
  cnpj: {
    type: String,
    default: ''
  },
  endereco: {
    type: String,
    default: ''
  },
  telefone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  asaasKey: {
    type: String,
    default: ''
  },
  asaasAmbiente: {
    type: String,
    enum: ['sandbox', 'production'],
    default: 'sandbox'
  },
  dataAtualizacao: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Configuracao', ConfiguracaoSchema);
