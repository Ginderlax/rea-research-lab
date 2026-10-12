import { randomUUID } from 'node:crypto';
import { handleNative, disposeNative } from './native-server.mjs';
import { example, validateWorkflow } from './core.mjs';
import { executeWorkflowAsync, ExecutionError, redact } from './engine.mjs';
const index = 'automation.index';
const sessions = new WeakMap(); const liveSessions = new Set();
function session(store, workspace) {
  if (!sessions.has(store)) { const value = { store, running: new Map(), finished: new Map(), historyQueue: Promise.resolve() }; sessions.set(store, value); }
  const value = sessions.get(store); if (workspace) value.workspace = workspace; liveSessions.add(value); return value;
}
function idOf(id) { if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('Invalid workflow id'); return id; }
function snapshot(run, secrets) {
  const clean = { ...run, ...(run.error ? { error: redact(run.error, secrets) } : {}), ...(run.trace ? { trace: redact(run.trace, secrets) } : {}), ...(run.outputs ? { outputs: redact(run.outputs, secrets) } : {}) };
  if (Buffer.byteLength(JSON.stringify(clean.trace || [])) > 1024 * 1024) {
    clean.traceDetailsLimited = true;
    const simplify = trace => trace.map(node => ({ ...node, attempts: node.attempts?.map(attempt => ({ attempt: attempt.attempt, itemIndex: attempt.itemIndex, status: attempt.status, statusCode: attempt.statusCode, durationMs: attempt.durationMs, ...(attempt.error ? { error: { code: attempt.error.code, message: attempt.error.message } } : {}) })), ...(node.calls ? { calls: node.calls.map(call => ({ ...call, trace: simplify(call.trace || []) })) } : {}), ...(node.error ? { error: { code: node.error.code, message: node.error.message } } : {}) }));
    clean.trace = simplify(clean.trace);
  }
  return clean;
}
async function retain(state, run) {
  const operation = state.historyQueue.catch(() => {}).then(async () => {
    const key = `automation.history.${run.workflowId}`;
    const previous = await state.store.get(key, []);
    let history = [...previous.filter(item => item.id !== run.id), run].slice(-50);
    while (history.length > 1 && Buffer.byteLength(JSON.stringify(history)) > 12 * 1024 * 1024) history.shift();
    if (Buffer.byteLength(JSON.stringify(history)) > 12 * 1024 * 1024) throw new Error('Execution history exceeds 12 MiB');
    await state.store.set(key, history);
  });
  state.historyQueue = operation; return operation;
}
async function historyFor(state, id) {
  const operation = state.historyQueue.catch(() => {}).then(async () => {
    const key = `automation.history.${id}`; const runs = await state.store.get(key, []); let changed = false;
    for (const run of runs) if (run.status === 'running' && !state.running.has(run.id)) { Object.assign(run, state.finished.get(run.id) || { status: 'interrupted', error: 'Execution process ended before completion; no automatic resume is available' }); changed = true; }
    if (changed) await state.store.set(key, runs); return runs;
  });
  state.historyQueue = operation; return operation;
}
async function launch(input, store) {
  const id = idOf(input.id); const workflow = await store.get(`automation.workflow.${id}`, null); if (!workflow) throw new Error('Workflow not found');
  if (input.secrets !== undefined && (!input.secrets || typeof input.secrets !== 'object' || Array.isArray(input.secrets) || Object.values(input.secrets).some(value => typeof value !== 'string' || !value || value.length > 8192))) throw new Error('Run secrets must be an object of non-empty text values (at most 8,192 characters each)');
  const state = session(store); const controller = new AbortController(); const secretValues = new Set(Object.values(input.secrets || {}));
  const run = { id: randomUUID(), workflowId: id, workflowName: workflow.name, startedAt: new Date().toISOString(), status: 'running' };
  const active = { run, controller, secretValues }; state.running.set(run.id, active);
  try { await retain(state, run); } catch (error) { state.running.delete(run.id); throw error; }
  const start = performance.now();
  active.promise = (async () => {
    try {
      Object.assign(run, await executeWorkflowAsync(workflow, input.items === undefined ? [] : input.items, { signal: controller.signal, secrets: input.secrets, secretValues, resolveWorkflow: workflowId => store.get(`automation.workflow.${idOf(workflowId)}`, null) }), { status: 'completed' });
    } catch (error) {
      Object.assign(run, { status: error.code === 'CANCELLED' ? 'cancelled' : 'failed', error: error.message, errorCode: error.code || 'NODE_ERROR', ...(error.failedNode ? { failedNode: error.failedNode } : {}), trace: error.trace || [] });
      if (Object.keys(error.outputs || {}).length) run.outputs = error.outputs;
    }
    run.finishedAt = new Date().toISOString(); run.durationMs = Math.round((performance.now() - start) * 1000) / 1000;
    const clean = snapshot(run, secretValues);
    try { await retain(state, clean); }
    catch { clean.historyError = 'Execution finished, but its history could not be saved'; clean.status = 'failed'; clean.error = clean.historyError; }
    state.finished.set(run.id, clean); if (state.finished.size > 50) state.finished.delete(state.finished.keys().next().value);
    state.running.delete(run.id); return clean;
  })();
  return { state, active };
}
export async function handle({ action, input = {}, store, workspace }) {
  if (action.startsWith('native-')) return handleNative({action,input,store,workspace});
  const state = session(store, workspace);
  if (action === 'list') { const ids = await store.get(index, []); const workflows = (await Promise.all(ids.map(id => store.get(`automation.workflow.${id}`, null)))).filter(Boolean); return { workflows, example }; }
  if (action === 'save') {
    const workflow = structuredClone(input.workflow); validateWorkflow(workflow); workflow.id = input.id ? idOf(input.id) : randomUUID(); workflow.updatedAt = new Date().toISOString();
    await store.set(`automation.workflow.${workflow.id}`, workflow); const ids = await store.get(index, []); if (!ids.includes(workflow.id)) await store.set(index, [...ids, workflow.id]); return { workflow };
  }
  if (action === 'delete') { const id = idOf(input.id); if ([...state.running.values()].some(active => active.run.workflowId === id)) throw new Error('Cancel or finish active executions before deleting their workflow'); await store.set(index, (await store.get(index, [])).filter(value => value !== id)); await store.set(`automation.workflow.${id}`, null); return { deleted: id }; }
  if (action === 'history') return { runs: await historyFor(state, idOf(input.id)) };
  if (action === 'run' || action === 'start') {
    const { active } = await launch(input, store);
    return { run: action === 'run' ? await active.promise : snapshot(active.run, active.secretValues) };
  }
  if (action === 'run-status') {
    const runId = idOf(input.runId); const active = state.running.get(runId);
    const workflowId = idOf(input.id);
    if (active && active.run.workflowId === workflowId) return { run: snapshot(active.run, active.secretValues) };
    const finished = state.finished.get(runId); if (finished && finished.workflowId === workflowId) return { run: structuredClone(finished) };
    const run = (await historyFor(state, idOf(input.id))).find(value => value.id === runId); if (!run) throw new Error('Execution not found'); return { run };
  }
  if (action === 'cancel') {
    const runId = idOf(input.runId); const active = state.running.get(runId);
    if (!active || active.run.workflowId !== idOf(input.id)) throw new Error('Active execution not found');
    active.controller.abort(new ExecutionError('Execution cancelled', 'CANCELLED')); return { runId, status: 'cancelling' };
  }
  if (action === 'validate') return { order: validateWorkflow(input.workflow) };
  throw new Error('Unknown automation action');
}
export async function dispose(workspace) {
  await disposeNative(workspace);
  const selected = [...liveSessions].filter(state => !workspace || state.workspace === workspace);
  for (const state of selected) for (const active of state.running.values()) active.controller.abort(new ExecutionError('Execution cancelled during shutdown', 'CANCELLED'));
  await Promise.allSettled(selected.flatMap(state => [...state.running.values()].map(active => active.promise)));
  for (const state of selected) liveSessions.delete(state);
}
