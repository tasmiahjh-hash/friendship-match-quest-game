#!/usr/bin/env node
/**
 * Release gate. Run after `npm run build` with the same environment variables.
 *   node scripts/check-release.mjs            fails on anything unsafe to publish
 *   node scripts/check-release.mjs --strict   also fails when registration isn't configured
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const strict = process.argv.includes('--strict');
const errors = [];
const warnings = [];

// Same sources the build uses: the environment, then local .env files.
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}
const real = (name) => {
  const v = (process.env[name] ?? '').trim();
  return v && !/your[-_]|replace|@example\.|changeme|[<>]/i.test(v) ? v : '';
};

const endpoint = real('VITE_SUBMISSION_ENDPOINT');
const contact = real('VITE_CONTACT_EMAIL');
const privacy = real('VITE_PRIVACY_CONTACT_EMAIL') || contact;

if (!endpoint) (strict ? errors : warnings).push('VITE_SUBMISSION_ENDPOINT is not set: the site will say registration is not open yet.');
else if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(endpoint))
  errors.push('VITE_SUBMISSION_ENDPOINT should look like https://script.google.com/macros/s/<id>/exec (not /dev, not a Workspace /a/ URL).');
// Never collect student data without telling students who to contact about it.
if (endpoint && !privacy) errors.push('Registration is configured but there is no VITE_PRIVACY_CONTACT_EMAIL or VITE_CONTACT_EMAIL.');
if (!contact) warnings.push('VITE_CONTACT_EMAIL is not set: the footer links to the suggestion box instead.');

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
if (!existsSync('dist/index.html')) errors.push('dist/ is missing. Run npm run build first.');
else {
  const html = readFileSync('dist/index.html', 'utf8');
  const base = /src="(\/[^"]*?)assets\//.exec(html)?.[1];
  if (!base) errors.push('Could not find the asset base path in dist/index.html.');
  for (const f of ['404.html', 'favicon.svg', 'og-image.png', 'apple-touch-icon.png']) if (!existsSync(join('dist', f))) errors.push(`dist/${f} is missing.`);

  const bundle = walk('dist').filter((f) => /\.(js|css|html|json|svg)$/.test(f)).map((f) => [f, readFileSync(f, 'utf8')]);
  const forbidden = [
    [/AIza[0-9A-Za-z_-]{30,}/, 'a Google API key'],
    [/service_role|sb_secret_/, 'a Supabase service-role key'],
    [/eyJ[\w-]{10,}\.eyJ[\w-]{10,}\./, 'a JWT'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY/, 'a private key'],
    [/docs\.google\.com\/spreadsheets/, 'a spreadsheet link'],
    [/Prototype · v|Presenter shortcut|Replay (the )?demo|skip to match|Halloween|mapleridge/i, 'prototype content'],
    [/fonts\.googleapis\.com|google-analytics|googletagmanager/, 'a third-party tracker or font request'],
  ];
  for (const [file, text] of bundle) for (const [re, what] of forbidden) if (re.test(text)) errors.push(`${file} contains ${what}.`);
  if (base) console.log(`Asset base path: ${base}`);
}

for (const w of warnings) console.warn(`WARNING  ${w}`);
for (const e of errors) console.error(`ERROR    ${e}`);
console.log(errors.length ? `\n${errors.length} blocking problem(s).` : '\nNo blocking problems found by this check. See docs/RELEASE_CHECKLIST.md for the manual steps.');
process.exit(errors.length ? 1 : 0);
