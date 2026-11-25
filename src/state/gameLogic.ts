import { PLAYER_AVATARS } from '../data/avatars';
import { CAMPUSES, MAX_COURSES, YEARS } from '../data/campus';
import { AVAILABILITY, CAMPUS_MATCH_PREFERENCES, HANGOUT_IDEAS, MEET_PREFERENCES } from '../data/hangouts';
import { INTERESTS, MAX_INTERESTS } from '../data/interests';
import { QUEST_COMPLETE_BONUS_XP, QUEST_LEVELS, REGISTERED_XP } from '../data/levels';
import { ACHIEVEMENTS, STAGES, achievementById } from '../data/progression';
import { STYLE_QUESTIONS } from '../data/styleQuestions';
import type {
  AchievementId,
  CampusInfo,
  CampusMatchPreference,
  ContactInfo,
  GameNotification,
  GameState,
  MeetPreference,
  PlayerProfile,
  QuestLevelId,
  RegistrationReceipt,
  StageId,
  SubmissionAttempt,
} from '../types';
import { uid } from '../utils';

export const LEVEL_ORDER: QuestLevelId[] = QUEST_LEVELS.map((l) => l.id);

export const emptyProfile = (): PlayerProfile => ({
  contact: { firstName: '', email: '', instagram: '', avatar: PLAYER_AVATARS[0], isStudent: false, agreedToGuidelines: false },
  campus: { campusId: null, program: '', year: null, courses: [] },
  styleAnswers: {},
  interests: [],
  meetPreference: null,
  campusMatch: null,
  hangoutIds: [],
  availability: [],
});

export const initialState = (): GameState => ({
  profile: emptyProfile(),
  xp: 0,
  completedLevels: [],
  achievements: [],
  claimedRewards: [],
  attempt: null,
  receipt: null,
  notifications: [],
});

export type Action =
  | { type: 'TOGGLE_INTEREST'; id: string; max: number }
  | { type: 'ANSWER_STYLE'; questionId: string; optionId: string }
  | { type: 'UPDATE_CAMPUS'; patch: Partial<CampusInfo> }
  | { type: 'SET_MEET_PREF'; pref: MeetPreference }
  | { type: 'SET_CAMPUS_MATCH'; pref: CampusMatchPreference }
  | { type: 'TOGGLE_HANGOUT'; id: string }
  | { type: 'TOGGLE_AVAILABILITY'; id: string }
  | { type: 'UPDATE_CONTACT'; patch: Partial<ContactInfo> }
  | { type: 'COMPLETE_LEVEL'; level: QuestLevelId }
  | { type: 'SET_ATTEMPT'; attempt: SubmissionAttempt | null }
  | { type: 'REGISTERED'; receipt: RegistrationReceipt }
  | { type: 'DISMISS_NOTIFICATION'; id: string }
  | { type: 'SYNC'; saved: unknown }
  | { type: 'RESET' };

// ---------- helpers ----------

function notify(state: GameState, n: Omit<GameNotification, 'id'>): GameState {
  return { ...state, notifications: [...state.notifications, { ...n, id: uid('note') }] };
}

/** Grants XP once per reward key. */
function reward(state: GameState, key: string, xp: number, label: string): GameState {
  if (state.claimedRewards.includes(key)) return state;
  return notify(
    { ...state, xp: state.xp + xp, claimedRewards: [...state.claimedRewards, key] },
    { tone: 'xp', title: `+${xp} XP`, body: label, emoji: '⭐' },
  );
}

function unlock(state: GameState, id: AchievementId): GameState {
  if (state.achievements.includes(id)) return state;
  const a = achievementById(id);
  return notify(
    { ...state, achievements: [...state.achievements, id] },
    { tone: 'achievement', title: `Badge unlocked: ${a?.name}`, body: a?.description, emoji: a?.emoji },
  );
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export const allLevelsComplete = (state: GameState) => LEVEL_ORDER.every((l) => state.completedLevels.includes(l));

export function deriveStage(state: GameState): StageId {
  if (state.receipt) return 'registered';
  if (allLevelsComplete(state)) return 'quest-complete';
  return state.completedLevels.length > 0 ? 'on-quest' : 'explorer';
}

export const stageIndex = (id: StageId) => STAGES.findIndex((s) => s.id === id);

/** Runs after every action: announces stage changes. */
function applyProgression(prev: GameState, next: GameState): GameState {
  const before = stageIndex(deriveStage(prev));
  const after = stageIndex(deriveStage(next));
  if (after <= before) return next;
  return notify(next, { tone: 'stage', title: `Friendship journey: ${STAGES[after].label}`, emoji: STAGES[after].emoji });
}

const LEVEL_BADGES: Partial<Record<QuestLevelId, AchievementId>> = {
  campus: 'campus-explorer',
  style: 'style-scout',
};

// ---------- reducer ----------

function baseReducer(state: GameState, action: Action): GameState {
  const { profile } = state;
  const withProfile = (patch: Partial<PlayerProfile>): GameState => ({ ...state, profile: { ...profile, ...patch } });

  switch (action.type) {
    case 'TOGGLE_INTEREST':
      if (!profile.interests.includes(action.id) && profile.interests.length >= action.max) return state;
      return withProfile({ interests: toggle(profile.interests, action.id) });

    case 'ANSWER_STYLE':
      return withProfile({ styleAnswers: { ...profile.styleAnswers, [action.questionId]: action.optionId } });

    case 'UPDATE_CAMPUS':
      return withProfile({ campus: { ...profile.campus, ...action.patch } });

    case 'SET_MEET_PREF':
      return withProfile({ meetPreference: action.pref });

    case 'SET_CAMPUS_MATCH':
      return withProfile({ campusMatch: action.pref });

    case 'TOGGLE_HANGOUT':
      return withProfile({ hangoutIds: toggle(profile.hangoutIds, action.id) });

    case 'TOGGLE_AVAILABILITY':
      return withProfile({ availability: toggle(profile.availability, action.id) });

    case 'UPDATE_CONTACT':
      return withProfile({ contact: { ...profile.contact, ...action.patch } });

    case 'COMPLETE_LEVEL': {
      const level = QUEST_LEVELS.find((l) => l.id === action.level)!;
      let s: GameState = {
        ...state,
        completedLevels: state.completedLevels.includes(action.level) ? state.completedLevels : [...state.completedLevels, action.level],
      };
      s = reward(s, `level:${action.level}`, level.xp, `Level ${level.number} · ${level.title}`);
      s = unlock(s, 'first-steps');
      if (action.level === 'contact' && profile.contact.agreedToGuidelines) s = unlock(s, 'safety-first');
      const badge = LEVEL_BADGES[action.level];
      if (badge) s = unlock(s, badge);
      if (allLevelsComplete(s)) {
        s = reward(s, 'quest-complete', QUEST_COMPLETE_BONUS_XP, 'All levels cleared bonus');
        s = unlock(s, 'quest-champion');
      }
      return s;
    }

    case 'SET_ATTEMPT':
      return { ...state, attempt: action.attempt };

    case 'REGISTERED': {
      // The backend has the answers now, so personal details stop living on this device.
      const fresh = emptyProfile();
      let s: GameState = {
        ...state,
        attempt: null,
        receipt: action.receipt,
        profile: { ...fresh, contact: { ...fresh.contact, firstName: profile.contact.firstName.trim(), avatar: profile.contact.avatar } },
      };
      s = reward(s, 'registered', REGISTERED_XP, 'Registered for matching');
      return unlock(s, 'in-the-flock');
    }

    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };

    case 'SYNC':
      return { ...hydrate(action.saved), notifications: state.notifications };

    case 'RESET':
      return initialState();

    default:
      return state;
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  const next = baseReducer(state, action);
  if (next === state || action.type === 'RESET' || action.type === 'SYNC') return next;
  return applyProgression(state, next);
}

// ---------- rehydration ----------
// Saved data can be old, edited by hand or corrupted, so every field is checked
// before use and anything unrecognised falls back to its default.

type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Loose) : {});
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '');
const list = (v: unknown, allowed: readonly string[], max = Infinity): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.includes(x)))].slice(0, max) : [];
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);
const ids = <T extends { id: string }>(items: readonly T[]) => items.map((i) => i.id) as T['id'][];

function hydrateProfile(raw: unknown): PlayerProfile {
  const p = obj(raw);
  const contact = obj(p.contact);
  const campus = obj(p.campus);
  const answers = obj(p.styleAnswers);
  const styleAnswers: Record<string, string> = {};
  for (const q of STYLE_QUESTIONS) {
    const a = oneOf(answers[q.id], ids(q.options));
    if (a) styleAnswers[q.id] = a;
  }
  return {
    contact: {
      firstName: str(contact.firstName, 30),
      email: str(contact.email),
      instagram: str(contact.instagram, 31),
      avatar: oneOf(contact.avatar, PLAYER_AVATARS) ?? PLAYER_AVATARS[0],
      isStudent: contact.isStudent === true,
      agreedToGuidelines: contact.agreedToGuidelines === true,
    },
    campus: {
      campusId: oneOf(campus.campusId, ids(CAMPUSES)),
      program: str(campus.program, 60),
      year: oneOf(campus.year, YEARS),
      courses: Array.isArray(campus.courses) ? campus.courses.map((c) => str(c, 16)).filter(Boolean).slice(0, MAX_COURSES) : [],
    },
    styleAnswers,
    interests: list(p.interests, ids(INTERESTS), MAX_INTERESTS),
    meetPreference: oneOf(p.meetPreference, ids(MEET_PREFERENCES)),
    campusMatch: oneOf(p.campusMatch, ids(CAMPUS_MATCH_PREFERENCES)),
    hangoutIds: list(p.hangoutIds, ids(HANGOUT_IDEAS)),
    availability: list(p.availability, ids(AVAILABILITY)),
  };
}

export function hydrate(saved: unknown): GameState {
  const base = initialState();
  const s = obj(saved);
  if (Object.keys(s).length === 0) return base;
  const receipt = obj(s.receipt);
  const attempt = obj(s.attempt);
  return {
    ...base,
    profile: hydrateProfile(s.profile),
    xp: typeof s.xp === 'number' && Number.isFinite(s.xp) && s.xp >= 0 ? Math.floor(s.xp) : 0,
    completedLevels: list(s.completedLevels, LEVEL_ORDER) as QuestLevelId[],
    achievements: list(s.achievements, ids(ACHIEVEMENTS)) as AchievementId[],
    claimedRewards: Array.isArray(s.claimedRewards) ? s.claimedRewards.filter((x): x is string => typeof x === 'string') : [],
    attempt:
      typeof attempt.key === 'string' && typeof attempt.fingerprint === 'string'
        ? { key: attempt.key, fingerprint: attempt.fingerprint }
        : null,
    receipt:
      typeof receipt.registrationId === 'string' && typeof receipt.submittedAt === 'string'
        ? { registrationId: receipt.registrationId, submittedAt: receipt.submittedAt }
        : null,
  };
}
