export const EMAIL_MAX = 254;

export const normaliseEmail = (email: string) => email.trim();

/**
 * Practical shape check for any provider. It does not prove the inbox exists or
 * who owns it. Mirrored by isValidEmail_ in integrations/google-sheets/Code.gs.
 */
export function isValidEmail(raw: string): boolean {
  const email = normaliseEmail(raw);
  if (!email || email.length > EMAIL_MAX) return false;
  const at = email.lastIndexOf('@');
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (at < 1 || local.length > 64) return false;
  if (!/^[^\s@<>()[\]\\,;:"]+$/.test(local) || /^\.|\.$|\.\./.test(local)) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain);
}
