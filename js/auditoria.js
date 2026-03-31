/* ===================================================
   AUDITORIA.JS - Visualizador de Logs
   =================================================== */
if (!Auth.guard()) throw new Error('not auth');


document.addEventListener('DOMContentLoaded', async () => {
    try {
        await DB.init();
    } catch (error) {
        UI.toast('Erro ao carregar dados do servidor.', 'error');
        console.error(error);
    }

    Auth.renderUserInfo();
    UI.initSidebar();
    UI.initLogout();

    const cfg = DB.getConfig();
    const nameEl = document.getElementById('nomeEscritorioSidebar');
    if (nameEl && cfg.nomeEscritorio) nameEl.textContent = cfg.nomeEscritorio;

    renderTabela();

    document.getElementById('searchAudit').addEventListener('input', renderTabela);
});

function renderTabela() {
    const q = document.getElementById('searchAudit').value.toLowerCase();
    let logs = DB.getLogs() || [];

    if (q) {
        logs = logs.filter((l) =>
            (l.usuario || '').toLowerCase().includes(q) ||
            (l.acao || '').toLowerCase().includes(q) ||
            (l.detalhe || '').toLowerCase().includes(q)
        );
    }

    const tbody = document.getElementById('tblAudit');
    if (!logs.length) {
        tbody.innerHTML = UI.emptyRow(4, 'Nenhum log encontrado.');
        return;
    }

    tbody.innerHTML = logs.map((l) => {
        const d = new Date(l.ts);
        const dataHora = `${d.toLocaleDateString('pt-BR')} as ${d.toLocaleTimeString('pt-BR')}`;
        return `
      <tr>
        <td class="td-muted">${dataHora}</td>
        <td class="td-muted">${UI.escHtml(l.usuario) || 'Sistema'}</td>
        <td style="font-weight:600">${UI.escHtml(l.acao)}</td>
        <td class="td-muted">${UI.escHtml(l.detalhe || '—')}</td>
      </tr>
    `;
    }).join('');
}
