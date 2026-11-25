import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** GitHub Pages project site: https://tasmiahjh-hash.github.io/friendship-match-quest-game/ */
const DEFAULT_BASE = '/friendship-match-quest-game/';
const DEFAULT_SITE = 'https://tasmiahjh-hash.github.io';

const withSlashes = (p: string) => `/${p.replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');

/** Origins the page may send data to. Anything else is blocked by the browser. */
function connectSources(endpoint: string | undefined): string[] {
  const out = ["'self'"];
  try {
    const url = new URL(endpoint ?? '');
    out.push(url.origin);
    // Apps Script answers through a redirect to this host.
    if (url.hostname === 'script.google.com') out.push('https://script.googleusercontent.com');
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') out.push('http://localhost:*', 'http://127.0.0.1:*');
  } catch {
    /* no endpoint configured: same-origin only */
  }
  return out;
}

function siteHtml(base: string, site: string, endpoint: string | undefined): Plugin {
  const pageUrl = `${site}${base}`;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connectSources(endpoint).join(' ')}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  return {
    name: 'friendship-quest-html',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
      { tag: 'link', attrs: { rel: 'canonical', href: pageUrl }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:url', content: pageUrl }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image', content: `${pageUrl}og-image.png` }, injectTo: 'head' },
    ],
  };
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = command === 'build' || isPreview || env.VITE_BASE_PATH ? withSlashes(env.VITE_BASE_PATH || DEFAULT_BASE) : '/';
  return {
    base,
    plugins: [react(), siteHtml(base, (env.SITE_ORIGIN || DEFAULT_SITE).replace(/\/+$/, ''), env.VITE_SUBMISSION_ENDPOINT)],
  };
});
