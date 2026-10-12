import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseNative, nativePreflight, executeNative, inspectNativeState, nativeRead, nativeWrite, nativeSwitch, boundedLiteralReplace } from './native.mjs';
import { handle } from './server.mjs';
import { createStore } from '../../lib/storage.mjs';
import { start as startHost } from '../../server.mjs';
const demo = await readFile(new URL('./fixtures/native-demo.json', import.meta.url), 'utf8');
const encode = nodes => JSON.stringify(nodes);
const withoutId = message => Object.fromEntries(Object.entries(message).filter(([key]) => key !== '_msgid'));
const document = middle => [{ id: 'tab', type: 'tab', label: 'Tests' }, { id: 'in', type: 'inject', z: 'tab', props: [], wires: [[middle.id]] }, { ...middle, z: 'tab', wires: [['out']] }, { id: 'out', type: 'debug', z: 'tab', complete: 'true', active: true, tosidebar: true, wires: [] }];
function memory() { const values = new Map(); return { get: async (k, fallback) => structuredClone(values.has(k) ? values.get(k) : fallback), set: async (k, v) => values.set(k, structuredClone(v)) }; }
test('preserves raw native JSON, envelope metadata, unknown nodes and properties', async () => {
  const text = '\r\n' + JSON.stringify({ rev: 'original', vendor: { untouched: [1, 2] }, flows: [...JSON.parse(demo), { id: 'unknown', type: 'community-node', option: 'retained', wires: [] }] }, null, 3) + '\r\n';
  const store = memory(), saved = await handle({ action: 'native-save', input: { name: 'Retained', text }, store });
  assert.equal((await handle({ action: 'native-export', input: { id: saved.flow.id }, store })).text, text);
  assert.equal(saved.flow.issues[0].node, 'unknown');
  assert.equal(parseNative(text).document.vendor.untouched[1], 2);
  assert.equal(nativePreflight(parseNative(text)).reachable.length, 5);
});
test('executes the native demo with typed injection and ordered persistent flow context', async () => {
  const result = await executeNative(demo);
  assert.equal(result.debug.length, 1); assert.equal(result.debug[0].node, 'hot.demo');
  assert.deepEqual(withoutId(result.debug[0].message), { payload: 28, topic: 'temperature', remembered: 28 });
  assert.equal(result.state.flows['tab.demo'].lastTemperature, 28);
});
test('static dotted and bracket paths support arrays, deletion and scalar parent behavior', () => {
  const message = { payload: { values: [1, 2, 3], no: null } };
  nativeWrite(message, 'payload.values[1]', undefined); assert.deepEqual(message.payload.values, [1, 3]);
  assert.equal(nativeWrite(message, 'payload.no.child', 5), false); assert.equal(message.payload.no, null);
  nativeWrite(message, 'payload["nested"][0].value', 4); assert.equal(nativeRead(message, "payload['nested'][0].value"), 4);
  assert.throws(() => nativeWrite(message, 'payload.__proto__.poison', true), /Invalid/);
  assert.throws(() => nativeWrite(message, 'payload[msg.key]', true), /static/);
  assert.throws(() => nativeWrite(message, 'payload.values[10000]', true), /9,999/);
  assert.throws(() => nativeWrite(message, 'payload.values["99999999"]', true), /9,999/);
  assert.throws(() => nativeWrite(message, 'payload.values.length', 99999999), /array length/);
  assert.equal(message.payload.values.length, 2);
});
test('sparse arrays, quoted index growth and direct length writes are bounded before serialization', async () => {
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload["60000"]', pt: 'msg', to: 'true', tot: 'bool' }] });
  await assert.rejects(executeNative(encode(nodes), { messages: [{ payload: [] }] }), /9,999/);
  nodes[2].rules[0] = { t: 'set', p: 'payload.length', pt: 'msg', to: '60000', tot: 'num' };
  await assert.rejects(executeNative(encode(nodes), { messages: [{ payload: [] }] }), /array length/);
  const input = { payload: new Array(60000) }; await assert.rejects(executeNative(demo, { messages: [input] }), /array exceeds/);
  const boundary = { payload: [] }; nativeWrite(boundary, 'payload["9999"]', true); assert.equal(boundary.payload.length, 10000); assert.equal(boundary.payload[9999], true);
});
test('ordered native changes set, replace, move and delete message and context fields', async () => {
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'remember', pt: 'global', to: 'payload', tot: 'msg' }, { t: 'change', p: 'payload', pt: 'msg', from: 'a', fromt: 'str', to: 'x', tot: 'str' }, { t: 'move', p: 'payload', pt: 'msg', to: 'nested.result', tot: 'msg' }, { t: 'set', p: 'copy', pt: 'msg', to: 'remember', tot: 'global' }, { t: 'delete', p: 'remove', pt: 'msg' }] });
  const result = await executeNative(encode(nodes), { messages: [{ payload: 'aba', remove: 2 }] });
  assert.deepEqual(withoutId(result.debug[0].message), { nested: { result: 'xbx' }, copy: 'aba' }); assert.equal(result.state.global.remember, 'aba');
  const next = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload', pt: 'msg', to: 'remember', tot: 'global' }] });
  assert.equal((await executeNative(encode(next), { packedState: result.packedState })).debug[0].message.payload, 'aba');
});
test('native change honors deep-copy choice, msg prefixes, within-message aliases and first-wire context references', async () => {
  for (const dc of [false, true]) {
    const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'copy', pt: 'msg', to: 'msg.payload', tot: 'msg', dc }, { t: 'set', p: 'msg.copy.child', pt: 'msg', to: '42', tot: 'num' }] });
    const result = await executeNative(encode(nodes), { messages: [{ payload: { child: 1 } }] }); assert.equal(result.debug[0].message.payload.child, dc ? 1 : 42); assert.equal(result.debug[0].message.copy.child, 42);
  }
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'saved', pt: 'flow', to: 'payload', tot: 'msg' }] });
  nodes[2].wires = [['next']]; nodes.push({ id: 'next', type: 'change', z: 'tab', rules: [{ t: 'set', p: 'payload.child', pt: 'msg', to: '42', tot: 'num' }], wires: [['out']] });
  assert.equal((await executeNative(encode(nodes), { messages: [{ payload: { child: 1 } }] })).state.flows.tab.saved.child, 42);
});
test('native binary properties retain Buffer identity across fan-out and persisted contexts', async () => {
  const first = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'saved', pt: 'flow', to: '[0, 1, 255]', tot: 'bin' }, { t: 'set', p: 'payload', pt: 'msg', to: 'saved', tot: 'flow' }] });
  const result = await executeNative(encode(first)); assert.equal(Buffer.isBuffer(result.debug[0].message.payload), true); assert.deepEqual([...result.debug[0].message.payload], [0, 1, 255]);
  const next = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload', pt: 'msg', to: 'saved', tot: 'flow' }] });
  assert.equal(Buffer.isBuffer((await executeNative(encode(next), { packedState: result.packedState })).debug[0].message.payload), true);
});
test('timestamp, ISO and Date-object properties use the requested native type and persist Date identity', async () => {
  const time = Date.parse('2026-10-12T12:00:00.000Z');
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'saved', pt: 'flow', to: 'object', tot: 'date' }, { t: 'set', p: 'date', pt: 'msg', to: 'saved', tot: 'flow' }, { t: 'set', p: 'timestamp', pt: 'msg', to: '', tot: 'date' }, { t: 'set', p: 'iso', pt: 'msg', to: 'iso', tot: 'date' }] });
  const result = await executeNative(encode(nodes), { now: () => time }); assert.equal(result.debug[0].message.date instanceof Date, true); assert.equal(result.debug[0].message.date.getTime(), time); assert.equal(result.debug[0].message.timestamp, time); assert.equal(result.debug[0].message.iso, '2026-10-12T12:00:00.000Z');
  const next = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload', pt: 'msg', to: 'saved', tot: 'flow' }] }); assert.equal((await executeNative(encode(next), { packedState: JSON.parse(JSON.stringify(result.packedState)) })).debug[0].message.payload instanceof Date, true);
  nodes[2].rules[0].to = 'YYYY-MM-DD'; await assert.rejects(executeNative(encode(nodes)), /Custom native date formatting/);
});
test('quoted array deletion preserves holes and encoded context preserves sparse arrays after reopening', async () => {
  const message = { payload: [1, 2, 3] }; nativeWrite(message, 'payload["1"]', undefined); assert.equal(message.payload.length, 3); assert.equal(Object.hasOwn(message.payload, 1), false);
  const first = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'saved', pt: 'flow', to: 'payload', tot: 'msg' }] });
  const result = await executeNative(encode(first), { messages: [message] });
  const next = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload', pt: 'msg', to: 'saved', tot: 'flow' }] });
  const restored = (await executeNative(encode(next), { packedState: JSON.parse(JSON.stringify(result.packedState)) })).debug[0].message.payload;
  assert.equal(restored.length, 3); assert.equal(Object.hasOwn(restored, 1), false); assert.equal(restored[2], 3);
});
test('native switch has coercive comparisons, otherwise segments and previous-value state', async () => {
  const node = { id: 'switch', type: 'switch', property: 'payload', rules: [{ t: 'eq', v: 5, vt: 'num' }, { t: 'else' }, { t: 'eq', v: true, vt: 'bool' }, { t: 'else' }], checkall: 'true' };
  const result = await nativeSwitch(node, { payload: '5' }, { global: {}, flows: {} });
  assert.deepEqual(result.ports, [0, 3]); assert.equal(result.previous, '5');
  const previous = document({ id: 'switch', type: 'switch', property: 'payload', rules: [{ t: 'gt', v: '', vt: 'prev' }], checkall: 'false' });
  const one = await executeNative(encode(previous), { messages: [{ payload: 5 }] }); assert.equal(one.debug.length, 1);
  const two = await executeNative(encode(previous), { messages: [{ payload: 3 }], packedState: one.packedState }); assert.equal(two.debug.length, 0);
});
test('regex matching executes in a disposable bounded worker and invalid patterns fail', async () => {
  const nodes = document({ id: 'switch', type: 'switch', property: 'payload', rules: [{ t: 'regex', v: '^alpha$', vt: 'str', case: true }], checkall: 'false' });
  assert.equal((await executeNative(encode(nodes), { messages: [{ payload: 'ALPHA' }] })).debug.length, 1);
  nodes[2].rules[0].v = '['; await assert.rejects(executeNative(encode(nodes), { messages: [{ payload: 'x' }] }), /regular expression|Unterminated/);
  const config = { id: 's', property: 'payload', rules: [{ t: 'regex', v: '(a+)+$', vt: 'str' }], checkall: 'true' }, started = performance.now();
  await assert.rejects(nativeSwitch(config, { payload: 'a'.repeat(21) + '!' }, { flows: {}, global: {} }, null, Date.now, { deadline: performance.now() + 20 }), /ten seconds/);
  assert.ok(performance.now() - started < 1000);
});
test('bounded literal replacement preserves JavaScript tokens and rejects amplification before constructing results', () => {
  for (const source of ['aba', 'a.b a.b', 'aa', 'λaλ', '𝕒']) for (const search of ['a', 'a.b', '', 'λ']) for (const replacement of ['x', '$&!', '$$-$`-$\'', '$1 $2', '']) {
    const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'); assert.equal(boundedLiteralReplace(source, search, replacement), source.replace(expression, replacement));
  }
  assert.throws(() => boundedLiteralReplace('a'.repeat(1800), 'a', 'x'.repeat(1800)), /result limit/);
  assert.throws(() => boundedLiteralReplace('a'.repeat(100000), 'a', 'x'.repeat(100000)), /result limit/);
});
test('ordered deep-copy changes and injection properties enforce budgets between individual operations', async () => {
  const rules = Array.from({ length: 100 }, (_, index) => ({ t: 'set', p: index % 2 ? 'payload.b' : 'payload.a', pt: 'msg', to: 'payload', tot: 'msg', dc: true }));
  const nodes = document({ id: 'change', type: 'change', rules });
  await assert.rejects(executeNative(encode(nodes), { messages: [{ payload: {} }] }), /structural limit|byte limit/);
  const injected = document({ id: 'change', type: 'change', rules: [] }); injected[1].props = Array.from({ length: 100 }, (_, index) => ({ p: `large${index}`, vt: 'str', v: 'x'.repeat(14000) }));
  await assert.rejects(executeNative(encode(injected)), /byte limit/);
});
test('switch second JSON and null operands use ordinary original value evaluation', async () => {
  const config = { id: 's', property: 'payload', rules: [{ t: 'btwn', v: '0', vt: 'num', v2: '10', v2t: 'json' }] };
  assert.deepEqual((await nativeSwitch(config, { payload: 5 }, { flows: {}, global: {} })).ports, [0]);
  config.rules[0].v2t = 'null'; assert.deepEqual((await nativeSwitch(config, { payload: 5 }, { flows: {}, global: {} })).ports, [0]);
});
test('JSON auto, forced object, forced string and pretty modes preserve other fields', async () => {
  const nodes = document({ id: 'json', type: 'json', property: 'nested.data', pretty: true });
  const parsed = await executeNative(encode(nodes), { messages: [{ nested: { data: '{"a":2}' }, topic: 'keep' }] }); assert.deepEqual(withoutId(parsed.debug[0].message), { nested: { data: { a: 2 } }, topic: 'keep' });
  const serialized = await executeNative(encode(nodes), { messages: [{ nested: { data: { a: 2 } } }] }); assert.equal(serialized.debug[0].message.nested.data, '{\n    "a": 2\n}');
  nodes[2].action = 'obj'; assert.equal((await executeNative(encode(nodes), { messages: [{ nested: { data: 3 } }] })).debug[0].message.nested.data, 3);
  nodes[2].action = 'str'; assert.equal((await executeNative(encode(nodes), { messages: [{ nested: { data: 'already' } }] })).debug[0].message.nested.data, 'already');
  nodes[2].action = ''; await assert.rejects(executeNative(encode(nodes), { messages: [{ nested: { data: 'bad' } }] }), /JSON/);
});
test('preflight rejects reachable unknown nodes, JSONata, sequence repair and missing wires', async () => {
  for (const middle of [{ id: 'a', type: 'function', func: 'return msg' }, { id: 'a', type: 'change', rules: [{ t: 'set', p: 'payload', tot: 'jsonata', to: '$now()' }] }, { id: 'a', type: 'switch', property: 'payload', rules: [], repair: true }]) await assert.rejects(executeNative(encode(document(middle))), /Cannot run/);
  const missing = JSON.parse(demo); missing[1].wires = [['missing']]; await assert.rejects(executeNative(encode(missing)), /target is missing/);
  const unsafeScope = JSON.parse(demo); unsafeScope[1].z = '__proto__'; assert.throws(() => parseNative(encode(unsafeScope)), /node id/);
});
test('disabled nodes and tabs do not execute; branch clones preserve independent edits', async () => {
  const nodes = [{ id: 'in', type: 'inject', props: [], wires: [['a', 'b', 'disabled']] }, { id: 'a', type: 'change', rules: [{ t: 'set', p: 'payload', to: 'a', tot: 'str' }], wires: [['oa']] }, { id: 'b', type: 'change', rules: [{ t: 'set', p: 'payload', to: 'b', tot: 'str' }], wires: [['ob']] }, { id: 'oa', type: 'debug', complete: 'true' }, { id: 'ob', type: 'debug', complete: 'true' }, { id: 'disabled', type: 'unknown', d: true }];
  const input = { payload: 'original' }, result = await executeNative(encode(nodes), { messages: [input] }); assert.deepEqual(result.debug.map(d => d.message.payload), ['a', 'b']); assert.equal(input.payload, 'original');
  const off = JSON.parse(demo); off[0].disabled = true; await assert.rejects(executeNative(encode(off)), /enabled native inject/);
});
test('failed native runs do not persist partial context; cycles and bytes are bounded', async () => {
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'attempt', pt: 'flow', to: 'yes', tot: 'str' }] }); nodes[2].wires = [['change']];
  const store = memory(), { flow } = await handle({ action: 'native-save', input: { name: 'Cycle', text: encode(nodes) }, store }); await handle({ action: 'native-deploy', input: { id: flow.id }, store });
  const { run } = await handle({ action: 'native-inject', input: { id: flow.id }, store }); assert.equal(run.status, 'failed'); assert.match(run.error, /5,000/); assert.equal((await handle({ action: 'native-inspect', input: { id: flow.id }, store })).stateStored, false);
  await assert.rejects(executeNative(demo, { messages: [{ large: 'x'.repeat(1024 * 1024) }] }), /byte limit/);
});
test('draft edits do not change deployment until explicit redeploy', async () => {
  const store = memory(), { flow } = await handle({ action: 'native-save', input: { name: 'Deployment', text: demo }, store }); await handle({ action: 'native-deploy', input: { id: flow.id }, store });
  const next = JSON.parse(demo); next[1].props[0].v = '10'; await handle({ action: 'native-save', input: { id: flow.id, name: 'Deployment', text: encode(next) }, store });
  assert.equal((await handle({ action: 'native-inject', input: { id: flow.id }, store })).run.debug[0].node, 'hot.demo');
  await handle({ action: 'native-deploy', input: { id: flow.id }, store }); assert.equal((await handle({ action: 'native-inject', input: { id: flow.id }, store })).run.debug[0].node, 'normal.demo');
});
test('native definitions, deployments, buffer contexts and runs survive real HTTP host restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rea-native-flow-')); let host;
  try {
    host = await startHost({ port: 0, dataDir: directory });
    const api = async (action, input) => { const response = await fetch(`${host.url}/api/flow/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Rea-Token': host.token }, body: JSON.stringify(input) }); const body = await response.json(); assert.equal(response.status, 200, body.error); return body.result; };
    const { flow } = await api('native-save', { name: 'HTTP restart', text: demo }); await api('native-deploy', { id: flow.id }); assert.equal((await api('native-inject', { id: flow.id })).run.status, 'completed');
    await host.close(); host = await startHost({ port: 0, dataDir: directory });
    assert.equal((await api('native-export', { id: flow.id })).text, demo);
    const inspect = await api('native-inspect', { id: flow.id }); assert.equal(inspect.stateStored, true); assert.equal(inspect.runs.length, 1); assert.equal(inspect.flow.deployedRevision, flow.revision);
    await api('native-reset', { id: flow.id }); assert.equal((await api('native-inspect', { id: flow.id })).stateStored, false);
    await api('native-delete', { id: flow.id }); assert.deepEqual((await api('native-list', {})).flows, []);
  } finally { if (host) await host.close(); await rm(directory, { recursive: true, force: true }); }
});

test('native injection generates a message id once and preserves supplied ids across routing', async () => {
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'observedId', pt: 'msg', to: '_msgid', tot: 'msg' }] });
  const result = await executeNative(encode(nodes), { messages: [{}, { _msgid: 'supplied' }, { _msgid: '' }] });
  assert.match(result.debug[0].message._msgid, /^[0-9a-f]{16}$/); assert.equal(result.debug[0].message.observedId, result.debug[0].message._msgid);
  assert.equal(result.debug[1].message.observedId, 'supplied'); assert.notEqual(result.debug[0].message._msgid, result.debug[2].message._msgid);
});

test('native Buffer byte writes update within-run context aliases without modifying caller memory', async () => {
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'saved', pt: 'flow', to: 'payload', tot: 'msg' }, { t: 'set', p: 'payload[0]', pt: 'msg', to: '255', tot: 'num' }] });
  const input = Buffer.from([1, 2, 3]), result = await executeNative(encode(nodes), { messages: [{ payload: input }] });
  assert.deepEqual([...result.debug[0].message.payload], [255, 2, 3]); assert.deepEqual([...result.state.flows.tab.saved], [255, 2, 3]); assert.deepEqual([...input], [1, 2, 3]);
  assert.throws(() => nativeWrite(input, 'length', 1), /Only native Buffer byte/);
});

test('persisted native state retains object, Buffer and Date aliases across document reopen', async () => {
  for (const payload of [{ child: 1 }, Buffer.from([1, 2]), new Date('2026-10-12T12:00:00Z')]) {
    const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'a', pt: 'flow', to: 'payload', tot: 'msg' }, { t: 'set', p: 'b', pt: 'global', to: 'payload', tot: 'msg' }] });
    const first = await executeNative(encode(nodes), { messages: [{ payload }] }); const state = inspectNativeState(JSON.parse(JSON.stringify(first.packedState)));
    assert.equal(state.flows.tab.a, state.global.b);
  }
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'a', pt: 'flow', to: 'payload', tot: 'msg' }, { t: 'set', p: 'b', pt: 'global', to: 'payload', tot: 'msg' }] });
  const first = await executeNative(encode(nodes), { messages: [{ payload: { child: 1 } }] });
  nodes[2].rules = [{ t: 'set', p: 'a.child', pt: 'flow', to: '42', tot: 'num' }, { t: 'set', p: 'payload', pt: 'msg', to: 'b.child', tot: 'global' }];
  assert.equal((await executeNative(encode(nodes), { packedState: JSON.parse(JSON.stringify(first.packedState)) })).debug[0].message.payload, 42);
});

test('maximum supported static context path can be encoded and reopened without a codec depth rejection', async () => {
  const path = Array.from({ length: 32 }, (_, i) => `k${i}`).join('.');
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: path, pt: 'flow', to: '2', tot: 'num' }] });
  const first = await executeNative(encode(nodes)); const reopened = inspectNativeState(JSON.parse(JSON.stringify(first.packedState)));
  assert.equal(nativeRead(reopened.flows.tab, path), 2);
  assert.throws(() => inspectNativeState(['r', 999]), /Unknown/);
  assert.throws(() => inspectNativeState(['o', [['cyclic', ['r', 0]]], 0]), /structural/);
  assert.throws(() => inspectNativeState(['a', 10001, [], 0]), /Invalid native context array/);
  const legacy = ['o', [['flows', ['o', []]], ['global', ['o', [['old', ['v', 3]]]]], ['previous', ['o', []]]]];
  assert.equal(inspectNativeState(legacy).global.old, 3);
});

test('a saved native draft with different inject ids retains deploy-specific starts', async () => {
  const store = memory(), { flow } = await handle({ action: 'native-save', input: { name: 'Starts', text: demo }, store });
  const deployed = (await handle({ action: 'native-deploy', input: { id: flow.id }, store })).flow; assert.equal(deployed.deployedStarts[0].id, 'inject.demo');
  const nodes = JSON.parse(demo); nodes[1].id = 'different';
  const draft = (await handle({ action: 'native-save', input: { id: flow.id, name: 'Starts', text: encode(nodes) }, store })).flow;
  assert.equal(draft.starts[0].id, 'different'); assert.equal(draft.deployedStarts[0].id, 'inject.demo');
  assert.equal((await handle({ action: 'native-inject', input: { id: flow.id, start: draft.deployedStarts[0].id }, store })).run.status, 'completed');
});

test('context bounds include named array properties and reject lost Buffer own-property writes', async () => {
  const rules = [{ t: 'set', p: 'bag', pt: 'global', to: '[]', tot: 'json' }, { t: 'set', p: 'bag.x', pt: 'global', to: 'x'.repeat(600000), tot: 'str' }, ...Array.from({ length: 11 }, (_, i) => ({ t: 'set', p: `bag.copy${i}`, pt: 'global', to: 'bag.x', tot: 'global' }))];
  await assert.rejects(executeNative(encode(document({ id: 'change', type: 'change', rules }))), /byte limit/);
  const nodes = document({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload.extra.x', pt: 'msg', to: 'cannot survive', tot: 'str' }] });
  await assert.rejects(executeNative(encode(nodes), { messages: [{ payload: Buffer.from([1, 2]) }] }), /Only native Buffer byte/);
  nodes[2].rules = [{ t: 'set', p: 'bag', pt: 'global', to: '[]', tot: 'json' }, { t: 'set', p: 'bag.x', pt: 'global', to: 'safe', tot: 'str' }];
  const first = await executeNative(encode(nodes)); assert.equal(inspectNativeState(JSON.parse(JSON.stringify(first.packedState))).global.bag.x, 'safe');
});
