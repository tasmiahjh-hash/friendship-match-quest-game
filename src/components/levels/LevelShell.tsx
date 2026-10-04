import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QUEST_LEVELS } from '../../data/levels';
import { useGame } from '../../state/GameContext';
import { LEVEL_ORDER } from '../../state/gameLogic';
import type { QuestLevelId } from '../../types';
import { cx } from '../../utils';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { Portal } from '../ui/Portal';

interface LevelShellProps {
  level: QuestLevelId;
  heading: ReactNode;
  subheading?: ReactNode;
  canContinue: boolean;
  hint?: string;
  continueLabel?: string;
  /** Hide the footer (e.g. while a sub-step is in progress). */
  hideFooter?: boolean;
  children: ReactNode;
}

const BURST_MS = 1500;

export function LevelShell({ level, heading, subheading, canContinue, hint, continueLabel, hideFooter, children }: LevelShellProps) {
  const { state, dispatch } = useGame();
  const [celebrating, setCelebrating] = useState(false);
  const timer = useRef<number>();
  const meta = QUEST_LEVELS.find((l) => l.id === level)!;
  const idx = LEVEL_ORDER.indexOf(level);
  const alreadyDone = state.completedLevels.includes(level);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [level]);

  const complete = () => {
    if (!canContinue || celebrating) return;
    if (alreadyDone) {
      dispatch({ type: 'COMPLETE_LEVEL', level });
      return;
    }
    setCelebrating(true);
    timer.current = window.setTimeout(() => {
      dispatch({ type: 'COMPLETE_LEVEL', level });
    }, BURST_MS);
  };

  const back = () => dispatch({ type: 'GO', screen: idx === 0 ? 'welcome' : LEVEL_ORDER[idx - 1] });

  return (
    <div className="level">
      <header className="level__header">
        <div className="level__steps" aria-label={`Level ${meta.number} of ${QUEST_LEVELS.length}`}>
          {QUEST_LEVELS.map((l, i) => (
            <span
              key={l.id}
              className={cx(
                'level__step',
                state.completedLevels.includes(l.id) && 'is-done',
                i === idx && 'is-current',
              )}
            />
          ))}
        </div>
        <div className="level__eyebrow">
          <span className="level__badge">
            <span aria-hidden="true">{meta.icon}</span> Level {meta.number}
          </span>
          <span className="muted">{meta.title}</span>
          <span className="level__xp-pill">+{meta.xp} XP</span>
        </div>
        <h1 className="level__title">{heading}</h1>
        {subheading && <p className="level__sub">{subheading}</p>}
      </header>

      <div className="level__body">{children}</div>

      {!hideFooter && (
        <footer className="level__footer">
          <Button variant="ghost" onClick={back} icon="←">
            Back
          </Button>
          <div className="level__footer-right">
            {!canContinue && hint && <span className="level__hint">{hint}</span>}
            <Button size="lg" onClick={complete} disabled={!canContinue} pulse={canContinue && !alreadyDone}>
              {continueLabel ?? (idx === LEVEL_ORDER.length - 1 ? 'Complete quest' : 'Complete level')} →
            </Button>
          </div>
        </footer>
      )}

      {celebrating && (
        <Portal>
        <div className="burst" role="status">
          <Confetti count={60} burstKey={level} />
          <div className="burst__card">
            <div className="burst__icon">{meta.icon}</div>
            <div className="eyebrow">Level {meta.number} complete</div>
            <div className="burst__title">{meta.title}</div>
            <div className="burst__xp">+{meta.xp} XP</div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
