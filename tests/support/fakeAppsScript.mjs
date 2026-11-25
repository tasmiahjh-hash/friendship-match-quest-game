/**
 * Runs the REAL integrations/google-sheets/Code.gs in Node against a small
 * in-memory stand-in for the Google services it uses. It exercises our code, not
 * Google's: deployment, permissions, quotas and real Sheets behaviour still need a
 * manual test against a deployed web app (docs/DEPLOYMENT.md).
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const CODE = fileURLToPath(new URL('../../integrations/google-sheets/Code.gs', import.meta.url));

class FakeRange {
  constructor(sheet, row, col, rows, cols) {
    if (row < 1 || col < 1 || row + rows - 1 > sheet.maxRows || col + cols - 1 > sheet.maxCols) {
      throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    }
    Object.assign(this, { sheet, row, col, rows, cols });
  }
  map(fn) {
    return Array.from({ length: this.rows }, (_, r) => Array.from({ length: this.cols }, (_, c) => fn(this.row + r, this.col + c)));
  }
  getValues() {
    return this.map((r, c) => this.sheet.cell(r, c).value ?? '');
  }
  getValue() {
    return this.getValues()[0][0];
  }
  setValues(values) {
    if (values.length !== this.rows || values.some((v) => v.length !== this.cols)) throw new Error('Range size mismatch');
    this.map((r, c) => this.sheet.write(r, c, values[r - this.row][c - this.col]));
    return this;
  }
  setValue(v) {
    return this.setValues([[v]]);
  }
  setFormula(f) {
    this.sheet.cell(this.row, this.col).formula = f;
    this.sheet.cell(this.row, this.col).value = '#formula';
    return this;
  }
  getNumberFormats() {
    return this.map((r, c) => this.sheet.cell(r, c).format ?? 'General');
  }
  setNumberFormats(f) {
    this.map((r, c) => (this.sheet.cell(r, c).format = f[r - this.row][c - this.col]));
    return this;
  }
  setNumberFormat(f) {
    this.map((r, c) => (this.sheet.cell(r, c).format = f));
    return this;
  }
  setDataValidation(rule) {
    this.map((r, c) => (this.sheet.cell(r, c).rule = rule));
    return this;
  }
  setFontWeight() { return this; }
  setFontSize() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.cells = new Map();
    this.maxRows = 1000;
    this.maxCols = 26;
    this.failWrites = false;
  }
  cell(r, c) {
    const k = `${r}:${c}`;
    if (!this.cells.has(k)) this.cells.set(k, {});
    return this.cells.get(k);
  }
  /** Mimics how Sheets interprets input: formulas run unless the cell is marked as text. */
  write(r, c, v) {
    if (this.failWrites) return;
    const cell = this.cell(r, c);
    if (cell.rule && v !== '' && !cell.rule.includes(v)) throw new Error('Data validation rejected the value');
    delete cell.formula;
    if (typeof v === 'string' && v.startsWith("'")) cell.value = v.slice(1);
    else if (typeof v === 'string' && /^=./.test(v)) Object.assign(cell, { formula: v, value: '#executed' });
    else cell.value = v;
  }
  used(axis) {
    let n = 0;
    for (const [k, cell] of this.cells) if (cell.value !== undefined && cell.value !== '') n = Math.max(n, Number(k.split(':')[axis]));
    return n;
  }
  getName() { return this.name; }
  getLastRow() { return this.used(0); }
  getLastColumn() { return this.used(1); }
  getMaxRows() { return this.maxRows; }
  getMaxColumns() { return this.maxCols; }
  insertRowsAfter(_at, n) { this.maxRows += n; }
  insertColumnsAfter(_at, n) { this.maxCols += n; }
  getRange(r, c, rows = 1, cols = 1) { return new FakeRange(this, r, c, rows, cols); }
  setFrozenRows() {}
  setColumnWidth() {}
  clear() { this.cells.clear(); }
  /** Test helper: data rows as objects keyed by header. */
  records() {
    const headers = this.getRange(1, 1, 1, Math.max(1, this.getLastColumn())).getValues()[0];
    const out = [];
    for (let r = 2; r <= this.getLastRow(); r++) out.push(Object.fromEntries(headers.map((h, i) => [h, this.cell(r, i + 1).value ?? ''])));
    return out;
  }
  formulas() {
    return [...this.cells.values()].map((c) => c.formula).filter(Boolean);
  }
}

export function createBackend({ properties = {}, setup = true } = {}) {
  const sheets = new Map();
  const cache = new Map();
  const logs = [];
  const props = { SPREADSHEET_ID: 'fake-sheet-id', ...properties };
  const state = { locked: false, lockBusy: false };

  const spreadsheet = {
    getSheetByName: (n) => sheets.get(n) ?? null,
    insertSheet: (n) => {
      const s = new FakeSheet(n);
      sheets.set(n, s);
      return s;
    },
    setSpreadsheetTimeZone() {},
  };

  const context = vm.createContext({
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')) },
    SpreadsheetApp: {
      openById: (id) => {
        if (id !== 'fake-sheet-id') throw new Error(`No access to ${id}`);
        return spreadsheet;
      },
      flush() {},
      newDataValidation: () => {
        let list;
        const b = { requireValueInList: (l) => ((list = [...l]), b), setAllowInvalid: () => b, build: () => list };
        return b;
      },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => void cache.set(k, v) }) },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          if (state.lockBusy || state.locked) return false;
          return (state.locked = true);
        },
        waitLock: () => void (state.locked = true),
        releaseLock: () => void (state.locked = false),
      }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ text, setMimeType(m) { this.mime = m; return this; } }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      getUuid: () => randomUUID(),
      newBlob: (s) => ({ getBytes: () => [...Buffer.from(s, 'utf8')] }),
      // Apps Script returns signed bytes.
      computeDigest: (_a, s) => [...createHash('sha256').update(s, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
    },
  });
  vm.runInContext(readFileSync(CODE, 'utf8'), context, { filename: 'Code.gs' });
  if (setup) context.setupSpreadsheet();

  const raw = (contents) => JSON.parse(context.doPost({ postData: { contents } }).text);
  return {
    context,
    props,
    cache,
    logs,
    state,
    sheets,
    sheet: (n) => sheets.get(n),
    raw,
    post: (kind, payload) => raw(JSON.stringify({ kind, payload })),
    get: (parameter = {}) => JSON.parse(context.doGet({ parameter }).text),
  };
}
