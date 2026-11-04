import { Config } from '../config.js';
import { Helpers } from '../utils/helpers.js';

/**
 * Central State Management
 */
export const Store = (function() {
    let state = {
        tutors: [],
        payslips: [],
        quotations: [],
        invoices: [],
        initialized: false
    };

    function saveState() {
        try {
            const { _listeners, ...persistable } = state;
            localStorage.setItem(Config.storageKey, JSON.stringify(persistable));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
        // Notify sync listeners (cloud push, etc.)
        (state._listeners || []).forEach(cb => {
            try { cb(); } catch (e) { console.error('Store listener error:', e); }
        });
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(Config.storageKey);
            if (saved) {
                const parsed = Helpers.safeParse(saved);
                if (parsed) {
                    delete parsed._listeners;
                    state = { ...state, ...parsed };
                }
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }

    return {
        init() {
            if (state.initialized) return;
            loadState();
            state.initialized = true;
        },

        getState() {
            return Helpers.clone(state);
        },

        // ===== TUTOR METHODS =====
        getTutors() {
            return Helpers.clone(state.tutors);
        },

        getTutorById(id) {
            return Helpers.clone(state.tutors.find(t => t.id === id)) || null;
        },

        getSubjectsByTutor(tutorId) {
            const tutor = state.tutors.find(t => t.id === tutorId);
            return Helpers.clone(tutor?.subjects || []);
        },

        getSubjectById(tutorId, subjectId) {
            const tutor = state.tutors.find(t => t.id === tutorId);
            return Helpers.clone(tutor?.subjects.find(s => s.id === subjectId)) || null;
        },

        addTutor(tutorData) {
            const tutor = {
                id: Helpers.generateId('tutor_'),
                name: tutorData.name.trim(),
                subjects: tutorData.subjects.map(s => ({
                    id: Helpers.generateId('subj_'),
                    name: s.name.trim(),
                    rate: parseFloat(s.rate) || 0
                })),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            state.tutors.push(tutor);
            saveState();
            return Helpers.clone(tutor);
        },

        updateTutor(id, updates) {
            const index = state.tutors.findIndex(t => t.id === id);
            if (index === -1) return null;

            const tutor = state.tutors[index];
            tutor.name = updates.name?.trim() || tutor.name;
            tutor.subjects = updates.subjects?.map(s => ({
                id: s.id || Helpers.generateId('subj_'),
                name: s.name.trim(),
                rate: parseFloat(s.rate) || 0
            })) || tutor.subjects;
            tutor.updatedAt = Date.now();

            state.tutors[index] = tutor;
            saveState();
            return Helpers.clone(tutor);
        },

        deleteTutor(id) {
            const index = state.tutors.findIndex(t => t.id === id);
            if (index === -1) return false;

            state.tutors.splice(index, 1);
            state.payslips = state.payslips.filter(p => p.tutorId !== id);
            saveState();
            return true;
        },

        // ===== PAYSLIP METHODS =====
        getPayslips() {
            return Helpers.clone(state.payslips);
        },

        getPayslipById(id) {
            return Helpers.clone(state.payslips.find(p => p.id === id)) || null;
        },

        getPayslipsByTutor(tutorId) {
            return Helpers.clone(state.payslips.filter(p => p.tutorId === tutorId));
        },

        getPayslipsByPeriod(month, year) {
            return Helpers.clone(
                state.payslips.filter(p => p.month === month && p.year === year)
            );
        },

        getPayslipsByTutorSubjectPeriod(tutorId, subjectId, month, year) {
            return Helpers.clone(
                state.payslips.filter(p =>
                    p.tutorId === tutorId &&
                    p.subjectId === subjectId &&
                    p.month === month &&
                    p.year === year
                )
            );
        },

        addPayslip(payslipData) {
            const payslip = {
                id: Helpers.generateId('slip_'),
                tutorId: payslipData.tutorId,
                tutorName: payslipData.tutorName,
                subjectId: payslipData.subjectId,
                subject: payslipData.subject,
                month: payslipData.month,
                year: payslipData.year,
                rate: parseFloat(payslipData.rate) || 0,
                teachingHours: parseFloat(payslipData.teachingHours) || 0,
                strikeHours: parseFloat(payslipData.strikeHours) || 0,
                teachingAmount: parseFloat(payslipData.teachingAmount) || 0,
                strikeAmount: parseFloat(payslipData.strikeAmount) || 0,
                grandTotal: parseFloat(payslipData.grandTotal) || 0,
                createdAt: Date.now(),
                generatedBy: Config.admin.name,
                // Approval workflow (Ishita signs digitally before release)
                status: 'pending',       // 'pending' | 'approved'
                signedAt: null,
                signedBy: null,
                signature: null          // dataURL snapshot of the signature at approval time
            };
            state.payslips.push(payslip);
            saveState();
            return Helpers.clone(payslip);
        },

        deletePayslip(id) {
            const index = state.payslips.findIndex(p => p.id === id);
            if (index === -1) return false;

            state.payslips.splice(index, 1);
            saveState();
            return true;
        },

        // ===== APPROVAL WORKFLOW (digital signature) =====
        getPendingPayslips() {
            return Helpers.clone(state.payslips.filter(p => p.status !== 'approved'));
        },

        getApprovedPayslips() {
            return Helpers.clone(state.payslips.filter(p => p.status === 'approved'));
        },

        /**
         * Approve a payslip and attach the digital signature.
         * opts: { signature: dataURL, signedBy: name/email }
         * The signature is snapshotted onto the record so already-signed
         * payslips keep the exact signature that was used.
         */
        approvePayslip(id, opts = {}) {
            const p = state.payslips.find(x => x.id === id);
            if (!p) return null;

            p.status = 'approved';
            p.signedAt = Date.now();
            p.signedBy = opts.signedBy || Config.admin.name;
            if (opts.signature) p.signature = opts.signature;

            saveState();
            return Helpers.clone(p);
        },

        /** Revoke an approval — payslip goes back to pending, signature cleared. */
        unapprovePayslip(id) {
            const p = state.payslips.find(x => x.id === id);
            if (!p) return false;

            p.status = 'pending';
            p.signedAt = null;
            p.signedBy = null;
            p.signature = null;

            saveState();
            return true;
        },

        // ===== SIGNATURE (per-browser default, used at approval time) =====
        getSignature() {
            try { return localStorage.getItem(Config.signatureKey) || null; }
            catch { return null; }
        },

        setSignature(dataUrl) {
            try { localStorage.setItem(Config.signatureKey, dataUrl); return true; }
            catch (e) { console.error('Failed to save signature:', e); return false; }
        },

        clearSignature() {
            try { localStorage.removeItem(Config.signatureKey); return true; }
            catch { return false; }
        },

        // ===== QUOTATION METHODS =====
        getQuotations() {
            return Helpers.clone(state.quotations);
        },

        getQuotationById(id) {
            return Helpers.clone(state.quotations.find(q => q.id === id)) || null;
        },

        addQuotation(quoteData) {
            const quotation = {
                id: Helpers.generateId('quote_'),
                number: quoteData.number,
                client: {
                    name: quoteData.client.name.trim(),
                    phone: quoteData.client.phone || '',
                    email: quoteData.client.email || '',
                    city: quoteData.client.city || '',
                    state: quoteData.client.state || ''
                },
                tutorId: quoteData.tutorId,
                tutorName: quoteData.tutorName,
                subjectId: quoteData.subjectId,
                subject: quoteData.subject,
                baseRate: parseFloat(quoteData.baseRate) || 0,
                packages: quoteData.packages.map(p => ({ ...p })),
                gstMode: quoteData.gstMode,
                gstRates: {
                    cgst: parseFloat(quoteData.gstRates.cgst) || 0,
                    sgst: parseFloat(quoteData.gstRates.sgst) || 0,
                    igst: parseFloat(quoteData.gstRates.igst) || 0
                },
                validDays: parseInt(quoteData.validDays) || 0,
                note: quoteData.note || '',
                createdAt: Date.now()
            };
            state.quotations.push(quotation);
            saveState();
            return Helpers.clone(quotation);
        },

        updateQuotation(id, quoteData) {
            const index = state.quotations.findIndex(q => q.id === id);
            if (index === -1) return null;

            const existing = state.quotations[index];
            state.quotations[index] = {
                ...existing,
                client: {
                    name: quoteData.client.name.trim(),
                    phone: quoteData.client.phone || '',
                    email: quoteData.client.email || '',
                    city: quoteData.client.city || '',
                    state: quoteData.client.state || ''
                },
                tutorId: quoteData.tutorId,
                tutorName: quoteData.tutorName,
                subjectId: quoteData.subjectId,
                subject: quoteData.subject,
                baseRate: parseFloat(quoteData.baseRate) || 0,
                packages: quoteData.packages.map(p => ({ ...p })),
                gstMode: quoteData.gstMode,
                gstRates: {
                    cgst: parseFloat(quoteData.gstRates.cgst) || 0,
                    sgst: parseFloat(quoteData.gstRates.sgst) || 0,
                    igst: parseFloat(quoteData.gstRates.igst) || 0
                },
                validDays: parseInt(quoteData.validDays) || 0,
                note: quoteData.note || '',
                updatedAt: Date.now()
            };
            saveState();
            return Helpers.clone(state.quotations[index]);
        },

        deleteQuotation(id) {
            const index = state.quotations.findIndex(q => q.id === id);
            if (index === -1) return false;

            state.quotations.splice(index, 1);
            saveState();
            return true;
        },

        nextQuotationNumber() {
            const year = new Date().getFullYear();
            const prefix = `UDU-Q-${year}-`;
            let max = 0;
            state.quotations.forEach(q => {
                if (q.number && q.number.startsWith(prefix)) {
                    const n = parseInt(q.number.slice(prefix.length), 10);
                    if (!isNaN(n) && n > max) max = n;
                }
            });
            return prefix + String(max + 1).padStart(3, '0');
        },

        // ===== INVOICE METHODS =====
        // Each invoice has its own id. Several invoices for one client are
        // several rows. Cloud sync is quotations-only, so every invoice is
        // also nested on a quotation.invoices[] (never a single object).
        _invoiceListOnQuote(q) {
            if (!q) return [];
            if (Array.isArray(q.invoices)) return q.invoices;
            if (q.invoice) {
                q.invoices = Array.isArray(q.invoice) ? q.invoice.slice() : [q.invoice];
                delete q.invoice;
                return q.invoices;
            }
            q.invoices = [];
            return q.invoices;
        },

        _hydrateInvoice(inv, q) {
            if (!inv) return null;
            const clientObj = (inv.client && typeof inv.client === 'object')
                ? inv.client
                : (q && q.client) || {};
            const clientName = inv.clientName
                || (typeof inv.client === 'string' ? inv.client : '')
                || clientObj.name
                || (q && q.client && q.client.name)
                || inv.billedToName
                || '';
            return Helpers.clone({
                ...inv,
                quotationId: inv.quotationId || (q && q.id) || '',
                quotationNumber: inv.quotationNumber || (q && q.number) || inv.fromEstimate || '',
                clientName,
                clientCity: inv.clientCity || clientObj.city || (q && q.client && q.client.city) || '',
                clientState: inv.clientState || clientObj.state || (q && q.client && q.client.state) || '',
                clientGstin: inv.clientGstin || inv.gstin || clientObj.gstin || '',
                title: inv.title || (String(inv.type || inv.kind || '').toLowerCase().includes('train')
                    ? 'MUSIC TRAINING INVOICE'
                    : 'PROFORMA INVOICE')
            });
        },

        _findQuoteForInvoice(inv) {
            if (!inv) return null;
            if (inv.quotationId) {
                const byId = state.quotations.find(q => q.id === inv.quotationId);
                if (byId) return byId;
            }
            const num = inv.quotationNumber || inv.fromEstimate || inv.estimateNumber;
            if (num) return state.quotations.find(q => q.number === num) || null;
            return null;
        },

        _ensureInvoiceHost(invoice) {
            if (!state.quotations) state.quotations = [];
            if (invoice.quotationId) {
                const q = state.quotations.find(x => x.id === invoice.quotationId);
                if (q) return q;
            }
            const name = String(invoice.clientName || '').trim().toLowerCase();
            if (name) {
                const match = state.quotations.find(q =>
                    q.source !== 'standalone-invoice' &&
                    q.client && String(q.client.name || '').trim().toLowerCase() === name
                );
                if (match) {
                    invoice.quotationId = match.id;
                    invoice.quotationNumber = invoice.quotationNumber || match.number;
                    return match;
                }
            }
            let host = state.quotations.find(q => q.source === 'standalone-invoice');
            if (!host) {
                host = {
                    id: Helpers.generateId('quote_'),
                    number: 'INV-BOX',
                    source: 'standalone-invoice',
                    client: { name: 'Invoices', phone: '', email: '', city: '', state: '' },
                    tutorId: '',
                    tutorName: '',
                    subject: 'Invoice',
                    baseRate: 0,
                    packages: [],
                    invoices: [],
                    gstMode: 'inter',
                    gstRates: { cgst: 0, sgst: 0, igst: 0 },
                    validDays: 0,
                    note: '',
                    createdAt: Date.now()
                };
                state.quotations.push(host);
            }
            invoice.quotationId = host.id;
            return host;
        },

        _nestInvoice(invoice) {
            const q = this._ensureInvoiceHost(invoice);
            if (!q) return;
            const list = this._invoiceListOnQuote(q);
            const i = list.findIndex(x => x && x.id === invoice.id);
            if (i === -1) list.push({ ...invoice });
            else list[i] = { ...list[i], ...invoice };
        },

        _normalizeInvoiceStorage() {
            if (!state.invoices) state.invoices = [];
            let mutated = false;
            (state.quotations || []).forEach(q => {
                const nested = this._invoiceListOnQuote(q);
                nested.forEach(inv => {
                    if (!inv) return;
                    if (!inv.id) {
                        inv.id = Helpers.generateId('inv_');
                        mutated = true;
                    }
                    if (!state.invoices.some(i => i.id === inv.id)) {
                        state.invoices.push({
                            ...inv,
                            quotationId: inv.quotationId || q.id
                        });
                        mutated = true;
                    }
                });
            });
            state.invoices.forEach(inv => {
                if (!inv) return;
                if (!inv.id) {
                    inv.id = Helpers.generateId('inv_');
                    mutated = true;
                }
            });
            if (mutated) saveState();
        },

        getInvoices() {
            this._normalizeInvoiceStorage();
            const seen = new Set();
            const list = [];
            const add = (inv, q) => {
                if (!inv) return;
                if (!inv.id) inv.id = Helpers.generateId('inv_');
                if (seen.has(inv.id)) return;
                seen.add(inv.id);
                list.push(this._hydrateInvoice(inv, q || this._findQuoteForInvoice(inv)));
            };
            state.invoices.forEach(inv => add(inv, this._findQuoteForInvoice(inv)));
            (state.quotations || []).forEach(q => {
                this._invoiceListOnQuote(q).forEach(inv => add(inv, q));
            });
            list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            return list;
        },

        getInvoiceById(id) {
            if (!id) return null;
            return this.getInvoices().find(i => i.id === id) || null;
        },

        addInvoice(data) {
            this._normalizeInvoiceStorage();
            const used = new Set(state.invoices.map(i => i && i.id).filter(Boolean));
            (state.quotations || []).forEach(q => {
                this._invoiceListOnQuote(q).forEach(i => { if (i && i.id) used.add(i.id); });
            });
            let id = data && data.id;
            if (!id || used.has(id)) id = Helpers.generateId('inv_');
            const invoice = {
                ...data,
                id,
                createdAt: (data && data.createdAt) || Date.now(),
                updatedAt: Date.now()
            };
            state.invoices.push(invoice);
            this._nestInvoice(invoice);
            saveState();
            return Helpers.clone(invoice);
        },

        updateInvoice(id, data) {
            if (!id) return null;
            this._normalizeInvoiceStorage();
            const apply = (inv) => ({ ...inv, ...data, id, updatedAt: Date.now() });
            let found = false;
            const idx = state.invoices.findIndex(i => i && i.id === id);
            if (idx !== -1) {
                state.invoices[idx] = apply(state.invoices[idx]);
                found = true;
            }
            (state.quotations || []).forEach(q => {
                const list = this._invoiceListOnQuote(q);
                const qi = list.findIndex(i => i && i.id === id);
                if (qi !== -1) {
                    list[qi] = apply(list[qi]);
                    found = true;
                }
            });
            if (!found) return null;
            saveState();
            return this.getInvoiceById(id);
        },

        deleteInvoice(id) {
            if (!id) return false;
            this._normalizeInvoiceStorage();
            let found = false;
            const idx = state.invoices.findIndex(i => i && i.id === id);
            if (idx !== -1) {
                state.invoices.splice(idx, 1);
                found = true;
            }
            (state.quotations || []).forEach(q => {
                const list = this._invoiceListOnQuote(q);
                const qi = list.findIndex(i => i && i.id === id);
                if (qi !== -1) {
                    list.splice(qi, 1);
                    found = true;
                }
                if (q.invoice && (q.invoice.id === id || q.invoice === id)) {
                    delete q.invoice;
                    found = true;
                }
            });
            if (!found) return false;
            saveState();
            return true;
        },

        nextInvoiceNumber() {
            const all = this.getInvoices();
            let max = 0;
            all.forEach(inv => {
                const m = String(inv.number || '').match(/^PI-(\d+)/i);
                if (m) {
                    const n = parseInt(m[1], 10);
                    if (n > max) max = n;
                }
            });
            return 'PI-' + String(max + 1).padStart(2, '0');
        },

        getStats() {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const thisMonthPayslips = state.payslips.filter(
                p => p.month === currentMonth && p.year === currentYear
            );

            return {
                totalTutors: state.tutors.length,
                monthPayslips: thisMonthPayslips.length,
                totalPaidThisMonth: thisMonthPayslips.reduce((sum, p) => sum + p.grandTotal, 0),
                totalPayslips: state.payslips.length,
                currentMonth: currentMonth,
                currentYear: currentYear
            };
        },

        seedSampleData() {
            if (state.tutors.length > 0) return;

            state.tutors = [
                {
                    id: 'tutor_1',
                    name: 'Payal Sarkate',
                    subjects: [
                        { id: 'subj_1', name: 'Hindustani Vocal', rate: 350 }
                    ],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    id: 'tutor_2',
                    name: 'Rahul Mehta',
                    subjects: [
                        { id: 'subj_2', name: 'Guitar', rate: 450 },
                        { id: 'subj_3', name: 'Ukulele', rate: 350 }
                    ],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    id: 'tutor_3',
                    name: 'Ananya Sharma',
                    subjects: [
                        { id: 'subj_4', name: 'Piano', rate: 500 },
                        { id: 'subj_5', name: 'Western Vocal', rate: 400 }
                    ],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ];

            saveState();
        },

        clearAll() {
            state.tutors = [];
            state.payslips = [];
            state.quotations = [];
            state.invoices = [];
            saveState();
        },

        // ===== CLOUD SYNC HOOKS =====
        /** Replace entire collections (used when loading from the cloud DB). */
        replaceState(payload) {
            if (payload.tutors) state.tutors = Helpers.clone(payload.tutors);
            if (payload.payslips) state.payslips = Helpers.clone(payload.payslips);
            if (payload.quotations) state.quotations = Helpers.clone(payload.quotations);
            if (payload.invoices) state.invoices = Helpers.clone(payload.invoices);
            saveState();
        },

        /** Register a callback fired after every local save (debounced sync pushes off this). */
        onAfterSave(cb) {
            if (!state._listeners) state._listeners = [];
            state._listeners.push(cb);
        }
    };
})();