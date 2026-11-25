import { useEffect, useState } from 'react';
import { config } from '../../config';
import { createGoogleSheetsAdapter } from './googleSheetsAdapter';
import { SubmissionError, type SubmissionAdapter } from './types';

export * from './types';

const unavailableAdapter: SubmissionAdapter = {
  isAccepting: () => Promise.resolve(false),
  submitRegistration: () => Promise.reject(new SubmissionError('NOT_CONFIGURED')),
  submitFeedback: () => Promise.reject(new SubmissionError('NOT_CONFIGURED')),
};

export const submissionsConfigured = () => config.submissionEndpoint !== null;

/** The single place that decides where submissions go. Swap in a Supabase adapter here later. */
export const getSubmissionAdapter = (): SubmissionAdapter =>
  config.submissionEndpoint ? createGoogleSheetsAdapter(config.submissionEndpoint) : unavailableAdapter;

/**
 * False when submissions are known to be closed: no endpoint, or the backend says so.
 * The backend enforces this itself; the site only uses it to avoid surprising anyone.
 */
export function useSubmissionsOpen(): boolean {
  const configured = submissionsConfigured();
  const [accepting, setAccepting] = useState<boolean | null>(null);
  useEffect(() => {
    if (!configured) return;
    let current = true;
    void getSubmissionAdapter()
      .isAccepting()
      .then((a) => current && setAccepting(a));
    return () => {
      current = false;
    };
  }, [configured]);
  return configured && accepting !== false;
}
