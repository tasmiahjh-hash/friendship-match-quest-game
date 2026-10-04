import { useState } from 'react';
import { MODERATION_EXPLAINER } from '../../data/safety';
import type { MatchResult } from '../../types';
import { Avatar } from '../ui/Avatar';

export type SafetyAction = 'report' | 'block' | 'unmatch';

interface Props {
  match: MatchResult;
  active: boolean;
  onAction: (a: SafetyAction) => void;
}

export function RoomHeader({ match, active, onAction }: Props) {
  const { student } = match;
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <header className="room-header">
      <div className="room-header__top">
        <div className="room-header__title">
          <span className="eyebrow">Match Room</span>
          <h1>Your Flock</h1>
        </div>
        <div className="room-header__actions" role="group" aria-label="Safety actions">
          <button className="safety-btn" onClick={() => onAction('report')} disabled={!active} aria-label="Report">
            🚩 <span>Report</span>
          </button>
          <button className="safety-btn" onClick={() => onAction('block')} disabled={!active} aria-label="Block">
            ⛔ <span>Block</span>
          </button>
          <button className="safety-btn" onClick={() => onAction('unmatch')} disabled={!active} aria-label="Unmatch">
            💔 <span>Unmatch</span>
          </button>
        </div>
      </div>

      <div className="room-header__match">
        <Avatar emoji={student.avatar} gradient={student.avatarGradient} size={52} online={active} />
        <div className="room-header__who">
          <div className="room-header__name">
            {student.firstName} <span className="muted room-header__pronouns">{student.pronouns}</span>
          </div>
          <div className="room-header__sub">
            {student.program} · {student.year} year
          </div>
        </div>
        <div className="compat-pill">
          <strong>{match.compatibility}%</strong> match
        </div>
      </div>

      <button className="moderated" onClick={() => setInfoOpen((o) => !o)} aria-expanded={infoOpen}>
        <span>🛡️ Moderated friendship space</span>
        <span className="moderated__more">{infoOpen ? 'Hide' : 'How it works'}</span>
      </button>
      {infoOpen && (
        <div className="moderated__info">
          <p>{MODERATION_EXPLAINER}</p>
          <p>You can report, block or unmatch at any time. {student.firstName} won’t be told who reported them.</p>
        </div>
      )}
    </header>
  );
}
