import { Store } from '../state/store.js';
import { UI } from '../components/ui.js';
import { Config } from '../config.js';

const CONFIG_KEY = 'udukku_cloud_config';

/**
 * Cloud Service — Supabase sync layer (project-specific, added 8 Sep 2026).
 *
 * Two modes:
 *  A) LOCAL ONLY (default): no cloud configured — the app behaves exactly as
 *     before (localStorage). Nothing in this service runs.
 *  B) CLOUD: a Supabase project URL + anon key are saved in Settings.
 *     Data loads from the cloud on sign-in; every local change is pushed
 *     (debounced) so all team members share one set of records.
 *
 * Table shape in Postgres: (id text, data jsonb, created_at, updated_at).
 * The app's JS objects map 1:1 into `data` — no field-by-field migration.
 *
 * Deletion safety: we only delete rows that existed at our last full load
 * (the "baseline") and that a local user removed — rows added by teammates
 * in the meantime are never touched.
 */
export const Cloud = {
    TABLES: ['tutors', 'payslips', 'quotations'],
    _client: null,
    _connected: false,
    _session: null,
    _baseline: { tutors: new Set(), payslips: new Set(), quotations: new Set() },
    _pushTimer: null,
    _authAttached: false,

    /* ---------- config ---------- */

    /**
     * Resolve the cloud config:
     *  1. Explicit per-browser choice wins: a saved {url,key} (user connected/
     *     overrode) or a {disabled:true} flag (user explicitly disconnected).
     *  2. Otherwise the built-in team default (Config.cloudDefault) applies, so
     *     a fresh device opens straight into the shared database + sign-in gate
     *     with zero setup.
     *  3. Otherwise null → local-only mode.
     */
    config() {
        try {
            const raw = localStorage.getItem(CONFIG_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.disabled) return null;
                if (parsed.url && parsed.key) return parsed;
            }
        } catch { /* fall through to team default */ }

        const d = Config.cloudDefault;
        if (d && d.url && d.key) return { url: d.url, key: d.key };
        return null;
    },

    isConfigured() {
        return !!this.config();
    },

    isConnected() {
        return this._connected;
    },

    user() {
        return this._session?.user?.email || null;
    },

    /** Full signed-in user object (email + metadata) or null. */
    sessionUser() {
        return this._session?.user || null;
    },

    mode() {
        return this._connected ? 'cloud' : 'local';
    },

    /* ---------- init (called from main.js) ---------- */

    init() {
        if (!this.isConfigured()) return; // local-only mode — do nothing
        this._bootFromSavedConfig();
    },

    _bootFromSavedConfig() {
        const c = this.config();
        if (!window.supabase || !window.supabase.createClient) {
            console.error('Supabase library not loaded');
            return;
        }
        this._client = window.supabase.createClient(c.url, c.key);
        this._connected = true;
        this._attachAuth();
        this._wireSaveHook();
        this._renderAuthGate();
        // If a session already exists (page refresh), load immediately
        this._client.auth.getSession().then(({ data }) => {
            this._session = data.session || null;
            this._renderAuthGate();
            this._notifySession();
            if (this._session) this.loadAll();
        }).catch(e => console.error('getSession failed:', e));
    },

    _attachAuth() {
        if (this._authAttached) return;
        this._authAttached = true;
        this._client.auth.onAuthStateChange((_event, session) => {
            this._session = session || null;
            this._renderAuthGate();
            this._notifySession();
            if (this._session) this.loadAll().catch(e => console.error('loadAll failed:', e));
        });
    },

    /* ---------- session observers (sidebar user card, etc.) ---------- */

    _sessionCallbacks: [],

    onSessionChange(cb) {
        this._sessionCallbacks.push(cb);
        return this;
    },

    _notifySession() {
        this._sessionCallbacks.forEach(cb => {
            try { cb(this._session); } catch (e) { console.error('Session callback error:', e); }
        });
    },

    _wireSaveHook() {
        Store.onAfterSave(() => this.schedulePush());
    },

    /* ---------- connect / disconnect (Settings page) ---------- */

    async connect(url, key) {
        if (!window.supabase || !window.supabase.createClient) {
            throw new Error('Supabase library not loaded');
        }
        const client = window.supabase.createClient(url.trim(), key.trim());
        // Test the connection against a real table
        const { error } = await client.from('tutors').select('id').limit(1);
        if (error) {
            throw new Error(error.code === '42P01'
                ? "Connected, but the 'tutors' table is missing — run the setup SQL first (see SETUP.md)."
                : `Connection failed: ${error.message}`);
        }
        localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }));
        this._client = client;
        this._connected = true;
        this._attachAuth();
        this._wireSaveHook();
        this._renderAuthGate();
        return true;
    },

    /** Remove this device's stored choice so the team default applies again. */
    clearLocalOverride() {
        try { localStorage.removeItem(CONFIG_KEY); } catch { /* ignore */ }
    },

    disconnect() {
        // Explicit opt-out for THIS device (overrides the team default).
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify({ disabled: true })); } catch { /* ignore */ }
        if (this._client) {
            try { this._client.auth.signOut(); } catch { /* ignore */ }
        }
        this._client = null;
        this._connected = false;
        this._session = null;
        this._authAttached = false;
        this._baseline = { tutors: new Set(), payslips: new Set(), quotations: new Set() };
        this.hideAuthGate();
    },

    /* ---------- auth (magic link for invited team emails) ---------- */

    async signIn(email, password) {
        if (!this._client) throw new Error('Not connected to the cloud database');
        const clean = (email || '').trim();
        if (!clean) throw new Error('Enter your email first');
        if (!password) throw new Error('Enter your password');
        const { error } = await this._client.auth.signInWithPassword({ email: clean, password });
        if (error) {
            const msg = /invalid login|invalid credentials/i.test(error.message)
                ? 'That email and password don’t match — try again, or use the magic link below.'
                : error.message;
            throw new Error(msg);
        }
        return clean;
    },

    async sendMagicLink(email) {
        if (!this._client) throw new Error('Not connected to the cloud database');
        const clean = (email || '').trim();
        if (!clean) throw new Error('Enter your email first');
        const { error } = await this._client.auth.signInWithOtp({
            email: clean,
            options: { shouldCreateUser: false } // only invited users can sign in
        });
        if (error) {
            const msg = /not found|invalid login|signups not allowed/i.test(error.message)
                ? 'That email hasn’t been invited yet — ask Ishita to invite it in Supabase (one-time).'
                : error.message;
            throw new Error(msg);
        }
        return clean;
    },

    async signOut() {
        if (!this._client) return;
        try {
            await this._client.auth.signOut();
        } catch (e) {
            // Even if the server call fails (offline, bad token), clear the
            // local session and bring the gate back.
            console.warn('signOut request failed:', e);
        }
        this._session = null;
        this._renderAuthGate();
        this._notifySession();
    },

    /* ---------- sync ---------- */

    async loadAll() {
        if (!this._connected || !this._client) return;
        const payload = {};
        let cloudEmpty = true;
        for (const t of this.TABLES) {
            const { data, error } = await this._client.from(t).select('id, data');
            if (error) {
                UI.showToast(`Cloud: couldn't load ${t} — ${error.message}`, 'error');
                throw error;
            }
            const rows = (data || []).map(r => ({ ...(r.data || {}), id: r.id }));
            if (rows.length) cloudEmpty = false;
            this._baseline[t] = new Set(rows.map(r => r.id));
            payload[t] = rows;
        }

        // First-device seeding: the cloud is still empty but this device has
        // records → upload them BEFORE replacing local state, so the first
        // person to sign in never loses their data. (Subsequent devices just
        // pull; the "Move my local data" button in Settings handles later merges.)
        const local = Store.getState();
        const localHasData = this.TABLES.some(t => (local[t] || []).length > 0);
        if (cloudEmpty && localHasData) {
            await this.pushAll(true);
            for (const t of this.TABLES) {
                const { data, error } = await this._client.from(t).select('id, data');
                if (error) {
                    UI.showToast(`Cloud: couldn't reload ${t} — ${error.message}`, 'error');
                    throw error;
                }
                const rows = (data || []).map(r => ({ ...(r.data || {}), id: r.id }));
                this._baseline[t] = new Set(rows.map(r => r.id));
                payload[t] = rows;
            }
            UI.showToast('Uploaded this device’s data to the cloud ☁️', 'success');
        }

        Store.replaceState(payload);
        UI.showToast('Synced with the shared database ☁️', 'success');
        this.refreshCurrentPage();
    },

    schedulePush() {
        if (!this._connected || !this._client) return;
        clearTimeout(this._pushTimer);
        this._pushTimer = setTimeout(() => {
            this.pushAll().catch(e => console.error('Cloud push failed:', e));
        }, 600);
    },

    async pushAll(silent = false) {
        if (!this._connected || !this._client) return;
        const state = Store.getState();
        for (const t of this.TABLES) {
            const local = state[t] || [];
            const localIds = new Set(local.map(r => r.id));

            // Delete rows that were in our baseline and are gone locally now
            const toDelete = [...this._baseline[t]].filter(id => !localIds.has(id));
            if (toDelete.length) {
                const { error } = await this._client.from(t).delete().in('id', toDelete);
                if (error) {
                    console.error('Cloud delete failed:', t, error);
                    if (!silent) UI.showToast(`Cloud: delete failed on ${t} — ${error.message}`, 'error');
                    continue;
                }
                toDelete.forEach(id => this._baseline[t].delete(id));
            }

            // Upsert everything local
            if (local.length) {
                const payload = local.map(r => ({
                    id: r.id,
                    data: r,
                    updated_at: new Date().toISOString()
                }));
                const { error } = await this._client.from(t).upsert(payload, { onConflict: 'id' });
                if (error) {
                    console.error('Cloud upsert failed:', t, error);
                    if (!silent) UI.showToast(`Cloud: sync failed on ${t} — changes kept locally`, 'error');
                    continue;
                }
                localIds.forEach(id => this._baseline[t].add(id));
            }
        }
    },

    /* ---------- UI helpers ---------- */

    _renderAuthGate() {
        const gate = document.getElementById('auth-gate');
        if (!gate) return;
        gate.style.display = (this._connected && !this._session) ? 'flex' : 'none';
    },

    hideAuthGate() {
        const gate = document.getElementById('auth-gate');
        if (gate) gate.style.display = 'none';
    },

    refreshCurrentPage() {
        const active = document.querySelector('.page.active')?.id;
        import('../components/dashboard.js').then(m => m.Dashboard.refresh());
        if (active === 'page-payslips') {
            import('../components/payslips.js').then(m => m.Payslips.init());
        } else if (active === 'page-approvals') {
            import('../components/approvals.js').then(m => m.Approvals.init());
        } else if (active === 'page-quotations') {
            import('../components/quotations.js').then(m => m.Quotations.init());
        } else if (active === 'page-website') {
            import('../components/websiteSubmissions.js').then(m => m.WebsiteSubmissions.init());
        } else if (active === 'page-tutors') {
            import('../components/tutors.js').then(m => m.Tutors.init());
        }
    }
};