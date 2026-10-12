const blocked = new Set(['__proto__', 'constructor', 'prototype']);
export function pathParts(path) {
  if (typeof path !== 'string' || !path || path.length > 200) throw new Error('A property path is required');
  const parts = path.split('.');
  if (parts.some(p => !p || blocked.has(p))) throw new Error('Unsafe property path');
  return parts;
}
export function getPath(value, path) {
  return pathParts(path).reduce((v, p) => v && Object.hasOwn(v, p) ? v[p] : undefined, value);
}
export function setPath(value, path, data) {
  const parts = pathParts(path); let current = value;
  for (const p of parts.slice(0, -1)) {
    if (!Object.hasOwn(current, p) || typeof current[p] !== 'object' || current[p] === null || Array.isArray(current[p])) current[p] = {};
    current = current[p];
  }
  current[parts.at(-1)] = data;
}
export function predicate(item, rule = {}) {
  const actual = getPath(item, rule.field || 'value');
  switch (rule.op || 'eq') {
    case 'eq': return actual === rule.value;
    case 'ne': return actual !== rule.value;
    case 'gt': return typeof actual === 'number' && actual > rule.value;
    case 'gte': return typeof actual === 'number' && actual >= rule.value;
    case 'lt': return typeof actual === 'number' && actual < rule.value;
    case 'lte': return typeof actual === 'number' && actual <= rule.value;
    case 'contains': return typeof actual === 'string' && actual.includes(String(rule.value));
    case 'exists': return actual !== undefined;
    default: throw new Error('Unknown comparison operator');
  }
}
const types = new Set(['input', 'map', 'filter', 'branch', 'aggregate', 'output', 'http', 'wait', 'call']);
export function integerOption(value, fallback, min, max, label) {
  const result = value === undefined ? fallback : value;
  if (!Number.isInteger(result) || result < min || result > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return result;
}
function reference(value, { secret = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== 1) return false;
  if (keys[0] === 'from') { pathParts(value.from); return true; }
  if (secret && keys[0] === 'secret') {
    if (typeof value.secret !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value.secret)) throw new Error('Secret references need a safe name');
    return true;
  }
  return false;
}
export function validateHttpConfig(config) {
  if (!reference(config.url)) validateHttpUrl(config.url);
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(config.method || 'GET')) throw new Error('Unsupported HTTP method');
  for (const [option, values] of [['headers', config.headers], ['query', config.query]]) {
    if (values !== undefined && (!values || typeof values !== 'object' || Array.isArray(values))) throw new Error(`HTTP ${option} must be an object`);
    if (Object.keys(values || {}).length > 100) throw new Error(`Use at most 100 HTTP ${option}`);
    for (const [key, value] of Object.entries(values || {})) {
      if (option === 'headers' && (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key) || ['host', 'content-length', 'connection', 'transfer-encoding', 'upgrade'].includes(key.toLowerCase()))) throw new Error('Invalid or transport-managed HTTP header');
      if (!key || key.length > 200) throw new Error('HTTP parameter names need 1–200 characters');
      if (!reference(value, { secret: true }) && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('HTTP header/query values must be scalars or from/secret references');
      if (typeof value === 'string' && /[\r\n]/.test(value) && option === 'headers') throw new Error('HTTP headers cannot contain line breaks');
    }
  }
  if (!['none', 'json', 'raw'].includes(config.bodyType || 'none')) throw new Error('HTTP body type must be none, json or raw');
  if (['GET', 'HEAD'].includes(config.method || 'GET') && (config.bodyType || 'none') !== 'none') throw new Error('GET and HEAD cannot send a body');
  if ((config.bodyType || 'none') !== 'none' && !Object.hasOwn(config, 'body')) throw new Error('HTTP body is required');
  if (config.bodyType === 'raw' && !reference(config.body, { secret: true }) && typeof config.body !== 'string') throw new Error('Raw HTTP body must be text or a from/secret reference');
  if (!['auto', 'json', 'text', undefined].includes(config.responseFormat)) throw new Error('Unknown HTTP response format');
  if (config.neverError !== undefined && typeof config.neverError !== 'boolean') throw new Error('Never Error must be a boolean');
  if (config.followRedirects !== undefined && typeof config.followRedirects !== 'boolean') throw new Error('Follow Redirects must be a boolean');
  if (config.keepInput !== undefined && typeof config.keepInput !== 'boolean') throw new Error('Keep Input must be a boolean');
  integerOption(config.timeoutMs, 10000, 1, 60000, 'HTTP timeout');
  pathParts(config.responsePath || 'response');
}
export function validateHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 8192) throw new Error('HTTP URL must be text (at most 8,192 characters)');
  let url; try { url = new URL(value); } catch { throw new Error('HTTP URL must be absolute'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP(S) URL without embedded credentials');
  return url;
}
export function validateWorkflow(workflow) {
  if (!workflow || typeof workflow.name !== 'string' || !workflow.name.trim() || workflow.name.length > 120) throw new Error('Workflow needs a name (1–120 characters)');
  if (!Array.isArray(workflow.nodes) || !workflow.nodes.length || workflow.nodes.length > 100) throw new Error('Use 1–100 nodes');
  if (!Array.isArray(workflow.edges) || workflow.edges.length > 300) throw new Error('Use at most 300 connections');
  if (workflow.settings !== undefined && (!workflow.settings || typeof workflow.settings !== 'object' || Array.isArray(workflow.settings))) throw new Error('Workflow settings must be an object');
  integerOption(workflow.settings?.timeoutMs, 120000, 1, 120000, 'Workflow timeout');
  const ids = new Set();
  for (const node of workflow.nodes) {
    if (!node || !/^[A-Za-z0-9_-]{1,50}$/.test(node.id) || blocked.has(node.id) || ids.has(node.id)) throw new Error('Node identifiers must be unique and safe');
    if (!types.has(node.type)) throw new Error('Unknown node type');
    ids.add(node.id);
    if (node.config !== undefined && (!node.config || typeof node.config !== 'object' || Array.isArray(node.config))) throw new Error('Node configuration must be an object');
    if (node.settings !== undefined && (!node.settings || typeof node.settings !== 'object' || Array.isArray(node.settings))) throw new Error('Node settings must be an object');
    if (!['stop', 'continue', 'error-output', undefined].includes(node.settings?.onError)) throw new Error('On Error must be stop, continue or error-output');
    if (node.settings?.retry !== undefined && (!node.settings.retry || typeof node.settings.retry !== 'object' || Array.isArray(node.settings.retry))) throw new Error('Retry settings must be an object');
    integerOption(node.settings?.retry?.maxAttempts, 1, 1, 5, 'Retry attempts');
    integerOption(node.settings?.retry?.delayMs, 0, 0, 10000, 'Retry delay');
    if (node.type === 'http') validateHttpConfig(node.config || {});
    if (node.type === 'wait') integerOption(node.config?.delayMs, 0, 0, 60000, 'Wait delay');
    if (node.type === 'call') {
      if (typeof node.config?.workflowId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(node.config.workflowId)) throw new Error('Call needs a saved workflow id');
      if (!['all', 'each', undefined].includes(node.config.mode)) throw new Error('Call mode must be all or each');
      if (node.config.outputId !== undefined && !/^[A-Za-z0-9_-]{1,50}$/.test(node.config.outputId)) throw new Error('Call output id is invalid');
    }
    if (['filter', 'branch'].includes(node.type)) { pathParts(node.config?.field || 'value'); predicate({}, node.config); }
    if (node.type === 'map') for (const [key, value] of Object.entries(node.config?.fields || {})) { pathParts(key); if (value && typeof value === 'object' && Object.hasOwn(value, 'from')) pathParts(value.from); }
    if (node.type === 'aggregate') { if (!['count', 'sum', 'average', 'min', 'max', undefined].includes(node.config?.op)) throw new Error('Unknown aggregate'); if (node.config?.field) pathParts(node.config.field); const alias = pathParts(node.config?.as || 'value'); if (['count', 'numericCount'].includes(alias[0])) throw new Error('Aggregate output paths cannot overwrite count or numericCount'); }
  }
  const degree = new Map([...ids].map(id => [id, 0])); const next = new Map([...ids].map(id => [id, []]));
  for (const edge of workflow.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) throw new Error('Connections must join distinct existing nodes');
    if (edge.port && !['true', 'false', 'out', 'error'].includes(edge.port)) throw new Error('Unknown output port');
    const source = workflow.nodes.find(n => n.id === edge.from);
    if (edge.port === 'error' && source.settings?.onError !== 'error-output') throw new Error('Error connections require the error-output policy');
    if (source.type === 'branch' && !['true', 'false', 'error'].includes(edge.port)) throw new Error('Branch connections require a true or false port');
    if (source.type !== 'branch' && edge.port !== undefined && !['out', 'error'].includes(edge.port)) throw new Error('Only branch nodes have true or false output ports');
    degree.set(edge.to, degree.get(edge.to) + 1); next.get(edge.from).push(edge.to);
  }
  const queue = [...ids].filter(id => degree.get(id) === 0); const order = [];
  while (queue.length) { const id = queue.shift(); order.push(id); for (const target of next.get(id)) { degree.set(target, degree.get(target) - 1); if (!degree.get(target)) queue.push(target); } }
  if (order.length !== ids.size) throw new Error('Workflow contains a cycle');
  const inputs = workflow.nodes.filter(n => n.type === 'input');
  if (inputs.length !== 1 || workflow.edges.some(e => e.to === inputs[0].id)) throw new Error('Use exactly one input node with no incoming connections');
  if (!workflow.nodes.some(n => n.type === 'output')) throw new Error('Add an output node');
  const reachable = new Set([inputs[0].id]);
  for (const id of order) if (reachable.has(id)) for (const target of next.get(id)) reachable.add(target);
  if (reachable.size !== ids.size) throw new Error('Every node must be reachable from the input');
  return order;
}
export function validateInput(input) {
  if (!Array.isArray(input) || input.length > 10000) throw new Error('Input must be an array with at most 10,000 items');
  if (input.some(v => !v || typeof v !== 'object' || Array.isArray(v))) throw new Error('Input items must be JSON objects');
}
export function transformNode(node, items) {
  const config = node.config || {}; let result;
  switch (node.type) {
      case 'map': items = items.map(item => { const mapped = config.keep !== false ? structuredClone(item) : {}; for (const [key, value] of Object.entries(config.fields || {})) setPath(mapped, key, value && typeof value === 'object' && Object.hasOwn(value, 'from') ? getPath(item, value.from) ?? null : structuredClone(value)); return mapped; }); break;
      case 'filter': items = items.filter(item => predicate(item, config)); break;
      case 'branch': result = { true: items.filter(item => predicate(item, config)), false: items.filter(item => !predicate(item, config)) }; break;
      case 'aggregate': {
        const op = config.op || 'count'; const values = op === 'count' ? [] : items.map(item => getPath(item, config.field || 'value')).filter(v => typeof v === 'number' && Number.isFinite(v));
        let value = items.length;
        if (op === 'sum') value = values.reduce((a, b) => a + b, 0);
        if (op === 'average') value = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
        if (op === 'min') value = values.length ? Math.min(...values) : null;
        if (op === 'max') value = values.length ? Math.max(...values) : null;
        if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Aggregate ${op} produced a non-finite result; reduce the numeric range`);
        const aggregate = { count: items.length, numericCount: values.length }; setPath(aggregate, config.as || 'value', value); items = [aggregate]; break;
      }
  }
  return result || { out: items };
}
export function executeWorkflow(workflow, input = []) {
  const order = validateWorkflow(workflow);
  if (workflow.nodes.some(node => ['http', 'wait', 'call'].includes(node.type) || node.settings?.onError || node.settings?.retry)) throw new Error('Use the asynchronous executor for execution nodes and policies');
  validateInput(input);
  const results = {}; const trace = []; const outputs = {};
  for (const id of order) {
    const node = workflow.nodes.find(n => n.id === id);
    const items = node.type === 'input' ? structuredClone(input) : workflow.edges.filter(e => e.to === id).flatMap(e => structuredClone(results[e.from][e.port || 'out'] || []));
    if (items.length > 10000) throw new Error('An intermediate output exceeds 10,000 items');
    results[id] = transformNode(node, items);
    if (node.type === 'output') outputs[id] = structuredClone(items);
    trace.push({ node: id, type: node.type, inputCount: items.length, outputCount: Object.values(results[id]).reduce((n, rows) => n + rows.length, 0), ports: Object.fromEntries(Object.entries(results[id]).map(([p, rows]) => [p, rows.length])) });
  }
  return { outputs, trace };
}
export const example = { name: 'Qualified order totals', nodes: [{ id: 'orders', type: 'input' }, { id: 'qualify', type: 'filter', config: { field: 'amount', op: 'gte', value: 100 } }, { id: 'total', type: 'aggregate', config: { field: 'amount', op: 'sum', as: 'total' } }, { id: 'result', type: 'output' }], edges: [{ from: 'orders', to: 'qualify' }, { from: 'qualify', to: 'total' }, { from: 'total', to: 'result' }] };
