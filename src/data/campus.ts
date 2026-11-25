import type { Campus, YearOfStudy } from '../types';

/** Friendship Quest is for University of Alberta students only in this release. */
export const UNIVERSITY = { id: 'ualberta', name: 'University of Alberta', short: 'U of A' } as const;

/**
 * The ids are stable identifiers stored with every registration. Never rename or
 * reuse one; the spreadsheet and any later database rely on them.
 * Keep in sync with CATALOG in integrations/google-sheets/Code.gs (a test checks this).
 */
export const CAMPUSES: Campus[] = [
  { id: 'ualberta-north', name: 'University of Alberta — North Campus (Main Campus)', short: 'North Campus', place: 'Edmonton', emoji: '🏛️' },
  { id: 'ualberta-augustana', name: 'University of Alberta — Augustana Campus', short: 'Augustana Campus', place: 'Camrose', emoji: '🌾' },
  { id: 'ualberta-saint-jean', name: 'University of Alberta — Campus Saint-Jean', short: 'Campus Saint-Jean', place: 'Edmonton', emoji: '⚜️' },
  { id: 'ualberta-south', name: 'University of Alberta — South Campus', short: 'South Campus', place: 'Edmonton', emoji: '🌱' },
];

export const YEARS: YearOfStudy[] = ['1st', '2nd', '3rd', '4th', '5th+', 'Grad'];

export const yearLabel = (y: YearOfStudy) => (y === 'Grad' ? 'Grad' : `${y} year`);

export const PROGRAM_SUGGESTIONS = [
  'Computer Science',
  'Psychology',
  'Biology',
  'Business',
  'Engineering',
  'English',
  'Nursing',
  'Fine Arts',
];

export const MAX_COURSES = 6;

export const campusById = (id: string | null) => CAMPUSES.find((c) => c.id === id);
