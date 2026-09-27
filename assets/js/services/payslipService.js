import { Store } from '../state/store.js';
import { Helpers } from '../utils/helpers.js';
import { Formatters } from '../utils/formatters.js';

/**
 * Payslip Service - Business logic for payslips
 */
export const PayslipService = {
    calculateAmounts(teachingHours, strikeHours, rate) {
        const tHours = parseFloat(teachingHours) || 0;
        const sHours = parseFloat(strikeHours) || 0;
        const r = parseFloat(rate) || 0;

        return {
            teachingAmount: tHours * r,
            strikeAmount: sHours * r,
            grandTotal: (tHours * r) + (sHours * r)
        };
    },

    createPayslip(data) {
        if (!data.tutorId || !data.subjectId || data.month === undefined || !data.year) {
            console.error('Missing required payslip fields');
            return null;
        }

        const tutor = Store.getTutorById(data.tutorId);
        const subject = Store.getSubjectById(data.tutorId, data.subjectId);

        if (!tutor || !subject) {
            console.error('Invalid tutor or subject');
            return null;
        }

        const { teachingAmount, strikeAmount, grandTotal } = this.calculateAmounts(
            data.teachingHours,
            data.strikeHours,
            data.rate || subject.rate
        );

        const payslipData = {
            tutorId: data.tutorId,
            tutorName: tutor.name,
            subjectId: data.subjectId,
            subject: subject.name,
            month: data.month,
            year: data.year,
            rate: data.rate || subject.rate,
            teachingHours: data.teachingHours,
            strikeHours: data.strikeHours,
            teachingAmount,
            strikeAmount,
            grandTotal
        };

        return Store.addPayslip(payslipData);
    },

    exists(tutorId, subjectId, month, year) {
        return Store.getPayslipsByTutorSubjectPeriod(
            tutorId, subjectId, month, year
        ).length > 0;
    },

    duplicatePayslip(payslipId) {
        const original = Store.getPayslipById(payslipId);
        if (!original) return null;

        const { month, year } = Helpers.getNextMonth(original.month, original.year);

        return this.createPayslip({
            tutorId: original.tutorId,
            subjectId: original.subjectId,
            month,
            year,
            teachingHours: original.teachingHours,
            strikeHours: original.strikeHours,
            rate: original.rate
        });
    }
};