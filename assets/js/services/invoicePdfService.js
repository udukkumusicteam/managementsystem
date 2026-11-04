import { Store } from '../state/store.js';

/**
 * Proforma invoice PDF — Canva template coordinates.
 *
 * No .ttf files. Body type is jsPDF built-in Helvetica (Aileron is a Helvetica
 * cousin; Helvetica is always present so we never hit "reading 'widths'").
 * Amounts print as "Rs." — same as payslips / estimates.
 *
 * Title is Canva artwork:
 *   assets/images/invoice-title-proforma.png
 *   assets/images/invoice-title-training.png
 * If those PNGs are missing, a Helvetica fallback title is drawn so the PDF
 * still downloads.
 *
 * Also used: assets/images/upi-qr.png, assets/images/invoice-footer.png
 */
export const InvoicePdfService = {
    DA: [8, 32, 50],
    NAME: [42, 42, 42],
    INK: [61, 59, 58],
    ACCENT: [248, 120, 66],
    RED: [204, 34, 50],
    PILL_BG: [237, 237, 237],
    RULE: [61, 59, 58],

    HSN: '999291',
    BANK: {
        accountName: 'Udukku Music',
        bankName: 'HDFC Bank',
        accountNumber: '50200114082375',
        ifsc: 'HDFC0009532',
        upi: 'udukkumusic@axl'
    },
    BILLED_BY: {
        person: 'Ishita Parakh',
        org: 'Udukku Music',
        lines: [
            'M-23 Income Tax Colony,',
            'Tonk Road, Durgapura,',
            'Jaipur - 302018'
        ],
        gstin: '08CMSPP2539P1Z0'
    },

    TITLE_PROFORMA: {
        path: './assets/images/invoice-title-proforma.png',
        x: 42.38,
        y: 46.32,
        w: 243.33,
        h: 83.35
    },
    TITLE_TRAINING: {
        path: './assets/images/invoice-title-training.png',
        x: 42.38,
        y: 46.32,
        w: 339.74,
        h: 83.77
    },

    _imgCache: {},

    /** Helvetica CapHeight ~0.72; 0.82 matched the previous layout. */
    base(yTop, size) {
        return yTop + size * 0.82;
    },

    _liveKind: '',
    _cap: false,

    isTraining(inv) {
        const blob = [
            inv && inv.title,
            inv && inv.type,
            inv && inv.kind,
            inv && inv.docType,
            inv && inv.docKind,
            inv && inv.invoiceType,
            inv && inv.invoiceKind,
            inv && inv.template,
            inv && inv.heading,
            inv && inv.category
        ].filter(Boolean).join(' ').toUpperCase();
        return blob.includes('TRAIN');
    },

    kindFromString(s) {
        const u = String(s || '').replace(/\s+/g, ' ').trim().toUpperCase();
        if (!u) return '';
        if (u.includes('TRAIN') || u === 'MT' || u === 'TRAINING') return 'training';
        if (u.includes('PROFORMA') || u.includes('PERFORMA')) return 'proforma';
        return '';
    },

    elementBlob(el) {
        if (!el || !el.tagName) return '';
        const id = el.id || '';
        let labelFor = '';
        try {
            if (id) {
                const esc = (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/"/g, '');
                const lab = document.querySelector(`label[for="${esc}"]`);
                if (lab) labelFor = lab.textContent || '';
            }
        } catch (err) { /* ignore */ }
        const wrap = el.closest && el.closest('label');
        const opt = (el.tagName === 'SELECT' && el.selectedOptions && el.selectedOptions[0])
            ? `${el.selectedOptions[0].value} ${el.selectedOptions[0].textContent}`
            : '';
        const ds = el.dataset || {};
        const textual = (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')
            ? ''
            : (el.textContent || '');
        return [
            el.value,
            ds.type, ds.invoiceType, ds.invType, ds.kind, ds.value, ds.title,
            el.getAttribute && el.getAttribute('aria-label'),
            el.name, el.id,
            opt,
            wrap && wrap.textContent,
            labelFor,
            textual
        ].filter(Boolean).join(' ');
    },

    kindFromElement(el) {
        return this.kindFromString(this.elementBlob(el));
    },

    ensureTypeControl() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('udukku-inv-kind-wrap')) return;
        const already = document.querySelector(
            'input[name="inv-type"], input[name="invoice-type"], input[name="invType"], #inv-type, #invoice-type, select[name="inv-type"], select[name="invoice-type"]'
        );
        if (already) return;
        const host = document.querySelector(
            '#page-invoices .form-section-body, #invoice-form-body, #inv-form-body, #page-invoices .form-section, #page-invoices'
        );
        if (!host) return;
        const wrap = document.createElement('div');
        wrap.id = 'udukku-inv-kind-wrap';
        wrap.className = 'form-group';
        wrap.style.cssText = 'margin:0 0 16px';
        wrap.innerHTML = `
            <label class="form-label">Invoice heading</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #d0d0d0;border-radius:8px;cursor:pointer;font-size:13px">
                    <input type="radio" name="udukku-inv-kind" id="udukku-inv-kind-proforma" value="proforma" checked>
                    Proforma Invoice
                </label>
                <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #d0d0d0;border-radius:8px;cursor:pointer;font-size:13px">
                    <input type="radio" name="udukku-inv-kind" id="udukku-inv-kind-training" value="training">
                    Music Training Invoice
                </label>
            </div>
            <p class="form-hint" style="margin-top:6px">This chooses the title on the PDF.</p>`;
        host.insertBefore(wrap, host.firstChild);
        wrap.querySelectorAll('input').forEach((el) => {
            el.addEventListener('change', () => {
                this._liveKind = el.value === 'training' ? 'training' : 'proforma';
            });
        });
    },

    installLiveTypeCapture() {
        if (typeof document !== 'undefined') this.ensureTypeControl();
        if (this._cap || typeof document === 'undefined') return;
        this._cap = true;
        const remember = (el) => {
            const kind = this.kindFromElement(el);
            if (kind) this._liveKind = kind;
        };
        document.addEventListener('change', (e) => remember(e.target), true);
        document.addEventListener('click', (e) => {
            const el = e.target.closest
                ? (e.target.closest('button, [role="tab"], [role="radio"], [role="option"], label, .tab, .chip, .toggle, [data-type], [data-invoice-type], [data-kind]') || e.target)
                : e.target;
            remember(el);
        }, true);
        setTimeout(() => this.ensureTypeControl(), 0);
        setTimeout(() => this.ensureTypeControl(), 400);
    },

    /**
     * Read the invoice type the user actually picked.
     * Looks at every checked radio/checkbox (any name), type-like selects,
     * and selected tabs — including the label text, so value="1" still works
     * when the label says "Music Training Invoice".
     * Returns 'training' | 'proforma' | ''.
     */
    readLiveType() {
        this.installLiveTypeCapture();
        if (typeof document === 'undefined') return this._liveKind || '';

        const hits = [];
        const add = (el, weight) => {
            if (!el) return;
            const kind = this.kindFromElement(el);
            if (kind) hits.push({ kind, weight });
        };

        document.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach((el) => {
            add(el, 6);
        });

        document.querySelectorAll('select').forEach((el) => {
            const meta = `${el.id || ''} ${el.name || ''}`;
            const opt = el.selectedOptions && el.selectedOptions[0];
            const optText = opt ? `${opt.value} ${opt.textContent}` : '';
            if (/type|kind|title|invoice|inv/i.test(meta) || /train|proforma|performa/i.test(optText)) {
                add(el, 5);
            }
        });

        document.querySelectorAll('[data-invoice-type], [data-inv-type], [data-kind], [data-type]').forEach((el) => {
            const on = el.classList.contains('active')
                || el.classList.contains('selected')
                || el.classList.contains('is-active')
                || el.classList.contains('is-selected')
                || el.getAttribute('aria-pressed') === 'true'
                || el.getAttribute('aria-selected') === 'true'
                || el.getAttribute('aria-checked') === 'true';
            if (on) add(el, 5);
        });

        document.querySelectorAll('.active, .selected, .is-active, .is-selected').forEach((el) => {
            if (el.classList.contains('page') || el.classList.contains('nav-item')) return;
            if (el.id && /^page-/.test(el.id)) return;
            const tag = el.tagName;
            const role = el.getAttribute('role');
            const isSmall = tag === 'BUTTON' || tag === 'A' || tag === 'SPAN' || tag === 'LI' || tag === 'LABEL'
                || role === 'tab' || role === 'radio' || role === 'option'
                || el.dataset.type || el.dataset.invoiceType || el.dataset.kind;
            if (!isSmall) return;
            add(el, 4);
        });

        const named = [
            'input[name="udukku-inv-kind"]:checked',
            'input[name="inv-type"]:checked',
            'input[name="invoice-type"]:checked',
            'input[name="invType"]:checked',
            'input[name="invoiceType"]:checked',
            'input[name="docType"]:checked',
            'input[name="doc-type"]:checked',
            'input[name="inv-kind"]:checked',
            'input[name="invoice-kind"]:checked',
            'input[name="kind"]:checked',
            'input[name="type"]:checked',
            '#inv-type',
            '#invoice-type',
            '#inv-kind',
            '#invoice-kind',
            '#doc-type',
            '#invoiceType',
            'select[name="inv-type"]',
            'select[name="invoice-type"]',
            'select[name="invoiceType"]',
            'select[name="inv-kind"]'
        ];
        named.forEach((sel) => {
            try { add(document.querySelector(sel), 5); } catch (err) { /* ignore */ }
        });

        const training = hits.find((h) => h.kind === 'training');
        const proforma = hits.find((h) => h.kind === 'proforma');
        if (training && (!proforma || training.weight >= proforma.weight)) return 'training';
        if (proforma) return 'proforma';
        return this._liveKind || '';
    },

    applyLiveType(src, { force = false } = {}) {
        const type = this.readLiveType();
        if (type === 'training') {
            return { ...src, type: 'training', kind: 'training', title: 'MUSIC TRAINING INVOICE' };
        }
        if (type === 'proforma' && (force || !this.isTraining(src))) {
            return { ...src, type: 'proforma', kind: 'proforma', title: 'PROFORMA INVOICE' };
        }
        return src;
    },

    titleBox(inv) {
        return this.isTraining(inv) ? this.TITLE_TRAINING : this.TITLE_PROFORMA;
    },

    font(doc, style = 'normal') {
        doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
    },

    async loadImage(path) {
        if (this._imgCache[path]) return this._imgCache[path];
        const r = await fetch(path);
        if (!r.ok) throw new Error(`Invoice PDF image missing (${r.status}): ${path}`);
        const blob = await r.blob();
        const dataUrl = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => reject(new Error(`Could not read ${path}`));
            fr.readAsDataURL(blob);
        });
        this._imgCache[path] = dataUrl;
        return dataUrl;
    },

    formatInr(n) {
        const x = Number(n);
        if (!Number.isFinite(x)) return '0';
        const rounded = Math.round(x * 100) / 100;
        const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9;
        const s = isInt ? String(Math.round(rounded)) : rounded.toFixed(2);
        const [a, b] = s.split('.');
        const withCommas = a.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return b ? `${withCommas}.${b}` : withCommas;
    },

    moneyStr(amount, minus = false) {
        return `${minus ? '- ' : ''}Rs. ${this.formatInr(amount)}`;
    },

    drawMoney(doc, x, y, amount, {
        align = 'left',
        size = 12,
        style = 'normal',
        color = this.INK,
        minus = false
    } = {}) {
        const str = this.moneyStr(amount, minus);
        this.font(doc, style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const opt = {};
        if (align === 'right' || align === 'center') opt.align = align;
        doc.text(str, x, y, opt);
    },

    wrap(doc, text, maxWidth) {
        const words = String(text || '').split(/\s+/).filter(Boolean);
        if (!words.length) return [];
        const lines = [];
        let cur = words[0];
        for (let i = 1; i < words.length; i++) {
            const trial = `${cur} ${words[i]}`;
            if (doc.getTextWidth(trial) <= maxWidth) cur = trial;
            else {
                lines.push(cur);
                cur = words[i];
            }
        }
        lines.push(cur);
        return lines;
    },

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

    toOrdinal(d) {
        const day = d.getDate();
        return `${day}${this.ord(day)} ${this.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    },

    /** Accepts ordinal text, ISO strings, Date, or unix ms/seconds (the 1793644200000 bug). */
    formatDate(value) {
        if (value == null || value === '') return '';
        if (value instanceof Date && !isNaN(value.getTime())) return this.toOrdinal(value);
        const s = String(value).trim();
        if (!s || s === '0' || s === 'null' || s === 'undefined') return '';
        if (/^\d{1,2}(st|nd|rd|th)\s+/i.test(s)) return s;
        if (/^\d{10,13}$/.test(s)) {
            let n = Number(s);
            if (n < 1e12) n *= 1000;
            const d = new Date(n);
            if (!isNaN(d.getTime())) return this.toOrdinal(d);
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) return this.toOrdinal(d);
        return '';
    },

    ordinalParts(dateStr) {
        const raw = this.formatDate(dateStr) || String(dateStr || '').trim();
        const m = raw.match(/^(\d{1,2})(st|nd|rd|th)\s+(.+)$/i);
        if (m) return { day: m[1], ord: m[2].toLowerCase(), rest: m[3] };
        return { day: raw, ord: '', rest: '' };
    },

    drawOrdinalLine(doc, x, y, prefix, dateStr, {
        size = 11,
        ordSize = 6.6,
        color = this.NAME
    } = {}) {
        const { day, ord, rest } = this.ordinalParts(dateStr);
        doc.setTextColor(...color);
        doc.setFontSize(size);
        this.font(doc, 'bold');
        doc.text(prefix, x, y);
        let cx = x + doc.getTextWidth(prefix);
        this.font(doc, 'normal');
        doc.text(day, cx, y);
        cx += doc.getTextWidth(day);
        if (ord) {
            doc.setFontSize(ordSize);
            doc.text(ord, cx, y - (size - ordSize) * 0.55);
            doc.setFontSize(size);
            cx += doc.getTextWidth(ord);
        }
        if (rest) doc.text(` ${rest}`, cx, y);
    },

    drawTitle(doc, inv, titleData) {
        const box = this.titleBox(inv);
        if (titleData) {
            doc.addImage(titleData, 'PNG', box.x, box.y, box.w, box.h);
            return;
        }
        const raw = String(inv.title || 'PROFORMA INVOICE')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
        this.font(doc, 'bold');
        doc.setFontSize(28);
        doc.setTextColor(...this.DA);
        const parts = raw.split(' ');
        if (parts.length >= 2) {
            const last = parts.pop();
            doc.text(parts.join(' '), 45.75, this.base(52, 28));
            doc.text(last, 45.75, this.base(86, 28));
        } else {
            doc.text(raw, 45.75, this.base(52, 28));
        }
    },

    drawPill(doc) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1.5);
        doc.roundedRect(404.66, 47.88, 137.27, 32.54, 16.27, 16.27, 'S');
        this.font(doc, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...this.NAME);
        doc.text('UDUKKU MUSIC', 404.66 + 137.27 / 2, 47.88 + 32.54 / 2, {
            align: 'center',
            baseline: 'middle'
        });
    },

    drawMeta(doc, inv) {
        const x = 404.52;
        const size = 11;
        const leading = 13.5;
        const y0 = this.base(87.11, size);
        this.drawOrdinalLine(doc, x, y0, 'DATE: ', inv.invoiceDate || '', {
            size,
            ordSize: 6.6,
            color: this.NAME
        });
        doc.setFontSize(size);
        doc.setTextColor(...this.NAME);
        this.font(doc, 'bold');
        doc.text('PI NO.: ', x, y0 + leading);
        this.font(doc, 'normal');
        doc.text(String(inv.number || ''), x + doc.getTextWidth('PI NO.: '), y0 + leading);
        this.font(doc, 'bold');
        const hsnLabel = 'HSN : ';
        doc.text(hsnLabel, x, y0 + leading * 2);
        this.font(doc, 'normal');
        doc.text(String(inv.hsn || this.HSN), x + doc.getTextWidth(hsnLabel), y0 + leading * 2);
    },

    drawBilled(doc, inv) {
        const by = this.BILLED_BY;
        this.font(doc, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...this.ACCENT);
        doc.text('BILLED BY', 47.20, this.base(158.12, 12));
        doc.text('BILLED TO', 321.06, this.base(157.34, 12));

        const whoLead = 15;
        let yBy = this.base(158.12 + 12 * 0.82 + 4, 12);
        doc.setTextColor(...this.NAME);
        this.font(doc, 'bold');
        doc.text(by.person, 47.20, yBy);
        yBy += whoLead;
        doc.text(by.org, 47.20, yBy);
        yBy += whoLead;
        this.font(doc, 'normal');
        by.lines.forEach((ln) => {
            doc.text(ln, 47.20, yBy);
            yBy += whoLead;
        });
        this.font(doc, 'bold');
        doc.text('GST: ', 47.20, yBy);
        this.font(doc, 'normal');
        doc.text(by.gstin, 47.20 + doc.getTextWidth('GST: '), yBy);

        let yTo = this.base(157.34 + 12 * 0.82 + 4, 12);
        this.font(doc, 'bold');
        const clientName = String(inv.clientName || '').trim() || 'Client';
        this.wrap(doc, clientName, 200).forEach((ln) => {
            doc.text(ln, 321.06, yTo);
            yTo += whoLead;
        });
        this.font(doc, 'normal');
        const loc = [inv.clientCity, inv.clientState].filter(Boolean).join(', ');
        if (loc) {
            this.wrap(doc, loc, 200).forEach((ln) => {
                doc.text(ln, 321.06, yTo);
                yTo += whoLead;
            });
        }
        if (inv.clientGstin) {
            this.font(doc, 'bold');
            doc.text('GST: ', 321.06, yTo);
            this.font(doc, 'normal');
            doc.text(String(inv.clientGstin), 321.06 + doc.getTextWidth('GST: '), yTo);
        }
    },

    drawDetails(doc, inv) {
        this.font(doc, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...this.ACCENT);
        doc.text('DETAILS:', 45.75, this.base(290.17, 12));

        const items = [
            { kind: 'plain', text: `INVOICE TERMS: ${inv.terms || 'Due on Receipt'}` },
            { kind: 'due', text: inv.dueDate || '' },
            { kind: 'plain', text: `PACKAGE:  ${inv.packageLabel || ''}`.trimEnd() }
        ];
        const size = 12;
        const lead = 15;
        let y = this.base(310.5, size);
        doc.setFontSize(size);
        doc.setTextColor(...this.NAME);
        items.forEach((it) => {
            doc.setFillColor(42, 42, 42);
            doc.circle(53.26, y - size * 0.28, 1.875, 'F');
            if (it.kind === 'due') {
                this.drawOrdinalLine(doc, 66.15, y, 'DUE DATE: ', it.text, {
                    size,
                    ordSize: 7.2,
                    color: this.NAME
                });
            } else {
                this.font(doc, 'normal');
                doc.text(it.text, 66.15, y);
            }
            y += lead;
        });
    },

    drawTable(doc, inv) {
        const size = 12;
        this.font(doc, 'bold');
        doc.setFontSize(size);
        doc.setTextColor(...this.INK);
        const hy = this.base(387.12, size);
        doc.text('DESCRIPTION', 43.95, hy);
        doc.text('RATE PER SESSION', 209.02, hy);
        doc.text('QTY', 400.31, hy);
        doc.text('TOTAL', 544.49, hy, { align: 'right' });

        doc.setDrawColor(...this.RULE);
        doc.setLineWidth(1);
        doc.line(44.33, 419.29, 44.33 + 499.8, 419.29);

        const cy = this.base(434.87, size);
        this.font(doc, 'normal');
        doc.text(String(inv.lineDesc || 'Individual Session (1x)'), 43.95, cy);
        this.drawMoney(doc, 209.02 + 127.2 / 2, cy, inv.rate, {
            align: 'center',
            size,
            color: this.INK
        });
        this.font(doc, 'normal');
        doc.setFontSize(size);
        doc.setTextColor(...this.INK);
        doc.text(String(inv.qty ?? ''), 400.31 + 26.55 / 2, cy, { align: 'center' });
        this.drawMoney(doc, 544.49, cy, inv.lineTotal, {
            align: 'right',
            size,
            color: this.INK
        });

        doc.setDrawColor(...this.RULE);
        doc.setLineWidth(1.5);
        doc.line(44.33, 464.44, 44.33 + 499.8, 464.44);
    },

    drawPayment(doc) {
        this.font(doc, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...this.ACCENT);
        doc.text('PAYMENT DETAILS', 42.51, this.base(484.24, 12));

        const b = this.BANK;
        const size = 12;
        const lead = 16.5;
        let y = this.base(484.24 + 12 * 0.82 + 8, size);
        this.font(doc, 'normal');
        doc.setFontSize(size);
        doc.setTextColor(...this.INK);
        [
            `Account Name: ${b.accountName}`,
            `Bank Name: ${b.bankName}`,
            `Account Number: ${b.accountNumber}`,
            `Bank IFSC Code: ${b.ifsc}`
        ].forEach((ln) => {
            doc.text(ln, 42.51, y);
            y += lead;
        });
    },

    drawQrAndUpi(doc, qrData) {
        if (qrData) {
            try {
                doc.addImage(qrData, 'PNG', 42.51, 587.36, 112.54, 109.54);
            } catch (err) {
                console.warn('Invoice QR could not be drawn', err);
            }
        }
        this.font(doc, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...this.INK);
        const qrCx = 42.51 + 112.54 / 2;
        const upiY = 587.36 + 109.54 + 14;
        doc.text(this.BANK.upi, qrCx, this.base(upiY, 11), { align: 'center' });
    },

    drawTotals(doc, inv) {
        const size = 12;
        const labX = 455.02;
        const valX = 544.48;
        const rows = [
            { y: 482.78, lab: 'Total', amount: inv.subTotal, kind: 'money' },
            {
                y: 502.58,
                lab: `${Number(inv.discountPct) || 0}% Discount`,
                amount: inv.discountAmt,
                kind: 'discount'
            },
            { y: 522.00, lab: '', amount: inv.afterDiscount, kind: 'money' },
            { y: 541.73, lab: 'Add CGST@9%', amount: inv.cgst, kind: 'money' },
            { y: 561.38, lab: 'Add SGST@9%', amount: inv.sgst, kind: 'money' },
            { y: 580.73, lab: 'IGST@18%', amount: inv.igst, kind: 'money' }
        ];

        rows.forEach((row) => {
            const y = this.base(row.y, size);
            const isDisc = row.kind === 'discount';
            const color = isDisc ? this.RED : this.INK;
            doc.setFontSize(size);
            this.font(doc, 'normal');
            doc.setTextColor(...color);
            if (row.lab) doc.text(row.lab, labX, y, { align: 'right' });
            this.drawMoney(doc, valX, y, row.amount, {
                align: 'right',
                size,
                color,
                minus: isDisc
            });
        });

        doc.setDrawColor(...this.RULE);
        doc.setLineWidth(1);
        doc.line(494.71, 518.35, 494.71 + 49.4, 518.35);

        const gy = this.base(600.38, 13.54);
        this.font(doc, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...this.INK);
        doc.text('Grand Total', labX, gy, { align: 'right' });
        this.drawMoney(doc, 549, gy, inv.grandTotal, {
            align: 'right',
            size: 13.54,
            style: 'bold',
            color: this.INK
        });

        doc.setFillColor(...this.PILL_BG);
        doc.roundedRect(380.71, 617.18, 79.43, 19.8, 3.75, 3.75, 'F');
        doc.roundedRect(476.78, 617.18, 69.98, 19.8, 3.75, 3.75, 'F');
        this.font(doc, 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...this.INK);
        doc.text('Due Today', 380.71 + 79.43 / 2, 617.18 + 19.8 / 2, {
            align: 'center',
            baseline: 'middle'
        });
        this.drawMoney(
            doc,
            476.78 + 69.98 / 2,
            this.base(617.18 + (19.8 - 12) / 2, 12),
            inv.grandTotal,
            { align: 'center', size: 12, color: this.INK }
        );
    },

    drawFooter(doc, footerData) {
        const pageH = 841.89;
        const h = 107.12;
        const y = pageH - h;
        if (footerData) {
            try {
                doc.addImage(footerData, 'PNG', 0, y, 595.28, h);
                return;
            } catch (err) {
                console.warn('Invoice footer image could not be drawn', err);
            }
        }
        doc.setFillColor(248, 120, 66);
        doc.rect(0, y, 595.28, h, 'F');
    },

    drawExtrasPage(doc, inv, titleData, footerData) {
        const extras = Array.isArray(inv.extras) ? inv.extras : [];
        if (!extras.length) return;
        doc.addPage();
        this.drawTitle(doc, inv, titleData);
        this.drawPill(doc);
        this.font(doc, 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...this.ACCENT);
        doc.text('ADDITIONAL ITEMS', 45.75, this.base(158.12, 12));

        const size = 12;
        this.font(doc, 'bold');
        doc.setFontSize(size);
        doc.setTextColor(...this.INK);
        const hy = this.base(190, size);
        doc.text('DESCRIPTION', 43.95, hy);
        doc.text('AMOUNT', 544.49, hy, { align: 'right' });
        doc.setDrawColor(...this.RULE);
        doc.setLineWidth(1);
        doc.line(44.33, 206, 44.33 + 499.8, 206);

        let y = this.base(222, size);
        this.font(doc, 'normal');
        extras.forEach((ex) => {
            const name = String(ex.name || ex.description || 'Extra').trim();
            const lines = this.wrap(doc, name, 360);
            lines.forEach((ln, i) => {
                doc.setTextColor(...this.INK);
                this.font(doc, 'normal');
                doc.setFontSize(size);
                doc.text(ln, 43.95, y + i * 15);
            });
            this.drawMoney(doc, 544.49, y, ex.amount ?? ex.total ?? 0, {
                align: 'right',
                size,
                color: this.INK
            });
            y += Math.max(lines.length, 1) * 15 + 6;
        });

        this.drawFooter(doc, footerData);
    },

    findQuotation(invoice) {
        try {
            if (invoice.quotationId && Store.getQuotationById) {
                const q = Store.getQuotationById(invoice.quotationId);
                if (q) return q;
            }
            const num = invoice.quotationNumber || invoice.fromEstimate || invoice.estimateNumber;
            if (num && Store.getQuotations) {
                return (Store.getQuotations() || []).find((q) => q.number === num) || null;
            }
        } catch (err) {
            console.warn(err);
        }
        return null;
    },

    pickClientName(invoice, q) {
        const nested = invoice && invoice.client;
        const billed = invoice && invoice.billedTo;
        const list = [
            invoice && invoice.clientName,
            invoice && invoice.billedToName,
            invoice && invoice.studentName,
            invoice && invoice.customerName,
            invoice && invoice.toName,
            typeof nested === 'string' ? nested : null,
            nested && nested.name,
            typeof billed === 'string' ? billed : null,
            billed && billed.name,
            q && q.client && q.client.name,
            q && q.clientName,
            invoice && invoice.quotation && invoice.quotation.client && invoice.quotation.client.name
        ];
        for (const c of list) {
            const s = String(c || '').trim();
            if (s && s.toLowerCase() !== 'client') return s;
        }
        return '';
    },

    pickTitle(invoice) {
        if (this.isTraining(invoice)) return 'MUSIC TRAINING INVOICE';
        if (invoice && invoice.title && /INVOICE/i.test(invoice.title) && !/PROFORMA|PERFORMA/i.test(invoice.title)) {
            return String(invoice.title).replace(/\s+/g, ' ').trim().toUpperCase();
        }
        return 'PROFORMA INVOICE';
    },

    mapInvoice(invoice, opts = {}) {
        const formWins = !!opts.formWins;
        let src = this.applyLiveType(invoice || {}, { force: formWins });
        try {
            if (src.id && Store.getInvoiceById) {
                const stored = Store.getInvoiceById(src.id);
                if (stored) src = { ...stored, ...src };
            }
            if (Store.getInvoices && (!src.clientName && !(src.client && src.client.name))) {
                const all = Store.getInvoices() || [];
                const hit = all.find((i) =>
                    (src.id && i.id === src.id) ||
                    (src.number && i.number === src.number)
                );
                if (hit) src = { ...hit, ...src };
            }
        } catch (err) { /* ignore */ }

        const q = this.findQuotation(src);
        const pkg = (src.package && typeof src.package === 'object') ? src.package : src;
        const rate = Number(pkg.rate ?? src.rate ?? q?.baseRate ?? 0);
        const hours = Number(pkg.hours ?? src.hours ?? src.qty ?? 0);
        const discountPct = Number(pkg.discountPct ?? src.discountPct ?? 0);
        const lineTotal = Number(src.lineTotal ?? rate * hours);
        const subTotal = Number(src.subTotal ?? lineTotal);
        const discountAmt = Number(src.discountAmt ?? (subTotal * discountPct) / 100);
        const afterDiscount = Number(src.afterDiscount ?? subTotal - discountAmt);
        const cgst = Number(src.cgst ?? 0);
        const sgst = Number(src.sgst ?? 0);
        const igst = Number(src.igst ?? 0);
        const extras = src.extras || src.extraItems || [];
        const extraTotal = extras.reduce((s, e) => s + Number(e.amount ?? e.total ?? 0), 0);
        const grandTotal = Number(
            src.grandTotal ?? afterDiscount + cgst + sgst + igst + extraTotal
        );

        let dateLabel = this.formatDate(
            src.invoiceDateLabel || src.dateLabel || src.invoiceDate || src.date || src.createdAt
        );
        let dueLabel = this.formatDate(src.dueDateLabel || src.dueDate || src.due);
        if (!dateLabel) dateLabel = dueLabel || this.formatDate(Date.now());
        if (!dueLabel) dueLabel = dateLabel;

        const discNote = discountPct ? ` (with a ${discountPct}% discount)` : '';
        const pkgHours = hours ? `${hours} Hour${hours === 1 ? '' : 's'}` : '';
        const packageLabel = src.packageLabel
            || (typeof src.package === 'string' ? src.package : '')
            || (pkgHours ? `${pkgHours}${discNote}` : String(pkg.name || src.packageName || ''));

        src = this.applyLiveType(src, { force: formWins });
        const clientName = this.pickClientName(src, q);
        const training = this.isTraining(src);
        const title = training ? 'MUSIC TRAINING INVOICE' : this.pickTitle(src);

        return {
            title,
            type: training ? 'training' : 'proforma',
            kind: training ? 'training' : 'proforma',
            number: src.number || src.piNumber || '',
            invoiceDate: dateLabel,
            dueDate: dueLabel,
            hsn: src.hsn || this.HSN,
            terms: src.terms || 'Due on Receipt',
            clientName,
            clientCity: src.clientCity || src.city || src.client?.city || q?.client?.city || '',
            clientState: src.clientState || src.state || src.client?.state || q?.client?.state || '',
            clientGstin: src.clientGstin || src.gstin || '',
            packageLabel,
            lineDesc: src.lineDesc || src.description || 'Individual Session (1x)',
            rate,
            qty: hours,
            lineTotal,
            subTotal,
            discountPct,
            discountAmt,
            afterDiscount,
            cgst,
            sgst,
            igst,
            grandTotal,
            extras
        };
    },

    async generate(invoice, opts = {}) {
        this.installLiveTypeCapture();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        doc.setLineHeightFactor(1);
        this.font(doc, 'normal');

        const inv = this.mapInvoice(invoice, opts);
        const titlePath = this.titleBox(inv).path;
        const [qrData, footerData, titleData] = await Promise.all([
            this.loadImage('./assets/images/upi-qr.png').catch((e) => {
                console.warn(e);
                return null;
            }),
            this.loadImage('./assets/images/invoice-footer.png').catch((e) => {
                console.warn(e);
                return null;
            }),
            this.loadImage(titlePath).catch((e) => {
                console.warn(e);
                return null;
            })
        ]);

        this.drawTitle(doc, inv, titleData);
        this.drawPill(doc);
        this.drawMeta(doc, inv);
        this.drawBilled(doc, inv);
        this.drawDetails(doc, inv);
        this.drawTable(doc, inv);
        this.drawPayment(doc);
        this.drawQrAndUpi(doc, qrData);
        this.drawTotals(doc, inv);
        this.drawFooter(doc, footerData);
        this.drawExtrasPage(doc, inv, titleData, footerData);

        const who = String(inv.clientName || 'Client').replace(/[\\/:*?"<>|]/g, '').trim();
        const kindLabel = this.isTraining(inv) ? 'Music Training' : 'Proforma';
        const fileName = `${inv.number || 'PI'} ${who} ${kindLabel} Invoice.pdf`;
        doc.save(fileName);
    }
};

try {
    if (typeof document !== 'undefined') {
        const boot = () => InvoicePdfService.installLiveTypeCapture();
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    }
} catch (err) { /* ignore */ }