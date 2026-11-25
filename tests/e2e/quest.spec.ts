import { expect, test, type Page } from '@playwright/test';

const BACKEND = 'http://localhost:8787';
const BASE = '/friendship-match-quest-game/';

interface BackendState {
  seen: { preflights: number; posts: string[] };
  responses: Record<string, string>[];
  suggestions: Record<string, string>[];
}
const backend = async (page: Page): Promise<BackendState> => (await page.request.get(`${BACKEND}/__test/state`)).json();
const failWith = (page: Page, mode: string) => page.request.get(`${BACKEND}/__test/fail?mode=${mode}`);

let problems: string[];
test.beforeEach(async ({ page }) => {
  await page.request.get(`${BACKEND}/__test/reset`);
  problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(`${m.type()}: ${m.text()}`));
  page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
});

/**
 * The page must never scroll sideways, and once animations settle no content may stick
 * out past the edge (the app frame clips, so scrollWidth alone could miss that).
 */
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          return [...document.querySelectorAll('main *, footer *, header *')]
            .filter((e) => !e.closest('.welcome__art, .hp, .complete__trophy, .sr-only'))
            .filter((e) => e.getBoundingClientRect().right > width + 0.5 || e.getBoundingClientRect().left < -0.5)
            .map((e) => `${e.tagName}.${e.className}`);
        }),
      { message: `content past the screen edge on ${page.url()}` },
    )
    .toEqual([]);
}

const next = (page: Page, name: RegExp | string = /Complete level/) => page.getByRole('button', { name }).click();

async function playQuest(page: Page, { campus = /Augustana/, email = 'synthetic.student@gmail.com' } = {}) {
  await page.goto('./');
  await noOverflow(page);
  await page.getByRole('button', { name: /Start Your Friendship Quest/ }).click();

  await expect(page).toHaveURL(/#\/quest\/contact$/);
  await page.getByRole('radio', { name: 'Otter' }).click();
  await page.getByLabel('First name').fill('Synthetic');
  await page.getByLabel(/Email address/).fill(email);
  await page.getByText(/I confirm that I am currently/).click();
  await page.getByText(/I agree to the community guidelines/).click();
  await noOverflow(page);
  await next(page);

  await expect(page).toHaveURL(/#\/quest\/campus$/, { timeout: 5000 });
  await expect(page.getByRole('radiogroup', { name: /campus/i }).getByRole('radio')).toHaveCount(4);
  await page.getByRole('radio', { name: campus }).click();
  await page.getByLabel('Program', { exact: true }).fill('=Synthetic Studies');
  await page.getByRole('radio', { name: '3rd year' }).click();
  await page.getByRole('textbox', { name: 'Courses' }).fill('test 101'); // left un-added on purpose: leaving must keep it
  await noOverflow(page);
  await next(page);

  await expect(page).toHaveURL(/#\/quest\/style$/, { timeout: 5000 });
  for (const answer of ['Depends on the mood', 'Let’s just go', 'Constant memes', 'Small crew', 'Adventure']) {
    await page.getByRole('button', { name: answer }).click();
  }
  await expect(page.getByText('Your friendship archetype')).toBeVisible();
  await noOverflow(page);
  await next(page);

  await expect(page).toHaveURL(/#\/quest\/vibe$/, { timeout: 5000 });
  for (const i of ['Badminton', 'Cafés', 'Anime', 'Travel']) await page.getByRole('button', { name: i }).click();
  await noOverflow(page);
  await next(page);

  await expect(page).toHaveURL(/#\/quest\/meet$/, { timeout: 5000 });
  await page.getByRole('radio', { name: /Meet in person/ }).click();
  await page.getByRole('radio', { name: /Any U of A campus/ }).click();
  await expect(page.getByRole('button', { name: /Review answers/ })).toBeDisabled(); // needs an activity
  await page.getByRole('button', { name: /Games Night/ }).click();
  await page.getByRole('button', { name: /Weekend days/ }).click();
  await noOverflow(page);
  await next(page, /Review answers/);

  await expect(page).toHaveURL(/#\/quest\/review$/, { timeout: 5000 });
  await noOverflow(page);
}

async function consentAndSubmit(page: Page) {
  await page.getByText(/I have read the above and consent/).click();
  await page.getByRole('button', { name: 'Submit registration' }).click();
}

test('full journey: play, go back and change answers, submit, confirm', async ({ page }) => {
  await playQuest(page);

  // Go back to an earlier level, change an answer, and return to the review.
  await page.getByRole('link', { name: 'Edit Campus Life' }).click();
  await expect(page.getByText('TEST 101')).toBeVisible();
  await page.getByRole('radio', { name: /Campus Saint-Jean/ }).click();
  await page.getByRole('button', { name: /Save and review/ }).click();
  await expect(page.getByText('University of Alberta: Campus Saint-Jean')).toBeVisible();

  // A refresh loses nothing.
  await page.reload();
  await expect(page.getByText('University of Alberta: Campus Saint-Jean')).toBeVisible();

  await consentAndSubmit(page);
  await expect(page.getByRole('heading', { name: /Quest Complete!/ })).toBeVisible();
  const id = await page.locator('.receipt__id strong').innerText();
  expect(id).toMatch(/^FQ-[0-9A-Z]{8}$/);
  await expect(page.getByText('synthetic.student@gmail.com')).toBeVisible();
  await noOverflow(page);

  const { responses, seen } = await backend(page);
  expect(seen.preflights).toBe(0);
  expect(seen.posts).toEqual(['text/plain;charset=utf-8']);
  expect(responses).toHaveLength(1);
  expect(responses[0]).toMatchObject({
    'Registration ID': id,
    Email: 'synthetic.student@gmail.com',
    'Campus ID': 'ualberta-saint-jean',
    Program: '=Synthetic Studies',
    Courses: 'TEST 101',
    Avatar: '🦦',
    'Friday Night': 'Depends on the mood',
    'Planning Style': 'Let’s just go',
    'Texting Style': 'Constant memes',
    'Group Size': 'Small crew',
    'Friendship Values': 'Adventure',
    Interests: 'Badminton, Cafés, Anime, Travel',
    'Meeting Comfort': 'Meet in person',
    'Campus Match Preference': 'Any U of A campus',
    'Activities Enjoyed': 'Games Night',
    Availability: 'Weekend days',
  });

  // Returning later shows the receipt, not a new form, and the answers are gone from the device.
  await page.reload();
  await expect(page.getByText(id)).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('synthetic.student');
  await page.getByRole('button', { name: 'Return to Home' }).click();
  await expect(page.getByRole('button', { name: /View Your Registration/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByText(id)).toBeVisible();
  expect(problems).toEqual([]);
});

test('a lost reply can be retried without registering twice', async ({ page }) => {
  await playQuest(page);
  await failWith(page, 'drop'); // saved, but the browser never hears back
  await consentAndSubmit(page);
  await expect(page.getByRole('alert')).toContainText('wasn’t confirmed');
  expect((await backend(page)).responses).toHaveLength(1);

  await failWith(page, '');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: /Quest Complete!/ })).toBeVisible();
  const { responses } = await backend(page);
  expect(responses).toHaveLength(1);
  await expect(page.getByText(responses[0]['Registration ID'])).toBeVisible();
});

test('an error page or a dead server is never treated as success', async ({ page }) => {
  await playQuest(page);
  await failWith(page, 'html');
  await consentAndSubmit(page);
  await expect(page.getByRole('alert')).toContainText('couldn’t confirm');
  await failWith(page, 'down');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toContainText('couldn’t reach the server');
  await page.reload();
  await expect(page.getByText('=Synthetic Studies')).toBeVisible();
  expect((await backend(page)).responses).toHaveLength(0);
});

test('feedback from the landing page, anonymously', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Share your ideas' }).click();
  await page.getByLabel('Your suggestion').fill('=HYPERLINK("http://evil.test") more badges please');
  await page.getByLabel(/Category/).selectOption({ label: 'Website design' });
  await noOverflow(page);
  await page.getByRole('button', { name: 'Submit Feedback' }).click();
  await expect(page.getByText('Thank you for helping us improve Friendship Quest!')).toBeVisible();
  const { suggestions } = await backend(page);
  expect(suggestions[0]).toMatchObject({ Email: '', Category: 'Website design', 'Review Status': 'New' });
  expect(problems).toEqual([]);
});

test('Speed Dating is visibly disabled and goes nowhere', async ({ page }) => {
  await page.goto('./');
  const button = page.getByRole('button', { name: 'Coming Soon' });
  await expect(button).toBeDisabled();
  await button.click({ force: true });
  await expect(page).toHaveURL(new RegExp(`${BASE}$`));
});

test('every page loads under the subpath, refreshes, and fits the screen', async ({ page }) => {
  for (const [path, heading] of [
    ['', /Friendship Quest/],
    ['#/how-it-works', /From quest to friendship/],
    ['#/privacy', /Privacy Policy/],
    ['#/help-us-improve', /Help Us Improve/],
    ['#/nowhere', /Off the map/],
    ['#/quest/contact', /Create your player card/],
  ] as const) {
    await page.goto(`./${path}`);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await noOverflow(page);
  }
  const assets = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name));
  expect(assets.length).toBeGreaterThan(0);
  for (const a of assets.filter((x) => x !== `${BACKEND}/exec`)) expect(a, 'same-origin, under the repository subpath').toContain(`localhost:4173${BASE}`);
  for (const f of ['favicon.svg', 'apple-touch-icon.png', 'og-image.png', '404.html']) {
    expect((await page.request.get(`./${f}`)).ok(), f).toBe(true);
  }
  expect(problems).toEqual([]);
});

test('works by keyboard, and dialogs trap and return focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard');
  await page.goto('./#/quest/contact');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Skip to main content' })).toBeFocused();
  await page.getByRole('radio', { name: 'Fox' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Panda' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Panda' })).toBeChecked();

  const opener = page.getByRole('button', { name: 'Read the community guidelines' });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Community guidelines' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await playQuest(page);
  await consentAndSubmit(page);
  await expect(page.getByRole('heading', { name: /Quest Complete!/ })).toBeVisible();
  await expect(page.locator('.confetti__piece')).toHaveCount(0);
});

test('another open tab cannot bring back stale answers', async ({ page, context }) => {
  await playQuest(page);
  const other = await context.newPage();
  await other.goto(`./#/privacy`);
  await consentAndSubmit(page);
  await expect(page.getByRole('heading', { name: /Quest Complete!/ })).toBeVisible();
  await other.goto('./#/quest/review');
  await expect(other.getByRole('heading', { name: /Quest Complete!/ })).toBeVisible();
});

test('the endpoint gives nothing away', async ({ page }) => {
  await playQuest(page);
  await consentAndSubmit(page);
  await expect(page.getByRole('heading', { name: /Quest Complete!/ })).toBeVisible();
  for (const q of ['', '?action=list', '?sheet=Student%20Responses']) {
    expect(await (await page.request.get(`${BACKEND}/exec${q}`)).text()).toBe('{"ok":true,"service":"friendship-quest","accepting":true}');
  }
});

test('while the server is closed: says so, saves nothing, and allows only controlled tests', async ({ page }) => {
  await page.request.get(`${BACKEND}/__test/close?allow=fq-test-9z@example.com`);
  await page.goto('./');
  await expect(page.getByText('Registration isn’t open yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Preview the Friendship Quest/ })).toBeVisible();
  await noOverflow(page);

  await page.request.get(`${BACKEND}/__test/reset`); // open just long enough to reuse playQuest's landing step
  await playQuest(page, { email: 'ordinary.student@example.com' });
  await page.request.get(`${BACKEND}/__test/close?allow=fq-test-9z@example.com`);
  await page.reload();
  await expect(page.getByText('Registration isn’t open yet,')).toBeVisible();
  await consentAndSubmit(page);
  await expect(page.getByRole('alert')).toContainText('nothing was saved');
  expect((await backend(page)).responses).toHaveLength(0);

  await page.getByRole('link', { name: 'Edit Your Card' }).click();
  await page.getByLabel(/Email address/).fill('fq-test-9z@example.com');
  await page.getByRole('button', { name: /Save and review/ }).click();
  await consentAndSubmit(page);
  await expect(page.getByRole('heading', { name: /Quest Complete!/ })).toBeVisible();
  expect((await backend(page)).responses).toHaveLength(1);
});
