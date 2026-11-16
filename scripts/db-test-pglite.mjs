#!/usr/bin/env node
/**
 * Runs the Supabase migrations, seed and pgTAP database tests on PGlite
 * (PostgreSQL compiled to WebAssembly). Used when Docker / local Supabase
 * isn't available.
 *
 * What this proves: the migrations apply cleanly on a real PostgreSQL engine,
 * and every RLS policy, grant, SECURITY DEFINER function and trigger behaves as
 * the tests assert, under the anon / authenticated roles with Supabase-style
 * JWT claims.
 *
 * What it does NOT prove: anything about Supabase services themselves
 * (Auth/GoTrue, PostgREST, Realtime), exact platform role attributes, or the
 * real pgTAP extension. Run `npm run db:test` against local Supabase for that.
 */
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'supabase');
const read = (...p) => readFileSync(join(root, ...p), 'utf8');
const harness = (name) => readFileSync(join(here, 'pglite', name), 'utf8');
const migrations = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
const testFiles = readdirSync(join(root, 'tests', 'database')).filter((f) => f.endsWith('.test.sql')).sort();
const only = process.argv[2];

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

async function freshDatabase() {
  const db = new PGlite();
  await db.exec(harness('supabase-emulation.sql'));
  await db.exec(harness('pgtap-shim.sql'));
  // Supabase's API roles resolve unqualified pgTAP calls through `extensions`.
  await db.exec(`set search_path = "$user", public, extensions;`);
  for (const file of migrations) {
    try {
      await db.exec(read('migrations', file));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${error.message}`);
    }
  }
  return db;
}

function tapLines(results) {
  const lines = [];
  for (const result of results) {
    for (const row of result.rows ?? []) {
      for (const value of Object.values(row)) {
        if (typeof value !== 'string') continue;
        for (const line of value.split('\n')) {
          if (/^(not ok|ok) \d+/.test(line) || /^1\.\.\d+/.test(line) || /^#/.test(line)) lines.push(line);
        }
      }
    }
  }
  return lines;
}

let totalPassed = 0;
let totalFailed = 0;
let fatal = 0;

// 1. Migrations + development seed
console.log(c.bold(`\nApplying ${migrations.length} migrations on PGlite…`));
try {
  const db = await freshDatabase();
  migrations.forEach((m) => console.log(c.dim(`  ✓ ${m}`)));
  await db.exec(read('seed.sql'));
  const { rows } = await db.query(
    `select (select count(*) from public.universities)::int as universities,
            (select count(*) from public.events)::int as events,
            (select count(*) from public.universities where not is_demo)::int as non_demo`,
  );
  const s = rows[0];
  if (s.non_demo !== 0) throw new Error('seed.sql contains non-demo universities');
  console.log(c.dim(`  ✓ seed.sql (${s.universities} demo universities, ${s.events} demo events)`));
  await db.close();
} catch (error) {
  console.error(c.red(`  ✗ ${error.message}`));
  process.exit(1);
}

// 2. pgTAP test files, each on a fresh database
for (const file of testFiles) {
  if (only && !file.includes(only)) continue;
  console.log(c.bold(`\n${file}`));
  const db = await freshDatabase();
  const sql = read('tests', 'database', file)
    // pgTAP is provided by the shim on PGlite.
    .replace(/create extension if not exists pgtap[^;]*;/gi, '');
  let lines;
  try {
    lines = tapLines(await db.exec(sql));
  } catch (error) {
    fatal++;
    console.error(c.red(`  ✗ test file aborted: ${error.message}`));
    await db.close();
    continue;
  }
  await db.close();

  const plan = lines.find((l) => l.startsWith('1..'));
  let passed = 0;
  let failed = 0;
  for (const line of lines) {
    if (line.startsWith('ok ')) {
      passed++;
      console.log(`  ${c.green('✓')} ${line.replace(/^ok \d+ - /, '')}`);
    } else if (line.startsWith('not ok ')) {
      failed++;
      console.log(`  ${c.red('✗')} ${line.replace(/^not ok \d+ - /, '')}`);
    } else if (line.startsWith('#')) {
      console.log(c.red(`      ${line}`));
    }
  }
  const planned = plan ? Number(plan.slice(3)) : null;
  if (planned !== null && planned !== passed + failed) {
    fatal++;
    console.log(c.red(`  ✗ planned ${planned} tests but ran ${passed + failed}`));
  }
  totalPassed += passed;
  totalFailed += failed;
  console.log(c.dim(`  ${passed} passed, ${failed} failed`));
}

const ok = totalFailed === 0 && fatal === 0;
console.log(
  c.bold(`\n${ok ? c.green('PASS') : c.red('FAIL')} · ${totalPassed} passed, ${totalFailed} failed${fatal ? `, ${fatal} file/plan errors` : ''}`),
);
console.log(c.dim('Engine: PGlite (PostgreSQL in WebAssembly) with a Supabase emulation layer. See scripts/db-test-pglite.mjs.\n'));
process.exit(ok ? 0 : 1);
