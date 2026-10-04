# Friendship Quest (MVP prototype)

A gamified friendship-matching prototype for university students: **Play → Match → Chat → Meet**.
Everything runs locally with mock data. There is no backend, auth, email or realtime networking yet.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

Progress is saved to `localStorage`. Use **Replay demo** (sidebar, or ☰ on mobile) to start over.
On the welcome screen, **Presenter shortcut: skip to match** fills a sample profile and jumps to matchmaking.

## Project structure

```
src/
  types/           Domain types (profile, match, chat, meetup, sharing, safety)
  data/            All mock content: interests, questions, universities, events,
                   mock students, achievements/stages, safety copy, chat replies
  services/
    matchService   MatchProvider interface + compatibility scoring + mock provider
    mockPeer       Simulated "other student" (seed messages, replies, timings)
    storage        localStorage persistence
  state/
    gameLogic      Reducer: XP, badges, friendship stages, chat, meetup, sharing, safety
    GameContext    Provider + useGame()
    useMockPeer    Hook driving the simulated match (swap for a realtime channel)
  components/
    ui/            Button, Modal, Avatar, XPBar, Toaster, Confetti, ring, Portal...
    hud/           Player HUD (desktop sidebar / mobile top bar + drawer)
    levels/        LevelShell + the 5 onboarding levels
    room/          Match Room: header, thread, composer, meetup, contact sharing, safety modals
  screens/         Welcome, Quest Complete, Match Reveal, Match Room
  styles/          Design tokens + per-area CSS
```

## Mock vs real

| Area | Status |
| --- | --- |
| Onboarding, XP, levels, badges, stages | Real client logic (local state) |
| Compatibility scoring | Real algorithm, run client-side against 5 fictional students |
| University email check | Format + domain check only; no verification code is sent |
| Match chat | Local only; the match's replies are scripted (`services/mockPeer.ts`) |
| Meetup consent | The match's "yes" is simulated after a delay |
| Contact sharing | Local state; the match's Instagram share is simulated |
| Report / block / unmatch | Functional UI and state; reports are not sent anywhere |
| Events | Static mock list in `data/events.ts` |

## Safety principles built into the design

- Email/Instagram are never shown to a match unless that person explicitly shares them; sharing is per-channel and can be hidden again.
- "Keep chatting here" earns the same XP as sharing, so contact sharing is never incentivised.
- Meetup interest is private until both people say yes; first meetups are framed at supervised, public FAC events.
- Moderators do not read chats by default; a report shares the reported conversation for review.
