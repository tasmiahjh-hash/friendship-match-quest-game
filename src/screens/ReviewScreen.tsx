import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '../components/layout/Link';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Honeypot } from '../components/ui/Honeypot';
import { config } from '../config';
import { PLAYER_AVATAR_GRADIENT } from '../data/avatars';
import { campusById, yearLabel } from '../data/campus';
import { CAMPUS_MATCH_PREFERENCES, MEET_PREFERENCES, availabilityById, hangoutById } from '../data/hangouts';
import { interestById } from '../data/interests';
import { QUEST_LEVELS } from '../data/levels';
import { STYLE_QUESTIONS } from '../data/styleQuestions';
import { saveReceiptEmail } from '../services/storage';
import { getSubmissionAdapter, submissionsConfigured, toSubmissionError, useSubmissionsOpen, type SubmissionError } from '../services/submission';
import { buildRegistration } from '../services/submission/buildRegistration';
import { useGame } from '../state/GameContext';
import { navigate, paths } from '../state/router';
import { incompleteLevels, missingIn } from '../state/validation';
import type { QuestLevelId } from '../types';
import { fingerprint, uuid } from '../utils';

function ReviewCard({ level, children }: { level: QuestLevelId; children: ReactNode }) {
  const { state } = useGame();
  const meta = QUEST_LEVELS.find((l) => l.id === level)!;
  const missing = missingIn(level, state.profile);
  return (
    <section className="review-card panel" aria-labelledby={`review-${level}`}>
      <div className="review-card__head">
        <h2 className="review-card__title" id={`review-${level}`}>
          <span aria-hidden="true">{meta.icon}</span> {meta.title}
        </h2>
        <Link to={paths.level(level)} className="btn btn--secondary btn--sm" aria-label={`Edit ${meta.title}`}>
          Edit
        </Link>
      </div>
      <dl className="review-list">{children}</dl>
      {missing.length > 0 && <p className="field__hint field__hint--warn">Still needed: {missing.join(', ')}</p>}
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="review-list__row">
      <dt>{label}</dt>
      <dd>{children || <span className="muted">Not answered</span>}</dd>
    </div>
  );
}

const Tags = ({ items }: { items: (string | undefined)[] }) => (
  <span className="review-tags">
    {items.filter(Boolean).map((t) => (
      <span key={t} className="tag">
        {t}
      </span>
    ))}
  </span>
);

export function ReviewScreen() {
  const { state, dispatch } = useGame();
  const { profile } = state;
  const { contact, campus } = profile;
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SubmissionError | null>(null);
  const inFlight = useRef(false); // state updates are async; this blocks a fast double click
  const alive = useRef(true);
  const errorBox = useRef<HTMLDivElement>(null);

  const open = useSubmissionsOpen();
  // While the backend is closed the button still works: the server decides, so
  // administrators can run controlled tests on the real site.
  const canTry = submissionsConfigured();
  const blockers = incompleteLevels(profile);
  const ready = canTry && consent && blockers.length === 0;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Closing the tab mid-save could leave the student unsure whether it worked.
  useEffect(() => {
    if (!submitting) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [submitting]);

  useEffect(() => {
    if (error) errorBox.current?.focus();
  }, [error]);

  const submit = async () => {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);

    const answers = buildRegistration(profile, consent, trap);
    // Same answers reuse the same key, so retrying after a lost reply can't register twice.
    // Changed answers get a new key, because they are a different submission.
    const print = fingerprint(JSON.stringify({ ...answers, trap: '' }));
    const attempt = state.attempt?.fingerprint === print ? state.attempt : { key: uuid(), fingerprint: print };
    if (attempt !== state.attempt) dispatch({ type: 'SET_ATTEMPT', attempt });

    try {
      const receipt = await getSubmissionAdapter().submitRegistration({ ...answers, submissionKey: attempt.key });
      saveReceiptEmail(answers.email);
      dispatch({ type: 'REGISTERED', receipt });
      if (alive.current) navigate(paths.complete, { replace: true });
    } catch (e) {
      const err = toSubmissionError(e);
      if (err.code === 'CONFLICT') dispatch({ type: 'SET_ATTEMPT', attempt: null });
      if (alive.current) setError(err);
    } finally {
      inFlight.current = false;
      if (alive.current) setSubmitting(false);
    }
  };

  const pref = MEET_PREFERENCES.find((p) => p.id === profile.meetPreference);
  const campusPref = CAMPUS_MATCH_PREFERENCES.find((p) => p.id === profile.campusMatch);

  return (
    <div className="level review">
      <header className="level__header">
        <div className="level__eyebrow">
          <span className="level__badge">
            <span aria-hidden="true">🏁</span> Final check
          </span>
          <span className="muted">All {QUEST_LEVELS.length} levels cleared</span>
        </div>
        <h1 className="level__title">
          Review your <span className="text-gradient">quest answers</span>
        </h1>
        <p className="level__sub">Nothing has been sent yet. Check everything looks right, then submit to join the matching pool.</p>
      </header>

      <div className="review__grid">
        <ReviewCard level="contact">
          <Item label="Player">
            <span className="review-player">
              <Avatar emoji={contact.avatar} gradient={PLAYER_AVATAR_GRADIENT} size={34} /> {contact.firstName.trim()}
            </span>
          </Item>
          <Item label="Email">{contact.email.trim()}</Item>
          <Item label="Instagram">{contact.instagram}</Item>
          <Item label="U of A student">{contact.isStudent && 'Confirmed by you'}</Item>
          <Item label="Community guidelines">{contact.agreedToGuidelines && 'Agreed'}</Item>
        </ReviewCard>

        <ReviewCard level="campus">
          <Item label="Campus">{campusById(campus.campusId)?.name}</Item>
          <Item label="Program">{campus.program.trim()}</Item>
          <Item label="Year">{campus.year && yearLabel(campus.year)}</Item>
          <Item label="Courses">{campus.courses.length > 0 && <Tags items={campus.courses} />}</Item>
        </ReviewCard>

        <ReviewCard level="style">
          {STYLE_QUESTIONS.map((q) => {
            const o = q.options.find((x) => x.id === profile.styleAnswers[q.id]);
            return (
              <Item key={q.id} label={q.prompt}>
                {o && `${o.emoji} ${o.label}`}
              </Item>
            );
          })}
        </ReviewCard>

        <ReviewCard level="vibe">
          <Item label="Interests">
            {profile.interests.length > 0 && (
              <Tags
                items={profile.interests.map((i) => {
                  const it = interestById(i);
                  return it && `${it.emoji} ${it.label}`;
                })}
              />
            )}
          </Item>
        </ReviewCard>

        <ReviewCard level="meet">
          <Item label="Comfort zone">{pref && `${pref.emoji} ${pref.title}`}</Item>
          <Item label="Match me with">{campusPref && `${campusPref.emoji} ${campusPref.title}`}</Item>
          <Item label="Activities">
            {profile.hangoutIds.length > 0 && <Tags items={profile.hangoutIds.map((h) => hangoutById(h)?.name)} />}
          </Item>
          <Item label="Usually free">
            {profile.availability.length > 0 && <Tags items={profile.availability.map((a) => availabilityById(a)?.label)} />}
          </Item>
        </ReviewCard>
      </div>

      <section className="consent panel" aria-labelledby="consent-title">
        <h2 className="consent__title" id="consent-title">
          <span aria-hidden="true">🔒</span> Before you submit
        </h2>
        <ul className="consent__list">
          <li>
            <strong>What we collect:</strong> the answers shown above, including your first name, email, campus, program, year and quest
            choices.
          </li>
          <li>
            <strong>Why:</strong> Friends Across Campus (FAC) uses them for friendship matching and related communication.
          </li>
          <li>
            <strong>Who sees them:</strong> matching is currently performed or reviewed by authorized FAC administrators.
          </li>
          <li>
            <strong>Where they’re kept:</strong> in a private Google Sheets spreadsheet during this initial release.
          </li>
          <li>
            <strong>Your email:</strong> used to communicate with you about your registration and potential match.
          </li>
          <li>
            <strong>Sharing:</strong> your personal contact information won’t be shared with another participant without appropriate consent.
          </li>
        </ul>
        <Checkbox checked={consent} onChange={setConsent} disabled={submitting}>
          I have read the above and consent to Friends Across Campus collecting and using my information for friendship matching, as described
          in the Privacy Policy. (Required)
        </Checkbox>
        <p className="consent__links">
          <Link to={paths.privacy} className="link" target="_blank" rel="noopener">
            Read the full Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
          </Link>
          {config.privacyEmail && (
            <span className="muted">
              {' '}
              · Questions? <a href={`mailto:${config.privacyEmail}`}>{config.privacyEmail}</a>
            </span>
          )}
        </p>
        <Honeypot value={trap} onChange={setTrap} />
      </section>

      {!open && (
        <div className="pill-note pill-note--gold" role="status">
          <span className="pill-note__icon" aria-hidden="true">
            🚧
          </span>
          <span>
            <strong>Registration isn’t open yet,</strong> so your answers can’t be accepted. They stay on this device and will still be here
            when you come back in this browser.
          </span>
        </div>
      )}

      {error && (
        <div className="alert" role="alert" tabIndex={-1} ref={errorBox}>
          <span className="alert__icon" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <strong>Your registration wasn’t confirmed.</strong>
            <p>{error.message}</p>
            <p className="alert__note">Your answers are safe on this device.</p>
          </div>
        </div>
      )}

      <div className="level__footer">
        <Button variant="ghost" onClick={() => navigate(paths.level('meet'))} icon="←" disabled={submitting}>
          Back
        </Button>
        <div className="level__footer-right">
          <span className="level__hint" role="status">
            {submitting
              ? 'Saving… this can take a few seconds'
              : blockers.length > 0
                ? `Finish: ${blockers.map((b) => QUEST_LEVELS.find((l) => l.id === b)?.title).join(', ')}`
                : canTry && !consent && 'Tick the consent box to submit'}
          </span>
          <Button size="lg" onClick={submit} disabled={!ready || submitting} aria-busy={submitting} pulse={ready && !submitting}>
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" /> Submitting…
              </>
            ) : error ? (
              'Try again'
            ) : (
              'Submit registration'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
