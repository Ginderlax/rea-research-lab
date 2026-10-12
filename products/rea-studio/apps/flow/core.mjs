const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function parts(path) { if (typeof path !== 'string' || path.length > 200 || !path || path.split('.').some(p => !p || forbidden.has(p))) throw new Error('Invalid property path'); return path.split('.'); }
export function read(value, path) { return parts(path).reduce((v, key) => v && Object.hasOwn(v, key) ? v[key] : undefined, value); }
export function write(value, path, data, remove = false) { const keys = parts(path); let current = value; for (const key of keys.slice(0, -1)) { if (!Object.hasOwn(current, key) || !current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) current[key] = {}; current = current[key]; } if (remove) delete current[keys.at(-1)]; else current[keys.at(-1)] = data; }
export function matches(value, rule) {
  switch (rule.op) {
    case 'eq': return value === rule.value;
    case 'ne': return value !== rule.value;
    case 'gt': return typeof value === 'number' && value > rule.value;
    case 'gte': return typeof value === 'number' && value >= rule.value;
    case 'lt': return typeof value === 'number' && value < rule.value;
    case 'lte': return typeof value === 'number' && value <= rule.value;
    case 'contains': return typeof value === 'string' && value.includes(String(rule.value));
    case 'type': return (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value) === rule.value;
    case 'otherwise': return true;
    default: throw new Error('Unknown switch rule');
  }
}
export function validateFlow(flow) {
  if (!flow || typeof flow.name !== 'string' || !flow.name.trim() || flow.name.length > 120) throw new Error('Flow needs a name');
  if (!Array.isArray(flow.nodes) || !flow.nodes.length || flow.nodes.length > 100 || !Array.isArray(flow.edges) || flow.edges.length > 300) throw new Error('Use 1–100 nodes and at most 300 connections');
  const types = new Set(['inject', 'change', 'switch', 'delay', 'batch', 'counter', 'debug']); const ids = new Set();
  for (const node of flow.nodes) {
    if (!node || !/^[\w-]{1,50}$/.test(node.id) || forbidden.has(node.id) || ids.has(node.id) || !types.has(node.type)) throw new Error('Invalid or duplicate node'); ids.add(node.id); const c = node.config || {};
    if (node.type === 'change') for (const operation of c.operations || []) { parts(operation.path); if (!['set', 'delete', 'increment'].includes(operation.op)) throw new Error('Unknown change operation'); if (operation.from) parts(operation.from); if (operation.op === 'increment' && typeof operation.value !== 'number') throw new Error('Increment needs a number'); }
    if (node.type === 'switch') { parts(c.field || 'payload'); if (!Array.isArray(c.rules) || !c.rules.length || c.rules.length > 20) throw new Error('Switch needs 1–20 rules'); for (const rule of c.rules) matches(undefined, rule); }
    if (node.type === 'delay' && (!Number.isInteger(c.ms) || c.ms < 0 || c.ms > 1000)) throw new Error('Delay must be 0–1000 ms');
    if (node.type === 'batch' && (!Number.isInteger(c.size) || c.size < 1 || c.size > 100)) throw new Error('Batch size must be 1–100');
    if (node.type === 'counter') parts(c.field || 'count');
  }
  for (const edge of flow.edges) { if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error('Connection node does not exist'); const node = flow.nodes.find(n => n.id === edge.from); if (node.type === 'switch') { if (!Number.isInteger(edge.port) || edge.port < 0 || edge.port >= node.config.rules.length) throw new Error('Switch connection requires a valid zero-based rule port'); } else if (edge.port !== undefined && edge.port !== 0) throw new Error('Only switch nodes have multiple output ports'); }
  if (!flow.nodes.some(n => n.type === 'inject')) throw new Error('Add an inject node');
  return true;
}
export async function executeFlow(flow, { start, messages, state = {}, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  validateFlow(flow); const first = flow.nodes.find(n => n.id === (start || flow.nodes.find(n => n.type === 'inject').id)); if (!first || first.type !== 'inject') throw new Error('Start must be an inject node');
  const initial = messages === undefined ? [structuredClone(first.config?.message || { payload: Date.now(), topic: 'manual' })] : messages;
  if (!Array.isArray(initial) || initial.length > 1000 || initial.some(v => !v || typeof v !== 'object' || Array.isArray(v))) throw new Error('Use at most 1,000 message objects');
  const nextState = structuredClone(state); const queue = initial.map(message => ({ node: first.id, message: structuredClone(message) })); const debug = []; const trace = []; let steps = 0; let delayed = 0;
  while (queue.length) {
    if (++steps > 5000) throw new Error('Flow exceeded 5,000 deliveries; inspect cycles and fan-out');
    const event = queue.shift(); const node = flow.nodes.find(n => n.id === event.node); const c = node.config || {}; const message = event.message; let deliveries = [{ port: 0, message }];
    const ns = Object.hasOwn(nextState, node.id) ? nextState[node.id] : nextState[node.id] = { received: 0 }; ns.received++; trace.push({ node: node.id, type: node.type, sequence: steps });
    if (node.type === 'change') for (const op of c.operations || []) { if (op.op === 'delete') write(message, op.path, undefined, true); if (op.op === 'set') write(message, op.path, op.from ? structuredClone(read(message, op.from) ?? null) : structuredClone(op.value)); if (op.op === 'increment') { const value = read(message, op.path); if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Increment requires an existing numeric value or an absent field'); const result = (value || 0) + op.value; if (!Number.isFinite(result)) throw new Error('Increment produced a non-finite result; reduce the numeric range'); write(message, op.path, result); } }
    if (node.type === 'switch') { const value = read(message, c.field || 'payload'); deliveries = []; let matched = false; for (let i = 0; i < c.rules.length; i++) { const rule = c.rules[i]; const yes = rule.op === 'otherwise' ? !matched : matches(value, rule); if (yes) { deliveries.push({ port: i, message }); matched = true; if (c.first) break; } } }
    if (node.type === 'delay') { delayed += c.ms; if (delayed > 5000) throw new Error('Combined delays exceeded five seconds for this run'); await wait(c.ms); }
    if (node.type === 'counter') { ns.count = (ns.count || 0) + 1; write(message, c.field || 'count', ns.count); }
    if (node.type === 'batch') { ns.buffer ||= []; ns.buffer.push(structuredClone(message)); if (ns.buffer.length >= c.size) { deliveries = [{ port: 0, message: { topic: c.topic || 'batch', payload: ns.buffer.splice(0, c.size) } }]; } else deliveries = []; }
    if (node.type === 'debug') { debug.push({ node: node.id, sequence: steps, message: structuredClone(message) }); deliveries = []; }
    for (const delivery of deliveries) for (const edge of flow.edges.filter(e => e.from === node.id && (e.port || 0) === delivery.port)) queue.push({ node: edge.to, message: structuredClone(delivery.message) });
  }
  return { debug, trace, state: nextState, deliveries: steps, delayedMs: delayed };
}
export const example = { name: 'Route and count temperature events', nodes: [{ id: 'inject', type: 'inject', config: { message: { payload: 28, topic: 'temperature' } } }, { id: 'route', type: 'switch', config: { field: 'payload', first: true, rules: [{ op: 'gte', value: 25 }, { op: 'otherwise' }] } }, { id: 'count', type: 'counter', config: { field: 'hotEvents' } }, { id: 'hot', type: 'debug' }, { id: 'normal', type: 'debug' }], edges: [{ from: 'inject', to: 'route' }, { from: 'route', to: 'count', port: 0 }, { from: 'count', to: 'hot' }, { from: 'route', to: 'normal', port: 1 }] };
