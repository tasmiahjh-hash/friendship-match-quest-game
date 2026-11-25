import { useId } from 'react';
import { AVAILABILITY, CAMPUS_MATCH_PREFERENCES, HANGOUT_IDEAS, MEET_PREFERENCES } from '../../data/hangouts';
import { useGame } from '../../state/GameContext';
import { cx } from '../../utils';
import { onRadioKeys, radioTabIndex } from '../ui/radioKeys';
import { LevelShell } from './LevelShell';

interface PrefGridProps<T extends string> {
  labelledBy: string;
  options: { id: T; emoji: string; title: string; body: string }[];
  value: T | null;
  onChange: (id: T) => void;
  columns?: 2 | 3;
}

function PrefGrid<T extends string>({ labelledBy, options, value, onChange, columns = 3 }: PrefGridProps<T>) {
  return (
    <div className={cx('pref-grid stagger', columns === 2 && 'pref-grid--2')} role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onRadioKeys}>
      {options.map((p, i) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          tabIndex={radioTabIndex(value === p.id, Boolean(value), i)}
          className={cx('pref', value === p.id && 'is-on')}
          onClick={() => onChange(p.id)}
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
  );
}

export function MeetLevel() {
  const { state, dispatch } = useGame();
  const { meetPreference, campusMatch, hangoutIds, availability } = state.profile;
  const needsHangout = meetPreference === 'event';
  const id = useId();

  return (
    <LevelShell
      level="meet"
      heading={
        <>
          How would you feel comfortable <span className="text-gradient">meeting your match</span>?
        </>
      }
      subheading="There’s no rush. Many friendships start with a few messages; others click over an activity."
    >
      <section className="form-block">
        <h2 className="form-block__title" id={`${id}-pref`}>
          Your comfort zone
        </h2>
        <PrefGrid
          labelledBy={`${id}-pref`}
          options={MEET_PREFERENCES}
          value={meetPreference}
          onChange={(pref) => dispatch({ type: 'SET_MEET_PREF', pref })}
        />
      </section>

      <section className="form-block">
        <h2 className="form-block__title" id={`${id}-campus`}>
          Where should we look for your match?
        </h2>
        <PrefGrid
          columns={2}
          labelledBy={`${id}-campus`}
          options={CAMPUS_MATCH_PREFERENCES}
          value={campusMatch}
          onChange={(pref) => dispatch({ type: 'SET_CAMPUS_MATCH', pref })}
        />
      </section>

      <section className="form-block">
        <div className="form-block__row">
          <h2 className="form-block__title" id={`${id}-hangouts`}>
            Activities you’d enjoy <span className="field__optional">{needsHangout ? 'pick at least one' : 'optional · pick any'}</span>
          </h2>
          <span className="tag tag--gold">{hangoutIds.length} selected</span>
        </div>
        <p className="muted form-block__desc">These are ideas, not scheduled events. They help us find someone who likes the same kind of fun.</p>
        <div className="event-grid stagger" role="group" aria-labelledby={`${id}-hangouts`}>
          {HANGOUT_IDEAS.map((h) => {
            const on = hangoutIds.includes(h.id);
            return (
              <button
                key={h.id}
                type="button"
                className={cx('event', on && 'is-on')}
                style={{ '--g1': h.gradient[0], '--g2': h.gradient[1] } as React.CSSProperties}
                aria-pressed={on}
                onClick={() => dispatch({ type: 'TOGGLE_HANGOUT', id: h.id })}
              >
                <span className="event__art">
                  <span className="event__emoji" aria-hidden="true">
                    {h.emoji}
                  </span>
                </span>
                <span className="event__info">
                  <span className="event__name">{h.name}</span>
                  <span className="event__desc">{h.description}</span>
                </span>
                <span className="event__check" aria-hidden="true">
                  {on ? '✓' : '+'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="form-block">
        <h2 className="form-block__title" id={`${id}-avail`}>
          When are you usually free? <span className="field__optional">optional · pick any</span>
        </h2>
        <div className="suggestions" role="group" aria-labelledby={`${id}-avail`}>
          {AVAILABILITY.map((a) => {
            const on = availability.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                className={cx('suggestion suggestion--lg', on && 'is-on')}
                onClick={() => dispatch({ type: 'TOGGLE_AVAILABILITY', id: a.id })}
              >
                <span aria-hidden="true">{a.emoji}</span> {a.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="pill-note pill-note--gold">
        <span className="pill-note__icon" aria-hidden="true">
          🤝
        </span>
        <span>
          <strong>Your choices here don’t arrange a meeting.</strong> They only help us find a good match. Whether you connect or meet is
          always up to <em>both</em> of you.
        </span>
      </div>
    </LevelShell>
  );
}
