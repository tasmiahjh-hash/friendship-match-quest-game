// Synthetic data only. Never put a real person's details in a test.
import { randomUUID } from 'node:crypto';

export const registration = (over = {}) => ({
  schemaVersion: 1,
  submissionKey: randomUUID(),
  universityId: 'ualberta',
  campusId: 'ualberta-north',
  firstName: 'Testy',
  email: 'testy.mctest@ualberta.ca',
  avatar: '🦊',
  instagram: '',
  program: 'Synthetic Studies',
  year: '2nd',
  courses: ['TEST 101'],
  styleAnswers: { night: 'quiet', planning: 'planner', texting: 'occasional', group: 'small', values: 'loyalty' },
  interests: ['gaming', 'anime', 'music', 'food'],
  meetPreference: 'either',
  campusMatch: 'same-campus',
  hangouts: ['games-night'],
  availability: ['weekday-evenings'],
  studentAttestation: true,
  guidelinesAccepted: true,
  consent: true,
  privacyPolicyVersion: '2026-11-24',
  trap: '',
  ...over,
});

export const feedback = (over = {}) => ({
  schemaVersion: 1,
  submissionKey: randomUUID(),
  email: '',
  category: 'feature',
  suggestion: 'A synthetic suggestion for testing.',
  trap: '',
  ...over,
});
