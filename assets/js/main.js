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

    initMobileNav() {
        const toggle = document.getElementById('btn-menu-toggle');
        const backdrop = document.getElementById('sidebar-backdrop');

        if (toggle) {
            toggle.addEventListener('click', () => {
                const sb = document.querySelector('.sidebar');
                if (sb && sb.classList.contains('open')) this.closeSidebar();
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