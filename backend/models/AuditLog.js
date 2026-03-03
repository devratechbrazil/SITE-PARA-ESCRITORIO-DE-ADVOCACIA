const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  usuario: {
    type: String,
    default: 'sistema'
  },
  acao: {
    type: String,
    required: true
  },
  detalhe: {
    type: String,
    default: ''
  },
  ts: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
