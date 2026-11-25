import type { GameState } from '../types';

// Keeps an in-progress quest on this device only, so a refresh or a failed
// submission never loses answers. Nothing here is a record of registration:
// that only exists once the submission backend confirms it.
const KEY = 'friendship-quest:v2';
const LEGACY_KEYS = ['friendship-quest:v1'];
/** The confirmation email address, kept for this tab only. */
const RECEIPT_EMAIL_KEY = 'friendship-quest:receipt-email';

export function loadState(): unknown {
  try {
    for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state: GameState) {
  try {
    const { notifications: _ignored, ...persisted } = state;
    window.localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    /* storage unavailable (private mode etc.): the quest still works in memory */
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(RECEIPT_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function saveReceiptEmail(email: string) {
  try {
    window.sessionStorage.setItem(RECEIPT_EMAIL_KEY, email);
  } catch {
    /* ignore */
  }
}

export function loadReceiptEmail(): string | null {
  try {
    return window.sessionStorage.getItem(RECEIPT_EMAIL_KEY);
  } catch {
    return null;
  }
}
