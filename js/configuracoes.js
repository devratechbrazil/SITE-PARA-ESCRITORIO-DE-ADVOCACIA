/* ===================================================
   CONFIGURACOES.JS
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
    UI.initMasks();

    carregarConfig();

    document.getElementById('btnSalvarDados').addEventListener('click', salvarDados);
    document.getElementById('btnSalvarAsaas').addEventListener('click', salvarAsaas);
    document.getElementById('btnExport').addEventListener('click', exportarBackup);
    document.getElementById('btnReset').addEventListener('click', resetBD);
});

function carregarConfig() {
    const cfg = DB.getConfig();
    document.getElementById('nomeEscritorioSidebar').textContent = cfg.nomeEscritorio || 'Escritorio';

    // Dados basicos
    document.getElementById('cfgNome').value = cfg.nomeEscritorio || '';
    document.getElementById('cfgCnpj').value = cfg.cnpj || '';
    document.getElementById('cfgTel').value = cfg.telefone || '';
    document.getElementById('cfgEndereco').value = cfg.endereco || '';
    document.getElementById('cfgEmail').value = cfg.email || '';

    // Asaas
    document.getElementById('cfgAsaasEnv').value = cfg.asaasAmbiente || 'sandbox';
    document.getElementById('cfgAsaasKey').value = cfg.asaasKey || '';

    const badge = document.getElementById('badgeAsaas');
    if (cfg.asaasKey) {
        badge.className = 'badge badge-success';
        badge.textContent = 'Ativo (' + (cfg.asaasAmbiente === 'production' ? 'Producao' : 'Teste') + ')';
    } else {
        badge.className = 'badge badge-warning';
        badge.textContent = 'Inativo';
    }
}

async function salvarDados() {
    const cfg = DB.getConfig();
    cfg.nomeEscritorio = document.getElementById('cfgNome').value.trim();
    cfg.cnpj = document.getElementById('cfgCnpj').value.trim();
    cfg.telefone = document.getElementById('cfgTel').value.trim();
    cfg.endereco = document.getElementById('cfgEndereco').value.trim();
    cfg.email = document.getElementById('cfgEmail').value.trim();

    if (!cfg.nomeEscritorio) {
        UI.toast('Nome do escritorio e obrigatorio.', 'error');
        return;
    }

    try {
        await DB.saveConfig(cfg);
    } catch (error) {
        UI.toast(error.message || 'Erro ao salvar configuracoes.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Atualizou configuracoes', detalhe: 'Dados do escritorio' });
    UI.toast('Dados salvos com sucesso!', 'success');
    carregarConfig();
}

async function salvarAsaas() {
    const cfg = DB.getConfig();
    cfg.asaasAmbiente = document.getElementById('cfgAsaasEnv').value;
    cfg.asaasKey = document.getElementById('cfgAsaasKey').value.trim();

    try {
        await DB.saveConfig(cfg);
    } catch (error) {
        UI.toast(error.message || 'Erro ao salvar integracao.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Atualizou integracoes', detalhe: 'API Asaas configurada' });
    UI.toast('Integracao de pagamentos atualizada!', 'success');
    carregarConfig();
}

async function exportarBackup() {
    const d = new Date();
    const fileDate = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const filename = `backup_sistema_${fileDate}.json`;

    let data;
    try {
        data = await DB.exportBackup();
    } catch (error) {
        UI.toast(error.message || 'Erro ao exportar backup.', 'error');
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Exportou Backup', detalhe: filename });
    UI.toast('Backup exportado com sucesso.', 'success');
}

async function resetBD() {
    const ok1 = await UI.confirm('TEM CERTEZA? Esta acao apagara todos os clientes, financas e configuracoes.', 'Apagar Sistema');
    if (!ok1) return;

    const ok2 = await UI.confirm('ULTIMO AVISO! Deseja realmente excluir todos os dados?', 'EXCLUIR TUDO');
    if (!ok2) return;

    try {
        await DB.resetData();
    } catch (error) {
        UI.toast(error.message || 'Erro ao resetar dados.', 'error');
        return;
    }

    Auth.logout();
}
