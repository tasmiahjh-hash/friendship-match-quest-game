import { useRef, useState } from 'react';
import { PLAYER_AVATAR_GRADIENT } from '../../data/avatars';
import { QUEST_LEVELS } from '../../data/levels';
import { ACHIEVEMENTS, STAGES } from '../../data/progression';
import { useGame } from '../../state/GameContext';
import { allLevelsComplete, stageIndex } from '../../state/gameLogic';
import { parseRoute, paths, useHash } from '../../state/router';
import { cx, playerLevel } from '../../utils';
import { Brand } from '../layout/SiteChrome';
import { Link } from '../layout/Link';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { GuidelinesModal } from '../ui/GuidelinesModal';
import { Modal } from '../ui/Modal';
import { Portal } from '../ui/Portal';
import { useDialog } from '../ui/useDialog';
import { XPBar } from '../ui/XPBar';

export function PlayerHud({ onNavigate }: { onNavigate?: () => void }) {
  const { state, stage, startOver } = useGame();
  const route = parseRoute(useHash());
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const lvl = playerLevel(state.xp);
  const name = state.profile.contact.firstName.trim() || 'New Player';
  const registered = Boolean(state.receipt);
  const levelsDone = allLevelsComplete(state);
  const currentStage = stageIndex(stage);

  return (
    <div className="hud">
      <Brand />

      <section className="hud__player panel" aria-label="Player">
        <div className="hud__player-row">
          <Avatar emoji={state.profile.contact.avatar} gradient={PLAYER_AVATAR_GRADIENT} size={54} ring />
          <div className="hud__player-meta">
            <div className="hud__name">{name}</div>
            <div className="hud__title">
              <span className="hud__lvl">Lv {lvl.level}</span> {lvl.title}
            </div>
          </div>
        </div>
        <XPBar progress={lvl.progress} />
        <div className="hud__xp-row">
          <span>
            <strong className="hud__xp-total">{state.xp}</strong> XP
          </span>
          <span className="muted">
            {lvl.needed - lvl.intoLevel} to Lv {lvl.level + 1}
          </span>
        </div>
      </section>

      {!registered && (
        <section className="hud__section">
          <h2 className="hud__heading">Quest map</h2>
          <ol className="questmap">
            {QUEST_LEVELS.map((l, i) => {
              const done = state.completedLevels.includes(l.id);
              const current = route.name === 'level' && route.level === l.id;
              const reachable = QUEST_LEVELS.slice(0, i).every((x) => state.completedLevels.includes(x.id));
              const body = (
                <>
                  <span className="questmap__dot" aria-hidden="true">
                    {done ? '✓' : l.number}
                  </span>
                  <span className="questmap__label">
                    {l.title}
                    {done && <span className="sr-only"> (completed)</span>}
                  </span>
                  <span className="questmap__xp">+{l.xp}</span>
                </>
              );
              const className = cx('questmap__item', done && 'is-done', current && 'is-current');
              return (
                <li key={l.id}>
                  {reachable ? (
                    <Link to={paths.level(l.id)} className={className} aria-current={current ? 'step' : undefined} onClick={onNavigate}>
                      {body}
                    </Link>
                  ) : (
                    <span className={className}>{body}</span>
                  )}
                </li>
              );
            })}
            <li>
              {levelsDone ? (
                <Link
                  to={paths.review}
                  className={cx('questmap__item', route.name === 'review' && 'is-current')}
                  aria-current={route.name === 'review' ? 'step' : undefined}
                  onClick={onNavigate}
                >
                  <span className="questmap__dot" aria-hidden="true">
                    ★
                  </span>
                  <span className="questmap__label">Review &amp; submit</span>
                </Link>
              ) : (
                <span className="questmap__item">
                  <span className="questmap__dot" aria-hidden="true">
                    ★
                  </span>
                  <span className="questmap__label">Review &amp; submit</span>
                </span>
              )}
            </li>
          </ol>
        </section>
      )}

      <section className="hud__section">
        <h2 className="hud__heading">Friendship journey</h2>
        <ol className="journey">
          {STAGES.map((s, i) => (
            <li
              key={s.id}
              className={cx('journey__item', i < currentStage && 'is-done', i === currentStage && 'is-current')}
              aria-current={i === currentStage ? 'step' : undefined}
            >
              <span className="journey__dot" aria-hidden="true">
                {i <= currentStage ? s.emoji : ''}
              </span>
              <span className="journey__label">{s.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="hud__section">
        <h2 className="hud__heading">
          Badges{' '}
          <span className="muted">
            {state.achievements.length}/{ACHIEVEMENTS.length}
          </span>
        </h2>
        <ul className="badges">
          {ACHIEVEMENTS.map((a) => {
            const earned = state.achievements.includes(a.id);
            return (
              <li
                key={a.id}
                className={cx('badge', earned && 'is-earned')}
                title={`${a.name}: ${a.description}${earned ? '' : ' (locked)'}`}
              >
                <span className="badge__emoji" aria-hidden="true">
                  {earned ? a.emoji : '🔒'}
                </span>
                <span className="badge__name">
                  {a.name}
                  <span className="sr-only">{earned ? ' (earned)' : ' (locked)'}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="hud__footer">
        <Button variant="ghost" size="sm" icon="🛡️" onClick={() => setGuidelinesOpen(true)}>
          Guidelines
        </Button>
        <Button variant="secondary" size="sm" icon="↺" onClick={() => setResetOpen(true)}>
          {registered ? 'Clear device' : 'Start over'}
        </Button>
      </div>

      <GuidelinesModal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={registered ? 'Clear this device?' : 'Start over?'}
        icon="↺"
        actions={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setResetOpen(false);
                onNavigate?.();
                startOver();
              }}
            >
              {registered ? 'Clear this device' : 'Clear my answers'}
            </Button>
          </>
        }
      >
        {registered ? (
          <p>
            This removes your progress, badges and reference ID from this device. It does <strong>not</strong> cancel your registration. To
            correct or delete what you submitted, see the Privacy Policy. Note your reference ID down first.
          </p>
        ) : (
          <p>This clears your answers, XP and badges from this device and returns to the home page. Nothing has been submitted yet.</p>
        )}
      </Modal>
    </div>
  );
}

function Drawer({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useDialog(ref, true, onClose);
  return (
    <Portal>
      <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <aside className="drawer" role="dialog" aria-modal="true" aria-label="Journey and badges" tabIndex={-1} ref={ref}>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
          <PlayerHud onNavigate={onClose} />
        </aside>
      </div>
    </Portal>
  );
}

export function MobileTopBar() {
  const { state } = useGame();
  const [open, setOpen] = useState(false);
  const lvl = playerLevel(state.xp);

  return (
    <>
      <header className="topbar">
        <Brand compact />
        <button
          type="button"
          className="topbar__status"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`Open journey and badges. Level ${lvl.level}, ${state.xp} XP`}
        >
          <span className="topbar__lvl">Lv {lvl.level}</span>
          <span className="topbar__xp" aria-hidden="true">
            <XPBar progress={lvl.progress} />
          </span>
          <span className="topbar__xp-num">{state.xp} XP</span>
          <span className="topbar__menu" aria-hidden="true">
            ☰
          </span>
        </button>
      </header>
      {open && <Drawer onClose={() => setOpen(false)} />}
    </>
  );
}
