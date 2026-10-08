// Main Application Entry Point
import { Store } from './state/store.js';
import { Dashboard } from './components/dashboard.js';
import { UI } from './components/ui.js';
import { Cloud } from './services/cloudService.js';

/**
 * Main Application
 */
const App = {
    isMobile() {
        return window.matchMedia('(max-width: 900px)').matches;
    },

    openSidebar() {
        const sb = document.querySelector('.sidebar');
        const bd = document.getElementById('sidebar-backdrop');
        const tg = document.getElementById('btn-menu-toggle');
        if (sb) sb.classList.add('open');
        if (bd) bd.classList.add('show');
        if (tg) tg.setAttribute('aria-expanded', 'true');
    },

    closeSidebar() {
        const sb = document.querySelector('.sidebar');
        const bd = document.getElementById('sidebar-backdrop');
        const tg = document.getElementById('btn-menu-toggle');
        if (sb) sb.classList.remove('open');
        if (bd) bd.classList.remove('show');
        if (tg) tg.setAttribute('aria-expanded', 'false');
    },

    // Desktop: collapse / expand the sidebar to an icon rail (chevron handle on the sidebar's edge)
    toggleDesktopSidebar() {
        const collapsed = document.body.classList.toggle('sidebar-collapsed');
        try {
            localStorage.setItem('udukku_sidebar_collapsed', collapsed ? '1' : '0');
        } catch { /* ignore */ }
        App.updateHandleLabel();
    },

    // Keep the handle's tooltip in sync with the state
    updateHandleLabel() {
        const h = document.getElementById('sidebar-collapse-handle');
        if (!h) return;
        const collapsed = document.body.classList.contains('sidebar-collapsed');
        h.title = collapsed ? 'Expand menu' : 'Collapse menu';
        h.setAttribute('aria-label', h.title);
        h.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    },

    initMobileNav() {
        const toggle = document.getElementById('btn-menu-toggle');
        const backdrop = document.getElementById('sidebar-backdrop');
        const sb = document.querySelector('.sidebar');

        // Desktop chevron handle on the sidebar's right edge (added via JS — no HTML changes).
        // A small round button riding the edge of the panel: ‹ collapse, › expand.
        if (sb && !document.getElementById('sidebar-collapse-handle')) {
            const handle = document.createElement('button');
            handle.className = 'sidebar-collapse-handle';
            handle.id = 'sidebar-collapse-handle';
            handle.type = 'button';
            handle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
            handle.addEventListener('click', () => App.toggleDesktopSidebar());
            sb.appendChild(handle);
        }

        // Desktop rail: give each nav item a tooltip (shows when collapsed)
        document.querySelectorAll('.nav-item').forEach(item => {
            const label = item.childNodes[1] && item.childNodes[1].textContent;
            if (label && label.trim()) item.title = label.trim();
        });

        // Restore the last sidebar choice (desktop collapse)
        try {
            if (localStorage.getItem('udukku_sidebar_collapsed') === '1') {
                document.body.classList.add('sidebar-collapsed');
            }
        } catch { /* ignore */ }
        App.updateHandleLabel();

        if (toggle) {
            toggle.addEventListener('click', () => {
                // Mobile only — the chevron handle takes care of desktop
                if (!App.isMobile()) return;
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && sidebar.classList.contains('open')) this.closeSidebar();
                else this.openSidebar();
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeSidebar());
        }

        // Close the drawer after a nav pick (mobile only)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (App.isMobile()) App.closeSidebar();
            });
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && App.isMobile()) App.closeSidebar();
        });

        // If the window is resized up to desktop, drop the open state
        let wasMobile = App.isMobile();
        window.addEventListener('resize', () => {
            const now = App.isMobile();
            if (wasMobile && !now) App.closeSidebar();
            wasMobile = now;
        });
    },

    init() {
        console.log('🎵 Initializing Udukku Tutor Payslip System...');

        // Initialize state
        Store.init();

        // Seed sample data if empty (for development)
        if (Store.getTutors().length === 0) {
            Store.seedSampleData();
        }

        // Initialize UI components
        UI.initEventListeners();

        // Initialize dashboard (default page)
        Dashboard.init();

        // Cloud database (activates only if connected in Settings)
        Cloud.init();

        // Sidebar user card (current signed-in user + sign in/out)
        import('./components/userCard.js').then(module => {
            module.UserCard.render();
            Cloud.onSessionChange(() => module.UserCard.render());
        });

        // Mobile navigation: sidebar drawer + backdrop
        App.initMobileNav();

        // Auth gate: password sign-in (primary) + magic link fallback (cloud mode only)
        const authStatus = document.getElementById('auth-status');
        const showAuthStatus = (text) => {
            if (!authStatus) return;
            authStatus.textContent = text || '';
            authStatus.style.display = text ? 'block' : 'none';
        };

        const doSignIn = async () => {
            const btn = document.getElementById('btn-sign-in');
            const email = document.getElementById('auth-email')?.value.trim();
            const password = document.getElementById('auth-password')?.value;
            if (!email || !password) {
                showAuthStatus('Enter both your email and password');
                return;
            }
            if (btn) btn.disabled = true;
            try {
                await Cloud.signIn(email, password);
                if (document.getElementById('auth-password')) document.getElementById('auth-password').value = '';
            } catch (e) {
                showAuthStatus(e.message || 'Sign-in failed — try the magic link below.');
            }
            if (btn) btn.disabled = false;
        };

        document.getElementById('btn-sign-in')?.addEventListener('click', doSignIn);
        document.getElementById('auth-password')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSignIn();
        });

        document.getElementById('btn-magic-link')?.addEventListener('click', async () => {
            const email = document.getElementById('auth-email')?.value.trim();
            const btn = document.getElementById('btn-magic-link');
            btn.disabled = true;
            showAuthStatus('Sending…');
            try {
                const sent = await Cloud.sendMagicLink(email);
                showAuthStatus(`Link sent to ${sent} — click it in your inbox to sign in. (Check spam if it's not there in a couple of minutes.)`);
            } catch (e) {
                showAuthStatus(e.message || 'Could not send the link.');
            }
            btn.disabled = false;
        });

        document.getElementById('btn-local-mode')?.addEventListener('click', () => {
            // Per-device opt-out of the shared database (same as Settings → Disconnect).
            try {
                localStorage.setItem('udukku_cloud_config', JSON.stringify({ disabled: true }));
            } catch { /* ignore */ }
            location.reload();
        });

        console.log('✅ Udukku Tutor Payslip System initialized successfully!');
    }
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}