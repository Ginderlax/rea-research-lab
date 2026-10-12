import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';
test('metrics HTTP ingestion, dashboard and alert survive a host restart on real disk', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'rea-metrics-http-')); let host = await start({ port: 0, dataDir });
  t.after(async () => { await host.close(); assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(dataDir).startsWith('rea-metrics-http-')); await rm(dataDir, { recursive: true, force: true }); });
  async function call(action, input = {}) { const response = await fetch(`${host.url}/api/metrics/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, 200, payload.error); return payload.result; }
  const dataset = await call('ingest', { name: 'Persistent', csv: 'timestamp,value\n2026-01-01T00:00:00Z,10\n2026-01-01T00:00:30Z,30' });
  await call('panel-save', { title: 'Minute mean', datasetId: dataset.id, metric: 'value', timeColumn: 'timestamp', intervalSeconds: 60 });
  await call('alert-save', { title: 'Above 15', datasetId: dataset.id, metric: 'value', operator: 'gt', threshold: 15 });
  await host.close(); host = await start({ port: 0, dataDir });
  assert.equal((await call('list')).datasets[0].rowCount, 2);
  assert.equal((await call('dashboard')).panels[0].result.points[0].value, 20);
  assert.equal((await call('alerts-evaluate')).alerts[0].state, 'firing');
  assert.equal(JSON.parse((await call('export', { datasetId: dataset.id })).content).rows.length, 2);
  assert.equal((await fetch(`${host.url}/apps/metrics/client.mjs`)).status, 200);
});
