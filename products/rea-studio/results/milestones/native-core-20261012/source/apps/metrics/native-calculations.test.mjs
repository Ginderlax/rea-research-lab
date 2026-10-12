import test from 'node:test';
import assert from 'node:assert/strict';
import { calculationDefinitions, reduceField, encodeCalculation, decodeCalculation, fieldReducers, isReducerID } from './native-calculations.mjs';
import { handle, statistics } from './server.mjs';

test('documented calculation choices expose every released percentile and extra countAll with aliases', () => {
  assert.equal(calculationDefinitions.length, 124);
  for (let p = 1; p <= 99; p++) assert.equal(isReducerID(`p${p}`), true);
  assert.equal(fieldReducers.get('avg').id, 'mean'); assert.equal(fieldReducers.get('current').id, 'lastNotNull'); assert.equal(fieldReducers.get('total').id, 'sum');
  assert.equal(isReducerID('avg'), false); assert.equal(isReducerID('__proto__'), false);
  assert.deepEqual(fieldReducers.list(['avg', 'unknown', 'total']).map(item => item.id), ['mean', 'sum']);
});
test('native population variance and rounded-index percentiles remain separate from simple CSV statistics', () => {
  const field = { type: 'number', config: {}, values: [2, 4, null, 6, 8] };
  const native = reduceField({ field, reducers: ['variance', 'stdDev', 'p50', 'p95', 'median', 'countAll'] });
  assert.equal(native.variance, 5); assert.equal(native.stdDev, Math.sqrt(5)); assert.equal(native.p50, 6); assert.equal(native.p95, 8); assert.equal(native.median, 5); assert.equal(native.countAll, 5);
  assert.equal(native.mean, 5); assert.equal(native.count, 4);
  const simple = statistics(field.values); assert.equal(simple.median, 5); assert.equal(simple.sampleStdDev, Math.sqrt(20 / 3));
});
test('released null modes and single-selection fast paths retain their observable differences', () => {
  const standalone = reduceField({ field: { type: 'number', config: { nullValueMode: 'null as zero' }, values: [null] }, reducers: ['firstNotNull'] });
  const combined = reduceField({ field: { type: 'number', config: { nullValueMode: 'null as zero' }, values: [null] }, reducers: ['firstNotNull', 'count'] });
  assert.deepEqual(standalone, { firstNotNull: null }); assert.equal(combined.firstNotNull, 0); assert.equal(combined.count, 1); assert.equal(combined.first, null); assert.equal(combined.allIsZero, true);
  const counts = reduceField({ field: { type: 'other', config: {}, values: [null, undefined, 'x', 'x', NaN, NaN] }, reducers: ['distinctCount', 'changeCount', 'allValues', 'uniqueValues'] });
  assert.equal(counts.distinctCount, 3); assert.equal(counts.changeCount, 3); assert.deepEqual(counts.uniqueValues, [null, undefined, 'x', NaN]);
  const empty = reduceField({ field: { type: 'number', config: {}, values: [] }, reducers: ['sum', 'allIsZero', 'allIsNull', 'median'] });
  assert.deepEqual(empty, { sum: 0, allIsZero: false, allIsNull: true, median: undefined });
  const allNullMedian = reduceField({ field: { type: 'number', config: {}, values: [null, undefined] }, reducers: ['median'] }); assert.equal(Number.isNaN(allNullMedian.median), true);
});
test('calculation cache survives value changes until explicitly cleared and retains unrelated entries', () => {
  const field = { type: 'number', config: {}, values: [3, 7], state: { calcs: { unrelated: 'saved' }, metadata: 'keep' } };
  const first = reduceField({ field, reducers: ['mean'] }); assert.equal(first.mean, 5); assert.equal(field.state.calcs.unrelated, 'saved');
  field.values = [100]; const cached = reduceField({ field, reducers: ['mean'] }); assert.equal(cached.mean, 5); assert.equal(cached.unrelated, 'saved'); assert.equal(field.state.metadata, 'keep');
  field.state.calcs = {}; assert.equal(reduceField({ field, reducers: ['mean'] }).mean, 100);
  const specialized = reduceField({ field, reducers: ['p50'] }); assert.deepEqual(specialized, { p50: 100 }); assert.equal(field.state.calcs.mean, 100);
});
test('HTTP calculation transport preserves undefined keys, NaN, infinities and negative zero', async () => {
  const sample = [undefined, NaN, Infinity, -Infinity, -0, null, 1]; assert.deepEqual(decodeCalculation(encodeCalculation(sample)), sample);
  const empty = await handle({ action: 'native-reduce', input: { field: { type: 'number', values: [] }, reducers: ['median', 'sum'] } });
  assert.deepEqual(empty.result, { median: { $undefined: true }, sum: 0 });
  const last = await handle({ action: 'native-reduce', input: { field: { type: 'number', values: [{ $number: '-0' }] }, reducers: ['last'] } }); assert.deepEqual(last.result.last, { $number: '-0' });
  const median = await handle({ action: 'native-reduce', input: { field: { type: 'number', values: [null] }, reducers: ['median'] } }); assert.deepEqual(median.result.median, { $number: 'NaN' });
  const explicitNullMode = await handle({ action: 'native-reduce', input: { field: { type: 'number', config: { nullValueMode: null }, values: [null, 4] }, reducers: ['count'] } }); assert.equal(explicitNullMode.nullValueMode, null); assert.equal(explicitNullMode.result.count, 2);
});
test('local calculation bounds reject oversized inputs and unsafe cache/transport objects', async () => {
  const call = input => handle({ action: 'native-reduce', input });
  await assert.rejects(call({ field: { type: 'number', values: Array(25001).fill(0) }, reducers: ['count'] }), /25,000/);
  await assert.rejects(call({ field: { type: 'number', values: ['x'.repeat(4097)] }, reducers: ['last'] }), /4,096/);
  await assert.rejects(call({ field: { type: 'number', values: Array(300).fill('x'.repeat(4096)) }, reducers: ['last'] }), /1 MiB/);
  await assert.rejects(call({ field: { type: 'number', values: [1], state: { calcs: { hasOwnProperty: 1 } } }, reducers: ['mean'] }), /safe keys/);
  await assert.rejects(call({ field: { type: 'number', values: [{ $number: 'other' }] }, reducers: ['mean'] }), /Unknown tagged/);
  await assert.rejects(call({ field: { type: 'number', values: [{ value: 1 }] }, reducers: ['mean'] }), /primitives/);
  await assert.rejects(call({ field: { type: 'number', values: [1] }, reducers: Array(257).fill('sum') }), /256/);
  const records = new Map(), store = { get: async (key, fallback) => structuredClone(records.get(key) ?? fallback), set: async (key, value) => records.set(key, structuredClone(value)), list: async prefix => [...records.keys()].filter(key => key.startsWith(prefix)) };
  const original = JSON.stringify({ title: 'Bounded stat', panels: [{ type: 'stat', options: { reduceOptions: { calcs: calculationDefinitions.map(item => item.id) } }, targets: [{ refId: 'A', data: [{ fields: [{ name: 'a', type: 'number', values: Array(25000).fill(2) }, { name: 'b', type: 'number', values: Array(25000).fill(4) }] }] }] }] });
  const saved = await handle({ action: 'grafana-import', input: { content: original }, store });
  const loaded = await handle({ action: 'grafana-load', input: saved, store }); assert.equal(loaded.panels[0].preview.kind, 'retained'); assert.match(loaded.panels[0].preview.warnings.join(' '), /4,000,000/);
  assert.equal((await handle({ action: 'grafana-export', input: saved, store })).content, original);
});
