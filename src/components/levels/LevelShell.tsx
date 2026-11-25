import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QUEST_LEVELS } from '../../data/levels';
import { useGame } from '../../state/GameContext';
import { LEVEL_ORDER, allLevelsComplete } from '../../state/gameLogic';
import { navigate, paths } from '../../state/router';
import { missingIn } from '../../state/validation';
import type { QuestLevelId } from '../../types';
import { cx, prefersReducedMotion } from '../../utils';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { Portal } from '../ui/Portal';

interface LevelShellProps {
  level: QuestLevelId;
  heading: ReactNode;
  subheading?: ReactNode;
  children: ReactNode;
}

const BURST_MS = 1500;
const BURST_REDUCED_MS = 700;

export function LevelShell({ level, heading, subheading, children }: LevelShellProps) {
  const { state, dispatch } = useGame();
  const [celebrating, setCelebrating] = useState(false);
  const timer = useRef<number>();
  const meta = QUEST_LEVELS.find((l) => l.id === level)!;
  const idx = LEVEL_ORDER.indexOf(level);
  const alreadyDone = state.completedLevels.includes(level);
  const editing = allLevelsComplete(state);
  const missing = missingIn(level, state.profile);
  const canContinue = missing.length === 0;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const finish = () => {
    dispatch({ type: 'COMPLETE_LEVEL', level });
    const isLast = idx === LEVEL_ORDER.length - 1;
    navigate(editing || isLast ? paths.review : paths.level(LEVEL_ORDER[idx + 1]));
  };

  const complete = () => {
    if (!canContinue || celebrating) return;
    if (alreadyDone) {
      finish();
      return;
    }
    setCelebrating(true);
    timer.current = window.setTimeout(finish, prefersReducedMotion() ? BURST_REDUCED_MS : BURST_MS);
  };

  const back = () => navigate(idx === 0 ? paths.home : paths.level(LEVEL_ORDER[idx - 1]));

  const label = editing ? 'Save and review' : idx === LEVEL_ORDER.length - 1 ? 'Review answers' : 'Complete level';

  return (
    <div className="level">
      <header className="level__header">
        <div className="level__steps" role="img" aria-label={`Level ${meta.number} of ${QUEST_LEVELS.length}`}>
          {QUEST_LEVELS.map((l, i) => (
            <span key={l.id} className={cx('level__step', state.completedLevels.includes(l.id) && 'is-done', i === idx && 'is-current')} />
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

      <div className="level__footer">
        <Button variant="ghost" onClick={back} icon="←">
          Back
        </Button>
        <div className="level__footer-right">
          <span className="level__hint" role="status">
            {!canContinue && `Still needed: ${missing.join(', ')}`}
          </span>
          <Button size="lg" onClick={complete} disabled={!canContinue} pulse={canContinue && !alreadyDone}>
            {label} <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>

      {celebrating && (
        <Portal>
          <div className="burst" role="status">
            <Confetti count={60} burstKey={level} />
            <div className="burst__card">
              <div className="burst__icon" aria-hidden="true">
                {meta.icon}
              </div>
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
