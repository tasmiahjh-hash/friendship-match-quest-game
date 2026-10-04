import { useCallback, useEffect } from 'react';
import { useGame } from '../../state/GameContext';
import type { GameNotification } from '../../types';
import { cx } from '../../utils';

const VISIBLE = 3;
const LIFETIME = 3000;

function Toast({ note, onDismiss }: { note: GameNotification; onDismiss: (id: string) => void }) {
  // Each toast expires on its own timer once it becomes visible.
  useEffect(() => {
    const t = setTimeout(() => onDismiss(note.id), LIFETIME);
    return () => clearTimeout(t);
  }, [note.id, onDismiss]);

  return (
    <div className={cx('toast', `toast--${note.tone}`)} onClick={() => onDismiss(note.id)}>
      <div className="toast__icon" aria-hidden="true">
        {note.emoji ?? '✨'}
      </div>
      <div>
        <div className="toast__title">{note.title}</div>
        {note.body && <div className="toast__body">{note.body}</div>}
      </div>
    </div>
  );
}

export function Toaster() {
  const { state, dispatch } = useGame();
  const visible = state.notifications.slice(0, VISIBLE);
  const dismiss = useCallback((id: string) => dispatch({ type: 'DISMISS_NOTIFICATION', id }), [dispatch]);

  return (
    <div className="toaster" aria-live="polite">
      {visible.map((n) => (
        <Toast key={n.id} note={n} onDismiss={dismiss} />
      ))}
    </div>
  );
}
