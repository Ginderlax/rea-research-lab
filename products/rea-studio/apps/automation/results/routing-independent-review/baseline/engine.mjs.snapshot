import { integerOption, validateWorkflow, validateInput, transformNode, getPath, setPath, validateHttpUrl } from './core.mjs';

const sensitive = key => /^(authorization|proxyauthorization|cookie|setcookie|xapikey|apikey|password|passwd|clientsecret|accesstoken|refreshtoken|token|secret)$/i.test(key.replace(/[^a-z0-9]/gi, ''));
export class ExecutionError extends Error {
  constructor(message, code, details = {}) { super(message); this.name = 'ExecutionError'; this.code = code; Object.assign(this, details); }
}
function collectSensitive(value, secrets) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (sensitive(key) && typeof item === 'string' && item) {
      secrets.add(item);
      if (/authorization/i.test(key)) secrets.add(item.replace(/^(Bearer|Basic)\s+/i, ''));
      if (/cookie/i.test(key)) for (const part of item.split(';')) { if (part.includes('=')) { const cookie = part.slice(part.indexOf('=') + 1).trim(); if (cookie) secrets.add(cookie); } }
    }
    collectSensitive(item, secrets);
  }
}
export function redact(value, secrets = new Set()) {
  if (typeof value === 'string') {
    let result = value;
    // Encoded variants are included because endpoints can echo URL-encoded secrets.
    const variants = [...secrets].filter(Boolean).flatMap(secret => [secret, encodeURIComponent(secret)]).sort((a, b) => b.length - a.length);
    for (const secret of variants) result = result.split(secret).join('[REDACTED]');
    return result;
  }
  if (Array.isArray(value)) return value.map(item => redact(item, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitive(key) ? '[REDACTED]' : redact(item, secrets)]));
  return value;
}
function safeUrl(url) {
  const result = new URL(url);
  for (const key of [...result.searchParams.keys()]) if (sensitive(key)) result.searchParams.set(key, '[REDACTED]');
  result.hash = '';
  return result.href;
}
function cancelled(signal) {
  if (signal?.aborted) throw signal.reason instanceof ExecutionError ? signal.reason : new ExecutionError('Execution cancelled', 'CANCELLED');
}
function checkContext(context) {
  cancelled(context.signal);
  if (performance.now() >= context.deadline) throw new ExecutionError('Workflow execution deadline exceeded', 'WORKFLOW_TIMEOUT');
}
async function delay(ms, signal) {
  cancelled(signal);
  if (!ms) return;
  await new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); try { cancelled(signal); } catch (error) { reject(error); } };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
function resolveValue(value, item, context) {
  if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1) {
    if (Object.hasOwn(value, 'from')) return getPath(item, value.from);
    if (Object.hasOwn(value, 'secret')) {
      const secret = context.secrets[value.secret];
      if (typeof secret !== 'string' || !secret) throw new ExecutionError('A required run secret is missing', 'MISSING_SECRET');
      context.secretValues.add(secret); return secret;
    }
  }
  return value;
}
function resolveBody(value, item, context) {
  const resolved = resolveValue(value, item, context);
  if (resolved !== value) return structuredClone(resolved);
  if (Array.isArray(value)) return value.map(entry => resolveBody(entry, item, context));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, resolveBody(entry, item, context)]));
  return value;
}
function requestOptions(config, item, context) {
  const url = validateHttpUrl(resolveValue(config.url, item, context));
  const headers = new Headers();
  for (const [key, value] of Object.entries(config.headers || {})) {
    const resolved = resolveValue(value, item, context);
    if (!['string', 'number', 'boolean'].includes(typeof resolved) || /[\r\n]/.test(String(resolved)) || String(resolved).length > 8192) throw new ExecutionError('A resolved HTTP header is invalid or exceeds 8,192 characters', 'HTTP_CONFIG');
    if (sensitive(key)) {
      context.secretValues.add(String(resolved));
      if (/authorization/i.test(key)) { const token = String(resolved).replace(/^(Bearer|Basic)\s+/i, ''); if (token) context.secretValues.add(token); }
      if (/cookie/i.test(key)) for (const cookie of String(resolved).split(';')) { const value = cookie.slice(cookie.indexOf('=') + 1).trim(); if (value) context.secretValues.add(value); }
    }
    headers.set(key, String(resolved));
  }
  for (const [key, value] of Object.entries(config.query || {})) {
    const resolved = resolveValue(value, item, context);
    if (!['string', 'number', 'boolean'].includes(typeof resolved) || String(resolved).length > 8192) throw new ExecutionError('A resolved HTTP query parameter is invalid', 'HTTP_CONFIG');
    url.searchParams.set(key, String(resolved));
  }
  for (const [key, value] of url.searchParams) if (sensitive(key)) context.secretValues.add(value);
  if (url.href.length > 8192 || Buffer.byteLength(JSON.stringify(Object.fromEntries(headers))) > 16384) throw new ExecutionError('Resolved HTTP URL/headers exceed their size bounds', 'HTTP_CONFIG');
  const method = config.method || 'GET'; let body;
  if (config.bodyType === 'json') {
    const resolvedBody = resolveBody(config.body, item, context); collectSensitive(resolvedBody, context.secretValues); body = JSON.stringify(resolvedBody);
    if (body === undefined) throw new ExecutionError('The resolved JSON body is missing', 'HTTP_CONFIG');
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }
  if (config.bodyType === 'raw') {
    body = resolveValue(config.body, item, context);
    if (typeof body !== 'string') throw new ExecutionError('The resolved raw body must be text', 'HTTP_CONFIG');
    if (!headers.has('content-type')) headers.set('content-type', 'text/plain; charset=utf-8');
  }
  if (body !== undefined && Buffer.byteLength(body) > 1024 * 1024) throw new ExecutionError('HTTP request body exceeds 1 MiB', 'HTTP_REQUEST_LIMIT');
  return { url, options: { method, headers, body, redirect: config.followRedirects === false ? 'manual' : 'follow' }, summary: { method, url: safeUrl(url), headers: redact(Object.fromEntries(headers), context.secretValues) } };
}
async function readResponse(response, format) {
  let size = 0; const chunks = [];
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 1024 * 1024) { await reader.cancel(); throw new ExecutionError('HTTP response exceeds 1 MiB', 'HTTP_RESPONSE_LIMIT'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const text = Buffer.concat(chunks).toString('utf8');
  const json = format === 'json' || (format !== 'text' && /(?:application\/json|\+json)(?:;|$)/i.test(response.headers.get('content-type') || ''));
  let body = text;
  if (json) { try { body = text ? JSON.parse(text) : null; } catch { throw new ExecutionError('HTTP response is not valid JSON', 'HTTP_RESPONSE_FORMAT', { statusCode: response.status }); } }
  return { statusCode: response.status, headers: Object.fromEntries(response.headers), body };
}
async function httpAttempt(config, item, context, record) {
  checkContext(context);
  if (++context.budget.requests > 500) throw new ExecutionError('Execution exceeds 500 HTTP attempts', 'EXECUTION_LIMIT');
  const request = requestOptions(config, item, context); record.request = request.summary;
  const timeoutMs = integerOption(config.timeoutMs, 10000, 1, 60000, 'HTTP timeout');
  const controller = new AbortController();
  const abort = () => controller.abort(context.signal.reason);
  context.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new ExecutionError(`HTTP request timed out after ${timeoutMs} ms`, 'HTTP_TIMEOUT')), timeoutMs);
  try {
    const response = await fetch(request.url, { ...request.options, signal: controller.signal });
    record.statusCode = response.status;
    const result = await readResponse(response, config.responseFormat || 'auto');
    collectSensitive(result, context.secretValues);
    record.response = { statusCode: result.statusCode, headers: redact(result.headers, context.secretValues) };
    if (!response.ok && !config.neverError) throw new ExecutionError(`HTTP request returned status ${response.status}`, 'HTTP_STATUS', { statusCode: response.status, response: result });
    return result;
  } catch (error) {
    cancelled(context.signal);
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof ExecutionError) throw error;
    throw new ExecutionError('HTTP request failed before a complete response was received', 'HTTP_NETWORK');
  } finally { clearTimeout(timer); context.signal?.removeEventListener('abort', abort); }
}
function errorData(error, node) {
  return { node: node.id, code: error.code || 'NODE_ERROR', message: error.message, ...(error.statusCode ? { statusCode: error.statusCode } : {}), ...(error.response ? { response: error.response } : {}) };
}
function traceError(error, node) {
  const result = errorData(error, node);
  if (result.response) {
    const text = typeof result.response.body === 'string' ? result.response.body : JSON.stringify(result.response.body);
    result.response = { ...result.response, body: text?.slice(0, 4096), bodyPreview: true, truncated: (text?.length || 0) > 4096 };
  }
  return result;
}
function retryable(error) { return !['CANCELLED', 'WORKFLOW_TIMEOUT', 'EXECUTION_LIMIT', 'HTTP_CONFIG', 'HTTP_REQUEST_LIMIT', 'HTTP_RESPONSE_LIMIT', 'MISSING_SECRET', 'CALL_CYCLE', 'CALL_DEPTH'].includes(error.code); }
async function withRetries(node, context, entry, operation, itemIndex) {
  const maxAttempts = node.settings?.retry?.maxAttempts || 1; const delayMs = node.settings?.retry?.delayMs || 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    checkContext(context); const start = performance.now();
    const record = { attempt, ...(itemIndex !== undefined ? { itemIndex } : {}) }; entry.attempts.push(record);
    try { const result = await operation(record); record.status = 'completed'; return result; }
    catch (error) {
      record.status = error.code === 'CANCELLED' ? 'cancelled' : 'failed'; record.error = traceError(error, node);
      if (attempt === maxAttempts || !retryable(error)) throw error;
      await delay(delayMs, context.signal);
    } finally { record.durationMs = Math.round((performance.now() - start) * 1000) / 1000; }
  }
}
async function executeHttp(node, items, context, entry) {
  const out = [], errors = []; const config = node.config || {}; let outputBytes = 0;
  const append = (port, item) => { outputBytes += Buffer.byteLength(JSON.stringify(item)) + 1; if (outputBytes > 4 * 1024 * 1024 - 100) throw new ExecutionError('HTTP node output exceeds 4 MiB', 'EXECUTION_LIMIT'); port.push(item); };
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    try {
      const response = await withRetries(node, context, entry, record => httpAttempt(config, item, context, record), index);
      const mapped = config.keepInput === false ? {} : structuredClone(item); setPath(mapped, config.responsePath || 'response', response); append(out, mapped);
    } catch (error) {
      if (['CANCELLED', 'WORKFLOW_TIMEOUT', 'EXECUTION_LIMIT'].includes(error.code) || !node.settings?.onError || node.settings.onError === 'stop') throw error;
      entry.status = 'continued';
      if (node.settings.onError === 'continue') append(out, structuredClone(item));
      else append(errors, { ...structuredClone(item), error: errorData(error, node) });
    }
  }
  return { out, ...(node.settings?.onError === 'error-output' ? { error: errors } : {}) };
}
async function executeCall(node, items, context, entry) {
  const { workflowId, outputId, mode = 'all' } = node.config;
  if (context.stack.includes(workflowId)) throw new ExecutionError('Recursive saved-workflow calls are forbidden', 'CALL_CYCLE');
  if (context.stack.length >= 5) throw new ExecutionError('Saved-workflow calls exceed depth 5', 'CALL_DEPTH');
  if (typeof context.resolveWorkflow !== 'function') throw new ExecutionError('Saved-workflow resolver is unavailable', 'CALL_UNAVAILABLE');
  const child = await context.resolveWorkflow(workflowId);
  if (!child) throw new ExecutionError('Called saved workflow was not found', 'CALL_NOT_FOUND');
  validateWorkflow(child);
  if (outputId && !child.nodes.some(n => n.id === outputId && n.type === 'output')) throw new ExecutionError('Called workflow output was not found', 'CALL_OUTPUT');
  entry.calls ||= []; const out = []; let outputBytes = 0;
  for (const group of mode === 'each' ? items.map(item => [item]) : [items]) {
    checkContext(context);
    const call = { workflowId, workflowName: child.name, status: 'running' }; entry.calls.push(call);
    try {
      const result = await executeGraph(child, group, { ...context, stack: [...context.stack, workflowId] });
      call.status = 'completed'; call.trace = result.trace;
      const rows = outputId ? result.outputs[outputId] : Object.values(result.outputs).flat();
      outputBytes += Buffer.byteLength(JSON.stringify(rows));
      if (outputBytes > 4 * 1024 * 1024 - 100) throw new ExecutionError('Called workflow output exceeds 4 MiB', 'EXECUTION_LIMIT');
      out.push(...rows);
      if (out.length > 10000) throw new ExecutionError('Called workflow exceeds 10,000 output items', 'EXECUTION_LIMIT');
    } catch (error) { call.status = 'failed'; call.trace = error.trace || []; call.error = traceError(error, node); throw error; }
  }
  return { out };
}
async function executeGraph(workflow, input, context) {
  const order = validateWorkflow(workflow); validateInput(input);
  const results = {}, outputs = {}, trace = [];
  try {
    for (const id of order) {
      checkContext(context);
      if (++context.budget.nodes > 500) throw new ExecutionError('Execution exceeds 500 node visits', 'EXECUTION_LIMIT');
      const node = workflow.nodes.find(value => value.id === id);
      const items = node.type === 'input' ? structuredClone(input) : workflow.edges.filter(edge => edge.to === id).flatMap(edge => structuredClone(results[edge.from]?.[edge.port || 'out'] || []));
      if (items.length > 10000) throw new ExecutionError('An intermediate output exceeds 10,000 items', 'EXECUTION_LIMIT');
      const start = performance.now(); const entry = { node: id, type: node.type, inputCount: items.length, status: 'running', attempts: [] }; trace.push(entry);
      try {
        let result;
        // Empty branch/error streams must never cause an HTTP side effect, wait or call.
        if (['http', 'wait', 'call'].includes(node.type) && !items.length) { result = { out: [] }; entry.status = 'skipped'; }
        else if (node.type === 'http') result = await executeHttp(node, items, context, entry);
        else result = await withRetries(node, context, entry, async () => {
          if (node.type === 'wait') { await delay(node.config?.delayMs || 0, context.signal); return { out: structuredClone(items) }; }
          if (node.type === 'call') return executeCall(node, items, context, entry);
          return transformNode(node, structuredClone(items));
        });
        checkContext(context);
        if (Buffer.byteLength(JSON.stringify(result)) > 4 * 1024 * 1024) throw new ExecutionError('A node output exceeds 4 MiB', 'EXECUTION_LIMIT');
        results[id] = result;
        if (node.type === 'output') {
          outputs[id] = structuredClone(result.out);
          if (Buffer.byteLength(JSON.stringify(outputs)) > 4 * 1024 * 1024) { delete outputs[id]; throw new ExecutionError('Combined workflow outputs exceed 4 MiB', 'EXECUTION_LIMIT'); }
        }
        entry.status = entry.status === 'running' ? 'completed' : entry.status;
        entry.outputCount = Object.values(result).reduce((count, rows) => count + rows.length, 0);
        entry.ports = Object.fromEntries(Object.entries(result).map(([port, rows]) => [port, rows.length]));
      } catch (error) {
        entry.error = traceError(error, node);
        if (node.type === 'http' || ['CANCELLED', 'WORKFLOW_TIMEOUT', 'EXECUTION_LIMIT'].includes(error.code) || !node.settings?.onError || node.settings.onError === 'stop') { entry.status = error.code === 'CANCELLED' ? 'cancelled' : 'failed'; throw error; }
        entry.status = 'continued';
        results[id] = node.settings.onError === 'continue' ? (node.type === 'branch' ? { true: structuredClone(items), false: [] } : { out: structuredClone(items) }) : { out: [], error: items.map(item => ({ ...item, error: errorData(error, node) })) };
        entry.outputCount = items.length; entry.ports = Object.fromEntries(Object.entries(results[id]).map(([port, rows]) => [port, rows.length]));
      } finally { entry.durationMs = Math.round((performance.now() - start) * 1000) / 1000; }
    }
    return { outputs, trace };
  } catch (error) {
    const failure = new ExecutionError(error.message, error.code || 'NODE_ERROR', { trace, outputs, failedNode: trace.at(-1)?.node });
    throw failure;
  }
}
export async function executeWorkflowAsync(workflow, input = [], options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal.reason instanceof ExecutionError ? options.signal.reason : new ExecutionError('Execution cancelled', 'CANCELLED'));
  options.signal?.addEventListener('abort', abort, { once: true }); if (options.signal?.aborted) abort();
  const timeoutMs = integerOption(workflow.settings?.timeoutMs, 120000, 1, 120000, 'Workflow timeout');
  const timer = setTimeout(() => controller.abort(new ExecutionError(`Workflow timed out after ${timeoutMs} ms`, 'WORKFLOW_TIMEOUT')), timeoutMs);
  const secretValues = options.secretValues || new Set(Object.values(options.secrets || {}).filter(value => typeof value === 'string' && value));
  collectSensitive(input, secretValues);
  try { return await executeGraph(workflow, input, { signal: controller.signal, deadline: performance.now() + timeoutMs, secrets: options.secrets || {}, secretValues, resolveWorkflow: options.resolveWorkflow, stack: [workflow.id || '(unsaved)'], budget: { nodes: 0, requests: 0 } }); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
