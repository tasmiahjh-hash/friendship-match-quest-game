import { useEffect, useRef } from 'react';
import { eventById } from '../../data/events';
import { PLAYER_AVATAR_GRADIENT } from '../../data/students';
import type { ChatMessage, MatchResult } from '../../types';
import { cx, formatTime } from '../../utils';
import { Avatar } from '../ui/Avatar';

interface Props {
  messages: ChatMessage[];
  match: MatchResult;
  playerAvatar: string;
  typing: boolean;
}

export function ChatThread({ messages, match, playerAvatar, typing }: Props) {
  const threadRef = useRef<HTMLDivElement>(null);
  const { student } = match;

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  return (
    <div className="thread" aria-live="polite" ref={threadRef}>
      <div className="thread__date">Today</div>
      {messages.map((m, i) => {
        if (m.kind === 'meetup') {
          const e = eventById(m.text);
          return (
            <div key={m.id} className="thread__card thread__card--meetup">
              <div className="thread__card-emoji">{e?.emoji ?? '🎉'}</div>
              <div>
                <div className="thread__card-title">Meetup unlocked!</div>
                <div className="thread__card-body">
                  You and {student.firstName} both said yes to {e?.name}. Check in with the Friendship Quest/FAC team at the event and we’ll help
                  introduce you.
                </div>
              </div>
            </div>
          );
        }
        if (m.kind === 'contact-share') {
          return (
            <div key={m.id} className="thread__card thread__card--share">
              <span>🔐</span> {m.text}
            </div>
          );
        }
        if (m.from === 'system') {
          return (
            <div key={m.id} className="thread__notice">
              {m.text}
            </div>
          );
        }

        const mine = m.from === 'me';
        const prev = messages[i - 1];
        const grouped = prev && prev.from === m.from && prev.kind !== 'meetup' && prev.kind !== 'contact-share';
        return (
          <div key={m.id} className={cx('msg', mine ? 'msg--me' : 'msg--them', grouped && 'msg--grouped')}>
            {!mine && (
              <div className="msg__avatar">{!grouped && <Avatar emoji={student.avatar} gradient={student.avatarGradient} size={32} />}</div>
            )}
            <div className="msg__bubble">
              <span>{m.text}</span>
              <time className="msg__time">{formatTime(m.at)}</time>
            </div>
            {mine && <div className="msg__avatar">{!grouped && <Avatar emoji={playerAvatar} gradient={PLAYER_AVATAR_GRADIENT} size={32} />}</div>}
          </div>
        );
      })}

      {typing && (
        <div className="msg msg--them">
          <div className="msg__avatar">
            <Avatar emoji={student.avatar} gradient={student.avatarGradient} size={32} />
          </div>
          <div className="msg__bubble msg__bubble--typing" aria-label={`${student.firstName} is typing`}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}
    </div>
  );
}
