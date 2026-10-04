import type { FriendshipEvent } from '../types';

// Mock upcoming supervised friendship events hosted by the FAC team.
export const EVENTS: FriendshipEvent[] = [
  {
    id: 'craft-connect',
    name: 'Craft & Connect',
    emoji: '🧶',
    date: '2026-10-15',
    time: '6:00 – 8:00 PM',
    location: 'Student Union, Room 204',
    host: 'FAC team',
    description: 'Friendship bracelets, mini canvases and cocoa. Zero skill required.',
    gradient: ['#ff7eb6', '#a78bfa'],
    spotsLeft: 18,
  },
  {
    id: 'karaoke-night',
    name: 'Karaoke Night',
    emoji: '🎤',
    date: '2026-10-22',
    time: '7:30 – 10:00 PM',
    location: 'The Commons Lounge',
    host: 'FAC team',
    description: 'Solo, duet, or just cheer from the comfy seats. Mocktails on us.',
    gradient: ['#6cc6ff', '#7c6cff'],
    spotsLeft: 24,
  },
  {
    id: 'halloween-social',
    name: 'Halloween Social',
    emoji: '🎃',
    date: '2026-10-30',
    time: '7:00 – 10:00 PM',
    location: 'Great Hall',
    host: 'FAC team',
    description: 'Costumes optional, pumpkin carving encouraged, spooky snacks guaranteed.',
    gradient: ['#ff9f43', '#ff5e62'],
    spotsLeft: 40,
  },
  {
    id: 'games-night',
    name: 'Games Night',
    emoji: '🎲',
    date: '2026-11-06',
    time: '6:30 – 9:30 PM',
    location: 'Library Learning Commons',
    host: 'FAC team',
    description: 'Board games, card games and a very competitive Mario Kart bracket.',
    gradient: ['#5ee2b5', '#3aa0ff'],
    spotsLeft: 30,
  },
];

export const eventById = (id: string | null) => EVENTS.find((e) => e.id === id);

export function formatEventDate(iso: string): { weekday: string; day: string; month: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    day: d.toLocaleDateString('en-GB', { day: 'numeric' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }),
  };
}
