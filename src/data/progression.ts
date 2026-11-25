import type { Achievement, Stage } from '../types';

export const STAGES: Stage[] = [
  { id: 'explorer', label: 'New Explorer', emoji: '🥚' },
  { id: 'on-quest', label: 'On the Quest', emoji: '🎮' },
  { id: 'quest-complete', label: 'Levels Cleared', emoji: '🏁' },
  { id: 'registered', label: 'Registered', emoji: '📮' },
  // Happens outside the app, by email. Never marked as reached here.
  { id: 'match-email', label: 'Match by Email', emoji: '🤝' },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', name: 'First Steps', emoji: '🌱', description: 'Completed your first level' },
  { id: 'safety-first', name: 'Safety First', emoji: '🛡️', description: 'Agreed to the community guidelines' },
  { id: 'campus-explorer', name: 'Campus Explorer', emoji: '🧭', description: 'Put your campus on the map' },
  { id: 'style-scout', name: 'Style Scout', emoji: '🎭', description: 'Discovered your friendship archetype' },
  { id: 'quest-champion', name: 'Quest Champion', emoji: '🏆', description: 'Cleared every quest level' },
  { id: 'in-the-flock', name: 'In the Flock', emoji: '🐣', description: 'Registered for friendship matching' },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
