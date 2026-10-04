import { CampusLevel } from './components/levels/CampusLevel';
import { ContactLevel } from './components/levels/ContactLevel';
import { MeetLevel } from './components/levels/MeetLevel';
import { StyleLevel } from './components/levels/StyleLevel';
import { VibeLevel } from './components/levels/VibeLevel';
import { MobileTopBar, PlayerHud } from './components/hud/PlayerHud';
import { Toaster } from './components/ui/Toaster';
import { MatchRevealScreen } from './screens/MatchRevealScreen';
import { MatchRoomScreen } from './screens/MatchRoomScreen';
import { QuestCompleteScreen } from './screens/QuestCompleteScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { useGame } from './state/GameContext';
import type { ScreenId } from './types';
import { cx } from './utils';

const SCREENS: Record<ScreenId, () => JSX.Element> = {
  welcome: WelcomeScreen,
  vibe: VibeLevel,
  style: StyleLevel,
  campus: CampusLevel,
  meet: MeetLevel,
  contact: ContactLevel,
  complete: QuestCompleteScreen,
  reveal: MatchRevealScreen,
  room: MatchRoomScreen,
};

function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__blob" style={{ width: 420, height: 420, left: '60%', top: '-8%', background: '#7c5cff' }} />
      <div className="ambient__blob" style={{ width: 360, height: 360, left: '-6%', top: '55%', background: '#ff7e8a', animationDelay: '-6s' }} />
    </div>
  );
}

export default function App() {
  const { state } = useGame();
  const Screen = SCREENS[state.screen] ?? WelcomeScreen;

  if (state.screen === 'welcome') {
    return (
      <div className="app">
        <Ambient />
        <main className="welcome-wrap">
          <Screen />
        </main>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="app">
      <Ambient />
      <MobileTopBar />
      <div className="shell">
        <aside className="shell__sidebar">
          <PlayerHud />
        </aside>
        <main className={cx('shell__main', state.screen === 'room' && 'shell__main--room')}>
          <div className="screen" key={state.screen}>
            <Screen />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
