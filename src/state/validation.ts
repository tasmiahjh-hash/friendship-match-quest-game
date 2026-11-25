import { MIN_INTERESTS } from '../data/interests';
import { STYLE_QUESTIONS } from '../data/styleQuestions';
import type { PlayerProfile, QuestLevelId } from '../types';
import { isValidEmail, isValidInstagram } from '../utils';
import { LEVEL_ORDER } from './gameLogic';

/** What is still missing from a level, in words a student can act on. Empty means ready. */
export function missingIn(level: QuestLevelId, p: PlayerProfile): string[] {
  const out: (string | false)[] = [];
  switch (level) {
    case 'contact':
      out.push(
        !p.contact.firstName.trim() && 'first name',
        !isValidEmail(p.contact.email) && 'a valid email',
        !isValidInstagram(p.contact.instagram) && 'a valid Instagram handle',
        !p.contact.isStudent && 'student confirmation',
        !p.contact.agreedToGuidelines && 'guidelines agreement',
      );
      break;
    case 'campus':
      out.push(!p.campus.campusId && 'campus', !p.campus.program.trim() && 'program', !p.campus.year && 'year of study');
      break;
    case 'style': {
      const left = STYLE_QUESTIONS.filter((q) => !p.styleAnswers[q.id]).length;
      out.push(left > 0 && `${left} more ${left === 1 ? 'answer' : 'answers'}`);
      break;
    }
    case 'vibe': {
      const left = MIN_INTERESTS - p.interests.length;
      out.push(left > 0 && `${left} more ${left === 1 ? 'interest' : 'interests'}`);
      break;
    }
    case 'meet':
      out.push(
        !p.meetPreference && 'comfort option',
        p.meetPreference === 'event' && p.hangoutIds.length === 0 && 'at least one activity',
        !p.campusMatch && 'campus preference',
      );
      break;
  }
  return out.filter((x): x is string => Boolean(x));
}

/** Levels that would block submission, in quest order. */
export const incompleteLevels = (p: PlayerProfile) => LEVEL_ORDER.filter((l) => missingIn(l, p).length > 0);
