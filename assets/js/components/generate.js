import { PayslipService } from '../services/payslipService.js';
import { TutorService } from '../services/tutorService.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';
import { Config } from '../config.js';

/**
 * Generate Payslip Component
 */
export const Generate = {
    lastPayslip: null,

    init() {
        this.renderForm();
        this.renderPreview();
        this.populateDropdowns();
        this.bindEvents();
    },

    renderForm() {
        const container = document.getElementById('generate-form-body');
        if (!container) return;

        container.innerHTML = `
            <div class="section-title">Pay Period</div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Month</label>
                    <select class="form-control" id="gen-month">
                        <option value="">Select Month</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Year</label>
                    <select class="form-control" id="gen-year">
                        <option value="">Select Year</option>
                    </select>
                </div>
            </div>

            <div class="form-section-divider"></div>
            <div class="section-title">Tutor Information</div>

            <div class="form-group">
                <label class="form-label">Tutor</label>
                <select class="form-control" id="gen-tutor">
                    <option value="">Select Tutor</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Subject / Instrument</label>
                <select class="form-control" id="gen-subject">
                    <option value="">Select Subject</option>
                </select>
                <p class="form-hint">Only subjects taught by the selected tutor are shown. Each subject generates a separate payment receipt.</p>
            </div>

            <div class="form-group" id="gen-rate-group" style="display:none">
                <label class="form-label">Session Compensation Rate</label>
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                    <span class="rate-display" id="gen-rate-display">₹0/session</span>
                    <div style="flex:1; min-width:140px;">
                        <input type="number" class="form-control" id="gen-rate" placeholder="Rate per session" min="0">
                    </div>
                </div>
                <p class="form-hint">Auto-filled from subject profile. You can override if needed.</p>
            </div>

            <div class="form-section-divider"></div>
            <div class="section-title">Sessions Breakdown</div>

            <div class="info-note">
                <span class="note-icon">💡</span>
                <p>Enter the actual teaching sessions and any student strike sessions. Both types are compensated at the same per-session rate.</p>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Teaching Sessions</label>
                    <input type="number" class="form-control" id="gen-teaching-hours" placeholder="e.g. 3" min="0" step="0.5">
                    <p class="form-hint">Actual sessions taught this month</p>
                </div>
                <div class="form-group">
                    <label class="form-label">Student Strike Sessions</label>
                    <input type="number" class="form-control" id="gen-strike-hours" placeholder="e.g. 1" min="0" step="0.5">
                    <p class="form-hint">Late cancellations by students</p>
                </div>
            </div>

            <div id="duplicate-hint" style="display:none" class="info-note">
                <span class="note-icon">⚠️</span>
                <p id="duplicate-hint-text">A payment receipt already exists for this tutor + subject + month.</p>
            </div>

            <button class="btn btn-primary btn-lg" id="btn-generate-payslip" style="width:100%">
                ✨ Generate & Download PDF
            </button>
        `;
    },

    renderPreview() {
        const container = document.getElementById('live-preview');
        if (!container) return;

        container.innerHTML = `
            <div class="preview-header">
                <h3>🎵 Udukku Music</h3>
                <p>Tutor Payment Slip · Live Preview</p>
            </div>
            <div class="preview-body">
                <div class="preview-meta">
                    <div class="preview-meta-item">
                        <div class="meta-label">Employee</div>
                        <div class="meta-value" id="prev-name">—</div>
                    </div>
                    <div class="preview-meta-item">
                        <div class="meta-label">Pay Period</div>
                        <div class="meta-value" id="prev-period">—</div>
                    </div>
                    <div class="preview-meta-item">
                        <div class="meta-label">Position</div>
                        <div class="meta-value" id="prev-position">—</div>
                    </div>
                    <div class="preview-meta-item">
                        <div class="meta-label">Rate</div>
                        <div class="meta-value" id="prev-rate">—</div>
                    </div>
                </div>

                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Sessions</th>
                            <th>Rate</th>
                            <th class="amount-col">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Teaching Sessions</td>
                            <td id="prev-t-hours">0</td>
                            <td id="prev-t-rate">₹0</td>
                            <td class="amount-col" id="prev-t-amount">₹0</td>
                        </tr>
                        <tr>
                            <td>Strike Compensation</td>
                            <td id="prev-s-hours">0</td>
                            <td id="prev-s-rate">₹0</td>
                            <td class="amount-col" id="prev-s-amount">₹0</td>
                        </tr>
                    </tbody>
                </table>

                <div class="calc-breakdown">
                    <div class="calc-row">
                        <div>
                            <div class="calc-label">Teaching Amount</div>
                            <div class="calc-formula" id="calc-formula-t">0 sessions × ₹0/session</div>
                        </div>
                        <div class="calc-value" id="calc-t-amount">₹0</div>
                    </div>
                    <div class="calc-row">
                        <div>
                            <div class="calc-label">Strike Compensation</div>
                            <div class="calc-formula" id="calc-formula-s">0 sessions × ₹0/session</div>
                        </div>
                        <div class="calc-value" id="calc-s-amount">₹0</div>
                    </div>
                </div>

                <div class="preview-total">
                    <div class="total-label">Grand Total</div>
                    <div class="total-value" id="prev-grand-total">₹0</div>
                </div>

                <div style="margin-top:16px; padding:14px; background:var(--cream); border-radius:10px; font-size:12px; color:var(--brown-light);">
                    <strong style="color:var(--brown)">✅ Validated by:</strong> ${Config.admin.name}, ${Config.admin.title}<br>
                    <strong style="color:var(--brown)">📅 Date:</strong> <span id="prev-date">${Formatters.date(Date.now())}</span>
                </div>
            </div>
        `;
    },

    bindEvents() {
        document.getElementById('gen-month')?.addEventListener('change', () => this.updatePreview());
        document.getElementById('gen-year')?.addEventListener('change', () => this.updatePreview());
        document.getElementById('gen-tutor')?.addEventListener('change', () => this.onTutorChange());
        document.getElementById('gen-subject')?.addEventListener('change', () => this.onSubjectChange());
        document.getElementById('gen-rate')?.addEventListener('input', () => this.updatePreview());
        document.getElementById('gen-teaching-hours')?.addEventListener('input', () => this.updatePreview());
        document.getElementById('gen-strike-hours')?.addEventListener('input', () => this.updatePreview());
        document.getElementById('btn-generate-payslip')?.addEventListener('click', () => this.generatePayslip());
    },

    populateDropdowns() {
        const monthSel = document.getElementById('gen-month');
        if (monthSel) {
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const now = new Date();

            monthSel.innerHTML = '<option value="">Select Month</option>';
            months.forEach((m, i) => {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = m;
                if (i === now.getMonth()) opt.selected = true;
                monthSel.appendChild(opt);
            });
        }

        const yearSel = document.getElementById('gen-year');
        if (yearSel) {
            const now = new Date();
            yearSel.innerHTML = '';

            for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === now.getFullYear()) opt.selected = true;
                yearSel.appendChild(opt);
            }
        }

        this.populateTutorDropdown();
    },

    populateTutorDropdown() {
        const sel = document.getElementById('gen-tutor');
        if (!sel) return;

        const currentVal = sel.value;
        sel.innerHTML = '<option value="">Select Tutor</option>';

        const tutors = TutorService.getAllTutors();
        tutors.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            sel.appendChild(opt);
        });

        if (currentVal) sel.value = currentVal;
    },

    onTutorChange() {
        const tutorId = document.getElementById('gen-tutor')?.value;
        const subjSel = document.getElementById('gen-subject');

        if (!subjSel) return;

        subjSel.innerHTML = '<option value="">Select Subject</option>';
        document.getElementById('gen-rate-group').style.display = 'none';
        document.getElementById('gen-rate').value = '';

        if (!tutorId) {
            this.updatePreview();
            return;
        }

        const subjects = TutorService.getSubjects(tutorId);
        subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            subjSel.appendChild(opt);
        });

        if (subjects.length === 1) {
            subjSel.value = subjects[0].id;
            this.onSubjectChange();
        } else {
            this.updatePreview();
        }
    },

    onSubjectChange() {
        const tutorId = document.getElementById('gen-tutor')?.value;
        const subjId = document.getElementById('gen-subject')?.value;

        if (!tutorId || !subjId) {
            document.getElementById('gen-rate-group').style.display = 'none';
            this.updatePreview();
            return;
        }

        const subject = TutorService.getSubject(tutorId, subjId);
        if (subject) {
            document.getElementById('gen-rate-group').style.display = 'block';
            document.getElementById('gen-rate').value = subject.rate;
            document.getElementById('gen-rate-display').textContent = `₹${subject.rate}/session`;
        }

        this.updatePreview();
        this.checkDuplicate();
    },

    updatePreview() {
        const tutorId = document.getElementById('gen-tutor')?.value;
        const subjId = document.getElementById('gen-subject')?.value;
        const month = document.getElementById('gen-month')?.value;
        const year = document.getElementById('gen-year')?.value;
        const rate = parseFloat(document.getElementById('gen-rate')?.value) || 0;
        const teachHours = parseFloat(document.getElementById('gen-teaching-hours')?.value) || 0;
        const strikeHours = parseFloat(document.getElementById('gen-strike-hours')?.value) || 0;

        const { teachingAmount, strikeAmount, grandTotal } = PayslipService.calculateAmounts(
            teachHours, strikeHours, rate
        );

        const tutor = tutorId ? TutorService.getTutor(tutorId) : null;
        const subject = tutorId && subjId ? TutorService.getSubject(tutorId, subjId) : null;

        document.getElementById('prev-name').textContent = tutor ? tutor.name : '—';
        document.getElementById('prev-position').textContent = subject ? `${subject.name} Tutor` : '—';
        document.getElementById('prev-rate').textContent = rate ? `₹${rate}/session` : '—';
        document.getElementById('prev-period').textContent = (month !== '' && year) ?
            Formatters.period(parseInt(month), parseInt(year)) : '—';

        document.getElementById('prev-t-hours').textContent = teachHours;
        document.getElementById('prev-t-rate').textContent = `₹${rate}`;
        document.getElementById('prev-t-amount').textContent = Formatters.currency(teachingAmount);

        document.getElementById('prev-s-hours').textContent = strikeHours;
        document.getElementById('prev-s-rate').textContent = `₹${rate}`;
        document.getElementById('prev-s-amount').textContent = Formatters.currency(strikeAmount);

        document.getElementById('calc-formula-t').textContent = `${teachHours} sessions × ₹${rate}/session`;
        document.getElementById('calc-formula-s').textContent = `${strikeHours} sessions × ₹${rate}/session`;
        document.getElementById('calc-t-amount').textContent = Formatters.currency(teachingAmount);
        document.getElementById('calc-s-amount').textContent = Formatters.currency(strikeAmount);
        document.getElementById('prev-grand-total').textContent = Formatters.currency(grandTotal);

        this.checkDuplicate();
    },

    checkDuplicate() {
        const tutorId = document.getElementById('gen-tutor')?.value;
        const subjId = document.getElementById('gen-subject')?.value;
        const month = parseInt(document.getElementById('gen-month')?.value);
        const year = parseInt(document.getElementById('gen-year')?.value);

        const hint = document.getElementById('duplicate-hint');

        if (!tutorId || !subjId || isNaN(month) || isNaN(year)) {
            if (hint) hint.style.display = 'none';
            return;
        }

        const exists = PayslipService.exists(tutorId, subjId, month, year);

        if (exists && hint) {
            document.getElementById('duplicate-hint-text').textContent =
                `A payslip already exists for this tutor + subject + ${Formatters.monthLong(month)} ${year}. Generating again will add a new record.`;
            hint.style.display = 'flex';
        } else if (hint) {
            hint.style.display = 'none';
        }
    },

    generatePayslip() {
        const tutorId = document.getElementById('gen-tutor')?.value;
        const subjId = document.getElementById('gen-subject')?.value;
        const month = document.getElementById('gen-month')?.value;
        const year = document.getElementById('gen-year')?.value;
        const rate = parseFloat(document.getElementById('gen-rate')?.value);
        const teachHours = parseFloat(document.getElementById('gen-teaching-hours')?.value);
        const strikeHours = parseFloat(document.getElementById('gen-strike-hours')?.value) || 0;

        if (!tutorId) { UI.showToast('Please select a tutor', 'error'); return; }
        if (!subjId) { UI.showToast('Please select a subject', 'error'); return; }
        if (month === '') { UI.showToast('Please select a month', 'error'); return; }
        if (!year) { UI.showToast('Please select a year', 'error'); return; }
        if (!rate || rate <= 0) { UI.showToast('Please enter a valid hourly rate', 'error'); return; }
        if (isNaN(teachHours) || teachHours < 0) { UI.showToast('Please enter valid teaching hours', 'error'); return; }

        const payslip = PayslipService.createPayslip({
            tutorId,
            subjectId: subjId,
            month: parseInt(month),
            year: parseInt(year),
            rate,
            teachingHours: teachHours,
            strikeHours
        });

        if (!payslip) {
            UI.showToast('Failed to create payslip', 'error');
            return;
        }

        this.lastPayslip = payslip;

        import('../services/pdfService.js').then(module => {
            module.PDFService.generate(payslip);
        });

        this.showSuccessPage(payslip);
        UI.showToast('Payslip generated successfully! 🎉', 'success');
    },

    showSuccessPage(payslip) {
        const formLayout = document.getElementById('generate-layout');
        const successPage = document.getElementById('generate-success');

        formLayout.style.display = 'none';
        successPage.classList.add('active');

        document.getElementById('success-message').textContent =
            `Payslip for ${payslip.tutorName} – ${payslip.subject} (${Formatters.monthLong(payslip.month)} ${payslip.year}) has been generated and saved. It now waits for approval and signature before release.`;

        const actions = document.getElementById('success-actions');
        actions.innerHTML = `
            <div class="info-note" style="width:100%; margin-bottom:4px">
                <span class="note-icon">✍️</span>
                <p>This payslip is <strong>pending</strong> — once approved, it carries the digital signature on its PDF.</p>
            </div>
            <button class="btn btn-primary" id="btn-go-approvals">✍️ Review in Approvals</button>
            <button class="btn btn-secondary" id="btn-download-again">⬇️ Download PDF Again</button>
            <button class="btn btn-ghost" id="btn-duplicate-month">📋 Duplicate for Next Month</button>
            <button class="btn btn-ghost" id="btn-generate-another">✨ Generate Another</button>
        `;

        document.getElementById('btn-go-approvals')?.addEventListener('click', () => {
            import('./dashboard.js').then(module => module.Dashboard.navigateTo('approvals'));
        });
        document.getElementById('btn-download-again')?.addEventListener('click', () => this.downloadLastPDF());
        document.getElementById('btn-duplicate-month')?.addEventListener('click', () => this.duplicateLastPayslip());
        document.getElementById('btn-generate-another')?.addEventListener('click', () => this.resetForm());

        import('./dashboard.js').then(module => module.Dashboard.refresh());
    },

    resetForm() {
        const formLayout = document.getElementById('generate-layout');
        const successPage = document.getElementById('generate-success');

        formLayout.style.display = 'grid';
        successPage.classList.remove('active');

        document.getElementById('gen-tutor').value = '';
        document.getElementById('gen-subject').innerHTML = '<option value="">Select Subject</option>';
        document.getElementById('gen-rate').value = '';
        document.getElementById('gen-teaching-hours').value = '';
        document.getElementById('gen-strike-hours').value = '';
        document.getElementById('gen-rate-group').style.display = 'none';
        document.getElementById('duplicate-hint').style.display = 'none';

        this.populateDropdowns();
        this.updatePreview();
    },

    downloadLastPDF() {
        if (this.lastPayslip) {
            import('../services/pdfService.js').then(module => {
                module.PDFService.generate(this.lastPayslip);
            });
        }
    },

    duplicateLastPayslip() {
        if (!this.lastPayslip) return;

        const newPayslip = PayslipService.duplicatePayslip(this.lastPayslip.id);
        if (newPayslip) {
            this.lastPayslip = newPayslip;
            this.resetForm();
            this.preFillForm(newPayslip);
            UI.showToast('Payslip duplicated for next month!', 'success');
        }
    },

    preSelectTutor(tutorId) {
        const tutorSel = document.getElementById('gen-tutor');
        if (tutorSel && tutorId) {
            tutorSel.value = tutorId;
            this.onTutorChange();
        }
    },

    preFillForm(payslip) {
        if (!payslip) return;

        document.getElementById('gen-tutor').value = payslip.tutorId;
        this.onTutorChange();

        setTimeout(() => {
            document.getElementById('gen-subject').value = payslip.subjectId;
            document.getElementById('gen-rate').value = payslip.rate;
            document.getElementById('gen-teaching-hours').value = payslip.teachingHours;
            document.getElementById('gen-strike-hours').value = payslip.strikeHours;
            document.getElementById('gen-month').value = payslip.month;
            document.getElementById('gen-year').value = payslip.year;

            this.onSubjectChange();
            this.updatePreview();
        }, 100);
    }
};