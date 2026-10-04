import { useState } from 'react';
import { UNIVERSITIES, universityById } from '../../data/campus';
import { PLAYER_AVATARS, PLAYER_AVATAR_GRADIENT } from '../../data/students';
import { useGame } from '../../state/GameContext';
import { cx, isUniversityEmail, isValidEmail, normaliseInstagram } from '../../utils';
import { Avatar } from '../ui/Avatar';
import { Checkbox } from '../ui/Checkbox';
import { GuidelinesModal } from '../ui/GuidelinesModal';
import { LevelShell } from './LevelShell';

export function ContactLevel() {
  const { state, dispatch } = useGame();
  const contact = state.profile.contact;
  const uni = universityById(state.profile.campus.universityId);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [emailTouched, setEmailTouched] = useState(Boolean(contact.email));

  const update = (patch: Partial<typeof contact>) => dispatch({ type: 'UPDATE_CONTACT', patch });

  const domains = uni ? [uni.emailDomain] : UNIVERSITIES.map((u) => u.emailDomain);
  const emailShapeOk = isValidEmail(contact.email);
  const emailOk = emailShapeOk && isUniversityEmail(contact.email, domains);
  const nameOk = contact.firstName.trim().length >= 1;

  const missing = [!nameOk && 'first name', !emailOk && 'university email', !contact.agreedToGuidelines && 'guidelines agreement'].filter(Boolean);

  let emailHint = `Use your university address${uni ? ` (e.g. name@${uni.emailDomain})` : ''}.`;
  let emailTone: 'ok' | 'warn' | undefined;
  if (emailTouched && contact.email) {
    if (emailOk) {
      emailHint = 'Looks like a university email ✓ In the full app we’d send a one-time code to verify it.';
      emailTone = 'ok';
    } else if (emailShapeOk) {
      emailHint = `That doesn’t look like a university address${uni ? `. Try @${uni.emailDomain}` : ''}.`;
      emailTone = 'warn';
    } else {
      emailHint = 'Check the email format.';
      emailTone = 'warn';
    }
  }

  return (
    <LevelShell
      level="contact"
      heading={
        <>
          Your <span className="text-gradient">player card</span>
        </>
      }
      subheading="Last level! This is how Friendship Quest knows you’re a real student at your university."
      canContinue={missing.length === 0}
      hint={missing.length ? `Add your ${missing.join(', ')}` : undefined}
      continueLabel="Complete quest"
    >
      <div className="contact-layout">
        <div className="contact-form">
          <section className="form-block">
            <h3 className="form-block__title">Pick your avatar</h3>
            <div className="avatar-picker" role="radiogroup" aria-label="Avatar">
              {PLAYER_AVATARS.map((a) => (
                <button
                  key={a}
                  role="radio"
                  aria-checked={contact.avatar === a}
                  className={cx('avatar-picker__opt', contact.avatar === a && 'is-on')}
                  onClick={() => update({ avatar: a })}
                >
                  {a}
                </button>
              ))}
            </div>
          </section>

          <label className="field">
            <span className="field__label">First name</span>
            <input
              className={cx('input', nameOk && 'input--valid')}
              placeholder="What should your match call you?"
              value={contact.firstName}
              maxLength={30}
              autoComplete="given-name"
              onChange={(e) => update({ firstName: e.target.value })}
            />
            <span className="field__hint">Only your first name is shown to matches.</span>
          </label>

          <label className="field">
            <span className="field__label">
              University email <span className="field__optional">🔒 private</span>
            </span>
            <input
              className={cx('input', emailTouched && contact.email && (emailOk ? 'input--valid' : 'input--invalid'))}
              type="email"
              placeholder={uni ? `you@${uni.emailDomain}` : 'you@university.edu'}
              value={contact.email}
              autoComplete="email"
              onChange={(e) => update({ email: e.target.value })}
              onBlur={() => setEmailTouched(true)}
            />
            <span className={cx('field__hint', emailTone && `field__hint--${emailTone}`)}>{emailHint}</span>
          </label>

          <label className="field">
            <span className="field__label">
              Instagram <span className="field__optional">optional · 🔒 private</span>
            </span>
            <input
              className="input"
              placeholder="@yourhandle"
              value={contact.instagram}
              maxLength={31}
              onChange={(e) => update({ instagram: e.target.value })}
              onBlur={() => update({ instagram: normaliseInstagram(contact.instagram) })}
            />
          </label>

          <Checkbox checked={contact.agreedToGuidelines} onChange={(v) => update({ agreedToGuidelines: v })}>
            I agree to the{' '}
            <button
              type="button"
              className="link"
              onClick={(e) => {
                e.preventDefault();
                setGuidelinesOpen(true);
              }}
            >
              community guidelines
            </button>
            : be kind, respect boundaries, keep first meetups public, and never pressure anyone to share contact info.
          </Checkbox>
        </div>

        <aside className="privacy-card">
          <div className="privacy-card__lock" aria-hidden="true">
            🔒
          </div>
          <h3>Your contact information stays private.</h3>
          <p>
            Your match will <strong>not</strong> see your email or Instagram unless you explicitly choose to share it later.
          </p>
          <div className="privacy-card__preview">
            <div className="eyebrow">What your match sees</div>
            <div className="privacy-card__row">
              <Avatar emoji={contact.avatar} gradient={PLAYER_AVATAR_GRADIENT} size={44} />
              <div>
                <div className="privacy-card__name">{contact.firstName.trim() || 'Your first name'}</div>
                <div className="muted privacy-card__small">
                  {state.profile.campus.program || 'Program'} · {uni?.short ?? 'Uni'}
                </div>
              </div>
            </div>
            <div className="privacy-card__hidden">
              <span>📧 Email</span>
              <span className="tag">Hidden</span>
            </div>
            <div className="privacy-card__hidden">
              <span>📸 Instagram</span>
              <span className="tag">Hidden</span>
            </div>
          </div>
          <ul className="privacy-card__list">
            <li>✓ University email = students only</li>
            <li>✓ Chat happens inside Friendship Quest</li>
            <li>✓ You control what you share, and when</li>
          </ul>
        </aside>
      </div>

      <GuidelinesModal
        open={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
        onAgree={() => update({ agreedToGuidelines: true })}
      />
    </LevelShell>
  );
}
