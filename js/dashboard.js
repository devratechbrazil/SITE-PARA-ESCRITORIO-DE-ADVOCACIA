/* ===================================================
   DASHBOARD.JS
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

    // Data topbar
    const now = new Date();
    document.getElementById('topbarDate').textContent =
        now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    // Config nome escritório
    const cfg = DB.getConfig();
    const nameEl = document.getElementById('nomeEscritorioSidebar');
    if (nameEl && cfg.nomeEscritorio) nameEl.textContent = cfg.nomeEscritorio;

    renderStats();
    renderCharts();
    renderUltimasMov();
});

function renderStats() {
    const caixa = DB.getCaixa();
    const cobrancas = DB.getCobrancas();
    const clientes = DB.getClientes().filter(c => c.status === 'ativo');
    const hoje = UI.today();
    const mesAtual = hoje.slice(0, 7);

    const totalEntradas = caixa.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0);
    const totalSaidas = caixa.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0);
    const saldo = totalEntradas - totalSaidas;

    const entMes = caixa.filter(l => l.tipo === 'entrada' && l.data.startsWith(mesAtual)).reduce((s, l) => s + Number(l.valor), 0);
    const saiMes = caixa.filter(l => l.tipo === 'saida' && l.data.startsWith(mesAtual)).reduce((s, l) => s + Number(l.valor), 0);

    const aReceber = cobrancas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0);
    const vencidas = cobrancas.filter(c => c.status !== 'pago' && c.vencimento < hoje).length;
    const ativas = cobrancas.filter(c => c.status !== 'cancelado').length;

    document.getElementById('statSaldo').textContent = UI.currency(saldo);
    document.getElementById('statAReceber').textContent = UI.currency(aReceber);
    document.getElementById('statRecebido').textContent = UI.currency(entMes);
    document.getElementById('statDespesas').textContent = UI.currency(saiMes);
    document.getElementById('statClientes').textContent = clientes.length;
    document.getElementById('statVencidas').textContent = vencidas;
    document.getElementById('statCobAtivas').textContent = ativas;
}

function renderCharts() {
    const caixa = DB.getCaixa();
    const cobrancas = DB.getCobrancas();

    // Últimos 6 meses
    const months = [];
    const labels = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        months.push(key);
        labels.push(label);
    }

    const entradas = months.map(m => caixa.filter(l => l.tipo === 'entrada' && l.data.startsWith(m)).reduce((s, l) => s + Number(l.valor), 0));
    const saidas = months.map(m => caixa.filter(l => l.tipo === 'saida' && l.data.startsWith(m)).reduce((s, l) => s + Number(l.valor), 0));

    const ctxFluxo = document.getElementById('chartFluxo').getContext('2d');
    new Chart(ctxFluxo, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Entradas', data: entradas, backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 6 },
                { label: 'Saídas', data: saidas, backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 6 }
            ]
        },
        options: {
            plugins: {
                legend: { labels: { color: '#8a8fa8', font: { size: 12 } } },
                tooltip: { callbacks: { label: ctx => UI.currency(ctx.raw) } }
            },
            scales: {
                x: { ticks: { color: '#8a8fa8' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: '#8a8fa8', callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.04)' } }
            },
            responsive: true,
            maintainAspectRatio: true
        }
    });

    // Método cobranças
    const pix = cobrancas.filter(c => c.metodo === 'pix').length;
    const boleto = cobrancas.filter(c => c.metodo === 'boleto').length;
    const ambos = cobrancas.filter(c => c.metodo === 'ambos').length;
    const manual = cobrancas.filter(c => !c.metodo || c.metodo === 'manual').length;

    const ctxMetodo = document.getElementById('chartMetodo').getContext('2d');
    new Chart(ctxMetodo, {
        type: 'doughnut',
        data: {
            labels: ['Pix', 'Boleto', 'Pix+Boleto', 'Manual'],
            datasets: [{
                data: [pix, boleto, ambos, manual],
                backgroundColor: ['#22c55e', '#3b82f6', '#c9a84c', '#8a8fa8'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom', labels: { color: '#8a8fa8', padding: 14, font: { size: 12 } } }
            },
            cutout: '68%',
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function renderUltimasMov() {
    const caixa = DB.getCaixa().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10);
    const tbody = document.getElementById('tblUltimasMov');

    if (!caixa.length) {
        tbody.innerHTML = UI.emptyRow(5, 'Nenhuma movimentação registrada.');
        return;
    }

    tbody.innerHTML = caixa.map(l => `
    <tr>
      <td class="td-muted">${UI.date(l.data)}</td>
      <td>${UI.escHtml(l.descricao)}</td>
      <td class="td-muted">${l.clienteId ? UI.escHtml(UI.clienteNome(l.clienteId)) : '—'}</td>
      <td>
        <span class="badge ${l.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}">
          ${l.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
        </span>
      </td>
      <td class="${l.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}">
        ${l.tipo === 'entrada' ? '+' : '-'}${UI.currency(l.valor)}
      </td>
    </tr>
  `).join('');
}
