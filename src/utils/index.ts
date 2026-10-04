import { PLAYER_TITLES, XP_PER_LEVEL } from '../data/levels';

export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function playerLevel(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const intoLevel = xp % XP_PER_LEVEL;
  return {
    level,
    title: PLAYER_TITLES[Math.min(level - 1, PLAYER_TITLES.length - 1)],
    intoLevel,
    needed: XP_PER_LEVEL,
    progress: intoLevel / XP_PER_LEVEL,
  };
}

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/** Basic shape check. Real verification (a one-time code to the inbox) belongs on the server. */
export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isUniversityEmail(email: string, allowedDomains: string[]) {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  if (!domain) return false;
  return (
    allowedDomains.some((d) => domain === d || domain.endsWith(`.${d}`)) ||
    /\.(edu|ac\.[a-z]{2}|edu\.[a-z]{2})$/.test(domain)
  );
}

export function normaliseInstagram(handle: string) {
  const trimmed = handle.trim().replace(/^@+/, '');
  return trimmed ? `@${trimmed}` : '';
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
