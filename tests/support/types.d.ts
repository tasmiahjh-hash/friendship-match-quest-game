/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '*/fakeAppsScript.mjs' {
  interface FakeCell {
    value?: any;
    formula?: string;
    format?: string;
  }
  interface FakeSheet {
    maxRows: number;
    maxCols: number;
    failWrites: boolean;
    cell(r: number, c: number): FakeCell;
    records(): Record<string, any>[];
    formulas(): string[];
  }
  export function createBackend(options?: { properties?: Record<string, string>; setup?: boolean }): {
    context: any;
    props: Record<string, string>;
    cache: Map<string, string>;
    logs: string[];
    state: { locked: boolean; lockBusy: boolean };
    sheets: Map<string, FakeSheet>;
    sheet(name: string): FakeSheet | undefined;
    raw(contents: string): any;
    post(kind: string, payload: unknown): any;
    get(parameter?: Record<string, string>): any;
  };
}

declare module '*/payloads.mjs' {
  export const registration: (over?: Record<string, unknown>) => any;
  export const feedback: (over?: Record<string, unknown>) => any;
}
