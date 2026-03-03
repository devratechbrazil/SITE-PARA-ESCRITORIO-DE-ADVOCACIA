/* ===================================================
   CLIENTES.JS
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

    const cfg = DB.getConfig();
    const nameEl = document.getElementById('nomeEscritorioSidebar');
    if (nameEl && cfg.nomeEscritorio) nameEl.textContent = cfg.nomeEscritorio;

    renderTabela();

    document.getElementById('btnNovoCliente').addEventListener('click', () => abrirModal());
    document.getElementById('searchClientes').addEventListener('input', renderTabela);
    document.getElementById('filterStatus').addEventListener('change', renderTabela);
    document.getElementById('btnSalvarCliente').addEventListener('click', salvarCliente);

    // Tabs no modal
    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'docs') {
                const id = document.getElementById('clienteId').value;
                renderDocumentos(id);
                document.getElementById('modalClienteFooter').style.display = 'none';
            } else {
                document.getElementById('modalClienteFooter').style.display = 'flex';
            }
        });
    });

    // Documento upload
    document.getElementById('btnAddDoc').addEventListener('click', () => {
        document.getElementById('docUploadForm').style.display = 'block';
    });
    document.getElementById('btnCancelarDoc').addEventListener('click', () => {
        document.getElementById('docUploadForm').style.display = 'none';
    });
    document.getElementById('btnSalvarDoc').addEventListener('click', salvarDocumento);
});

function renderTabela() {
    const q = document.getElementById('searchClientes').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    let clientes = DB.getClientes();

    if (q) {
        clientes = clientes.filter((c) =>
            c.nome.toLowerCase().includes(q) ||
            (c.cpfCnpj || '').includes(q) ||
            (c.email || '').toLowerCase().includes(q)
        );
    }

    if (status) clientes = clientes.filter((c) => c.status === status);
    clientes.sort((a, b) => a.nome.localeCompare(b.nome));

    const tbody = document.getElementById('tblClientes');
    if (!clientes.length) {
        tbody.innerHTML = UI.emptyRow(7, 'Nenhum cliente encontrado.');
        return;
    }

    tbody.innerHTML = clientes.map((c) => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar-sm">${UI.initials(c.nome)}</div>
          <div>
            <div style="font-weight:600">${UI.escHtml(c.nome)}</div>
            <div class="td-muted" style="font-size:11.5px">${UI.escHtml(c.obs || '')}</div>
          </div>
        </div>
      </td>
      <td class="td-muted">${UI.escHtml(c.cpfCnpj || '—')}</td>
      <td class="td-muted">${UI.escHtml(c.telefone || '—')}</td>
      <td class="td-muted">${UI.escHtml(c.email || '—')}</td>
      <td><span class="badge ${c.status === 'ativo' ? 'badge-success' : 'badge-muted'}">${c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
      <td class="td-muted">${UI.date(c.criadoEm)}</td>
      <td style="text-align:right">
        <div class="actions-dropdown">
          <button class="actions-dropdown-btn" onclick="toggleDropdown(event, this)" title="Acoes">⋮</button>
          <div class="actions-menu">
            <button class="actions-menu-item" onclick="abrirModal('${c.id}')"><span class="nav-icon">✏️</span> Editar Dados</button>
            <button class="actions-menu-item" onclick="abrirModal('${c.id}', true)"><span class="nav-icon">📁</span> Documentos</button>
            <button class="actions-menu-item" onclick="cobrancaRapida('${c.id}')"><span class="nav-icon">📄</span> Gerar Cobranca</button>
            <hr class="divider" style="margin:4px 0;border-top-color:var(--border-strong)">
            <button class="actions-menu-item danger" onclick="excluirCliente('${c.id}')"><span class="nav-icon">🗑️</span> Excluir Cliente</button>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}

// Fechar dropdowns ao clicar fora
document.addEventListener('click', (e) => {
    if (!e.target.closest('.actions-dropdown')) {
        document.querySelectorAll('.actions-dropdown').forEach((d) => d.classList.remove('active'));
    }
});

function toggleDropdown(e, btn) {
    e.stopPropagation();
    const dropdown = btn.closest('.actions-dropdown');
    document.querySelectorAll('.actions-dropdown').forEach((d) => {
        if (d !== dropdown) d.classList.remove('active');
    });
    dropdown.classList.toggle('active');
}

function abrirModal(id = null, goDocs = false) {
    document.getElementById('clienteId').value = id || '';
    document.getElementById('formCliente').reset();
    document.getElementById('docUploadForm').style.display = 'none';

    // Reset tabs
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));

    if (goDocs && id) {
        document.querySelector('[data-tab="docs"]').classList.add('active');
        document.getElementById('tab-docs').classList.add('active');
        document.getElementById('modalClienteFooter').style.display = 'none';
        renderDocumentos(id);
    } else {
        document.querySelector('[data-tab="dados"]').classList.add('active');
        document.getElementById('tab-dados').classList.add('active');
        document.getElementById('modalClienteFooter').style.display = 'flex';
    }

    if (id) {
        const c = DB.getCliente(id);
        if (!c) return;
        document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';
        document.getElementById('cNome').value = c.nome || '';
        document.getElementById('cCpfCnpj').value = c.cpfCnpj || '';
        document.getElementById('cRg').value = c.rg || '';
        document.getElementById('cNascimento').value = c.nascimento || '';
        document.getElementById('cEndereco').value = c.endereco || '';
        document.getElementById('cEmail').value = c.email || '';
        document.getElementById('cTelefone').value = c.telefone || '';
        document.getElementById('cStatus').value = c.status || 'ativo';
        document.getElementById('cObs').value = c.obs || '';
    } else {
        document.getElementById('modalClienteTitulo').textContent = 'Novo Cliente';
        document.getElementById('cStatus').value = 'ativo';
    }

    UI.openModal('modalCliente');
}

async function salvarCliente() {
    const id = document.getElementById('clienteId').value || null;
    const nome = document.getElementById('cNome').value.trim();
    if (!nome) {
        UI.toast('Nome e obrigatorio.', 'error');
        return;
    }

    const c = {
        id: id || undefined,
        nome,
        cpfCnpj: document.getElementById('cCpfCnpj').value.trim(),
        rg: document.getElementById('cRg').value.trim(),
        nascimento: document.getElementById('cNascimento').value,
        endereco: document.getElementById('cEndereco').value.trim(),
        email: document.getElementById('cEmail').value.trim(),
        telefone: document.getElementById('cTelefone').value.trim(),
        status: document.getElementById('cStatus').value,
        obs: document.getElementById('cObs').value.trim()
    };

    let clienteSalvo;
    try {
        clienteSalvo = await DB.saveCliente(c);
    } catch (error) {
        UI.toast(error.message || 'Erro ao salvar cliente.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: id ? 'Editou cliente' : 'Criou cliente', detalhe: nome });

    // Tratamento de upload de documento na aba dados (se preenchido)
    const initFile = document.getElementById('cDocInicialArquivo').files[0];
    if (initFile) {
        if (initFile.size > 5 * 1024 * 1024) {
            UI.toast('Cliente salvo, mas o arquivo e maior que 5MB. Faca o upload manual.', 'warning');
            fecharESalvar(clienteSalvo.id);
            return;
        }

        const tipoInit = document.getElementById('cDocInicialTipo').value;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await DB.saveDocumento({
                    clienteId: clienteSalvo.id,
                    tipo: tipoInit,
                    nome: initFile.name,
                    dataUrl: e.target.result,
                    usuario: Auth.currentUser()?.email
                });
                UI.toast('Cliente e documento salvos!', 'success');
            } catch (error) {
                UI.toast(error.message || 'Cliente salvo, mas falhou upload do documento.', 'warning');
            }
            fecharESalvar(clienteSalvo.id);
        };
        reader.readAsDataURL(initFile);
    } else {
        UI.toast('Cliente salvo com sucesso!', 'success');
        fecharESalvar(clienteSalvo.id);
    }
}

function fecharESalvar() {
    UI.closeModal('modalCliente');
    renderTabela();
}

async function excluirCliente(id) {
    const c = DB.getCliente(id);
    const ok = await UI.confirm(`Excluir o cliente "${c?.nome}"? Todos os dados serao removidos.`, 'Excluir cliente');
    if (!ok) return;

    try {
        await DB.deleteCliente(id);
    } catch (error) {
        UI.toast(error.message || 'Erro ao excluir cliente.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Excluiu cliente', detalhe: c?.nome });
    UI.toast('Cliente excluido.', 'success');
    renderTabela();
}

function cobrancaRapida(clienteId) {
    sessionStorage.setItem('cobranca_cliente', clienteId);
    window.location.href = 'cobrancas.html';
}

function renderDocumentos(clienteId) {
    if (!clienteId) {
        document.getElementById('tblDocumentos').innerHTML = UI.emptyRow(5, 'Salve o cliente primeiro para adicionar documentos.');
        return;
    }
    const docs = DB.getDocumentos(clienteId);
    const tbody = document.getElementById('tblDocumentos');
    if (!docs.length) {
        tbody.innerHTML = UI.emptyRow(5, 'Nenhum documento cadastrado.');
        return;
    }

    tbody.innerHTML = docs.map((d) => `
    <tr>
      <td><span class="badge badge-info">${UI.escHtml(d.tipo)}</span></td>
      <td>${UI.escHtml(d.nome)}</td>
      <td class="td-muted">${UI.date(d.criadoEm)}</td>
      <td class="td-muted">${UI.escHtml(d.usuario || '—')}</td>
      <td>
        <button class="btn btn-ghost" onclick="downloadDoc('${d.id}')" title="Download">⬇️</button>
        <button class="btn btn-ghost" onclick="excluirDoc('${d.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function salvarDocumento() {
    const clienteId = document.getElementById('clienteId').value;
    if (!clienteId) {
        UI.toast('Salve o cliente primeiro.', 'warning');
        return;
    }

    const tipo = document.getElementById('docTipo').value;
    const file = document.getElementById('docArquivo').files[0];
    if (!file) {
        UI.toast('Selecione um arquivo.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        UI.toast('Arquivo muito grande (max 5MB).', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            await DB.saveDocumento({
                clienteId,
                tipo,
                nome: file.name,
                dataUrl: e.target.result,
                usuario: Auth.currentUser()?.email
            });
            DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Upload documento', detalhe: `${tipo} - ${file.name}` });
            document.getElementById('docUploadForm').style.display = 'none';
            document.getElementById('docArquivo').value = '';
            renderDocumentos(clienteId);
            UI.toast('Documento salvo!', 'success');
        } catch (error) {
            UI.toast(error.message || 'Erro ao salvar documento.', 'error');
        }
    };
    reader.readAsDataURL(file);
}

function downloadDoc(id) {
    const docs = DB.getAllDocumentos();
    const d = docs.find((x) => x.id === id);
    if (!d || !d.dataUrl) return;
    const a = document.createElement('a');
    a.href = d.dataUrl;
    a.download = d.nome || 'documento';
    a.click();
}

async function excluirDoc(id) {
    const ok = await UI.confirm('Excluir este documento?', 'Excluir documento');
    if (!ok) return;

    try {
        await DB.deleteDocumento(id);
    } catch (error) {
        UI.toast(error.message || 'Erro ao excluir documento.', 'error');
        return;
    }

    const clienteId = document.getElementById('clienteId').value;
    renderDocumentos(clienteId);
    UI.toast('Documento excluido.', 'success');
}
