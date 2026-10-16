import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { executeNative, nativeSwitch } from './native.mjs';
const repository = new URL('../../../../', import.meta.url), runtime = new URL('.local/flow-original/', repository);
const originalHashes = {
  '@node-red/nodes/core/common/20-inject.js': '2d68ffe7fb53f58658533a58256159f57009989d2e0b386d7a9a384e9587e8ec',
  '@node-red/nodes/core/function/15-change.js': 'e7cda0e39bd1a7968c3ac2ccb2efe73e0fb70dc5fc3302f7e7392d550111d066',
  '@node-red/nodes/core/function/10-switch.js': 'ca835b0d47bb3eb7cd877ea1ad7e589e87a942e31bec0111878d17f4c2b37434',
  '@node-red/nodes/core/parsers/70-JSON.js': '3b3fc2f290091b3544114d32689ba3bee5be39b828ad87c84da26f136b3509fe',
  '@node-red/util/lib/util.js': '07ec8410cb31fafecaa886d6c3d1ff3381e7fce802a5d7cd6088db5d11d5df57',
  '@node-red/runtime/lib/nodes/Node.js': '4931ee2e41d4246d51b42c55bb9d7d020ac84601a9e70dff6e70946c23fdf4be',
  'node-red-node-test-helper/index.js': '1c3b1f4670480eb18cfd4a9dea46222c06abd0721be20d921015de6de0a4aa19'
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function clone(value) { return Buffer.isBuffer(value) ? Buffer.from(value) : Array.isArray(value) ? value.map(clone) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) : value; }
function comparable(value) { const copy = clone(value); delete copy._msgid; return JSON.parse(JSON.stringify(copy)); }
function flow(middle, props = []) { return [{ id: 'tab', type: 'tab', label: 'Independent original comparison' }, { id: 'in', type: 'inject', z: 'tab', x: 100, y: 100, props, repeat: '', once: false, wires: [[middle.id]] }, { ...middle, z: 'tab', x: 300, y: 100, wires: [['out']] }, { id: 'out', type: 'debug', z: 'tab', x: 500, y: 100, active: true, complete: 'true', tosidebar: true }]; }
export async function compareOriginal() {
  const expectedLock = await readFile(new URL('./fixtures/oracle/package-lock.json', import.meta.url));
  if (!(await readFile(new URL('package-lock.json', runtime))).equals(expectedLock)) throw new Error('Oracle dependency lock differs; run the bootstrap script');
  for (const [file, expected] of Object.entries(originalHashes)) if (sha(await readFile(new URL('node_modules/' + file, runtime))) !== expected) throw new Error(`Original oracle source changed: ${file}`);
  const require = createRequire(new URL('package.json', runtime));
  const oldDirectory = process.cwd(); let helper;
  try { process.chdir(fileURLToPath(runtime)); helper = require('node-red-node-test-helper'); } finally { process.chdir(oldDirectory); }
  helper.init(require.resolve('node-red'), { logging: { console: { level: 'off' } }, userDir: fileURLToPath(new URL('user-data/', runtime)), nodeMessageBufferMaxLength: 1000 });
  const modules = ['@node-red/nodes/core/common/20-inject.js', '@node-red/nodes/core/function/15-change.js', '@node-red/nodes/core/function/10-switch.js', '@node-red/nodes/core/parsers/70-JSON.js'].map(path => require(path));
  const runtimeCases = [];
  const types = [['str', 'text'], ['num', '3.5'], ['bool', 'TRUE'], ['json', '{"nested":[2,true]}'], ['bin', '[0, 255, 12]'], ['bin', '"unicode λ"']];
  for (const [type, value] of types) runtimeCases.push({ name: `typed-inject-${type}-${value}`, nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'copy', pt: 'msg', to: 'payload', tot: 'msg' }] }, [{ p: 'payload', v: value, vt: type }, { p: 'topic', v: 'retained', vt: 'str' }]), messages: [{ extra: 1 }] });
  for (const [type, value] of types) runtimeCases.push({ name: `typed-change-${type}-${value}`, nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload', pt: 'msg', to: value, tot: type }] }), messages: [{ extra: 1 }] });
  for (const [current, from, fromt, to, tot] of [['aba a', 'a', 'str', 'x', 'str'], ['true', 'true', 'bool', 'FALSE', 'bool'], ['12 and 12', '12', 'num', '99', 'num'], [12, '12', 'num', 'changed', 'str'], [true, 'true', 'bool', 'changed', 'str'], ['a.b a.b', 'a.b', 'str', '$&!', 'str']]) runtimeCases.push({ name: `replace-${JSON.stringify(current)}-${fromt}`, nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'change', p: 'payload', pt: 'msg', from, fromt, to, tot }] }), messages: [{ payload: current }] });
  for (const [p, to, value] of [['payload.child', 'payload', { payload: { child: 3, sibling: 4 } }], ['payload', 'payload.child', { payload: { original: 3 } }], ['payload', 'copy', { payload: 'x' }]]) runtimeCases.push({ name: `move-${p}-${to}`, nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'move', p, pt: 'msg', to, tot: 'msg' }] }), messages: [value] });
  runtimeCases.push({ name: 'static-bracket-arrays-and-delete', nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'nested["data"][0].v', pt: 'msg', to: '5', tot: 'num' }, { t: 'delete', p: 'items[1]', pt: 'msg' }, { t: 'set', p: 'nil.child', pt: 'msg', to: 'ignored', tot: 'str' }] }), messages: [{ items: [1, 2, 3], nil: null }] });
  runtimeCases.push({ name: 'ordered-context-and-copy', nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'remember', pt: 'flow', to: 'payload', tot: 'msg' }, { t: 'set', p: 'copy', pt: 'msg', to: 'remember', tot: 'flow' }, { t: 'set', p: 'globalRemember', pt: 'global', to: 'copy', tot: 'msg' }, { t: 'set', p: 'globalCopy', pt: 'msg', to: 'globalRemember', tot: 'global' }] }), messages: [{ payload: 2 }, { payload: 5 }] });
  runtimeCases.push({ name: 'legacy-change-msg-reference', nodes: flow({ id: 'change', type: 'change', action: 'replace', property: 'payload', to: 'msg.topic' }), messages: [{ topic: 'legacy', payload: 5 }] });
  for (const dc of [false, true]) runtimeCases.push({ name: `change-message-alias-${dc}`, nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'copy', pt: 'msg', to: 'msg.payload', tot: 'msg', dc }, { t: 'set', p: 'msg.copy.child', pt: 'msg', to: '42', tot: 'num' }] }), messages: [{ payload: { child: 1 } }] });
  for (const to of ['255', '256', '-1']) runtimeCases.push({ name: `change-buffer-byte-${to}`, nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'payload[0]', pt: 'msg', to, tot: 'num' }] }), messages: [{ payload: Buffer.from([1, 2, 3]) }] });
  runtimeCases.push({ name: 'change-supplied-message-id', nodes: flow({ id: 'change', type: 'change', rules: [{ t: 'set', p: 'copy', pt: 'msg', to: '_msgid', tot: 'msg' }] }), messages: [{ _msgid: 'fixed-original-case' }] });
  for (const action of ['', 'obj', 'str']) for (const payload of ['{"a":2}', { a: 2 }, null, false, 8]) runtimeCases.push({ name: `json-${action || 'auto'}-${JSON.stringify(payload)}`, nodes: flow({ id: 'json', type: 'json', property: 'payload', action, pretty: true }), messages: [{ payload, topic: 'kept' }] });
  runtimeCases.push({ name: 'json-missing-property', nodes: flow({ id: 'json', type: 'json', property: 'payload' }), messages: [{ topic: 'missing' }] });
  const switchRules = [{ t: 'eq', v: '5', vt: 'str' }, { t: 'else' }, { t: 'true' }, { t: 'else' }];
  for (const first of [false, true]) {
    const nodes = flow({ id: 'switch', type: 'switch', property: 'payload', propertyType: 'msg', rules: switchRules, checkall: first ? 'false' : 'true', repair: false });
    nodes[2].wires = switchRules.map((_, i) => [`out${i}`]); nodes.pop(); nodes.push(...switchRules.map((_, i) => ({ id: `out${i}`, type: 'debug', z: 'tab', x: 500, y: 100 + i * 100, complete: 'true', active: true, tosidebar: true })));
    runtimeCases.push({ name: `switch-otherwise-segments-${first}`, nodes, messages: [{ payload: '5' }, { payload: true }, { payload: 'other' }] });
  }
  runtimeCases.push({ name: 'switch-previous-value', nodes: flow({ id: 'switch', type: 'switch', property: 'payload', rules: [{ t: 'gt', v: '', vt: 'prev' }], checkall: 'false', repair: false }), messages: [{ payload: 5 }, { payload: 3 }, { payload: 7 }] });
  for (const v2t of ['json', 'null']) runtimeCases.push({ name: `switch-second-operand-${v2t}`, nodes: flow({ id: 'switch', type: 'switch', property: 'payload', rules: [{ t: 'btwn', v: '0', vt: 'num', v2: '10', v2t }], repair: false }), messages: [{ payload: 5 }] });
  const results = [];
  await new Promise((resolveStart, reject) => helper.startServer(error => error ? reject(error) : resolveStart()));
  try {
    for (const item of runtimeCases) {
      const originalFlow = clone(item.nodes).map(node => node.type === 'debug' ? { id: node.id, type: 'helper', z: node.z, x: node.x, y: node.y } : node);
      await helper.load(modules, originalFlow);
      const observed = [];
      for (const node of item.nodes.filter(n => n.type === 'debug')) helper.getNode(node.id).on('input', message => { observed.push({ node: node.id, message: comparable(message) }); });
      for (const message of item.messages) helper.getNode('in').receive(clone(message));
      await new Promise(resolveWait => setTimeout(resolveWait, 30));
      const candidate = (await executeNative(JSON.stringify(item.nodes), { messages: clone(item.messages) })).debug.map(row => ({ node: row.node, message: comparable(row.message) }));
      results.push({ name: item.name, passed: isDeepStrictEqual(observed, candidate), ...(isDeepStrictEqual(observed, candidate) ? {} : { original: observed, candidate }) });
      await helper.unload();
    }
  } finally { await helper.unload(); await new Promise(resolveStop => helper.stopServer(resolveStop)); }
  // The original constructor/handler and original util are retained here; only the registration/event host is minimal.
  const register = require('@node-red/nodes/core/function/10-switch.js'), originalUtil = require('@node-red/util').util;
  const values = [undefined, null, false, true, -3, 0, 1, 5, 8.5, '', '5', 'alpha', [], ['a'], {}, { key: 1 }, Buffer.from('alpha'), Buffer.alloc(0)];
  const sets = [[{ t: 'eq', v: '5', vt: 'str' }, { t: 'else' }], [{ t: 'neq', v: '0', vt: 'num' }, { t: 'else' }], ...['lt', 'lte', 'gt', 'gte'].map(t => [{ t, v: '5', vt: 'num' }, { t: 'else' }]), [{ t: 'btwn', v: '8', vt: 'num', v2: '-1', v2t: 'num' }, { t: 'else' }], [{ t: 'cont', v: 'a', vt: 'str' }, { t: 'else' }], [{ t: 'true' }, { t: 'false' }, { t: 'null' }, { t: 'nnull' }], [{ t: 'empty' }, { t: 'nempty' }, { t: 'else' }], ...['array', 'buffer', 'null', 'json', 'number', 'string', 'boolean', 'object', 'undefined'].map(v => [{ t: 'istype', v, vt: 'str' }, { t: 'else' }]), [{ t: 'hask', v: 'key', vt: 'str' }, { t: 'else' }], [{ t: 'else' }, { t: 'else' }], [{ t: 'eq', v: '5', vt: 'str' }, { t: 'else' }, { t: 'true' }, { t: 'else' }], [{ t: 'else' }, { t: 'null' }, { t: 'else' }]];
  let scalarPassed = 0, scalarTotal = 0; const scalarFailures = [];
  for (const rules of sets) for (const payload of values) for (const first of [false, true]) {
    let Constructor;
    register({ settings: {}, _: text => text, nodes: { registerType: (_name, ctor) => { Constructor = ctor; }, createNode(node) { node.handlers = {}; node.on = (event, fn) => { node.handlers[event] = fn; }; node.warn = () => {}; } }, util: originalUtil });
    const node = new Constructor({ rules: clone(rules), property: 'payload', propertyType: 'msg', checkall: first ? 'false' : 'true', repair: false });
    const originalPorts = await new Promise((resolvePorts, reject) => { node.send = messages => resolvePorts(messages.flatMap((m, i) => m ? [i] : [])); node.error = reject; node.handlers.input({ payload: clone(payload) }); });
    const candidate = await nativeSwitch({ id: 'switch', property: 'payload', rules, checkall: first ? 'false' : 'true' }, { payload: clone(payload) }, { global: {}, flows: {} });
    scalarTotal++; if (isDeepStrictEqual(originalPorts, candidate.ports)) scalarPassed++; else scalarFailures.push({ rules, payload, first, originalPorts, candidatePorts: candidate.ports });
  }
  const sources = {};
  for (const file of ['native.mjs', 'native-regex-worker.mjs', 'server.mjs', 'client.mjs', 'native.test.mjs', 'native-original.test.mjs', 'compare-original.mjs', 'fixtures/native-demo.json', 'fixtures/oracle/package.json', 'fixtures/oracle/package-lock.json']) sources[file] = sha(await readFile(new URL(file, import.meta.url)));
  return { testedAt: new Date().toISOString(), original: { product: 'Node-RED', version: '5.0.8', testHelperVersion: '0.3.6', integrityPinnedDependencyLockSha256: sha(expectedLock), sourceSha256: originalHashes, runtime: 'Released runtime, Inject/Change/Switch/JSON implementations and utility code; output-observer helper nodes replace Debug sinks.', originalRuntimeExecuted: true, originalEditorExecuted: false }, runtimeCases: { total: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, results }, scalarSwitchCases: { total: scalarTotal, passed: scalarPassed, failed: scalarFailures.length, failures: scalarFailures, scope: 'Original SwitchNode constructor/handler plus original @node-red/util; minimal registration/event host, no full scheduling runtime for these scalar cases.' }, implementationSha256: sources, fullFeatureParity: false, allWaysBetter: false, limitations: ['Bounded manual flow execution only; not all Node-RED nodes or options.', 'No original editor/browser import-export acceptance or timed inject comparison.', 'Scalar switch corpus excludes JSONata, sequence repair/tail buffering, dynamic paths, environment values and original previous-value context outside the separate runtime case.', 'Runtime observation excludes generated _msgid values and the original Debug sidebar/console/status UI.', 'This corpus establishes neither exhaustive coverage nor speed, memory or usability superiority.'] };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await compareOriginal();
  if (process.argv.includes('--write')) { await mkdir(new URL('./results/', import.meta.url), { recursive: true }); await writeFile(new URL('./results/native-original-comparison.json', import.meta.url), JSON.stringify(result, null, 2) + '\n'); }
  console.log(JSON.stringify(result, null, 2));
  if (result.runtimeCases.failed || result.scalarSwitchCases.failed) process.exitCode = 1;
}
