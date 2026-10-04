// Core domain types for Friendship Quest.
// These are shaped so they can map 1:1 onto backend tables/DTOs later.

export type ScreenId =
  | 'welcome'
  | 'vibe'
  | 'style'
  | 'campus'
  | 'meet'
  | 'contact'
  | 'complete'
  | 'reveal'
  | 'room';

export type QuestLevelId = 'vibe' | 'style' | 'campus' | 'meet' | 'contact';

export interface QuestLevel {
  id: QuestLevelId;
  number: number;
  title: string;
  tagline: string;
  icon: string;
  xp: number;
}

export interface Interest {
  id: string;
  label: string;
  emoji: string;
  hue: number; // used to tint the card
}

export interface StyleOption {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
}

export interface StyleQuestion {
  id: string;
  prompt: string;
  kicker: string;
  options: StyleOption[];
}

export interface University {
  id: string;
  name: string;
  short: string;
  emailDomain: string;
  emoji: string;
}

export type YearOfStudy = '1st' | '2nd' | '3rd' | '4th' | 'Grad';

export type MeetPreference = 'chat-first' | 'event' | 'either';

export interface FriendshipEvent {
  id: string;
  name: string;
  emoji: string;
  date: string; // ISO date
  time: string;
  location: string;
  host: string;
  description: string;
  gradient: [string, string];
  spotsLeft: number;
}

export interface CampusInfo {
  universityId: string | null;
  program: string;
  year: YearOfStudy | null;
  courses: string[];
}

export interface ContactInfo {
  firstName: string;
  email: string;
  instagram: string;
  agreedToGuidelines: boolean;
  avatar: string;
}

export interface PlayerProfile {
  interests: string[];
  styleAnswers: Record<string, string>;
  campus: CampusInfo;
  meetPreference: MeetPreference | null;
  availableEventIds: string[];
  contact: ContactInfo;
}

/** A student in the (mock) matching pool. Private fields are never rendered to the other user. */
export interface Student {
  id: string;
  firstName: string;
  avatar: string;
  avatarGradient: [string, string];
  pronouns: string;
  program: string;
  year: YearOfStudy;
  bio: string;
  interests: string[];
  styleAnswers: Record<string, string>;
  availableEventIds: string[];
  meetPreference: MeetPreference;
  /** Private — only revealed if this student explicitly chooses to share. */
  private: {
    email: string;
    instagram: string;
  };
}

export interface MatchResult {
  student: Student;
  compatibility: number;
  sharedInterests: string[];
  sharedEventIds: string[];
  sharedStyleIds: string[];
  reasons: string[];
  sameUniversity: boolean;
}

export type ChatSender = 'me' | 'them' | 'system';

export interface ChatMessage {
  id: string;
  from: ChatSender;
  text: string;
  at: number;
  /** Highlighted card variants within the chat stream. */
  kind?: 'text' | 'meetup' | 'contact-share' | 'notice';
}

export type MeetupStatus = 'none' | 'waiting' | 'unlocked';

export interface MeetupState {
  eventId: string | null;
  status: MeetupStatus;
}

export type ContactChannel = 'instagram' | 'email';

export interface SharingState {
  mine: Record<ContactChannel, boolean>;
  decided: boolean;
  keepChattingHere: boolean;
  /** What the match has chosen to share with the player (simulated). */
  theirs: Partial<Record<ContactChannel, string>>;
}

export type RelationshipStatus = 'active' | 'blocked' | 'unmatched';

export type ReportReason =
  | 'harassment'
  | 'inappropriate'
  | 'spam'
  | 'pressure'
  | 'unsafe'
  | 'other';

export interface SafetyReport {
  id: string;
  reason: ReportReason;
  details: string;
  alsoBlocked: boolean;
  at: number;
}

export type StageId =
  | 'stranger'
  | 'quest-complete'
  | 'matched'
  | 'getting-to-know'
  | 'meetup-ready'
  | 'new-friends';

export interface Stage {
  id: StageId;
  label: string;
  emoji: string;
}

export type AchievementId =
  | 'first-steps'
  | 'same-vibe'
  | 'campus-twins'
  | 'conversation-starter'
  | 'icebreaker'
  | 'meetup-ready'
  | 'safety-first'
  | 'quest-champion'
  | 'new-friends';

export interface Achievement {
  id: AchievementId;
  name: string;
  emoji: string;
  description: string;
}

export type NotificationTone = 'xp' | 'achievement' | 'stage' | 'info' | 'safety';

export interface GameNotification {
  id: string;
  tone: NotificationTone;
  title: string;
  body?: string;
  emoji?: string;
}

export interface GameState {
  screen: ScreenId;
  profile: PlayerProfile;
  xp: number;
  completedLevels: QuestLevelId[];
  achievements: AchievementId[];
  /** One-off XP rewards already granted (prevents farming XP by repeating actions). */
  claimedRewards: string[];
  match: MatchResult | null;
  messages: ChatMessage[];
  meetup: MeetupState;
  sharing: SharingState;
  relationship: RelationshipStatus;
  reports: SafetyReport[];
  notifications: GameNotification[];
}
