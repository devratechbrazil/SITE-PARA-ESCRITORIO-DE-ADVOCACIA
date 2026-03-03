/* ===================================================
   FINANCEIRO.JS - Controle de Caixa
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

    // Popular selects de clientes
    const clienteOptions = '<option value="">— Sem cliente —</option>' + DB.getClientes()
        .filter((c) => c.status === 'ativo')
        .map((c) => `<option value="${c.id}">${UI.escHtml(c.nome)}</option>`)
        .join('');

    document.getElementById('eCliente').innerHTML = clienteOptions;
    document.getElementById('sCliente').innerHTML = clienteOptions;

    // Popular filtro de clientes
    const filterCliente = document.getElementById('filterCliente');
    DB.getClientes().forEach((c) => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.nome;
        filterCliente.appendChild(o);
    });

    // Data inicial
    document.getElementById('eData').value = UI.today();
    document.getElementById('sData').value = UI.today();
    document.getElementById('filterMes').value = UI.today().slice(0, 7);

    renderTabela();
    renderSaldos();

    document.getElementById('btnNovaEntrada').addEventListener('click', () => abrirEntrada());
    document.getElementById('btnNovaSaida').addEventListener('click', () => abrirSaida());
    document.getElementById('btnSalvarEntrada').addEventListener('click', salvarEntrada);
    document.getElementById('btnSalvarSaida').addEventListener('click', salvarSaida);

    ['searchCaixa', 'filterTipo', 'filterCliente', 'filterMes'].forEach((id) => {
        document.getElementById(id).addEventListener('change', renderTabela);
        if (id === 'searchCaixa') document.getElementById(id).addEventListener('input', renderTabela);
    });

    document.getElementById('btnLimparFiltros').addEventListener('click', () => {
        document.getElementById('searchCaixa').value = '';
        document.getElementById('filterTipo').value = '';
        document.getElementById('filterCliente').value = '';
        document.getElementById('filterMes').value = '';
        renderTabela();
    });
});

function getLancamentos() {
    let list = DB.getCaixa();
    const q = document.getElementById('searchCaixa').value.toLowerCase();
    const tp = document.getElementById('filterTipo').value;
    const cl = document.getElementById('filterCliente').value;
    const ms = document.getElementById('filterMes').value;

    if (q) list = list.filter((l) => (l.descricao || '').toLowerCase().includes(q));
    if (tp) list = list.filter((l) => l.tipo === tp);
    if (cl) list = list.filter((l) => l.clienteId === cl);
    if (ms) list = list.filter((l) => l.data.startsWith(ms));
    return list.sort((a, b) => b.data.localeCompare(a.data));
}

function renderTabela() {
    const list = getLancamentos();
    const tbody = document.getElementById('tblCaixa');
    const tfoot = document.getElementById('tfootCaixa');
    const catMap = { custas: 'Custas', administrativo: 'Administrativo', aluguel: 'Aluguel', salario: 'Salarios', cartorio: 'Cartorio', material: 'Material', outros: 'Outros' };

    if (!list.length) {
        tbody.innerHTML = UI.emptyRow(9, 'Nenhuma movimentacao encontrada.');
        tfoot.innerHTML = '';
        return;
    }

    let sumEnt = 0;
    let sumSai = 0;

    tbody.innerHTML = list.map((l) => {
        const isEnt = l.tipo === 'entrada';
        if (isEnt) sumEnt += Number(l.valor);
        else sumSai += Number(l.valor);

        return `
    <tr>
      <td class="td-muted">${UI.date(l.data)}</td>
      <td>${UI.escHtml(l.descricao || '—')}</td>
      <td class="td-muted">${l.clienteId ? UI.escHtml(UI.clienteNome(l.clienteId)) : '—'}</td>
      <td class="td-muted">${isEnt ? UI.escHtml(l.formaPagamento || '—') : UI.escHtml(catMap[l.categoria] || l.categoria || '—')}</td>
      <td><span class="badge ${isEnt ? 'badge-success' : 'badge-danger'}">${isEnt ? '↑ Entrada' : '↓ Saida'}</span></td>
      <td class="td-muted">${UI.escHtml(l.usuario || '—')}</td>
      <td><span class="badge ${l.status === 'pago' ? 'badge-success' : 'badge-warning'}">${l.status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
      <td style="text-align:right" class="${isEnt ? 'valor-entrada' : 'valor-saida'} fw-700">
        ${isEnt ? '+' : '-'}${UI.currency(l.valor)}
      </td>
      <td>
        <button class="btn btn-ghost" onclick="excluirLancamento('${l.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`;
    }).join('');

    const saldo = sumEnt - sumSai;
    tfoot.innerHTML = `
    <tr style="background:rgba(255,255,255,0.03);font-weight:700">
      <td colspan="7" style="padding:12px 16px;color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:.04em">
        Total do periodo filtrado
      </td>
      <td style="text-align:right;padding:12px 16px">
        <span style="color:var(--success)">+${UI.currency(sumEnt)}</span>
        &nbsp;/&nbsp;
        <span style="color:var(--danger)">-${UI.currency(sumSai)}</span>
        &nbsp;=&nbsp;
        <span style="color:${saldo >= 0 ? 'var(--gold)' : 'var(--danger)'}">${UI.currency(saldo)}</span>
      </td>
      <td></td>
    </tr>`;
}

function renderSaldos() {
    const caixa = DB.getCaixa();
    const mes = UI.today().slice(0, 7);
    const ent = caixa.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0);
    const sai = caixa.filter((l) => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0);
    const entMs = caixa.filter((l) => l.tipo === 'entrada' && l.data.startsWith(mes)).reduce((s, l) => s + Number(l.valor), 0);
    const saiMs = caixa.filter((l) => l.tipo === 'saida' && l.data.startsWith(mes)).reduce((s, l) => s + Number(l.valor), 0);

    document.getElementById('saldoTotal').textContent = UI.currency(ent - sai);
    document.getElementById('totalEntradas').textContent = UI.currency(ent);
    document.getElementById('totalSaidas').textContent = UI.currency(sai);
    document.getElementById('saldoMes').textContent = UI.currency(entMs - saiMs);
}

function abrirEntrada(id = null) {
    document.getElementById('entradaId').value = id || '';
    document.getElementById('eData').value = UI.today();
    if (!id) {
        document.getElementById('eValor').value = '';
        document.getElementById('eDescricao').value = '';
    }
    UI.openModal('modalEntrada');
}

function abrirSaida(id = null) {
    document.getElementById('saidaId').value = id || '';
    document.getElementById('sData').value = UI.today();
    if (!id) {
        document.getElementById('sValor').value = '';
        document.getElementById('sDescricao').value = '';
    }
    UI.openModal('modalSaida');
}

async function salvarEntrada() {
    const valor = parseFloat(document.getElementById('eValor').value);
    const desc = document.getElementById('eDescricao').value.trim();
    if (!valor || valor <= 0) {
        UI.toast('Informe um valor valido.', 'error');
        return;
    }
    if (!desc) {
        UI.toast('Descricao e obrigatoria.', 'error');
        return;
    }

    const id = document.getElementById('entradaId').value || undefined;

    try {
        await DB.saveLancamento({
            id,
            tipo: 'entrada',
            valor,
            descricao: desc,
            data: document.getElementById('eData').value,
            clienteId: document.getElementById('eCliente').value || null,
            formaPagamento: document.getElementById('eFormaPagamento').value,
            status: document.getElementById('eStatus').value,
            usuario: Auth.currentUser()?.email
        });
    } catch (error) {
        UI.toast(error.message || 'Erro ao registrar entrada.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Registrou entrada', detalhe: `${desc} - ${UI.currency(valor)}` });
    UI.toast('Entrada registrada!', 'success');
    UI.closeModal('modalEntrada');
    renderTabela();
    renderSaldos();
}

async function salvarSaida() {
    const valor = parseFloat(document.getElementById('sValor').value);
    const desc = document.getElementById('sDescricao').value.trim();
    if (!valor || valor <= 0) {
        UI.toast('Informe um valor valido.', 'error');
        return;
    }
    if (!desc) {
        UI.toast('Descricao e obrigatoria.', 'error');
        return;
    }

    const id = document.getElementById('saidaId').value || undefined;

    try {
        await DB.saveLancamento({
            id,
            tipo: 'saida',
            valor,
            descricao: desc,
            data: document.getElementById('sData').value,
            clienteId: document.getElementById('sCliente').value || null,
            categoria: document.getElementById('sCategoria').value,
            status: document.getElementById('sStatus').value,
            usuario: Auth.currentUser()?.email
        });
    } catch (error) {
        UI.toast(error.message || 'Erro ao registrar saida.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Registrou saida', detalhe: `${desc} - ${UI.currency(valor)}` });
    UI.toast('Despesa registrada!', 'success');
    UI.closeModal('modalSaida');
    renderTabela();
    renderSaldos();
}

async function excluirLancamento(id) {
    const ok = await UI.confirm('Excluir esta movimentacao?', 'Excluir lancamento');
    if (!ok) return;

    try {
        await DB.deleteLancamento(id);
    } catch (error) {
        UI.toast(error.message || 'Erro ao excluir lancamento.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Excluiu lancamento', detalhe: id });
    UI.toast('Lancamento excluido.', 'success');
    renderTabela();
    renderSaldos();
}
