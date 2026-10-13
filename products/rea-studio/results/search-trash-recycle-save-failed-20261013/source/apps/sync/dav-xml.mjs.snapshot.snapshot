export const xmlLimits = Object.freeze({bytes:2*1024*1024,nodes:50000,depth:32,attributes:32,text:32768});
const fail = () => { throw new Error('Unsupported, unsafe or malformed bounded WebDAV XML.'); };
function legal(text) { if (!text.isWellFormed() || /[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/.test(text)) fail(); return text; }
function entities(text) {
  return legal(text.replace(/&([^;]{1,32});|&/g,(all,name) => {
    const named = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}; if (Object.hasOwn(named,name)) return named[name];
    let point; if (/^#[0-9]+$/.test(name ?? '')) point = Number(name.slice(1)); else if (/^#x[0-9a-f]+$/i.test(name ?? '')) point = Number.parseInt(name.slice(2),16); else fail();
    if (!Number.isInteger(point) || point < 0 || point > 0x10ffff || point >= 0xd800 && point <= 0xdfff) fail(); return String.fromCodePoint(point);
  }));
}
export function parseXML(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > xmlLimits.bytes) fail();
  let text; try { text = legal(new TextDecoder('utf-8',{fatal:true}).decode(bytes)); } catch { fail(); }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) fail();
  let position = 0, count = 0, root; const stack = [], namePattern = '[A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?';
  function append(text) { if (stack.length) { const node = stack.at(-1); node.text += text; if (node.text.length > xmlLimits.text) fail(); } else if (text.trim()) fail(); }
  while (position < text.length) {
    if (text[position] !== '<') { let end = text.indexOf('<',position); if (end < 0) end = text.length; if(text.slice(position,end).includes(']]>'))fail();append(entities(text.slice(position,end))); position = end; continue; }
    if (text.startsWith('<!--',position)) { const end = text.indexOf('-->',position+4); if (end < 0 || text.slice(position+4,end).includes('--')) fail(); position = end+3; continue; }
    if (text.startsWith('<![CDATA[',position)) { const end = text.indexOf(']]>',position+9); if (end < 0) fail(); append(legal(text.slice(position+9,end))); position = end+3; continue; }
    if (text.startsWith('<?',position)) { const end = text.indexOf('?>',position+2); if (end < 0 || position !== 0 || !/^<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?\s*\?>$/i.test(text.slice(position,end+2))) fail(); position = end+2; continue; }
    let end = position+1, quote = null;
    for (; end < text.length; end++) { const c = text[end]; if (quote) { if (c === quote) quote = null; } else if (c === '"' || c === "'") quote = c; else if (c === '>') break; if (end-position > 16384) fail(); }
    if (end >= text.length || quote) fail(); const tag = text.slice(position+1,end); position = end+1;
    if (tag.startsWith('/')) { const closing = new RegExp('^/('+namePattern+')[ \\t\\r\\n]*$').exec(tag); if (!closing || !stack.length || closing[1] !== stack.at(-1).qname) fail(); stack.pop(); continue; }
    const match = new RegExp('^('+namePattern+')(?=[ \\t\\r\\n]|/|$)').exec(tag); if (!match) fail();
    const qname = match[1], selfClosing = tag.endsWith('/'), body = tag.slice(match[0].length).replace(/\/$/,''), attributes = Object.create(null); let offset = 0;
    while (offset < body.length) {
      const whitespace = /^[ \t\r\n]*/.exec(body.slice(offset))[0]; offset += whitespace.length; if (offset === body.length) break; if (!whitespace) fail();
      const attribute = new RegExp('^('+namePattern+')[ \\t\\r\\n]*=[ \\t\\r\\n]*(["\'])([\\s\\S]*?)\\2').exec(body.slice(offset)); if (!attribute || Object.hasOwn(attributes,attribute[1]) || Object.keys(attributes).length >= xmlLimits.attributes || attribute[3].includes('<')) fail();
      attributes[attribute[1]] = entities(attribute[3]); offset += attribute[0].length;
    }
    const scope = {...(stack.at(-1)?.scope ?? {xml:'http://www.w3.org/XML/1998/namespace'})};
    for (const [key,value] of Object.entries(attributes)) if (key === 'xmlns' || key.startsWith('xmlns:')) {const prefix=key==='xmlns'?'':key.slice(6);if(prefix==='xmlns' || value==='http://www.w3.org/2000/xmlns/' || prefix==='xml' && value!=='http://www.w3.org/XML/1998/namespace' || prefix!=='xml' && value==='http://www.w3.org/XML/1998/namespace' || prefix && !value)fail();scope[prefix]=value;}
    const expanded=new Set();for(const key of Object.keys(attributes)) {if(key==='xmlns' || key.startsWith('xmlns:'))continue;const parts=key.split(':'),prefix=parts.length===2?parts[0]:'',uri=prefix?scope[prefix]:'';if(prefix && !uri)fail();const name=uri+'#'+parts.at(-1);if(expanded.has(name))fail();expanded.add(name);}
    const parts = qname.split(':'), prefix = parts.length === 2 ? parts[0]:'', local = parts.at(-1); if (prefix==='xmlns' || prefix && !Object.hasOwn(scope,prefix)) fail();
    const node = {qname,local,namespace:scope[prefix] ?? '',scope,text:'',children:[]};
    if (++count > xmlLimits.nodes || stack.length >= xmlLimits.depth) fail();
    if (stack.length) stack.at(-1).children.push(node); else { if (root) fail(); root = node; }
    if (!selfClosing) stack.push(node);
  }
  if (!root || stack.length) fail(); return root;
}
const dav = (node,name) => node.namespace === 'DAV:' && node.local === name;
const child = (node,name) => node.children.filter(item => dav(item,name));
const one = (node,name) => { const values = child(node,name); if (values.length !== 1) fail(); return values[0]; };
const value = node => { if (node.children.length) fail(); return node.text; };
export function parseMultiStatus(bytes) {
  const root = parseXML(bytes); if (!dav(root,'multistatus')) fail(); const results = [];
  for (const response of child(root,'response')) {
    const href = value(one(response,'href')).trim(), properties = Object.create(null); if (!href) fail();
    for (const propstat of child(response,'propstat')) {
      const status = value(one(propstat,'status')).trim(), match = /^HTTP\/1\.[01] ([1-5][0-9]{2})(?: [^\r\n]*)?$/.exec(status); if (!match) fail();
      if (Number(match[1]) < 200 || Number(match[1]) >= 300) continue;
      for (const prop of one(propstat,'prop').children) {
        if (prop.namespace !== 'DAV:' || !['getcontentlength','getlastmodified','getetag','resourcetype'].includes(prop.local)) continue;
        const parsed = prop.local === 'resourcetype' ? prop.children.some(node => dav(node,'collection')):value(prop).trim();
        if (Object.hasOwn(properties,prop.local) && properties[prop.local] !== parsed) fail(); properties[prop.local] = parsed;
      }
    }
    if (!Object.hasOwn(properties,'resourcetype')) throw new Error('Incomplete or unsuccessful WebDAV resource metadata.');
    results.push({href,properties});
  }
  if (!results.length || results.length > 10001) fail(); return results;
}
