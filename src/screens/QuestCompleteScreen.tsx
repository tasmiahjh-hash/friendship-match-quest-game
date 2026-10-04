import { useEffect, useState } from 'react';
import { QUEST_LEVELS } from '../data/levels';
import { MOCK_STUDENTS } from '../data/students';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Confetti } from '../components/ui/Confetti';
import { CountUp } from '../components/ui/CountUp';
import { mockMatchProvider } from '../services/matchService';
import { useGame } from '../state/GameContext';
import { PLAYER_AVATAR_GRADIENT } from '../data/students';
import type { MatchResult } from '../types';
import { cx } from '../utils';

type Phase = 'celebrate' | 'searching' | 'found';

const STATUS_LINES = [
  'Comparing vibes…',
  'Matching friendship styles…',
  'Checking your campus…',
  'Lining up event availability…',
  'Finding your flock…',
];

const CELEBRATE_MS = 3200;
const SEARCH_MS = 4200;
const FOUND_MS = 1100;

export function QuestCompleteScreen() {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState<Phase>('celebrate');
  const [line, setLine] = useState(0);
  const [found, setFound] = useState<MatchResult | null>(null);
  const foundId = found?.student.id ?? null;

  // If a match already exists (e.g. page refresh), skip straight to it.
  useEffect(() => {
    if (state.match) dispatch({ type: 'GO', screen: 'reveal' });
  }, [state.match, dispatch]);

  // Brief "Match found!" beat before the reveal screen.
  useEffect(() => {
    if (phase !== 'found' || !found) return;
    const t = setTimeout(() => dispatch({ type: 'SET_MATCH', match: found }), FOUND_MS);
    return () => clearTimeout(t);
  }, [phase, found, dispatch]);

  useEffect(() => {
    if (phase !== 'celebrate') return;
    const t = setTimeout(() => setPhase('searching'), CELEBRATE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'searching') return;
    let cancelled = false;
    const interval = setInterval(() => setLine((l) => Math.min(l + 1, STATUS_LINES.length - 1)), SEARCH_MS / STATUS_LINES.length);
    const started = Date.now();
    mockMatchProvider.findMatch(state.profile).then((match) => {
      const wait = Math.max(0, SEARCH_MS - (Date.now() - started));
      setTimeout(() => {
        if (cancelled) return;
        setFound(match);
        setPhase('found');
      }, wait);
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase]);

  const questXp = state.xp;

  return (
    <div className="complete">
      {phase === 'celebrate' && <Confetti count={110} burstKey="quest" />}

      <div className={cx('complete__trophy', phase !== 'celebrate' && 'is-small')}>
        <div className="complete__rays" aria-hidden="true" />
        <span aria-hidden="true">🏆</span>
      </div>

      <div className="eyebrow">All {QUEST_LEVELS.length} levels cleared</div>
      <h1 className="complete__title">
        QUEST <span className="text-gradient">COMPLETE</span>
      </h1>

      <div className="complete__stats stagger">
        <div className="stat panel">
          <div className="stat__value stat__value--gold">
            <CountUp to={questXp} />
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

      <div className={cx('finder', phase !== 'celebrate' && 'is-active')}>
        <div className="radar" aria-hidden="true">
          <div className="radar__sweep" />
          <div className="radar__ring radar__ring--1" />
          <div className="radar__ring radar__ring--2" />
          <div className="radar__center">
            <Avatar emoji={state.profile.contact.avatar} gradient={PLAYER_AVATAR_GRADIENT} size={64} />
          </div>
          {MOCK_STUDENTS.map((s, i) => (
            <div key={s.id} className={cx('radar__blip', `radar__blip--${i + 1}`, phase === 'found' && (s.id === foundId ? 'is-found' : 'is-fading'))}>
              <Avatar emoji={phase === 'celebrate' ? '❔' : s.avatar} gradient={s.avatarGradient} size={42} />
            </div>
          ))}
        </div>
        <div className="finder__status" aria-live="polite">
          {phase === 'celebrate' && <span>Get ready… your flock is out there.</span>}
          {phase === 'searching' && (
            <span key={line} className="finder__line">
              {STATUS_LINES[line]}
            </span>
          )}
          {phase === 'found' && <span className="finder__found">✨ Match found!</span>}
        </div>
        {phase === 'celebrate' && (
          <Button variant="secondary" size="sm" onClick={() => setPhase('searching')}>
            Find my flock now →
          </Button>
        )}
      </div>
    </div>
  );
}
