import { QUEST_COMPLETE_BONUS_XP, QUEST_LEVELS } from '../data/levels';
import { GETTING_TO_KNOW_THRESHOLD, ROOM_REWARDS, STAGES, achievementById } from '../data/progression';
import { DEMO_PROFILE } from '../data/students';
import { seedConversation } from '../services/mockPeer';
import type {
  AchievementId,
  CampusInfo,
  ChatMessage,
  ContactChannel,
  ContactInfo,
  GameNotification,
  GameState,
  MatchResult,
  MeetPreference,
  PlayerProfile,
  QuestLevelId,
  SafetyReport,
  ScreenId,
  StageId,
} from '../types';
import { uid } from '../utils';

export const LEVEL_ORDER: QuestLevelId[] = QUEST_LEVELS.map((l) => l.id);

export const emptyProfile = (): PlayerProfile => ({
  interests: [],
  styleAnswers: {},
  campus: { universityId: null, program: '', year: null, courses: [] },
  meetPreference: null,
  availableEventIds: [],
  contact: { firstName: '', email: '', instagram: '', agreedToGuidelines: false, avatar: '🦊' },
});

export const initialState = (): GameState => ({
  screen: 'welcome',
  profile: emptyProfile(),
  xp: 0,
  completedLevels: [],
  achievements: [],
  claimedRewards: [],
  match: null,
  messages: [],
  meetup: { eventId: null, status: 'none' },
  sharing: { mine: { instagram: false, email: false }, decided: false, keepChattingHere: false, theirs: {} },
  relationship: 'active',
  reports: [],
  notifications: [],
});

export type Action =
  | { type: 'GO'; screen: ScreenId }
  | { type: 'TOGGLE_INTEREST'; id: string; max: number }
  | { type: 'ANSWER_STYLE'; questionId: string; optionId: string }
  | { type: 'UPDATE_CAMPUS'; patch: Partial<CampusInfo> }
  | { type: 'SET_MEET_PREF'; pref: MeetPreference }
  | { type: 'TOGGLE_EVENT'; id: string }
  | { type: 'UPDATE_CONTACT'; patch: Partial<ContactInfo> }
  | { type: 'COMPLETE_LEVEL'; level: QuestLevelId }
  | { type: 'SET_MATCH'; match: MatchResult }
  | { type: 'SEND_MESSAGE'; text: string; icebreaker?: boolean }
  | { type: 'RECEIVE_MESSAGE'; text: string }
  | { type: 'MEETUP_REQUEST'; eventId: string }
  | { type: 'MEETUP_PEER_CONSENT' }
  | { type: 'MEETUP_WITHDRAW' }
  | { type: 'SHARE_CONTACT'; channel: ContactChannel }
  | { type: 'UNSHARE_CONTACT'; channel: ContactChannel }
  | { type: 'KEEP_CHATTING_HERE' }
  | { type: 'PEER_SHARED_CONTACT'; channel: ContactChannel; value: string }
  | { type: 'REPORT'; report: SafetyReport }
  | { type: 'BLOCK' }
  | { type: 'UNMATCH' }
  | { type: 'RESTORE_MATCH' }
  | { type: 'DISMISS_NOTIFICATION'; id: string }
  | { type: 'LOAD_DEMO_PROFILE' }
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

const sentCount = (messages: ChatMessage[]) => messages.filter((m) => m.from === 'me').length;

export function deriveStage(state: GameState): StageId {
  const questDone = state.completedLevels.length === LEVEL_ORDER.length;
  if (!questDone) return 'stranger';
  if (!state.match) return 'quest-complete';
  const knowing = sentCount(state.messages) >= GETTING_TO_KNOW_THRESHOLD;
  const meetupDone = state.meetup.status === 'unlocked' || state.match.sharedEventIds.length === 0;
  // New Friends = chatted + met (or no shared event) + made a connection choice.
  // "Keep chatting here" counts exactly like sharing, so nobody is nudged into exposing contact info.
  if (knowing && meetupDone && state.sharing.decided) return 'new-friends';
  if (state.meetup.status === 'unlocked') return 'meetup-ready';
  if (knowing) return 'getting-to-know';
  return 'matched';
}

export const stageIndex = (id: StageId) => STAGES.findIndex((s) => s.id === id);

/** Runs after every action: announces stage changes and stage-linked rewards. */
function applyProgression(prev: GameState, next: GameState): GameState {
  const before = deriveStage(prev);
  const after = deriveStage(next);
  if (stageIndex(after) <= stageIndex(before)) return next;

  let s = next;
  const stage = STAGES[stageIndex(after)];
  s = notify(s, { tone: 'stage', title: `Friendship stage: ${stage.label}`, emoji: stage.emoji });
  if (stageIndex(after) >= stageIndex('getting-to-know') && sentCount(s.messages) >= GETTING_TO_KNOW_THRESHOLD) {
    s = reward(s, 'getting-to-know', ROOM_REWARDS.gettingToKnow.xp, ROOM_REWARDS.gettingToKnow.label);
  }
  if (after === 'new-friends') s = unlock(s, 'new-friends');
  return s;
}

function addMessage(state: GameState, from: ChatMessage['from'], text: string, kind: ChatMessage['kind'] = 'text'): GameState {
  return { ...state, messages: [...state.messages, { id: uid('msg'), from, text, kind, at: Date.now() }] };
}

// ---------- reducer ----------

function baseReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'GO':
      return { ...state, screen: action.screen };

    case 'TOGGLE_INTEREST': {
      const has = state.profile.interests.includes(action.id);
      if (!has && state.profile.interests.length >= action.max) return state;
      const interests = has ? state.profile.interests.filter((i) => i !== action.id) : [...state.profile.interests, action.id];
      return { ...state, profile: { ...state.profile, interests } };
    }

    case 'ANSWER_STYLE':
      return {
        ...state,
        profile: { ...state.profile, styleAnswers: { ...state.profile.styleAnswers, [action.questionId]: action.optionId } },
      };

    case 'UPDATE_CAMPUS':
      return { ...state, profile: { ...state.profile, campus: { ...state.profile.campus, ...action.patch } } };

    case 'SET_MEET_PREF':
      return { ...state, profile: { ...state.profile, meetPreference: action.pref } };

    case 'TOGGLE_EVENT': {
      const ids = state.profile.availableEventIds;
      const availableEventIds = ids.includes(action.id) ? ids.filter((e) => e !== action.id) : [...ids, action.id];
      return { ...state, profile: { ...state.profile, availableEventIds } };
    }

    case 'UPDATE_CONTACT':
      return { ...state, profile: { ...state.profile, contact: { ...state.profile.contact, ...action.patch } } };

    case 'COMPLETE_LEVEL': {
      const level = QUEST_LEVELS.find((l) => l.id === action.level)!;
      const idx = LEVEL_ORDER.indexOf(action.level);
      const nextScreen: ScreenId = idx === LEVEL_ORDER.length - 1 ? 'complete' : LEVEL_ORDER[idx + 1];
      let s: GameState = {
        ...state,
        screen: nextScreen,
        completedLevels: state.completedLevels.includes(action.level)
          ? state.completedLevels
          : [...state.completedLevels, action.level],
      };
      s = reward(s, `level:${action.level}`, level.xp, `Level ${level.number} · ${level.title}`);
      s = unlock(s, 'first-steps');
      if (action.level === 'contact' && s.profile.contact.agreedToGuidelines) s = unlock(s, 'safety-first');
      if (s.completedLevels.length === LEVEL_ORDER.length) {
        s = reward(s, 'quest-complete', QUEST_COMPLETE_BONUS_XP, 'Quest complete bonus');
        s = unlock(s, 'quest-champion');
      }
      return s;
    }

    case 'SET_MATCH': {
      let s: GameState = {
        ...state,
        match: action.match,
        messages: seedConversation(action.match, state.profile.contact.firstName),
        meetup: { eventId: null, status: 'none' },
        sharing: initialState().sharing,
        relationship: 'active',
        screen: 'reveal',
      };
      s = reward(s, 'matched', ROOM_REWARDS.matched.xp, ROOM_REWARDS.matched.label);
      if (action.match.sharedInterests.length >= 3) s = unlock(s, 'same-vibe');
      if (action.match.sameUniversity) s = unlock(s, 'campus-twins');
      return s;
    }

    case 'SEND_MESSAGE': {
      const text = action.text.trim();
      if (!text || state.relationship !== 'active') return state;
      let s = addMessage(state, 'me', text);
      s = reward(s, 'first-message', ROOM_REWARDS.firstMessage.xp, ROOM_REWARDS.firstMessage.label);
      s = unlock(s, 'conversation-starter');
      if (action.icebreaker) {
        s = reward(s, 'icebreaker', ROOM_REWARDS.icebreaker.xp, ROOM_REWARDS.icebreaker.label);
        s = unlock(s, 'icebreaker');
      }
      return s;
    }

    case 'RECEIVE_MESSAGE':
      if (state.relationship !== 'active') return state;
      return addMessage(state, 'them', action.text);

    case 'MEETUP_REQUEST': {
      if (state.relationship !== 'active') return state;
      const s: GameState = { ...state, meetup: { eventId: action.eventId, status: 'waiting' } };
      return reward(s, 'meetup-interest', ROOM_REWARDS.meetupInterest.xp, ROOM_REWARDS.meetupInterest.label);
    }

    case 'MEETUP_PEER_CONSENT': {
      if (state.meetup.status !== 'waiting' || state.relationship !== 'active') return state;
      let s: GameState = { ...state, meetup: { ...state.meetup, status: 'unlocked' } };
      s = addMessage(s, 'system', state.meetup.eventId ?? '', 'meetup'); // text holds the event id
      s = reward(s, 'meetup-unlocked', ROOM_REWARDS.meetupUnlocked.xp, ROOM_REWARDS.meetupUnlocked.label);
      return unlock(s, 'meetup-ready');
    }

    case 'MEETUP_WITHDRAW':
      return notify(
        { ...state, meetup: { eventId: null, status: 'none' } },
        { tone: 'info', title: 'Meetup interest withdrawn', body: 'No problem. You can change your mind anytime.', emoji: '↩️' },
      );

    case 'SHARE_CONTACT': {
      const value = action.channel === 'email' ? state.profile.contact.email : state.profile.contact.instagram;
      if (!value || state.relationship !== 'active') return state;
      let s: GameState = {
        ...state,
        sharing: { ...state.sharing, decided: true, keepChattingHere: false, mine: { ...state.sharing.mine, [action.channel]: true } },
      };
      s = addMessage(s, 'system', `You shared your ${action.channel === 'email' ? 'email' : 'Instagram'}: ${value}`, 'contact-share');
      return reward(s, 'contact-decision', ROOM_REWARDS.contactDecision.xp, ROOM_REWARDS.contactDecision.label);
    }

    case 'UNSHARE_CONTACT': {
      const mine = { ...state.sharing.mine, [action.channel]: false };
      return notify(
        { ...state, sharing: { ...state.sharing, mine } },
        {
          tone: 'info',
          title: `${action.channel === 'email' ? 'Email' : 'Instagram'} hidden`,
          body: 'It won’t be shown to your match from now on.',
          emoji: '🙈',
        },
      );
    }

    case 'KEEP_CHATTING_HERE': {
      const s: GameState = { ...state, sharing: { ...state.sharing, decided: true, keepChattingHere: true } };
      return reward(s, 'contact-decision', ROOM_REWARDS.contactDecision.xp, ROOM_REWARDS.contactDecision.label);
    }

    case 'PEER_SHARED_CONTACT': {
      if (state.relationship !== 'active') return state;
      const s: GameState = { ...state, sharing: { ...state.sharing, theirs: { ...state.sharing.theirs, [action.channel]: action.value } } };
      const name = state.match?.student.firstName ?? 'Your match';
      return addMessage(
        s,
        'system',
        `${name} chose to share their ${action.channel === 'email' ? 'email' : 'Instagram'}: ${action.value}`,
        'contact-share',
      );
    }

    case 'REPORT':
      return notify(
        { ...state, reports: [...state.reports, action.report] },
        { tone: 'safety', title: 'Report received', body: 'The FAC safety team will review it. Thank you for speaking up.', emoji: '🛡️' },
      );

    case 'BLOCK':
      return {
        ...state,
        relationship: 'blocked',
        meetup: { eventId: null, status: 'none' },
        sharing: { ...state.sharing, mine: { instagram: false, email: false } },
      };

    case 'UNMATCH':
      return { ...state, relationship: 'unmatched', meetup: { eventId: null, status: 'none' } };

    case 'RESTORE_MATCH':
      return { ...state, relationship: 'active' };

    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };

    case 'LOAD_DEMO_PROFILE': {
      // Presenter shortcut: fill a sample profile and jump straight to matching.
      let s: GameState = {
        ...initialState(),
        profile: {
          ...DEMO_PROFILE,
          campus: { ...DEMO_PROFILE.campus, courses: [...DEMO_PROFILE.campus.courses] },
          interests: [...DEMO_PROFILE.interests],
          availableEventIds: [...DEMO_PROFILE.availableEventIds],
          styleAnswers: { ...DEMO_PROFILE.styleAnswers },
          contact: { ...DEMO_PROFILE.contact },
        },
      };
      for (const level of LEVEL_ORDER) s = baseReducer(s, { type: 'COMPLETE_LEVEL', level });
      return { ...s, notifications: [], screen: 'complete' };
    }

    case 'RESET':
      return initialState();

    default:
      return state;
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  const next = baseReducer(state, action);
  if (next === state || action.type === 'RESET' || action.type === 'LOAD_DEMO_PROFILE') return next;
  return applyProgression(state, next);
}

export function hydrate(saved: Partial<GameState> | null): GameState {
  const base = initialState();
  if (!saved) return base;
  return { ...base, ...saved, notifications: [] };
}
