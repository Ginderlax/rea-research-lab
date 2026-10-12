import { randomUUID } from 'node:crypto';
import { example, validateFlow, executeFlow } from './core.mjs';
function validId(id) { if (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id)) throw new Error('Invalid flow id'); return id; }
export async function handle({ action, input = {}, store }) {
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
