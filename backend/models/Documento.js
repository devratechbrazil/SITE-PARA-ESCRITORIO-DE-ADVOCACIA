const mongoose = require('mongoose');

const DocumentoSchema = new mongoose.Schema({
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
  tipo: {
    type: String,
    default: 'Outro'
  },
  nome: {
    type: String,
    required: true
  },
  dataUrl: {
    type: String,
    required: true
  },
  usuario: {
    type: String,
    default: ''
  },
  criadoEm: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Documento', DocumentoSchema);
