import { useState } from 'react';
import { ICEBREAKERS } from '../data/chat';
import { interestById } from '../data/interests';
import { STAGES } from '../data/progression';
import { ChatThread } from '../components/room/ChatThread';
import { Composer } from '../components/room/Composer';
import { ContactSharingPanel } from '../components/room/ContactSharingPanel';
import { MeetupPanel } from '../components/room/MeetupPanel';
import { RoomHeader, type SafetyAction } from '../components/room/RoomHeader';
import { SafetyModals } from '../components/room/SafetyModals';
import { Button } from '../components/ui/Button';
import { useGame } from '../state/GameContext';
import { stageIndex } from '../state/gameLogic';
import { useMockPeer } from '../state/useMockPeer';
import { cx } from '../utils';

type Tab = 'chat' | 'plans';

export function MatchRoomScreen() {
  const { state, dispatch, stage, resetDemo } = useGame();
  const { typing, send } = useMockPeer();
  const [safetyAction, setSafetyAction] = useState<SafetyAction | null>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const match = state.match;

  if (!match) {
    return (
      <div className="complete">
        <p>You don’t have a match yet.</p>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'complete' })}>Find my match</Button>
      </div>
    );
  }

  const active = state.relationship === 'active';
  const name = match.student.firstName;
  const usedIcebreakers = state.messages.filter((m) => m.from === 'me' && ICEBREAKERS.includes(m.text)).map((m) => m.text);
  const current = stageIndex(stage);
  const plansNeedAttention = active && match.sharedEventIds.length > 0 && state.meetup.status === 'none';

  return (
    <div className="room" data-tab={tab}>
      <div className="room__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'chat'} className={cx('room__tab', tab === 'chat' && 'is-on')} onClick={() => setTab('chat')}>
          💬 Chat
        </button>
        <button role="tab" aria-selected={tab === 'plans'} className={cx('room__tab', tab === 'plans' && 'is-on')} onClick={() => setTab('plans')}>
          🎟️ Meetup & connect {plansNeedAttention && <span className="room__tab-dot" />}
        </button>
      </div>

      <section className="room__chat panel">
        <RoomHeader match={match} active={active} onAction={setSafetyAction} />
        <ChatThread
          messages={state.messages}
          match={match}
          playerAvatar={state.profile.contact.avatar}
          typing={typing}
        />
        {active ? (
          <Composer onSend={send} matchName={name} usedIcebreakers={usedIcebreakers} />
        ) : (
          <div className="ended">
            <div className="ended__icon">{state.relationship === 'blocked' ? '⛔' : '💔'}</div>
            <h3>{state.relationship === 'blocked' ? `You blocked ${name}` : `You unmatched with ${name}`}</h3>
            <p className="muted">
              {state.relationship === 'blocked'
                ? `${name} can’t message you or see anything you shared. They weren’t notified.`
                : 'This Match Room is closed. You’ll be eligible for a new match in the next round.'}
            </p>
            <div className="ended__actions">
              <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'RESTORE_MATCH' })}>
                Undo (demo only)
              </Button>
              <Button size="sm" onClick={resetDemo}>
                ↺ Replay demo
              </Button>
            </div>
          </div>
        )}
      </section>

      <aside className={cx('room__side', !active && 'room__side--ended')} aria-disabled={!active}>
        <section className="side-card side-progress">
          <div className="side-progress__head">
            <span className="eyebrow">Friendship stage</span>
            <span className="tag tag--mint">
              {STAGES[current].emoji} {STAGES[current].label}
            </span>
          </div>
          <div className="side-progress__track">
            {STAGES.slice(2).map((s) => {
              const i = stageIndex(s.id);
              return (
                <div key={s.id} className={cx('side-progress__step', i <= current && 'is-done', i === current && 'is-current')} title={s.label}>
                  <span>{s.emoji}</span>
                </div>
              );
            })}
          </div>
          <div className="side-progress__shared">
            {match.sharedInterests.map((id) => {
              const i = interestById(id);
              return (
                <span key={id} className="tag">
                  {i?.emoji} {i?.label}
                </span>
              );
            })}
          </div>
        </section>

        <MeetupPanel />
        <ContactSharingPanel />
      </aside>

      <SafetyModals action={safetyAction} onClose={() => setSafetyAction(null)} />
    </div>
  );
}
