import { randomUUID } from 'node:crypto'; import { validateScene, svg, example } from './core.mjs';
function validId(id) { if (typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id)) throw new Error('Invalid scene id'); return id; }
export async function handle({ action, input = {}, store }) {
  if (action === 'list') return { scenes: (await Promise.all((await store.get('sketch.index', [])).map(id => store.get(`sketch.scene.${id}`, null)))).filter(Boolean), example: validateScene(example) };
  if (action === 'validate') return { scene: validateScene(input.scene) };
  if (action === 'save') { const scene = validateScene(input.scene); scene.id = input.id ? validId(input.id) : randomUUID(); scene.updatedAt = new Date().toISOString(); await store.set(`sketch.scene.${scene.id}`, scene); const ids = await store.get('sketch.index', []); if (!ids.includes(scene.id)) await store.set('sketch.index', [...ids, scene.id]); return { scene }; }
  if (action === 'svg') { const scene = input.scene || await store.get(`sketch.scene.${validId(input.id)}`, null); if (!scene) throw new Error('Scene not found'); return { svg: svg(scene) }; }
  if (action === 'delete') { const id = validId(input.id); await store.set('sketch.index', (await store.get('sketch.index', [])).filter(v => v !== id)); await store.set(`sketch.scene.${id}`, null); return { deleted: id }; }
  throw new Error('Unknown sketch action');
}
