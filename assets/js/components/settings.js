import { Cloud } from '../services/cloudService.js';
import { UI } from './ui.js';
import { Config } from '../config.js';

/**
 * Settings Component — cloud database connection, team sign-in status,
 * and local→cloud migration. (Project-specific, added 8 Sep 2026.)
 */
export const Settings = {
    init() {
        this.render();
    },

    render() {
        const body = document.getElementById('settings-body');
        if (!body) return;

        const connected = Cloud.isConnected();
        const user = Cloud.user();

        body.innerHTML = `
            <div class="card" style="max-width:720px">
                <div class="card-header">
                    <h3>Shared Database</h3>
                    <span class="badge ${connected ? 'badge-orange' : ''}">${connected ? '☁️ Cloud connected' : '💾 Local only'}</span>
                </div>
                <div class="card-body">
                    <p style="font-size:13.5px; color:var(--brown-light); line-height:1.6; margin-bottom:20px">
                        Connect the app to Udukku's shared Supabase database so every team member works
                        from the same tutors, payslips and pricing estimates — on any device. Until it's connected,
                        your data stays in this browser only.
                    </p>
                    ${connected ? this.connectedHTML(user) : this.connectHTML()}
                </div>
            </div>
            <div class="card" style="max-width:720px; margin-top:20px">
                <div class="card-header">
                    <h3>🛡️ Team Access</h3>
                    <span class="badge badge-orange">Invited only</span>
                </div>
                <div class="card-body">
                    <p style="font-size:13.5px; color:var(--brown-light); line-height:1.6; margin-bottom:12px">
                        Who can sign in to this app is managed in Supabase — only invited work emails can get a login
                        link, and everyone else sees <em>"ask Ishita"</em>. You (Ishita) can add or remove people anytime:
                    </p>
                    <ul class="team-guide">
                        <li><strong>Add a person:</strong> Supabase → <strong>Authentication → Users → Add user → Create new user</strong> → enter their email → Create user.</li>
                        <li><strong>Remove a person:</strong> same page → <strong>⋮ (three dots) next to their name → Delete user</strong>. They'll no longer be able to sign in.</li>
                    </ul>
                    <a class="btn btn-secondary" id="set-team-link" href="https://supabase.com/dashboard" target="_blank" rel="noopener">🔑 Open Supabase Dashboard</a>
                </div>
            </div>
        `;

        this.bindEvents(connected, user);
    },

    connectHTML() {
        return `
            <div class="form-group">
                <label class="form-label">Supabase Project URL</label>
                <input type="text" class="form-control" id="cloud-url" placeholder="https://xxxxxxxx.supabase.co">
                <p class="form-hint">Supabase dashboard → Project Settings → API → Project URL</p>
            </div>
            <div class="form-group">
                <label class="form-label">Anon / Public API Key</label>
                <input type="text" class="form-control" id="cloud-key" placeholder="eyJhbGciOi...">
                <p class="form-hint">Same panel → API → anon public key. It's safe to use in this app; access is still controlled by sign-in.</p>
            </div>
            <button class="btn btn-primary" id="btn-cloud-connect">🔌 Save &amp; Connect</button>
            <p class="form-hint" style="margin-top:12px">
                New here? Follow <strong>SETUP.md</strong> in the project folder — it's a 5-minute setup
                (create the free project, run the SQL, invite team emails).
            </p>
            ${Config.cloudDefault?.url ? `
            <p style="margin-top:16px; font-size:13px; color:var(--brown-light)">
                You previously disconnected this device. To rejoin the shared database:
            </p>
            <button class="btn btn-secondary" id="btn-cloud-restore" style="margin-top:8px">🔌 Reconnect to the team database</button>
            ` : ''}
        `;
    },

    connectedHTML(user) {
        return `
            <div class="info-note" style="margin-bottom:16px">
                <span class="note-icon">✅</span>
                <p>
                    ${user
                        ? `Signed in as <strong>${user}</strong>. Everyone signed in to the shared database sees the same data.`
                        : 'Connected — sign in with your invited email to load the shared data.'}
                </p>
            </div>
            <div class="quick-actions" style="max-width:480px">
                <div class="quick-action-btn" id="set-refresh" style="cursor:pointer">
                    <div class="quick-action-icon">🔄</div>
                    <div class="quick-action-text">
                        <h4>Refresh from cloud</h4>
                        <p>Pull the latest data from the shared database</p>
                    </div>
                </div>
                <div class="quick-action-btn" id="set-migrate" style="cursor:pointer">
                    <div class="quick-action-icon">⬆️</div>
                    <div class="quick-action-text">
                        <h4>Move my local data to the cloud</h4>
                        <p>Upload this browser's tutors, payslips and pricing estimates (adds to what's there — nothing is removed)</p>
                    </div>
                </div>
                ${user ? `
                <div class="quick-action-btn" id="set-signout" style="cursor:pointer">
                    <div class="quick-action-icon">👋</div>
                    <div class="quick-action-text">
                        <h4>Sign out</h4>
                        <p>Sign out on this device</p>
                    </div>
                </div>` : ''}
                <div class="quick-action-btn" id="set-disconnect" style="cursor:pointer">
                    <div class="quick-action-icon">🔌</div>
                    <div class="quick-action-text">
                        <h4>Disconnect cloud</h4>
                        <p>Go back to local-only mode (data already synced stays in the cloud)</p>
                    </div>
                </div>
            </div>
            <p class="form-hint" style="margin-top:16px">
                Everything is also kept in this browser as an offline copy, so the app still opens without internet.
            </p>
        `;
    },

    bindEvents(connected, user) {
        document.getElementById('btn-cloud-connect')?.addEventListener('click', async () => {
            const url = document.getElementById('cloud-url')?.value.trim();
            const key = document.getElementById('cloud-key')?.value.trim();
            if (!url || !key) {
                UI.showToast('Please enter both the URL and the API key', 'error');
                return;
            }
            const btn = document.getElementById('btn-cloud-connect');
            btn.disabled = true;
            btn.textContent = 'Connecting…';
            try {
                await Cloud.connect(url, key);
                UI.showToast('Connected! Sign in with your invited email.', 'success');
                this.render();
            } catch (e) {
                UI.showToast(e.message || 'Connection failed', 'error');
                btn.disabled = false;
                btn.innerHTML = '🔌 Save &amp; Connect';
            }
        });

        document.getElementById('set-refresh')?.addEventListener('click', async () => {
            UI.showToast('Refreshing from cloud…', 'info');
            try {
                await Cloud.loadAll();
            } catch {
                /* toast already shown by loadAll */
            }
        });

        document.getElementById('set-migrate')?.addEventListener('click', async () => {
            UI.showConfirm(
                'Move local data to the cloud',
                'This uploads the tutors, payslips and pricing estimates saved in this browser to the shared database. It only adds or updates records — it never deletes anything from the cloud. Continue?',
                async () => {
                    UI.showToast('Uploading your local data…', 'info');
                    await Cloud.pushAll(true);
                    UI.showToast('Local data moved to the cloud ✅', 'success');
                }
            );
        });

        document.getElementById('set-signout')?.addEventListener('click', async () => {
            await Cloud.signOut();
            UI.showToast('Signed out', 'success');
            this.render();
        });

        document.getElementById('btn-cloud-restore')?.addEventListener('click', () => {
            UI.showConfirm(
                'Reconnect to the shared database?',
                'This device will use the team database again. You will be asked to sign in with your invited email.',
                () => {
                    Cloud.clearLocalOverride();
                    location.reload();
                }
            );
        });

        document.getElementById('set-disconnect')?.addEventListener('click', () => {
            UI.showConfirm(
                'Disconnect the shared database?',
                'The app will go back to local-only mode on this device. Data already in the cloud is untouched and other devices are unaffected.',
                () => {
                    Cloud.disconnect();
                    UI.showToast('Disconnected — local-only mode', 'success');
                    this.render();
                }
            );
        });
    }
};
