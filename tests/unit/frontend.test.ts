import { describe, expect, it, vi } from 'vitest';
import { parseContact, parseEndpoint } from '../../src/config';
import { createGoogleSheetsAdapter } from '../../src/services/submission/googleSheetsAdapter';
import { scoreCompatibility } from '../../src/services/matching/compatibility';
import { allLevelsComplete, deriveStage, gameReducer, hydrate, initialState, LEVEL_ORDER } from '../../src/state/gameLogic';
import { parseRoute, questEntry, redirectFor } from '../../src/state/router';
import { incompleteLevels } from '../../src/state/validation';
import { isValidEmail, isValidInstagram, normaliseInstagram, uuid } from '../../src/utils';
import { registration } from '../support/payloads.mjs';

describe('email validation', () => {
  it.each(['a@ualberta.ca', 'First.Last@ualberta.ca', 'x+tag@gmail.com', 'x@outlook.com', 'x@hotmail.com', 'x@proton.me', '  spaced@gmail.com  '])(
    'accepts %j',
    (e) => expect(isValidEmail(e)).toBe(true),
  );
  it.each(['', ' ', 'plain', 'a@', '@b.ca', 'a@b', 'a@b.c', 'a b@c.ca', 'a@b..ca', 'a@.ca', '.a@b.ca', 'a.@b.ca', 'a@b.ca,c@d.ca', '<a@b.ca>'])(
    'rejects %j',
    (e) => expect(isValidEmail(e)).toBe(false),
  );
});

describe('instagram', () => {
  it('is optional and normalised', () => {
    expect(isValidInstagram('')).toBe(true);
    expect(isValidInstagram('has space')).toBe(false);
    expect(normaliseInstagram(' @@me ')).toBe('@me');
  });
});

describe('configuration', () => {
  it.each([undefined, '', 'not a url', 'http://example.org/exec', 'javascript:alert(1)', 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'])(
    'treats %j as unconfigured',
    (v) => expect(parseEndpoint(v)).toBeNull(),
  );
  it('accepts a real https endpoint and local development', () => {
    expect(parseEndpoint(' https://script.google.com/macros/s/AKfycb123/exec ')).toBe('https://script.google.com/macros/s/AKfycb123/exec');
    expect(parseEndpoint('http://localhost:8787/exec')).not.toBeNull();
  });
  it('ignores placeholder contact addresses', () => {
    expect(parseContact('fac-contact@example.org')).toBeNull();
    expect(parseContact('team@fac.ca')).toBe('team@fac.ca');
  });
});

describe('storage adapter', () => {
  const ok = (body: unknown) => vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body)));
  const p = registration();
  const good = { ok: true, kind: 'registration', submissionKey: p.submissionKey, data: { registrationId: 'FQ-ABCD2345', submittedAt: '2026-11-24T00:00:00.000Z' } };
  const submit = (f: unknown, ms?: number) => createGoogleSheetsAdapter('https://x.test/exec', f as typeof fetch, ms).submitRegistration(p);

  it('sends a CORS simple request and never uses no-cors', async () => {
    const f = ok(good);
    await expect(submit(f)).resolves.toEqual(good.data);
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init).toMatchObject({ method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    expect(Object.keys(init.headers as object)).toEqual(['Content-Type']);
  });

  it.each([
    ['an HTML error page', '<html></html>'],
    ['an empty body', ''],
    ['a bare ok', { ok: true }],
    ['another submission’s reply', { ...good, submissionKey: 'other' }],
    ['a feedback reply', { ...good, kind: 'feedback' }],
    ['a malformed id', { ...good, data: { ...good.data, registrationId: '123' } }],
    ['a missing timestamp', { ...good, data: { registrationId: 'FQ-ABCD2345' } }],
    ['null', null],
  ])('does not accept %s as success', async (_n, body) => {
    await expect(submit(ok(body))).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('does not accept an opaque response as success', async () => {
    const opaque = Object.defineProperty(new Response(null), 'ok', { value: false });
    await expect(submit(async () => opaque)).rejects.toMatchObject({ name: 'SubmissionError' });
  });

  it('passes on backend error codes and hides unknown ones', async () => {
    await expect(submit(ok({ ok: false, error: { code: 'RATE_LIMITED' } }))).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(submit(ok({ ok: false, error: { code: 'toString', message: 'stack' } }))).rejects.toMatchObject({ code: 'SERVER' });
  });

  it('reports network failures and timeouts', async () => {
    await expect(submit(async () => Promise.reject(new TypeError('Failed to fetch')))).rejects.toMatchObject({ code: 'NETWORK' });
    const hang = (_u: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))));
    await expect(submit(hang, 10)).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});

describe('routing', () => {
  it('parses every route and tolerates odd hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/privacy/')).toEqual({ name: 'privacy' });
    expect(parseRoute('#/quest/campus?x=1')).toEqual({ name: 'level', level: 'campus' });
    expect(parseRoute('#/match-room')).toEqual({ name: 'not-found' });
    expect(parseRoute('#/speed-dating')).toEqual({ name: 'not-found' });
  });

  it('cannot skip levels, the review, or fake a completion page', () => {
    const s = initialState();
    expect(redirectFor(parseRoute('#/quest/meet'), s)).toBe('/quest/contact');
    expect(redirectFor(parseRoute('#/quest/review'), s)).toBe('/quest/contact');
    expect(redirectFor(parseRoute('#/quest/complete'), s)).toBe('/quest/contact');
    const done = { ...s, receipt: { registrationId: 'FQ-ABCD2345', submittedAt: '' } };
    expect(redirectFor(parseRoute('#/quest/review'), done)).toBe('/quest/complete');
    expect(questEntry(done)).toBe('/quest/complete');
  });
});

describe('game state', () => {
  it('follows the required order', () => expect(LEVEL_ORDER).toEqual(['contact', 'campus', 'style', 'vibe', 'meet']));

  it('awards each level once', () => {
    let s = gameReducer(initialState(), { type: 'COMPLETE_LEVEL', level: 'contact' });
    const xp = s.xp;
    s = gameReducer(s, { type: 'COMPLETE_LEVEL', level: 'contact' });
    expect(s.xp).toBe(xp);
  });

  it('only counts as registered with a receipt, then drops personal details', () => {
    let s = initialState();
    for (const level of LEVEL_ORDER) s = gameReducer(s, { type: 'COMPLETE_LEVEL', level });
    expect(allLevelsComplete(s)).toBe(true);
    expect(deriveStage(s)).toBe('quest-complete');
    s = gameReducer(s, { type: 'UPDATE_CONTACT', patch: { firstName: 'Testy', email: 'testy@ualberta.ca', instagram: '@t' } });
    s = gameReducer(s, { type: 'REGISTERED', receipt: { registrationId: 'FQ-ABCD2345', submittedAt: '2026-11-24T00:00:00Z' } });
    expect(deriveStage(s)).toBe('registered');
    expect(JSON.stringify(s)).not.toMatch(/testy@|@t"/);
  });

  it('survives corrupt, old or hostile saved data', () => {
    for (const bad of [null, 5, 'x', [], { profile: 1 }, { profile: { interests: 'x', campus: null, styleAnswers: { night: 'nope' } }, xp: 'NaN', completedLevels: ['room'] }]) {
      const s = hydrate(bad);
      expect(s.completedLevels).toEqual([]);
      expect(s.xp).toBe(0);
      expect(s.profile.styleAnswers).toEqual({});
    }
    expect(hydrate({ profile: { campus: { campusId: 'maple', universityId: 'maple' } } }).profile.campus.campusId).toBeNull();
  });

  it('lists everything missing from an empty profile', () => expect(incompleteLevels(initialState().profile)).toEqual(LEVEL_ORDER));

  it('makes valid v4 keys', () => expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab]/));
});

describe('compatibility scoring (kept for later)', () => {
  it('is symmetric and rewards similarity', () => {
    const a = { interests: ['gaming', 'anime'], styleAnswers: { night: 'quiet' }, hangoutIds: ['games-night'], meetPreference: 'either' as const };
    const b = { interests: ['gym', 'travel'], styleAnswers: { night: 'social' }, hangoutIds: [], meetPreference: 'event' as const };
    expect(scoreCompatibility(a, b)).toMatchObject({ score: scoreCompatibility(b, a).score });
    expect(scoreCompatibility(a, a).score).toBeGreaterThan(scoreCompatibility(a, b).score);
  });
});
