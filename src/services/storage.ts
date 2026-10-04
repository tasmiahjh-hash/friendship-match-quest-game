import type { GameState } from '../types';

// Local persistence so a page refresh mid-demo doesn't lose progress.
// Replace with server-side profile/match storage once a backend exists.
const KEY = 'friendship-quest:v1';

export function loadState(): Partial<GameState> | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<GameState>) : null;
  } catch {
    return null;
  }
}

export function saveState(state: GameState) {
  try {
    const { notifications: _ignored, ...persisted } = state;
    window.localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    /* storage unavailable (private mode etc.) — the demo still works in memory */
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
