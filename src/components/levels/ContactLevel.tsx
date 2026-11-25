import { useId, useState } from 'react';
import { PLAYER_AVATARS, PLAYER_AVATAR_GRADIENT } from '../../data/avatars';
import { useGame } from '../../state/GameContext';
import { cx, isValidEmail, isValidInstagram, normaliseInstagram } from '../../utils';
import { EMAIL_MAX } from '../../utils/email';
import { Avatar } from '../ui/Avatar';
import { Checkbox } from '../ui/Checkbox';
import { GuidelinesModal } from '../ui/GuidelinesModal';
import { onRadioKeys, radioTabIndex } from '../ui/radioKeys';
import { LevelShell } from './LevelShell';

const AVATAR_NAMES: Record<string, string> = {
  '🦊': 'Fox',
  '🐼': 'Panda',
  '🦉': 'Owl',
  '🐸': 'Frog',
  '🐧': 'Penguin',
  '🦦': 'Otter',
  '🐨': 'Koala',
  '🦋': 'Butterfly',
};

export function ContactLevel() {
  const { state, dispatch } = useGame();
  const contact = state.profile.contact;
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [emailTouched, setEmailTouched] = useState(Boolean(contact.email));
  const [instaTouched, setInstaTouched] = useState(Boolean(contact.instagram));
  const id = useId();

  const update = (patch: Partial<typeof contact>) => dispatch({ type: 'UPDATE_CONTACT', patch });

  const nameOk = contact.firstName.trim().length >= 1;
  const emailOk = isValidEmail(contact.email);
  const emailBad = emailTouched && contact.email.trim() !== '' && !emailOk;
  const instaBad = instaTouched && !isValidInstagram(contact.instagram);

  return (
    <LevelShell
      level="contact"
      heading={
        <>
          Create your <span className="text-gradient">player card</span>
        </>
      }
      subheading="Every quest needs a hero. Tell us who you are and where we can email you when your match is ready."
    >
      <div className="contact-layout">
        <div className="contact-form">
          <section className="form-block">
            <h2 className="form-block__title" id={`${id}-avatar`}>
              Pick your avatar
            </h2>
            <div className="avatar-picker" role="radiogroup" aria-labelledby={`${id}-avatar`} onKeyDown={onRadioKeys}>
              {PLAYER_AVATARS.map((a, i) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={contact.avatar === a}
                  aria-label={AVATAR_NAMES[a]}
                  tabIndex={radioTabIndex(contact.avatar === a, true, i)}
                  className={cx('avatar-picker__opt', contact.avatar === a && 'is-on')}
                  onClick={() => update({ avatar: a })}
                >
                  <span aria-hidden="true">{a}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-name`}>
              First name
            </label>
            <input
              id={`${id}-name`}
              className={cx('input', nameOk && 'input--valid')}
              placeholder="What should your match call you?"
              value={contact.firstName}
              maxLength={30}
              required
              autoComplete="given-name"
              aria-describedby={`${id}-name-hint`}
              onChange={(e) => update({ firstName: e.target.value })}
            />
            <span className="field__hint" id={`${id}-name-hint`}>
              A first name or nickname is enough.
            </span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-email`}>
              Email address <span className="field__optional">🔒 private</span>
            </label>
            <input
              id={`${id}-email`}
              className={cx('input', emailTouched && contact.email && (emailOk ? 'input--valid' : 'input--invalid'))}
              type="email"
              inputMode="email"
              placeholder="you@ualberta.ca"
              value={contact.email}
              maxLength={EMAIL_MAX}
              required
              autoComplete="email"
              aria-invalid={emailBad}
              aria-describedby={`${id}-email-hint ${id}-email-error`}
              onChange={(e) => update({ email: e.target.value })}
              onBlur={() => {
                setEmailTouched(true);
                update({ email: contact.email.trim() });
              }}
            />
            <span className="field__hint field__hint--warn" id={`${id}-email-error`} role="status">
              {emailBad && 'That doesn’t look like a complete email address. Check for typos, like a missing @ or ending.'}
            </span>
            <span className="field__hint" id={`${id}-email-hint`}>
              We recommend using your University of Alberta email (@ualberta.ca), but any valid email address is welcome. We’ll use this
              address to notify you when your friendship match is ready.
            </span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${id}-insta`}>
              Instagram <span className="field__optional">optional · 🔒 private</span>
            </label>
            <input
              id={`${id}-insta`}
              className={cx('input', instaBad && 'input--invalid')}
              placeholder="@yourhandle"
              value={contact.instagram}
              maxLength={31}
              autoCapitalize="none"
              autoComplete="off"
              aria-invalid={instaBad}
              aria-describedby={`${id}-insta-hint`}
              onChange={(e) => update({ instagram: e.target.value })}
              onBlur={() => {
                setInstaTouched(true);
                update({ instagram: normaliseInstagram(contact.instagram) });
              }}
            />
            <span className={cx('field__hint', instaBad && 'field__hint--warn')} id={`${id}-insta-hint`} role="status">
              {instaBad
                ? 'Handles only use letters, numbers, dots and underscores.'
                : 'Only if you’d like it as a way to connect. It’s shared with a match only if you agree later.'}
            </span>
          </div>

          <Checkbox checked={contact.isStudent} onChange={(v) => update({ isStudent: v })}>
            I confirm that I am currently a University of Alberta student.
          </Checkbox>

          <div className="check-group">
            <Checkbox checked={contact.agreedToGuidelines} onChange={(v) => update({ agreedToGuidelines: v })}>
              I agree to the community guidelines: be kind, respect boundaries, keep first meetups public, and never pressure anyone to share
              contact info.
            </Checkbox>
            <button type="button" className="link" onClick={() => setGuidelinesOpen(true)}>
              Read the community guidelines
            </button>
          </div>
        </div>

        <aside className="privacy-card" aria-label="How your details are used">
          <div className="privacy-card__lock" aria-hidden="true">
            🔒
          </div>
          <h2>Your contact details aren’t shared automatically.</h2>
          <p>
            We won’t give your email or Instagram to another participant <strong>without your consent</strong>.
          </p>
          <div className="privacy-card__preview">
            <div className="eyebrow">Your player card</div>
            <div className="privacy-card__row">
              <Avatar emoji={contact.avatar} gradient={PLAYER_AVATAR_GRADIENT} size={44} />
              <div>
                <div className="privacy-card__name">{contact.firstName.trim() || 'Your first name'}</div>
                <div className="muted privacy-card__small">University of Alberta</div>
              </div>
            </div>
            <div className="privacy-card__hidden">
              <span>📧 Email</span>
              <span className="tag">Private</span>
            </div>
            <div className="privacy-card__hidden">
              <span>📸 Instagram</span>
              <span className="tag">Private</span>
            </div>
          </div>
          <ul className="privacy-card__list">
            <li>✓ No account or password needed</li>
            <li>✓ Nothing is sent until you submit at the end</li>
            <li>✓ You can review everything first</li>
          </ul>
        </aside>
      </div>

      <GuidelinesModal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} onAgree={() => update({ agreedToGuidelines: true })} />
    </LevelShell>
  );
}
