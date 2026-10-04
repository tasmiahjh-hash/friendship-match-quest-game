import { INTERESTS, MAX_INTERESTS, MIN_INTERESTS } from '../../data/interests';
import { useGame } from '../../state/GameContext';
import { cx } from '../../utils';
import { LevelShell } from './LevelShell';

const FEEDBACK = ['Nice pick!', 'Ooh, good taste ✨', 'Same vibe incoming…', 'Your flock is forming 🐣', 'Love that', 'Great energy!'];

export function VibeLevel() {
  const { state, dispatch } = useGame();
  const selected = state.profile.interests;
  const remaining = Math.max(0, MIN_INTERESTS - selected.length);
  const atMax = selected.length >= MAX_INTERESTS;

  const meterLabel =
    selected.length === 0
      ? 'Tap the things you love'
      : remaining > 0
        ? FEEDBACK[(selected.length - 1) % FEEDBACK.length]
        : atMax
          ? 'Max vibes reached!'
          : 'Vibe locked in 🔥';

  return (
    <LevelShell
      level="vibe"
      heading={
        <>
          What’s your <span className="text-gradient">vibe</span>?
        </>
      }
      subheading={`Pick at least ${MIN_INTERESTS} things you’d happily do with a new friend. We’ll use them to find people on your wavelength.`}
      canContinue={remaining === 0}
      hint={`Pick ${remaining} more`}
    >
      <div className="vibe-meter panel">
        <div className="vibe-meter__count">
          <strong>{selected.length}</strong>
          <span>/ {MAX_INTERESTS}</span>
        </div>
        <div className="vibe-meter__track">
          {Array.from({ length: MAX_INTERESTS }, (_, i) => (
            <span key={i} className={cx('vibe-meter__pip', i < selected.length && 'is-on', i === MIN_INTERESTS - 1 && 'is-goal')} />
          ))}
        </div>
        <div className="vibe-meter__label" key={selected.length}>
          {meterLabel}
        </div>
      </div>

      <div className="interest-grid stagger">
        {INTERESTS.map((interest) => {
          const on = selected.includes(interest.id);
          const disabled = !on && atMax;
          return (
            <button
              key={interest.id}
              className={cx('interest', on && 'is-on')}
              style={{ '--hue': interest.hue } as React.CSSProperties}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => dispatch({ type: 'TOGGLE_INTEREST', id: interest.id, max: MAX_INTERESTS })}
            >
              <span className="interest__emoji" aria-hidden="true">
                {interest.emoji}
              </span>
              <span className="interest__label">{interest.label}</span>
              <span className="interest__check" aria-hidden="true">
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </LevelShell>
  );
}
