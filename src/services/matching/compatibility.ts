import { STYLE_QUESTIONS } from '../../data/styleQuestions';
import type { PlayerProfile } from '../../types';

/**
 * Compatibility scoring carried over from the original app for future automated
 * matching. NOT used in this release: nothing in the public site imports it, and
 * matching is done by Friends Across Campus administrators.
 *
 * When automated matching ships this must run server-side, so that no student's
 * answers are ever sent to another student's browser.
 */
export type MatchableProfile = Pick<PlayerProfile, 'interests' | 'styleAnswers' | 'hangoutIds' | 'meetPreference'>;

/** Answers that are "close" (e.g. quiet vs mix) earn partial credit. */
const NEAR_ANSWERS: Record<string, string[]> = {
  quiet: ['mix'],
  mix: ['quiet', 'social'],
  social: ['mix'],
  'one-on-one': ['small'],
  small: ['one-on-one', 'group'],
  group: ['small'],
};

const shared = (a: string[], b: string[]) => a.filter((x) => b.includes(x));

/** Symmetric score from 0 (nothing in common) to 1. */
export function scoreCompatibility(a: MatchableProfile, b: MatchableProfile) {
  const sharedInterests = shared(a.interests, b.interests);
  const sharedHangouts = shared(a.hangoutIds, b.hangoutIds);

  let style = 0;
  for (const q of STYLE_QUESTIONS) {
    const mine = a.styleAnswers[q.id];
    const theirs = b.styleAnswers[q.id];
    if (!mine || !theirs) continue;
    if (mine === theirs) style += 1;
    else if (NEAR_ANSWERS[mine]?.includes(theirs)) style += 0.5;
  }

  const interestRatio = sharedInterests.length / Math.max(1, Math.min(a.interests.length, b.interests.length));
  const hangoutRatio = sharedHangouts.length === 0 ? 0 : Math.min(1, 0.6 + sharedHangouts.length * 0.2);
  const prefsFit =
    !a.meetPreference ||
    !b.meetPreference ||
    a.meetPreference === 'either' ||
    b.meetPreference === 'either' ||
    a.meetPreference === b.meetPreference;

  const score = interestRatio * 0.45 + (style / STYLE_QUESTIONS.length) * 0.3 + hangoutRatio * 0.15 + (prefsFit ? 1 : 0.3) * 0.1;
  return { score, sharedInterests, sharedHangouts };
}
