import { formatEventDate } from '../../data/events';
import type { FriendshipEvent } from '../../types';
import { cx } from '../../utils';

interface Props {
  event: FriendshipEvent;
  selected?: boolean;
  onToggle?: () => void;
  compact?: boolean;
}

export function EventCard({ event, selected, onToggle, compact }: Props) {
  const d = formatEventDate(event.date);
  const style = { '--g1': event.gradient[0], '--g2': event.gradient[1] } as React.CSSProperties;

  const content = (
    <>
      <div className="event__art">
        <span className="event__emoji" aria-hidden="true">
          {event.emoji}
        </span>
        <div className="event__date">
          <span className="event__month">{d.month}</span>
          <span className="event__day">{d.day}</span>
          <span className="event__weekday">{d.weekday}</span>
        </div>
      </div>
      <div className="event__info">
        <div className="event__name">{event.name}</div>
        {!compact && <div className="event__desc">{event.description}</div>}
        <div className="event__meta">
          <span>🕖 {event.time}</span>
          <span>📍 {event.location}</span>
        </div>
        <div className="event__foot">
          <span className="event__supervised">🛡️ Supervised · {event.host}</span>
          {!compact && <span className="muted">{event.spotsLeft} spots</span>}
        </div>
      </div>
      {onToggle && (
        <span className="event__check" aria-hidden="true">
          {selected ? '✓' : '+'}
        </span>
      )}
    </>
  );

  if (!onToggle) {
    return (
      <div className={cx('event', compact && 'event--compact')} style={style}>
        {content}
      </div>
    );
  }

  return (
    <button className={cx('event', selected && 'is-on', compact && 'event--compact')} style={style} aria-pressed={selected} onClick={onToggle}>
      {content}
    </button>
  );
}
