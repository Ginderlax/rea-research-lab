import { randomUUID } from 'node:crypto';
import { example, validateFlow, executeFlow } from './core.mjs';
import { parseNative, describeNative, nativePreflight, executeNative, inspectNativeState } from './native.mjs';
function validId(id) { if (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id)) throw new Error('Invalid flow id'); return id; }
export async function handle({ action, input = {}, store }) {
  if (action.startsWith('native-')) return handleNative(action, input, store);
  if (action === 'list') return { flows: (await Promise.all((await store.get('flow.index', [])).map(id => store.get(`flow.definition.${id}`, null)))).filter(Boolean), example };
  if (action === 'validate') return { valid: validateFlow(input.flow) };
  if (action === 'save') { const flow = structuredClone(input.flow); validateFlow(flow); flow.id = input.id ? validId(input.id) : randomUUID(); flow.updatedAt = new Date().toISOString(); await store.set(`flow.definition.${flow.id}`, flow); const ids = await store.get('flow.index', []); if (!ids.includes(flow.id)) await store.set('flow.index', [...ids, flow.id]); return { flow }; }
  const id = validId(input.id); const flow = await store.get(`flow.definition.${id}`, null); if (!flow) throw new Error('Flow not found');
  if (action === 'delete') { await store.set('flow.index', (await store.get('flow.index', [])).filter(v => v !== id)); await store.set(`flow.definition.${id}`, null); return { deleted: id }; }
  if (action === 'inspect') return { state: await store.get(`flow.state.${id}`, {}), runs: await store.get(`flow.history.${id}`, []) };
  if (action === 'reset') { await store.set(`flow.state.${id}`, {}); return { state: {} }; }
  if (action === 'inject') {
    const started = performance.now(); const run = { id: randomUUID(), startedAt: new Date().toISOString() };
    try { const result = await executeFlow(flow, { start: input.start, messages: input.messages, state: await store.get(`flow.state.${id}`, {}) }); Object.assign(run, result, { status: 'completed' }); await store.set(`flow.state.${id}`, result.state); } catch (error) { Object.assign(run, { status: 'failed', error: error.message }); }
    run.durationMs = Math.round((performance.now() - started) * 1000) / 1000; await store.set(`flow.history.${id}`, [...(await store.get(`flow.history.${id}`, [])).slice(-49), run]); return { run };
  }
  throw new Error('Unknown flow action');
}

async function handleNative(action, input, store) {
  if (action === 'native-list') return { flows: (await Promise.all((await store.get('flow.native.index', [])).map(id => store.get(`flow.native.definition.${id}`, null)))).filter(Boolean).map(describeNative) };
  if (action === 'native-validate') {
    const info = parseNative(input.text);
    let runReady = false, runError;
    try { nativePreflight(info, input.start); runReady = true; } catch (error) { runError = error.message; }
    return { revision: info.revision, starts: info.starts, issues: info.issues, schedules: info.schedules, nodeCount: info.nodes.length, runReady, runError };
  }
  if (action === 'native-save') {
    parseNative(input.text);
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120) throw new Error('Native flow needs a name of at most 120 characters');
    const id = input.id ? validId(input.id) : randomUUID();
    const existing = await store.get(`flow.native.definition.${id}`, null);
    if (input.id && !existing) throw new Error('Native flow not found');
    const record = { ...existing, id, name: input.name.trim(), text: input.text, updatedAt: new Date().toISOString() };
    await store.set(`flow.native.definition.${id}`, record);
    const ids = await store.get('flow.native.index', []); if (!ids.includes(id)) await store.set('flow.native.index', [...ids, id]);
    return { flow: describeNative(record) };
  }
  const id = validId(input.id), record = await store.get(`flow.native.definition.${id}`, null);
  if (!record) throw new Error('Native flow not found');
  if (action === 'native-export') return { name: record.name, text: record.text, revision: parseNative(record.text).revision };
  if (action === 'native-deploy') {
    const info = parseNative(record.text);
    const starts = info.starts.filter(start => { try { nativePreflight(info, start.id); return true; } catch { return false; } });
    if (!starts.length) throw new Error('No native inject path can execute with the implemented nodes');
    record.deployment = { text: record.text, revision: info.revision, at: new Date().toISOString(), starts: starts.map(s => s.id) };
    await store.set(`flow.native.definition.${id}`, record);
    return { flow: describeNative(record), runnableStarts: starts };
  }
  if (action === 'native-inspect') {
    const packed = await store.get(`flow.native.state.${id}`, null);
    return { flow: describeNative(record), stateStored: Boolean(packed), state: inspectNativeState(packed), runs: await store.get(`flow.native.history.${id}`, []) };
  }
  if (action === 'native-reset') { await store.set(`flow.native.state.${id}`, null); return { reset: true }; }
  if (action === 'native-delete') {
    await store.set('flow.native.index', (await store.get('flow.native.index', [])).filter(v => v !== id));
    await store.set(`flow.native.definition.${id}`, null); await store.set(`flow.native.state.${id}`, null); await store.set(`flow.native.history.${id}`, []);
    return { deleted: id };
  }
  if (action === 'native-inject') {
    if (!record.deployment) throw new Error('Deploy the native flow before injecting');
    const started = performance.now(), run = { id: randomUUID(), startedAt: new Date().toISOString(), deployedRevision: record.deployment.revision };
    try {
      const result = await executeNative(record.deployment.text, { start: input.start, messages: input.messages, packedState: await store.get(`flow.native.state.${id}`, null) });
      const { packedState, state, ...output } = result;
      Object.assign(run, output, { status: 'completed' });
      await store.set(`flow.native.state.${id}`, packedState);
    } catch (error) { Object.assign(run, { status: 'failed', error: error.message }); }
    run.durationMs = Math.round((performance.now() - started) * 1000) / 1000;
    // Bound retained history as well as each run: a single large result cannot multiply into 50 oversized files.
    const history = [...(await store.get(`flow.native.history.${id}`, [])).slice(-49), run];
    while (history.length > 1 && Buffer.byteLength(JSON.stringify(history)) > 8 * 1024 * 1024) history.shift();
    await store.set(`flow.native.history.${id}`, history);
    return { run };
  }
  throw new Error('Unknown native flow action');
}
