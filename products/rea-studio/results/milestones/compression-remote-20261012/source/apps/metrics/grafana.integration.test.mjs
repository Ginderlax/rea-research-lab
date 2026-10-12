import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';
test('Grafana document bytes, precise edits and local bindings survive real HTTP host restarts', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'rea-grafana-http-')); let host = await start({ port: 0, dataDir });
  t.after(async () => { await host.close(); assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(dataDir).startsWith('rea-grafana-http-')); await rm(dataDir, { recursive: true, force: true }); });
  async function call(action, input = {}) { const response = await fetch(`${host.url}/api/metrics/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, 200, payload.error); return payload.result; }
  const original = await readFile(new URL('./fixtures/local-dashboard.json', import.meta.url), 'utf8'); let record = await call('grafana-import', { content: original });
  const dataset = await call('ingest', { name: 'Disk-bound data', csv: 'value\n2\n8' }); record = await call('grafana-bind', { ...record, path: '1', refId: 'A', query: { datasetId: dataset.id, metric: 'value', aggregate: 'mean' } });
  await host.close(); host = await start({ port: 0, dataDir }); assert.equal((await call('grafana-export', record)).content, original); let loaded = await call('grafana-load', record); assert.deepEqual(loaded.panels[1].preview.frames[0].fields[0].values, [5]); assert.equal(loaded.bindings['1'].A.datasetId, dataset.id);
  record = await call('grafana-panel-update', { ...record, path: '0', patch: { title: 'Changed title' } });
  await host.close(); host = await start({ port: 0, dataDir }); const expected = JSON.parse(original); expected.panels[0].title = 'Changed title'; assert.deepEqual(JSON.parse((await call('grafana-export', record)).content), expected);
  loaded = await call('grafana-load', record); assert.equal(loaded.panels[0].title, 'Changed title'); assert.equal((await fetch(`${host.url}/apps/metrics/core.mjs`)).status, 200);
});
