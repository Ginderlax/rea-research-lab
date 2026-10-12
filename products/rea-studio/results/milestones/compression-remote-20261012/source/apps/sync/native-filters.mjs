// Newly written, source-assisted local subset of rclone v1.75.2 filters.
// Matching uses bounded dynamic programming, rather than backtracking regexes.
const MAX_RULES = 256, MAX_TEXT = 65536, MAX_PATTERN = 2048, MAX_TOKENS = 262144;
const ascii = { alnum:'A-Za-z0-9',alpha:'A-Za-z',ascii:'\\x00-\\x7f',blank:' \\t',cntrl:'\\x00-\\x1f\\x7f',digit:'0-9',graph:'!-~',lower:'a-z',print:' -~',punct:'!-/:-@\\[-`{-~',space:'\\t\\n\\v\\f\\r ',upper:'A-Z',word:'A-Za-z0-9_',xdigit:'A-Fa-f0-9' };
const fail = text => { throw new Error(text); };
const goTrimSpace = text => text.replace(/^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g,'');
function list(value,name) { if (value === undefined) return []; if (!Array.isArray(value) || value.length > MAX_RULES || value.some(x => typeof x !== 'string')) fail(`Use a bounded string array for ${name}.`); return value; }
function expand(pattern) {
  const find = text => {
    let open = -1, depth = 0, bracket = 0, slash = false, split = [], begin = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i]; if (slash) { slash = false; continue; } if (c === '\\') { slash = true; continue; }
      if (c === '[') bracket++; if (c === ']') bracket--; if (bracket) continue;
      if (c === '{') { if (text[i+1] === '{') fail('Raw RE2 regular expressions are an unsupported filter capability.'); if (depth++ === 0) { open = i; begin = i+1; } if (depth > 8) fail('Filter brace nesting exceeds eight levels.'); }
      else if (c === ',' && depth === 1) { split.push(text.slice(begin,i)); begin = i+1; }
      else if (c === '}') { if (!depth) fail('Unbalanced filter brace.'); if (--depth === 0) return { open,close:i,parts:[...split,text.slice(begin,i)] }; }
    }
    if (depth) fail('Unbalanced filter brace.'); return null;
  };
  const queue = [pattern], out = [];
  while (queue.length) {
    const text = queue.shift(), braces = find(text);
    if (!braces) out.push(text);
    else for (const part of braces.parts) queue.push(text.slice(0,braces.open) + part + text.slice(braces.close+1));
    if (queue.length + out.length > 128 || queue.reduce((n,x) => n+x.length,0) + out.reduce((n,x) => n+x.length,0) > 65536) fail('Filter alternatives exceed the expansion budget.');
  }
  return out;
}
function tokens(pattern,ignoreCase) {
  const out = [], chars = Array.from(pattern), literal = c => {
    const expression = ignoreCase ? new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'iu') : null;
    out.push({ kind:'char',test:expression ? x => expression.test(x):x => x === c });
  };
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '*') { let count = 1; while (chars[i+1] === '*') { count++; i++; } if (count > 2) fail('Rclone patterns allow at most two consecutive stars.'); out.push({ kind:count === 2 ? 'tree':'star' }); }
    else if (c === '?') out.push({ kind:'char',test:x => x !== '/' });
    else if (c === '\\') {
      const next = chars[++i]; if (!next) fail('Unfinished filter escape.');
      if ('dDsSwW'.includes(next)) { const contents = { d:'0-9',s:'\\t\\n\\f\\r ',w:'A-Za-z0-9_' }[next.toLowerCase()]; const re = new RegExp(`^[${next === next.toUpperCase() ? '^':''}${contents}]$`,ignoreCase ? 'iu':'u'); out.push({ kind:'char',test:x => re.test(x) }); }
      else if ('*?\\[]{}.,+-()|^$/'.includes(next)) literal(next);
      else fail(`Unsupported Go character escape: \\${next}.`);
    } else if (c === '[') {
      let text = '[', depth = 1;
      while (++i < chars.length) {
        const part = chars[i]; text += part;
        if (part === '\\') { if (!chars[i+1]) fail('Unfinished filter class escape.'); const escape = chars[++i]; if (!'dDsSwW\\-[]^/'.includes(escape)) fail('Unsupported Go character-class escape.'); text += escape; continue; }
        if (part === '[') depth++;
        else if (part === ']' && --depth === 0) break;
      }
      if (depth) fail('Unbalanced filter character class.');
      text = text.replace(/\[:([a-z]+):\]/g,(_,name) => Object.hasOwn(ascii,name) ? ascii[name]:fail(`Unsupported ASCII class ${name}.`));
      text = text.replace(/\\s/g,'\\t\\n\\f\\r ').replace(/\\S/g,'\\x00-\\x08\\x0b\\x0e-\\x1f\\x21-\\u{10ffff}');
      if (/\\[pPQE]/.test(text)) fail('Unicode property and quoted-regex classes are unsupported.');
      let re; try { re = new RegExp(`^${text}$`,ignoreCase ? 'iu':'u'); } catch { fail('Invalid filter character class.'); }
      out.push({ kind:'char',test:x => re.test(x) });
    } else if (c === ']') fail('Unbalanced filter character class.');
    else literal(c);
  }
  return out;
}
export function compileGlob(pattern,ignoreCase = false) {
  if (typeof pattern !== 'string' || pattern.length > MAX_PATTERN || !pattern.isWellFormed() || /[\x00-\x1f\x7f]/.test(pattern)) fail('Use a well-formed filter pattern of at most 2,048 characters.');
  const anchored = pattern.startsWith('/'), alternatives = expand(anchored ? pattern.slice(1):pattern).map(p => tokens(p,ignoreCase));
  const tokenCount = alternatives.reduce((n,part) => n+part.length,0);
  return { pattern,tokenCount,match(remote,budget = { remaining:4000000 }) {
    const path = Array.from(remote);
    for (const pattern of alternatives) {
      budget.remaining -= (path.length+1) * (pattern.length+1);
      if (budget.remaining < 0) fail('Filter matching exceeded its bounded work budget.');
      let current = new Uint8Array(path.length+1); current[0] = 1;
      if (!anchored) for (let i = 1; i <= path.length; i++) if (path[i-1] === '/') current[i] = 1;
      for (const token of pattern) {
        const next = new Uint8Array(path.length+1);
        if (token.kind === 'star' || token.kind === 'tree') {
          next[0] = current[0]; for (let i = 1; i <= path.length; i++) next[i] = current[i] || (next[i-1] && (token.kind === 'tree' || path[i-1] !== '/')) ? 1:0;
        } else for (let i = 1; i <= path.length; i++) if (current[i-1] && token.test(path[i-1])) next[i] = 1;
        current = next;
      }
      if (current[path.length]) return true;
    }
    return false;
  } };
}
function directoryPatterns(pattern) {
  if (/({[^{}]*(\*\*|\/)[^{}]*})|\{\{|\}\}|\{[^{}]*\{/.test(pattern)) return ['/**'];
  let text = pattern.replace(/\/{2,}/g,'/'); const output = [];
  for (;;) {
    const slash = text.lastIndexOf('/'), stars = text.lastIndexOf('**'), index = Math.max(slash,stars);
    if (index < 0) { if (!output.length) output.push('/**'); return output; }
    const suffix = stars > slash ? '**':''; text = text.slice(0,index); const next = text + suffix + '/';
    if (output.at(-1) !== next) output.push(next);
  }
}
function lines(text,raw = false,nul = false) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_TEXT || !text.isWellFormed()) fail('Filter file text exceeds 64 KiB.');
  const values = text.split(nul ? '\0':'\n'); if (values.at(-1) === '') values.pop();
  return values.map(x => nul ? x:x.replace(/\r$/,'')).map(x => raw ? x:goTrimSpace(x)).filter(x => raw || (x && !/^[#;]/.test(x)));
}
export function compileFilters(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('Invalid native filter options.');
  const allowed = ['include','includeFrom','exclude','excludeFrom','filter','filterFrom','filesFrom','filesFromRaw','filesFrom0','ignoreCase','minSize','maxSize'];
  if (Object.keys(options).some(key => !allowed.includes(key))) fail('Unsupported native filter option.');
  if (options.ignoreCase !== undefined && typeof options.ignoreCase !== 'boolean') fail('ignoreCase must be boolean.');
  const lists = Object.fromEntries(allowed.filter(k => !['ignoreCase','minSize','maxSize'].includes(k)).map(k => [k,list(options[k],k)]));
  if (Object.values(lists).flat().reduce((n,text) => n+Buffer.byteLength(text),0) > MAX_TEXT) fail('Combined filter input exceeds 64 KiB.');
  for (const key of ['minSize','maxSize']) if (options[key] !== undefined && (!Number.isSafeInteger(options[key]) || options[key] < 0 || options[key] > 512*1024*1024)) fail('Size filters must be nonnegative bounded byte counts.');
  let files = [], directories = [], count = 0, compiled = 0;
  function append(target,include,pattern) { const glob = compileGlob(pattern,Boolean(options.ignoreCase)); compiled += glob.tokenCount; if (compiled > MAX_TOKENS) fail('Compiled filters exceed the token budget.'); target.push({ include,...glob }); }
  function add(include,pattern) {
    if (++count > MAX_RULES) fail('Filter rules exceed 256.');
    let directory = pattern.endsWith('/'), file = !directory;
    if (directory && !include) pattern += '**';
    if (pattern.includes('**')) directory = file = true;
    if (file) { append(files,include,pattern); if (include || pattern === '*') for (const derived of directoryPatterns(pattern)) if (derived !== '/') append(directories,include,derived); }
    if (directory) append(directories,include,pattern);
  }
  const reset = () => { files = []; directories = []; };
  function rule(text) { if (text === '!') return reset(); if (!/^[+-] /.test(text)) fail('Ordered filters must use + pattern, - pattern or !.'); add(text[0] === '+',text.slice(2)); }
  for (const pattern of lists.include) add(true,pattern);
  for (const text of lists.includeFrom) for (const pattern of lines(text)) add(true,pattern);
  for (const pattern of lists.exclude) add(false,pattern);
  for (const text of lists.excludeFrom) for (const pattern of lines(text)) add(false,pattern);
  for (const text of lists.filter) rule(text);
  for (const text of lists.filterFrom) for (const value of lines(text)) rule(value);
  if (lists.include.length || lists.includeFrom.length) add(false,'/**');
  let explicit = null;
  if (lists.filesFrom.length || lists.filesFromRaw.length || lists.filesFrom0.length) {
    if (files.length || directories.length || options.minSize !== undefined || options.maxSize !== undefined) fail('Pinned rclone refuses files-from combined with active filters.');
    explicit = new Set();
    for (const [kind,raw,nul] of [['filesFrom',false,false],['filesFromRaw',true,false],['filesFrom0',true,true]]) for (const text of lists[kind]) for (const name of lines(text,raw,nul)) {
      const normalized = name.replace(/^\/+|\/+$/g,''); if (normalized.length > 2048 || explicit.size >= 10000) fail('File list exceeds its bound.'); explicit.add(normalized);
    }
  }
  const selectedDirectories = new Set();
  if (explicit) for (const name of explicit) { const parts = name.split('/'); while (parts.length > 1) { parts.pop(); selectedDirectories.add(parts.join('/')); } }
  const select = (rules,remote,budget) => { for (const rule of rules) if (rule.match(remote,budget)) return rule.include; return true; };
  return {
    summary:{ filesFrom:explicit !== null,fileRules:files.map(({ pattern,include }) => ({ pattern,include })),directoryRules:directories.map(({ pattern,include }) => ({ pattern,include })),ignoreCase:Boolean(options.ignoreCase),minSize:options.minSize,maxSize:options.maxSize },
    includeDirectory(remote,budget) { return explicit ? selectedDirectories.has(remote):select(directories,remote+'/',budget); },
    includeFile(remote,size,budget) { if (explicit) return explicit.has(remote); if (options.minSize !== undefined && size < options.minSize || options.maxSize !== undefined && size > options.maxSize) return false; return select(files,remote,budget); },
  };
}
