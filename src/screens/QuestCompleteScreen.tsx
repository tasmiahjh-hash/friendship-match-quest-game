import { useState } from 'react';
import { Link } from '../components/layout/Link';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Confetti } from '../components/ui/Confetti';
import { CountUp } from '../components/ui/CountUp';
import { PLAYER_AVATAR_GRADIENT } from '../data/avatars';
import { QUEST_LEVELS } from '../data/levels';
import { loadReceiptEmail } from '../services/storage';
import { useGame } from '../state/GameContext';
import { navigate, paths } from '../state/router';

/** Only reachable with a receipt, and a receipt only exists once the backend confirmed the save. */
export function QuestCompleteScreen() {
  const { state } = useGame();
  const [copied, setCopied] = useState(false);
  const [email] = useState(loadReceiptEmail);
  const { receipt, profile } = state;
  if (!receipt) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.registrationId);
      setCopied(true);
    } catch {
      /* the ID is selectable text, so copying by hand still works */
    }
  };

  return (
    <div className="complete">
      <Confetti count={120} burstKey="quest" />

      <div className="complete__trophy">
        <div className="complete__rays" aria-hidden="true" />
        <span aria-hidden="true">🏆</span>
        <div className="complete__hero">
          <Avatar emoji={profile.contact.avatar} gradient={PLAYER_AVATAR_GRADIENT} size={54} ring />
        </div>
      </div>

      <div className="eyebrow">All {QUEST_LEVELS.length} levels cleared</div>
      <h1 className="complete__title">
        Quest <span className="text-gradient">Complete!</span> <span aria-hidden="true">🎉</span>
      </h1>
      <p className="complete__tagline">Your next friendship adventure starts here.</p>

      <div className="receipt panel">
        <div className="receipt__row">
          <span className="receipt__label">Registration reference ID</span>
          <span className="receipt__id">
            <strong>{receipt.registrationId}</strong>
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? 'Copied ✓' : 'Copy'}
            </Button>
            <span className="sr-only" role="status">
              {copied && 'Reference ID copied'}
            </span>
          </span>
        </div>
        <div className="receipt__row">
          <span className="receipt__label">We’ll email you at</span>
          <strong className="receipt__email">{email ?? 'the address you registered with'}</strong>
        </div>
      </div>

      <div className="complete__copy">
        <p>
          Thank you for completing Friendship Quest! We’re gathering students across the University of Alberta to help create meaningful and
          compatible friendships.
        </p>
        <p>
          Once we find a suitable friendship match for you, the Friends Across Campus team will email you with more details and the next
          steps.
        </p>
        <p>
          Your responses have been submitted successfully and will be kept private, with access limited to authorized administrators.
        </p>
        <p className="complete__inbox">
          <span aria-hidden="true">📬</span> Keep an eye on your inbox!
        </p>
      </div>

      <div className="complete__stats stagger">
        <div className="stat panel">
          <div className="stat__value stat__value--gold">
            <CountUp to={state.xp} />
          </div>
          <div className="stat__label">XP earned</div>
        </div>
        <div className="stat panel">
          <div className="stat__value">
            {state.completedLevels.length}/{QUEST_LEVELS.length}
          </div>
          <div className="stat__label">Levels completed</div>
        </div>
        <div className="stat panel">
          <div className="stat__value">{state.achievements.length}</div>
          <div className="stat__label">Badges earned</div>
        </div>
      </div>

      <div className="complete__actions">
        <Button size="lg" onClick={() => navigate(paths.home)}>
          Return to Home
        </Button>
        <Link to={paths.feedback} className="btn btn--secondary btn--lg">
          Help Us Improve
        </Link>
      </div>
    </div>
  );
}
