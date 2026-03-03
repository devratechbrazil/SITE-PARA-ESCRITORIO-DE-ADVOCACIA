/* ===================================================
   RELATORIOS.JS - Geracao de relatorios
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

    const cliOpts = '<option value="">Todos os clientes</option>' + DB.getClientes().map((c) => `<option value="${c.id}">${UI.escHtml(c.nome)}</option>`).join('');
    document.getElementById('relCliente').innerHTML = cliOpts;

    // Defaults: mes atual
    const hj = new Date();
    const mesAtual = hj.toISOString().slice(0, 7);
    document.getElementById('relDataInicio').value = `${mesAtual}-01`;
    document.getElementById('relDataFim').value = new Date(hj.getFullYear(), hj.getMonth() + 1, 0).toISOString().split('T')[0];

    document.getElementById('btnGerarRelatorio').addEventListener('click', gerarRelatorio);
});

function gerarRelatorio() {
    const dtIni = document.getElementById('relDataInicio').value;
    const dtFim = document.getElementById('relDataFim').value;
    const cliId = document.getElementById('relCliente').value;

    if (!dtIni || !dtFim) { UI.toast('Selecione data inicial e final.', 'warning'); return; }
    if (dtIni > dtFim) { UI.toast('Data inicial maior que final.', 'error'); return; }

    const btn = document.getElementById('btnGerarRelatorio');
    btn.innerHTML = '<span class="spinner"></span> Processando...';

    setTimeout(() => {
        document.getElementById('relPlaceholder').style.display = 'none';
        const cont = document.getElementById('relatorioContainer');
        cont.style.display = 'block';

        document.getElementById('txtPeriodo').textContent = `${UI.date(dtIni)} a ${UI.date(dtFim)}`;

        let caixa = DB.getCaixa().filter((l) => l.data >= dtIni && l.data <= dtFim);
        if (cliId) caixa = caixa.filter((l) => l.clienteId === cliId);
        caixa.sort((a, b) => a.data.localeCompare(b.data));

        let sumIn = 0;
        let sumOut = 0;
        const bodyCaixa = document.getElementById('tblRelCaixa');
        if (!caixa.length) {
            bodyCaixa.innerHTML = UI.emptyRow(5, 'Sem dados de caixa no periodo.');
        } else {
            bodyCaixa.innerHTML = caixa.map((l) => {
                const isIn = l.tipo === 'entrada';
                if (isIn) sumIn += Number(l.valor); else sumOut += Number(l.valor);
                return `<tr>
          <td class="td-muted">${UI.date(l.data)}</td>
          <td>${UI.escHtml(l.descricao)}</td>
          <td class="td-muted">${l.clienteId ? UI.escHtml(UI.clienteNome(l.clienteId)) : '—'}</td>
          <td><span class="badge ${isIn ? 'badge-success' : 'badge-danger'}">${isIn ? 'Entrada' : 'Saida'}</span></td>
          <td style="text-align:right" class="${isIn ? 'valor-entrada' : 'valor-saida'} fw-700">${UI.currency(l.valor)}</td>
        </tr>`;
            }).join('');
        }

        document.getElementById('rTotalIn').textContent = UI.currency(sumIn);
        document.getElementById('rTotalOut').textContent = UI.currency(sumOut);
        document.getElementById('rSaldo').textContent = UI.currency(sumIn - sumOut);

        // Cobrancas pendentes
        let cobs = DB.getCobrancas().filter((c) => c.status !== 'pago' && c.vencimento <= dtFim);
        if (cliId) cobs = cobs.filter((c) => c.clienteId === cliId);
        const sumPend = cobs.reduce((s, c) => s + Number(c.valor), 0);
        document.getElementById('rPendente').textContent = UI.currency(sumPend);

        // Bloco cliente especifico
        const blCobs = document.getElementById('blocoCobrancasCliente');
        if (cliId) {
            blCobs.style.display = 'block';
            const cobsCli = DB.getCobrancas().filter((c) => c.clienteId === cliId).sort((a, b) => b.vencimento.localeCompare(a.vencimento));
            const tbodyCobs = document.getElementById('tblRelCob');
            if (!cobsCli.length) {
                tbodyCobs.innerHTML = UI.emptyRow(5, 'Sem cobrancas registradas.');
            } else {
                const hoje = UI.today();
                tbodyCobs.innerHTML = cobsCli.map((c) => {
                    const s = c.status !== 'pago' && c.vencimento < hoje
                        ? { l: 'Vencido', c: 'badge-danger' }
                        : c.status === 'pago'
                            ? { l: 'Pago', c: 'badge-success' }
                            : { l: 'Pendente', c: 'badge-warning' };
                    return `<tr>
            <td>${UI.escHtml(c.descricao)}</td>
            <td class="td-muted">${UI.date(c.vencimento)}</td>
            <td class="td-muted">${c.metodo}</td>
            <td><span class="badge ${s.c}">${s.l}</span></td>
            <td style="text-align:right" class="fw-700 text-gold">${UI.currency(c.valor)}</td>
          </tr>`;
                }).join('');
            }
        } else {
            blCobs.style.display = 'none';
        }

        btn.textContent = 'Gerar Relatorio';
        UI.toast('Relatorio processado', 'info');
    }, 300);
}
