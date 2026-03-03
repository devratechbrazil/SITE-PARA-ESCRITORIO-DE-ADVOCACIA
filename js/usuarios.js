/* ===================================================
   USUARIOS.JS - Gestao de Usuarios e Permissoes
   =================================================== */
if (!Auth.guard()) throw new Error('not auth');
if (!Auth.can('usuarios')) {
    UI.toast('Acesso negado.', 'error');
    setTimeout(() => (window.location.href = 'dashboard.html'), 1500);
}

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

    document.getElementById('btnNovoUsuario').addEventListener('click', () => abrirModal());
    document.getElementById('btnSalvarUsuario').addEventListener('click', salvarUsuario);
});

function renderTabela() {
    const lista = DB.getUsuarios().sort((a, b) => a.nome.localeCompare(b.nome));
    const tbody = document.getElementById('tblUsuarios');

    if (!lista.length) {
        tbody.innerHTML = UI.emptyRow(6, 'Nenhum usuario cadastrado.');
        return;
    }

    const perfis = { admin: 'Admin', financeiro: 'Financeiro', advogado: 'Advogado' };

    tbody.innerHTML = lista.map((u) => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar-sm">${UI.initials(u.nome)}</div>
          <span style="font-weight:600">${UI.escHtml(u.nome)}</span>
        </div>
      </td>
      <td class="td-muted">${UI.escHtml(u.email)}</td>
      <td><span class="badge badge-muted">${perfis[u.perfil] || u.perfil}</span></td>
      <td><span class="badge ${u.ativo ? 'badge-success' : 'badge-danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td class="td-muted">${UI.date(u.criadoEm)}</td>
      <td style="text-align:right">
        <button class="btn btn-ghost" onclick="abrirModal('${u.id}')" title="Editar">✏️</button>
        ${u.email !== 'admin@escritorio.com' ? `<button class="btn btn-ghost" onclick="excluirUsuario('${u.id}')" title="Excluir">🗑️</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function abrirModal(id = null) {
    document.getElementById('usrId').value = id || '';
    if (id) {
        const u = DB.getUsuarios().find((x) => x.id === id);
        if (!u) return;
        document.getElementById('modalUsrTitulo').textContent = 'Editar Usuario';
        document.getElementById('usrNome').value = u.nome;
        document.getElementById('usrEmail').value = u.email;
        document.getElementById('usrPerfil').value = u.perfil;
        document.getElementById('usrStatus').value = u.ativo ? 'ativo' : 'inativo';
        document.getElementById('usrSenha').value = '';
        document.getElementById('usrSenhaHint').style.display = 'block';

        const isRoot = u.email === 'admin@escritorio.com';
        document.getElementById('usrEmail').disabled = isRoot;
        document.getElementById('usrPerfil').disabled = isRoot;
        document.getElementById('usrStatus').disabled = isRoot;
    } else {
        document.getElementById('modalUsrTitulo').textContent = 'Novo Usuario';
        document.getElementById('usrNome').value = '';
        document.getElementById('usrEmail').value = '';
        document.getElementById('usrPerfil').value = 'advogado';
        document.getElementById('usrStatus').value = 'ativo';
        document.getElementById('usrSenha').value = '';
        document.getElementById('usrSenhaHint').style.display = 'none';

        document.getElementById('usrEmail').disabled = false;
        document.getElementById('usrPerfil').disabled = false;
        document.getElementById('usrStatus').disabled = false;
    }
    UI.openModal('modalUsuario');
}

async function salvarUsuario() {
    const id = document.getElementById('usrId').value || undefined;
    const nome = document.getElementById('usrNome').value.trim();
    const email = document.getElementById('usrEmail').value.trim().toLowerCase();
    const perfil = document.getElementById('usrPerfil').value;
    const ativo = document.getElementById('usrStatus').value === 'ativo';
    const senha = document.getElementById('usrSenha').value;

    if (!nome || !email) {
        UI.toast('Nome e e-mail obrigatorios.', 'warning');
        return;
    }
    if (!id && !senha) {
        UI.toast('Senha obrigatoria para novo usuario.', 'warning');
        return;
    }

    const uEmailExist = DB.getUsuarios().find((u) => u.email === email && u.id !== id);
    if (uEmailExist) {
        UI.toast('E-mail ja esta em uso.', 'error');
        return;
    }

    const u = { id, nome, email, perfil, ativo };
    if (senha) u.senha = senha;

    try {
        await DB.saveUsuario(u);
    } catch (error) {
        UI.toast(error.message || 'Erro ao salvar usuario.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: id ? 'Editou usuario' : 'Criou usuario', detalhe: email });

    UI.toast('Usuario salvo!', 'success');
    UI.closeModal('modalUsuario');
    renderTabela();
}

async function excluirUsuario(id) {
    const u = DB.getUsuarios().find((x) => x.id === id);
    if (!u) return;

    if (u.email === 'admin@escritorio.com') {
        UI.toast('Nao e possivel excluir o admin padrao.', 'error');
        return;
    }

    if (u.id === Auth.currentUser()?.id) {
        UI.toast('Voce nao pode se excluir.', 'error');
        return;
    }

    const ok = await UI.confirm(`Deseja excluir o usuario ${u.nome}?`, 'Excluir usuario');
    if (!ok) return;

    try {
        await DB.deleteUsuario(id);
    } catch (error) {
        UI.toast(error.message || 'Erro ao excluir usuario.', 'error');
        return;
    }

    DB.addLog({ usuario: Auth.currentUser()?.email, acao: 'Excluiu usuario', detalhe: u.email });
    UI.toast('Usuario excluido.', 'success');
    renderTabela();
}
