import { Store } from '../state/store.js';
import { InvoiceService } from '../services/invoiceService.js';
import { InvoicePdfService } from '../services/invoicePdfService.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';

/**
 * Invoices — own sidebar page. Does not depend on visiting Pricing Estimate.
 * Each save creates (or updates) ONE invoice by id, so one client can have many.
 * Live preview (right column) follows the form, same as Pricing Estimate.
 */
export const Invoices = {
    _bound: false,
    _installed: false,
    _previewTimer: null,

    install() {
        this.ensurePreviewStyles();
        this.ensureNav();
        this.ensurePage();
        this.bindEvents();
        this._installed = true;
        return this;
    },

    ensurePreviewStyles() {
        if (typeof document === 'undefined') return;
        let s = document.getElementById('inv-preview-css');
        if (!s) {
            s = document.createElement('style');
            s.id = 'inv-preview-css';
            document.head.appendChild(s);
        }
        s.textContent = `
            #invoice-preview {
                background: #ffffff !important;
                background-color: #ffffff !important;
                overflow: hidden !important;
                border-radius: 18px;
                box-shadow: 0 2px 8px rgba(8, 32, 50, 0.08);
                position: sticky;
                top: 100px;
            }
            #invoice-preview .form-section-body,
            #invoice-preview .preview-body,
            #invoice-preview .inv-prev {
                background: #ffffff !important;
                background-color: #ffffff !important;
            }
            #invoice-preview .preview-body {
                padding: 18px 16px 0;
            }
            #invoice-preview .inv-prev {
                color: #3d3b3a;
                font-family: Helvetica, Arial, sans-serif;
                font-size: 12px;
                line-height: 1.35;
            }
            .inv-prev-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 12px; }
            .inv-prev-title-img { height: 44px; width: auto; max-width: 210px; display: block; object-fit: contain; background: #ffffff; }
            .inv-prev-title-fallback { display: none; font-weight: 800; font-size: 15px; color: #082032; line-height: 1.15; letter-spacing: 0.2px; background: #ffffff; }
            .inv-prev-pill { border: 1.5px solid #000; border-radius: 999px; padding: 6px 14px; font-weight: 700; font-size: 10px; letter-spacing: 0.4px; white-space: nowrap; background: #ffffff; }
            .inv-prev-meta { text-align: right; font-size: 11px; color: #2a2a2a; line-height: 1.45; }
            .inv-prev-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0 14px; }
            .inv-prev-label { color: #f87842; font-weight: 700; font-size: 10px; letter-spacing: 0.6px; margin-bottom: 4px; }
            .inv-prev-who { font-weight: 700; color: #2a2a2a; }
            .inv-prev-line { color: #3d3b3a; }
            .inv-prev-details { margin: 0 0 12px; padding: 0; list-style: none; }
            .inv-prev-details li { position: relative; padding-left: 14px; margin: 3px 0; }
            .inv-prev-details li::before { content: ""; position: absolute; left: 2px; top: 6px; width: 5px; height: 5px; border-radius: 50%; background: #2a2a2a; }
            .inv-prev-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; background: #ffffff; }
            .inv-prev-table th { text-align: left; font-size: 9.5px; letter-spacing: 0.4px; padding: 0 4px 8px; border-bottom: 1px solid #3d3b3a; color: #3d3b3a; }
            .inv-prev-table th.r, .inv-prev-table td.r { text-align: right; }
            .inv-prev-table th.c, .inv-prev-table td.c { text-align: center; }
            .inv-prev-table td { padding: 8px 4px; border-bottom: 1.5px solid #3d3b3a; vertical-align: top; background: #ffffff; }
            .inv-prev-pay { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: start; }
            .inv-prev-pay h4 { color: #f87842; font-size: 10px; letter-spacing: 0.6px; margin: 0 0 6px; }
            .inv-prev-pay p { margin: 0 0 3px; font-size: 11px; }
            .inv-prev-totals { min-width: 160px; }
            .inv-prev-trow { display: flex; justify-content: space-between; gap: 12px; margin: 3px 0; }
            .inv-prev-trow.disc { color: #cc2232; }
            .inv-prev-trow.grand { font-weight: 800; font-size: 13px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #3d3b3a; }
            .inv-prev-due { display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px; }
            .inv-prev-due span { background: #ededed; border-radius: 4px; padding: 5px 8px; font-size: 11px; }
            .inv-prev-qr { margin-top: 10px; text-align: left; }
            .inv-prev-qr img { width: 88px; height: 88px; object-fit: contain; display: block; background: #ffffff; }
            .inv-prev-upi { width: 88px; text-align: center; font-weight: 700; font-size: 10px; margin-top: 4px; }
            .inv-prev-foot { display: block; width: calc(100% + 32px); margin: 14px -16px 0; }
        `;
    },

    init() {
        this.install();
        this.render();
        this.ensureDraftNumber();
        this.activateIfNeeded();
        this.renderPreview();
        try { InvoiceService.installLiveTypeCapture(); } catch (err) { /* ignore */ }
    },

    ensureNav() {
        const nav = document.querySelector('.sidebar-nav');
        if (!nav) return;
        if (nav.querySelector('.nav-item[data-page="invoices"]')) return;
        const quotes = nav.querySelector('.nav-item[data-page="quotations"]');
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.dataset.page = 'invoices';
        item.innerHTML = `<span class="nav-icon">📄</span>
                Invoices`;
        item.title = 'Invoices';
        if (quotes && quotes.parentNode) {
            quotes.parentNode.insertBefore(item, quotes.nextSibling);
        } else {
            nav.appendChild(item);
        }
        item.addEventListener('click', () => {
            import('./dashboard.js').then((m) => m.Dashboard.navigateTo('invoices'));
        });
    },

    pageHTML() {
        return `
            <div class="page-header">
                <div>
                    <h2>Invoices</h2>
                    <p>Create a proforma or music training invoice — no pricing estimate needed</p>
                </div>
                <button class="btn btn-primary" id="btn-new-invoice" type="button">✨ New Invoice</button>
            </div>

            <div class="generate-layout" id="invoice-layout">
                <div class="form-section">
                    <div class="form-section-header">
                        <h3>📄 Invoice</h3>
                        <p>Every field is editable. Saving always keeps other invoices for this client.</p>
                    </div>
                    <div class="form-section-body" id="invoice-form-body">
                        ${this.formHTML()}
                    </div>
                </div>
                <div class="form-section" id="invoice-preview" style="background:#ffffff;position:sticky;top:100px"></div>
            </div>

            <div class="card" style="margin-top:28px">
                <div class="card-header">
                    <h3>Saved invoices</h3>
                    <input type="search" class="form-control" id="invoice-search"
                        placeholder="Search client, PI number…" style="max-width:240px">
                </div>
                <div class="card-body" style="overflow-x:auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>PI No.</th>
                                <th>Client</th>
                                <th>From estimate</th>
                                <th>Package</th>
                                <th>Total</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="invoices-table-body"></tbody>
                    </table>
                </div>
            </div>`;
    },

    formHTML() {
        return `
            <input type="hidden" id="inv-editing-id" value="">
            <input type="hidden" id="inv-quotation-id" value="">

            <div class="section-title">Heading</div>
            <div class="form-group">
                <label class="form-label">Invoice type</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #d0d0d0;border-radius:8px;cursor:pointer;font-size:13px">
                        <input type="radio" name="inv-type" id="inv-type-proforma" value="proforma" checked>
                        Proforma Invoice
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #d0d0d0;border-radius:8px;cursor:pointer;font-size:13px">
                        <input type="radio" name="inv-type" id="inv-type-training" value="training">
                        Music Training Invoice
                    </label>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">PI number</label>
                    <input type="text" class="form-control" id="inv-number" placeholder="PI-01">
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-control" id="inv-date">
                </div>
            </div>

            <div class="form-section-divider"></div>
            <div class="section-title">Billed to</div>
            <div class="form-group">
                <label class="form-label">Client name *</label>
                <input type="text" class="form-control" id="inv-client-name" placeholder="e.g. Aditya Sharma">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">City</label>
                    <input type="text" class="form-control" id="inv-client-city" placeholder="e.g. Jaipur">
                </div>
                <div class="form-group">
                    <label class="form-label">State</label>
                    <input type="text" class="form-control" id="inv-client-state" placeholder="e.g. Rajasthan">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">GSTIN (optional)</label>
                <input type="text" class="form-control" id="inv-client-gstin" placeholder="Client GSTIN">
            </div>

            <div class="form-section-divider"></div>
            <div class="section-title">Line</div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <input type="text" class="form-control" id="inv-line-desc" value="Individual Session (1x)">
            </div>
            <div class="form-row-3">
                <div class="form-group">
                    <label class="form-label">Hours</label>
                    <input type="number" class="form-control" id="inv-hours" min="0" step="0.5" placeholder="10">
                </div>
                <div class="form-group">
                    <label class="form-label">Rate per session</label>
                    <input type="number" class="form-control" id="inv-rate" min="0" step="1" placeholder="650">
                </div>
                <div class="form-group">
                    <label class="form-label">Discount %</label>
                    <input type="number" class="form-control" id="inv-discount" min="0" max="100" step="0.5" placeholder="0">
                </div>
            </div>

            <div class="form-group" style="margin-top:8px">
                <label class="form-label">From pricing estimate (optional)</label>
                <select class="form-control" id="inv-from-estimate">
                    <option value="">— None — start from scratch —</option>
                </select>
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
                <button class="btn btn-primary" type="button" id="btn-save-invoice">💾 Save invoice</button>
                <button class="btn btn-secondary" type="button" id="btn-download-invoice">⬇️ Download PDF</button>
            </div>`;
    },

    ensurePage() {
        const container = document.getElementById('pages-container');
        let page = document.getElementById('page-invoices');

        if (page && container && page.parentElement !== container) {
            container.appendChild(page);
        }
        if (!page && container) {
            page = document.createElement('div');
            page.id = 'page-invoices';
            page.className = 'page';
            container.appendChild(page);
        }
        if (!page) return null;

        const needsPaint = !page.querySelector('#invoices-table-body')
            || !page.querySelector('#invoice-form-body')
            || !page.querySelector('#inv-client-name')
            || !page.querySelector('#invoice-preview');
        if (needsPaint) {
            page.innerHTML = this.pageHTML();
        }
        this.fillEstimateSelect();
        return page;
    },

    activateIfNeeded() {
        const nav = document.querySelector('.nav-item.active');
        if (nav && nav.dataset.page !== 'invoices') return;
        const page = document.getElementById('page-invoices');
        if (!page) return;
        if (nav && nav.dataset.page === 'invoices') {
            document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
            page.classList.add('active');
        }
    },

    bindEvents() {
        if (this._bound) return;
        this._bound = true;

        document.addEventListener('click', (e) => {
            const newBtn = e.target.closest('#btn-new-invoice');
            if (newBtn) {
                e.preventDefault();
                this.startNew();
                return;
            }
            const saveBtn = e.target.closest('#btn-save-invoice');
            if (saveBtn) {
                e.preventDefault();
                this.save();
                return;
            }
            const dlBtn = e.target.closest('#btn-download-invoice');
            if (dlBtn) {
                e.preventDefault();
                const id = document.getElementById('inv-editing-id')?.value;
                const current = id ? Store.getInvoiceById(id) : null;
                this.download(current || {}, { useForm: true });
                return;
            }
            const btn = e.target.closest('[data-inv-action]');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const id = btn.dataset.id;
            const action = btn.dataset.invAction;
            const inv = Store.getInvoiceById(id);
            if (!inv) {
                UI.showToast('That invoice is no longer in the list', 'error');
                this.render();
                return;
            }
            if (action === 'download') this.download(inv);
            else if (action === 'delete') this.remove(inv);
            else if (action === 'edit') this.edit(inv);
        });

        document.addEventListener('input', (e) => {
            if (!e.target) return;
            if (e.target.id === 'invoice-search') this.render();
            if (e.target.closest && e.target.closest('#invoice-form-body, #invoice-layout')) {
                this.schedulePreview();
            }
        });

        document.addEventListener('change', (e) => {
            const el = e.target;
            if (!el) return;
            if (el.name === 'inv-type' || el.name === 'invoice-type' || el.name === 'udukku-inv-kind') {
                this.persistTypeFromForm();
                this.renderPreview();
            }
            if (el.id === 'inv-from-estimate' && el.value) {
                const q = Store.getQuotationById(el.value);
                if (q) this.applyQuotation(q, { keepId: true });
            }
            if (el.closest && el.closest('#invoice-form-body, #invoice-layout')) {
                this.schedulePreview();
            }
        });
    },

    schedulePreview() {
        if (this._previewTimer) clearTimeout(this._previewTimer);
        this._previewTimer = setTimeout(() => this.renderPreview(), 40);
    },

    persistTypeFromForm() {
        const form = InvoiceService.readForm();
        const id = document.getElementById('inv-editing-id')?.value;
        if (id && (form.type || form.title)) {
            Store.updateInvoice(id, {
                type: form.type,
                kind: form.kind || form.type,
                title: form.title || InvoiceService.pickTitle(form)
            });
        }
    },

    fillEstimateSelect() {
        const sel = document.getElementById('inv-from-estimate');
        if (!sel) return;
        const current = sel.value;
        const quotes = (Store.getQuotations() || [])
            .filter((q) => q && q.source !== 'standalone-invoice')
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const opts = ['<option value="">— None — start from scratch —</option>']
            .concat(quotes.map((q) => {
                const name = (q.client && q.client.name) || 'Client';
                return `<option value="${this.esc(q.id)}">${this.esc(q.number || '')} — ${this.esc(name)}</option>`;
            }));
        sel.innerHTML = opts.join('');
        if (current) sel.value = current;
    },

    tbody() {
        return document.getElementById('invoices-table-body')
            || document.querySelector('#page-invoices tbody');
    },

    currentDraft() {
        const id = document.getElementById('inv-editing-id')?.value || '';
        const existing = id ? Store.getInvoiceById(id) : null;
        const qid = document.getElementById('inv-quotation-id')?.value
            || document.getElementById('inv-from-estimate')?.value
            || '';
        return InvoiceService.buildPdfModel({
            ...(existing || {}),
            quotationId: qid || existing?.quotationId || '',
            number: document.getElementById('inv-number')?.value || existing?.number || '',
            lineDesc: document.getElementById('inv-line-desc')?.value || existing?.lineDesc
        }, { useForm: true });
    },

    rs(n) {
        try { return InvoicePdfService.moneyStr(n); }
        catch (err) { return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`; }
    },

    renderPreview() {
        this.ensurePreviewStyles();
        const container = document.getElementById('invoice-preview');
        if (!container) return;
        container.className = 'form-section';
        container.style.cssText = 'background:#ffffff;position:sticky;top:100px;overflow:hidden';

        let m;
        try { m = this.currentDraft(); }
        catch (err) {
            console.warn(err);
            return;
        }

        const training = InvoiceService.isTrainingBlob(m);
        const titleText = training ? 'MUSIC TRAINING INVOICE' : 'PROFORMA INVOICE';
        const titleSrc = training
            ? 'assets/images/invoice-title-training.png'
            : 'assets/images/invoice-title-proforma.png';
        const by = InvoicePdfService.BILLED_BY;
        const bank = InvoicePdfService.BANK;
        const loc = [m.clientCity, m.clientState].filter(Boolean).join(', ');
        const client = (m.clientName || '').trim() || 'Client name';
        const discPct = Number(m.discountPct) || 0;

        container.innerHTML = `
            <div class="form-section-header">
                <h3>📄 ${this.esc(titleText)}</h3>
                <p>Live preview · same figures as the PDF</p>
            </div>
            <div class="form-section-body" style="background:#ffffff">
            <div class="inv-prev" style="background:#ffffff">
                <div class="inv-prev-top">
                    <div>
                        <img class="inv-prev-title-img" src="${titleSrc}" alt="${this.esc(titleText)}"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                        <div class="inv-prev-title-fallback">${this.esc(titleText)}</div>
                    </div>
                    <div>
                        <div class="inv-prev-pill" style="margin-left:auto;margin-bottom:8px;width:fit-content">UDUKKU MUSIC</div>
                        <div class="inv-prev-meta">
                            <div><strong>DATE:</strong> ${this.esc(m.invoiceDate || '—')}</div>
                            <div><strong>PI NO.:</strong> ${this.esc(m.number || '—')}</div>
                            <div><strong>HSN :</strong> ${this.esc(m.hsn || '999291')}</div>
                        </div>
                    </div>
                </div>
                <div class="inv-prev-cols">
                    <div>
                        <div class="inv-prev-label">BILLED BY</div>
                        <div class="inv-prev-who">${this.esc(by.person)}</div>
                        <div class="inv-prev-who">${this.esc(by.org)}</div>
                        ${by.lines.map((ln) => `<div class="inv-prev-line">${this.esc(ln)}</div>`).join('')}
                        <div class="inv-prev-line"><strong>GST:</strong> ${this.esc(by.gstin)}</div>
                    </div>
                    <div>
                        <div class="inv-prev-label">BILLED TO</div>
                        <div class="inv-prev-who">${this.esc(client)}</div>
                        ${loc ? `<div class="inv-prev-line">${this.esc(loc)}</div>` : ''}
                        ${m.clientGstin ? `<div class="inv-prev-line"><strong>GST:</strong> ${this.esc(m.clientGstin)}</div>` : ''}
                    </div>
                </div>
                <div class="inv-prev-label">DETAILS:</div>
                <ul class="inv-prev-details">
                    <li>INVOICE TERMS: ${this.esc(m.terms || 'Due on Receipt')}</li>
                    <li>DUE DATE: ${this.esc(m.dueDate || m.invoiceDate || '—')}</li>
                    <li>PACKAGE:  ${this.esc(m.packageLabel || '—')}</li>
                </ul>
                <table class="inv-prev-table">
                    <thead>
                        <tr>
                            <th>DESCRIPTION</th>
                            <th class="c">RATE PER SESSION</th>
                            <th class="c">QTY</th>
                            <th class="r">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${this.esc(m.lineDesc || 'Individual Session (1x)')}</td>
                            <td class="c">${this.rs(m.rate)}</td>
                            <td class="c">${this.esc(m.qty ?? m.hours ?? '')}</td>
                            <td class="r">${this.rs(m.lineTotal)}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="inv-prev-pay">
                    <div>
                        <h4>PAYMENT DETAILS</h4>
                        <p>Account Name: ${this.esc(bank.accountName)}</p>
                        <p>Bank Name: ${this.esc(bank.bankName)}</p>
                        <p>Account Number: ${this.esc(bank.accountNumber)}</p>
                        <p>Bank IFSC Code: ${this.esc(bank.ifsc)}</p>
                        <div class="inv-prev-qr">
                            <img src="assets/images/upi-qr.png" alt="UPI QR"
                                onerror="this.style.display='none'">
                            <div class="inv-prev-upi">${this.esc(bank.upi)}</div>
                        </div>
                    </div>
                    <div class="inv-prev-totals">
                        <div class="inv-prev-trow"><span>Total</span><span>${this.rs(m.subTotal)}</span></div>
                        <div class="inv-prev-trow disc"><span>${discPct}% Discount</span><span>- ${this.rs(m.discountAmt)}</span></div>
                        <div class="inv-prev-trow"><span></span><span>${this.rs(m.afterDiscount)}</span></div>
                        <div class="inv-prev-trow"><span>Add CGST@9%</span><span>${this.rs(m.cgst)}</span></div>
                        <div class="inv-prev-trow"><span>Add SGST@9%</span><span>${this.rs(m.sgst)}</span></div>
                        <div class="inv-prev-trow"><span>IGST@18%</span><span>${this.rs(m.igst)}</span></div>
                        <div class="inv-prev-trow grand"><span>Grand Total</span><span>${this.rs(m.grandTotal)}</span></div>
                        <div class="inv-prev-due">
                            <span>Due Today</span>
                            <span>${this.rs(m.grandTotal)}</span>
                        </div>
                    </div>
                </div>
                <img class="inv-prev-foot" src="assets/images/invoice-footer.png" alt=""
                    onerror="this.style.display='none'">
            </div>
            </div>
        `;
    },

    render() {
        this.ensurePage();
        const tbody = this.tbody();
        if (!tbody) return;
        this.fillEstimateSelect();

        const search = (document.getElementById('invoice-search')?.value || '').toLowerCase();
        let rows = Store.getInvoices();
        if (search) {
            rows = rows.filter((inv) => {
                const blob = [
                    inv.number, inv.clientName, inv.quotationNumber, inv.packageLabel, inv.title, inv.type, inv.id
                ].join(' ').toLowerCase();
                return blob.includes(search);
            });
        }

        if (!rows.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-icon">📄</div>
                            <h3>No invoices yet</h3>
                            <p>Use New Invoice above, or create one from a saved pricing estimate.</p>
                        </div>
                    </td>
                </tr>`;
            this.renderPreview();
            return;
        }

        tbody.innerHTML = rows.map((inv) => {
            const client = inv.clientName || '—';
            const from = inv.quotationNumber || '—';
            const pkg = inv.packageLabel || (typeof inv.package === 'string' ? inv.package : '—');
            const total = Formatters.currency
                ? Formatters.currency(inv.grandTotal || 0)
                : `Rs. ${Number(inv.grandTotal || 0).toLocaleString('en-IN')}`;
            const date = inv.invoiceDate || (inv.createdAt ? Formatters.date(inv.createdAt) : '');
            const kind = InvoiceService.isTrainingBlob(inv) ? 'Training' : 'Proforma';
            const id = this.esc(inv.id);
            return `
                <tr data-id="${id}">
                    <td>
                        <strong>${this.esc(inv.number || '')}</strong>
                        <div style="font-size:11px;color:var(--brown-light)">${this.esc(kind)}</div>
                    </td>
                    <td>${this.esc(client)}</td>
                    <td>${this.esc(from)}</td>
                    <td>${this.esc(pkg)}</td>
                    <td><strong style="color:var(--orange)">${total}</strong></td>
                    <td style="color:var(--brown-light);font-size:13px">${this.esc(date)}</td>
                    <td>
                        <div class="table-actions">
                            <button class="icon-btn" type="button" title="Edit"
                                data-inv-action="edit" data-id="${id}">✏️</button>
                            <button class="icon-btn" type="button" title="Download PDF"
                                data-inv-action="download" data-id="${id}">⬇️</button>
                            <button class="icon-btn" type="button" title="Delete this invoice only"
                                data-inv-action="delete" data-id="${id}">🗑️</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
        this.renderPreview();
    },

    esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    set(id, v) {
        const el = document.getElementById(id);
        if (el) el.value = v == null ? '' : v;
    },

    todayInput() {
        const d = new Date();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${m}-${day}`;
    },

    ensureDraftNumber() {
        const numEl = document.getElementById('inv-number');
        if (numEl && !numEl.value) numEl.value = Store.nextInvoiceNumber();
        const dateEl = document.getElementById('inv-date');
        if (dateEl && !dateEl.value) dateEl.value = this.todayInput();
    },

    startNew() {
        this.install();
        this.set('inv-editing-id', '');
        this.set('inv-quotation-id', '');
        this.set('inv-number', Store.nextInvoiceNumber());
        this.set('inv-date', this.todayInput());
        this.set('inv-client-name', '');
        this.set('invoice-client-name', '');
        this.set('inv-client', '');
        this.set('inv-client-city', '');
        this.set('inv-client-state', '');
        this.set('inv-client-gstin', '');
        this.set('inv-hours', '');
        this.set('inv-rate', '');
        this.set('inv-discount', '');
        this.set('inv-line-desc', 'Individual Session (1x)');
        const est = document.getElementById('inv-from-estimate');
        if (est) est.value = '';
        const pro = document.getElementById('inv-type-proforma');
        if (pro) pro.checked = true;
        const train = document.getElementById('inv-type-training');
        if (train) train.checked = false;
        this.renderPreview();
        window.scrollTo(0, 0);
    },

    applyQuotation(q, { keepId = false } = {}) {
        if (!q) return;
        if (!keepId) this.set('inv-editing-id', '');
        this.set('inv-quotation-id', q.id || '');
        const est = document.getElementById('inv-from-estimate');
        if (est) est.value = q.id || '';
        const client = q.client || {};
        if (client.name) this.set('inv-client-name', client.name);
        if (client.city) this.set('inv-client-city', client.city);
        if (client.state) this.set('inv-client-state', client.state);
        const pkg = (q.packages && q.packages[0]) || {};
        if (pkg.hours != null && pkg.hours !== '') this.set('inv-hours', pkg.hours);
        if (q.baseRate != null) this.set('inv-rate', q.baseRate);
        if (pkg.discountPct != null && pkg.discountPct !== '') this.set('inv-discount', pkg.discountPct);
        this.renderPreview();
    },

    fromQuotation(q) {
        this.install();
        this.startNew();
        this.applyQuotation(q, { keepId: false });
        this.render();
        const page = document.getElementById('page-invoices');
        if (page) {
            document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
            page.classList.add('active');
        }
        document.querySelectorAll('.nav-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.page === 'invoices');
        });
        const title = document.getElementById('topbar-title');
        const sub = document.getElementById('topbar-subtitle');
        if (title) title.textContent = 'Invoices';
        if (sub) sub.textContent = 'Create a proforma or music training invoice';
        this.renderPreview();
        window.scrollTo(0, 0);
    },

    edit(inv) {
        if (!inv) return;
        this.install();
        this.set('inv-editing-id', inv.id);
        this.set('inv-quotation-id', inv.quotationId || '');
        this.set('inv-number', inv.number || '');
        this.set('inv-client-name', inv.clientName || '');
        this.set('invoice-client-name', inv.clientName || '');
        this.set('inv-client-city', inv.clientCity || '');
        this.set('inv-client-state', inv.clientState || '');
        this.set('inv-client-gstin', inv.clientGstin || '');
        this.set('inv-hours', inv.hours ?? inv.qty ?? '');
        this.set('inv-rate', inv.rate ?? '');
        this.set('inv-discount', inv.discountPct ?? '');
        this.set('inv-line-desc', inv.lineDesc || inv.description || 'Individual Session (1x)');
        if (inv.invoiceDate) {
            const raw = String(inv.invoiceDate);
            const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
            if (iso) this.set('inv-date', iso[1]);
            else {
                const d = new Date(inv.invoiceDate);
                if (!isNaN(d.getTime())) {
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    this.set('inv-date', `${d.getFullYear()}-${mm}-${dd}`);
                }
            }
        }
        const est = document.getElementById('inv-from-estimate');
        if (est) est.value = inv.quotationId || '';
        const training = InvoiceService.isTrainingBlob(inv);
        document.querySelectorAll('input[name="inv-type"], input[name="invoice-type"]').forEach((el) => {
            el.checked = training ? /train/i.test(el.value) : /proforma|performa/i.test(el.value) || el.value === 'proforma';
        });
        this.renderPreview();
        window.scrollTo(0, 0);
    },

    async download(inv, opts = {}) {
        try {
            const model = await InvoiceService.downloadPdf(inv || {}, opts);
            if (inv && inv.id) {
                Store.updateInvoice(inv.id, {
                    title: model.title,
                    type: model.type,
                    kind: model.kind || model.type,
                    clientName: model.clientName,
                    clientCity: model.clientCity,
                    clientState: model.clientState
                });
            }
            this.render();
        } catch (err) {
            console.error(err);
            UI.showToast(`Could not create the PDF: ${err.message || err}`, 'error');
        }
    },

    remove(inv) {
        if (!inv || !inv.id) return;
        const name = inv.clientName || 'this client';
        const num = inv.number || '';
        const kind = InvoiceService.isTrainingBlob(inv) ? 'Music Training' : 'Proforma';
        UI.showConfirm(
            'Delete this invoice only',
            `Delete ${num} (${kind}) for ${name}? Other invoices for ${name} are kept.`,
            () => {
                if (Store.deleteInvoice(inv.id)) {
                    const editing = document.getElementById('inv-editing-id')?.value;
                    if (editing === inv.id) this.startNew();
                    UI.showToast(`${num || 'Invoice'} deleted`, 'success');
                    this.render();
                } else {
                    UI.showToast('Could not delete that invoice', 'error');
                }
            }
        );
    },

    save() {
        const client = (document.getElementById('inv-client-name')?.value || '').trim();
        if (!client) {
            UI.showToast('Please enter the client name', 'error');
            document.getElementById('inv-client-name')?.focus();
            return null;
        }
        const id = document.getElementById('inv-editing-id')?.value || '';
        const existing = id ? Store.getInvoiceById(id) : null;
        const model = this.currentDraft();
        const saved = InvoiceService.saveFromModel({
            ...existing,
            ...model,
            id: existing ? existing.id : undefined
        }, existing ? existing.id : undefined);
        this.set('inv-editing-id', saved.id);
        this.set('inv-number', saved.number || '');
        UI.showToast(`Saved ${saved.number} for ${saved.clientName || 'client'}`, 'success');
        this.render();
        this.renderPreview();
        return saved;
    }
};

try {
    if (typeof document !== 'undefined') {
        const boot = () => Invoices.install();
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    }
} catch (err) { /* ignore */ }