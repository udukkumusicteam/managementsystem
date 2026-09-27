import { Store } from './store.js';
import { Config } from '../config.js';

/**
 * Persistence layer abstraction
 */
export const Persistence = {
    save() {
        try {
            const state = Store.getState();
            localStorage.setItem(Config.storageKey, JSON.stringify(state));
        } catch (e) {
            console.error('Persistence save error:', e);
            return false;
        }
        return true;
    },

    clear() {
        try {
            localStorage.removeItem(Config.storageKey);
            return true;
        } catch (e) {
            console.error('Persistence clear error:', e);
            return false;
        }
    },

    exportData() {
        return JSON.stringify(Store.getState(), null, 2);
    }
};