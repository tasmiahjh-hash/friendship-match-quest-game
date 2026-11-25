import { PLAYER_TITLES, XP_PER_LEVEL } from '../data/levels';

export { isValidEmail, normaliseEmail } from './email';

export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** RFC 4122 v4 id. Used as an unguessable idempotency key, so it must be cryptographically random. */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // randomUUID is missing in older browsers and non-secure contexts.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Non-cryptographic fingerprint, only used to notice that answers changed between attempts. */
export function fingerprint(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${h.toString(36)}-${text.length}`;
}

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

export function normaliseInstagram(handle: string) {
  const trimmed = handle.trim().replace(/^@+/, '');
  return trimmed ? `@${trimmed}` : '';
}

/** Instagram handles: letters, digits, dots and underscores, 30 characters at most. Empty is fine. */
export const isValidInstagram = (handle: string) => handle.trim() === '' || /^@?[A-Za-z0-9._]{1,30}$/.test(handle.trim());

export const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
