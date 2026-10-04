import { Brand } from '../components/hud/PlayerHud';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useGame } from '../state/GameContext';
import { LEVEL_ORDER } from '../state/gameLogic';

const STEPS = [
  { emoji: '🎮', title: 'Play', body: 'A 3-minute quest about your vibe, style and campus life.' },
  { emoji: '💞', title: 'Match', body: 'We pair you with a compatible student at your university.' },
  { emoji: '💬', title: 'Chat', body: 'Get to know each other in a private, in-app Match Chat.' },
  { emoji: '🎃', title: 'Meet', body: 'If you both want to, meet at a supervised friendship event.' },
];

const TRUST = [
  { emoji: '🎓', label: 'University students only' },
  { emoji: '🔒', label: 'Contact info stays private' },
  { emoji: '🤝', label: 'Meetups need both to agree' },
  { emoji: '🛡️', label: 'Report, block & unmatch anytime' },
];

export function WelcomeScreen() {
  const { state, dispatch } = useGame();
  const nextLevel = LEVEL_ORDER.find((l) => !state.completedLevels.includes(l));
  const inProgress = state.completedLevels.length > 0 || state.match;

  const start = () => {
    if (state.match) dispatch({ type: 'GO', screen: 'room' });
    else dispatch({ type: 'GO', screen: nextLevel ?? 'complete' });
  };

  return (
    <div className="welcome">
      <header className="welcome__nav">
        <Brand />
        <span className="tag tag--lav">Prototype · v0.1</span>
      </header>

      <div className="welcome__hero">
        <div className="welcome__copy stagger">
          <div className="eyebrow">A friendship game for university students</div>
          <h1 className="welcome__title">
            Friendship <span className="text-gradient">Quest</span>
          </h1>
          <p className="welcome__quote">“Finding your people shouldn’t feel like filling out a form.”</p>
          <p className="welcome__lede">
            Play a short quest, get matched with a compatible student, chat safely inside the app, and, only if you both want to, meet at a
            supervised campus event.
          </p>
          <div className="welcome__ctas">
            <Button size="lg" pulse onClick={start} icon="✨">
              {inProgress ? 'Continue your quest' : 'Start Your Quest'}
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'LOAD_DEMO_PROFILE' })} title="Fills a sample profile and jumps to matching">
              ⚡ Presenter shortcut: skip to match
            </Button>
          </div>
        </div>

        <div className="welcome__art" aria-hidden="true">
          <div className="orb orb--1" />
          <div className="orb orb--2" />
          <div className="hero-card">
            <div className="hero-card__avatars">
              <Avatar emoji="🦊" gradient={['#ff8a6b', '#ffb36b']} size={84} ring />
              <div className="hero-card__spark">💞</div>
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
            <div className="hero-card__event">🎃 Both free for Halloween Social</div>
          </div>
          <div className="float-chip float-chip--xp">⭐ +100 XP</div>
          <div className="float-chip float-chip--badge">🌈 Same Vibe unlocked</div>
          <div className="float-chip float-chip--lock">🔒 Email hidden</div>
        </div>
      </div>

      <ol className="steps stagger">
        {STEPS.map((s, i) => (
          <li className="step panel" key={s.title}>
            <div className="step__num">{i + 1}</div>
            <div className="step__emoji">{s.emoji}</div>
            <div className="step__title">{s.title}</div>
            <p className="step__body">{s.body}</p>
            {i < STEPS.length - 1 && <span className="step__arrow">→</span>}
          </li>
        ))}
      </ol>

      <div className="trust">
        {TRUST.map((t) => (
          <span key={t.label} className="trust__item">
            <span aria-hidden="true">{t.emoji}</span> {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
