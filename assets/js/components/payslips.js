import { Store } from '../state/store.js';
import { PayslipService } from '../services/payslipService.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';

/**
 * Payslips Component
 */
export const Payslips = {
    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        document.getElementById('payslip-search')?.addEventListener('input', () => {
            this.filterPayslips();
        });
    },

    render() {
        this.renderFilters();
        this.filterPayslips();
    },

    renderFilters() {
        const container = document.getElementById('payslip-filters');
        if (!container) return;

        const tutors = Store.getTutors();
        const payslips = Store.getPayslips();

        const tutorOptions = [{ value: '', label: 'All Tutors' }];
        tutors.forEach(t => {
            tutorOptions.push({ value: t.id, label: t.name });
        });

        const monthOptions = [{ value: '', label: 'All Months' }];
        const periods = new Set();
        payslips.forEach(p => {
            periods.add(`${p.month}_${p.year}`);
        });
        periods.forEach(p => {
            const [m, y] = p.split('_');
            monthOptions.push({
                value: p,
                label: `${Formatters.monthLong(parseInt(m))} ${y}`
            });
        });

        const subjectOptions = [{ value: '', label: 'All Subjects' }];
        const subjects = new Set();
        payslips.forEach(p => {
            subjects.add(p.subject);
        });
        subjects.forEach(s => {
            subjectOptions.push({ value: s, label: s });
        });

        container.innerHTML = `
            <select class="filter-select" id="filter-tutor">
                ${tutorOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
            <select class="filter-select" id="filter-month">
                ${monthOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
            <select class="filter-select" id="filter-subject">
                ${subjectOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
        `;

        document.getElementById('filter-tutor')?.addEventListener('change', () => this.filterPayslips());
        document.getElementById('filter-month')?.addEventListener('change', () => this.filterPayslips());
        document.getElementById('filter-subject')?.addEventListener('change', () => this.filterPayslips());
    },

    filterPayslips() {
        const search = document.getElementById('payslip-search')?.value.toLowerCase() || '';
        const tutorId = document.getElementById('filter-tutor')?.value || '';
        const period = document.getElementById('filter-month')?.value || '';
        const subject = document.getElementById('filter-subject')?.value || '';

        let payslips = Store.getPayslips();

        if (search) {
            payslips = payslips.filter(p =>
                p.tutorName.toLowerCase().includes(search) ||
                p.subject.toLowerCase().includes(search) ||
                Formatters.monthLong(p.month).toLowerCase().includes(search)
            );
        }

        if (tutorId) payslips = payslips.filter(p => p.tutorId === tutorId);

        if (period) {
            const [month, year] = period.split('_');
            payslips = payslips.filter(p => p.month === parseInt(month) && p.year === parseInt(year));
        }

        if (subject) payslips = payslips.filter(p => p.subject === subject);

        payslips.sort((a, b) => b.createdAt - a.createdAt);

        this.renderTableBody(payslips);
    },

    renderTableBody(payslips = []) {
        const tbody = document.getElementById('payslips-table-body');
        if (!tbody) return;

        if (payslips.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-icon">🔍</div>
                            <h3>No payment receipts found</h3>
                            <p>Try adjusting your search or filters.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = payslips.map(p => `
            <tr data-id="${p.id}">
                <td>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div class="tutor-avatar" style="width:34px;height:34px;font-size:12px">${Formatters.initials(p.tutorName)}</div>
                        <strong>${p.tutorName}</strong>
                    </div>
                </td>
                <td><span class="badge badge-orange">${p.subject}</span></td>
                <td>${Formatters.monthLong(p.month)} ${p.year}</td>
                <td>${p.teachingHours} sessions</td>
                <td>${p.strikeHours} sessions</td>
                <td><strong style="color:var(--orange)">${Formatters.currency(p.grandTotal)}</strong></td>
                <td>${p.status === 'approved'
                    ? '<span class="status-badge status-signed">✓ Signed</span>'
                    : '<span class="status-badge status-pending">⏳ Pending</span>'}</td>
                <td style="color:var(--brown-light);font-size:13px">${Formatters.date(p.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="icon-btn" title="Download PDF" data-action="download" data-id="${p.id}">⬇️</button>
                        <button class="icon-btn" title="Duplicate" data-action="duplicate" data-id="${p.id}">📋</button>
                        <button class="icon-btn" title="Delete" data-action="delete" data-id="${p.id}">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const payslipId = btn.dataset.id;
                const payslip = Store.getPayslipById(payslipId);

                switch (action) {
                    case 'download': this.downloadPayslip(payslip); break;
                    case 'duplicate': this.duplicatePayslip(payslip); break;
                    case 'delete': this.deletePayslip(payslip); break;
                }
            });
        });
    },

    downloadPayslip(payslip) {
        if (!payslip) return;
        import('../services/pdfService.js').then(module => {
            module.PDFService.generate(payslip);
        });
    },

    duplicatePayslip(payslip) {
        if (!payslip) return;

        const newPayslip = PayslipService.duplicatePayslip(payslip.id);
        if (newPayslip) {
            UI.showToast('Payslip duplicated for next month!', 'success');
            this.render();

            import('./dashboard.js').then(module => module.Dashboard.refresh());
        } else {
            UI.showToast('Failed to duplicate payslip', 'error');
        }
    },

    deletePayslip(payslip) {
        if (!payslip) return;

        UI.showConfirm(
            'Delete Payslip',
            `Delete payslip for ${payslip.tutorName} (${payslip.subject}, ${Formatters.monthLong(payslip.month)} ${payslip.year})? This cannot be undone.`,
            () => {
                if (Store.deletePayslip(payslip.id)) {
                    UI.showToast('Payslip deleted successfully', 'success');
                    this.render();
                    import('./dashboard.js').then(module => module.Dashboard.refresh());
                } else {
                    UI.showToast('Failed to delete payslip', 'error');
                }
            }
        );
    }
};