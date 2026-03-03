/* ===================================================
   UI.JS – Helpers de interface
   =================================================== */

const UI = {
    // ---------- TOAST ----------
    toast(msg, type = 'info', duration = 3500) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
        container.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(20px)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, duration);
    },

    // ---------- MODAL ----------
    openModal(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
    },

    closeModal(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
    },

    closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
    },

    // ---------- CONFIRM DIALOG ----------
    confirm(msg, title = 'Confirmar ação') {
        return new Promise(resolve => {
            const id = 'confirmModal';
            let el = document.getElementById(id);
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                el.className = 'modal-overlay';
                el.innerHTML = `
          <div class="modal modal-sm">
            <div class="modal-header">
              <span class="modal-title" id="confirmTitle"></span>
              <button class="modal-close" onclick="UI.closeModal('confirmModal')">×</button>
            </div>
            <div class="modal-body">
              <div class="confirm-dialog">
                <div class="confirm-icon">⚠️</div>
                <p id="confirmMsg"></p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="confirmNo">Cancelar</button>
              <button class="btn btn-danger" id="confirmYes">Confirmar</button>
            </div>
          </div>`;
                document.body.appendChild(el);
            }
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMsg').textContent = msg;
            this.openModal(id);
            document.getElementById('confirmYes').onclick = () => { this.closeModal(id); resolve(true); };
            document.getElementById('confirmNo').onclick = () => { this.closeModal(id); resolve(false); };
        });
    },

    // ---------- SIDEBAR ----------
    initSidebar() {
        // Fechar ao clicar overlay em mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar) return;
            if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !e.target.closest('#menuToggle')) {
                sidebar.classList.remove('open');
            }
        });

        // Botão hamburger
        const toggle = document.getElementById('menuToggle');
        if (toggle) toggle.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        });

        // Marcar link ativo
        const current = location.pathname.split('/').pop() || 'dashboard.html';
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.href === current) item.classList.add('active');
            item.addEventListener('click', () => { window.location.href = item.dataset.href; });
        });
    },

    initLogout() {
        const btn = document.getElementById('btnLogout');
        if (btn) btn.addEventListener('click', () => Auth.logout());
    },

    // ---------- FORMATTING ----------
    currency(val) {
        return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    date(iso) {
        if (!iso) return '—';
        const [y, m, d] = iso.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
    },

    dateInput(iso) {
        return iso ? iso.split('T')[0] : '';
    },

    today() {
        return new Date().toISOString().split('T')[0];
    },

    relativeDate(iso) {
        if (!iso) return '—';
        const diff = Date.now() - new Date(iso).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Hoje';
        if (days === 1) return 'Ontem';
        if (days < 30) return `${days} dias atrás`;
        if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
        return `${Math.floor(days / 365)} anos atrás`;
    },

    statusCobranca(c) {
        const hoje = UI.today();
        if (c.status === 'pago') return { label: 'Pago', css: 'badge-success' };
        if (c.vencimento < hoje) return { label: 'Vencido', css: 'badge-danger' };
        return { label: 'Pendente', css: 'badge-warning' };
    },

    maskCpfCnpj(v) {
        v = v.replace(/\D/g, '');
        if (v.length <= 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    },

    maskPhone(v) {
        v = v.replace(/\D/g, '');
        if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    },

    escHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    initMasks() {
        document.querySelectorAll('[data-mask="cpfcnpj"]').forEach(el => {
            el.addEventListener('input', (e) => { e.target.value = UI.maskCpfCnpj(e.target.value); });
        });
        document.querySelectorAll('[data-mask="phone"]').forEach(el => {
            el.addEventListener('input', (e) => { e.target.value = UI.maskPhone(e.target.value); });
        });
    },

    // ---------- TABLE EMPTY ----------
    emptyRow(cols, msg = 'Nenhum registro encontrado') {
        return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--text-muted)">${msg}</td></tr>`;
    },

    // ---------- NOME ABREVIADO ----------
    initials(name) {
        return (name || '?').split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
    },

    // ---------- CLIENTE SELECT OPTIONS ----------
    clienteOptions(selectedId = '') {
        return DB.getClientes()
            .filter(c => c.status === 'ativo')
            .map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${UI.escHtml(c.nome)}</option>`)
            .join('');
    },

    clienteNome(id) {
        const c = DB.getCliente(id);
        return c ? c.nome : '—';
    }
};

// Fechar modais ao clicar no overlay
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) UI.closeAllModals();
});
