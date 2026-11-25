import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run a production build under the GitHub Pages subpath, with the
 * real Code.gs behind a local stand-in for Apps Script (tests/support/fakeServer.mjs).
 * They do not contact Google. Uses an installed Chrome when PW_CHANNEL=chrome.
 */
const SITE = 'http://localhost:4173/friendship-match-quest-game/';

const chrome = { channel: process.env.PW_CHANNEL || undefined };

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1, // the stand-in backend is shared state
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0, // shared CI machines are slow; a real bug fails twice
  reporter: 'list',
  outputDir: 'test-results',
  use: { baseURL: SITE, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...chrome } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], ...chrome, viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: 'phone', use: { ...devices['Pixel 5'], ...chrome } },
    { name: 'small-phone', use: { ...devices['Pixel 5'], ...chrome, viewport: { width: 320, height: 640 } } },
    // Safari's engine orders some events differently from Chrome's, so it runs everything too.
    // WebKit renders this page's blur effects slowly on CI machines, so it gets more time.
    { name: 'iphone', timeout: 180_000, use: { ...devices['iPhone 13'] } },
  ],
  webServer: [
    { command: 'node tests/support/fakeServer.mjs', url: 'http://localhost:8787/exec', env: { FAKE_BACKEND_PORT: '8787' }, reuseExistingServer: false },
    {
      command: 'npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
      url: SITE,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        VITE_SUBMISSION_ENDPOINT: 'http://localhost:8787/exec',
        VITE_CONTACT_EMAIL: 'hello@friendship-quest.test',
        VITE_PRIVACY_CONTACT_EMAIL: 'privacy@friendship-quest.test',
        VITE_BASE_PATH: '/friendship-match-quest-game/',
      },
    },
  ],
});
