import { Cloud } from '../services/cloudService.js';

/**
 * User Card — the sidebar section showing who is using the app right now.
 *
 *  - Cloud + signed in:  avatar + name + email + Sign out (👋)
 *  - Cloud + not signed in: (the auth gate covers the app — not shown)
 *  - Local mode:         "Local mode / Not signed in" + Sign in (🔑)
 *                        which re-opens the sign-in screen on this device.
 *
 * The name comes from the user's metadata in Supabase (full_name / name /
 * first+last), falling back to a pretty version of the email prefix.
 */
export const UserCard = {
    displayName(user) {
        const meta = user?.user_metadata || {};
        const full = meta.full_name || meta.name || meta.display_name ||
            [meta.first_name, meta.last_name].filter(Boolean).join(' ');
        if (full) return full;
        const local = (user?.email || '').split('@')[0];
        if (!local) return 'Team member';
        return local.split(/[_\-.]+/)
            .filter(Boolean)
            .map(w => w[0].toUpperCase() + w.slice(1))
            .join(' ');
    },

    initials(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    render() {
        const el = document.getElementById('sidebar-user');
        if (!el) return;

        const user = Cloud.sessionUser();

        if (Cloud.isConfigured() && user) {
            const name = this.displayName(user);
            el.innerHTML = `
                <div class="admin-avatar">${this.initials(name)}</div>
                <div class="admin-info">
                    <h4>${name}</h4>
                    <p>${user.email}</p>
                </div>
                <button class="icon-btn sidebar-signout" id="btn-sidebar-signout" title="Sign out">👋</button>
            `;
            document.getElementById('btn-sidebar-signout')?.addEventListener('click', async () => {
                await Cloud.signOut();
            });
            this.updateDashboardSubtitle(name);
        } else if (!Cloud.isConfigured()) {
            el.innerHTML = `
                <div class="admin-avatar local">💾</div>
                <div class="admin-info">
                    <h4>Local mode</h4>
                    <p>Not signed in</p>
                </div>
                <button class="icon-btn sidebar-signin" id="btn-sidebar-signin" title="Sign in to the shared database">🔑</button>
            `;
            document.getElementById('btn-sidebar-signin')?.addEventListener('click', () => {
                Cloud.clearLocalOverride();
                location.reload();
            });
            this.updateDashboardSubtitle(null);
        }
        // Cloud configured but not signed in: the auth gate covers the app,
        // so there's nothing to show here.
    },

    updateDashboardSubtitle(name) {
        const page = document.getElementById('page-dashboard');
        const sub = document.getElementById('topbar-subtitle');
        if (sub && page?.classList.contains('active')) {
            sub.textContent = name ? `Welcome back, ${name}` : 'Welcome back';
        }
    }
};