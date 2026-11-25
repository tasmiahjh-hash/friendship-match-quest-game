import { useEffect, useRef } from 'react';
import { MobileTopBar, PlayerHud } from './components/hud/PlayerHud';
import { SiteFooter, SiteHeader } from './components/layout/SiteChrome';
import { CampusLevel } from './components/levels/CampusLevel';
import { ContactLevel } from './components/levels/ContactLevel';
import { MeetLevel } from './components/levels/MeetLevel';
import { StyleLevel } from './components/levels/StyleLevel';
import { VibeLevel } from './components/levels/VibeLevel';
import { Toaster } from './components/ui/Toaster';
import { QUEST_LEVELS } from './data/levels';
import { FeedbackPage } from './pages/FeedbackPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { QuestCompleteScreen } from './screens/QuestCompleteScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { useGame } from './state/GameContext';
import { navigate, parseRoute, redirectFor, useHash, type Route } from './state/router';
import type { QuestLevelId } from './types';

const LEVELS: Record<QuestLevelId, () => JSX.Element> = {
  contact: ContactLevel,
  campus: CampusLevel,
  style: StyleLevel,
  vibe: VibeLevel,
  meet: MeetLevel,
};

function titleFor(route: Route): string {
  const site = 'Friendship Quest by Friends Across Campus';
  switch (route.name) {
    case 'home':
      return site;
    case 'level': {
      const l = QUEST_LEVELS.find((x) => x.id === route.level)!;
      return `Level ${l.number}: ${l.title} · Friendship Quest`;
    }
    case 'review':
      return 'Review your answers · Friendship Quest';
    case 'complete':
      return 'Quest complete · Friendship Quest';
    case 'how-it-works':
      return 'How It Works · Friendship Quest';
    case 'privacy':
      return 'Privacy Policy · Friendship Quest';
    case 'feedback':
      return 'Help Us Improve · Friendship Quest';
    case 'not-found':
      return 'Page not found · Friendship Quest';
  }
}

function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__blob" style={{ width: 420, height: 420, left: '60%', top: '-8%', background: '#7c5cff' }} />
      <div className="ambient__blob" style={{ width: 360, height: 360, left: '-6%', top: '55%', background: '#ff7e8a', animationDelay: '-6s' }} />
    </div>
  );
}

function QuestScreen({ route }: { route: Route }) {
  if (route.name === 'level') {
    const Level = LEVELS[route.level];
    return <Level />;
  }
  return route.name === 'review' ? <ReviewScreen /> : <QuestCompleteScreen />;
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'how-it-works':
      return <HowItWorksPage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'feedback':
      return <FeedbackPage />;
    default:
      return <NotFoundPage />;
  }
}

export default function App() {
  const { state } = useGame();
  const hash = useHash();
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  const requested = parseRoute(hash);
  const redirect = redirectFor(requested, state);
  const route = redirect ? parseRoute(`#${redirect}`) : requested;
  const routeKey = route.name === 'level' ? route.level : route.name;

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true });
  }, [redirect]);

  // New page: update the title, go to the top, and move focus so screen readers notice.
  useEffect(() => {
    document.title = titleFor(route);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const mainProps = { ref: main, tabIndex: -1, id: 'main' };
  const inQuest = route.name === 'level' || route.name === 'review' || route.name === 'complete';

  return (
    <div className="app">
      {/* A plain #main link would collide with hash routing, so focus is moved by hand. */}
      <button type="button" className="skip-link" onClick={() => main.current?.focus()}>
        Skip to main content
      </button>
      <Ambient />
      {inQuest ? (
        <>
          <MobileTopBar />
          <div className="shell">
            <aside className="shell__sidebar" aria-label="Your progress">
              <PlayerHud />
            </aside>
            <div className="shell__column">
              <main className="shell__main" {...mainProps}>
                <div className="screen" key={routeKey}>
                  <QuestScreen route={route} />
                </div>
              </main>
              <SiteFooter compact />
            </div>
          </div>
        </>
      ) : (
        <div className="site">
          <SiteHeader />
          <main className="site__main" {...mainProps}>
            <div key={routeKey}>{route.name === 'home' ? <WelcomeScreen /> : <Page route={route} />}</div>
          </main>
          <SiteFooter />
        </div>
      )}
      <Toaster />
    </div>
  );
}
