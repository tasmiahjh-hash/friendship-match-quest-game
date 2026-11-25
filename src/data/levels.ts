import type { QuestLevel } from '../types';

export const QUEST_LEVELS: QuestLevel[] = [
  { id: 'contact', number: 1, title: 'Your Card', tagline: 'Private by default', icon: '🪪', xp: 100 },
  { id: 'campus', number: 2, title: 'Campus Life', tagline: 'Where you roam', icon: '🏫', xp: 80 },
  { id: 'style', number: 3, title: 'Friendship Style', tagline: 'How do you friend?', icon: '🎭', xp: 120 },
  { id: 'vibe', number: 4, title: 'Your Vibe', tagline: 'What lights you up?', icon: '✨', xp: 100 },
  { id: 'meet', number: 5, title: 'Meeting Up', tagline: 'Your comfort zone', icon: '🎟️', xp: 100 },
];

export const QUEST_COMPLETE_BONUS_XP = 50;
export const REGISTERED_XP = 50;

/** XP needed per player level. */
export const XP_PER_LEVEL = 200;

export const PLAYER_TITLES = [
  'Fledgling',
  'Explorer',
  'Connector',
  'Flock Builder',
  'Social Legend',
  'Friendship Hero',
];
