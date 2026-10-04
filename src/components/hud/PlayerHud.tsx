import { useState } from 'react';
import { QUEST_LEVELS } from '../../data/levels';
import { ACHIEVEMENTS, STAGES } from '../../data/progression';
import { PLAYER_AVATAR_GRADIENT } from '../../data/students';
import { useGame } from '../../state/GameContext';
import { stageIndex } from '../../state/gameLogic';
import { cx, playerLevel } from '../../utils';
import { Avatar } from '../ui/Avatar';
import { GuidelinesModal } from '../ui/GuidelinesModal';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { XPBar } from '../ui/XPBar';

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className={cx('brand', compact && 'brand--compact')}>
      <div className="brand__mark" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="brand__name">
        Friendship <span className="text-gradient">Quest</span>
      </div>
    </div>
  );
}

export function PlayerHud({ onNavigate }: { onNavigate?: () => void }) {
  const { state, stage, resetDemo } = useGame();
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const lvl = playerLevel(state.xp);
  const name = state.profile.contact.firstName.trim() || 'New Player';
  const questDone = state.completedLevels.length === QUEST_LEVELS.length;
  const currentStage = stageIndex(stage);

  return (
    <div className="hud">
      <Brand />

      <section className="hud__player panel">
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

      {!questDone && (
        <section className="hud__section">
          <h3 className="hud__heading">Quest map</h3>
          <ol className="questmap">
            {QUEST_LEVELS.map((l) => {
              const done = state.completedLevels.includes(l.id);
              const current = state.screen === l.id;
              return (
                <li key={l.id} className={cx('questmap__item', done && 'is-done', current && 'is-current')}>
                  <span className="questmap__dot">{done ? '✓' : l.number}</span>
                  <span className="questmap__label">{l.title}</span>
                  <span className="questmap__xp">+{l.xp}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="hud__section">
        <h3 className="hud__heading">Friendship journey</h3>
        <ol className="journey">
          {STAGES.map((s, i) => (
            <li
              key={s.id}
              className={cx('journey__item', i < currentStage && 'is-done', i === currentStage && 'is-current')}
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
        <h3 className="hud__heading">
          Badges <span className="muted">{state.achievements.length}/{ACHIEVEMENTS.length}</span>
        </h3>
        <div className="badges">
          {ACHIEVEMENTS.map((a) => {
            const earned = state.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={cx('badge', earned && 'is-earned')}
                title={`${a.name}: ${a.description}${earned ? '' : ' (locked)'}`}
              >
                <span className="badge__emoji" aria-hidden="true">
                  {earned ? a.emoji : '🔒'}
                </span>
                <span className="badge__name">{a.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="hud__footer">
        <Button variant="ghost" size="sm" icon="🛡️" onClick={() => setGuidelinesOpen(true)}>
          Guidelines
        </Button>
        <Button variant="secondary" size="sm" icon="↺" onClick={() => setResetOpen(true)}>
          Replay demo
        </Button>
      </div>

      <GuidelinesModal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} />
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Replay the demo?"
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
                resetDemo();
              }}
            >
              Start over
            </Button>
          </>
        }
      >
        <p>This clears your local prototype progress (profile, XP, badges, chat) and returns to the welcome screen.</p>
      </Modal>
    </div>
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
        <button className="topbar__status" onClick={() => setOpen(true)} aria-label="Open journey and badges">
          <span className="topbar__lvl">Lv {lvl.level}</span>
          <span className="topbar__xp">
            <XPBar progress={lvl.progress} />
          </span>
          <span className="topbar__xp-num">{state.xp} XP</span>
          <span className="topbar__menu" aria-hidden="true">
            ☰
          </span>
        </button>
      </header>
      {open && (
        <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <aside className="drawer" role="dialog" aria-label="Journey and badges">
            <button className="modal__close" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
            <PlayerHud onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
