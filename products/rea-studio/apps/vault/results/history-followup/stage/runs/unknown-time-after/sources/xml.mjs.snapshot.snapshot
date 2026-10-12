// Original bounded XML reader for KDBX. It deliberately has no DTD/entity loader.
const LIMIT = 8 * 1024 * 1024;
const name = /^[A-Za-z_][A-Za-z0-9_.:-]*/;
function valid(text) {
  for (const char of text) {
    const n = char.codePointAt(0);
    if (!(n === 9 || n === 10 || n === 13 || n >= 32 && n <= 0xD7FF || n >= 0xE000 && n <= 0xFFFD || n >= 0x10000 && n <= 0x10FFFF)) throw new Error('Invalid XML character.');
  }
  return text;
}
function entities(text) {
  return valid(text.replace(/&([^;]*);|&/g, (whole, token) => {
    const known = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (Object.hasOwn(known, token)) return known[token];
    if (/^#(?:[0-9]+|x[0-9a-fA-F]+)$/.test(token ?? '')) {
      const n = token[1] === 'x' ? parseInt(token.slice(2),16) : Number(token.slice(1));
      if (Number.isSafeInteger(n) && n <= 0x10FFFF) return String.fromCodePoint(n);
    }
    throw new Error('Unsupported XML entity.');
  }));
}
export function parseXml(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > LIMIT) throw new Error('XML exceeds the 8 MiB limit.');
  // XML 1.0 normalizes literal CRLF/CR before resolving character references.
  source = source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  valid(source); let i = 0, count = 0, root = null; const stack = [];
  const append = value => { if (stack.length) stack.at(-1).children.push(value); else if (typeof value !== 'string' || value.trim()) throw new Error('Unexpected XML content.'); };
  while (i < source.length) {
    if (source[i] !== '<') { const end = source.indexOf('<',i), next = end < 0 ? source.length : end; append(entities(source.slice(i,next))); i = next; continue; }
    if (source.startsWith('<!--',i)) { const end = source.indexOf('-->',i + 4); if (end < 0 || source.slice(i + 4,end).includes('--')) throw new Error('Invalid XML comment.'); i = end + 3; continue; }
    if (/^<\?xml\s/.test(source.slice(i)) && !root && !stack.length && i === 0) { const end = source.indexOf('?>',i + 5); if (end < 0) throw new Error('Invalid XML declaration.'); const declaration = source.slice(i,end); if (/encoding\s*=\s*["'](?!utf-8["'])/i.test(declaration)) throw new Error('Only UTF-8 XML is supported.'); i = end + 2; continue; }
    if (source.startsWith('<![CDATA[',i)) { const end = source.indexOf(']]>',i + 9); if (end < 0 || !stack.length) throw new Error('Invalid CDATA.'); append(source.slice(i + 9,end)); i = end + 3; continue; }
    if (source.startsWith('<!',i) || source.startsWith('<?',i)) throw new Error('DTD, external entities and processing instructions are unsupported.');
    if (source.startsWith('</',i)) { const match = /^<\/([A-Za-z_][A-Za-z0-9_.:-]*)\s*>/.exec(source.slice(i)); if (!match || stack.at(-1)?.name !== match[1]) throw new Error('Mismatched XML element.'); stack.pop(); i += match[0].length; continue; }
    i++; const match = name.exec(source.slice(i)); if (!match) throw new Error('Invalid XML name.'); i += match[0].length;
    const node = { name: match[0], attrs: Object.create(null), children: [] };
    if (++count > 100000 || stack.length >= 64) throw new Error('XML node/depth limit exceeded.');
    let closed = false;
    while (i < source.length) {
      const start = i; while (/\s/.test(source[i] ?? '') && i < source.length) i++;
      if (source.startsWith('/>',i)) { i += 2; closed = true; break; }
      if (source[i] === '>') { i++; break; }
      if (i === start) throw new Error('XML attributes require whitespace.');
      const key = name.exec(source.slice(i)); if (!key || Object.hasOwn(node.attrs,key[0])) throw new Error('Invalid or duplicate XML attribute.'); i += key[0].length;
      const attr = /^\s*=\s*(["'])([^]*?)\1/.exec(source.slice(i)); if (!attr || attr[2].includes('<')) throw new Error('Invalid XML attribute value.');
      node.attrs[key[0]] = entities(attr[2].replace(/[\t\n]/g,' ')); i += attr[0].length;
    }
    if (i > source.length || source[i - 1] !== '>') throw new Error('Truncated XML element.');
    if (stack.length) append(node); else { if (root) throw new Error('Multiple XML roots.'); root = node; }
    if (!closed) stack.push(node);
  }
  if (!root || stack.length) throw new Error('Incomplete XML document.');
  return root;
}
function escaped(value, attr = false) { let result = valid(String(value)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r/g,'&#xD;'); if (attr) result = result.replace(/"/g,'&quot;').replace(/\n/g,'&#xA;').replace(/\t/g,'&#x9;'); return result; }
export function serializeXml(node) {
  const render = n => typeof n === 'string' ? escaped(n) : `<${n.name}${Object.entries(n.attrs).map(([k,v]) => ` ${k}="${escaped(v,true)}"`).join('')}>${n.children.map(render).join('')}</${n.name}>`;
  const result = '<?xml version="1.0" encoding="utf-8"?>' + render(node);
  if (Buffer.byteLength(result) > LIMIT) throw new Error('XML exceeds the 8 MiB limit.'); return result;
}
export const nodes = (n, label) => n.children.filter(v => typeof v !== 'string' && (!label || v.name === label));
export function one(n, label, required = false) { const list = nodes(n,label); if (list.length > 1 || required && !list.length) throw new Error(`Invalid duplicate/missing ${label} element.`); return list[0]; }
export function text(n) { if (!n) return ''; if (nodes(n).length) throw new Error(`Unexpected nested ${n.name} content.`); return n.children.join(''); }
export const element = (name, content = [], attrs = {}) => ({ name, attrs: Object.assign(Object.create(null),attrs), children: Array.isArray(content) ? content : [String(content)] });
export function put(n, label, value, attrs) { let target = one(n,label); if (!target) { target = element(label); n.children.push(target); } target.children = [String(value)]; if (attrs) target.attrs = Object.assign(Object.create(null),attrs); return target; }
export function walk(n, callback) { callback(n); for (const child of nodes(n)) walk(child,callback); }
