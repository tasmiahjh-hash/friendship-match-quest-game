import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { config } from '../../src/config';
import { GameProvider } from '../../src/state/GameContext';
import { emptyProfile, initialState, LEVEL_ORDER } from '../../src/state/gameLogic';
import type { GameState } from '../../src/types';

/** MOCKED network: fetch is replaced. End-to-end runs live in tests/e2e. */
const ENDPOINT = 'http://localhost:9/exec';
const fetchMock = vi.fn();
/** What the backend answers when asked whether it is open. */
let accepting: boolean | null = true;

const readyState = (): GameState => ({
  ...initialState(),
  completedLevels: [...LEVEL_ORDER],
  profile: {
    ...emptyProfile(),
    contact: { firstName: 'Testy', email: 'testy@ualberta.ca', instagram: '', avatar: '🦊', isStudent: true, agreedToGuidelines: true },
    campus: { campusId: 'ualberta-south', program: 'Synthetic Studies', year: '1st', courses: [] },
    styleAnswers: { night: 'quiet', planning: 'planner', texting: 'occasional', group: 'small', values: 'loyalty' },
    interests: ['gaming', 'anime', 'music', 'food'],
    meetPreference: 'either',
    campusMatch: 'any-campus',
  },
});

function open(hash: string, state?: GameState) {
  if (state) window.localStorage.setItem('friendship-quest:v2', JSON.stringify(state));
  window.history.replaceState(null, '', `/${hash}`);
  return render(
    <GameProvider>
      <App />
    </GameProvider>,
  );
}

const sent = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body);
const succeed = async (_url: string, init: RequestInit) => {
  const { kind, payload } = JSON.parse(init.body as string);
  const data = kind === 'registration' ? { registrationId: 'FQ-TEST2345', submittedAt: '2026-11-24T10:00:00.000Z' } : { suggestionId: 'FB-TEST2345' };
  return new Response(JSON.stringify({ ok: true, kind, submissionKey: payload.submissionKey, data }));
};
const fail = (code: string) => async () => new Response(JSON.stringify({ ok: false, error: { code } }));

beforeEach(() => {
  config.submissionEndpoint = ENDPOINT;
  fetchMock.mockReset();
  accepting = true;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return fetchMock(url, init);
    if (accepting === null) throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify({ ok: true, service: 'friendship-quest', accepting }));
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('review and submit', () => {
  it('needs the consent box, which starts unchecked', async () => {
    open('#/quest/review', readyState());
    const submit = screen.getByRole('button', { name: 'Submit registration' });
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();
  });

  it('shows the completion page only after the backend confirms', async () => {
    let release: (r: Response) => void = () => undefined;
    fetchMock.mockImplementation((u: string, init: RequestInit) => new Promise((r) => (release = async () => r(await succeed(u, init)))));
    open('#/quest/review', readyState());
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit registration' }));
    expect(screen.getByRole('button', { name: /Submitting/ })).toBeDisabled();
    expect(screen.queryByText('FQ-TEST2345')).not.toBeInTheDocument();
    release(new Response());
    expect(await screen.findByText('FQ-TEST2345')).toBeInTheDocument();
    expect(screen.getByText('testy@ualberta.ca')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to Home' })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Help Us Improve' })).toBeInTheDocument();
    expect(screen.getByRole('main').textContent).not.toMatch(/%|your match is|match found/i);
    expect(window.localStorage.getItem('friendship-quest:v2')).not.toContain('testy@ualberta.ca');
  });

  it('sends the selected campus and consent', async () => {
    fetchMock.mockImplementation(succeed);
    open('#/quest/review', readyState());
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit registration' }));
    await screen.findByText('FQ-TEST2345');
    expect(sent(0)).toMatchObject({ kind: 'registration', payload: { universityId: 'ualberta', campusId: 'ualberta-south', consent: true } });
  });

  it('a double click submits once', async () => {
    fetchMock.mockImplementation(succeed);
    open('#/quest/review', readyState());
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.dblClick(screen.getByRole('button', { name: 'Submit registration' }));
    await screen.findByText('FQ-TEST2345');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the answers on failure and retries with the same key', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockImplementation(succeed);
    open('#/quest/review', readyState());
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit registration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/wasn’t confirmed/);
    expect(screen.getByText('Synthetic Studies')).toBeInTheDocument();
    expect(window.localStorage.getItem('friendship-quest:v2')).toContain('Synthetic Studies');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('FQ-TEST2345');
    expect(sent(1).payload.submissionKey).toBe(sent(0).payload.submissionKey);
  });

  it('uses a new key once answers have changed', async () => {
    fetchMock.mockImplementationOnce(fail('SERVER')).mockImplementation(succeed);
    open('#/quest/review', readyState());
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit registration' }));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('link', { name: 'Edit Campus Life' }));
    await userEvent.click(await screen.findByRole('radio', { name: /Augustana/ }));
    await userEvent.click(screen.getByRole('button', { name: /Save and review/ }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /consent/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit registration' }));
    await screen.findByText('FQ-TEST2345');
    expect(sent(1).payload.campusId).toBe('ualberta-augustana');
    expect(sent(1).payload.submissionKey).not.toBe(sent(0).payload.submissionKey);
  });

  it('never submits while something is missing', async () => {
    const s = readyState();
    s.profile.contact.email = 'broken@';
    open('#/quest/review', s);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Submit registration' })).toBeDisabled();
    expect(screen.getByText(/Still needed: a valid email/)).toBeInTheDocument();
  });

  it('is honest when no backend is configured', async () => {
    config.submissionEndpoint = null;
    open('#/quest/review', readyState());
    expect(screen.getByText(/Registration isn’t open yet,/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Submit registration' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('warns when the backend is closed, and never shows success', async () => {
    accepting = false;
    fetchMock.mockImplementation(fail('CLOSED'));
    open('#/quest/review', readyState());
    expect(await screen.findByText(/Registration isn’t open yet,/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Submit registration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/aren’t open right now, so nothing was saved/);
    expect(screen.queryByText(/Quest Complete/)).not.toBeInTheDocument();
    expect(screen.getByText('Synthetic Studies')).toBeInTheDocument();
  });

  it('makes the Privacy Policy reachable from the consent step', () => {
    open('#/quest/review', readyState());
    expect(screen.getByRole('checkbox', { name: /consent to Friends Across Campus/ })).not.toBeChecked();
    expect(screen.getByRole('link', { name: /Read the full Privacy Policy/ })).toHaveAttribute('href', '#/privacy');
  });

  it('cannot reach the completion page without a receipt', async () => {
    open('#/quest/complete', readyState());
    await waitFor(() => expect(window.location.hash).toBe('#/quest/review'));
    expect(screen.queryByText(/Quest Complete/)).not.toBeInTheDocument();
  });
});

describe('landing page', () => {
  it('leads with friendship, labels the example and keeps Speed Dating disabled', async () => {
    open('');
    expect(screen.getByRole('button', { name: /Start Your Friendship Quest/ })).toBeEnabled();
    expect(screen.getByText('Example Friendship Match')).toBeInTheDocument();
    expect(screen.getByText('🤝', { selector: '.hero-card__spark' })).toBeInTheDocument();
    const soon = screen.getByRole('button', { name: 'Coming Soon' });
    expect(soon).toBeDisabled();
    await userEvent.click(soon);
    expect(window.location.hash).toBe('');
    expect(document.body.textContent).not.toMatch(/prototype|presenter|demo|halloween|supervised|💞|❤|💕/i);
  });

  it('says so when registration is not open', () => {
    config.submissionEndpoint = null;
    open('');
    expect(screen.getByText(/Registration isn’t open yet\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preview/ })).toBeInTheDocument();
  });

  it('says so when the backend is closed', async () => {
    accepting = false;
    open('');
    expect(await screen.findByRole('button', { name: /Preview/ })).toBeInTheDocument();
    expect(screen.getByText(/Registration isn’t open yet\./)).toBeInTheDocument();
  });

  it('stays usable when the open-or-closed check fails', async () => {
    accepting = null;
    open('');
    expect(await screen.findByRole('button', { name: /Start Your Friendship Quest/ })).toBeEnabled();
  });

  it('links feedback from the page and the footer', () => {
    open('');
    const links = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '#/help-us-improve');
    expect(links.length).toBeGreaterThanOrEqual(3);
    const footer = within(screen.getByRole('contentinfo'));
    expect(footer.getByText('Friendship Quest by Friends Across Campus')).toBeInTheDocument();
    expect(footer.getByText('Built for University of Alberta students.')).toBeInTheDocument();
    expect(footer.getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument();
  });
});

describe('level 1', () => {
  it('takes any valid email, and blocks invalid ones', async () => {
    open('#/quest/contact');
    await userEvent.type(screen.getByLabelText('First name'), 'Testy');
    const email = screen.getByLabelText(/Email address/);
    await userEvent.click(screen.getByRole('checkbox', { name: /University of Alberta student/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /community guidelines/ }));
    const next = screen.getByRole('button', { name: /Complete level/ });
    for (const [value, ok] of [['someone@gmail', false], ['someone@gmail.com', true], ['x@ualberta.ca', true], ['x@hotmail.com', true], ['x y@z.ca', false]] as const) {
      await userEvent.clear(email);
      await userEvent.type(email, value);
      await userEvent.tab();
      if (ok) expect(next).toBeEnabled();
      else expect(next).toBeDisabled();
      expect(email).toHaveAttribute('aria-invalid', String(!ok));
    }
    expect(document.body.textContent).not.toMatch(/verif|one-time code/i);
  });
});

describe('feedback', () => {
  it('sends an anonymous suggestion and confirms only after the backend does', async () => {
    fetchMock.mockImplementation(succeed);
    open('#/help-us-improve');
    await userEvent.type(screen.getByLabelText('Your suggestion'), 'More badges please');
    await userEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));
    expect(await screen.findByText(/Thank you for helping us improve Friendship Quest!/)).toBeInTheDocument();
    expect(sent(0)).toMatchObject({ kind: 'feedback', payload: { email: '', category: '', suggestion: 'More badges please' } });
  });

  it('sends category and email when given', async () => {
    fetchMock.mockImplementation(succeed);
    open('#/help-us-improve');
    await userEvent.type(screen.getByLabelText('Your suggestion'), 'A synthetic bug report');
    await userEvent.selectOptions(screen.getByLabelText(/Category/), 'Bug or technical issue');
    await userEvent.type(screen.getByLabelText(/^Email/), 'tester@outlook.com');
    await userEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));
    await screen.findByText('Feedback received');
    expect(sent(0).payload).toMatchObject({ category: 'bug', email: 'tester@outlook.com' });
  });

  it('keeps the text when sending fails', async () => {
    fetchMock.mockImplementationOnce(fail('BUSY')).mockImplementation(succeed);
    open('#/help-us-improve');
    await userEvent.type(screen.getByLabelText('Your suggestion'), 'Keep this text');
    await userEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/wasn’t sent/);
    expect(screen.getByLabelText('Your suggestion')).toHaveValue('Keep this text');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Feedback received');
    expect(sent(1).payload.submissionKey).toBe(sent(0).payload.submissionKey);
  });

  it('validates before sending', async () => {
    open('#/help-us-improve');
    await userEvent.type(screen.getByLabelText('Your suggestion'), 'hi');
    await userEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));
    expect(screen.getByText(/at least 5 characters/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Your suggestion'), ' there everyone');
    await userEvent.type(screen.getByLabelText(/^Email/), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Submit Feedback' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is unavailable without a backend', () => {
    config.submissionEndpoint = null;
    open('#/help-us-improve');
    expect(screen.getByRole('button', { name: 'Submit Feedback' })).toBeDisabled();
  });
});
