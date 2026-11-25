// Everything here is compiled into the public bundle. Never put a secret in a VITE_* variable.
import { isValidEmail } from './utils/email';

const read = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Placeholder values from .env.example must count as "not configured". */
const isPlaceholder = (v: string) => /your[-_]|replace|@example\.|changeme|[<>]/i.test(v);

export function parseEndpoint(raw: unknown): string | null {
  const value = read(raw);
  if (!value || isPlaceholder(value)) return null;
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return url.protocol === 'https:' || (local && url.protocol === 'http:') ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseContact(raw: unknown): string | null {
  const value = read(raw);
  return value && !isPlaceholder(value) && isValidEmail(value) ? value : null;
}

const contactEmail = parseContact(import.meta.env.VITE_CONTACT_EMAIL);

export const config = {
  submissionEndpoint: parseEndpoint(import.meta.env.VITE_SUBMISSION_ENDPOINT),
  contactEmail,
  privacyEmail: parseContact(import.meta.env.VITE_PRIVACY_CONTACT_EMAIL) ?? contactEmail,
};

/**
 * Bump whenever the Privacy Policy or consent wording changes. The version is
 * stored with every registration as a record of what the student agreed to.
 */
export const PRIVACY_POLICY_VERSION = '2026-11-24';
