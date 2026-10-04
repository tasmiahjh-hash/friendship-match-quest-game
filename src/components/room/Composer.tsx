import { useState } from 'react';
import { ICEBREAKERS } from '../../data/chat';

interface Props {
  onSend: (text: string, icebreaker?: boolean) => void;
  matchName: string;
  usedIcebreakers: string[];
}

const MAX_LEN = 500;

export function Composer({ onSend, matchName, usedIcebreakers }: Props) {
  const [text, setText] = useState('');
  const available = ICEBREAKERS.filter((q) => !usedIcebreakers.includes(q));

  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="composer">
      {available.length > 0 && (
        <div className="icebreakers">
          <span className="icebreakers__label">🧊 Icebreakers</span>
          <div className="icebreakers__list">
            {available.map((q) => (
              <button key={q} className="icebreaker" onClick={() => onSend(q, true)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        className="composer__row"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className="composer__input"
          placeholder={`Message ${matchName}…`}
          value={text}
          maxLength={MAX_LEN}
          onChange={(e) => setText(e.target.value)}
          aria-label={`Message ${matchName}`}
        />
        <button type="submit" className="composer__send" disabled={!text.trim()} aria-label="Send message">
          ➤
        </button>
      </form>
      <p className="composer__note">Be kind. Never share passwords, addresses or anything you’re not comfortable with.</p>
    </div>
  );
}
