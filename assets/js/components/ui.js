/**
 * Shared UI Components
 */
export const UI = {
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `${icons[type] || icons.info} ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3500);
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    },

    showConfirm(title, message, onConfirm, onCancel) {
        const modal = document.getElementById('delete-modal');
        if (!modal) return;

        const titleEl = modal.querySelector('.modal-header h3');
        const messageEl = modal.querySelector('#delete-confirm-text');
        const confirmBtn = modal.querySelector('#confirm-delete');
        const cancelBtn = modal.querySelector('#cancel-delete');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        const confirmClone = confirmBtn.cloneNode(true);
        const cancelClone = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(confirmClone, confirmBtn);
        cancelBtn.parentNode.replaceChild(cancelClone, cancelBtn);

        confirmClone.addEventListener('click', () => {
            this.hideModal('delete-modal');
            if (onConfirm) onConfirm();
        });

        cancelClone.addEventListener('click', () => {
            this.hideModal('delete-modal');
            if (onCancel) onCancel();
        });

        this.showModal('delete-modal');
    },

    showEmptyState(container, icon = '📄', title = 'No data', message = 'Add some data to get started') {
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    },

    initEventListeners() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal-overlay').classList.remove('active');
            });
        });
    }
};