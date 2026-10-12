import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { handle } from './server.mjs';
import { validateWorkflow } from './core.mjs';
import { executeWorkflowAsync } from './engine.mjs';
import { createStore } from '../../lib/storage.mjs';
import { start } from '../../server.mjs';

function memory() { const map = new Map(); return { get: async (key, fallback) => structuredClone(map.has(key) ? map.get(key) : fallback), set: async (key, value) => map.set(key, structuredClone(value)) }; }
function flow(node, extra = {}) { return { name: 'Execution fixture', nodes: [{ id: 'input', type: 'input' }, node, { id: 'output', type: 'output' }], edges: [{ from: 'input', to: node.id }, { from: node.id, to: 'output' }], ...extra }; }
async function run(store, workflow, items = [{}], options = {}) { const saved = (await handle({ action: 'save', input: { workflow }, store })).workflow; return (await handle({ action: 'run', input: { id: saved.id, items, ...options }, store })).run; }
async function endpoint(fn) {
  const seen = [], timers = new Set(); let flaky = 0;
  const server = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const record = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') }; seen.push(record);
    const later = callback => { const timer = setTimeout(() => { timers.delete(timer); callback(); }, 250); timers.add(timer); };
    if (req.url.startsWith('/slow')) return later(() => res.end('late'));
    if (req.url.startsWith('/stream')) { res.writeHead(200, { 'content-type': 'text/plain' }); res.write('begin'); return later(() => res.end('end')); }
    if (req.url.startsWith('/redirect')) { res.writeHead(302, { location: '/echo' }); return res.end(); }
    if (req.url.startsWith('/cross')) { res.writeHead(302, { location: new URL(req.url, 'http://fixture').searchParams.get('to') }); return res.end(); }
    if (req.url.startsWith('/large')) return res.end('x'.repeat(1024 * 1024 + 1));
    if (req.url.startsWith('/medium')) return res.end('x'.repeat(900000));
    if (req.url.startsWith('/invalid')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{broken'); }
    if (req.url.startsWith('/token')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ token: 'response-credential-secret' })); }
    if (req.url.startsWith('/flaky') && ++flaky < 3) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ retry: true })); }
    if (req.url.startsWith('/fail')) { res.writeHead(422, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ rejected: true })); }
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'server-cookie-secret; HttpOnly' }); res.end(JSON.stringify(record));
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  try { return await fn({ url: `http://127.0.0.1:${server.address().port}`, seen }); }
  finally { for (const timer of timers) clearTimeout(timer); server.closeAllConnections(); await new Promise(done => server.close(done)); }
}
async function untilFinished(store, id, runId) {
  for (let attempt = 0; attempt < 100; attempt++) { const { run } = await handle({ action: 'run-status', input: { id, runId }, store }); if (run.status !== 'running') return run; await new Promise(done => setTimeout(done, 5)); }
  throw new Error('Fixture did not finish');
}

test('HTTP supports all seven documented methods, JSON/raw bodies, headers, query and from references', async () => endpoint(async ({ url, seen }) => {
  const store = memory();
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
    const config = { method, url: { from: 'endpoint' }, headers: { 'x-fixture': { from: 'header' } }, query: { q: { from: 'value' } }, ...(method === 'POST' ? { bodyType: 'json', body: { message: { from: 'value' }, nested: { enabled: true } } } : method === 'PATCH' ? { bodyType: 'raw', body: { from: 'value' }, headers: { 'content-type': 'text/custom' } } : {}) };
    const result = await run(store, flow({ id: 'request', type: 'http', config }), [{ endpoint: `${url}/echo`, header: 'fixture', value: 'hello world' }]);
    assert.equal(result.status, 'completed'); const response = result.outputs.output[0].response;
    assert.equal(response.statusCode, 200); assert.equal(seen.at(-1).method, method); assert.equal(seen.at(-1).url, '/echo?q=hello+world');
    if (method === 'POST') { assert.deepEqual(JSON.parse(seen.at(-1).body), { message: 'hello world', nested: { enabled: true } }); assert.equal(seen.at(-1).headers['content-type'], 'application/json'); }
    if (method === 'PATCH') { assert.equal(seen.at(-1).body, 'hello world'); assert.equal(seen.at(-1).headers['content-type'], 'text/custom'); }
    if (method === 'HEAD') assert.equal(response.body, null);
  }
}));

test('HTTP retries failing statuses per item and preserves each failed attempt in history', async () => endpoint(async ({ url, seen }) => {
  const result = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/flaky` }, settings: { retry: { maxAttempts: 3, delayMs: 2 } } }));
  assert.equal(result.status, 'completed'); assert.equal(seen.length, 3);
  const trace = result.trace.find(node => node.node === 'request'); assert.deepEqual(trace.attempts.map(attempt => attempt.statusCode), [503, 503, 200]); assert.deepEqual(trace.attempts.map(attempt => attempt.status), ['failed', 'failed', 'completed']);
  assert.equal(trace.attempts[0].error.response.body, '{"retry":true}');
}));

test('HTTP timeout covers delayed headers and a stalled response body, with bounded retries', async () => endpoint(async ({ url, seen }) => {
  for (const path of ['/slow', '/stream']) {
    const result = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}${path}`, timeoutMs: 20 }, settings: { retry: { maxAttempts: 2, delayMs: 1 } } }));
    assert.equal(result.status, 'failed'); assert.equal(result.errorCode, 'HTTP_TIMEOUT'); assert.equal(result.failedNode, 'request'); assert.equal(result.trace.at(-1).attempts.length, 2); assert.equal(result.trace[0].status, 'completed');
  }
  assert.equal(seen.length, 4);
}));

test('HTTP handles redirects, explicit text format and Never Error while JSON failures stay visible', async () => endpoint(async ({ url }) => {
  const followed = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/redirect` } })); assert.equal(followed.outputs.output[0].response.statusCode, 200);
  const manual = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/redirect`, followRedirects: false, neverError: true, responseFormat: 'text', keepInput: false } })); assert.deepEqual(Object.keys(manual.outputs.output[0]), ['response']); assert.equal(manual.outputs.output[0].response.statusCode, 302);
  const failed = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/fail` } })); assert.equal(failed.errorCode, 'HTTP_STATUS'); assert.equal(failed.trace.at(-1).error.statusCode, 422);
  const accepted = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/fail`, neverError: true, responseFormat: 'text' } })); assert.equal(accepted.status, 'completed'); assert.equal(accepted.outputs.output[0].response.body, '{"rejected":true}');
  const invalid = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/invalid` } })); assert.equal(invalid.errorCode, 'HTTP_RESPONSE_FORMAT');
}));

test('HTTP response limits stop retries and record the failed step', async () => endpoint(async ({ url, seen }) => {
  const result = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/large` }, settings: { retry: { maxAttempts: 5 } } })); assert.equal(result.errorCode, 'HTTP_RESPONSE_LIMIT'); assert.equal(result.trace.at(-1).status, 'failed'); assert.equal(seen.length, 1);
}));

test('HTTP stops accumulating responses when the node output reaches its bounded size', async () => endpoint(async ({ url, seen }) => {
  const result = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/medium`, keepInput: false } }), Array.from({ length: 10 }, () => ({}))); assert.equal(result.errorCode, 'EXECUTION_LIMIT'); assert.equal(seen.length, 5); assert.equal(result.trace.at(-1).status, 'failed');
}));

test('run secrets and sensitive request/response headers never appear in persisted history, including echoed bodies', async () => endpoint(async ({ url, seen }) => {
  const directory = await mkdtemp(join(tmpdir(), 'rea-http-secrets-'));
  try {
    const store = await createStore(directory); const workflow = flow({ id: 'request', type: 'http', config: { url: `${url}/echo`, headers: { Authorization: { secret: 'auth' }, Cookie: 'session=cookie-secret', 'x-api-key': { from: 'key' } }, query: { token: { secret: 'query' } } } });
    const result = await run(store, workflow, [{ key: 'header-key-secret' }], { secrets: { auth: 'Bearer credential-secret', query: 'query-secret' } });
    assert.equal(result.status, 'completed'); assert.equal(seen[0].headers.authorization, 'Bearer credential-secret');
    const history = await readFile(join(directory, `automation.history.${result.workflowId}.json`), 'utf8');
    for (const value of ['credential-secret', 'cookie-secret', 'header-key-secret', 'query-secret', 'server-cookie-secret']) assert.equal(history.includes(value), false, value);
    assert.equal(result.outputs.output[0].response.headers['set-cookie'], '[REDACTED]'); assert.equal(result.outputs.output[0].response.body.headers.authorization, '[REDACTED]'); assert.match(result.trace[1].attempts[0].request.url, /REDACTED/);
    const saved = JSON.parse(await readFile(join(directory, `automation.workflow.${result.workflowId}.json`), 'utf8')); assert.deepEqual(saved.nodes[1].config.headers.Authorization, { secret: 'auth' });
  } finally { const target = resolve(directory); assert.ok(target.startsWith(resolve(tmpdir()))); await rm(target, { recursive: true, force: true }); }
}));

test('error-output routes failed items away from success output; continue passes last input onward', async () => endpoint(async ({ url }) => {
  const workflow = { name: 'Error routing', nodes: [{ id: 'input', type: 'input' }, { id: 'request', type: 'http', config: { url: { from: 'url' } }, settings: { onError: 'error-output' } }, { id: 'ok', type: 'output' }, { id: 'errors', type: 'output' }], edges: [{ from: 'input', to: 'request' }, { from: 'request', to: 'ok' }, { from: 'request', to: 'errors', port: 'error' }] };
  const result = await run(memory(), workflow, [{ url: `${url}/echo` }, { url: `${url}/fail` }]); assert.equal(result.status, 'completed'); assert.equal(result.outputs.ok.length, 1); assert.equal(result.outputs.errors.length, 1); assert.equal(result.outputs.errors[0].error.statusCode, 422); assert.equal(result.trace[1].status, 'continued');
  const original = { url: `${url}/fail`, value: 5 }; const continued = await run(memory(), flow({ id: 'request', type: 'http', config: { url: { from: 'url' } }, settings: { onError: 'continue' } }), [original]); assert.deepEqual(continued.outputs.output, [original]);
}));

test('credentials copied from sensitive input or response fields remain redacted after mapping', async () => endpoint(async ({ url }) => {
  const workflow = { name: 'Response credential mapping', nodes: [{ id: 'input', type: 'input' }, { id: 'request', type: 'http', config: { url: `${url}/token` } }, { id: 'map', type: 'map', config: { keep: false, fields: { copied: { from: 'response.body.token' }, moved: { from: 'password' } } } }, { id: 'output', type: 'output' }], edges: [{ from: 'input', to: 'request' }, { from: 'request', to: 'map' }, { from: 'map', to: 'output' }] };
  const result = await run(memory(), workflow, [{ password: 'input-password-secret' }]); assert.equal(result.status, 'completed'); assert.deepEqual(result.outputs.output, [{ copied: '[REDACTED]', moved: '[REDACTED]' }]);
}));

test('empty branch streams never issue HTTP requests or invoke a saved workflow', async () => endpoint(async ({ url, seen }) => {
  const workflow = { name: 'No branch effects', nodes: [{ id: 'input', type: 'input' }, { id: 'branch', type: 'branch', config: { field: 'value', op: 'eq', value: true } }, { id: 'request', type: 'http', config: { url: `${url}/echo` } }, { id: 'call', type: 'call', config: { workflowId: 'missing' } }, { id: 'yes', type: 'output' }, { id: 'no', type: 'output' }], edges: [{ from: 'input', to: 'branch' }, { from: 'branch', to: 'request', port: 'true' }, { from: 'request', to: 'call' }, { from: 'call', to: 'yes' }, { from: 'branch', to: 'no', port: 'false' }] };
  const result = await run(memory(), workflow, [{ value: false }]); assert.equal(result.status, 'completed'); assert.equal(seen.length, 0); assert.deepEqual(result.outputs.yes, []); assert.equal(result.trace.find(node => node.node === 'request').status, 'skipped'); assert.equal(result.trace.find(node => node.node === 'call').status, 'skipped');
}));

test('wait passes immutable input after its interval and workflow timeout interrupts it', async () => {
  const items = [{ nested: { value: 4 } }]; const startAt = performance.now(); const result = await executeWorkflowAsync(flow({ id: 'delay', type: 'wait', config: { delayMs: 25 } }), items); assert.ok(performance.now() - startAt >= 20); assert.deepEqual(result.outputs.output, items); assert.notEqual(result.outputs.output[0], items[0]);
  const failed = await run(memory(), flow({ id: 'delay', type: 'wait', config: { delayMs: 200 } }, { settings: { timeoutMs: 15 } })); assert.equal(failed.errorCode, 'WORKFLOW_TIMEOUT'); assert.equal(failed.trace.at(-1).node, 'delay');
});

test('saved workflows run with all or each items and child failure traces retain their parent call', async () => {
  const store = memory(); const child = (await handle({ action: 'save', input: { workflow: flow({ id: 'count', type: 'aggregate', config: { op: 'count' } }) }, store })).workflow;
  for (const [mode, expected] of [['all', [2]], ['each', [1, 1]]]) { const result = await run(store, flow({ id: 'call', type: 'call', config: { workflowId: child.id, mode, outputId: 'output' } }), [{ value: 1 }, { value: 2 }]); assert.equal(result.status, 'completed'); assert.deepEqual(result.outputs.output.map(item => item.value), expected); assert.equal(result.trace[1].calls.length, expected.length); assert.equal(result.trace[1].calls[0].trace.at(-1).node, 'output'); }
  const broken = structuredClone(child); broken.nodes[1].config = { op: 'sum' }; await handle({ action: 'save', input: { id: child.id, workflow: broken }, store }); const result = await run(store, flow({ id: 'call', type: 'call', config: { workflowId: child.id } }), [{ value: Number.MAX_VALUE }, { value: Number.MAX_VALUE }]); assert.equal(result.status, 'failed'); assert.equal(result.failedNode, 'call'); assert.equal(result.trace[1].calls[0].trace.at(-1).node, 'count');
});

test('recursive saved workflow calls fail within bounded depth and error policies apply to transformations', async () => {
  const store = memory(); const recursive = flow({ id: 'call', type: 'call', config: { workflowId: 'recursive' } }); await handle({ action: 'save', input: { id: 'recursive', workflow: recursive }, store }); const result = (await handle({ action: 'run', input: { id: 'recursive', items: [{}] }, store })).run; assert.equal(result.errorCode, 'CALL_CYCLE'); assert.equal(result.trace.at(-1).node, 'call');
  const continued = await run(store, flow({ id: 'total', type: 'aggregate', config: { op: 'sum' }, settings: { onError: 'continue', retry: { maxAttempts: 2 } } }), [{ value: Number.MAX_VALUE }, { value: Number.MAX_VALUE }]); assert.equal(continued.status, 'completed'); assert.equal(continued.outputs.output.length, 2); assert.equal(continued.trace[1].attempts.length, 2); assert.equal(continued.trace[1].status, 'continued');
});

test('start/status/cancel interrupts wait and HTTP, persists cancellation, and blocks active deletion', async () => endpoint(async ({ url }) => {
  for (const node of [{ id: 'delay', type: 'wait', config: { delayMs: 1000 } }, { id: 'request', type: 'http', config: { url: `${url}/slow`, timeoutMs: 1000 } }]) {
    const store = memory(); const saved = (await handle({ action: 'save', input: { workflow: flow(node) }, store })).workflow; const active = (await handle({ action: 'start', input: { id: saved.id, items: [{}] }, store })).run; assert.equal(active.status, 'running');
    await assert.rejects(handle({ action: 'delete', input: { id: saved.id }, store }), /active executions/); await new Promise(done => setTimeout(done, 15)); await handle({ action: 'cancel', input: { id: saved.id, runId: active.id }, store });
    const final = await untilFinished(store, saved.id, active.id); assert.equal(final.status, 'cancelled'); assert.equal(final.errorCode, 'CANCELLED'); assert.equal(final.trace.at(-1).status, 'cancelled'); const history = (await handle({ action: 'history', input: { id: saved.id }, store })).runs; assert.equal(history.length, 1); assert.equal(history[0].status, 'cancelled');
  }
}));

test('concurrent background completions retain both histories and stale running records become interrupted', async () => {
  const store = memory(); const saved = (await handle({ action: 'save', input: { workflow: flow({ id: 'delay', type: 'wait', config: { delayMs: 10 } }) }, store })).workflow;
  const starts = await Promise.all([1, 2].map(value => handle({ action: 'start', input: { id: saved.id, items: [{ value }] }, store }))); await Promise.all(starts.map(({ run }) => untilFinished(store, saved.id, run.id))); assert.equal((await handle({ action: 'history', input: { id: saved.id }, store })).runs.length, 2);
  await store.set(`automation.history.${saved.id}`, [{ id: 'old-run', workflowId: saved.id, status: 'running' }]); const history = (await handle({ action: 'history', input: { id: saved.id }, store })).runs; assert.equal(history[0].status, 'interrupted');
});

test('validation rejects unsafe HTTP URLs, invalid policies, body methods, ports and time bounds', () => {
  for (const config of [{ url: 'file:///etc/passwd' }, { url: 'http://user:pass@localhost' }, { url: 'http://localhost', method: 'GET', bodyType: 'json', body: {} }, { url: 'http://localhost', headers: { Authorization: 'a\r\nb' } }, { url: 'http://localhost', headers: { 'content-length': '3' } }, { url: 'http://localhost', timeoutMs: 60001 }]) assert.throws(() => validateWorkflow(flow({ id: 'request', type: 'http', config })));
  assert.throws(() => validateWorkflow(flow({ id: 'delay', type: 'wait', config: { delayMs: -1 } })), /Wait delay/); assert.throws(() => validateWorkflow(flow({ id: 'delay', type: 'wait', config: { delayMs: 60001 } })), /Wait delay/); assert.throws(() => validateWorkflow(flow({ id: 'delay', type: 'wait', settings: { retry: { maxAttempts: 6 } } })), /Retry attempts/);
  const errorPort = flow({ id: 'delay', type: 'wait' }); errorPort.edges[1].port = 'error'; assert.throws(() => validateWorkflow(errorPort), /error-output policy/);
});

test('normal cross-origin redirects remove authorization and cookie credentials', async () => endpoint(async ({ url }) => endpoint(async ({ url: target, seen }) => {
  const result = await run(memory(), flow({ id: 'request', type: 'http', config: { url: `${url}/cross?to=${encodeURIComponent(`${target}/echo`)}`, headers: { authorization: 'Bearer redirect-secret', cookie: 'session=redirect-cookie' } } }));
  assert.equal(result.status, 'completed'); assert.equal(seen.length, 1); assert.equal(seen[0].headers.authorization, undefined); assert.equal(seen[0].headers.cookie, undefined);
})));

test('cancelling a retry delay prevents a second request', async () => endpoint(async ({ url, seen }) => {
  const store = memory(); const saved = (await handle({ action: 'save', input: { workflow: flow({ id: 'request', type: 'http', config: { url: `${url}/fail` }, settings: { retry: { maxAttempts: 5, delayMs: 1000 } } }) }, store })).workflow;
  const active = (await handle({ action: 'start', input: { id: saved.id, items: [{}] }, store })).run;
  for (let count = 0; count < 100 && !seen.length; count++) await new Promise(done => setTimeout(done, 2));
  assert.equal(seen.length, 1); await handle({ action: 'cancel', input: { id: saved.id, runId: active.id }, store }); const final = await untilFinished(store, saved.id, active.id);
  assert.equal(final.status, 'cancelled'); assert.equal(seen.length, 1); assert.equal(final.trace.at(-1).attempts.length, 1);
}));

test('real host routes permit cancellation while a background run waits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rea-host-execution-')); const host = await start({ port: 0, dataDir: directory });
  try {
    const api = async (action, input) => { const response = await fetch(`${host.url}/api/automation/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); assert.equal(response.status, 200); return (await response.json()).result; };
    const saved = (await api('save', { workflow: flow({ id: 'delay', type: 'wait', config: { delayMs: 1000 } }) })).workflow; const active = (await api('start', { id: saved.id, items: [{}] })).run; await api('cancel', { id: saved.id, runId: active.id });
    let final; for (let count = 0; count < 100; count++) { final = (await api('run-status', { id: saved.id, runId: active.id })).run; if (final.status !== 'running') break; await new Promise(done => setTimeout(done, 5)); }
    assert.equal(final.status, 'cancelled'); assert.equal((await api('history', { id: saved.id })).runs[0].status, 'cancelled');
  } finally { await host.close(); const target = resolve(directory); assert.ok(target.startsWith(resolve(tmpdir()))); await rm(target, { recursive: true, force: true }); }
});
