/**
 * Website Submissions Service (final, 7 Oct 2026)
 *
 * Reads the tables that the udukkumusic.com site writes to — the same data
 * the site's own admin dashboard shows. This is a SEPARATE Supabase project
 * from the app's shared database; the key below is the site's public
 * publishable key (already embedded in the website's public code).
 *
 * Aligned with the website's admin dashboard (4 forms, 7 Oct 2026):
 *   session_bookings, contact_messages, corporate_bookings, city_requests
 *
 * Status vocabulary (the site's admin): New / Contacted / Closed.
 * Updates with this key are allowed (verified 7 Oct 2026, no-op PATCH).
 */
export const WebsiteSubmissionsService = {
    SITE_URL: 'https://okyqdblkvynyrpcuhmhb.supabase.co',
    SITE_KEY: 'sb_publishable_QnoLM-gwYMA2d3Xo8FCLDg_3rOgJTFi',

    // Table → display config. nameKey/contactKeys/subjectKey/messageKey drive
    // the summary columns; the detail view shows every field automatically.
    TABLES: {
        session_bookings: {
            label: 'Session Bookings', icon: '🎵', hasStatus: true,
            nameKey: 'name', contactKeys: ['phone', 'email'],
            subjectKey: 'instrument', messageKey: 'notes',
            formTypeKey: 'form_type'
        },
        contact_messages: {
            label: 'Contact Us', icon: '✉️', hasStatus: true,
            nameKey: 'name', contactKeys: ['phone', 'email'],
            subjectKey: 'subject', messageKey: 'message'
        },
        corporate_bookings: {
            label: 'Corporate Wellness', icon: '🏢', hasStatus: true,
            nameKey: 'contact_name', contactKeys: ['work_email', 'phone'],
            subjectKey: 'company_name', messageKey: 'goals'
        },
        city_requests: {
            label: 'City Requests', icon: '📍', hasStatus: true,
            nameKey: 'name', contactKeys: ['phone', 'email'],
            subjectKey: 'city', messageKey: 'event_interest'
        }
    },

    STATUSES: ['New', 'Contacted', 'Closed'],

    /**
     * All rows of one table, newest first (up to 200).
     * Throws Error('NO_TABLE') if the table doesn't exist,
     * Error('NO_SUPABASE') when the Supabase library isn't loaded.
     */
    async list(table) {
        const client = this._client();
        if (!client) throw new Error('NO_SUPABASE');
        const { data, error } = await client
            .from(table)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) {
            if (error.code === 'PGRST205' || error.code === '42P01'
                || /could not find the table/i.test(error.message || '')) {
                throw new Error('NO_TABLE');
            }
            throw new Error(error.message);
        }
        return (data || []).map(r => ({
            ...r,
            _date: r.created_at ? new Date(r.created_at).getTime() : Date.now()
        }));
    },

    /** Row counts for all tables (for the tab badges). */
    async counts() {
        const client = this._client();
        if (!client) return {};
        const out = {};
        await Promise.all(Object.keys(this.TABLES).map(async t => {
            const { count, error } = await client
                .from(t).select('*', { count: 'exact', head: true });
            out[t] = error ? null : (count || 0);
        }));
        return out;
    },

    /** Set a row's status ('New' | 'Contacted' | 'Closed' — the site's values). */
    async setStatus(table, id, status) {
        const client = this._client();
        if (!client) throw new Error('NO_SUPABASE');
        const { error } = await client.from(table).update({ status }).eq('id', id);
        if (error) throw new Error(error.message);
    },

    _client() {
        if (!window.supabase || !window.supabase.createClient) return null;
        return window.supabase.createClient(this.SITE_URL, this.SITE_KEY);
    },

    isReady() {
        return !!this._client();
    }
};