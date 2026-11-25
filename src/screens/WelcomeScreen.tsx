import { Link } from '../components/layout/Link';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useSubmissionsOpen } from '../services/submission';
import { useGame } from '../state/GameContext';
import { navigate, paths, questEntry } from '../state/router';

const STEPS = [
  { emoji: '🎮', title: 'Play', body: 'A short interactive quest about your vibe, friendship style and campus life.' },
  { emoji: '📮', title: 'Register', body: 'Review your answers and send them to the Friends Across Campus team.' },
  { emoji: '🤝', title: 'Match', body: 'The team looks for a compatible University of Alberta student.' },
  { emoji: '✉️', title: 'Hear from us', body: 'We email you once a compatible student becomes available.' },
];

const TRUST = [
  { emoji: '🎓', label: 'For University of Alberta students' },
  { emoji: '🌟', label: 'All about friendship' },
  { emoji: '🔒', label: 'Contact info shared only with your consent' },
  { emoji: '🙋', label: 'Matches reviewed by FAC administrators' },
];

export function WelcomeScreen() {
  const { state } = useGame();
  const open = useSubmissionsOpen();
  const registered = Boolean(state.receipt);
  const inProgress = state.completedLevels.length > 0;

  const cta = registered
    ? 'View Your Registration'
    : inProgress
      ? 'Continue Your Friendship Quest'
      : open
        ? 'Start Your Friendship Quest'
        : 'Preview the Friendship Quest';

  return (
    <div className="welcome">
      <div className="welcome__hero">
        <div className="welcome__copy stagger">
          <div className="eyebrow">For University of Alberta students</div>
          <h1 className="welcome__title">
            Friendship <span className="text-gradient">Quest</span>
          </h1>
          <p className="welcome__quote">Making friends at university should be fun, not awkward.</p>
          <p className="welcome__lede">
            Complete a short interactive quest, tell us about your interests and personality, and we’ll help you connect with compatible
            University of Alberta students.
          </p>
          {!open && (
            <div className="pill-note pill-note--gold" role="note">
              <span className="pill-note__icon" aria-hidden="true">
                🚧
              </span>
              <span>
                <strong>Registration isn’t open yet.</strong> You can look around the quest, but nothing can be submitted for now.
              </span>
            </div>
          )}
          <div className="welcome__ctas">
            <Button size="lg" pulse onClick={() => navigate(questEntry(state))} icon="✨">
              {cta}
            </Button>
          </div>
          <p className="welcome__note">
            <span aria-hidden="true">✉️</span> Matches aren’t instant. We email you once a compatible student becomes available.
          </p>
        </div>

        <div className="welcome__art" role="img" aria-label="Illustration of an example friendship match: two animal avatars joined by a handshake">
          <div className="orb orb--1" />
          <div className="orb orb--2" />
          <div className="hero-card">
            <div className="hero-card__example">Example Friendship Match</div>
            <div className="hero-card__avatars">
              <Avatar emoji="🦊" gradient={['#ff8a6b', '#ffb36b']} size={84} ring />
              <div className="hero-card__spark">🤝</div>
              <Avatar emoji="🦢" gradient={['#a78bfa', '#ff7eb6']} size={84} ring />
            </div>
            <div className="hero-card__pct">
              87<span>%</span>
            </div>
            <div className="hero-card__label">friendship match</div>
            <div className="hero-card__chips">
              <span className="tag tag--mint">🏸 Badminton</span>
              <span className="tag tag--mint">☕ Cafés</span>
              <span className="tag tag--mint">🌸 Anime</span>
            </div>
            <div className="hero-card__event">🎲 Both enjoy games nights</div>
          </div>
          <div className="float-chip float-chip--xp">⭐ +100 XP</div>
          <div className="float-chip float-chip--badge">🏆 Quest Champion</div>
          <div className="float-chip float-chip--lock">🔒 Email private</div>
        </div>
      </div>

      <section aria-labelledby="steps-title">
        <h2 className="sr-only" id="steps-title">
          How it works
        </h2>
        <ol className="steps stagger">
          {STEPS.map((s, i) => (
            <li className="step panel" key={s.title}>
              <div className="step__num" aria-hidden="true">
                {i + 1}
              </div>
              <div className="step__emoji" aria-hidden="true">
                {s.emoji}
              </div>
              <h3 className="step__title">{s.title}</h3>
              <p className="step__body">{s.body}</p>
              {i < STEPS.length - 1 && (
                <span className="step__arrow" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <ul className="trust">
        {TRUST.map((t) => (
          <li key={t.label} className="trust__item">
            <span aria-hidden="true">{t.emoji}</span> {t.label}
          </li>
        ))}
      </ul>

      <section className="promo promo--feedback panel" aria-labelledby="improve-title">
        <div>
          <h2 className="promo__title" id="improve-title">
            <span aria-hidden="true">💡</span> Help Us Improve Friendship Quest
          </h2>
          <p className="promo__body">
            Friendship Quest is built for students, and we want to build it with you! Tell us what features you’d love to see, what could be
            improved, or anything that would make your experience better.
          </p>
        </div>
        <Link to={paths.feedback} className="btn btn--secondary">
          Share your ideas
        </Link>
      </section>

      <section className="promo promo--soon" aria-labelledby="speed-title">
        <div>
          <p className="promo__kicker">A separate feature, on the horizon</p>
          <h2 className="promo__title" id="speed-title">
            Speed Dating Match <span className="tag tag--lav promo__tag">Coming Soon</span>
          </h2>
          <p className="promo__body" id="speed-desc">
            A new way to meet someone special through fun, compatibility-based connections. Stay tuned!
          </p>
        </div>
        <button type="button" className="btn btn--disabled" disabled aria-describedby="speed-desc">
          Coming Soon
        </button>
      </section>
    </div>
  );
}
