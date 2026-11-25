// Core domain types for Friendship Quest.
// These are shaped so they can map 1:1 onto backend tables/DTOs later.

export type QuestLevelId = 'contact' | 'campus' | 'style' | 'vibe' | 'meet';

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

export type CampusId = 'ualberta-north' | 'ualberta-augustana' | 'ualberta-saint-jean' | 'ualberta-south';

export interface Campus {
  id: CampusId;
  /** Full label. Stored alongside the id in every submission. */
  name: string;
  short: string;
  place: string;
  emoji: string;
}

export type YearOfStudy = '1st' | '2nd' | '3rd' | '4th' | '5th+' | 'Grad';

export type MeetPreference = 'chat-first' | 'event' | 'either';

export type CampusMatchPreference = 'same-campus' | 'any-campus';

/** A kind of first hangout a student would enjoy. Illustrative ideas, not scheduled events. */
export interface HangoutIdea {
  id: string;
  name: string;
  emoji: string;
  description: string;
  gradient: [string, string];
}

export interface AvailabilitySlot {
  id: string;
  label: string;
  emoji: string;
}

export interface CampusInfo {
  campusId: CampusId | null;
  program: string;
  year: YearOfStudy | null;
  courses: string[];
}

export interface ContactInfo {
  firstName: string;
  email: string;
  instagram: string;
  avatar: string;
  /** Self-attestation only. Enrolment is NOT verified. */
  isStudent: boolean;
  agreedToGuidelines: boolean;
}

export interface PlayerProfile {
  contact: ContactInfo;
  campus: CampusInfo;
  styleAnswers: Record<string, string>;
  interests: string[];
  meetPreference: MeetPreference | null;
  campusMatch: CampusMatchPreference | null;
  hangoutIds: string[];
  availability: string[];
}

export type StageId = 'explorer' | 'on-quest' | 'quest-complete' | 'registered' | 'match-email';

export interface Stage {
  id: StageId;
  label: string;
  emoji: string;
}

export type AchievementId =
  | 'first-steps'
  | 'safety-first'
  | 'campus-explorer'
  | 'style-scout'
  | 'quest-champion'
  | 'in-the-flock';

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

/** Proof that the storage backend confirmed a save. Never created client-side. */
export interface RegistrationReceipt {
  registrationId: string;
  submittedAt: string;
}

/** Idempotency bookkeeping for the registration currently being submitted. */
export interface SubmissionAttempt {
  key: string;
  fingerprint: string;
}

export interface GameState {
  profile: PlayerProfile;
  xp: number;
  completedLevels: QuestLevelId[];
  achievements: AchievementId[];
  /** One-off XP rewards already granted (prevents farming XP by repeating actions). */
  claimedRewards: string[];
  attempt: SubmissionAttempt | null;
  receipt: RegistrationReceipt | null;
  notifications: GameNotification[];
}
