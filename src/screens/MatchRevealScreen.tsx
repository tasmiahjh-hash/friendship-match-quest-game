import { useEffect, useState } from 'react';
import { eventById, formatEventDate } from '../data/events';
import { interestById } from '../data/interests';
import { PLAYER_AVATAR_GRADIENT } from '../data/students';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { CompatibilityRing } from '../components/ui/CompatibilityRing';
import { Confetti } from '../components/ui/Confetti';
import { CountUp } from '../components/ui/CountUp';
import { useGame } from '../state/GameContext';
import { cx } from '../utils';

const REVEAL_DELAY = 1300;

export function MatchRevealScreen() {
  const { state, dispatch } = useGame();
  const [revealed, setRevealed] = useState(false);
  const match = state.match;

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), REVEAL_DELAY);
    return () => clearTimeout(t);
  }, []);

  if (!match) {
    return (
      <div className="complete">
        <p>No match yet.</p>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'complete' })}>Find my match</Button>
      </div>
    );
  }

  const { student } = match;

  return (
    <div className={cx('reveal', revealed && 'is-revealed')}>
      {revealed && <Confetti count={120} burstKey="reveal" />}

      <div className="reveal__intro">
        <div className="eyebrow">{revealed ? 'Your flock has landed' : 'Revealing your match…'}</div>
      </div>

      <div className="reveal__card">
        <div className="reveal__glow" aria-hidden="true" />

        <div className="reveal__pair">
          <div className="reveal__person">
            <Avatar emoji={state.profile.contact.avatar} gradient={PLAYER_AVATAR_GRADIENT} size={88} ring />
            <span className="reveal__person-name">You</span>
          </div>

          <div className="reveal__ring">
            <CompatibilityRing value={revealed ? match.compatibility : 0} size={190} stroke={14}>
              <div className="reveal__pct">{revealed ? <CountUp to={match.compatibility} duration={1500} /> : '??'}%</div>
              <div className="reveal__pct-label">MATCH</div>
            </CompatibilityRing>
          </div>

          <div className="reveal__person">
            <div className={cx('reveal__mystery', revealed && 'is-flipped')}>
              <div className="reveal__face reveal__face--back">
                <Avatar emoji="❔" gradient={['#3a3170', '#2a2350']} size={88} ring />
              </div>
              <div className="reveal__face reveal__face--front">
                <Avatar emoji={student.avatar} gradient={student.avatarGradient} size={88} ring online />
              </div>
            </div>
            <span className="reveal__person-name">{revealed ? student.firstName : '…'}</span>
          </div>
        </div>

        {revealed && (
          <div className="reveal__details stagger">
            <div className="reveal__who">
              <h1 className="reveal__name">
                Meet <span className="text-gradient--magic">{student.firstName}</span>
              </h1>
              <p className="muted">
                {student.pronouns} · {student.program} · {student.year} year
              </p>
              <p className="reveal__bio">“{student.bio}”</p>
            </div>

            <div className="reveal__grid">
              <section className="reveal__block">
                <h3 className="reveal__block-title">You both love</h3>
                <div className="reveal__chips">
                  {match.sharedInterests.length ? (
                    match.sharedInterests.map((id) => {
                      const i = interestById(id);
                      return (
                        <span key={id} className="tag tag--mint reveal__chip">
                          {i?.emoji} {i?.label}
                        </span>
                      );
                    })
                  ) : (
                    <span className="muted">Different interests: a chance to try something new!</span>
                  )}
                </div>

                <h3 className="reveal__block-title">You’re both available for</h3>
                <div className="reveal__chips">
                  {match.sharedEventIds.length ? (
                    match.sharedEventIds.map((id) => {
                      const e = eventById(id)!;
                      const d = formatEventDate(e.date);
                      return (
                        <span key={id} className="tag tag--gold reveal__chip">
                          {e.emoji} {e.name} · {d.day} {d.month}
                        </span>
                      );
                    })
                  ) : (
                    <span className="muted">No shared events yet. Chatting first works great too.</span>
                  )}
                </div>
              </section>

              <section className="reveal__block">
                <h3 className="reveal__block-title">Why you matched</h3>
                <ul className="reasons">
                  {match.reasons.map((r) => (
                    <li key={r}>
                      <span className="reasons__check" aria-hidden="true">
                        ✓
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="reveal__footer">
              <div className="reveal__privacy">
                🔒 {student.firstName}’s email and socials stay private, and so do yours. You’ll chat inside Friendship Quest.
              </div>
              <Button size="lg" variant="magic" pulse onClick={() => dispatch({ type: 'GO', screen: 'room' })}>
                Meet Your Match →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
