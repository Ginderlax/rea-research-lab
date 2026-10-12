import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, parseCsv, statistics, query } from './server.mjs';
function fixture() { const data = new Map(); const store = { get: async (key, fallback) => structuredClone(data.get(key) ?? fallback), set: async (key, value) => { data.set(key, structuredClone(value)); }, list: async prefix => [...data.keys()].filter(key => key.startsWith(prefix)) }; return { data, store, call: (action, input) => handle({ action, input, store }) }; }
test('CSV quotes, CRLF, multiline, missing cells, exponent typing and dangerous-looking names survive correctly', () => {
  const parsed = parseCsv('\uFEFF__proto__,label,value\r\n"safe","a,b",1e2\r\n"other","multi\nline",\r\n"x","a""b",-2.5');
  assert.equal(Object.hasOwn(parsed.rows[0], '__proto__'), true); assert.equal(parsed.rows[0].label, 'a,b'); assert.equal(parsed.rows[0].value, 100);
  assert.equal(parsed.rows[1].label, 'multi\nline'); assert.equal(parsed.rows[1].value, null); assert.equal(parsed.rows[2].label, 'a"b'); assert.equal(parsed.rows[2].value, -2.5);
  for (const csv of ['a,a\n1,2', 'a,b\n1', 'a\n"x', 'a\n"x"z']) assert.throws(() => parseCsv(csv));
});
test('statistics explicitly count null/non-numeric values and calculate sample deviation/nearest-rank p95', () => {
  const result = statistics([1, 2, 3, 4, null, '5']);
  assert.equal(result.count, 4); assert.equal(result.missing, 1); assert.equal(result.nonNumeric, 1); assert.equal(result.mean, 2.5); assert.equal(result.median, 2.5); assert.equal(result.p95, 4); assert.ok(Math.abs(result.sampleStdDev - Math.sqrt(5 / 3)) < 1e-12);
  assert.equal(statistics([]).sum, null); assert.equal(statistics([1]).sampleStdDev, null);
  assert.throws(() => statistics([Number.MAX_VALUE, Number.MAX_VALUE]), /overflow/);
});
test('real ingestion persists across handler calls, queries time/category groups and reports invalid timestamps', async () => {
  const { store, call } = fixture();
  const dataset = await call('ingest', { name: 'cpu', csv: 'time,service,value\n2026-01-01T00:00:00Z,web,10\n2026-01-01T00:00:30Z,web,30\n2026-01-01T00:01:00Z,web,50\n2026-01-01T00:00:00Z,db,90\nbad,web,70' });
  const result = await handle({ action: 'query', input: { datasetId: dataset.id, metric: 'value', aggregate: 'mean', timeColumn: 'time', groupColumn: 'service', intervalSeconds: 60, filters: [{ column: 'service', operator: 'eq', value: 'web' }] }, store });
  assert.equal(result.rowsMatched, 3); assert.equal(result.invalidTimes, 1); assert.equal(result.statistics.mean, 30); assert.deepEqual(result.points.map(point => point.value), [20, 50]); assert.equal(result.points[0].time, '2026-01-01T00:00:00.000Z');
  const range = await call('query', { datasetId: dataset.id, metric: 'value', timeColumn: 'time', from: '2026-01-01T00:00:30Z', to: '2026-01-01T00:01:00Z' }); assert.equal(range.rowsMatched, 2);
  assert.equal((await call('list')).datasets[0].rowCount, 5);
  const exported = await call('export', { datasetId: dataset.id }); assert.equal(JSON.parse(exported.content).rows.length, 5);
});
test('saved dashboards and alerts evaluate true, false, no-data and deleted-source error states', async () => {
  const { call } = fixture(), dataset = await call('ingest', { name: 'temperatures', csv: 'value\n10\n30' });
  await call('panel-save', { title: 'Temperature', datasetId: dataset.id, metric: 'value', aggregate: 'mean' });
  await call('alert-save', { title: 'High', datasetId: dataset.id, metric: 'value', aggregate: 'mean', operator: 'gt', threshold: 15 });
  await call('alert-save', { title: 'Low', datasetId: dataset.id, metric: 'value', aggregate: 'mean', operator: 'lt', threshold: 15 });
  await call('alert-save', { title: 'Empty', datasetId: dataset.id, metric: 'value', aggregate: 'mean', operator: 'gt', threshold: 0, filters: [{ column: 'value', operator: 'gt', value: 100 }] });
  assert.equal((await call('dashboard')).panels[0].result.statistics.mean, 20);
  assert.deepEqual((await call('alerts-evaluate')).alerts.map(alert => alert.state), ['firing', 'normal', 'no-data']);
  await call('dataset-delete', { id: dataset.id }); assert.equal((await call('dashboard')).panels[0].error, 'Dataset does not exist.'); assert.equal((await call('alerts-evaluate')).alerts[0].state, 'error'); assert.equal((await call('list')).datasets.length, 0);
});
test('query rejects malformed filters, unsafe property operators and invalid options', async () => {
  const dataset = { id: 'x', ...parseCsv('time,value\n2026-01-01T00:00:00Z,1') };
  for (const options of [{ metric: 'no' }, { metric: 'value', aggregate: 'eval' }, { metric: 'value', filters: [{ column: 'value', operator: '__proto__', value: 1 }] }, { metric: 'value', timeColumn: 'time', intervalSeconds: 0 }, { metric: 'value', from: '2026-01-01T00:00:00Z' }, { metric: 'value', timeColumn: 'time', from: 'local yesterday' }]) assert.throws(() => query(dataset, options));
  await assert.rejects(handle({ action: 'eval', input: {} }), /Unknown/);
});
test('invalid calendar timestamps are excluded and alert time ranges survive persistence', async () => {
  const { call } = fixture();
  const dataset = await call('ingest', { name: 'calendar', csv: 'time,value\n2026-02-28T00:00:00Z,10\n2026-02-30T00:00:00Z,1000\n2026-03-01T00:00:00Z,20' });
  const grouped = await call('query', { datasetId: dataset.id, metric: 'value', timeColumn: 'time' }); assert.equal(grouped.invalidTimes, 1); assert.equal(grouped.statistics.mean, 15);
  await call('alert-save', { title: 'February', datasetId: dataset.id, metric: 'value', timeColumn: 'time', to: '2026-02-28T23:59:59Z', aggregate: 'mean', operator: 'gt', threshold: 15 });
  const alert = (await call('alerts-evaluate')).alerts[0]; assert.equal(alert.value, 10); assert.equal(alert.state, 'normal');
});
