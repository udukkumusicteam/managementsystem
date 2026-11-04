import { Store } from '../state/store.js';
import { InvoicePdfService } from './invoicePdfService.js';
import { QuotationService } from './quotationService.js';
import { Formatters } from '../utils/formatters.js';

/**
 * Connects the invoice form + saved invoices + pricing estimates
 * to the PDF. This is the layer that was dropping client name and title.
 */
export const InvoiceService = {
    MONTHS: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ],

    ord(day) {
        const d = Number(day);
        if (d % 10 === 1 && d % 100 !== 11) return 'st';
        if (d % 10 === 2 && d % 100 !== 12) return 'nd';
        if (d % 10 === 3 && d % 100 !== 13) return 'rd';
        return 'th';
    },

    ordinalDate(value) {
        if (value == null || value === '') {
            const n = new Date();
            return `${n.getDate()}${this.ord(n.getDate())} ${this.MONTHS[n.getMonth()]} ${n.getFullYear()}`;
        }
        if (value instanceof Date && !isNaN(value.getTime())) {
            return `${value.getDate()}${this.ord(value.getDate())} ${this.MONTHS[value.getMonth()]} ${value.getFullYear()}`;
        }
        const s = String(value).trim();
        if (/^\d{1,2}(st|nd|rd|th)\s+/i.test(s)) return s;
        if (/^\d{10,13}$/.test(s)) {
            let n = Number(s);
            if (n < 1e12) n *= 1000;
            const d = new Date(n);
            if (!isNaN(d.getTime())) {
                return `${d.getDate()}${this.ord(d.getDate())} ${this.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
            }
        }
        const d = new Date(s);
        if (isNaN(d.getTime())) return s;
        return `${d.getDate()}${this.ord(d.getDate())} ${this.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    },

    isTrainingBlob(raw) {
        if (InvoicePdfService.isTraining(raw || {})) return true;
        const blob = [
            raw && raw.title,
            raw && raw.type,
            raw && raw.kind,
            raw && raw.docType,
            raw && raw.docKind,
            raw && raw.invoiceType,
            raw && raw.invoiceKind,
            raw && raw.template,
            raw && raw.heading
        ].filter(Boolean).join(' ').toUpperCase();
        return blob.includes('TRAIN');
    },

    pickTitle(raw) {
        return this.isTrainingBlob(raw || {}) ? 'MUSIC TRAINING INVOICE' : 'PROFORMA INVOICE';
    },

    elVal(id) {
        const el = document.getElementById(id);
        if (!el) return '';
        if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? (el.value || '1') : '';
        return String(el.value || '').trim();
    },

    checkedVal(name) {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? String(el.value || '').trim() : '';
    },

    /** Live form wins over a stale saved invoice (the "connection"). */
    readForm() {
        const live = InvoicePdfService.readLiveType();
        const clientName = this.elVal('inv-client-name')
            || this.elVal('invoice-client-name')
            || this.elVal('inv-client')
            || this.elVal('inv-billed-to');
        const out = {};
        if (live === 'training') {
            out.type = 'training';
            out.kind = 'training';
            out.title = 'MUSIC TRAINING INVOICE';
        } else if (live === 'proforma') {
            out.type = 'proforma';
            out.kind = 'proforma';
            out.title = 'PROFORMA INVOICE';
        }
        if (clientName) out.clientName = clientName;
        const city = this.elVal('inv-client-city') || this.elVal('inv-city');
        const state = this.elVal('inv-client-state') || this.elVal('inv-state');
        const gstin = this.elVal('inv-client-gstin') || this.elVal('inv-gstin');
        if (city) out.clientCity = city;
        if (state) out.clientState = state;
        if (gstin) out.clientGstin = gstin;
        const date = this.elVal('inv-date') || this.elVal('invoice-date');
        if (date) out.invoiceDate = date;
        const hours = this.elVal('inv-hours') || this.elVal('inv-qty');
        const rate = this.elVal('inv-rate');
        const discount = this.elVal('inv-discount') || this.elVal('inv-discount-pct');
        if (hours) out.hours = parseFloat(hours);
        if (rate) out.rate = parseFloat(rate);
        if (discount) out.discountPct = parseFloat(discount);
        return out;
    },

    findQuotation(raw) {
        if (!raw) return null;
        if (raw.quotation && raw.quotation.client) return raw.quotation;
        if (raw.quotationId) {
            const q = Store.getQuotationById(raw.quotationId);
            if (q) return q;
        }
        const num = raw.quotationNumber || raw.fromEstimate || raw.estimateNumber;
        if (num) {
            return (Store.getQuotations() || []).find(q => q.number === num) || null;
        }
        return null;
    },

    pickClientName(raw, q) {
        const nested = raw && raw.client;
        const billed = raw && raw.billedTo;
        const candidates = [
            raw && raw.clientName,
            typeof nested === 'string' ? nested : null,
            nested && nested.name,
            raw && raw.billedToName,
            typeof billed === 'string' ? billed : null,
            billed && billed.name,
            raw && raw.studentName,
            raw && raw.name,
            q && q.client && q.client.name,
            q && q.clientName
        ];
        for (const c of candidates) {
            const s = String(c || '').trim();
            if (s && s.toLowerCase() !== 'client') return s;
        }
        return '';
    },

    computeAmounts(raw, q) {
        let rate = Number(raw.rate ?? raw.package?.rate ?? 0);
        let hours = Number(raw.hours ?? raw.qty ?? raw.package?.hours ?? 0);
        let discountPct = Number(raw.discountPct ?? raw.package?.discountPct ?? 0);

        if (q && (!rate || !hours)) {
            const pkgs = q.packages || [];
            const idx = Number(raw.packageIndex ?? raw.selectedPackage ?? 0) || 0;
            const pkg = pkgs[idx] || pkgs[0];
            if (pkg) {
                hours = hours || Number(pkg.hours) || 0;
                discountPct = discountPct || Number(pkg.discountPct) || 0;
                rate = rate || Number(q.baseRate) || 0;
            }
        }

        const lineTotal = Number(raw.lineTotal ?? rate * hours);
        const subTotal = Number(raw.subTotal ?? lineTotal);
        const discountAmt = Number(raw.discountAmt ?? (subTotal * discountPct) / 100);
        const afterDiscount = Number(raw.afterDiscount ?? subTotal - discountAmt);

        let cgst = Number(raw.cgst);
        let sgst = Number(raw.sgst);
        let igst = Number(raw.igst);
        if (![cgst, sgst, igst].some(n => Number.isFinite(n) && n !== 0) && !(raw.cgst === 0 && raw.igst === 0)) {
            const stateName = raw.clientState || raw.client?.state || q?.client?.state || '';
            const mode = QuotationService.gstModeForState(stateName, 'inter');
            const rates = QuotationService.defaultGstRates();
            if (mode === 'intra') {
                cgst = QuotationService.round2(afterDiscount * (rates.cgst / 100));
                sgst = QuotationService.round2(afterDiscount * (rates.sgst / 100));
                igst = 0;
            } else {
                cgst = 0;
                sgst = 0;
                igst = QuotationService.round2(afterDiscount * (rates.igst / 100));
            }
        }
        cgst = Number.isFinite(cgst) ? cgst : 0;
        sgst = Number.isFinite(sgst) ? sgst : 0;
        igst = Number.isFinite(igst) ? igst : 0;

        const extras = raw.extras || raw.extraItems || [];
        const extraTotal = extras.reduce((s, e) => s + Number(e.amount ?? e.total ?? 0), 0);
        const grandTotal = Number(
            raw.grandTotal ?? afterDiscount + cgst + sgst + igst + extraTotal
        );

        const discNote = discountPct ? ` (with a ${discountPct}% discount)` : '';
        const pkgHours = hours ? `${hours} Hour${hours === 1 ? '' : 's'}` : '';
        const packageLabel = raw.packageLabel
            || (typeof raw.package === 'string' ? raw.package : '')
            || (pkgHours ? `${pkgHours}${discNote}` : '');

        return {
            rate, hours, qty: hours, discountPct, lineTotal, subTotal,
            discountAmt, afterDiscount, cgst, sgst, igst, extras, grandTotal,
            packageLabel
        };
    },

    buildPdfModel(raw, { useForm = false } = {}) {
        const merged = { ...(raw || {}) };
        const form = this.readForm();
        // Training on the form always wins. Default Proforma on the form must
        // not stamp over a saved Music Training invoice (list ⬇️).
        if (form.type === 'training') {
            merged.type = 'training';
            merged.kind = 'training';
            merged.title = 'MUSIC TRAINING INVOICE';
        } else if (useForm && form.type === 'proforma') {
            merged.type = 'proforma';
            merged.kind = 'proforma';
            merged.title = 'PROFORMA INVOICE';
        }
        if (useForm) {
            Object.entries(form).forEach(([k, v]) => {
                if (v !== '' && v != null && !(typeof v === 'number' && Number.isNaN(v))) {
                    merged[k] = v;
                }
            });
        }
        if (merged.id) {
            const stored = Store.getInvoiceById(merged.id);
            if (stored) {
                Object.entries(stored).forEach(([k, v]) => {
                    if (merged[k] == null || merged[k] === '') merged[k] = v;
                });
            }
        }
        const q = this.findQuotation(merged);
        const clientName = this.pickClientName(merged, q);
        const title = this.pickTitle(merged);
        const amounts = this.computeAmounts(merged, q);
        const invoiceDate = this.ordinalDate(
            merged.invoiceDateLabel || merged.dateLabel || merged.invoiceDate || merged.date || merged.createdAt
        );
        const dueDate = this.ordinalDate(
            merged.dueDateLabel || merged.dueDate || invoiceDate
        );

        return {
            title,
            type: /train/i.test(title) ? 'training' : 'proforma',
            kind: /train/i.test(title) ? 'training' : 'proforma',
            number: merged.number || merged.piNumber || Store.nextInvoiceNumber(),
            invoiceDate,
            invoiceDateLabel: invoiceDate,
            dueDate,
            dueDateLabel: dueDate,
            hsn: merged.hsn || '999291',
            terms: merged.terms || 'Due on Receipt',
            clientName,
            clientCity: merged.clientCity || merged.client?.city || q?.client?.city || '',
            clientState: merged.clientState || merged.client?.state || q?.client?.state || '',
            clientGstin: merged.clientGstin || merged.gstin || '',
            quotationId: merged.quotationId || q?.id || '',
            quotationNumber: merged.quotationNumber || q?.number || '',
            lineDesc: merged.lineDesc || merged.description || 'Individual Session (1x)',
            ...amounts
        };
    },

    saveFromModel(model, existingId) {
        const payload = {
            ...model,
            id: existingId || model.id,
            createdAt: model.createdAt || Date.now()
        };
        if (payload.id && Store.getInvoiceById(payload.id)) {
            return Store.updateInvoice(payload.id, payload);
        }
        return Store.addInvoice(payload);
    },

    installLiveTypeCapture() {
        InvoicePdfService.installLiveTypeCapture();
    },

    async downloadPdf(raw, opts = {}) {
        const model = this.buildPdfModel(raw || {}, opts);
        if (!model.clientName) {
            console.warn('Invoice PDF: client name missing on', raw);
        }
        await InvoicePdfService.generate(model, { formWins: !!opts.useForm });
        return model;
    }
};