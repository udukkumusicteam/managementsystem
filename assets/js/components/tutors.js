import { TutorService } from '../services/tutorService.js';
import { Formatters } from '../utils/formatters.js';
import { UI } from './ui.js';

/**
 * Tutors Component
 */
export const Tutors = {
    init() {
        this.bindEvents();
        this.render();
    },

    bindEvents() {
        document.getElementById('btn-add-tutor')?.addEventListener('click', () => {
            this.openAddModal();
        });
    },

    render() {
        const grid = document.getElementById('tutors-grid');
        if (!grid) return;

        const tutors = TutorService.getAllTutors();

        if (tutors.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <div class="empty-icon">👩‍🏫</div>
                    <h3>No tutors added yet</h3>
                    <p>Add your first tutor to get started.</p>
                    <button class="btn btn-primary" id="empty-add-tutor">➕ Add Tutor</button>
                </div>
            `;
            document.getElementById('empty-add-tutor')?.addEventListener('click', () => this.openAddModal());
            return;
        }

        grid.innerHTML = tutors.map(tutor => `
            <div class="tutor-card" data-id="${tutor.id}">
                <div class="tutor-card-header">
                    <div class="tutor-card-avatar">${Formatters.initials(tutor.name)}</div>
                    <div class="tutor-card-info">
                        <h3>${tutor.name}</h3>
                        <p>${tutor.subjects.length} subject${tutor.subjects.length > 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="subject-list">
                    ${tutor.subjects.map(s => `
                        <div class="subject-item">
                            <div class="subject-item-left">
                                <div class="subject-dot"></div>
                                <span class="subject-name">${s.name}</span>
                            </div>
                            <span class="subject-rate">₹${s.rate}/session</span>
                        </div>
                    `).join('')}
                </div>
                <div class="tutor-card-actions">
                    <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${tutor.id}">✏️ Edit</button>
                    <button class="btn btn-ghost btn-sm" data-action="payslip" data-id="${tutor.id}">📄 Payslip</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${tutor.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const tutorId = btn.dataset.id;

                switch (action) {
                    case 'edit': this.openEditModal(tutorId); break;
                    case 'payslip': this.navigateToGenerate(tutorId); break;
                    case 'delete': this.deleteTutor(tutorId); break;
                }
            });
        });
    },

    openAddModal() {
        const modal = document.getElementById('tutor-modal');
        const title = modal.querySelector('#tutor-modal-title');
        const body = modal.querySelector('#tutor-modal-body');
        const footer = modal.querySelector('#tutor-modal-footer');

        title.textContent = 'Add New Tutor';
        body.innerHTML = this.getTutorFormHTML();
        footer.innerHTML = `
            <button class="btn btn-ghost" id="cancel-tutor-modal">Cancel</button>
            <button class="btn btn-primary" id="save-tutor-modal">Save Tutor</button>
        `;

        this.addSubjectEntry(body.querySelector('#subjects-container'));
        this.bindModalEvents(null);
        UI.showModal('tutor-modal');
    },

    openEditModal(tutorId) {
        const tutor = TutorService.getTutor(tutorId);
        if (!tutor) return;

        const modal = document.getElementById('tutor-modal');
        const title = modal.querySelector('#tutor-modal-title');
        const body = modal.querySelector('#tutor-modal-body');
        const footer = modal.querySelector('#tutor-modal-footer');

        title.textContent = 'Edit Tutor';
        body.innerHTML = this.getTutorFormHTML();
        footer.innerHTML = `
            <button class="btn btn-ghost" id="cancel-tutor-modal">Cancel</button>
            <button class="btn btn-primary" id="save-tutor-modal">Save Changes</button>
        `;

        body.querySelector('#tutor-name').value = tutor.name;

        const container = body.querySelector('#subjects-container');
        tutor.subjects.forEach(subject => {
            this.addSubjectEntry(container, subject.name, subject.rate);
        });

        this.bindModalEvents(tutorId);
        UI.showModal('tutor-modal');
    },

    getTutorFormHTML() {
        return `
            <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input type="text" class="form-control" id="tutor-name" placeholder="e.g. Payal Sarkate">
            </div>
            <div class="form-group">
                <label class="form-label">Subjects / Instruments *</label>
                <p class="form-hint" style="margin-bottom:10px">Add one or more subjects. Each subject can have its own per-session rate.</p>
                <div class="subjects-container" id="subjects-container"></div>
                <button type="button" class="btn btn-ghost btn-sm" id="add-subject-btn">+ Add Subject</button>
            </div>
        `;
    },

    addSubjectEntry(container, name = '', rate = '') {
        const entry = document.createElement('div');
        entry.className = 'subject-entry';
        entry.innerHTML = `
            <input type="text" class="form-control subject-name" placeholder="Subject / Instrument" value="${name}">
            <input type="number" class="form-control subject-rate" placeholder="₹/session" value="${rate}" min="0" style="width:110px">
            <button type="button" class="remove-subject-btn">✕</button>
        `;

        entry.querySelector('.remove-subject-btn').addEventListener('click', () => {
            const entries = container.querySelectorAll('.subject-entry');
            if (entries.length > 1) {
                entry.remove();
            } else {
                UI.showToast('At least one subject is required', 'error');
            }
        });

        container.appendChild(entry);
    },

    bindModalEvents(tutorId) {
        const modal = document.getElementById('tutor-modal');

        modal.querySelector('#cancel-tutor-modal')?.addEventListener('click', () => {
            UI.hideModal('tutor-modal');
        });

        modal.querySelector('#save-tutor-modal')?.addEventListener('click', () => {
            this.saveTutor(tutorId);
        });

        modal.querySelector('#add-subject-btn')?.addEventListener('click', () => {
            const container = modal.querySelector('#subjects-container');
            this.addSubjectEntry(container);
        });

        modal.querySelector('#close-tutor-modal')?.addEventListener('click', () => {
            UI.hideModal('tutor-modal');
        });
    },

    saveTutor(tutorId = null) {
        const modal = document.getElementById('tutor-modal');
        const name = modal.querySelector('#tutor-name')?.value.trim();

        if (!name) {
            UI.showToast('Please enter tutor name', 'error');
            return;
        }

        const entries = modal.querySelectorAll('.subject-entry');
        const subjects = [];

        let valid = true;
        entries.forEach(entry => {
            const subjectName = entry.querySelector('.subject-name')?.value.trim();
            const rate = parseFloat(entry.querySelector('.subject-rate')?.value);

            if (!subjectName || isNaN(rate) || rate <= 0) {
                valid = false;
                return;
            }

            subjects.push({ name: subjectName, rate: rate });
        });

        if (!valid || subjects.length === 0) {
            UI.showToast('Please fill in all subjects with valid names and rates', 'error');
            return;
        }

        const tutorData = { name, subjects };

        if (tutorId) {
            TutorService.updateTutor(tutorId, tutorData);
            UI.showToast('Tutor updated successfully! ✅', 'success');
        } else {
            TutorService.createTutor(tutorData);
            UI.showToast('Tutor added successfully! ✅', 'success');
        }

        UI.hideModal('tutor-modal');
        this.render();

        import('./dashboard.js').then(module => module.Dashboard.refresh());
    },

    deleteTutor(tutorId) {
        const tutor = TutorService.getTutor(tutorId);
        if (!tutor) return;

        UI.showConfirm(
            'Delete Tutor',
            `Are you sure you want to delete "${tutor.name}"? All associated payslip records will be permanently removed.`,
            () => {
                if (TutorService.deleteTutor(tutorId)) {
                    UI.showToast('Tutor deleted successfully', 'success');
                    this.render();
                    import('./dashboard.js').then(module => module.Dashboard.refresh());
                } else {
                    UI.showToast('Failed to delete tutor', 'error');
                }
            }
        );
    },

    navigateToGenerate(tutorId) {
        import('./dashboard.js').then(module => {
            module.Dashboard.navigateTo('generate');
            setTimeout(() => {
                import('./generate.js').then(genModule => {
                    genModule.Generate.preSelectTutor(tutorId);
                });
            }, 200);
        });
    }
};