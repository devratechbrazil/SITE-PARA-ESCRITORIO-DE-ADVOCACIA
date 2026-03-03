/* ===================================================
   COBRANCAS.JS - Cobrancas (Pix/Boleto via Asaas)
   =================================================== */
if (!Auth.guard()) throw new Error('not auth');

let cobDetalheAtualId = null;

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

    // Preencher select de clientes
    document.getElementById('cobCliente').innerHTML =
        '<option value="">Selecione um cliente</option>' +
        DB.getClientes().filter((c) => c.status === 'ativo').map((c) => `<option value="${c.id}">${UI.escHtml(c.nome)}</option>`).join('');

    // Preencher cliente vindo da tela de clientes (atalho)
    const clientePre = sessionStorage.getItem('cobranca_cliente');
    if (clientePre) {
        sessionStorage.removeItem('cobranca_cliente');
        document.getElementById('cobCliente').value = clientePre;
        abrirModalCobranca();
    }

    document.getElementById('cobVencimento').value = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    })();

    renderTabela();
    renderStats();

    document.getElementById('btnNovaCobranca').addEventListener('click', abrirModalCobranca);
    document.getElementById('btnGerarCobranca').addEventListener('click', gerarCobranca);

    ['searchCob', 'filterStatus', 'filterMetodo'].forEach((id) => {
        const el = document.getElementById(id);
        el.addEventListener('input', renderTabela);
        el.addEventListener('change', renderTabela);
    });
});

function renderStats() {
    const list = DB.getCobrancas();
    const hoje = UI.today();
    const pend = list.filter((c) => c.status === 'pendente').length;
    const venc = list.filter((c) => c.status !== 'pago' && c.vencimento < hoje).length;
    const pagas = list.filter((c) => c.status === 'pago').length;
    const total = list.filter((c) => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0);
    document.getElementById('cPendentes').textContent = pend;
    document.getElementById('cVencidas').textContent = venc;
    document.getElementById('cPagas').textContent = pagas;
    document.getElementById('cTotal').textContent = UI.currency(total);
}

function renderTabela() {
    const q = document.getElementById('searchCob').value.toLowerCase();
    const st = document.getElementById('filterStatus').value;
    const mt = document.getElementById('filterMetodo').value;
    const hoje = UI.today();

    let list = DB.getCobrancas();
    if (q) list = list.filter((c) => UI.clienteNome(c.clienteId).toLowerCase().includes(q) || (c.descricao || '').toLowerCase().includes(q));
    if (mt) list = list.filter((c) => c.metodo === mt);
    if (st === 'vencido') list = list.filter((c) => c.status !== 'pago' && c.vencimento < hoje);
    else if (st) list = list.filter((c) => c.status === st);
    list.sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));

    const tbody = document.getElementById('tblCobrancas');
    if (!list.length) {
        tbody.innerHTML = UI.emptyRow(8, 'Nenhuma cobranca encontrada.');
        return;
    }

    const metMap = { pix: 'Pix', boleto: 'Boleto', ambos: 'Pix+Boleto' };

    tbody.innerHTML = list.map((c) => {
        const s = c.status !== 'pago' && c.vencimento < hoje
            ? { label: 'Vencido', css: 'badge-danger' }
            : c.status === 'pago'
                ? { label: 'Pago', css: 'badge-success' }
                : { label: 'Pendente', css: 'badge-warning' };

        return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="user-avatar-sm">${UI.initials(UI.clienteNome(c.clienteId))}</div>
          <span style="font-weight:600">${UI.escHtml(UI.clienteNome(c.clienteId))}</span>
        </div>
      </td>
      <td class="td-muted">${UI.escHtml(c.descricao || '—')}</td>
      <td class="fw-700 valor-entrada">${UI.currency(c.valor)}</td>
      <td class="td-muted">${UI.date(c.vencimento)}</td>
      <td class="td-muted">${metMap[c.metodo] || c.metodo || '—'}</td>
      <td><span class="badge ${s.css}">${s.label}</span></td>
      <td class="td-muted">${UI.escHtml(c.usuario || '—')}</td>
      <td style="text-align:right">
        <button class="btn btn-ghost" onclick="verDetalhe('${c.id}')" title="Ver detalhe">👁️</button>
        ${c.status !== 'pago' ? `<button class="btn btn-ghost" onclick="marcarPago('${c.id}')" title="Marcar pago">✅</button>` : ''}
        <button class="btn btn-ghost" onclick="excluirCobranca('${c.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>`;
    }).join('');
}

function abrirModalCobranca() {
    document.getElementById('cobId').value = '';
    document.getElementById('cobResultado').style.display = 'none';
    const cfg = DB.getConfig();
    document.getElementById('cobInfoSemKey').style.display = cfg.asaasKey ? 'none' : 'block';
    UI.openModal('modalCobranca');
}

async function gerarCobranca() {
    const clienteId = document.getElementById('cobCliente').value;
    const valor = parseFloat(document.getElementById('cobValor').value);
    const vencimento = document.getElementById('cobVencimento').value;
    const metodo = document.getElementById('cobMetodo').value;
    const descricao = document.getElementById('cobDescricao').value.trim();

    if (!clienteId) { UI.toast('Selecione um cliente.', 'error'); return; }
    if (!valor || valor < 1) { UI.toast('Valor minimo: R$ 1,00.', 'error'); return; }
    if (!vencimento) { UI.toast('Informe o vencimento.', 'error'); return; }
    if (!descricao) { UI.toast('Informe a descricao.', 'error'); return; }

    const btn = document.getElementById('btnGerarCobranca');
    btn.disabled = true;
    document.getElementById('btnGerarTxt').innerHTML = '<span class="spinner"></span> Gerando...';

    const cfg = DB.getConfig();

    try {
        if (cfg.asaasKey) {
            await gerarViaAsaas({ clienteId, valor, vencimento, metodo, descricao, cfg });
        } else {
            const cob = await DB.saveCobranca({
                clienteId,
                valor,
                vencimento,
                metodo,
                descricao,
                status: 'pendente',
                gateway: null,
                usuario: Auth.currentUser()?.email
            });

            DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Criou cobranca', detalhe: `${UI.clienteNome(clienteId)} - ${UI.currency(valor)}` });
            UI.toast('Cobranca salva localmente (sem gateway).', 'warning');
            UI.closeModal('modalCobranca');
            renderTabela();
            renderStats();
            setTimeout(() => verDetalhe(cob.id), 300);
        }
    } finally {
        btn.disabled = false;
        document.getElementById('btnGerarTxt').textContent = 'Gerar Cobranca';
    }
}

async function gerarViaAsaas({ clienteId, valor, vencimento, metodo, descricao, cfg }) {
    const cliente = DB.getCliente(clienteId);
    if (!cliente) { UI.toast('Cliente nao encontrado.', 'error'); return; }

    const billingType = metodo === 'pix' ? 'PIX' : metodo === 'boleto' ? 'BOLETO' : 'UNDEFINED';
    const baseUrl = cfg.asaasAmbiente === 'production' ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

    try {
        // 1. Criar/buscar cliente no Asaas
        const custResp = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(cliente.email || '')}`, {
            headers: { access_token: cfg.asaasKey }
        });
        let asaasCustomerId;
        if (custResp.ok) {
            const custData = await custResp.json();
            if (custData.data && custData.data.length > 0) {
                asaasCustomerId = custData.data[0].id;
            }
        }

        if (!asaasCustomerId) {
            const createCust = await fetch(`${baseUrl}/customers`, {
                method: 'POST',
                headers: { access_token: cfg.asaasKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: cliente.nome,
                    email: cliente.email || '',
                    phone: String(cliente.telefone || '').replace(/\D/g, ''),
                    cpfCnpj: String(cliente.cpfCnpj || '').replace(/\D/g, '')
                })
            });
            const cd = await createCust.json();
            asaasCustomerId = cd.id;
        }

        // 2. Criar cobranca
        const payResp = await fetch(`${baseUrl}/payments`, {
            method: 'POST',
            headers: { access_token: cfg.asaasKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer: asaasCustomerId,
                billingType,
                value: valor,
                dueDate: vencimento,
                description: descricao
            })
        });
        const pay = await payResp.json();

        if (!pay.id) {
            UI.toast('Erro Asaas: ' + (pay.errors?.[0]?.description || JSON.stringify(pay)), 'error');
            return;
        }

        let cob = await DB.saveCobranca({
            clienteId,
            valor,
            vencimento,
            metodo,
            descricao,
            status: 'pendente',
            gateway: {
                id: pay.id,
                customerId: asaasCustomerId,
                invoiceUrl: pay.invoiceUrl,
                bankSlipUrl: pay.bankSlipUrl,
                nossoNumero: pay.nossoNumero,
                pixQrCodeImage: null,
                pixCode: null
            },
            usuario: Auth.currentUser()?.email
        });

        // 3. Buscar QR Code se Pix
        if (metodo === 'pix' || metodo === 'ambos') {
            try {
                const pixResp = await fetch(`${baseUrl}/payments/${pay.id}/pixQrCode`, {
                    headers: { access_token: cfg.asaasKey }
                });
                const pixData = await pixResp.json();
                if (pixData.encodedImage) {
                    cob.gateway.pixQrCodeImage = pixData.encodedImage;
                    cob.gateway.pixCode = pixData.payload;
                    cob = await DB.saveCobranca(cob);
                }
            } catch (error) {
                console.warn('Pix QR error', error);
            }
        }

        DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Cobranca Asaas gerada', detalhe: `${pay.id} - ${UI.currency(valor)}` });
        UI.closeModal('modalCobranca');
        renderTabela();
        renderStats();
        UI.toast('Cobranca gerada com sucesso!', 'success');
        setTimeout(() => verDetalhe(cob.id), 300);
    } catch (error) {
        UI.toast('Erro ao conectar com o Asaas. Verifique a API Key.', 'error');
        console.error(error);
    }
}

function verDetalhe(id) {
    const cob = DB.getCobranca(id);
    if (!cob) return;

    cobDetalheAtualId = id;
    const cliente = DB.getCliente(cob.clienteId);
    const s = cob.status !== 'pago' && cob.vencimento < UI.today()
        ? { label: 'Vencido', css: 'badge-danger' }
        : cob.status === 'pago'
            ? { label: 'Pago', css: 'badge-success' }
            : { label: 'Pendente', css: 'badge-warning' };

    const metMap = { pix: 'Pix', boleto: 'Boleto', ambos: 'Pix + Boleto' };

    let gatewayHtml = '';
    if (cob.gateway) {
        const g = cob.gateway;
        const pixBlock = g.pixQrCodeImage ? `
      <div class="qr-container" style="margin-top:16px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">QR Code Pix</div>
        <img src="data:image/png;base64,${g.pixQrCodeImage}" style="width:180px;height:180px" alt="QR Pix">
        ${g.pixCode ? `<div class="pix-code" onclick="navigator.clipboard.writeText('${UI.escHtml(g.pixCode)}');UI.toast('Codigo copiado!','success')" style="cursor:pointer" title="Clique para copiar">${UI.escHtml(g.pixCode)}</div>` : ''}
      </div>` : '';

        const boletoBlock = g.bankSlipUrl ? `
      <div style="margin-top:12px">
        <a href="${UI.escHtml(g.bankSlipUrl)}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex">📄 Abrir Boleto PDF</a>
      </div>` : '';

        const linkBlock = g.invoiceUrl ? `
      <div style="margin-top:8px">
        <a href="${UI.escHtml(g.invoiceUrl)}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex">🔗 Pagina de Pagamento</a>
      </div>` : '';

        gatewayHtml = `
      <hr class="divider">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);margin-bottom:12px">Dados do Gateway</div>
      <div style="font-size:13px;color:var(--text-secondary)">ID Asaas: <span style="color:var(--gold);font-family:monospace">${g.id}</span></div>
      ${pixBlock}${boletoBlock}${linkBlock}`;
    } else {
        gatewayHtml = '<hr class="divider"><p style="color:var(--text-muted);font-size:13px">Cobranca sem integracao de gateway.</p>';
    }

    document.getElementById('detalheCobBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Cliente</div>
        <div style="font-weight:700">${UI.escHtml(cliente?.nome || '—')}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Status</div>
        <span class="badge ${s.css}">${s.label}</span></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Valor</div>
        <div style="font-weight:800;font-size:22px;color:var(--gold)">${UI.currency(cob.valor)}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Vencimento</div>
        <div style="font-weight:600">${UI.date(cob.vencimento)}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Metodo</div>
        <div>${metMap[cob.metodo] || cob.metodo || '—'}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Gerado por</div>
        <div>${UI.escHtml(cob.usuario || '—')}</div></div>
    </div>
    <div><div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Descricao</div>
      <div style="color:var(--text-secondary)">${UI.escHtml(cob.descricao || '—')}</div></div>
    ${gatewayHtml}`;

    const btnPago = document.getElementById('btnMarcarPago');
    if (cob.status !== 'pago') {
        btnPago.style.display = '';
        btnPago.onclick = () => marcarPago(id);
    } else {
        btnPago.style.display = 'none';
    }

    UI.openModal('modalDetalheCob');
}

async function marcarPago(id) {
    const cob = DB.getCobranca(id);
    if (!cob) return;

    const ok = await UI.confirm(`Marcar a cobranca de ${UI.currency(cob.valor)} como paga? Isso criara uma entrada no caixa.`, 'Confirmar pagamento');
    if (!ok) return;

    cob.status = 'pago';
    cob.paidAt = new Date().toISOString();

    try {
        await DB.saveCobranca(cob);
        await DB.saveLancamento({
            tipo: 'entrada',
            valor: cob.valor,
            descricao: `${cob.descricao || 'Cobranca'} (Pago automaticamente)`,
            clienteId: cob.clienteId,
            data: UI.today(),
            formaPagamento: cob.metodo || 'outro',
            status: 'pago',
            usuario: Auth.currentUser()?.email
        });
    } catch (error) {
        UI.toast(error.message || 'Erro ao marcar cobranca como paga.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Marcou cobranca como paga', detalhe: `${UI.clienteNome(cob.clienteId)} - ${UI.currency(cob.valor)}` });
    UI.closeModal('modalDetalheCob');
    renderTabela();
    renderStats();
    UI.toast('Pagamento confirmado! Entrada registrada no caixa.', 'success');
}

async function excluirCobranca(id) {
    const ok = await UI.confirm('Excluir esta cobranca?', 'Excluir cobranca');
    if (!ok) return;

    try {
        await DB.deleteCobranca(id);
    } catch (error) {
        UI.toast(error.message || 'Erro ao excluir cobranca.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Excluiu cobranca', detalhe: id });
    UI.toast('Cobranca excluida.', 'success');
    renderTabela();
    renderStats();
}
