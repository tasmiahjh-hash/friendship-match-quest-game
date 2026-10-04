import { eventById } from '../data/events';
import { interestById } from '../data/interests';
import { STYLE_QUESTIONS } from '../data/styleQuestions';
import { MOCK_STUDENTS } from '../data/students';
import { universityById } from '../data/campus';
import type { MatchResult, MeetPreference, PlayerProfile, Student } from '../types';
import { delay } from '../utils';

/**
 * Anything that can find a match for a player.
 * Today: an in-memory mock pool. Later: a server endpoint / edge function that
 * scores candidates server-side and returns only public fields.
 */
export interface MatchProvider {
  findMatch(profile: PlayerProfile): Promise<MatchResult>;
}

/** Answers that are "close" (e.g. quiet vs mix) earn partial credit. */
const NEAR_ANSWERS: Record<string, string[]> = {
  quiet: ['mix'],
  mix: ['quiet', 'social'],
  social: ['mix'],
  'one-on-one': ['small'],
  small: ['one-on-one', 'group'],
  group: ['small'],
};

const REASON_FOR_ANSWER: Record<string, string> = {
  quiet: 'You both recharge with cozy nights in',
  social: 'You both love a big night out',
  mix: 'You both go with the mood on a Friday',
  planner: 'Two planners: group trips will run on time',
  spontaneous: 'You’re both up for spontaneous plans',
  frequent: 'Matching texting energy: memes all day',
  occasional: 'Same texting rhythm: quality check-ins',
  'one-on-one': 'You both prefer deep one-on-one hangs',
  small: 'You both like a small, close crew',
  group: 'You both thrive in a big group',
};

function preferencesCompatible(a: MeetPreference | null, b: MeetPreference) {
  if (!a) return true;
  return a === 'either' || b === 'either' || a === b;
}

export function scoreCandidate(profile: PlayerProfile, student: Student): MatchResult {
  const sharedInterests = student.interests.filter((i) => profile.interests.includes(i));
  const sharedEventIds = student.availableEventIds.filter((e) => profile.availableEventIds.includes(e));

  let styleScore = 0;
  const sharedStyleIds: string[] = [];
  for (const q of STYLE_QUESTIONS) {
    const mine = profile.styleAnswers[q.id];
    const theirs = student.styleAnswers[q.id];
    if (!mine || !theirs) continue;
    if (mine === theirs) {
      styleScore += 1;
      sharedStyleIds.push(q.id);
    } else if (NEAR_ANSWERS[mine]?.includes(theirs)) {
      styleScore += 0.5;
    }
  }

  const interestRatio = sharedInterests.length / Math.max(1, Math.min(profile.interests.length, student.interests.length));
  const styleRatio = styleScore / STYLE_QUESTIONS.length;
  const eventRatio = sharedEventIds.length === 0 ? 0 : Math.min(1, 0.6 + sharedEventIds.length * 0.2);
  const prefRatio = preferencesCompatible(profile.meetPreference, student.meetPreference) ? 1 : 0.3;

  const raw = interestRatio * 0.45 + styleRatio * 0.3 + eventRatio * 0.15 + prefRatio * 0.1;
  const compatibility = Math.min(98, Math.round(58 + raw * 40));

  // The pool is scoped to the player's campus, so matches are always same-university.
  const uni = universityById(profile.campus.universityId);
  const reasons: string[] = [];

  if (sharedInterests.length > 0) {
    const names = sharedInterests.slice(0, 2).map((i) => interestById(i)?.label.toLowerCase());
    reasons.push(
      sharedInterests.length >= 3
        ? `${sharedInterests.length} shared interests, from ${names.join(' to ')}`
        : `You both enjoy ${names.join(' and ')}`,
    );
  }
  for (const qid of sharedStyleIds) {
    const answer = profile.styleAnswers[qid];
    if (qid === 'values') {
      const label = STYLE_QUESTIONS.find((q) => q.id === 'values')?.options.find((o) => o.id === answer)?.label;
      if (label) reasons.push(`You both value ${label.toLowerCase()} most in a friend`);
    } else if (REASON_FOR_ANSWER[answer]) {
      reasons.push(REASON_FOR_ANSWER[answer]);
    }
  }
  if (sharedEventIds.length > 0) {
    reasons.push(`You’re both free for ${eventById(sharedEventIds[0])?.name}`);
  }
  if (uni) reasons.push(`You’re both at ${uni.name}`);

  return {
    student,
    compatibility,
    sharedInterests,
    sharedEventIds,
    sharedStyleIds,
    reasons: reasons.slice(0, 4),
    sameUniversity: Boolean(uni),
  };
}

export function rankCandidates(profile: PlayerProfile, pool: Student[] = MOCK_STUDENTS): MatchResult[] {
  return pool.map((s) => scoreCandidate(profile, s)).sort((a, b) => b.compatibility - a.compatibility);
}

export const mockMatchProvider: MatchProvider = {
  async findMatch(profile) {
    await delay(150); // the dramatic part is handled by the UI animation
    return rankCandidates(profile)[0];
  },
};
