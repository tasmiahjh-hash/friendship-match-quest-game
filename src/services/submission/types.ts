import type { RegistrationReceipt } from '../../types';

export const SCHEMA_VERSION = 1;

/** The wire format for one registration. Ids only; the backend owns the labels. */
export interface RegistrationPayload {
  schemaVersion: number;
  submissionKey: string;
  universityId: string;
  campusId: string;
  firstName: string;
  email: string;
  avatar: string;
  instagram: string;
  program: string;
  year: string;
  courses: string[];
  styleAnswers: Record<string, string>;
  interests: string[];
  meetPreference: string;
  campusMatch: string;
  hangouts: string[];
  availability: string[];
  studentAttestation: boolean;
  guidelinesAccepted: boolean;
  consent: boolean;
  privacyPolicyVersion: string;
  /** Honeypot: real students never see or fill this. */
  trap: string;
}

export interface FeedbackPayload {
  schemaVersion: number;
  submissionKey: string;
  email: string;
  category: string;
  suggestion: string;
  trap: string;
}

export interface FeedbackReceipt {
  suggestionId: string;
}

/**
 * Where submissions go. The questionnaire only knows this interface, so Google
 * Sheets can be swapped for Supabase (or anything else) in ./index.ts alone.
 *
 * Contract: a promise resolves ONLY when the backend has confirmed the save.
 * Everything else rejects with a SubmissionError.
 */
export interface SubmissionAdapter {
  /** Whether the backend is open to the public right now; null when it can't say. Never rejects. */
  isAccepting(): Promise<boolean | null>;
  submitRegistration(payload: RegistrationPayload): Promise<RegistrationReceipt>;
  submitFeedback(payload: FeedbackPayload): Promise<FeedbackReceipt>;
}

export type SubmissionErrorCode =
  | 'NOT_CONFIGURED'
  | 'OFFLINE'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'BAD_RESPONSE'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'CLOSED'
  | 'CONFLICT'
  | 'REJECTED'
  | 'SERVER';

const MESSAGES: Record<SubmissionErrorCode, string> = {
  NOT_CONFIGURED: 'Submissions aren’t open yet, so nothing was sent.',
  OFFLINE: 'You seem to be offline. Reconnect and try again.',
  NETWORK: 'We couldn’t reach the server. Check your connection and try again.',
  TIMEOUT: 'The server took too long to reply. It’s safe to try again: you won’t be recorded twice.',
  BAD_RESPONSE: 'We couldn’t confirm that your submission was saved. It’s safe to try again.',
  VALIDATION: 'Something you entered wasn’t accepted. Please review it and try again.',
  RATE_LIMITED: 'There have been a lot of submissions in a short time. Please wait a while and try again.',
  BUSY: 'The server is busy right now. Please try again in a few seconds.',
  CLOSED: 'Submissions aren’t open right now, so nothing was saved. Please check back later.',
  CONFLICT: 'This submission was already received with different answers. Please try again.',
  REJECTED: 'Your submission couldn’t be accepted. If a browser extension fills in forms for you, turn it off and try again.',
  SERVER: 'Something went wrong on our side. Please try again in a moment.',
};

export const isSubmissionErrorCode = (v: unknown): v is SubmissionErrorCode =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(MESSAGES, v);

export class SubmissionError extends Error {
  constructor(
    readonly code: SubmissionErrorCode,
    /** Field names the backend rejected, when known. */
    readonly fields: string[] = [],
  ) {
    super(MESSAGES[code]);
    this.name = 'SubmissionError';
  }
}

export const toSubmissionError = (e: unknown) => (e instanceof SubmissionError ? e : new SubmissionError('SERVER'));
