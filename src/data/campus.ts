import type { University, YearOfStudy } from '../types';

// Fictional universities for the prototype. Swap for real partner campuses later.
export const UNIVERSITIES: University[] = [
  { id: 'maple', name: 'Maple Ridge University', short: 'MRU', emailDomain: 'mapleridge.edu', emoji: '🍁' },
  { id: 'lakeshore', name: 'Lakeshore College', short: 'LSC', emailDomain: 'lakeshore.ac.uk', emoji: '🌊' },
  { id: 'northgate', name: 'Northgate Institute', short: 'NGI', emailDomain: 'northgate.edu', emoji: '🏔️' },
  { id: 'harbour', name: 'Harbour City University', short: 'HCU', emailDomain: 'harbourcity.edu', emoji: '⚓' },
];

export const YEARS: YearOfStudy[] = ['1st', '2nd', '3rd', '4th', 'Grad'];

export const PROGRAM_SUGGESTIONS = [
  'Computer Science',
  'Psychology',
  'Biology',
  'Business',
  'Engineering',
  'English Lit',
  'Nursing',
  'Fine Arts',
];

export const universityById = (id: string | null) => UNIVERSITIES.find((u) => u.id === id);
