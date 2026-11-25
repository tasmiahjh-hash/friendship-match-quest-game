import { useEffect, useId, useRef, useState } from 'react';
import { FEEDBACK_CATEGORIES, FEEDBACK_MAX, FEEDBACK_MIN } from '../../data/feedback';
import {
  SCHEMA_VERSION,
  getSubmissionAdapter,
  submissionsConfigured,
  toSubmissionError,
  useSubmissionsOpen,
  type SubmissionError,
} from '../../services/submission';
import { cx, fingerprint, isValidEmail, normaliseEmail, uuid } from '../../utils';
import { EMAIL_MAX } from '../../utils/email';
import { Button } from '../ui/Button';
import { Honeypot } from '../ui/Honeypot';

export function FeedbackForm() {
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [text, setText] = useState('');
  const [trap, setTrap] = useState('');
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<SubmissionError | null>(null);
  const attempt = useRef<{ key: string; print: string } | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const resultBox = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === 'sent' || error) resultBox.current?.focus();
  }, [status, error]);

  const open = useSubmissionsOpen();
  const canTry = submissionsConfigured();
  const suggestion = text.trim();
  const emailBad = email.trim() !== '' && !isValidEmail(email);
  const textBad = suggestion.length < FEEDBACK_MIN;
  const sending = status === 'sending';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canTry || emailBad || textBad || inFlight.current) return;
    inFlight.current = true;
    setStatus('sending');
    setError(null);

    const body = { schemaVersion: SCHEMA_VERSION, email: normaliseEmail(email), category, suggestion };
    const print = fingerprint(JSON.stringify(body));
    if (attempt.current?.print !== print) attempt.current = { key: uuid(), print };

    try {
      await getSubmissionAdapter().submitFeedback({ ...body, submissionKey: attempt.current.key, trap });
      if (!alive.current) return;
      attempt.current = null;
      setText('');
      setCategory('');
      setEmail('');
      setTouched(false);
      setStatus('sent');
    } catch (err) {
      if (!alive.current) return;
      setError(toSubmissionError(err));
      setStatus('idle');
    } finally {
      inFlight.current = false;
    }
  };

  if (status === 'sent') {
    return (
      <div className="feedback-done panel" role="status" tabIndex={-1} ref={resultBox}>
        <div className="feedback-done__emoji" aria-hidden="true">
          💌
        </div>
        <h2>Feedback received</h2>
        <p>
          Thank you for helping us improve Friendship Quest! Your feedback helps us create a better experience for University of Alberta
          students.
        </p>
        <Button variant="secondary" onClick={() => setStatus('idle')}>
          Send another idea
        </Button>
      </div>
    );
  }

  return (
    <form className="feedback-form panel" onSubmit={submit} noValidate>
      {!open && (
        <div className="pill-note pill-note--gold" role="note">
          <span className="pill-note__icon" aria-hidden="true">
            🚧
          </span>
          <span>
            <strong>The suggestion box isn’t open yet.</strong> Please check back soon.
          </span>
        </div>
      )}

      <div className="field">
        <label className="field__label" htmlFor={`${id}-text`}>
          Your suggestion
        </label>
        <textarea
          id={`${id}-text`}
          className={cx('input', touched && textBad && 'input--invalid')}
          rows={6}
          value={text}
          maxLength={FEEDBACK_MAX}
          required
          disabled={sending}
          placeholder="What would make Friendship Quest better?"
          aria-invalid={touched && textBad}
          aria-describedby={`${id}-text-hint ${id}-text-error`}
          onChange={(e) => setText(e.target.value)}
        />
        <span className="field__hint field__hint--warn" id={`${id}-text-error`} role="status">
          {touched && textBad && `Please write at least ${FEEDBACK_MIN} characters.`}
        </span>
        <span className="field__hint field__hint--row" id={`${id}-text-hint`}>
          <span>Please leave out sensitive personal details.</span>
          <span>
            {text.length}/{FEEDBACK_MAX}
          </span>
        </span>
      </div>

      <div className="feedback-form__row">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-cat`}>
            Category <span className="field__optional">optional</span>
          </label>
          <select id={`${id}-cat`} className="input" value={category} disabled={sending} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Choose a category</option>
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-email`}>
            Email <span className="field__optional">optional</span>
          </label>
          <input
            id={`${id}-email`}
            className={cx('input', touched && emailBad && 'input--invalid')}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={EMAIL_MAX}
            value={email}
            disabled={sending}
            placeholder="Leave empty to stay anonymous"
            aria-invalid={touched && emailBad}
            aria-describedby={`${id}-email-hint`}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setTouched(true)}
          />
          <span className={cx('field__hint', touched && emailBad && 'field__hint--warn')} id={`${id}-email-hint`} role="status">
            {touched && emailBad ? 'Check the email address, or leave it empty.' : 'Only used if we need to follow up on your suggestion.'}
          </span>
        </div>
      </div>

      <Honeypot value={trap} onChange={setTrap} />

      {error && (
        <div className="alert" role="alert" tabIndex={-1} ref={resultBox}>
          <span className="alert__icon" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <strong>Your feedback wasn’t sent.</strong>
            <p>{error.message}</p>
            <p className="alert__note">What you wrote is still here.</p>
          </div>
        </div>
      )}

      <div className="feedback-form__actions">
        <Button type="submit" size="lg" disabled={!canTry || sending} aria-busy={sending}>
          {sending ? (
            <>
              <span className="spinner" aria-hidden="true" /> Sending…
            </>
          ) : error ? (
            'Try again'
          ) : (
            'Submit Feedback'
          )}
        </Button>
      </div>
    </form>
  );
}
