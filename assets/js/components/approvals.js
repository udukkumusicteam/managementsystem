import { Store } from '../state/store.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';
import { Config } from '../config.js';
import { Cloud } from '../services/cloudService.js';

/**
 * Approvals Component — digital signature workflow for payslips.
 *
 * Flow: every generated payslip is 'pending'. Ishita sets her signature once
 * (paste or upload). Each pending payslip is approved with ONE click — the
 * signature is stamped onto the payslip record and rendered on the PDF.
 *
 * Permissions:
 *  - Local mode (no cloud): anyone using the app on this device can approve.
 *  - Cloud mode: only the configured approver email (Config.admin.email) can
 *    approve; other signed-in users can view but not sign.
 */
export const Approvals = {
    _pasteBound: false,

    init() {
        this.renderSignatureCard();
        this.renderLists();
        this.bindPasteOnce();
    },

    /* ---------- permissions ---------- */

    canApprove() {
        if (!Cloud.isConfigured()) return true;
        return (Cloud.user() || '') === Config.approverEmail;
    },

    approverName() {
        return Cloud.isConfigured() ? (Cloud.user() || Config.admin.name) : Config.admin.name;
    },

    /* ---------- signature card ---------- */

    renderSignatureCard() {
        const card = document.getElementById('signature-body');
        if (!card) return;

        // Non-approvers: signature management is fully hidden — they can view
        // and download signed payslips, but never touch the signature itself.
        if (!this.canApprove()) {
            const hint = document.querySelector('#page-approvals .card-header .card-hint');
            if (hint) hint.textContent = `Approver only — ${Config.admin.name}`;
            card.innerHTML = `
                <div class="sig-locked">
                    <div class="sig-locked-icon">🔒</div>
                    <p style="font-size:15px; margin-bottom:4px"><strong>The signature is managed by ${Config.admin.name} (approver)</strong></p>
                    <p class="form-hint" style="margin:0 auto">Only the approver can set, change or remove the signature and approve payment receipts. Approved receipts are visible and downloadable by everyone.</p>
                </div>
            `;
            return;
        }

        const sig = Store.getSignature();

        if (sig) {
            card.innerHTML = `
                <div class="sig-set">
                    <div class="sig-preview-wrap">
                        <img src="${sig}" alt="Saved signature">
                        <div class="sig-line"></div>
                    </div>
                    <div class="sig-actions">
                        <p style="font-size:14px; margin-bottom:10px">
                            <strong>Signature ready.</strong> Every payment receipt you approve will be stamped with this signature.
                        </p>
                        <div style="display:flex; gap:8px; flex-wrap:wrap">
                            <button class="btn btn-ghost btn-sm" id="btn-sig-replace">🔄 Replace</button>
                            <button class="btn btn-ghost btn-sm" id="btn-sig-remove">🗑️ Remove</button>
                        </div>
                        <input type="file" id="sig-file-input" accept="image/png,image/jpeg,image/webp" style="display:none">
                    </div>
                </div>
            `;

            document.getElementById('btn-sig-replace')?.addEventListener('click', () => {
                document.getElementById('sig-file-input')?.click();
            });
            document.getElementById('sig-file-input')?.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) this.handleSignatureImage(file);
                e.target.value = '';
            });
            document.getElementById('btn-sig-remove')?.addEventListener('click', () => {
                UI.showConfirm(
                    'Remove Signature',
                    'Remove your saved signature? Receipts that are already signed keep theirs.',
                    () => {
                        Store.clearSignature();
                        UI.showToast('Signature removed', 'success');
                        this.renderSignatureCard();
                        this.renderLists();
                    }
                );
            });
        } else {
            card.innerHTML = `
                <div class="sig-drop" id="sig-drop">
                    <div class="sig-drop-icon">✍️</div>
                    <p style="font-size:15px; margin-bottom:4px"><strong>Paste or upload the signature</strong></p>
                    <p class="form-hint" style="max-width:520px; margin:0 auto 14px">
                        Copy the signature image (e.g. from a screenshot or scanned document) and press <strong>Ctrl+V</strong>
                        here, or click the button to choose a file. Set it once — approving a payment receipt after that is a single click.
                    </p>
                    <button class="btn btn-primary btn-sm" id="btn-sig-upload" type="button">📎 Choose an image</button>
                    <input type="file" id="sig-file-input" accept="image/png,image/jpeg,image/webp" style="display:none">
                </div>
            `;

            const openPicker = () => document.getElementById('sig-file-input')?.click();
            document.getElementById('btn-sig-upload')?.addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });
            document.getElementById('sig-drop')?.addEventListener('click', openPicker);
            document.getElementById('sig-file-input')?.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) this.handleSignatureImage(file);
                e.target.value = '';
            });
        }
    },

    handleSignatureImage(file) {
        if (!file || !file.type.startsWith('image/')) {
            UI.showToast('Please choose an image file', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                // Downscale to keep localStorage light; transparency is preserved.
                const maxW = 800;
                const scale = Math.min(1, maxW / img.naturalWidth);
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL('image/png');
                if (Store.setSignature(dataUrl)) {
                    UI.showToast('Signature saved ✍️', 'success');
                    this.renderSignatureCard();
                    this.renderLists();
                } else {
                    UI.showToast('Could not save the signature — it may be too large', 'error');
                }
            };
            img.onerror = () => UI.showToast('Could not read that image', 'error');
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    },

    bindPasteOnce() {
        if (this._pasteBound) return;
        this._pasteBound = true;
        document.addEventListener('paste', (e) => {
            const page = document.getElementById('page-approvals');
            if (!page?.classList.contains('active')) return;
            const items = e.clipboardData?.items || [];
            for (const it of items) {
                if (it.type.startsWith('image/')) {
                    const file = it.getAsFile();
                    if (file) {
                        e.preventDefault();
                        this.handleSignatureImage(file);
                        break;
                    }
                }
            }
        });
    },

    /* ---------- lists ---------- */

    renderLists() {
        const pending = document.getElementById('pending-list');
        const approved = document.getElementById('approved-list');
        if (!pending || !approved) return;

        const can = this.canApprove();

        const pendingList = Store.getPendingPayslips().sort((a, b) => b.createdAt - a.createdAt);
        if (pendingList.length === 0) {
            pending.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎉</div>
                    <h3>Nothing waiting</h3>
                    <p>Every generated payment receipt has been approved and signed.</p>
                </div>`;
        } else {
            pending.innerHTML = pendingList.map(p => `
                <div class="approval-card" data-id="${p.id}">
                    <div class="approval-left">
                        <div class="tutor-avatar">${Formatters.initials(p.tutorName)}</div>
                        <div>
                            <h4>${p.tutorName}</h4>
                            <p>${p.subject} · ${Formatters.monthLong(p.month)} ${p.year}</p>
                        </div>
                    </div>
                    <div class="approval-right">
                        <div class="amount">${Formatters.currency(p.grandTotal)}</div>
                        <div class="date">Generated ${Formatters.date(p.createdAt)}</div>
                    </div>
                    <div class="approval-actions">
                        <button class="btn btn-ghost btn-sm" data-action="view" data-id="${p.id}">👁️ View PDF</button>
                        ${can
                            ? `<button class="btn btn-primary btn-sm" data-action="approve" data-id="${p.id}">✍️ Approve &amp; Sign</button>`
                            : `<span class="waiting-chip">⏳ Waiting for ${Config.admin.name}'s signature</span>`}
                    </div>
                </div>
            `).join('');
        }

        const approvedList = Store.getApprovedPayslips().sort((a, b) => b.signedAt - a.signedAt);
        if (approvedList.length === 0) {
            approved.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>No signed receipts yet</h3>
                    <p>Payment receipts you approve and sign will appear here.</p>
                </div>`;
        } else {
            approved.innerHTML = approvedList.map(p => `
                <div class="approval-card signed" data-id="${p.id}">
                    <div class="approval-left">
                        <div class="tutor-avatar">${Formatters.initials(p.tutorName)}</div>
                        <div>
                            <h4>${p.tutorName}</h4>
                            <p>${p.subject} · ${Formatters.monthLong(p.month)} ${p.year}</p>
                        </div>
                    </div>
                    <div class="approval-right">
                        <div class="amount">${Formatters.currency(p.grandTotal)}</div>
                        <div class="date">Signed ${p.signedAt ? Formatters.date(p.signedAt) : '—'}${p.signedBy ? ` by ${p.signedBy}` : ''}</div>
                    </div>
                    <div class="approval-actions">
                        <button class="btn btn-ghost btn-sm" data-action="download" data-id="${p.id}">⬇️ Signed PDF</button>
                        ${can ? `<button class="btn btn-ghost btn-sm" data-action="undo" data-id="${p.id}">↩️ Undo</button>` : ''}
                    </div>
                </div>
            `).join('');
        }

        // Cloud-mode notice for non-approver users (prepended AFTER innerHTML so it survives)
        if (!can) {
            const notice = `
                <div class="info-note" style="margin-bottom:14px">
                    <span class="note-icon">🔒</span>
                    <p>You can view and download signed payment receipts here. Approving, signing and undoing are limited to <strong>${Config.admin.name}</strong> (<strong>${Config.approverEmail}</strong>).</p>
                </div>`;
            pending.insertAdjacentHTML('afterbegin', notice);
        }

        // Wire actions
        document.querySelectorAll('#page-approvals [data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const payslip = Store.getPayslipById(id);
                if (!payslip) return;
                const action = btn.dataset.action;

                if (action === 'approve') this.approve(payslip);
                else if (action === 'view' || action === 'download') this.downloadPdf(payslip);
                else if (action === 'undo') this.undoApproval(payslip);
            });
        });
    },

    approve(payslip) {
        if (!this.canApprove()) {
            UI.showToast('Only the approver can sign payment receipts', 'error');
            return;
        }
        const sig = Store.getSignature();
        if (!sig) {
            UI.showToast('Add your signature first (top of this page)', 'error');
            document.getElementById('signature-body')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const updated = Store.approvePayslip(payslip.id, {
            signature: sig,
            signedBy: this.approverName()
        });

        if (updated) {
            UI.showToast('Payment receipt approved & signed ✍️', 'success');
            this.renderLists();
            import('./dashboard.js').then(m => m.Dashboard.refresh());
        } else {
            UI.showToast('Could not approve this payment receipt', 'error');
        }
    },

    undoApproval(payslip) {
        UI.showConfirm(
            'Undo Approval',
            `Send ${payslip.tutorName}'s payment receipt (${Formatters.monthLong(payslip.month)} ${payslip.year}) back to pending? The signature will be removed from it.`,
            () => {
                if (Store.unapprovePayslip(payslip.id)) {
                    UI.showToast('Payslip sent back to pending', 'success');
                    this.renderLists();
                    import('./dashboard.js').then(m => m.Dashboard.refresh());
                }
            }
        );
    },

    downloadPdf(payslip) {
        if (!payslip) return;
        import('../services/pdfService.js').then(m => m.PDFService.generate(payslip));
    }
};