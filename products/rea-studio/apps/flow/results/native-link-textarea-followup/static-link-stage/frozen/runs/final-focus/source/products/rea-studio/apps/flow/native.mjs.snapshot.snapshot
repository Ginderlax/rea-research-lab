// Source-assisted implementation of the documented native flow format and a bounded core-node runtime.
// Original Node-RED code is used by the independent comparison only, never by this application.
import { Worker } from 'node:worker_threads';
import { createHash, randomBytes } from 'node:crypto';
import {compileNativeLinks} from './native-link.mjs';

const unsafe = new Set(['__proto__', 'constructor', 'prototype']);
const supported = new Set(['inject', 'change', 'switch', 'json', 'debug', 'link in', 'link out']);
const configuration = new Set(['tab', 'group', 'comment']);
const valueTypes = new Set(['str', 'num', 'bool', 'json', 'bin', 'date', 'msg', 'flow', 'global']);
const predicates = new Set(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'btwn', 'cont', 'regex', 'true', 'false', 'null', 'nnull', 'empty', 'nempty', 'istype', 'hask', 'else', 'head', 'index']);
const MAX_DOCUMENT = 4 * 1024 * 1024, MAX_VALUE = 1024 * 1024, MAX_TOTAL = 6 * 1024 * 1024;
const digest = text => createHash('sha256').update(text).digest('hex');
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function id(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_.:-]{1,80}$/.test(value) || unsafe.has(value)) throw new Error('Invalid native node id'); return value; }
function bounded(value, limit = MAX_VALUE, { depthLimit = 64, countLimit = 100000, arrayLimit = 10000 } = {}) {
  let count = 0, size = 0;
  const add = bytes => { size += bytes; if (size > limit) throw new Error('Native value exceeds the byte limit'); };
  const visit = (v, depth) => {
    if (depth > depthLimit || ++count > countLimit) throw new Error('Native value exceeds the structural limit');
    if (Buffer.isBuffer(v) || v instanceof Date) { add(Buffer.byteLength(JSON.stringify(v))); return; }
    if (Array.isArray(v) && v.length > arrayLimit) throw new Error('Native array exceeds 10,000 elements');
    if (v && typeof v === 'object') {
      // Count every preserved own property, including named array properties that JSON.stringify discards.
      add(2); if (Array.isArray(v)) add(v.length * 5);
      for (const [key, item] of Object.entries(v)) { add(Buffer.byteLength(JSON.stringify(key)) + 2); visit(item, depth + 1); }
    } else {
      if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Native values must contain finite numbers');
      add(Buffer.byteLength(JSON.stringify(v) ?? 'null'));
    }
  };
  visit(value, 0);
  return size;
}
function clone(value, seen = new WeakMap()) {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (Buffer.isBuffer(value)) { const result = Buffer.from(value); seen.set(value, result); return result; }
  if (value instanceof Date) { const result = new Date(value.getTime()); seen.set(value, result); return result; }
  const result = Array.isArray(value) ? new Array(value.length) : {}; seen.set(value, result);
  for (const [key, item] of Object.entries(value)) Object.defineProperty(result, key, { value: clone(item, seen), writable: true, configurable: true, enumerable: true });
  return result;
}
const messagePath = expression => typeof expression === 'string' && expression.startsWith('msg.') ? expression.slice(4) : expression;
export function nativePath(expression) {
  if (typeof expression !== 'string' || !expression.length || expression.length > 200) throw new Error('Invalid native property path');
  const keys = []; let i = 0;
  const word = () => { const match = /^[A-Za-z_$][\w$]*/.exec(expression.slice(i)); if (!match) throw new Error('Unsupported native property path'); i += match[0].length; return match[0]; };
  keys.push(word());
  while (i < expression.length) {
    if (expression[i] === '.') { i++; keys.push(word()); }
    else if (expression[i] === '[') {
      const bracket = /^\[(?:(\d+)|"([^"\\]*)"|'([^'\\]*)')\]/.exec(expression.slice(i));
      if (!bracket) throw new Error('Only static native property indexes are supported');
      i += bracket[0].length; const key = bracket[1] === undefined ? bracket[2] ?? bracket[3] : Number(bracket[1]);
      if ((typeof key === 'number' || /^(?:0|[1-9]\d*)$/.test(key)) && Number(key) > 9999) throw new Error('Native array index exceeds 9,999');
      keys.push(key);
    } else throw new Error('Unsupported native property path');
  }
  if (keys.length > 32 || keys.some(k => unsafe.has(String(k)) || k === '')) throw new Error('Invalid native property path');
  return keys;
}
export function nativeRead(value, expression) {
  for (const key of nativePath(expression)) { if (value === null || value === undefined || !Object.hasOwn(Object(value), key)) return undefined; value = value[key]; }
  return value;
}
export function nativeWrite(root, expression, value, remove = value === undefined) {
  const keys = nativePath(expression); let target = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (Buffer.isBuffer(target)) throw new Error('Only native Buffer byte indexes can be written');
    if (!Object.hasOwn(target, key) || Array.isArray(target) && typeof key === 'number' && target[key] === undefined) {
      if (remove) return false;
      target[key] = typeof keys[i + 1] === 'number' ? [] : {};
    }
    if (!target[key] || typeof target[key] !== 'object') return false;
    target = target[key];
  }
  if (Buffer.isBuffer(target)) {
    const key = String(keys.at(-1));
    if (!/^(?:0|[1-9]\d*)$/.test(key)) throw new Error('Only native Buffer byte indexes can be written');
    if (remove) throw new Error('Native Buffer bytes cannot be deleted');
    if (!['number', 'string', 'boolean'].includes(typeof value) || !Number.isFinite(Number(value))) throw new Error('Native Buffer byte value must be finite and numeric');
    target[Number(key)] = Number(value); return true;
  }
  if (Array.isArray(target) && keys.at(-1) === 'length' && (!remove && (!Number.isInteger(value) || value < 0 || value > 10000))) throw new Error('Native array length must be 0–10,000');
  if (remove) { if (Array.isArray(target) && typeof keys.at(-1) === 'number') target.splice(keys.at(-1), 1); else if (!(Array.isArray(target) && keys.at(-1) === 'length')) delete target[keys.at(-1)]; } else target[keys.at(-1)] = value;
  return true;
}
function contextTarget(type, message, contexts, node) {
  if (type === 'msg') return message;
  if (type === 'global') return contexts.global;
  if (type === 'flow') { const scope = node.z || 'unassigned'; if (!Object.hasOwn(contexts.flows, scope)) contexts.flows[scope] = {}; return contexts.flows[scope]; }
  throw new Error(`Unsupported native property scope: ${type}`);
}
function evaluate(value, type = 'str', message, contexts, node, now) {
  if (type === 'str') return String(value);
  if (type === 'num') { const number = Number(value); if (!Number.isFinite(number)) throw new Error('Native numeric value is not finite'); return number; }
  if (type === 'bool') return /^true$/i.test(String(value));
  if (type === 'json') return JSON.parse(value);
  if (type === 'bin') { const data = JSON.parse(value); if (typeof data === 'string') return Buffer.from(data); if (!Array.isArray(data) || data.length > MAX_VALUE || data.some(n => !Number.isInteger(n) || n < 0 || n > 255)) throw new Error('Native binary value must be a string or byte array'); return Buffer.from(data); }
  if (type === 'date') { if (!value) return now(); if (value === 'object') return new Date(now()); if (value === 'iso') return new Date(now()).toISOString(); throw new Error('Custom native date formatting is not implemented'); }
  if (['msg', 'flow', 'global'].includes(type)) return nativeRead(contextTarget(type, message, contexts, node), type === 'msg' ? messagePath(value) : value);
  throw new Error(`Unsupported native value type: ${type}`);
}
function propsFor(node) {
  if (!Array.isArray(node.props)) return [{ p: 'payload', v: node.payload, vt: node.payloadType }, { p: 'topic', v: node.topic, vt: 'str' }];
  return node.props.map(p => ({ ...p, ...(p.p === 'payload' && !Object.hasOwn(p, 'v') ? { v: node.payload, vt: node.payloadType } : {}), ...(p.p === 'topic' && p.vt === 'str' && !Object.hasOwn(p, 'v') ? { v: node.topic } : {}) }));
}
function changesFor(node) {
  const rules = node.rules ?? [{ t: node.action === 'replace' ? 'set' : node.action, p: node.property || '', to: node.to || '', from: node.from || '', re: node.reg === null || Boolean(node.reg) }];
  return rules.map(rule => {
    const result = { ...rule, pt: rule.pt || 'msg', tot: rule.tot || 'str', fromt: rule.fromt || 'str' };
    if (rule.t === 'set' && !rule.tot && String(rule.to).startsWith('msg.')) { result.to = rule.to.slice(4); result.tot = 'msg'; }
    if (rule.t === 'change' && rule.re) result.fromt = 're';
    return result;
  });
}
function nodeIssues(node) {
  const issues = [];
  if (!supported.has(node.type)) return configuration.has(node.type) ? issues : [`${node.type} execution is not implemented`];
  try {
    if(node.type==='link out'&&(node.mode||'link')!=='link')throw new Error('Only static Link Out link mode is implemented; return/Link Call/event bus are not implemented');
    if (node.type === 'inject') {
      if (propsFor(node).length > 100) throw new Error('At most 100 inject properties');
      for (const p of propsFor(node)) { if (!p.p) continue; nativePath(p.p); if (!valueTypes.has(p.vt ?? 'str')) throw new Error(`Inject value type ${p.vt} is not implemented`); if (p.vt === 'date' && p.v && !['iso', 'object'].includes(p.v)) throw new Error('Custom native date formatting is not implemented'); if (['msg', 'flow', 'global'].includes(p.vt)) nativePath(p.v ?? ''); }
    }
    if (node.type === 'change') {
      const rules = changesFor(node); if (!Array.isArray(rules) || rules.length > 100) throw new Error('At most 100 change rules');
      for (const r of rules) {
        nativePath(r.p); if (!['msg', 'flow', 'global'].includes(r.pt) || !['set', 'delete', 'move', 'change'].includes(r.t)) throw new Error('Unsupported change operation or scope');
        if (r.t === 'move') { if (!['msg', 'flow', 'global'].includes(r.tot)) throw new Error('Move needs a message or context destination'); nativePath(r.to); }
        else if (r.t !== 'delete') {
          if (!valueTypes.has(r.tot)) throw new Error(`Change value type ${r.tot} is not implemented`);
          if (r.tot === 'date' && r.to && !['iso', 'object'].includes(r.to)) throw new Error('Custom native date formatting is not implemented');
          if (['msg', 'flow', 'global'].includes(r.tot)) nativePath(r.to);
          if (r.t === 'change' && !['str', 'num', 'bool'].includes(r.fromt)) throw new Error(`Change search type ${r.fromt} is not implemented`);
        }
      }
    }
    if (node.type === 'switch') {
      if (!['msg', 'flow', 'global'].includes(node.propertyType || 'msg')) throw new Error('Switch expression type is not implemented');
      nativePath(node.property); if (!Array.isArray(node.rules) || node.rules.length > 100) throw new Error('At most 100 switch rules');
      if (node.repair) throw new Error('Switch sequence repair is not implemented');
      for (const r of node.rules) {
        if (!predicates.has(r.t)) throw new Error(`Switch predicate ${r.t} is not implemented`);
        for (const [v, t] of [[r.v, r.vt], [r.v2, r.v2t]]) {
          if (t && !valueTypes.has(t) && !['prev', 'null'].includes(t)) throw new Error(`Switch operand type ${t} is not implemented`);
          if (t === 'date' && v && !['iso', 'object'].includes(v)) throw new Error('Custom native date formatting is not implemented');
          if (['msg', 'flow', 'global'].includes(t)) nativePath(v);
        }
      }
    }
    if (node.type === 'json') { nativePath(node.property || 'payload'); if (node.action && !['obj', 'str'].includes(node.action)) throw new Error('Unsupported JSON action'); }
    if (node.type === 'debug') { if (node.console === true || node.console === 'true' || node.tostatus === true) throw new Error('Native Debug console/status output is not implemented'); if (node.targetType && node.targetType !== 'msg') throw new Error('Debug expression target is not implemented'); if (node.complete && !['true', 'false'].includes(node.complete)) nativePath(node.complete); }
  } catch (error) { issues.push(error.message); }
  return issues;
}
export function parseNative(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_DOCUMENT) throw new Error('Native flow JSON must be at most 4 MiB');
  const document = JSON.parse(text); bounded(document, MAX_DOCUMENT);
  const nodes = Array.isArray(document) ? document : object(document) && Array.isArray(document.flows) ? document.flows : null;
  if (!nodes || !nodes.length || nodes.length > 500) throw new Error('Use a native node array or flows envelope with 1–500 nodes');
  const ids = new Set(); let wires = 0;
  for (const node of nodes) {
    if (!object(node) || typeof node.type !== 'string' || !node.type.length || node.type.length > 100) throw new Error('Native nodes need a type');
    id(node.id); if (node.z !== undefined && node.z !== '') id(node.z); if (ids.has(node.id)) throw new Error('Duplicate native node id'); ids.add(node.id);
    if (node.wires !== undefined) {
      if (!Array.isArray(node.wires) || node.wires.length > 100) throw new Error('Native wires must be output arrays');
      for (const port of node.wires) { if (!Array.isArray(port)) throw new Error('Native wire port must be an array'); for (const target of port) { id(target); if (++wires > 2000) throw new Error('At most 2,000 native wire destinations'); } }
    }
  }
  const links=compileNativeLinks(nodes);
  const issues = [...nodes.flatMap(node => nodeIssues(node).map(reason => ({ node: node.id, type: node.type, reason }))),...links.issues];
  const schedules = nodes.filter(n => n.type === 'inject' && (n.repeat || n.crontab || n.once)).map(n => n.id);
  const starts = nodes.filter(n => n.type === 'inject' && !n.d && !nodes.find(t => t.id === n.z && t.type === 'tab')?.disabled).map(n => ({ id: n.id, name: n.name || n.id, tab: n.z || '' }));
  return { document, nodes, revision: digest(text), starts, issues, schedules,compiledNodes:links.nodes,linkConnections:links.linkConnections,linkIssues:links.issues };
}
export function describeNative(record) {
  const info = parseNative(record.text);
  const deployedStarts = record.deployment ? parseNative(record.deployment.text).starts.filter(s => record.deployment.starts.includes(s.id)) : [];
  return { id: record.id, name: record.name, text: record.text, revision: info.revision, starts: info.starts, deployedStarts, issues: info.issues, schedules: info.schedules, nodeCount: info.nodes.length, updatedAt: record.updatedAt, deployedRevision: record.deployment?.revision ?? null, deployedAt: record.deployment?.at ?? null };
}
export function nativePreflight(info, start) {
  const compiled=info.compiledNodes?{nodes:info.compiledNodes,issues:info.linkIssues}:compileNativeLinks(info.nodes),nodes=compiled.nodes;
  const disabled = node => Boolean(node.d || nodes.get(node.z)?.disabled);
  const first = nodes.get(start || info.starts[0]?.id);
  if (!first || first.type !== 'inject' || disabled(first)) throw new Error('Choose an enabled native inject node');
  const pending = [first.id], seen = new Set();
  while (pending.length) {
    const node = nodes.get(pending.pop()); if (!node) throw new Error('Native connection target is missing');
    if (seen.has(node.id) || disabled(node)) continue; seen.add(node.id);
    if (configuration.has(node.type)) throw new Error(`Cannot run native configuration node ${node.id}`);
    const issues = nodeIssues(node); if (issues.length) throw new Error(`Cannot run native node ${node.id}: ${issues.join('; ')}`);
    const linkIssues=(compiled.issues??[]).filter(issue=>issue.node===node.id);if(linkIssues.length)throw new Error(`Cannot run native node ${node.id}: ${linkIssues.map(issue=>issue.reason).join('; ')}`);
    if (node.type === 'switch' && (node.wires || []).some((port, i) => port.length && i >= node.rules.length)) throw new Error(`Switch ${node.id} has a wire beyond its rule outputs`);
    if (node.type !== 'switch' && (node.wires || []).slice(1).some(p => p.length)) throw new Error(`Node ${node.id} has unsupported extra outputs`);
    if (node.type !== 'debug') for (const port of node.wires || []) for (const target of port) pending.push(target);
  }
  return { first, nodes, disabled, reachable: [...seen] };
}
async function regex(text, pattern, ignoreCase, deadline) {
  if (String(pattern).length > 4096 || text.length > MAX_VALUE) throw new Error('Native regular expression input exceeds the limit');
  const remaining = deadline - performance.now(); if (remaining <= 0) throw new Error('Native flow exceeded ten seconds');
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./native-regex-worker.mjs', import.meta.url), { workerData: { text, pattern: String(pattern), ignoreCase }, resourceLimits: { maxOldGenerationSizeMb: 32 } });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error(remaining < 1000 ? 'Native flow exceeded ten seconds' : 'Native regular expression exceeded one second')); }, Math.min(1000, remaining));
    worker.once('message', result => { clearTimeout(timer); worker.terminate(); result.error ? reject(new Error(result.error)) : resolve(result.matched); });
    worker.once('error', error => { clearTimeout(timer); reject(error); });
    worker.once('exit', code => { if (code !== 0) { clearTimeout(timer); reject(new Error('Native regular expression worker stopped')); } });
  });
}
export async function nativeSwitch(node, message, contexts, previous = null, now = Date.now, { deadline = performance.now() + 10000 } = {}) {
  const originalProperty = evaluate(node.property, node.propertyType || 'msg', message, contexts, node, now), ports = []; let otherwise = true;
  const operand = (value, type, second = false) => {
    if (type === 'prev') return previous;
    if (type === 'json' && !second) return 'json';
    if (type === 'null') return second ? value : 'null';
    if (value === undefined && second) return undefined;
    return evaluate(value, type || (Number.isNaN(Number(value)) ? 'str' : 'num'), message, contexts, node, now);
  };
  for (let index = 0; index < node.rules.length; index++) {
    if (performance.now() >= deadline) throw new Error('Native flow exceeded ten seconds');
    const rule = node.rules[index], b = operand(rule.v, rule.vt), c = operand(rule.v2, rule.v2t, true); let property = originalProperty;
    if (rule.t === 'else') { property = otherwise; otherwise = true; }
    let matched = false;
    switch (rule.t) {
      // Node-RED's equality and ordered comparisons intentionally use JavaScript coercion.
      case 'eq': matched = property == b; break;
      case 'neq': matched = property != b; break;
      case 'lt': matched = property < b; break;
      case 'lte': matched = property <= b; break;
      case 'gt': matched = property > b; break;
      case 'gte': matched = property >= b; break;
      case 'btwn': matched = property >= b && property <= c || property <= b && property >= c; break;
      case 'cont': matched = String(property).includes(String(b)); break;
      case 'regex': matched = await regex(String(property), b, Boolean(rule.case), deadline); break;
      case 'true': matched = property === true; break;
      case 'false': matched = property === false; break;
      case 'null': matched = property === null || property === undefined; break;
      case 'nnull': matched = property !== null && property !== undefined; break;
      case 'empty': case 'nempty': { const length = typeof property === 'string' || Array.isArray(property) || Buffer.isBuffer(property) ? property.length : object(property) ? Object.keys(property).length : undefined; matched = length !== undefined && (rule.t === 'empty' ? length === 0 : length !== 0); break; }
      case 'istype': matched = b === 'array' ? Array.isArray(property) : b === 'buffer' ? Buffer.isBuffer(property) : b === 'null' ? property === null : b === 'json' ? (() => { try { JSON.parse(property); return true; } catch { return false; } })() : b === 'number' ? typeof property === 'number' && !Number.isNaN(property) : typeof property === b && !Array.isArray(property) && !Buffer.isBuffer(property) && property !== null; break;
      case 'hask': matched = property !== null && property !== undefined && typeof b !== 'object' && Object.hasOwn(Object(property), String(b)); break;
      case 'else': matched = property === true; break;
      case 'head': case 'tail': case 'index': {
        if (!object(message.parts)) throw new Error('Native sequence predicate needs message.parts');
        matched = rule.t === 'head' ? message.parts.index < Number(b) : rule.t === 'tail' ? message.parts.count - Number(b) <= message.parts.index : Number(b) <= message.parts.index && message.parts.index <= Number(c); break;
      }
      default: throw new Error(`Unsupported native switch predicate: ${rule.t}`);
    }
    if (performance.now() >= deadline) throw new Error('Native flow exceeded ten seconds');
    if (matched) { ports.push(index); otherwise = false; if (node.checkall === 'false') break; }
  }
  return { ports, previous: originalProperty, originalProperty };
}
export function boundedLiteralReplace(text, search, replacement) {
  const template = String(replacement), tokens = []; let literal = '';
  for (let i = 0; i < template.length; i++) {
    if (template[i] === '$' && ['$', '&', '`', "'"].includes(template[i + 1])) {
      if (literal) { tokens.push({ literal }); literal = ''; }
      const code = template[++i]; tokens.push(code === '$' ? { literal: '$' } : { code });
    } else literal += template[i];
  }
  if (literal) tokens.push({ literal });
  const chunks = []; let length = 0, cursor = 0, scan = 0;
  const append = part => { if (length + part.length > MAX_VALUE) throw new Error('Native replacement exceeds the result limit'); if (part) chunks.push(part); length += part.length; };
  const appendSpan = (begin, end) => { if (length + end - begin > MAX_VALUE) throw new Error('Native replacement exceeds the result limit'); append(text.slice(begin, end)); };
  while (scan <= text.length) {
    const index = search.length ? text.indexOf(search, scan) : scan; if (index < 0) break;
    appendSpan(cursor, index);
    for (const token of tokens) {
      if (Object.hasOwn(token, 'literal')) append(token.literal);
      else if (token.code === '&') append(search);
      else if (token.code === '`') appendSpan(0, index);
      else appendSpan(index + search.length, text.length);
    }
    cursor = index + search.length; scan = search.length ? cursor : index + 1;
  }
  appendSpan(cursor, text.length); const result = chunks.join('');
  if (Buffer.byteLength(result) > MAX_VALUE) throw new Error('Native replacement exceeds the result byte limit'); return result;
}
function encode(value, seen = new WeakMap(), counter = { next: 0 }) {
  if (value === undefined) return ['u'];
  if (value && typeof value === 'object') {
    if (seen.has(value)) return ['r', seen.get(value)];
    const reference = counter.next++; seen.set(value, reference);
    if (Buffer.isBuffer(value)) return ['b', value.toString('base64'), reference];
    if (value instanceof Date) return ['d', value.toISOString(), reference];
    if (Array.isArray(value)) return ['a', value.length, Object.entries(value).map(([k, v]) => [k, encode(v, seen, counter)]), reference];
    return ['o', Object.entries(value).map(([k, v]) => [k, encode(v, seen, counter)]), reference];
  }
  return ['v', value];
}
function decode(value, references = new Map()) {
  if (!Array.isArray(value)) throw new Error('Invalid native context encoding');
  const remember = (result, reference) => {
    if (reference !== undefined) { if (!Number.isInteger(reference) || reference < 0 || reference > 100000 || references.has(reference)) throw new Error('Invalid native context reference'); references.set(reference, result); }
    return result;
  };
  switch (value[0]) {
    case 'u': return undefined;
    case 'r': if (!references.has(value[1])) throw new Error('Unknown native context reference'); return references.get(value[1]);
    case 'b': { if (typeof value[1] !== 'string' || value[1].length > Math.ceil(MAX_VALUE / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value[1])) throw new Error('Invalid native context buffer'); return remember(Buffer.from(value[1], 'base64'), value[2]); }
    case 'd': { const result = new Date(value[1]); if (typeof value[1] !== 'string' || !Number.isFinite(result.getTime())) throw new Error('Invalid native context date'); return remember(result, value[2]); }
    case 'a': {
      if (!Number.isInteger(value[1]) || value[1] < 0 || value[1] > 10000 || !Array.isArray(value[2])) throw new Error('Invalid native context array');
      const result = remember(new Array(value[1]), value[3]);
      for (const [key, item] of value[2]) { if (typeof key !== 'string' || unsafe.has(key) || key === 'length' || /^(?:0|[1-9]\d*)$/.test(key) && Number(key) >= value[1] || Object.hasOwn(result, key)) throw new Error('Invalid native context array index'); Object.defineProperty(result, key, { value: decode(item, references), enumerable: true, writable: true, configurable: true }); }
      return result;
    }
    case 'o': {
      if (!Array.isArray(value[1])) throw new Error('Invalid native context object'); const result = remember({}, value[2]);
      for (const [key, item] of value[1]) { if (typeof key !== 'string' || Object.hasOwn(result, key)) throw new Error('Invalid native context object key'); Object.defineProperty(result, key, { value: decode(item, references), enumerable: true, writable: true, configurable: true }); } return result;
    }
    case 'v': if (value[1] !== null && !['number', 'string', 'boolean'].includes(typeof value[1])) throw new Error('Invalid native context scalar'); return value[1];
    default: throw new Error('Invalid native context encoding');
  }
}
export function inspectNativeState(packedState) {
  if (!packedState) return { flows: {}, global: {}, previous: {} };
  bounded(packedState, MAX_TOTAL, { depthLimit: 256, countLimit: 1000000, arrayLimit: 100000 }); const state = decode(packedState); bounded(state); return clone(state);
}
export async function executeNative(text, { start, messages, packedState, now = Date.now } = {}) {
  const info = parseNative(text), { first, nodes, disabled, reachable } = nativePreflight(info, start);
  const contexts = inspectNativeState(packedState);
  if (!object(contexts.flows) || !object(contexts.global) || !object(contexts.previous)) throw new Error('Invalid native context');
  const initial = messages === undefined ? [{}] : messages;
  if (!Array.isArray(initial) || !initial.length || initial.length > 1000 || initial.some(m => !object(m))) throw new Error('Use 1–1,000 native input message objects');
  const queue = []; let queuedBytes = 0, retainedBytes = 0, cursor = 0, steps = 0;
  const enqueue = (node, message, copy = true) => { const size = bounded(message); if (queuedBytes + retainedBytes + size > MAX_TOTAL || queue.length - cursor >= 5000) throw new Error('Native flow exceeds the aggregate message limit'); queue.push({ node, message: copy ? clone(message) : message, size }); queuedBytes += size; };
  for (const message of initial) { bounded(message); const input = clone(message); if (!input._msgid) input._msgid = randomBytes(8).toString('hex'); enqueue(first.id, input, false); }
  const trace = [], debug = [], deadline = performance.now() + 10000;
  while (cursor < queue.length) {
    if (++steps > 5000) throw new Error('Native flow exceeded 5,000 deliveries; inspect cycles');
    if (performance.now() > deadline) throw new Error('Native flow exceeded ten seconds');
    const event = queue[cursor]; queue[cursor++] = null; queuedBytes -= event.size;
    const node = nodes.get(event.node); if (disabled(node)) continue;
    const message = event.message; trace.push({ node: node.id, type: node.type, sequence: steps }); let ports = [0];
    if(node.type==='link out'){message._event='node:'+node.id;bounded(message);}
    if (node.type === 'inject') {
      const overrides = message.__user_inject_props__; delete message.__user_inject_props__;
      if (overrides !== undefined) throw new Error('Native inject overrides are not implemented; edit the node properties');
      for (const p of propsFor(node)) if (p.p) { nativeWrite(message, messagePath(p.p), evaluate(p.v ?? '', p.vt ?? 'str', message, contexts, node, now)); bounded(message); bounded(contexts); if (performance.now() >= deadline) throw new Error('Native flow exceeded ten seconds'); }
    }
    if (node.type === 'change') for (const rule of changesFor(node)) {
      const target = contextTarget(rule.pt, message, contexts, node), path = rule.pt === 'msg' ? messagePath(rule.p) : rule.p;
      if (rule.t === 'delete') nativeWrite(target, path, undefined);
      else if (rule.t === 'move') { const value = nativeRead(target, path); nativeWrite(target, path, undefined); nativeWrite(contextTarget(rule.tot, message, contexts, node), rule.tot === 'msg' ? messagePath(rule.to) : rule.to, value); }
      else {
        const evaluated = evaluate(rule.to, rule.tot, message, contexts, node, now); bounded(evaluated);
        const value = rule.dc ? clone(evaluated) : evaluated;
        if (rule.t === 'set') nativeWrite(target, path, value);
        else {
          const current = nativeRead(target, path), from = rule.from;
          if (typeof current === 'string') {
            if (current === from) nativeWrite(target, path, value);
            else { let replaced = boundedLiteralReplace(current, String(from), value); if (rule.pt === 'msg' && rule.tot === 'bool' && replaced === String(value)) replaced = value; nativeWrite(target, path, replaced); }
          } else if (typeof current === 'number' && rule.fromt === 'num' && current == Number(from) || typeof current === 'boolean' && rule.fromt === 'bool' && String(current) === from) nativeWrite(target, path, value);
        }
      }
      bounded(message); bounded(contexts); if (performance.now() >= deadline) throw new Error('Native flow exceeded ten seconds');
    }
    if (node.type === 'switch') {
      const result = await nativeSwitch(node, message, contexts, Object.hasOwn(contexts.previous, node.id) ? contexts.previous[node.id] : null, now, { deadline }); ports = result.ports; contexts.previous[node.id] = result.previous;
    }
    if (node.type === 'json') {
      if (message.schema) throw new Error('Native JSON schema validation is not implemented');
      const path = messagePath(node.property || 'payload'), value = nativeRead(message, path);
      if (typeof value === 'string' || Buffer.isBuffer(value)) { if (!node.action || node.action === 'obj') nativeWrite(message, path, JSON.parse(value)); }
      else if (value !== undefined) { if (!node.action || node.action === 'str') nativeWrite(message, path, JSON.stringify(value, null, node.pretty ? 4 : 0)); }
    }
    if (node.type === 'debug') {
      if (node.active !== false && node.tosidebar !== false) {
        const value = node.complete === 'true' ? message : nativeRead(message, !node.complete || node.complete === 'false' ? 'payload' : messagePath(node.complete));
        const entry = { node: node.id, name: node.name || '', sequence: steps, message: clone(message), value: clone(value) };
        retainedBytes += bounded(entry); if (retainedBytes + queuedBytes > MAX_TOTAL) throw new Error('Native debug output exceeds the aggregate limit'); debug.push(entry);
      }
      ports = [];
    }
    if (performance.now() >= deadline) throw new Error('Native flow exceeded ten seconds');
    bounded(message); bounded(contexts);
    let firstDestination = true;
    for (const port of ports) for (const target of node.wires?.[port] || []) { enqueue(target, message, !firstDestination); firstDestination = false; }
  }
  if (performance.now() >= deadline) throw new Error('Native flow exceeded ten seconds');
  const packed = encode(contexts); bounded(packed, MAX_TOTAL, { depthLimit: 256, countLimit: 1000000, arrayLimit: 100000 });
  return { debug, trace, deliveries: steps, reachable, state: clone(contexts), packedState: packed, sourceRevision: info.revision };
}
