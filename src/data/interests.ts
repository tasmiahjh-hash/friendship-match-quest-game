import type { Interest } from '../types';

export const INTERESTS: Interest[] = [
  { id: 'gaming', label: 'Gaming', emoji: '🎮', hue: 265 },
  { id: 'gym', label: 'Gym', emoji: '🏋️', hue: 12 },
  { id: 'badminton', label: 'Badminton', emoji: '🏸', hue: 150 },
  { id: 'movies', label: 'Movies', emoji: '🎬', hue: 350 },
  { id: 'anime', label: 'Anime', emoji: '🌸', hue: 320 },
  { id: 'reading', label: 'Reading', emoji: '📚', hue: 30 },
  { id: 'cafes', label: 'Cafés', emoji: '☕', hue: 25 },
  { id: 'food', label: 'Food', emoji: '🍜', hue: 40 },
  { id: 'music', label: 'Music', emoji: '🎧', hue: 200 },
  { id: 'art', label: 'Art', emoji: '🎨', hue: 290 },
  { id: 'crafts', label: 'Crafts', emoji: '🧶', hue: 335 },
  { id: 'studying', label: 'Studying', emoji: '📝', hue: 220 },
  { id: 'parties', label: 'Parties', emoji: '🪩', hue: 280 },
  { id: 'outdoors', label: 'Outdoors', emoji: '🌲', hue: 130 },
  { id: 'travel', label: 'Travel', emoji: '✈️', hue: 190 },
  { id: 'photography', label: 'Photography', emoji: '📷', hue: 240 },
];

export const MIN_INTERESTS = 4;
export const MAX_INTERESTS = 8;

export const interestById = (id: string) => INTERESTS.find((i) => i.id === id);
