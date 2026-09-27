/**
 * General utility helper functions
 */
export const Helpers = {
    generateId(prefix = '') {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    },

    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    debounce(func, wait = 100) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    safeParse(json) {
        try {
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    },

    getCurrentPeriod() {
        const now = new Date();
        return {
            month: now.getMonth(),
            year: now.getFullYear()
        };
    },

    getNextMonth(month, year) {
        const nextMonth = month + 1;
        const nextYear = year + Math.floor(nextMonth / 12);
        return {
            month: nextMonth % 12,
            year: nextYear
        };
    }
};