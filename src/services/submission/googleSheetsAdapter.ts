import { SubmissionError, isSubmissionErrorCode, type FeedbackPayload, type RegistrationPayload, type SubmissionAdapter } from './types';

// Apps Script can take well over ten seconds on a cold start.
const TIMEOUT_MS = 45_000;

type Kind = 'registration' | 'feedback';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Talks to the Apps Script web app in integrations/google-sheets/Code.gs.
 *
 * Request format: Apps Script cannot answer CORS preflight (OPTIONS) requests, so
 * the JSON body is sent as text/plain with no custom headers and no credentials.
 * That keeps it a CORS "simple request". Apps Script then answers with a 302 to
 * script.googleusercontent.com, which allows any origin, so the browser follows it
 * and the JSON reply is fully readable. `no-cors` is deliberately never used: an
 * opaque response would tell us nothing about whether the save succeeded.
 */
export function createGoogleSheetsAdapter(
  endpoint: string,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
  timeoutMs = TIMEOUT_MS,
): SubmissionAdapter {
  async function post(kind: Kind, payload: RegistrationPayload | FeedbackPayload): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let body: unknown;
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ kind, payload }),
        signal: controller.signal,
      });
      if (!response.ok) throw new SubmissionError(response.status === 429 ? 'RATE_LIMITED' : 'SERVER');
      const text = await response.text();
      try {
        body = JSON.parse(text);
      } catch {
        throw new SubmissionError('BAD_RESPONSE');
      }
    } catch (e) {
      if (e instanceof SubmissionError) throw e;
      if (controller.signal.aborted) throw new SubmissionError('TIMEOUT');
      // Only used to word the message. onLine can be wrong, so it never blocks an attempt.
      throw new SubmissionError(typeof navigator !== 'undefined' && navigator.onLine === false ? 'OFFLINE' : 'NETWORK');
    } finally {
      clearTimeout(timer);
    }

    if (!isRecord(body)) throw new SubmissionError('BAD_RESPONSE');
    if (body.ok === false) {
      const error = isRecord(body.error) ? body.error : {};
      const fields = Array.isArray(error.fields) ? error.fields.filter((f): f is string => typeof f === 'string') : [];
      throw new SubmissionError(isSubmissionErrorCode(error.code) ? error.code : 'SERVER', fields);
    }
    // The echo proves this reply belongs to this request, not a cached or unrelated page.
    if (body.ok !== true || body.kind !== kind || body.submissionKey !== payload.submissionKey || !isRecord(body.data)) {
      throw new SubmissionError('BAD_RESPONSE');
    }
    return body.data;
  }

  return {
    async isAccepting() {
      try {
        const response = await fetchImpl(endpoint, { mode: 'cors', credentials: 'omit', redirect: 'follow', referrerPolicy: 'no-referrer' });
        const status: unknown = await response.json();
        return isRecord(status) && typeof status.accepting === 'boolean' ? status.accepting : null;
      } catch {
        return null;
      }
    },
    async submitRegistration(payload) {
      const { registrationId, submittedAt } = await post('registration', payload);
      if (typeof registrationId !== 'string' || !/^FQ-[0-9A-Z]{8}$/.test(registrationId)) throw new SubmissionError('BAD_RESPONSE');
      if (typeof submittedAt !== 'string' || Number.isNaN(Date.parse(submittedAt))) throw new SubmissionError('BAD_RESPONSE');
      return { registrationId, submittedAt };
    },
    async submitFeedback(payload) {
      const { suggestionId } = await post('feedback', payload);
      if (typeof suggestionId !== 'string' || !/^FB-[0-9A-Z]{8}$/.test(suggestionId)) throw new SubmissionError('BAD_RESPONSE');
      return { suggestionId };
    },
  };
}
