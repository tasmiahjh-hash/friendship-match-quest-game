import { useSyncExternalStore } from 'react';
import type { GameState, QuestLevelId } from '../types';
import { LEVEL_ORDER, allLevelsComplete } from './gameLogic';

/**
 * Hash routing (`/#/quest/campus`). GitHub Pages only serves real files, so keeping
 * the route in the hash means every page survives a refresh or a shared link.
 */
export type Route =
  | { name: 'home' }
  | { name: 'level'; level: QuestLevelId }
  | { name: 'review' }
  | { name: 'complete' }
  | { name: 'how-it-works' }
  | { name: 'privacy' }
  | { name: 'feedback' }
  | { name: 'not-found' };

export const paths = {
  home: '/',
  level: (l: QuestLevelId) => `/quest/${l}`,
  review: '/quest/review',
  complete: '/quest/complete',
  howItWorks: '/how-it-works',
  privacy: '/privacy',
  feedback: '/help-us-improve',
} as const;

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/[?].*$/, '').replace(/\/+$/, '') || '/';
  switch (path) {
    case '/':
      return { name: 'home' };
    case paths.review:
      return { name: 'review' };
    case paths.complete:
      return { name: 'complete' };
    case paths.howItWorks:
      return { name: 'how-it-works' };
    case paths.privacy:
      return { name: 'privacy' };
    case paths.feedback:
      return { name: 'feedback' };
  }
  const level = LEVEL_ORDER.find((l) => path === paths.level(l));
  return level ? { name: 'level', level } : { name: 'not-found' };
}

/** Next place to go in the quest: the first unfinished level, the review, or the receipt. */
export function questEntry(state: GameState): string {
  if (state.receipt) return paths.complete;
  const next = LEVEL_ORDER.find((l) => !state.completedLevels.includes(l));
  return next ? paths.level(next) : paths.review;
}

/** Where to send the visitor instead, or null when the route is allowed. */
export function redirectFor(route: Route, state: GameState): string | null {
  switch (route.name) {
    case 'level': {
      if (state.receipt) return paths.complete;
      const reachable = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(route.level)).every((l) => state.completedLevels.includes(l));
      return reachable ? null : questEntry(state);
    }
    case 'review':
      return state.receipt || !allLevelsComplete(state) ? questEntry(state) : null;
    case 'complete':
      return state.receipt ? null : questEntry(state);
    default:
      return null;
  }
}

export function navigate(path: string, { replace = false } = {}) {
  const hash = `#${path}`;
  if (window.location.hash === hash) return;
  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export const useHash = () => useSyncExternalStore(subscribe, () => window.location.hash);
