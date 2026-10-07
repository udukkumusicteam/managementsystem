import { Store } from '../state/store.js';
import { TutorService } from '../services/tutorService.js';
import { QuotationService } from '../services/quotationService.js';
import { QuotationPdfService } from '../services/quotationPdfService.js';
import { Config } from '../config.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';

/**
 * Quotations Component — client quotations with live, fully-editable pricing.
 * Every input is editable and every dependent value recalculates instantly.
 */
export const Quotations = {
    editingId: null,
    lastQuotation: null,
    _gstMode: 'intra',

    esc(s) {
        return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    init() {
        this.bindPageEvents();
        this.startNew();
        this.renderHistory();
    },

    bindPageEvents() {
        document.getElementById('btn-new-quotation')?.addEventListener('click', () => {
            this.startNew();
            window.scrollTo(0, 0);
        });
    },

    /* =============== DRAFT / FORM =============== */

    startNew() {
        this.editingId = null;
        this.lastQuotation = null;
        this._gstMode = 'intra';

        const formBody = document.getElementById('quote-form-body');
        if (formBody) formBody.innerHTML = this.getFormHTML();

        const layout = document.getElementById('quote-layout');
        const success = document.getElementById('quote-success');
        if (layout) layout.style.display = 'grid';
        if (success) success.classList.remove('active');

        const newBtn = document.getElementById('btn-new-quotation');
        if (newBtn) newBtn.innerHTML = '✨ New Quotation';

        this.populateTutors();
        this.addPackageRow(6, 2);
        this.addPackageRow(10, 4);
        this.addPackageRow(20, 8);
        this.bindFormEvents();
        this.setGstMode(this._gstMode);
        this.renderPreview();
    },

    // Fill the client fields from a website submission (Website Submissions
    // page → "Start Quotation"). Called right after startNew().
    prefillClient(sub) {
        const set = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v || '';
        };
        set('q-client-name', sub.name);
        set('q-client-phone', sub.phone);
        set('q-client-email', sub.email);
        set('q-client-city', sub.city);
        set('q-client-state', sub.state);
        this.renderPreview();
    },

    getFormHTML() {
        return `
            <div class="section-title">Client</div>
            <div class="form-group">
                <label class="form-label">Client Name *</label>
                <input type="text" class="form-control" id="q-client-name" placeholder="e.g. Aditya Sharma">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="text" class="form-control" id="q-client-phone" placeholder="e.g. 98XXX XXXXX">
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" id="q-client-email" placeholder="e.g. name@email.com">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">City</label>
                    <input type="text" class="form-control" id="q-client-city" placeholder="e.g. Jaipur">
                </div>
                <div class="form-group">
                    <label class="form-label">State <span class="label-hint">(drives GST mode)</span></label>
                    <input type="text" class="form-control" id="q-client-state" placeholder="e.g. Rajasthan">
                </div>
            </div>

            <div class="form-section-divider"></div>
            <div class="section-title">Service</div>
            <div class="form-group">
                <label class="form-label">Tutor</label>
                <select class="form-control" id="q-tutor">
                    <option value="">Select Tutor</option>
                </select>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label class="form-label">Subject / Instrument</label>
                    <select class="form-control" id="q-subject">
                        <option value="">Select Subject</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Base Rate (per hr, excl. GST) *</label>
                    <input type="number" class="form-control" id="q-base-rate" placeholder="e.g. 650" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Currency</label>
                    <select class="form-control" id="q-currency">
                        ${Formatters.currencyOptionsHTML()}
                    </select>
                </div>
            </div>
            <p class="form-hint">Base rate auto-fills from the subject profile — edit freely, every total updates.</p>

            <div class="form-section-divider"></div>
            <div class="section-title">Packages</div>
            <p class="form-hint" style="margin-bottom:10px">Hours and discount % are both editable — discounted rate and totals recalculate as you type.</p>
            <div class="packages-container" id="q-packages"></div>
            <button type="button" class="btn btn-ghost btn-sm" id="q-add-package">+ Add Package</button>

            <div class="form-section-divider"></div>
            <div class="section-title">GST</div>
            <div class="gst-modes" id="q-gst-modes">
                <button type="button" class="gst-mode" data-mode="intra">
                    <strong>Rajasthan client</strong>
                    <span>CGST + SGST (intra-state)</span>
                </button>
                <button type="button" class="gst-mode" data-mode="inter">
                    <strong>Other state</strong>
                    <span>IGST (inter-state)</span>
                </button>
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label class="form-label">CGST %</label>
                    <input type="number" class="form-control" id="q-gst-cgst" value="9" min="0" step="0.5">
                </div>
                <div class="form-group">
                    <label class="form-label">SGST %</label>
                    <input type="number" class="form-control" id="q-gst-sgst" value="9" min="0" step="0.5">
                </div>
                <div class="form-group">
                    <label class="form-label">IGST %</label>
                    <input type="number" class="form-control" id="q-gst-igst" value="18" min="0" step="0.5">
                </div>
            </div>
            <p class="form-hint">GST mode is set automatically from the client's state — you can override either the mode or the rates.</p>

            <div class="form-section-divider"></div>
            <div class="section-title">Terms</div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Valid For (days)</label>
                    <input type="number" class="form-control" id="q-valid-days" value="7" min="0">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Note to Client</label>
                <textarea class="form-control" id="q-note" rows="2" placeholder="Optional personal note — appears in the PDF"></textarea>
            </div>

            <button class="btn btn-primary btn-lg" id="btn-save-quotation" style="width:100%">
                🧾 Save &amp; Download Quotation PDF
            </button>
        `;
    },

    populateTutors() {
        const sel = document.getElementById('q-tutor');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">Select Tutor</option>';
        TutorService.getAllTutors().forEach(t => {
            const o = document.createElement('option');
            o.value = t.id;
            o.textContent = t.name;
            sel.appendChild(o);
        });
        if (cur) sel.value = cur;
    },

    onTutorChange() {
        const tutorId = document.getElementById('q-tutor')?.value;
        const subjSel = document.getElementById('q-subject');
        if (!subjSel) return;

        const cur = subjSel.value;
        subjSel.innerHTML = '<option value="">Select Subject</option>';
        document.getElementById('q-base-rate').value = '';

        if (tutorId) {
            TutorService.getSubjects(tutorId).forEach(s => {
                const o = document.createElement('option');
                o.value = s.id;
                o.textContent = s.name;
                subjSel.appendChild(o);
            });
            if (cur) subjSel.value = cur;
        }
        this.onSubjectChange();
    },

    onSubjectChange() {
        const tutorId = document.getElementById('q-tutor')?.value;
        const subjId = document.getElementById('q-subject')?.value;
        if (tutorId && subjId) {
            const s = TutorService.getSubject(tutorId, subjId);
            if (s) document.getElementById('q-base-rate').value = s.rate;
        }
        this.renderPreview();
    },

    addPackageRow(hours = '', discount = '') {
        const container = document.getElementById('q-packages');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'pkg-row';
        row.innerHTML = `
            <input type="number" class="form-control pkg-hours" placeholder="Hours" min="1" step="1" value="${hours}">
            <span class="pkg-unit">hrs</span>
            <input type="number" class="form-control pkg-disc" placeholder="Disc %" min="0" max="100" step="0.5" value="${discount}">
            <span class="pkg-unit">%</span>
            <div class="pkg-calc">
                <div class="pkg-calc-rate">—</div>
                <div class="pkg-calc-total">—</div>
            </div>
            <button type="button" class="icon-btn pkg-remove" title="Remove package">🗑️</button>
        `;
        row.querySelector('.pkg-remove').addEventListener('click', () => {
            const rows = container.querySelectorAll('.pkg-row');
            if (rows.length > 1) {
                row.remove();
                this.renderPreview();
            } else {
                UI.showToast('At least one package is required', 'error');
            }
        });
        container.appendChild(row);
        this.renderPreview();
    },

    bindFormEvents() {
        const val = id => document.getElementById(id)?.value ?? '';

        ['q-client-name', 'q-client-phone', 'q-client-email', 'q-client-city'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.renderPreview());
        });

        document.getElementById('q-client-state')?.addEventListener('input', () => {
            const mode = QuotationService.gstModeForState(val('q-client-state'), this._gstMode);
            this.setGstMode(mode);
            this.renderPreview();
        });

        document.getElementById('q-tutor')?.addEventListener('change', () => this.onTutorChange());
        document.getElementById('q-subject')?.addEventListener('change', () => this.onSubjectChange());
        document.getElementById('q-base-rate')?.addEventListener('input', () => this.renderPreview());
        document.getElementById('q-currency')?.addEventListener('change', () => this.renderPreview());

        // Delegated: covers package rows added later too
        document.getElementById('q-packages')?.addEventListener('input', (e) => {
            if (e.target.matches('input')) this.renderPreview();
        });
        document.getElementById('q-add-package')?.addEventListener('click', () => this.addPackageRow());

        document.querySelectorAll('#q-gst-modes .gst-mode').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setGstMode(btn.dataset.mode);
                this.renderPreview();
            });
        });
        ['q-gst-cgst', 'q-gst-sgst', 'q-gst-igst'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.renderPreview());
        });

        ['q-valid-days', 'q-note'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.renderPreview());
        });

        document.getElementById('btn-save-quotation')?.addEventListener('click', () => this.saveQuotation());
    },

    setGstMode(mode) {
        this._gstMode = mode;
        document.querySelectorAll('#q-gst-modes .gst-mode').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
        });
    },

    readForm() {
        const val = id => document.getElementById(id)?.value ?? '';
        const tutorId = val('q-tutor');
        const tutor = tutorId ? TutorService.getTutor(tutorId) : null;
        const subjId = val('q-subject');
        const subject = (tutorId && subjId) ? TutorService.getSubject(tutorId, subjId) : null;

        return {
            client: {
                name: val('q-client-name'),
                phone: val('q-client-phone'),
                email: val('q-client-email'),
                city: val('q-client-city'),
                state: val('q-client-state')
            },
            tutorId,
            tutorName: tutor?.name || '',
            subjectId: subjId,
            subject: subject?.name || '',
            baseRate: val('q-base-rate'),
            currency: val('q-currency') || 'INR',
            packages: Array.from(document.getElementById('q-packages')?.querySelectorAll('.pkg-row') || []).map(row => ({
                hours: row.querySelector('.pkg-hours')?.value ?? '',
                discountPct: row.querySelector('.pkg-disc')?.value ?? ''
            })),
            gstMode: this._gstMode,
            gstRates: {
                cgst: val('q-gst-cgst'),
                sgst: val('q-gst-sgst'),
                igst: val('q-gst-igst')
            },
            validDays: val('q-valid-days'),
            note: val('q-note')
        };
    },

    /* =============== LIVE PREVIEW =============== */

    renderPreview() {
        const container = document.getElementById('quote-preview');
        if (!container) return;

        const data = this.readForm();
        const cur = data.currency || 'INR';
        const calc = QuotationService.calculateAll({
            baseRate: data.baseRate,
            gstMode: data.gstMode,
            gstRates: data.gstRates,
            packages: data.packages
        });

        // Per-row calculation chips
        const rows = document.getElementById('q-packages')?.querySelectorAll('.pkg-row') || [];
        rows.forEach((row, i) => {
            const c = calc[i];
            if (!c) return;
            row.querySelector('.pkg-calc-rate').textContent =
                c.discountedRate ? Formatters.money(c.discountedRate, cur) + '/hr' : '—';
            row.querySelector('.pkg-calc-total').textContent =
                c.subtotal ? Formatters.money(c.subtotal, cur) : '—';
        });

        const num = this.editingId
            ? (Store.getQuotationById(this.editingId)?.number || '—')
            : Store.nextQuotationNumber();
        const gst = QuotationService.gstLabel({ gstMode: data.gstMode, gstRates: data.gstRates });
        const locLine = [data.client.city, data.client.state].filter(Boolean).join(', ');
        const logoUrl = QuotationPdfService.quoteLogoDataUrl() || 'assets/images/logo.png';
        const C = QuotationPdfService.CONTACT;

        container.innerHTML = `
            <style>
                .q-prev-band img { background: transparent; padding: 0; border-radius: 0; height: 30px; width: auto; }
                .q-prev-hero { color: #fff; font-weight: 800; font-size: 14px; line-height: 1.3; }
                .q-prev-card { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0 14px; background: #fff; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; align-items: center; }
                .q-prev-card .q-prev-block { background: transparent; padding: 0; }
                .q-prev-div { align-self: stretch; background: rgba(8, 32, 50, 0.12); }
                .q-prev-tutor { font-size: 12px; font-weight: 700; color: var(--dark-azure); margin-bottom: 2px; }
                /* 27 Sep 2026: only the pre-GST amounts are green — no column fill */
                .q-prev-table td.q-subt { color: #15803D; font-weight: 700; }
                /* 27 Sep 2026: total column is the hero number — bold, dark, slightly larger */
                .q-prev-table .q-total { color: var(--dark-azure); font-weight: 800; font-size: 13px; }
                /* 27 Sep 2026: closing line sits under the table, not in the footer */
                .q-prev-close-line { margin: 16px 0 0; text-align: center; color: var(--vivid-brown); font-weight: 700; font-size: 14px; }
                /* 27 Sep 2026: footer = name/title left, all contacts in one horizontal row right */
                .q-prev-footer { margin-top: 12px; background: var(--vivid-brown); border-radius: 10px; padding: 12px 14px; display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: center; }
                .q-prev-f-name { color: #fff; font-weight: 700; font-size: 12px; }
                .q-prev-f-sub { color: rgba(255, 241, 197, 0.85); font-size: 10px; margin-top: 1px; }
                .q-prev-f-right { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 6px 16px; color: rgba(255, 241, 197, 0.85); font-size: 10px; }
                .q-prev-f-right b { color: #fff; }
                .q-prev-f-right .frow { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
                .q-prev-f-right svg { width: 11px; height: 11px; stroke: rgba(255, 241, 197, 0.9); fill: none; stroke-width: 1.7; flex: 0 0 auto; }
                @media (max-width: 640px) {
                    .q-prev-footer { grid-template-columns: 1fr; text-align: center; }
                    .q-prev-f-right { justify-content: center; }
                }
            </style>
            <div class="q-prev-band">
                <img src="${logoUrl}" alt="Udukku Music Education">
                <div class="q-prev-band-right">
                    <div class="q-prev-hero">${this.esc(data.subject) || 'Subject'}${data.tutorName ? ' with ' + this.esc(data.tutorName) : ''}</div>
                    <div class="q-prev-no">Date: ${Formatters.dateLong(Date.now())}</div>
                </div>
            </div>
            <div class="q-prev-card">
                <div class="q-prev-block">
                    <div class="q-prev-name">${this.esc(data.client.name.trim()) || 'Client name'}</div>
                    <div class="q-prev-line">${this.esc(locLine) || '—'}</div>
                    ${data.client.phone ? `<div class="q-prev-line">${this.esc(data.client.phone)}</div>` : ''}
                    ${data.client.email ? `<div class="q-prev-line">${this.esc(data.client.email)}</div>` : ''}
                </div>
                <div class="q-prev-div"></div>
                <div class="q-prev-block">
                    <div class="q-prev-tutor">Tutor: ${this.esc(data.tutorName) || '—'}</div>
                    <div class="q-prev-tutor">Course: ${this.esc(data.subject) || '—'}</div>
                    <div class="q-prev-line">Base rate: ${data.baseRate ? Formatters.money(data.baseRate, cur) : '—'}/hr (excl. GST)</div>
                    <div class="q-prev-line">GST: ${this.esc(gst)}</div>
                </div>
            </div>
            <table class="q-prev-table">
                <thead>
                    <tr><th>Pkg</th><th>Disc</th><th>Rate/hr</th><th class="q-subt">Subtotal (excl. GST)</th><th>GST</th><th>Total (incl. GST)</th></tr>
                </thead>
                <tbody>
                    ${calc.map(c => `
                        <tr>
                            <td>${c.hours || '?'} hrs</td>
                            <td>${this.esc(c.discountPct)}%</td>
                            <td>${c.discountedRate ? Formatters.money(c.discountedRate, cur) : '—'}</td>
                            <td class="q-subt">${c.subtotal ? Formatters.money(c.subtotal, cur) : '—'}</td>
                            <td>${Formatters.money(c.gstTotal, cur)}</td>
                            <td class="q-total">${Formatters.money(c.total, cur)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
            ${data.note.trim() ? `<div class="q-prev-note">${this.esc(data.note)}</div>` : ''}
            <div class="q-prev-close-line">We look forward to helping you begin your musical journey.</div>
            <div class="q-prev-footer">
                <div class="q-prev-f-mid">
                    <div class="q-prev-f-name">${Config.admin.name}</div>
                    <div class="q-prev-f-sub">${Config.admin.title}, ${Config.admin.company}</div>
                </div>
                <div class="q-prev-f-right">
                    <span class="frow"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2.5"/><line x1="10.5" y1="5.5" x2="13.5" y2="5.5"/><circle cx="12" cy="18.5" r="0.8" fill="rgba(255,241,197,0.9)" stroke="none"/></svg><b>${C.phoneDisplay}</b></span>
                    <span class="frow"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/></svg>${C.website}</span>
                    <span class="frow"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.3" cy="6.7" r="1.1" fill="rgba(255,241,197,0.9)" stroke="none"/></svg>@${C.instagramHandle}</span>
                    <span class="frow"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.8 7.6 12 13.4l8.2-5.8"/></svg>${Config.admin.email}</span>
                </div>
            </div>
        `;
    },

    /* =============== SAVE / SUCCESS =============== */

    saveQuotation() {
        const data = this.readForm();

        if (!data.client.name.trim()) { UI.showToast('Please enter the client name', 'error'); return; }
        if (!data.tutorId) { UI.showToast('Please select a tutor', 'error'); return; }
        if (!data.subjectId) { UI.showToast('Please select a subject', 'error'); return; }
        if (!(parseFloat(data.baseRate) > 0)) { UI.showToast('Please enter a valid base rate', 'error'); return; }
        if (!data.packages.some(p => parseFloat(p.hours) > 0)) {
            UI.showToast('Please add at least one package with hours', 'error');
            return;
        }

        let saved = null;
        if (this.editingId) {
            saved = QuotationService.update(this.editingId, data);
            if (saved) UI.showToast('Quotation updated! ✅', 'success');
        } else {
            saved = QuotationService.create(data);
            if (saved) UI.showToast('Quotation created! 🎉', 'success');
        }

        if (!saved) {
            UI.showToast('Failed to save quotation', 'error');
            return;
        }

        this.lastQuotation = saved;
        this.showSuccess();
        this.renderHistory();
        import('./dashboard.js').then(m => m.Dashboard.refresh());
    },

    showSuccess() {
        const q = this.lastQuotation;
        if (!q) return;

        document.getElementById('quote-layout').style.display = 'none';
        const success = document.getElementById('quote-success');
        success.classList.add('active');

        document.getElementById('quote-success-message').textContent =
            `Quotation ${q.number} for ${q.client.name} — ${q.subject} with ${q.tutorName} — has been saved.`;

        const actions = document.getElementById('quote-success-actions');
        actions.innerHTML = `
            <button class="btn btn-primary" id="btn-q-download">🧾 Download PDF</button>
            <button class="btn btn-secondary" id="btn-q-edit">✏️ Edit Quotation</button>
            <button class="btn btn-ghost" id="btn-q-new">➕ New Quotation</button>
        `;
        document.getElementById('btn-q-download').addEventListener('click', () => this.downloadPdf());
        document.getElementById('btn-q-edit').addEventListener('click', () => this.loadForEdit(q.id));
        document.getElementById('btn-q-new').addEventListener('click', () => {
            this.startNew();
            window.scrollTo(0, 0);
        });
    },

    async downloadPdf(quote) {
        const q = quote || this.lastQuotation;
        if (!q) return;
        const { QuotationPdfService } = await import('../services/quotationPdfService.js');
        QuotationPdfService.generate(q);
    },

    /* =============== EDIT / DELETE =============== */

    loadForEdit(id) {
        const q = Store.getQuotationById(id);
        if (!q) return;

        this.startNew();
        this.editingId = id;
        this.lastQuotation = q;

        const set = (idEl, v) => {
            const el = document.getElementById(idEl);
            if (el) el.value = v ?? '';
        };

        set('q-client-name', q.client.name);
        set('q-client-phone', q.client.phone);
        set('q-client-email', q.client.email);
        set('q-client-city', q.client.city);
        set('q-client-state', q.client.state);

        document.getElementById('q-tutor').value = q.tutorId;
        this.onTutorChange();

        setTimeout(() => {
            document.getElementById('q-subject').value = q.subjectId;
            this.onSubjectChange();
            set('q-base-rate', q.baseRate);
            set('q-currency', q.currency || 'INR');
        }, 0);

        const container = document.getElementById('q-packages');
        container.innerHTML = '';
        q.packages.forEach(p => this.addPackageRow(p.hours, p.discountPct));

        this.setGstMode(q.gstMode);
        set('q-gst-cgst', q.gstRates.cgst);
        set('q-gst-sgst', q.gstRates.sgst);
        set('q-gst-igst', q.gstRates.igst);
        set('q-valid-days', q.validDays);
        set('q-note', q.note);

        document.getElementById('quote-layout').style.display = 'grid';
        document.getElementById('quote-success').classList.remove('active');
        document.getElementById('btn-new-quotation').innerHTML = '✨ New Quotation';
        document.querySelector('#page-quotations .page-header h2').textContent = 'Edit Quotation';

        this.renderPreview();
        window.scrollTo(0, 0);
    },

    deleteQuotation(id) {
        const q = Store.getQuotationById(id);
        if (!q) return;
        UI.showConfirm(
            'Delete Quotation',
            `Delete quotation ${q.number} for ${q.client.name}? This cannot be undone.`,
            () => {
                if (Store.deleteQuotation(id)) {
                    UI.showToast('Quotation deleted', 'success');
                    if (this.editingId === id) this.startNew();
                    this.renderHistory();
                } else {
                    UI.showToast('Failed to delete quotation', 'error');
                }
            }
        );
    },

    /* =============== HISTORY =============== */

    renderHistory() {
        const container = document.getElementById('quotations-history');
        if (!container) return;

        const quotes = Store.getQuotations().sort((a, b) => b.createdAt - a.createdAt);

        if (quotes.length === 0) {
            UI.showEmptyState(container, '🧾', 'No quotations yet', 'Create your first client quotation above.');
            return;
        }

        container.innerHTML = `
            <div style="overflow-x:auto">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>No.</th><th>Client</th><th>Service</th><th>Packages</th><th>GST</th><th>Created</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${quotes.map(q => `
                        <tr data-id="${q.id}">
                            <td><strong>${this.esc(q.number)}</strong></td>
                            <td>${this.esc(q.client.name)}</td>
                            <td>${this.esc(q.subject)} · ${this.esc(q.tutorName)}</td>
                            <td>${q.packages.map(p => `${p.hours}h`).join(' / ')}</td>
                            <td>${this.esc(QuotationService.gstLabel(q))}</td>
                            <td style="color:var(--brown-light);font-size:13px">${Formatters.date(q.createdAt)}</td>
                            <td>
                                <div class="table-actions">
                                    <button class="icon-btn" title="Download PDF" data-action="download" data-id="${q.id}">⬇️</button>
                                    <button class="icon-btn" title="Edit" data-action="edit" data-id="${q.id}">✏️</button>
                                    <button class="icon-btn" title="Delete" data-action="delete" data-id="${q.id}">🗑️</button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>
            </div>
        `;

        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const q = Store.getQuotationById(btn.dataset.id);
                if (!q) return;
                const action = btn.dataset.action;
                if (action === 'download') this.downloadPdf(q);
                else if (action === 'edit') this.loadForEdit(q.id);
                else if (action === 'delete') this.deleteQuotation(q.id);
            });
        });
    }
};