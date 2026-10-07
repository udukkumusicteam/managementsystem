import { Store } from '../state/store.js';

/**
 * Quotation Service — business logic for client quotations
 * Project-specific module (Udukku quotation calculator).
 *
 * Pricing rules (from requirement messages, 1 Aug 2026; GST rule corrected 10 Sep 2026):
 *  - Base rate per tutor + subject, quoted excluding GST
 *  - Packages: higher package → higher discount (defaults 6h/2%, 10h/4%, 20h/8%)
 *  - GST (user-corrected 3 Oct 2026): Udukku is Rajasthan-based, so a
 *    Rajasthan client → intra-state → CGST 9% + SGST 9%; a client from any
 *    other state → inter-state → IGST 18%. (Supersedes the 10 Sep rule,
 *    which had the two cases reversed.)
 * All inputs are editable; every downstream value is derived live.
 */
export const QuotationService = {
    defaultPackages() {
        return [
            { hours: 6, discountPct: 2 },
            { hours: 10, discountPct: 4 },
            { hours: 20, discountPct: 8 }
        ];
    },

    defaultGstRates() {
        return { cgst: 9, sgst: 9, igst: 18 };
    },

    /** GST mode from the client's state (Rajasthan → intra-state CGST+SGST, anything else → inter-state IGST). */
    gstModeForState(stateName, fallback = 'intra') {
        const s = (stateName || '').trim().toLowerCase();
        if (!s) return fallback;
        return s.includes('rajasthan') ? 'intra' : 'inter';
    },

    round2(n) {
        return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    },

    /** "Rs. 3,822" style money (Hanken Grotesk has no ₹ glyph — PDF convention, same as payslips). */
    money(n) {
        const v = Number(n) || 0;
        return 'Rs. ' + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },

    /**
     * Calculate one package row.
     * @returns {{hours:number, discountPct:number, discountedRate:number, subtotal:number,
     *            cgst:number, sgst:number, igst:number, gstTotal:number, total:number}}
     */
    calculateRow(pkg, baseRate, gstMode, rates) {
        const hours = parseFloat(pkg.hours) || 0;
        const discountPct = parseFloat(pkg.discountPct) || 0;
        const base = parseFloat(baseRate) || 0;

        const discountedRate = Math.round(base * (1 - discountPct / 100));
        const subtotal = discountedRate * hours;

        let cgst = 0, sgst = 0, igst = 0;
        if (gstMode === 'intra') {
            cgst = this.round2(subtotal * ((rates.cgst || 0) / 100));
            sgst = this.round2(subtotal * ((rates.sgst || 0) / 100));
        } else {
            igst = this.round2(subtotal * ((rates.igst || 0) / 100));
        }
        const gstTotal = this.round2(cgst + sgst + igst);

        return {
            hours,
            discountPct,
            discountedRate,
            subtotal,
            cgst,
            sgst,
            igst,
            gstTotal,
            total: this.round2(subtotal + gstTotal)
        };
    },

    calculateAll(quote) {
        return quote.packages.map(p =>
            this.calculateRow(p, quote.baseRate, quote.gstMode, quote.gstRates)
        );
    },

    gstLabel(quote) {
        if (quote.gstMode === 'intra') {
            return `${quote.gstRates.cgst}% CGST + ${quote.gstRates.sgst}% SGST`;
        }
        return `${quote.gstRates.igst}% IGST`;
    },

    create(data) {
        if (!data.client || !data.client.name.trim()) {
            console.error('Client name is required');
            return null;
        }
        if (!data.tutorId || !data.subjectId) {
            console.error('Tutor and subject are required');
            return null;
        }
        if (!(parseFloat(data.baseRate) > 0)) {
            console.error('A valid base rate is required');
            return null;
        }
        if (!data.packages.length || data.packages.some(p => !(parseFloat(p.hours) > 0))) {
            console.error('At least one package with hours is required');
            return null;
        }

        const quote = {
            number: data.number || Store.nextQuotationNumber(),
            client: data.client,
            tutorId: data.tutorId,
            tutorName: data.tutorName,
            subjectId: data.subjectId,
            subject: data.subject,
            baseRate: data.baseRate,
            currency: data.currency || 'INR',
            packages: data.packages,
            gstMode: data.gstMode,
            gstRates: data.gstRates,
            validDays: data.validDays,
            note: data.note
        };

        quote.packages = this.calculateAll(quote);
        return Store.addQuotation(quote);
    },

    update(id, data) {
        const existing = Store.getQuotationById(id);
        if (!existing) return null;
        if (!data.packages.length || data.packages.some(p => !(parseFloat(p.hours) > 0))) return null;

        const quote = {
            client: data.client,
            tutorId: data.tutorId,
            tutorName: data.tutorName,
            subjectId: data.subjectId,
            subject: data.subject,
            baseRate: data.baseRate,
            currency: data.currency || 'INR',
            packages: data.packages,
            gstMode: data.gstMode,
            gstRates: data.gstRates,
            validDays: data.validDays,
            note: data.note
        };
        quote.packages = this.calculateAll(quote);
        return Store.updateQuotation(id, quote);
    }
};