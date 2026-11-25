// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PLAYER_AVATARS } from '../../src/data/avatars';
import { CAMPUSES, MAX_COURSES, UNIVERSITY, YEARS, yearLabel } from '../../src/data/campus';
import { FEEDBACK_CATEGORIES, FEEDBACK_MAX, FEEDBACK_MIN } from '../../src/data/feedback';
import { AVAILABILITY, CAMPUS_MATCH_PREFERENCES, HANGOUT_IDEAS, MEET_PREFERENCES } from '../../src/data/hangouts';
import { INTERESTS, MAX_INTERESTS, MIN_INTERESTS } from '../../src/data/interests';
import { STYLE_QUESTIONS } from '../../src/data/styleQuestions';
import { SCHEMA_VERSION } from '../../src/services/submission/types';
import { createBackend } from '../support/fakeAppsScript.mjs';

/** The website and Code.gs each hold the question list. This fails when they drift apart. */
const { context } = createBackend();
const C = JSON.parse(JSON.stringify(context.CATALOG));
const map = <T extends { id: string }>(items: readonly T[], label: (t: T) => string) => Object.fromEntries(items.map((i) => [i.id, label(i)]));

describe('website and Apps Script agree', () => {
  it('on campuses: exactly the four University of Alberta campuses', () => {
    expect(C.university).toEqual({ [UNIVERSITY.id]: UNIVERSITY.name });
    expect(CAMPUSES.map((c) => c.name)).toEqual([
      'University of Alberta — North Campus (Main Campus)',
      'University of Alberta — Augustana Campus',
      'University of Alberta — Campus Saint-Jean',
      'University of Alberta — South Campus',
    ]);
    expect(C.campus).toEqual(map(CAMPUSES, (c) => c.name));
  });

  it('on every question and option', () => {
    expect(C.avatar).toEqual(PLAYER_AVATARS);
    expect(C.year).toEqual(Object.fromEntries(YEARS.map((y) => [y, yearLabel(y)])));
    expect(C.interests).toEqual(map(INTERESTS, (i) => i.label));
    expect(C.style).toEqual(Object.fromEntries(STYLE_QUESTIONS.map((q) => [q.id, map(q.options, (o) => o.label)])));
    expect(C.meetPreference).toEqual(map(MEET_PREFERENCES, (m) => m.title));
    expect(C.campusMatch).toEqual(map(CAMPUS_MATCH_PREFERENCES, (m) => m.title));
    expect(C.hangouts).toEqual(map(HANGOUT_IDEAS, (h) => h.name));
    expect(C.availability).toEqual(map(AVAILABILITY, (a) => a.label));
    expect(C.feedbackCategory).toEqual(map(FEEDBACK_CATEGORIES, (f) => f.label));
  });

  it('on limits and schema version', () => {
    expect(context.SCHEMA_VERSION).toBe(SCHEMA_VERSION);
    expect(context.LIMITS).toMatchObject({
      minInterests: MIN_INTERESTS,
      maxInterests: MAX_INTERESTS,
      courses: MAX_COURSES,
      minSuggestion: FEEDBACK_MIN,
      maxSuggestion: FEEDBACK_MAX,
    });
  });
});
