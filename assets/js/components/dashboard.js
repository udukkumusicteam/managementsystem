import { Store } from '../state/store.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';
import { Cloud } from '../services/cloudService.js';
import { UserCard } from './userCard.js';

/**
 * Dashboard Component
 */
export const Dashboard = {
    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        document.getElementById('btn-new-payslip')?.addEventListener('click', () => {
            this.navigateTo('generate');
        });

        document.getElementById('btn-view-all-payslips')?.addEventListener('click', () => {
            this.navigateTo('payslips');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                if (page) this.navigateTo(page);
            });
        });
    },

    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        const user = Cloud.sessionUser();
        const titles = {
            dashboard: ['Dashboard', (Cloud.isConfigured() && user)
                ? `Welcome back, ${UserCard.displayName(user)}`
                : 'Welcome back'],
            generate: ['Generate Receipt', 'Create a new tutor payment receipt'],
            payslips: ['All Receipts', 'View and manage all generated payment receipts'],
            approvals: ['Receipt Approvals', 'Sign and release payment receipts'],
            quotations: ['Quotations', 'Create client quotations with live pricing'],
            tutors: ['Tutor Management', 'Manage tutor profiles and rates'],
            settings: ['Settings', 'Shared database, team access and data']
        };

        if (titles[page]) {
            document.getElementById('topbar-title').textContent = titles[page][0];
            document.getElementById('topbar-subtitle').textContent = titles[page][1];
        }

        if (page === 'payslips') {
            import('./payslips.js').then(module => module.Payslips.init());
        } else if (page === 'approvals') {
            import('./approvals.js').then(module => module.Approvals.init());
        } else if (page === 'quotations') {
            import('./quotations.js').then(module => module.Quotations.init());
        } else if (page === 'tutors') {
            import('./tutors.js').then(module => module.Tutors.init());
        } else if (page === 'settings') {
            import('./settings.js').then(module => module.Settings.init());
        } else if (page === 'generate') {
            import('./generate.js').then(module => module.Generate.init());
        } else if (page === 'dashboard') {
            this.refresh();
        }

        window.scrollTo(0, 0);
    },

    render() {
        this.renderStats();
        this.renderRecentPayslips();
        this.renderQuickActions();
    },

    renderStats() {
        const stats = Store.getStats();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        document.getElementById('stat-total-tutors').textContent = stats.totalTutors;
        document.getElementById('stat-month-payslips').textContent = stats.monthPayslips;
        document.getElementById('stat-total-paid').textContent = Formatters.currency(stats.totalPaidThisMonth);
        document.getElementById('stat-total-payslips').textContent = stats.totalPayslips;
        document.getElementById('stat-month-name').textContent = `${monthNames[stats.currentMonth]} ${stats.currentYear}`;
    },

    renderRecentPayslips() {
        const container = document.getElementById('recent-payslips-list');
        if (!container) return;

        const payslips = Store.getPayslips()
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5);

        if (payslips.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <h3>No payment receipts yet</h3>
                    <p>Generate your first payment receipt to see it here.</p>
                    <button class="btn btn-primary" id="empty-generate-btn">✨ Generate Receipt</button>
                </div>
            `;
            document.getElementById('empty-generate-btn')?.addEventListener('click', () => {
                this.navigateTo('generate');
            });
            return;
        }

        container.innerHTML = payslips.map(p => `
            <div class="payslip-row" data-id="${p.id}">
                <div class="payslip-row-left">
                    <div class="tutor-avatar">${Formatters.initials(p.tutorName)}</div>
                    <div class="payslip-row-info">
                        <h4>${p.tutorName}</h4>
                        <p>${p.subject} · ${Formatters.monthLong(p.month)} ${p.year}</p>
                    </div>
                </div>
                <div class="payslip-row-right">
                    <div class="amount">${Formatters.currency(p.grandTotal)}</div>
                    <div class="date">${Formatters.date(p.createdAt)}</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.payslip-row').forEach(row => {
            row.addEventListener('click', () => {
                const id = row.dataset.id;
                const payslip = Store.getPayslipById(id);
                if (payslip) {
                    import('../services/pdfService.js').then(module => {
                        module.PDFService.generate(payslip);
                    });
                }
            });
        });
    },

    renderQuickActions() {
        const container = document.getElementById('quick-actions');
        if (!container) return;

        const pendingCount = Store.getPendingPayslips().length;

        const actions = [
            { icon: '✨', title: 'Generate Receipt', description: 'Create a new tutor payment receipt', page: 'generate' },
            { icon: '✍️', title: 'Approve Receipts', description: pendingCount > 0 ? `${pendingCount} waiting for signature` : 'Sign and release payment receipts', page: 'approvals' },
            { icon: '🧾', title: 'Create Quotation', description: 'Build a client quotation with live pricing', page: 'quotations' },
            { icon: '➕', title: 'Add Tutor', description: 'Register a new tutor profile', action: 'add-tutor' },
            { icon: '🗂️', title: 'View All Receipts', description: 'Search and manage payment receipts', page: 'payslips' },
            { icon: '👩‍🏫', title: 'Manage Tutors', description: 'Edit tutor profiles and rates', page: 'tutors' }
        ];

        container.innerHTML = actions.map((action, index) => `
            <div class="quick-action-btn" data-index="${index}">
                <div class="quick-action-icon">${action.icon}</div>
                <div class="quick-action-text">
                    <h4>${action.title}</h4>
                    <p>${action.description}</p>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const action = actions[index];
                if (action.page) {
                    this.navigateTo(action.page);
                } else if (action.action === 'add-tutor') {
                    this.navigateTo('tutors');
                    setTimeout(() => {
                        import('./tutors.js').then(module => module.Tutors.openAddModal());
                    }, 100);
                }
            });
        });
    },

    refresh() {
        this.renderStats();
        this.renderRecentPayslips();
        this.renderQuickActions();
    }
};