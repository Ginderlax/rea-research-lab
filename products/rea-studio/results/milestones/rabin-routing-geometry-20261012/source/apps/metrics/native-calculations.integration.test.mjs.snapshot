import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';

test('real HTTP native calculations use local CSV filters, exact transport/cache and preserved stat dashboards', async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'rea-native-http-')); let host = await start({ port: 0, dataDir });
  t.after(async () => { await host.close(); assert.ok(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(dataDir).startsWith('rea-native-http-')); await rm(dataDir, { recursive: true, force: true }); });
  async function call(action, input = {}) { const response = await fetch(`${host.url}/api/metrics/${action}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-rea-token': host.token }, body: JSON.stringify(input) }); const payload = await response.json(); assert.equal(response.status, 200, payload.error); return payload.result; }
  const catalogue = await call('native-calculations'); assert.equal(catalogue.calculations.length, 124); assert.equal(catalogue.calculations[0].id, 'lastNotNull'); assert.equal(catalogue.calculations.at(-1).id, 'p99');
  const dataset = await call('ingest', { name: 'Native population', csv: 'tag,value\nkeep,2\nkeep,\nkeep,6\nskip,99' });
  const calculated = await call('native-reduce-dataset', { datasetId: dataset.id, metric: 'value', filters: [{ column: 'tag', operator: 'eq', value: 'keep' }], reducers: ['mean', 'stdDev', 'countAll', 'allValues'], config: { nullValueMode: 'null as zero' } });
  assert.equal(calculated.samples, 3); assert.equal(calculated.result.mean, 8 / 3); assert.equal(calculated.result.stdDev, 2); assert.equal(calculated.result.countAll, 3); assert.deepEqual(calculated.result.allValues, [2, null, 6]);
  const cached = await call('native-reduce', { field: { type: 'number', values: [900], state: calculated.state }, reducers: ['mean'] }); assert.equal(cached.result.mean, 8 / 3);
  const tagged = await call('native-reduce', { field: { type: 'number', values: [{ $number: '-0' }, { $undefined: true }, { $number: 'Infinity' }] }, reducers: ['allValues'] }); assert.deepEqual(tagged.result.allValues, [{ $number: '-0' }, { $undefined: true }, { $number: 'Infinity' }]);
  const document = JSON.parse(await readFile(new URL('./fixtures/native-stat-dashboard.json', import.meta.url), 'utf8'));
  const text = JSON.stringify(document, null, 3); let saved = await call('grafana-import', { content: text });
  let loaded = await call('grafana-load', saved); assert.deepEqual(loaded.panels[0].preview.calculations[0].fields[0].values, { stdDev: 2, countAll: 3 }); assert.equal((await call('grafana-export', saved)).content, text);
  saved = await call('grafana-panel-update', { ...saved, path: '0', patch: { calculations: ['mean', 'p50'] } });
  const expected = structuredClone(document); expected.panels[0].options.reduceOptions.calcs = ['mean', 'p50']; assert.deepEqual(JSON.parse((await call('grafana-export', saved)).content), expected);
  await host.close(); host = await start({ port: 0, dataDir }); loaded = await call('grafana-load', saved); assert.deepEqual(loaded.panels[0].preview.calculations[0].fields[0].values, { mean: 8 / 3, p50: 2 });
  const fresh = await call('native-reduce-dataset', { datasetId: dataset.id, metric: 'value', filters: [{ column: 'tag', operator: 'eq', value: 'keep' }], reducers: ['variance'] }); assert.equal(fresh.result.variance, 4);
  const client = await (await fetch(`${host.url}/apps/metrics/client.mjs`)).text(); assert.match(client, /Native calculation values JSON/); assert.match(client, /Calculate CSV column/);
});
