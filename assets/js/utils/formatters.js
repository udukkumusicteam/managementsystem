/**
 * Formatting utilities for currency, dates, and text
 */
export const Formatters = {
    currency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
        return '₹' + amount.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    },

    date(timestamp) {
        const d = new Date(timestamp);
        return `${d.getDate()} ${this.monthShort(d.getMonth())} ${d.getFullYear()}`;
    },

    dateLong(timestamp) {
        const d = new Date(timestamp);
        return `${d.getDate()} ${this.monthLong(d.getMonth())} ${d.getFullYear()}`;
    },

    monthLong(monthIndex) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[monthIndex] || '';
    },

    monthShort(monthIndex) {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return months[monthIndex] || '';
    },

    initials(name) {
        if (!name) return 'U';
        return name.split(' ')
            .map(w => w[0].toUpperCase())
            .join('')
            .slice(0, 2);
    },

    payslipId(id) {
        return id.replace('slip_', '#');
    },

    period(month, year) {
        return `${this.monthLong(month)} ${year}`;
    }
};