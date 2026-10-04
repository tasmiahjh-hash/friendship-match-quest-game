import type { Achievement, Stage } from '../types';

export const STAGES: Stage[] = [
  { id: 'stranger', label: 'Stranger', emoji: '🥚' },
  { id: 'quest-complete', label: 'Quest Complete', emoji: '🏁' },
  { id: 'matched', label: 'Matched', emoji: '💞' },
  { id: 'getting-to-know', label: 'Getting to Know You', emoji: '💬' },
  { id: 'meetup-ready', label: 'Meetup Ready', emoji: '🎟️' },
  { id: 'new-friends', label: 'New Friends', emoji: '🐣' },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', name: 'First Steps', emoji: '🌱', description: 'Completed your first level' },
  { id: 'safety-first', name: 'Safety First', emoji: '🛡️', description: 'Agreed to the community guidelines' },
  { id: 'quest-champion', name: 'Quest Champion', emoji: '🏆', description: 'Completed every onboarding level' },
  { id: 'same-vibe', name: 'Same Vibe', emoji: '🌈', description: 'Matched with 3+ shared interests' },
  { id: 'campus-twins', name: 'Campus Twins', emoji: '🏫', description: 'Matched with someone at your university' },
  { id: 'conversation-starter', name: 'Conversation Starter', emoji: '💬', description: 'Sent your first message' },
  { id: 'icebreaker', name: 'Ice Breaker', emoji: '🧊', description: 'Used an icebreaker prompt' },
  { id: 'meetup-ready', name: 'Meetup Ready', emoji: '🎟️', description: 'You both agreed to meet at an event' },
  { id: 'new-friends', name: 'New Friends', emoji: '🐣', description: 'Reached the final friendship stage' },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

/** XP rewards for in-room actions. Each is granted at most once. */
export const ROOM_REWARDS = {
  matched: { xp: 100, label: 'Match found' },
  firstMessage: { xp: 25, label: 'First message' },
  icebreaker: { xp: 15, label: 'Icebreaker used' },
  gettingToKnow: { xp: 50, label: 'Getting to know you' },
  meetupInterest: { xp: 30, label: 'Meetup interest' },
  meetupUnlocked: { xp: 120, label: 'Meetup unlocked' },
  // Same XP whichever option is chosen, so sharing contact info is never incentivised.
  contactDecision: { xp: 60, label: 'Connection choice made' },
} as const;

/** Messages the player sends before "Getting to Know You" unlocks. */
export const GETTING_TO_KNOW_THRESHOLD = 3;
