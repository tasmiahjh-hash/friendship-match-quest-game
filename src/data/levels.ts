import type { QuestLevel } from '../types';

export const QUEST_LEVELS: QuestLevel[] = [
  { id: 'vibe', number: 1, title: 'Your Vibe', tagline: 'What lights you up?', icon: '✨', xp: 100 },
  { id: 'style', number: 2, title: 'Friendship Style', tagline: 'How do you friend?', icon: '🎭', xp: 120 },
  { id: 'campus', number: 3, title: 'Campus Life', tagline: 'Where you roam', icon: '🏫', xp: 80 },
  { id: 'meet', number: 4, title: 'Meet IRL', tagline: 'Your comfort zone', icon: '🎟️', xp: 100 },
  { id: 'contact', number: 5, title: 'Your Card', tagline: 'Private by default', icon: '🔒', xp: 100 },
];

export const QUEST_COMPLETE_BONUS_XP = 50;

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
