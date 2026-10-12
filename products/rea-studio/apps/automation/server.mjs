import { randomUUID } from 'node:crypto';
import { example, validateWorkflow, executeWorkflow } from './core.mjs';
const index = 'automation.index';
function idOf(id) { if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('Invalid workflow id'); return id; }
export async function handle({ action, input = {}, store }) {
  if (action === 'list') { const ids = await store.get(index, []); const workflows = (await Promise.all(ids.map(id => store.get(`automation.workflow.${id}`, null)))).filter(Boolean); return { workflows, example }; }
  if (action === 'save') {
    const workflow = structuredClone(input.workflow); validateWorkflow(workflow); workflow.id = input.id ? idOf(input.id) : randomUUID(); workflow.updatedAt = new Date().toISOString();
    await store.set(`automation.workflow.${workflow.id}`, workflow); const ids = await store.get(index, []); if (!ids.includes(workflow.id)) await store.set(index, [...ids, workflow.id]); return { workflow };
  }
  if (action === 'delete') { const id = idOf(input.id); await store.set(index, (await store.get(index, [])).filter(v => v !== id)); await store.set(`automation.workflow.${id}`, null); return { deleted: id }; }
  if (action === 'history') return { runs: await store.get(`automation.history.${idOf(input.id)}`, []) };
  if (action === 'run') {
    const id = idOf(input.id); const workflow = await store.get(`automation.workflow.${id}`, null); if (!workflow) throw new Error('Workflow not found');
    const run = { id: randomUUID(), workflowId: id, workflowName: workflow.name, startedAt: new Date().toISOString() }; const start = performance.now();
    try { Object.assign(run, executeWorkflow(workflow, input.items || []), { status: 'completed' }); } catch (error) { Object.assign(run, { status: 'failed', error: error.message }); }
    run.durationMs = Math.round((performance.now() - start) * 1000) / 1000; const history = await store.get(`automation.history.${id}`, []); await store.set(`automation.history.${id}`, [...history.slice(-49), run]); return { run };
  }
  if (action === 'validate') return { order: validateWorkflow(input.workflow) };
  throw new Error('Unknown automation action');
}
