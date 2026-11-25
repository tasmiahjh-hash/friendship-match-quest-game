// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { createBackend } from '../support/fakeAppsScript.mjs';
import { feedback, registration } from '../support/payloads.mjs';

/** MOCKED Google services, REAL Code.gs. See tests/support/fakeAppsScript.mjs. */
let b: ReturnType<typeof createBackend>;
const rows = () => b.sheet('Student Responses')!.records();
const tips = () => b.sheet('Website Suggestions')!.records();

beforeEach(() => {
  b = createBackend();
});

describe('setup', () => {
  it('creates the four tabs', () => {
    expect([...b.sheets.keys()]).toEqual(['Student Responses', 'Website Suggestions', 'Match Management', 'Dashboard']);
  });

  it('is safe to run twice and keeps student rows', () => {
    b.post('registration', registration());
    b.context.setupSpreadsheet();
    expect(rows()).toHaveLength(1);
  });

  it('builds the dashboard from formulas', () => {
    const f = b.sheet('Dashboard')!.formulas();
    expect(f).toHaveLength(6 + 4 + 1);
    expect(f.every((x) => x.startsWith('='))).toBe(true);
  });

  it('refuses to touch a sheet whose required columns are gone', () => {
    b.sheet('Student Responses')!.cell(1, 5).value = 'Something else';
    expect(() => b.context.setupSpreadsheet()).toThrow(/Missing column/);
    expect(b.post('registration', registration())).toMatchObject({ ok: false, error: { code: 'SERVER' } });
  });

  it('still saves correctly when an administrator reorders or adds columns', () => {
    const s = b.sheet('Student Responses')!;
    const a = s.cell(1, 4).value;
    s.cell(1, 4).value = s.cell(1, 5).value;
    s.cell(1, 5).value = a;
    s.maxCols = 40;
    s.cell(1, 33).value = 'Admin Notes';
    expect(b.post('registration', registration()).ok).toBe(true);
    expect(rows()[0]).toMatchObject({ 'First Name': 'Testy', Email: 'testy.mctest@ualberta.ca', 'Admin Notes': '' });
  });

  it('adds match rows with default statuses and leaves the date column as a date', () => {
    b.context.addMatchRow();
    const s = b.sheet('Match Management')!;
    expect(s.records()[0]).toMatchObject({ 'Match Status': 'Proposed', 'First Student Consent': 'Not Asked', 'Notification Status': 'Not Sent' });
    expect(s.records()[0]['Match ID']).toMatch(/^FM-/);
    expect(s.cell(2, 8).format).toBe('yyyy-mm-dd');
  });
});

describe('registration', () => {
  it('stores every answer and confirms with a server-made id and timestamp', () => {
    const p = registration({ instagram: '@testy.test', email: '  testy.mctest@ualberta.ca ' });
    const res = b.post('registration', p);
    expect(res).toMatchObject({ ok: true, kind: 'registration', submissionKey: p.submissionKey });
    expect(res.data.registrationId).toMatch(/^FQ-[0-9A-Z]{8}$/);
    const [row] = rows();
    expect(row).toMatchObject({
      'Registration ID': res.data.registrationId,
      'Matching Status': 'Pending',
      'First Name': 'Testy',
      Email: 'testy.mctest@ualberta.ca',
      University: 'University of Alberta',
      Campus: 'University of Alberta — North Campus (Main Campus)',
      'Campus ID': 'ualberta-north',
      Program: 'Synthetic Studies',
      'Year of Study': '2nd year',
      Courses: 'TEST 101',
      Avatar: '🦊',
      Instagram: '@testy.test',
      Interests: 'Gaming, Anime, Music, Food',
      'Friday Night': 'Cozy night in',
      'Planning Style': 'Spreadsheet ready',
      'Texting Style': 'Quality check-ins',
      'Group Size': 'Small crew',
      'Friendship Values': 'Loyalty',
      'Meeting Comfort': 'Either works',
      'Campus Match Preference': 'My campus',
      'Activities Enjoyed': 'Games Night',
      Availability: 'Weekday evenings',
      'Consent Given': 'Yes',
      'Privacy Policy Version': '2026-11-24',
      'Schema Version': '1',
    });
    expect(Object.prototype.toString.call(row['Submitted At'])).toBe('[object Date]');
    const { submissionKey: _k, trap: _t, ...answers } = p;
    expect(JSON.parse(row['Answers JSON'])).toEqual({ ...answers, email: 'testy.mctest@ualberta.ca' });
  });

  it.each(['ualberta-north', 'ualberta-augustana', 'ualberta-saint-jean', 'ualberta-south'])('accepts campus %s', (campusId) => {
    expect(b.post('registration', registration({ campusId })).ok).toBe(true);
    expect(rows()[0]['Campus ID']).toBe(campusId);
  });

  it.each(['a@ualberta.ca', 'a.b+c@gmail.com', 'x@outlook.com', 'x@hotmail.com', 'x@mail.example-domain.co.uk'])('accepts email %s', (email) => {
    expect(b.post('registration', registration({ email })).ok).toBe(true);
  });

  it.each(['', '   ', 'nope', 'a@b', 'a@@b.ca', 'a b@c.ca', '@ualberta.ca', 'a..b@c.ca', 'a@-c.ca', `${'a'.repeat(65)}@c.ca`, 'a@c.ca\nBcc: x@y.ca', null, 5, {}])(
    'rejects email %j',
    (email) => {
      const res = b.post('registration', registration({ email }));
      expect(res).toMatchObject({ ok: false, error: { code: 'VALIDATION', fields: ['email'] } });
      expect(rows()).toHaveLength(0);
    },
  );

  it.each([
    ['campusId', 'mit'],
    ['campusId', 'constructor'],
    ['universityId', 'other'],
    ['year', '9th'],
    ['avatar', '=1'],
    ['interests', ['gaming']],
    ['interests', ['gaming', 'gaming', 'anime', 'music']],
    ['interests', ['gaming', 'anime', 'music', '__proto__']],
    ['interests', 'gaming'],
    ['styleAnswers', null],
    ['hangouts', ['halloween-social']],
    ['availability', [1]],
    ['courses', Array(7).fill('A 1')],
    ['courses', ['x'.repeat(17)]],
    ['instagram', '@bad handle'],
    ['firstName', ' '],
    ['firstName', 'x'.repeat(31)],
    ['program', ''],
    ['consent', false],
    ['consent', 'true'],
    ['studentAttestation', false],
    ['guidelinesAccepted', undefined],
    ['privacyPolicyVersion', 'latest'],
    ['schemaVersion', 2],
    ['submissionKey', 'guessable'],
  ])('rejects a bad %s', (field, value) => {
    expect(b.post('registration', registration({ [field]: value }))).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    expect(rows()).toHaveLength(0);
  });

  it('requires an activity when the student prefers meeting in person', () => {
    expect(b.post('registration', registration({ meetPreference: 'event', hangouts: [] })).ok).toBe(false);
  });

  it('never stores unknown extra fields', () => {
    b.post('registration', { ...registration(), studentNumber: '1234567', isAdmin: true });
    expect(JSON.stringify(rows())).not.toMatch(/1234567|isAdmin/);
  });
});

describe('duplicates', () => {
  it('returns the same receipt for a retried submission', () => {
    const p = registration();
    const first = b.post('registration', p);
    expect(b.post('registration', p)).toEqual(first);
    expect(rows()).toHaveLength(1);
  });

  it('refuses a reused key with different answers', () => {
    const p = registration();
    b.post('registration', p);
    expect(b.post('registration', { ...p, firstName: 'Changed' })).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(rows()[0]['First Name']).toBe('Testy');
  });

  it('keeps a second registration for the same email but flags it, without telling the visitor', () => {
    const first = b.post('registration', registration());
    const second = b.post('registration', registration({ email: 'TESTY.mctest@UALBERTA.ca' }));
    const third = b.post('registration', registration());
    expect(Object.keys(second.data).sort()).toEqual(Object.keys(first.data).sort());
    expect(rows().map((r) => r['Possible Duplicate Of'])).toEqual(['', first.data.registrationId, first.data.registrationId]);
    expect(third.ok).toBe(true);
  });
});

describe('formula injection', () => {
  it.each(['=IMPORTXML("http://evil.test","//a")', '+1+1', '-1+1', '@SUM(A1)', '  =1+1', '\t=1+1', '|cmd', '%0A=1'])('neutralises %j', (text) => {
    expect(b.post('registration', registration({ firstName: text.slice(0, 30), program: text, courses: [text.slice(0, 16)] })).ok).toBe(true);
    expect(b.post('feedback', feedback({ suggestion: `${text} padding` })).ok).toBe(true);
    expect(b.sheet('Student Responses')!.formulas()).toEqual([]);
    expect(b.sheet('Website Suggestions')!.formulas()).toEqual([]);
  });

  it('neutralises an email that begins like a formula', () => {
    expect(b.post('registration', registration({ email: '=cmd@evil.ca' })).ok).toBe(true);
    expect(b.sheet('Student Responses')!.formulas()).toEqual([]);
  });

  it('stores text columns as plain text, so nothing is reinterpreted as a date or number', () => {
    b.post('registration', registration({ program: '1/2' }));
    const s = b.sheet('Student Responses')!;
    expect(s.cell(2, 9)).toMatchObject({ value: '1/2', format: '@' });
  });

  it('strips control and text-direction characters', () => {
    b.post('registration', registration({ firstName: `Te${String.fromCharCode(0x202e)}st${String.fromCharCode(0)}y` }));
    expect(rows()[0]['First Name']).toBe('Te st y');
  });
});

describe('feedback', () => {
  it('accepts an anonymous suggestion with no category', () => {
    const res = b.post('feedback', feedback({ category: '' }));
    expect(res.data.suggestionId).toMatch(/^FB-[0-9A-Z]{8}$/);
    expect(tips()[0]).toMatchObject({ Email: '', Category: '', 'Review Status': 'New', Suggestion: 'A synthetic suggestion for testing.' });
  });

  it('accepts an identified suggestion', () => {
    expect(b.post('feedback', feedback({ email: 'tester@gmail.com', category: 'bug' })).ok).toBe(true);
    expect(tips()[0]).toMatchObject({ Email: 'tester@gmail.com', Category: 'Bug or technical issue' });
  });

  it.each([
    ['suggestion', 'hi'],
    ['suggestion', 'x'.repeat(1501)],
    ['email', 'nope'],
    ['category', 'toString'],
  ])('rejects a bad %s', (field, value) => {
    expect(b.post('feedback', feedback({ [field]: value }))).toMatchObject({ ok: false, error: { code: 'VALIDATION', fields: [field] } });
  });

  it('does not record a retry twice', () => {
    const p = feedback();
    expect(b.post('feedback', p)).toEqual(b.post('feedback', p));
    expect(tips()).toHaveLength(1);
  });
});

describe('abuse and failure handling', () => {
  it('rejects a filled honeypot instead of pretending it worked', () => {
    expect(b.post('registration', registration({ trap: 'http://spam.test' }))).toMatchObject({ ok: false, error: { code: 'REJECTED' } });
    expect(rows()).toHaveLength(0);
  });

  it.each(['', 'not json', '[]', 'null', '{"kind":"registration"}', '{"kind":"list","payload":{}}', '{"kind":"__proto__","payload":{}}'])(
    'rejects malformed body %j',
    (body) => expect(b.raw(body)).toMatchObject({ ok: false, error: { code: 'VALIDATION' } }),
  );

  it('rejects oversized bodies, including multi-byte ones', () => {
    expect(b.raw(JSON.stringify({ kind: 'feedback', payload: feedback({ pad: 'x'.repeat(21000) }) })).ok).toBe(false);
    expect(b.raw(JSON.stringify({ kind: 'feedback', payload: feedback({ pad: '🦊'.repeat(6000) }) })).ok).toBe(false);
  });

  it('limits submissions per minute but still answers retries', () => {
    b = createBackend({ properties: { MAX_PER_MINUTE: '2' } });
    const p = registration({ email: 'a@x.ca' });
    b.post('registration', p);
    b.post('registration', registration({ email: 'b@x.ca' }));
    expect(b.post('registration', registration({ email: 'c@x.ca' }))).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    expect(b.post('registration', p).ok).toBe(true);
  });

  it('limits repeat submissions per email', () => {
    for (let i = 0; i < 3; i++) expect(b.post('registration', registration()).ok).toBe(true);
    expect(b.post('registration', registration())).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('keeps no raw email address in the cache', () => {
    b.post('registration', registration());
    expect([...b.cache.keys()].join()).not.toContain('testy');
  });

  describe('while closed', () => {
    beforeEach(() => {
      b.props.ACCEPTING_SUBMISSIONS = 'false';
    });

    it('refuses registrations and suggestions, saves nothing, and says so', () => {
      expect(b.post('registration', registration())).toMatchObject({ ok: false, error: { code: 'CLOSED' } });
      expect(b.post('feedback', feedback())).toMatchObject({ ok: false, error: { code: 'CLOSED' } });
      expect([...rows(), ...tips()]).toEqual([]);
      expect(b.get()).toEqual({ ok: true, service: 'friendship-quest', accepting: false });
    });

    it('lets only the listed test addresses through', () => {
      b.props.TEST_EMAILS = ' fq-test-9z@example.com , other@example.com ';
      expect(b.post('registration', registration({ email: 'FQ-test-9z@example.com' })).ok).toBe(true);
      expect(b.post('feedback', feedback({ email: 'other@example.com' })).ok).toBe(true);
      for (const email of ['fq-test-9z@example.co', 'x@example.com', ',@example.com']) {
        expect(b.post('registration', registration({ email })).ok).toBe(false);
      }
      expect(b.post('feedback', feedback()).ok).toBe(false);
      expect(rows()).toHaveLength(1);
    });

    it('lets nobody through when the list is empty or only commas', () => {
      b.props.TEST_EMAILS = ' , ,';
      expect(b.post('feedback', feedback({ email: '' })).ok).toBe(false);
      expect(b.post('registration', registration()).ok).toBe(false);
    });

    it('never reveals the test addresses', () => {
      b.props.TEST_EMAILS = 'fq-test-9z@example.com';
      expect(JSON.stringify([b.get(), b.post('registration', registration())])).not.toContain('fq-test');
    });

    it('opens again without a redeploy', () => {
      b.props.ACCEPTING_SUBMISSIONS = 'true';
      expect(b.post('registration', registration()).ok).toBe(true);
    });
  });

  it('reports busy when the lock is taken, and always releases it', () => {
    b.state.lockBusy = true;
    expect(b.post('registration', registration())).toMatchObject({ error: { code: 'BUSY' } });
    b.state.lockBusy = false;
    b.post('registration', registration());
    expect(b.state.locked).toBe(false);
  });

  it('does not claim success when the write did not stick', () => {
    b.sheet('Student Responses')!.failWrites = true;
    expect(b.post('registration', registration())).toMatchObject({ ok: false, error: { code: 'SERVER' } });
    expect(b.state.locked).toBe(false);
  });

  it('hides internal details from visitors and personal data from logs', () => {
    b.props.SPREADSHEET_ID = 'secret-id';
    const res = JSON.stringify(b.post('registration', registration()));
    expect(res).toBe('{"ok":false,"error":{"code":"SERVER","fields":[]}}');
    expect(b.logs.join()).not.toMatch(/secret-id|testy/i);
  });

  it('grows the sheet past its initial rows', () => {
    b.sheet('Student Responses')!.maxRows = 2;
    expect(b.post('registration', registration({ email: 'a@x.ca' })).ok).toBe(true);
    expect(b.post('registration', registration({ email: 'b@x.ca' })).ok).toBe(true);
    expect(rows()).toHaveLength(2);
  });
});

describe('unauthorized retrieval', () => {
  it('GET never returns data, whatever is asked for', () => {
    b.post('registration', registration());
    const queries: Record<string, string>[] = [{}, { action: 'list' }, { id: rows()[0]['Registration ID'] as string }, { sheet: 'Student Responses' }];
    for (const q of queries) {
      expect(b.get(q)).toEqual({ ok: true, service: 'friendship-quest', accepting: true });
    }
  });

  it.each(['list', 'read', 'get', 'update', 'delete', 'setupSpreadsheet', 'addMatchRow'])('POST kind %s is refused', (kind) => {
    expect(b.post(kind, registration())).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it('a wrong submission key never reveals an existing registration', () => {
    const saved = b.post('registration', registration());
    const other = b.post('registration', registration());
    expect(JSON.stringify(other)).not.toContain(saved.data.registrationId);
  });
});
