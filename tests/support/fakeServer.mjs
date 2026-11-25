/**
 * Local HTTP stand-in for a deployed Apps Script web app, for development and
 * end-to-end tests. Runs the real Code.gs (in memory, synthetic data only) and
 * copies the HTTP behaviour that matters to browsers:
 *   - POST answers 302 to a different origin, which serves the JSON with CORS "*"
 *   - OPTIONS (preflight) is refused with 405
 *
 *   npm run dev:backend     then set VITE_SUBMISSION_ENDPOINT=http://localhost:8787/exec
 */
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createBackend } from './fakeAppsScript.mjs';

export function startFakeServer({ port = 8787, properties = {} } = {}) {
  let backend = createBackend({ properties });
  let failure = null; // set by tests: 'drop' (save, then lose the reply), 'html', 'down'
  const echoes = new Map();
  const seen = { preflights: 0, posts: [] };

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const cors = { 'Access-Control-Allow-Origin': '*' };
    const send = (status, body, headers = {}) => res.writeHead(status, { ...cors, ...headers }).end(body);

    if (req.method === 'OPTIONS') {
      seen.preflights++;
      res.writeHead(405).end();
      return;
    }
    if (url.pathname === '/echo') {
      const body = echoes.get(url.searchParams.get('id'));
      echoes.delete(url.searchParams.get('id'));
      send(body ? 200 : 404, body ?? '', { 'Content-Type': 'application/json' });
      return;
    }
    // Test control. Exists only in this local stand-in, never in Code.gs.
    if (url.pathname === '/__test/reset') {
      backend = createBackend({ properties });
      failure = null;
      seen.preflights = 0;
      seen.posts = [];
      return send(200, 'ok');
    }
    if (url.pathname === '/__test/fail') {
      failure = url.searchParams.get('mode') || null;
      return send(200, 'ok');
    }
    if (url.pathname === '/__test/close') {
      backend.props.ACCEPTING_SUBMISSIONS = 'false';
      backend.props.TEST_EMAILS = url.searchParams.get('allow') ?? '';
      return send(200, 'ok');
    }
    if (url.pathname === '/__test/state') {
      return send(
        200,
        JSON.stringify({
          seen,
          responses: backend.sheet('Student Responses').records(),
          suggestions: backend.sheet('Website Suggestions').records(),
        }),
      );
    }
    if (url.pathname !== '/exec') return send(404, '');
    if (req.method === 'GET') return send(200, JSON.stringify(backend.get()), { 'Content-Type': 'application/json' });

    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (d) => (raw += d));
    req.on('end', () => {
      seen.posts.push(req.headers['content-type'] ?? '');
      if (failure === 'down') return req.socket.destroy();
      if (failure === 'html') return send(200, '<html>Google error page</html>', { 'Content-Type': 'text/html' });
      const body = JSON.stringify(backend.raw(raw));
      if (failure === 'drop') return req.socket.destroy();
      const id = randomUUID();
      echoes.set(id, body);
      // Different host, so a different origin, exactly like googleusercontent.com.
      res.writeHead(302, { ...cors, Location: `http://127.0.0.1:${port}/echo?id=${id}` }).end();
    });
  });

  return new Promise((resolve) => server.listen(port, () => resolve({ server, close: () => server.close() })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.FAKE_BACKEND_PORT || 8787);
  await startFakeServer({ port, properties: { MAX_PER_MINUTE: '1000' } });
  console.log(`Local stand-in backend (in memory, nothing is kept): http://localhost:${port}/exec`);
}
