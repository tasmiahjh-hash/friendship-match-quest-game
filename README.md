# Friendship Quest

A gamified friendship quest for University of Alberta students, by Friends Across Campus (FAC).

Students play a short quest, review their answers and register. FAC administrators look for compatible students and email them when there's a match. There are no instant matches, accounts, or in-app messaging in this release.

```
React + Vite (GitHub Pages)  →  Google Apps Script  →  private Google Spreadsheet
```

## Run it

Node 20 or newer.

```bash
npm ci --ignore-scripts
npm run dev            # http://localhost:5173
npm run dev:backend    # optional: local stand-in backend, see docs/DEPLOYMENT.md
```

| Command | Does |
| --- | --- |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run typecheck` | Types only |
| `npm test` | Unit and component tests, plus the real `Code.gs` on mocked Google services |
| `npm run test:e2e` | Browser tests against a production build and the local stand-in backend. Set `PW_CHANNEL=chrome` to use installed Chrome |
| `npm run check:release` | Checks a build and its settings before publishing. Add `-- --strict` to require a configured backend |

## Set up and deploy

1. Spreadsheet and endpoint: [integrations/google-sheets/README.md](integrations/google-sheets/README.md)
2. GitHub Pages: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. Before launch: [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)

Settings are in [.env.example](.env.example). They're compiled into the public site, so never put a secret there. Without an endpoint the site says registration isn't open.

## Structure

```
src/
  data/                 Campuses, questions, interests, badges, copy
  state/                Game reducer, validation, hash router
  services/submission/  SubmissionAdapter interface and the Google Sheets adapter
  services/matching/    Compatibility scoring, kept for later, not used by the site
  components/           UI, HUD, quest levels, feedback form, site chrome
  screens/, pages/      Landing, review, confirmation; How It Works, Privacy, Help Us Improve
integrations/google-sheets/   Apps Script backend
supabase/               Database work for a later release. Not used by this one
tests/                  unit, e2e, support
```

## Extending it

- **New storage:** implement `SubmissionAdapter` and return it from `src/services/submission/index.ts`. Nothing else changes. Add the new origin to the content security policy in `vite.config.ts`.
- **Changing a question:** edit `src/data/` and `CATALOG` in `Code.gs` together; `npm test` fails if they differ.
- **Chat, match reveal, meetup consent, blocking:** the original prototype screens were removed from the public site. They're in Git at commit `43e3115` (`src/components/room`, `src/screens/Match*.tsx`). The Supabase schema for them is in `supabase/`, with the design in [docs/backend-plan.md](docs/backend-plan.md).

## Privacy rules for contributors

Never commit participant data, spreadsheet links or credentials. Don't log answers. Use synthetic data in tests. Don't add analytics or third-party requests.
