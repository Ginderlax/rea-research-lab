import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { apps, byId } from './catalog.mjs';
import { createStore, createWorkspace } from './lib/storage.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const maxBody = 12 * 1024 * 1024;

export async function start({ port = 4310, dataDir = resolve(root, '../../.local/rea-studio') } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  dataDir = resolve(dataDir);
  const token = randomBytes(32).toString('hex');
  const contexts = new Map();
  const pending = new Map();
  const inFlight = new Set();
  const loadedModules = new Map();
  for (const app of apps) {
    contexts.set(app.id, { store: await createStore(join(dataDir, app.id, 'records')), workspace: await createWorkspace(join(dataDir, app.id, 'workspace')) });
  }
  let actualPort;
  const server = createServer(async (req, res) => {
    const headers = {
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      'Referrer-Policy': 'no-referrer'
    };
    const reply = (status, value, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, { ...headers, 'Content-Type': type });
      res.end(type.startsWith('application/json') ? JSON.stringify(value) : value);
    };
    try {
      const allowedHosts = [`127.0.0.1:${actualPort}`, `localhost:${actualPort}`];
      if (!allowedHosts.includes(req.headers.host)) return reply(403, { error: 'Host is not allowed' });
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return reply(403, { error: 'Only local connections are accepted' });
      if (req.headers.origin && !allowedHosts.some(host => req.headers.origin === `http://${host}`)) return reply(403, { error: 'Origin is not allowed' });
      const url = new URL(req.url, `http://127.0.0.1:${actualPort}`);
      if (req.method === 'GET' && url.pathname === '/api/session') return reply(200, { token, apps, status: 'development', requirements: 'Every documented feature and measured improvement in all requested categories are still required for completion.' });
      if (req.method === 'GET' && url.pathname === '/api/health') return reply(200, { status: 'ok', development: true, applications: apps.length });
      const api = /^\/api\/([a-z]+)\/([a-zA-Z0-9_-]+)$/.exec(url.pathname);
      if (req.method === 'POST' && api) {
        const supplied = Buffer.from(String(req.headers['x-rea-token'] ?? ''));
        const expected = Buffer.from(token);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply(403, { error: 'A local session token is required' });
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return reply(415, { error: 'Send a JSON request' });
        const [, app, action] = api;
        if (!byId.has(app)) return reply(404, { error: 'Unknown application' });
        const declaredSize = Number(req.headers['content-length']);
        if (Number.isFinite(declaredSize) && declaredSize > maxBody) {
          reply(413, { error: 'Request exceeds the development size limit' });
          req.resume();
          return;
        }
        let size = 0;
        const chunks = [];
        // Keep the response socket usable when rejecting an oversized streamed body.
        for await (const chunk of req.iterator({ destroyOnReturn: false })) {
          size += chunk.length;
          if (size > maxBody) { reply(413, { error: 'Request exceeds the development size limit' }); req.resume(); return; }
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
        catch { return reply(400, { error: 'Invalid JSON' }); }
        if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, { error: 'Request must be a JSON object' });
        const execute = async () => {
          const module = await import(pathToFileURL(join(root, 'apps', app, 'server.mjs')).href);
          loadedModules.set(app, module);
          return module.handle({ action, input, ...contexts.get(app) });
        };
        // WebDAV owns an immediate busy gate: waiting here would retain credentials
        // behind a remote operation. Other mutations retain application serialization.
        const immediate = app === 'sync' && action.startsWith('webdav-');
        const previous = pending.get(app) ?? Promise.resolve();
        const operation = immediate ? execute() : previous.catch(() => {}).then(execute);
        inFlight.add(operation);
        if (!immediate) pending.set(app, operation);
        let result;
        try { result = await operation; }
        finally {
          inFlight.delete(operation);
          if (pending.get(app) === operation) pending.delete(app);
        }
        return reply(200, { result });
      }
      if (req.method !== 'GET') return reply(405, { error: 'Method is not supported' });
      const staticFiles = new Map([
        ['/', ['public/index.html', 'text/html; charset=utf-8']],
        ['/studio.mjs', ['public/studio.mjs', 'text/javascript; charset=utf-8']],
        ['/apps/sketch/layout.mjs', ['apps/sketch/layout.mjs', 'text/javascript; charset=utf-8']],
        ['/style.css', ['public/style.css', 'text/css; charset=utf-8']]
      ]);
      const client = /^\/apps\/([a-z]+)\/(client|core|markdown)\.mjs$/.exec(url.pathname);
      if (client && byId.has(client[1])) staticFiles.set(url.pathname, [`apps/${client[1]}/${client[2]}.mjs`, 'text/javascript; charset=utf-8']);
      for (const name of ['native-client', 'native-example']) staticFiles.set(`/apps/automation/${name}.mjs`, [`apps/automation/${name}.mjs`, 'text/javascript; charset=utf-8']);
      const file = staticFiles.get(url.pathname);
      if (!file) return reply(404, { error: 'Page was not found' });
      return reply(200, await fs.readFile(join(root, file[0])), file[1]);
    } catch (error) {
      const unavailable = error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'ENOENT';
      reply(unavailable ? 503 : 400, { error: unavailable ? 'This application is still being implemented' : String(error.message).slice(0, 600) });
    }
  });
  await new Promise((resolveListening, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolveListening); });
  actualPort = server.address().port;
  return {
    server, token, url: `http://127.0.0.1:${actualPort}`, dataDir,
    async close() {
      await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
      await Promise.allSettled([...inFlight]);
      for (const [app, module] of loadedModules) if (typeof module.dispose === 'function') await module.dispose(contexts.get(app).workspace);
    }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = process.argv.indexOf('--port');
  const port = flag === -1 ? 4310 : Number(process.argv[flag + 1]);
  const instance = await start({ port, ...(process.env.REA_STUDIO_DATA ? { dataDir: process.env.REA_STUDIO_DATA } : {}) });
  console.log(`REA Studio development applications: ${instance.url}`);
  console.log('Full feature parity and superiority have not been established.');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await instance.close(); process.exit(0); });
}
