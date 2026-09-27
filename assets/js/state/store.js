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
            saveState();
        },

        // ===== CLOUD SYNC HOOKS =====
        /** Replace entire collections (used when loading from the cloud DB). */
        replaceState(payload) {
            if (payload.tutors) state.tutors = Helpers.clone(payload.tutors);
            if (payload.payslips) state.payslips = Helpers.clone(payload.payslips);
            if (payload.quotations) state.quotations = Helpers.clone(payload.quotations);
            saveState();
        },

        /** Register a callback fired after every local save (debounced sync pushes off this). */
        onAfterSave(cb) {
            if (!state._listeners) state._listeners = [];
            state._listeners.push(cb);
        }
    };
})();