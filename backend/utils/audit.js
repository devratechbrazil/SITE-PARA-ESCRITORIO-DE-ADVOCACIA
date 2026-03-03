const AuditLog = require('../models/AuditLog');

const registrarLog = async ({ usuarioId, usuario, acao, detalhe = '' }) => {
  if (!usuarioId || !acao) return;

  try {
    await AuditLog.create({
      usuarioId,
      usuario: usuario || 'sistema',
      acao,
      detalhe
    });
  } catch (error) {
    // Nao deve derrubar a requisicao principal por falha de auditoria.
    console.error('Falha ao registrar log de auditoria:', error.message);
  }
};

module.exports = { registrarLog };
