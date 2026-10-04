import { useState } from 'react';
import { eventById, formatEventDate } from '../../data/events';
import { useGame } from '../../state/GameContext';
import type { FriendshipEvent } from '../../types';
import { cx } from '../../utils';
import { Button } from '../ui/Button';

function downloadIcs(e: FriendshipEvent) {
  const [start] = e.time.split('–').map((s) => s.trim());
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(start);
  let hour = m ? Number(m[1]) : 19;
  const min = m ? m[2] : '00';
  if (/PM/i.test(e.time) && hour < 12) hour += 12;
  const stamp = `${e.date.replace(/-/g, '')}T${String(hour).padStart(2, '0')}${min}00`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Friendship Quest//Prototype//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@friendship-quest.local`,
    `DTSTART:${stamp}`,
    `SUMMARY:${e.name} (Friendship Quest)`,
    `LOCATION:${e.location}`,
    'DESCRIPTION:Check in with the Friendship Quest/FAC team at the event and they will help introduce you.',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MeetupPanel() {
  const { state, dispatch } = useGame();
  const match = state.match!;
  const name = match.student.firstName;
  const shared = match.sharedEventIds.map((id) => eventById(id)!).filter(Boolean);
  const [chosen, setChosen] = useState(shared[0]?.id ?? null);
  const active = state.relationship === 'active';
  const { status, eventId } = state.meetup;

  if (shared.length === 0) {
    return (
      <section className="side-card">
        <h3 className="side-card__title">🎟️ Meet IRL</h3>
        <p className="muted">
          You and {name} haven’t picked the same events yet. Keep chatting here. New FAC events are added every few weeks.
        </p>
      </section>
    );
  }

  const selected = eventById(status === 'none' ? chosen : eventId);
  if (!selected) return null;
  const d = formatEventDate(selected.date);

  return (
    <section className={cx('side-card meetup', status === 'unlocked' && 'meetup--unlocked')}>
      {status === 'unlocked' ? (
        <>
          <div className="meetup__unlocked-badge">🎉 Meetup unlocked!</div>
          <div className="meetup__event" style={{ '--g1': selected.gradient[0], '--g2': selected.gradient[1] } as React.CSSProperties}>
            <span className="meetup__emoji">{selected.emoji}</span>
            <div>
              <div className="meetup__event-name">{selected.name}</div>
              <div className="meetup__event-meta">
                {d.weekday} {d.day} {d.month} · {selected.time}
              </div>
              <div className="meetup__event-meta">📍 {selected.location}</div>
            </div>
          </div>
          <p className="meetup__quote">“Check in with the Friendship Quest/FAC team at the event and we’ll help introduce you.”</p>
          <ul className="meetup__tips">
            <li>🏛️ Public venue, with FAC staff on site the whole time</li>
            <li>👋 Look for the Friendship Quest check-in table</li>
            <li>🚪 You can leave whenever you like, no explanation needed</li>
          </ul>
          <div className="meetup__actions">
            <Button size="sm" variant="secondary" icon="📅" onClick={() => downloadIcs(selected)}>
              Add to calendar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'MEETUP_WITHDRAW' })}>
              Can’t make it anymore
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3 className="side-card__title">
            You are both available for {shared.length === 1 ? `${selected.name} ${selected.emoji}` : 'these events'}
          </h3>

          {shared.length > 1 && (
            <div className="meetup__choices">
              {shared.map((e) => (
                <button
                  key={e.id}
                  className={cx('meetup__choice', selected.id === e.id && 'is-on')}
                  disabled={status !== 'none'}
                  onClick={() => setChosen(e.id)}
                >
                  {e.emoji} {e.name}
                </button>
              ))}
            </div>
          )}

          <div className="meetup__event" style={{ '--g1': selected.gradient[0], '--g2': selected.gradient[1] } as React.CSSProperties}>
            <span className="meetup__emoji">{selected.emoji}</span>
            <div>
              <div className="meetup__event-name">{selected.name}</div>
              <div className="meetup__event-meta">
                {d.weekday} {d.day} {d.month} · {selected.time}
              </div>
              <div className="meetup__event-meta">🛡️ Supervised by the {selected.host}</div>
            </div>
          </div>

          {status === 'none' ? (
            <>
              <Button block variant="primary" disabled={!active} onClick={() => dispatch({ type: 'MEETUP_REQUEST', eventId: selected.id })}>
                I’d be interested in meeting there
              </Button>
              <p className="meetup__fine">
                🤫 Your answer stays private. {name} only finds out if they <em>also</em> say yes. Nothing is arranged unless you both agree.
              </p>
            </>
          ) : (
            <>
              <div className="meetup__waiting">
                <span className="spinner" aria-hidden="true" />
                <div>
                  <strong>You’re in!</strong> Waiting for {name} to decide on their own…
                </div>
              </div>
              <Button block size="sm" variant="ghost" onClick={() => dispatch({ type: 'MEETUP_WITHDRAW' })}>
                Withdraw my interest
              </Button>
            </>
          )}
        </>
      )}
    </section>
  );
}
