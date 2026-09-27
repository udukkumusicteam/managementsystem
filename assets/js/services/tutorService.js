import { Store } from '../state/store.js';
import { Helpers } from '../utils/helpers.js';

/**
 * Tutor Service - Business logic for tutors
 */
export const TutorService = {
    getAllTutors() {
        return Store.getTutors();
    },

    getTutor(id) {
        return Store.getTutorById(id);
    },

    getSubjects(tutorId) {
        return Store.getSubjectsByTutor(tutorId);
    },

    getSubject(tutorId, subjectId) {
        return Store.getSubjectById(tutorId, subjectId);
    },

    createTutor(tutorData) {
        if (!tutorData.name || tutorData.name.trim() === '') {
            console.error('Tutor name is required');
            return null;
        }

        if (!tutorData.subjects || tutorData.subjects.length === 0) {
            console.error('At least one subject is required');
            return null;
        }

        const validSubjects = tutorData.subjects.every(s =>
            s.name && s.name.trim() !== '' && !isNaN(parseFloat(s.rate)) && parseFloat(s.rate) > 0
        );

        if (!validSubjects) {
            console.error('All subjects must have a name and valid rate');
            return null;
        }

        return Store.addTutor({
            name: tutorData.name.trim(),
            subjects: tutorData.subjects.map(s => ({
                name: s.name.trim(),
                rate: parseFloat(s.rate)
            }))
        });
    },

    updateTutor(id, updates) {
        if (!updates.name || updates.name.trim() === '') return null;
        if (!updates.subjects || updates.subjects.length === 0) return null;

        const validSubjects = updates.subjects.every(s =>
            s.name && s.name.trim() !== '' && !isNaN(parseFloat(s.rate)) && parseFloat(s.rate) > 0
        );

        if (!validSubjects) return null;

        return Store.updateTutor(id, {
            name: updates.name.trim(),
            subjects: updates.subjects.map(s => ({
                id: s.id || Helpers.generateId('subj_'),
                name: s.name.trim(),
                rate: parseFloat(s.rate)
            }))
        });
    },

    deleteTutor(id) {
        return Store.deleteTutor(id);
    }
};