import type { AvailabilitySlot, CampusMatchPreference, HangoutIdea, MeetPreference } from '../types';

export const MEET_PREFERENCES: { id: MeetPreference; emoji: string; title: string; body: string }[] = [
  { id: 'chat-first', emoji: '💬', title: 'Message first', body: 'I’d like to get to know each other online before meeting up.' },
  { id: 'event', emoji: '🎟️', title: 'Meet in person', body: 'I’d rather break the ice over an activity in a public campus space.' },
  { id: 'either', emoji: '🤝', title: 'Either works', body: 'Messages or meeting up, whatever feels right for both of us.' },
];

export const CAMPUS_MATCH_PREFERENCES: { id: CampusMatchPreference; emoji: string; title: string; body: string }[] = [
  { id: 'same-campus', emoji: '📍', title: 'My campus', body: 'Match me with someone at the campus I chose.' },
  { id: 'any-campus', emoji: '🗺️', title: 'Any U of A campus', body: 'I’m open to a friend at any of the four campuses.' },
];

/** Illustrative activity ideas used to learn what a student enjoys. None of these are scheduled. */
export const HANGOUT_IDEAS: HangoutIdea[] = [
  {
    id: 'craft-connect',
    name: 'Craft & Connect',
    emoji: '🧶',
    description: 'Friendship bracelets, mini canvases and cocoa. Zero skill required.',
    gradient: ['#ff7eb6', '#a78bfa'],
  },
  {
    id: 'karaoke-night',
    name: 'Karaoke Night',
    emoji: '🎤',
    description: 'Solo, duet, or just cheering from the comfy seats.',
    gradient: ['#6cc6ff', '#7c6cff'],
  },
  {
    id: 'seasonal-social',
    name: 'Seasonal Social',
    emoji: '🍂',
    description: 'Themed get-togethers with snacks, decorations and good company.',
    gradient: ['#ff9f43', '#ff5e62'],
  },
  {
    id: 'games-night',
    name: 'Games Night',
    emoji: '🎲',
    description: 'Board games, card games and some friendly competition.',
    gradient: ['#5ee2b5', '#3aa0ff'],
  },
];

export const AVAILABILITY: AvailabilitySlot[] = [
  { id: 'weekday-mornings', label: 'Weekday mornings', emoji: '🌅' },
  { id: 'weekday-afternoons', label: 'Weekday afternoons', emoji: '☀️' },
  { id: 'weekday-evenings', label: 'Weekday evenings', emoji: '🌆' },
  { id: 'weekend-days', label: 'Weekend days', emoji: '🧺' },
  { id: 'weekend-evenings', label: 'Weekend evenings', emoji: '🌙' },
];

export const hangoutById = (id: string) => HANGOUT_IDEAS.find((h) => h.id === id);
export const availabilityById = (id: string) => AVAILABILITY.find((a) => a.id === id);
