/**
 * Friendship Quest: submission endpoint and spreadsheet setup.
 *
 * Friends Across Campus (FAC) · runs as a Google Apps Script web app.
 * Setup and deployment: integrations/google-sheets/README.md
 *
 * What the public can do: POST a registration, POST a suggestion, and GET a fixed
 * reply saying whether submissions are open. Nothing reachable by doGet or doPost reads a row back, lists
 * rows, changes a row or deletes a row.
 *
 * Function names ending in "_" are private to this script. The others are for an
 * administrator to run from the editor or the spreadsheet menu; web visitors can
 * only reach doGet and doPost.
 *
 * Script Properties (Project Settings > Script Properties):
 *   SPREADSHEET_ID         required  id of the private spreadsheet
 *   ACCEPTING_SUBMISSIONS  optional  "false" closes submissions to the public
 *   TEST_EMAILS            optional  comma-separated addresses that can still submit while closed
 *   MAX_PER_MINUTE         optional  submissions accepted per minute, all visitors (default 30)
 *   MAX_PER_DAY            optional  submissions accepted per UTC day (default 1500)
 *   MAX_PER_EMAIL          optional  submissions per email per 6 hours (default 3)
 */

// ---------------------------------------------------------------------------
// Questionnaire catalogue. Must match src/data/*.ts in the website; the test
// suite (tests/unit/catalog.test.ts) fails when they drift apart.
// ---------------------------------------------------------------------------

var SCHEMA_VERSION = 1;

var CATALOG = {
  university: { ualberta: 'University of Alberta' },
  campus: {
    'ualberta-north': 'University of Alberta — North Campus (Main Campus)',
    'ualberta-augustana': 'University of Alberta — Augustana Campus',
    'ualberta-saint-jean': 'University of Alberta — Campus Saint-Jean',
    'ualberta-south': 'University of Alberta — South Campus'
  },
  year: { '1st': '1st year', '2nd': '2nd year', '3rd': '3rd year', '4th': '4th year', '5th+': '5th+ year', Grad: 'Grad' },
  avatar: ['🦊', '🐼', '🦉', '🐸', '🐧', '🦦', '🐨', '🦋'],
  interests: {
    gaming: 'Gaming', gym: 'Gym', badminton: 'Badminton', movies: 'Movies', anime: 'Anime', reading: 'Reading',
    cafes: 'Cafés', food: 'Food', music: 'Music', art: 'Art', crafts: 'Crafts', studying: 'Studying',
    parties: 'Parties', outdoors: 'Outdoors', travel: 'Travel', photography: 'Photography'
  },
  style: {
    night: { quiet: 'Cozy night in', mix: 'Depends on the mood', social: 'Big social event' },
    planning: { planner: 'Spreadsheet ready', spontaneous: 'Let’s just go' },
    texting: { frequent: 'Constant memes', occasional: 'Quality check-ins' },
    group: { 'one-on-one': 'One-on-one', small: 'Small crew', group: 'Big group' },
    values: { loyalty: 'Loyalty', humour: 'Humour', growth: 'Growth', adventure: 'Adventure' }
  },
  meetPreference: { 'chat-first': 'Message first', event: 'Meet in person', either: 'Either works' },
  campusMatch: { 'same-campus': 'My campus', 'any-campus': 'Any U of A campus' },
  hangouts: { 'craft-connect': 'Craft & Connect', 'karaoke-night': 'Karaoke Night', 'seasonal-social': 'Seasonal Social', 'games-night': 'Games Night' },
  availability: {
    'weekday-mornings': 'Weekday mornings', 'weekday-afternoons': 'Weekday afternoons', 'weekday-evenings': 'Weekday evenings',
    'weekend-days': 'Weekend days', 'weekend-evenings': 'Weekend evenings'
  },
  feedbackCategory: {
    feature: 'New feature idea', matching: 'Matching experience', design: 'Website design',
    accessibility: 'Accessibility', bug: 'Bug or technical issue', other: 'Other'
  }
};

var LIMITS = {
  bodyBytes: 20000,
  firstName: 30,
  email: 254,
  program: 60,
  course: 16,
  courses: 6,
  minInterests: 4,
  maxInterests: 8,
  minSuggestion: 5,
  maxSuggestion: 1500
};

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

var SHEETS = { responses: 'Student Responses', suggestions: 'Website Suggestions', matches: 'Match Management', dashboard: 'Dashboard' };

var MATCHING_STATUSES = ['Pending', 'In Review', 'Match Proposed', 'Matched', 'Paused', 'Withdrawn'];
var MATCH_STATUSES = ['Proposed', 'Awaiting Consent', 'Confirmed', 'Declined', 'Closed'];
var CONSENT_STATUSES = ['Not Asked', 'Asked', 'Yes', 'No'];
var NOTIFICATION_STATUSES = ['Not Sent', 'First Student Notified', 'Second Student Notified', 'Both Notified'];
var REVIEW_STATUSES = ['New', 'Reviewed', 'Planned', 'Done', 'Declined'];

var RESPONSE_HEADERS = [
  'Registration ID', 'Submitted At', 'Matching Status', 'First Name', 'Email', 'University', 'Campus', 'Campus ID',
  'Program', 'Year of Study', 'Courses', 'Avatar', 'Instagram',
  'Interests',
  'Friday Night', 'Planning Style', 'Texting Style', 'Group Size', 'Friendship Values',
  'Meeting Comfort', 'Campus Match Preference', 'Activities Enjoyed', 'Availability',
  'Student Self-Attestation', 'Guidelines Agreed', 'Consent Given', 'Privacy Policy Version',
  'Possible Duplicate Of', 'Schema Version', 'Submission Key', 'Answers Hash', 'Answers JSON'
];
var SUGGESTION_HEADERS = ['Suggestion ID', 'Timestamp', 'Email', 'Category', 'Suggestion', 'Review Status', 'Submission Key', 'Suggestion Hash'];
var MATCH_HEADERS = [
  'Match ID', 'First Registration ID', 'Second Registration ID', 'Match Status', 'First Student Consent', 'Second Student Consent',
  'Notification Status', 'Date Matched', 'Administrator Notes'
];

// ---------------------------------------------------------------------------
// Public endpoint
// ---------------------------------------------------------------------------

function doGet() {
  return json_({ ok: true, service: 'friendship-quest', accepting: isAccepting_() });
}

/**
 * The body is JSON sent as text/plain, because Apps Script cannot answer the CORS
 * preflight that application/json would trigger. Every path must end in json_():
 * an uncaught error would become an HTML page the website can't read.
 */
function doPost(e) {
  var stage = 'parse';
  try {
    var request = parseRequest_(e);
    stage = 'validate';
    var clean = request.kind === 'registration' ? validateRegistration_(request.payload) : validateFeedback_(request.payload);

    var email = request.kind === 'registration' ? clean.answers.email : clean.email;
    if (!isAccepting_() && !isTestEmail_(email)) throw failure_('CLOSED');

    stage = 'lock';
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw failure_('BUSY');
    try {
      stage = 'save';
      var data = request.kind === 'registration' ? saveRegistration_(clean) : saveFeedback_(clean);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, kind: request.kind, submissionKey: clean.submissionKey, data: data });
  } catch (err) {
    if (err && err.isFailure) return json_({ ok: false, error: { code: err.code, fields: err.fields } });
    // Never log the message or the request: they can contain personal information.
    console.error('Friendship Quest: unexpected ' + (err && err.name ? err.name : 'error') + ' during ' + stage);
    return json_({ ok: false, error: { code: 'SERVER', fields: [] } });
  }
}

function isAccepting_() {
  return property_('ACCEPTING_SUBMISSIONS', 'true').toLowerCase() !== 'false';
}

/**
 * While closed, administrators can still test the real site with these addresses.
 * Choose one that can't be guessed, and empty the property when testing is done.
 */
function isTestEmail_(email) {
  if (!email) return false;
  return property_('TEST_EMAILS', '')
    .split(',')
    .some(function (t) { return t.trim() !== '' && t.trim().toLowerCase() === email.toLowerCase(); });
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/** An expected failure. Only the code and field names ever reach the visitor. */
function failure_(code, fields) {
  var err = new Error(code);
  err.isFailure = true;
  err.code = code;
  err.fields = fields || [];
  return err;
}

function parseRequest_(e) {
  var raw = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
  if (!raw) throw failure_('VALIDATION', ['body']);
  // A JavaScript character is at most 3 UTF-8 bytes, so check length cheaply before counting bytes.
  if (raw.length > LIMITS.bodyBytes || Utilities.newBlob(raw).getBytes().length > LIMITS.bodyBytes) throw failure_('VALIDATION', ['body']);
  var body;
  try {
    body = JSON.parse(raw);
  } catch (ignored) {
    throw failure_('VALIDATION', ['body']);
  }
  if (!isObject_(body) || !isObject_(body.payload)) throw failure_('VALIDATION', ['body']);
  if (body.kind !== 'registration' && body.kind !== 'feedback') throw failure_('VALIDATION', ['kind']);
  // Honeypot. Answer with an error rather than a fake success, so a student whose
  // browser extension filled the hidden field is told instead of silently dropped.
  if (body.payload.trap) throw failure_('REJECTED');
  return { kind: body.kind, payload: body.payload };
}

// ---------------------------------------------------------------------------
// Validation. Unknown fields are ignored; nothing is stored that isn't listed here.
// ---------------------------------------------------------------------------

function isObject_(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function has_(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** Trims, and turns control, zero-width and bidi-override characters into spaces. */
function cleanText_(v, keepNewlines) {
  if (typeof v !== 'string') return '';
  var s = v.replace(/\r\n?/g, '\n');
  if (!keepNewlines) s = s.replace(/\n/g, ' ');
  return s
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B\u200E\u200F\u2028-\u202E\u2060\u2066-\u2069\uFEFF]/g, ' ')
    .trim();
}

/** Mirrors isValidEmail in src/utils/email.ts. */
function isValidEmail_(email) {
  if (!email || email.length > LIMITS.email) return false;
  var at = email.lastIndexOf('@');
  var local = email.slice(0, at);
  var domain = email.slice(at + 1);
  if (at < 1 || local.length > 64) return false;
  if (!/^[^\s@<>()[\]\\,;:"]+$/.test(local) || /^\.|\.$|\.\./.test(local)) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain);
}

function isKey_(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v);
}

function validator_() {
  var bad = [];
  return {
    check: function (field, ok) {
      if (!ok) bad.push(field);
    },
    choice: function (field, value, options) {
      if (typeof value === 'string' && has_(options, value)) return value;
      bad.push(field);
      return '';
    },
    choices: function (field, value, options, min, max) {
      var ok =
        Array.isArray(value) &&
        value.length >= min &&
        value.length <= max &&
        value.every(function (v, i) {
          return typeof v === 'string' && has_(options, v) && value.indexOf(v) === i;
        });
      if (ok) return value.slice();
      bad.push(field);
      return [];
    },
    done: function () {
      if (bad.length) throw failure_('VALIDATION', bad);
    }
  };
}

function validateRegistration_(p) {
  var v = validator_();
  v.check('schemaVersion', p.schemaVersion === SCHEMA_VERSION);
  v.check('submissionKey', isKey_(p.submissionKey));

  var firstName = cleanText_(p.firstName);
  v.check('firstName', firstName.length >= 1 && firstName.length <= LIMITS.firstName);
  var email = typeof p.email === 'string' ? p.email.trim() : '';
  v.check('email', isValidEmail_(email) && cleanText_(email) === email);
  var instagram = cleanText_(p.instagram);
  v.check('instagram', instagram === '' || /^@[A-Za-z0-9._]{1,30}$/.test(instagram));
  v.check('avatar', CATALOG.avatar.indexOf(p.avatar) !== -1);

  var program = cleanText_(p.program);
  v.check('program', program.length >= 1 && program.length <= LIMITS.program);
  var courses = Array.isArray(p.courses) ? p.courses.map(function (c) { return cleanText_(c); }) : null;
  v.check('courses', courses !== null && courses.length <= LIMITS.courses && courses.every(function (c) { return c.length >= 1 && c.length <= LIMITS.course; }));

  var style = {};
  var answers = isObject_(p.styleAnswers) ? p.styleAnswers : {};
  Object.keys(CATALOG.style).forEach(function (q) {
    style[q] = v.choice('styleAnswers.' + q, answers[q], CATALOG.style[q]);
  });

  var meetPreference = v.choice('meetPreference', p.meetPreference, CATALOG.meetPreference);
  var hangouts = v.choices('hangouts', p.hangouts, CATALOG.hangouts, meetPreference === 'event' ? 1 : 0, Object.keys(CATALOG.hangouts).length);

  v.check('studentAttestation', p.studentAttestation === true);
  v.check('guidelinesAccepted', p.guidelinesAccepted === true);
  v.check('consent', p.consent === true);
  v.check('privacyPolicyVersion', typeof p.privacyPolicyVersion === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.privacyPolicyVersion));

  var clean = {
    submissionKey: p.submissionKey,
    answers: {
      schemaVersion: SCHEMA_VERSION,
      firstName: firstName,
      email: email,
      avatar: p.avatar,
      instagram: instagram,
      universityId: v.choice('universityId', p.universityId, CATALOG.university),
      campusId: v.choice('campusId', p.campusId, CATALOG.campus),
      program: program,
      year: v.choice('year', p.year, CATALOG.year),
      courses: courses || [],
      styleAnswers: style,
      interests: v.choices('interests', p.interests, CATALOG.interests, LIMITS.minInterests, LIMITS.maxInterests),
      meetPreference: meetPreference,
      campusMatch: v.choice('campusMatch', p.campusMatch, CATALOG.campusMatch),
      hangouts: hangouts,
      availability: v.choices('availability', p.availability, CATALOG.availability, 0, Object.keys(CATALOG.availability).length),
      studentAttestation: true,
      guidelinesAccepted: true,
      consent: true,
      privacyPolicyVersion: p.privacyPolicyVersion
    }
  };
  v.done();
  return clean;
}

function validateFeedback_(p) {
  var v = validator_();
  v.check('schemaVersion', p.schemaVersion === SCHEMA_VERSION);
  v.check('submissionKey', isKey_(p.submissionKey));
  var email = typeof p.email === 'string' ? p.email.trim() : '';
  v.check('email', email === '' || (isValidEmail_(email) && cleanText_(email) === email));
  var category = p.category === '' ? '' : v.choice('category', p.category, CATALOG.feedbackCategory);
  var suggestion = cleanText_(p.suggestion, true);
  v.check('suggestion', suggestion.length >= LIMITS.minSuggestion && suggestion.length <= LIMITS.maxSuggestion);
  v.done();
  return { submissionKey: p.submissionKey, email: email, category: category, suggestion: suggestion };
}

// ---------------------------------------------------------------------------
// Saving. Everything below runs while holding the script lock.
// ---------------------------------------------------------------------------

function saveRegistration_(clean) {
  var a = clean.answers;
  var sheet = sheet_(SHEETS.responses);
  var col = columns_(sheet, RESPONSE_HEADERS);
  var answersJson = JSON.stringify(a);
  var hash = sha256_(answersJson);

  var existing = findRow_(sheet, col['Submission Key'], clean.submissionKey);
  if (existing) {
    if (String(sheet.getRange(existing, col['Answers Hash']).getValue()) !== hash) throw failure_('CONFLICT');
    return {
      registrationId: String(sheet.getRange(existing, col['Registration ID']).getValue()),
      submittedAt: new Date(sheet.getRange(existing, col['Submitted At']).getValue()).toISOString()
    };
  }

  enforceRateLimits_(a.email);

  // A second registration with the same email is kept and flagged for an administrator.
  // Refusing it would tell anyone who typed an address whether that person had registered.
  var duplicateRow = findRow_(sheet, col['Email'], a.email);
  var duplicateOf = '';
  if (duplicateRow) {
    duplicateOf =
      String(sheet.getRange(duplicateRow, col['Possible Duplicate Of']).getValue()) ||
      String(sheet.getRange(duplicateRow, col['Registration ID']).getValue());
  }

  var now = new Date();
  var id = newId_('FQ', sheet, col['Registration ID']);
  var label = function (group, key) {
    return CATALOG[group][key];
  };
  var labels = function (group, keys) {
    return keys.map(function (k) { return CATALOG[group][k]; }).join(', ');
  };
  var styleLabel = function (q) {
    return CATALOG.style[q][a.styleAnswers[q]];
  };

  appendRecord_(sheet, col, 'Registration ID', {
    'Registration ID': id,
    'Submitted At': now,
    'Matching Status': MATCHING_STATUSES[0],
    'First Name': a.firstName,
    'Email': a.email,
    'University': label('university', a.universityId),
    'Campus': label('campus', a.campusId),
    'Campus ID': a.campusId,
    'Program': a.program,
    'Year of Study': label('year', a.year),
    'Courses': a.courses.join(', '),
    'Avatar': a.avatar,
    'Instagram': a.instagram,
    'Interests': labels('interests', a.interests),
    'Friday Night': styleLabel('night'),
    'Planning Style': styleLabel('planning'),
    'Texting Style': styleLabel('texting'),
    'Group Size': styleLabel('group'),
    'Friendship Values': styleLabel('values'),
    'Meeting Comfort': label('meetPreference', a.meetPreference),
    'Campus Match Preference': label('campusMatch', a.campusMatch),
    'Activities Enjoyed': labels('hangouts', a.hangouts),
    'Availability': labels('availability', a.availability),
    'Student Self-Attestation': 'Yes (self-declared, not verified)',
    'Guidelines Agreed': 'Yes',
    'Consent Given': 'Yes',
    'Privacy Policy Version': a.privacyPolicyVersion,
    'Possible Duplicate Of': duplicateOf,
    'Schema Version': String(SCHEMA_VERSION),
    'Submission Key': clean.submissionKey,
    'Answers Hash': hash,
    'Answers JSON': answersJson
  });
  countSubmission_(a.email);
  return { registrationId: id, submittedAt: now.toISOString() };
}

function saveFeedback_(clean) {
  var sheet = sheet_(SHEETS.suggestions);
  var col = columns_(sheet, SUGGESTION_HEADERS);
  var hash = sha256_(JSON.stringify([clean.email, clean.category, clean.suggestion]));

  var existing = findRow_(sheet, col['Submission Key'], clean.submissionKey);
  if (existing) {
    if (String(sheet.getRange(existing, col['Suggestion Hash']).getValue()) !== hash) throw failure_('CONFLICT');
    return { suggestionId: String(sheet.getRange(existing, col['Suggestion ID']).getValue()) };
  }

  var limitKey = clean.email ? 'feedback:' + clean.email : '';
  enforceRateLimits_(limitKey);
  var id = newId_('FB', sheet, col['Suggestion ID']);
  appendRecord_(sheet, col, 'Suggestion ID', {
    'Suggestion ID': id,
    'Timestamp': new Date(),
    'Email': clean.email,
    'Category': clean.category ? CATALOG.feedbackCategory[clean.category] : '',
    'Suggestion': clean.suggestion,
    'Review Status': REVIEW_STATUSES[0],
    'Submission Key': clean.submissionKey,
    'Suggestion Hash': hash
  });
  countSubmission_(limitKey);
  return { suggestionId: id };
}

function spreadsheet_() {
  var id = property_('SPREADSHEET_ID', '');
  if (!id) throw new Error('SPREADSHEET_ID is not set');
  return SpreadsheetApp.openById(id);
}

function sheet_(name) {
  var sheet = spreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet. Run setupSpreadsheet.');
  return sheet;
}

/** Header name -> column number, so administrators can reorder or add columns safely. */
function columns_(sheet, required) {
  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var map = {};
  headers.forEach(function (h, i) {
    if (h !== '' && !has_(map, String(h))) map[String(h)] = i + 1;
  });
  required.forEach(function (h) {
    if (!has_(map, h)) throw new Error('Missing column. Run setupSpreadsheet.');
  });
  return map;
}

/** First data row whose cell equals value (ignoring case), or 0. */
function findRow_(sheet, column, value) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var wanted = String(value).toLowerCase();
  var values = sheet.getRange(2, column, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    // A protective apostrophe may or may not be reported back, so ignore it.
    if (String(values[i][0]).toLowerCase().replace(/^'/, '') === wanted.replace(/^'/, '')) return i + 2;
  }
  return 0;
}

/**
 * Writes one record, then reads its id back. The visitor is told "saved" only
 * after that read-back succeeds.
 */
function appendRecord_(sheet, col, idHeader, record) {
  var width = sheet.getLastColumn();
  var target = sheet.getLastRow() + 1;
  if (target > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 200);
  var range = sheet.getRange(target, 1, 1, width);
  var formats = range.getNumberFormats()[0]; // columns not written here keep their own format
  var row = formats.map(function () { return ''; });
  Object.keys(record).forEach(function (header) {
    var value = record[header];
    var isDate = value instanceof Date;
    row[col[header] - 1] = isDate ? value : neutralise_(value);
    // Plain text ("@") stops Sheets reading "1/2" as a date or "=x" as a formula.
    formats[col[header] - 1] = isDate ? 'yyyy-mm-dd hh:mm:ss' : '@';
  });
  range.setNumberFormats([formats]);
  range.setValues([row]);
  SpreadsheetApp.flush();

  if (String(sheet.getRange(target, col[idHeader]).getValue()) !== record[idHeader]) throw new Error('Write was not confirmed');
}

/**
 * Spreadsheet formula injection: text a student typed must never run as a formula,
 * here or in a later export. A leading apostrophe forces plain text.
 */
function neutralise_(value) {
  var s = String(value);
  return /^[\s]*[=+\-@|%\t\r]/.test(s) ? "'" + s : s;
}

// ---------------------------------------------------------------------------
// Abuse prevention. Apps Script doesn't reveal the visitor's IP address, so limits
// are global plus per email. They slow abuse down; they don't make it impossible.
// ---------------------------------------------------------------------------

function limitKeys_(email) {
  var now = new Date().toISOString();
  var keys = [
    { key: 'rate:m:' + now.slice(0, 16), max: numberProperty_('MAX_PER_MINUTE', 30), ttl: 120 },
    { key: 'rate:d:' + now.slice(0, 10), max: numberProperty_('MAX_PER_DAY', 1500), ttl: 21600 }
  ];
  if (email) keys.push({ key: 'rate:e:' + sha256_(email.toLowerCase()), max: numberProperty_('MAX_PER_EMAIL', 3), ttl: 21600 });
  return keys;
}

function enforceRateLimits_(email) {
  var cache = CacheService.getScriptCache();
  limitKeys_(email).forEach(function (l) {
    if (Number(cache.get(l.key) || 0) >= l.max) throw failure_('RATE_LIMITED');
  });
}

function countSubmission_(email) {
  var cache = CacheService.getScriptCache();
  limitKeys_(email).forEach(function (l) {
    cache.put(l.key, String(Number(cache.get(l.key) || 0) + 1), l.ttl);
  });
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function property_(name, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(name);
  return v === null || v === undefined || String(v).trim() === '' ? fallback : String(v).trim();
}

function numberProperty_(name, fallback) {
  var n = Number(property_(name, ''));
  return n > 0 ? n : fallback;
}

function sha256_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

/** e.g. FQ-7K2M9QXD. No 0/O/1/I/L/U, so ids survive being read aloud or retyped. */
function newId_(prefix, sheet, column) {
  var alphabet = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  for (var attempt = 0; attempt < 5; attempt++) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid(), Utilities.Charset.UTF_8);
    var id = prefix + '-';
    for (var i = 0; i < 8; i++) id += alphabet.charAt((bytes[i] & 0xff) % alphabet.length);
    if (!findRow_(sheet, column, id)) return id;
  }
  throw new Error('Could not create an id');
}

// ---------------------------------------------------------------------------
// Administrator tools: run from the editor, or the "Friendship Quest" menu.
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Friendship Quest')
    .addItem('Set up / repair sheets', 'setupSpreadsheet')
    .addItem('Add a match row', 'addMatchRow')
    .addToUi();
}

/**
 * Creates the four tabs. Safe to run again: it never deletes or rewrites student
 * rows, and it stops if a tab has unexpected headers. The Dashboard is rebuilt.
 */
function setupSpreadsheet() {
  var ss = spreadsheet_();
  ss.setSpreadsheetTimeZone('America/Edmonton');

  var responses = ensureSheet_(ss, SHEETS.responses, RESPONSE_HEADERS);
  var suggestions = ensureSheet_(ss, SHEETS.suggestions, SUGGESTION_HEADERS);
  var matches = ensureSheet_(ss, SHEETS.matches, MATCH_HEADERS);

  dropdown_(responses, columns_(responses, RESPONSE_HEADERS)['Matching Status'], MATCHING_STATUSES);
  dropdown_(suggestions, columns_(suggestions, SUGGESTION_HEADERS)['Review Status'], REVIEW_STATUSES);
  var m = columns_(matches, MATCH_HEADERS);
  dropdown_(matches, m['Match Status'], MATCH_STATUSES);
  dropdown_(matches, m['First Student Consent'], CONSENT_STATUSES);
  dropdown_(matches, m['Second Student Consent'], CONSENT_STATUSES);
  dropdown_(matches, m['Notification Status'], NOTIFICATION_STATUSES);
  matches.getRange(2, m['Date Matched'], matches.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');

  buildDashboard_(ss, responses, suggestions, matches);
  SpreadsheetApp.flush();
  console.log('Friendship Quest sheets are ready.');
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    columns_(sheet, headers); // throws, and changes nothing, if a required column is gone
  }
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold').setBackground('#221c42').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  return sheet;
}

function dropdown_(sheet, column, options) {
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(options, true).setAllowInvalid(false).build();
  sheet.getRange(2, column, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
}

function columnLetter_(n) {
  var s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function buildDashboard_(ss, responses, suggestions, matches) {
  var sheet = ss.getSheetByName(SHEETS.dashboard) || ss.insertSheet(SHEETS.dashboard);
  sheet.clear();

  var ref = function (source, headers, header) {
    var letter = columnLetter_(columns_(source, headers)[header]);
    return "'" + source.getName() + "'!" + letter + '2:' + letter;
  };
  var r = function (h) { return ref(responses, RESPONSE_HEADERS, h); };
  var submitted = r('Submitted At');

  var rows = [
    ['Friendship Quest dashboard', ''],
    ['', ''],
    ['Total registrations', '=COUNTA(' + r('Registration ID') + ')'],
    ['Flagged as possible duplicates', '=COUNTIF(' + r('Possible Duplicate Of') + ',"FQ-*")'],
    ['Students awaiting matching', '=COUNTIFS(' + r('Matching Status') + ',"Pending",' + r('Possible Duplicate Of') + ',"")'],
    ['Completed matches', '=COUNTIF(' + ref(matches, MATCH_HEADERS, 'Match Status') + ',"Confirmed")'],
    ['Website suggestions', '=COUNTA(' + ref(suggestions, SUGGESTION_HEADERS, 'Suggestion ID') + ')'],
    ['New suggestions to review', '=COUNTIF(' + ref(suggestions, SUGGESTION_HEADERS, 'Review Status') + ',"New")'],
    ['', ''],
    ['Registrations by campus', '']
  ];
  Object.keys(CATALOG.campus).forEach(function (id) {
    rows.push([CATALOG.campus[id], '=COUNTIF(' + r('Campus ID') + ',"' + id + '")']);
  });
  rows.push(['', ''], ['Registrations over time', '']);

  rows.forEach(function (row, i) {
    sheet.getRange(i + 1, 1).setValue(row[0]);
    if (row[1]) sheet.getRange(i + 1, 2).setFormula(row[1]);
  });
  sheet
    .getRange(rows.length + 1, 1)
    .setFormula(
      '=IF(COUNT(' + submitted + ')=0,"No registrations yet",QUERY({' + submitted + '},' +
        '"select toDate(Col1), count(Col1) where Col1 is not null group by toDate(Col1) order by toDate(Col1) ' +
        'label toDate(Col1) \'Date\', count(Col1) \'Registrations\' format toDate(Col1) \'yyyy-mm-dd\'",0))'
    );

  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  sheet.getRange(10, 1).setFontWeight('bold');
  sheet.getRange(rows.length, 1).setFontWeight('bold');
  sheet.setColumnWidth(1, 420);
}

/** Adds a blank match with a fresh id. The administrator fills in the two registration ids. */
function addMatchRow() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = sheet_(SHEETS.matches);
    var col = columns_(sheet, MATCH_HEADERS);
    appendRecord_(sheet, col, 'Match ID', {
      'Match ID': newId_('FM', sheet, col['Match ID']),
      'Match Status': MATCH_STATUSES[0],
      'First Student Consent': CONSENT_STATUSES[0],
      'Second Student Consent': CONSENT_STATUSES[0],
      'Notification Status': NOTIFICATION_STATUSES[0]
    });
  } finally {
    lock.releaseLock();
  }
}
