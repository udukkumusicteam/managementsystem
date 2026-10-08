import { WebsiteSubmissionsService } from '../services/websiteSubmissionsService.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';

/**
 * Website Submissions Component (final, 7 Oct 2026)
 * Mirrors the udukkumusic.com admin dashboard: one tab per form the site
 * collects (session bookings, contact, corporate, city requests), with
 * search, status filter and the same New / Contacted / Closed flow.
 * Works in both cloud and local mode — the site's project uses a public key.
 */
export const WebsiteSubmissions = {
    _table: 'session_bookings',
    _rows: [],
    _counts: {},
    _openId: null,
    _search: '',
    _statusFilter: 'all',

    esc(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    init() {
        document.getElementById('btn-ws-refresh')?.addEventListener('click', () => this.load());
        this.load();
    },

    async load() {
        const body = document.getElementById('ws-body');
        const summary = document.getElementById('ws-summary');
        if (!body) return;
        body.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Loading…</h3></div>';
        if (summary) summary.innerHTML = '';

        if (!WebsiteSubmissionsService.isReady()) {
            body.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Supabase not available</h3><p>The Supabase library didn\'t load — refresh the page.</p></div>';
            return;
        }

        try {
            this._counts = await WebsiteSubmissionsService.counts();
            this._rows = await WebsiteSubmissionsService.list(this._table);
        } catch (e) {
            if (e.message === 'NO_TABLE') {
                body.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Table not found</h3><p>One of the website tables is missing — check the website project\'s Table Editor.</p></div>';
                return;
            }
            body.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Couldn't load submissions</h3>
                    <p>${this.esc(e.message)}</p>
                    <button class="btn btn-primary" id="ws-retry">Try Again</button>
                </div>`;
            document.getElementById('ws-retry')?.addEventListener('click', () => this.load());
            return;
        }

        this.render();
    },

    async switchTable(t) {
        if (t === this._table) return;
        this._table = t;
        this._openId = null;
        try {
            this._rows = await WebsiteSubmissionsService.list(t);
        } catch (e) {
            UI.showToast('Couldn\'t load that table — ' + e.message, 'error');
            return;
        }
        this.render();
    },

    _matches(r, cfg) {
        if (this._statusFilter !== 'all') {
            if (String(r.status || 'new').toLowerCase() !== this._statusFilter.toLowerCase()) return false;
        }
        const q = this._search.trim().toLowerCase();
        if (!q) return true;
        const hay = Object.values(r)
            .filter(v => typeof v !== 'object' && v !== null)
            .join(' ')
            .toLowerCase();
        return hay.includes(q);
    },

    render() {
        const body = document.getElementById('ws-body');
        const summary = document.getElementById('ws-summary');
        if (!body) return;
        const cfg = WebsiteSubmissionsService.TABLES[this._table];

        // Tabs — one per website form, with row counts
        summary.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                ${Object.keys(WebsiteSubmissionsService.TABLES).map(t => {
                    const c = WebsiteSubmissionsService.TABLES[t];
                    const n = this._counts[t];
                    const active = t === this._table;
                    return `
                    <button data-ws-tab="${t}" style="border:1px solid ${active ? 'var(--vivid-brown)' : 'var(--cream-dark)'};background:${active ? 'var(--vivid-brown)' : 'var(--white)'};color:${active ? '#fff' : 'var(--dark-azure)'};border-radius:999px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">
                        ${c.icon} ${c.label}${n !== null && n !== undefined ? ` <span style="opacity:.75">(${n})</span>` : ''}
                    </button>`;
                }).join('')}
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <input type="search" id="ws-search" class="form-control" style="flex:1;min-width:180px"
                    placeholder="Search name, phone, message, any field…" value="${this.esc(this._search)}">
                <select id="ws-status-filter" class="form-control" style="width:auto">
                    <option value="all"${this._statusFilter === 'all' ? ' selected' : ''}>All statuses</option>
                    ${WebsiteSubmissionsService.STATUSES.map(s => `
                        <option value="${s}"${this._statusFilter === s ? ' selected' : ''}>${s}</option>
                    `).join('')}
                </select>
            </div>`;

        summary.querySelectorAll('[data-ws-tab]').forEach(b => {
            b.addEventListener('click', () => this.switchTable(b.dataset.wsTab));
        });
        const searchEl = document.getElementById('ws-search');
        if (searchEl) {
            searchEl.addEventListener('input', () => {
                this._search = searchEl.value;
                this._renderTableOnly(cfg);
            });
        }
        const statusEl = document.getElementById('ws-status-filter');
        if (statusEl) {
            statusEl.addEventListener('change', () => {
                this._statusFilter = statusEl.value;
                this._renderTableOnly(cfg);
            });
        }

        this._renderTableOnly(cfg);
    },

    _renderTableOnly(cfg) {
        const body = document.getElementById('ws-body');
        if (!body) return;

        const rows = this._rows.filter(r => this._matches(r, cfg));

        if (this._rows.length === 0) {
            body.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${cfg.icon}</div>
                    <h3>Nothing here yet</h3>
                    <p>When the website form for <strong>${cfg.label}</strong> is sent, it appears here.</p>
                </div>`;
            return;
        }

        if (rows.length === 0) {
            body.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No matches</h3>
                    <p>Nothing matches your search/filter — clear it to see all ${this._rows.length}.</p>
                </div>`;
            return;
        }

        const openRow = this._openId ? rows.find(r => r.id === this._openId) : null;

        body.innerHTML = `
            ${openRow ? this._detailHTML(cfg, openRow) : ''}
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th><th>Contact</th><th>${this.esc(this._labelFor(cfg.subjectKey))}</th><th>Message</th><th>Date</th>${cfg.hasStatus ? '<th>Status</th>' : ''}<th></th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => {
                        const name = r[cfg.nameKey] || '—';
                        const formType = cfg.formTypeKey && r[cfg.formTypeKey] ? r[cfg.formTypeKey] : '';
                        const contact = (cfg.contactKeys || []).map(k => r[k]).filter(Boolean);
                        const subject = cfg.subjectKey ? (r[cfg.subjectKey] || '—') : '—';
                        const msg = cfg.messageKey && r[cfg.messageKey]
                            ? (String(r[cfg.messageKey]).length > 80 ? String(r[cfg.messageKey]).slice(0, 80) + '…' : r[cfg.messageKey])
                            : '—';
                        return `
                        <tr data-id="${r.id}" style="cursor:pointer">
                            <td>
                                <div style="display:flex;align-items:center;gap:10px">
                                    <div class="tutor-avatar" style="width:34px;height:34px;font-size:12px">${Formatters.initials(name)}</div>
                                    <div>
                                        <strong>${this.esc(name)}</strong>
                                        ${formType ? `<div style="font-size:11px;color:var(--brown-light)">${this.esc(formType)}</div>` : ''}
                                    </div>
                                </div>
                            </td>
                            <td>
                                ${contact[0] ? `<div>${this.esc(contact[0])}</div>` : ''}
                                ${contact[1] ? `<div style="font-size:12px;color:var(--brown-light)">${this.esc(contact[1])}</div>` : ''}
                            </td>
                            <td><span class="badge badge-orange">${this.esc(subject)}</span></td>
                            <td style="max-width:260px">${this.esc(msg)}</td>
                            <td style="color:var(--brown-light);font-size:13px;white-space:nowrap">${Formatters.date(r._date)}</td>
                            ${cfg.hasStatus ? `<td>${this._statusBadge(r.status)}</td>` : ''}
                            <td>
                                <div class="table-actions">
                                    <button class="icon-btn" title="Open" data-action="open" data-id="${r.id}">👁️</button>
                                    <button class="icon-btn" title="Start pricing estimate" data-action="quote" data-id="${r.id}">🧾</button>
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            </div>`;

        body.querySelectorAll('tr[data-id]').forEach(tr => {
            tr.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                this._openId = tr.dataset.id;
                this._renderTableOnly(cfg);
            });
        });
        body.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (btn.dataset.action === 'open') {
                    this._openId = this._openId === id ? null : id;
                    this._renderTableOnly(cfg);
                } else if (btn.dataset.action === 'quote') {
                    this.startQuotation(id);
                }
            });
        });

        const detailQuoteBtn = document.getElementById('ws-quote-btn');
        if (detailQuoteBtn) {
            detailQuoteBtn.addEventListener('click', () => this.startQuotation(detailQuoteBtn.dataset.id));
        }

        const markBtn = document.getElementById('ws-mark-btn');
        if (markBtn) {
            markBtn.addEventListener('click', async () => {
                const { id, next } = markBtn.dataset;
                markBtn.disabled = true;
                try {
                    await WebsiteSubmissionsService.setStatus(this._table, id, next);
                    UI.showToast('Status → ' + next, 'success');
                    this._rows = await WebsiteSubmissionsService.list(this._table);
                    this._counts = await WebsiteSubmissionsService.counts();
                    this.render();
                } catch (err) {
                    UI.showToast('Couldn\'t update status — ' + err.message, 'error');
                    markBtn.disabled = false;
                }
            });
        }
    },

    _labelFor(key) {
        const known = {
            instrument: 'Course', subject: 'Subject', company_name: 'Company',
            city: 'City', event: 'Event', event_interest: 'Interested In'
        };
        return known[key] || (key || 'Details').replace(/_/g, ' ');
    },

    _pretty(key) {
        return key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
    },

    _detailHTML(cfg, r) {
        const status = String(r.status || 'new').toLowerCase();
        const markBtn = status === 'new'
            ? { label: '✓ Mark as Contacted', next: 'Contacted' }
            : status === 'contacted'
                ? { label: '✅ Mark as Closed', next: 'Closed' }
                : { label: '↩️ Mark as New', next: 'New' };
        const fields = Object.keys(r)
            .filter(k => !['id', 'created_at', 'status', '_date'].includes(k) && r[k] !== null && r[k] !== '');
        return `
        <div class="card ws-detail">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
                <h3>📨 ${this.esc(r[cfg.nameKey] || 'Enquiry')} ${this._statusBadge(r.status)}</h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    ${cfg.hasStatus ? `<button class="btn btn-primary btn-sm" id="ws-mark-btn" data-id="${r.id}" data-next="${markBtn.next}">${markBtn.label}</button>` : ''}
                    <button class="btn btn-secondary btn-sm" id="ws-quote-btn" data-id="${r.id}">🧾 Start Pricing Estimate</button>
                </div>
            </div>
            <div class="card-body">
                <div class="ws-detail-grid">
                    ${fields.map(k => `
                        <div>
                            <span class="meta-label">${this.esc(this._pretty(k))}</span>
                            <div style="white-space:pre-wrap">${this.esc(String(r[k]))}</div>
                        </div>
                    `).join('')}
                    <div><span class="meta-label">Received</span><div>${Formatters.dateLong(r._date)}</div></div>
                </div>
            </div>
        </div>`;
    },

    _statusBadge(status) {
        const s = String(status || 'new').toLowerCase();
        if (s === 'contacted') return '<span class="status-badge status-signed">✓ Contacted</span>';
        if (s === 'closed') return '<span class="status-badge status-signed">✅ Closed</span>';
        return '<span class="status-badge status-pending">🆕 New</span>';
    },

    startQuotation(id) {
        const cfg = WebsiteSubmissionsService.TABLES[this._table];
        const r = this._rows.find(x => x.id === id);
        if (!r) return;
        const contacts = (cfg.contactKeys || []).map(k => r[k]).filter(Boolean).map(String);
        const sub = {
            name: r[cfg.nameKey] || '',
            phone: contacts.find(v => !v.includes('@')) || '',
            email: contacts.find(v => v.includes('@')) || '',
            city: r.city || '',
            state: r.state || ''
        };
        import('./dashboard.js').then(m => m.Dashboard.navigateTo('quotations'));
        setTimeout(async () => {
            const { Quotations } = await import('./quotations.js');
            Quotations.startNew();
            Quotations.prefillClient(sub);
            UI.showToast(`Pricing estimate form filled for ${sub.name || 'the new client'} 🧾`, 'success');
        }, 250);
    }
};
