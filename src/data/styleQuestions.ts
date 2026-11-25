import type { StyleQuestion } from '../types';

export const STYLE_QUESTIONS: StyleQuestion[] = [
  {
    id: 'night',
    kicker: 'Friday night, no plans yet…',
    prompt: 'Quiet night in or big social event?',
    options: [
      { id: 'quiet', label: 'Cozy night in', emoji: '🕯️', blurb: 'Snacks, a show, good company' },
      { id: 'mix', label: 'Depends on the mood', emoji: '🌗', blurb: 'A bit of both, honestly' },
      { id: 'social', label: 'Big social event', emoji: '🎉', blurb: 'The more the merrier' },
    ],
  },
  {
    id: 'planning',
    kicker: 'Weekend trip with friends…',
    prompt: 'Plan everything or go with the flow?',
    options: [
      { id: 'planner', label: 'Spreadsheet ready', emoji: '🗂️', blurb: 'Itinerary, backups, the works' },
      { id: 'spontaneous', label: 'Let’s just go', emoji: '🎲', blurb: 'Best stories are unplanned' },
    ],
  },
  {
    id: 'texting',
    kicker: 'Your texting energy is…',
    prompt: 'Text all day or check in occasionally?',
    options: [
      { id: 'frequent', label: 'Constant memes', emoji: '💬', blurb: 'The group chat never sleeps' },
      { id: 'occasional', label: 'Quality check-ins', emoji: '📮', blurb: 'Less often, more meaningful' },
    ],
  },
  {
    id: 'group',
    kicker: 'Hanging out feels best…',
    prompt: 'One-on-one or in a group?',
    options: [
      { id: 'one-on-one', label: 'One-on-one', emoji: '☕', blurb: 'Deep chats, real connection' },
      { id: 'small', label: 'Small crew', emoji: '👥', blurb: 'Three or four, just right' },
      { id: 'group', label: 'Big group', emoji: '🎈', blurb: 'Chaos is part of the fun' },
    ],
  },
  {
    id: 'values',
    kicker: 'What it comes down to…',
    prompt: 'What matters most in a friendship?',
    options: [
      { id: 'loyalty', label: 'Loyalty', emoji: '🛡️', blurb: 'Always in your corner' },
      { id: 'humour', label: 'Humour', emoji: '😂', blurb: 'Laughing till it hurts' },
      { id: 'growth', label: 'Growth', emoji: '🌱', blurb: 'Pushing each other forward' },
      { id: 'adventure', label: 'Adventure', emoji: '🧭', blurb: 'Trying new things together' },
    ],
  },
];

/** Friendly archetype derived from answers, shown as a reward after Level 2. */
export function friendshipArchetype(answers: Record<string, string>): { name: string; emoji: string; blurb: string } {
  const cozy = answers.night === 'quiet' || answers.group === 'one-on-one';
  const social = answers.night === 'social' || answers.group === 'group';
  const planner = answers.planning === 'planner';

  if (cozy && planner) return { name: 'The Cozy Planner', emoji: '🦉', blurb: 'Thoughtful, reliable, and the keeper of great café recs.' };
  if (cozy) return { name: 'The Gentle Wanderer', emoji: '🦢', blurb: 'Low-key, warm and always up for a deep chat.' };
  if (social && planner) return { name: 'The Event Captain', emoji: '🦜', blurb: 'You make the plans everyone else shows up for.' };
  if (social) return { name: 'The Spark', emoji: '⚡', blurb: 'Spontaneous energy that pulls people together.' };
  return { name: 'The Easygoing Ally', emoji: '🕊️', blurb: 'Balanced, adaptable and easy to be around.' };
}
