import { EVENTS } from '../../data/events';
import { useGame } from '../../state/GameContext';
import type { MeetPreference } from '../../types';
import { cx } from '../../utils';
import { EventCard } from './EventCard';
import { LevelShell } from './LevelShell';

const PREFS: { id: MeetPreference; emoji: string; title: string; body: string }[] = [
  { id: 'chat-first', emoji: '💬', title: 'Chat first', body: 'Get to know each other in the app before anything else.' },
  { id: 'event', emoji: '🎟️', title: 'Supervised event', body: 'Meet at a public FAC friendship event with staff around.' },
  { id: 'either', emoji: '🤝', title: 'Either works', body: 'Happy to chat or meet at an event, whatever feels right.' },
];

export function MeetLevel() {
  const { state, dispatch } = useGame();
  const { meetPreference, availableEventIds } = state.profile;
  const needsEvent = meetPreference === 'event';
  const canContinue = Boolean(meetPreference) && (!needsEvent || availableEventIds.length > 0);

  return (
    <LevelShell
      level="meet"
      heading={
        <>
          How would you feel comfortable <span className="text-gradient">meeting your match</span>?
        </>
      }
      subheading="There’s no rush. Many friendships start with a few messages; others click at an event."
      canContinue={canContinue}
      hint={!meetPreference ? 'Choose a comfort option' : 'Pick at least one event'}
    >
      <div className="pref-grid stagger" role="radiogroup" aria-label="Meeting preference">
        {PREFS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={meetPreference === p.id}
            className={cx('pref', meetPreference === p.id && 'is-on')}
            onClick={() => dispatch({ type: 'SET_MEET_PREF', pref: p.id })}
          >
            <span className="pref__emoji" aria-hidden="true">
              {p.emoji}
            </span>
            <span className="pref__title">{p.title}</span>
            <span className="pref__body">{p.body}</span>
            <span className="pref__radio" aria-hidden="true" />
          </button>
        ))}
      </div>

      <section className="form-block">
        <div className="form-block__row">
          <h3 className="form-block__title">
            Upcoming friendship events{' '}
            <span className="field__optional">{needsEvent ? 'pick at least one' : 'optional · pick any'}</span>
          </h3>
          <span className="tag tag--gold">{availableEventIds.length} selected</span>
        </div>
        <p className="muted form-block__desc">Select every event you could make. Hosted and supervised by the FAC team in public campus spaces.</p>
        <div className="event-grid stagger">
          {EVENTS.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              selected={availableEventIds.includes(e.id)}
              onToggle={() => dispatch({ type: 'TOGGLE_EVENT', id: e.id })}
            />
          ))}
        </div>
      </section>

      <div className="pill-note pill-note--gold">
        <span className="pill-note__icon">🤝</span>
        <span>
          <strong>Choosing an event doesn’t arrange a meeting.</strong> If you match with someone who picked the same event, you’ll each be
          asked separately. A meetup only unlocks if <em>both</em> of you independently say yes.
        </span>
      </div>
    </LevelShell>
  );
}
