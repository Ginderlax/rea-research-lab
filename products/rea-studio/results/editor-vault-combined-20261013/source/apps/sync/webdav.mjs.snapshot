import http from 'node:http';
import https from 'node:https';
import { types } from 'node:util';
import { parseMultiStatus } from './dav-xml.mjs';
export const davLimits = Object.freeze({file:64*1024*1024,xml:2*1024*1024,path:2048,entries:10000,requestMilliseconds:30000,responseHeaders:16384,requestsPerScope:40064,sentFileBytesPerScope:512*1024*1024,sentMetadataBytesPerScope:32*1024*1024,receivedFileBytesPerScope:1024*1024*1024,receivedMetadataBytesPerScope:32*1024*1024});
function plain(value,allowed) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw new Error('Use plain bounded WebDAV settings.');
  const keys = Reflect.ownKeys(value); if (keys.length > allowed.length) throw new Error('Unsupported WebDAV setting.'); const result = {};
  for (const key of keys) { const descriptor = Object.getOwnPropertyDescriptor(value,key); if (typeof key !== 'string' || !allowed.includes(key) || !descriptor.enumerable || !Object.hasOwn(descriptor,'value')) throw new Error('Unsupported WebDAV setting.'); result[key] = descriptor.value; } return result;
}
export function remotePath(text,root = true) {
  if (typeof text !== 'string' || text.length > davLimits.path || !text.isWellFormed() || text.startsWith('/') || text.endsWith('/') || text.includes('\\') || /[\x00-\x1f\x7f]/.test(text) || !root && !text) throw new Error('Use a bounded canonical relative WebDAV path.');
  if (text) for (const part of text.split('/')) if (!part || ['.','..'].includes(part) || /[:<>"|?*]/.test(part) || /[. ]$/.test(part) || /%[0-9a-f]{2}/i.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) throw new Error('Unsupported portable WebDAV path.');
  return text;
}
function decodedPath(pathname) {
  if (!pathname.startsWith('/') || /%2f|%5c/i.test(pathname)) throw new Error('Ambiguous WebDAV href.');
  const parts = pathname.split('/').slice(1); if (parts.at(-1) === '') parts.pop();
  const text = parts.map(part => { try { return decodeURIComponent(part); } catch { throw new Error('Invalid WebDAV href encoding.'); } }).join('/'); remotePath(text); return parts.length ? text.split('/'):[];
}
export function connection(value) {
  const settings = plain(value,['endpoint','auth']);
  if (typeof settings.endpoint !== 'string' || settings.endpoint.length > 4096 || /[\x00-\x20\x7f\\]/.test(settings.endpoint) || /%2e|%2f|%5c/i.test(settings.endpoint)) throw new Error('Use a bounded canonical WebDAV endpoint URL.');
  let url; try { url = new URL(settings.endpoint); } catch { throw new Error('Invalid WebDAV endpoint.'); }
  if (url.username || url.password || url.search || url.hash || !['http:','https:'].includes(url.protocol)) throw new Error('WebDAV URL cannot contain credentials, query strings or fragments.');
  if (url.protocol === 'http:' && !['127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('Plain HTTP is permitted only for literal loopback fixture endpoints; use HTTPS otherwise.');
  const baseParts = decodedPath(url.pathname); url.pathname = '/'+baseParts.map(encodeURIComponent).join('/')+(baseParts.length ? '/':'');
  let authorization = null;
  if (settings.auth !== undefined) {
    const auth = plain(settings.auth,['type','username','password']);
    if (auth.type !== 'basic' || typeof auth.username !== 'string' || typeof auth.password !== 'string' || auth.username.length > 256 || auth.password.length > 4096 || !auth.username.isWellFormed() || !auth.password.isWellFormed() || /[:\x00-\x1f\x7f]/.test(auth.username) || /[\x00-\x1f\x7f]/.test(auth.password)) throw new Error('Only bounded request-scoped Basic authentication is supported.');
    authorization = 'Basic '+Buffer.from(auth.username+':'+auth.password,'utf8').toString('base64');
  }
  return {endpoint:url.href,baseParts,authorization};
}
const strong = text => typeof text === 'string' && /^"[\x21\x23-\x7e]{0,128}"$/.test(text);
function metadata(item,path) {
  const props = item.properties, collection = props.resourcetype, length = props.getcontentlength;
  if (!collection && (typeof length !== 'string' || !/^\d{1,12}$/.test(length) || Number(length) > davLimits.file)) throw new Error('Invalid or oversize WebDAV content length.');
  let modified = null;
  if (props.getlastmodified) { const parsed = Date.parse(props.getlastmodified); if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(props.getlastmodified) || !Number.isFinite(parsed) || new Date(parsed).toUTCString() !== props.getlastmodified) throw new Error('Unsupported WebDAV modification date; strict IMF-fixdate required.'); modified = parsed; }
  const etag = props.getetag ?? null; if (etag !== null && !(strong(etag) || /^W\/"[\x21\x23-\x7e]{0,128}"$/.test(etag))) throw new Error('Invalid bounded WebDAV ETag.');
  return {path,type:collection ? 'directory':'file',size:collection ? 0:Number(length),modifiedMs:modified,etag,strongETag:strong(etag)};
}
const properties = Buffer.from('<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/><d:getlastmodified/><d:getetag/></d:prop></d:propfind>');
export function createWebDAV(value) {
  const settings = connection(value), base = new URL(settings.endpoint), requests = new Set(); let authorization = settings.authorization, closed = false, requestBusy = false, requestCount = 0, sentFileBytes = 0, sentMetadataBytes = 0, receivedFileBytes = 0, receivedMetadataBytes = 0;
  settings.authorization = null;
  function urlFor(path,collection = false) { remotePath(path); const url = new URL(base.href); url.pathname += path.split('/').filter(Boolean).map(encodeURIComponent).join('/')+(collection && path ? '/':''); return url; }
  async function request(method,path,{collection = false,headers = {},body,allowed,limit = davLimits.xml} = {}) {
    if (closed || requestBusy) throw new Error('WebDAV request scope is closed or busy.'); const url = urlFor(path,collection); const sent=method==='PUT'?(sentFileBytes+=body?.length??0):(sentMetadataBytes+=body?.length??0),sendLimit=method==='PUT'?davLimits.sentFileBytesPerScope:davLimits.sentMetadataBytesPerScope;if(++requestCount>davLimits.requestsPerScope || sent>sendLimit)throw new Error('WebDAV request scope exceeds its aggregate request or upload budget.');requestBusy = true;
    return new Promise((resolve,reject) => {
      let settled = false, timer;
      const finish = (error,result) => { if (settled) return; settled = true; clearTimeout(timer); requests.delete(req); error ? reject(error):resolve(result); };
      const req = (url.protocol === 'https:' ? https:http).request(url,{method,agent:false,rejectUnauthorized:true,maxHeaderSize:davLimits.responseHeaders,headers:{Accept:'application/xml','Accept-Encoding':'identity',...(authorization ? {Authorization:authorization}:{}),...headers,...(body ? {'Content-Length':body.length}:{})}},res => {
        if (!allowed.includes(res.statusCode)) { res.destroy(); finish(new Error(`WebDAV ${method} returned HTTP ${res.statusCode}; redirects are not followed.`)); return; }
        if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') { res.destroy(); finish(new Error('Unsupported encoded WebDAV response.')); return; }
        const length = res.headers['content-length']; if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > limit)) { res.destroy(); finish(new Error('WebDAV response exceeds its bounded body limit.')); return; }
        const chunks = []; let size = 0;
        res.on('data',chunk => { size += chunk.length; const aggregate=limit===davLimits.file?(receivedFileBytes+=chunk.length):(receivedMetadataBytes+=chunk.length),aggregateLimit=limit===davLimits.file?davLimits.receivedFileBytesPerScope:davLimits.receivedMetadataBytesPerScope;if (size > limit || aggregate>aggregateLimit) { res.destroy(); finish(new Error('WebDAV response exceeds its bounded body or aggregate scope limit.')); } else chunks.push(chunk); });
        res.on('error',error => finish(error)); res.on('aborted',() => finish(new Error('WebDAV response was interrupted.')));
        res.on('end',() => finish(null,{status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks,size)}));
      });
      requests.add(req); timer = setTimeout(() => req.destroy(new Error('Bounded WebDAV request timed out.')),davLimits.requestMilliseconds); timer.unref();
      req.on('error',error => finish(error)); req.end(body);
    }).finally(()=>{requestBusy=false;});
  }
  function hrefPath(href,requestPath,collection) {
    if (href.length > 8192 || /[\x00-\x20\x7f\\]/.test(href) || /%2e|%2f|%5c/i.test(href)) throw new Error('Unsafe or ambiguous WebDAV href.');
    const url = new URL(href,urlFor(requestPath,collection)); if (url.origin !== base.origin || url.username || url.password || url.search || url.hash) throw new Error('WebDAV href escaped the requested endpoint.');
    const parts = decodedPath(url.pathname); if (settings.baseParts.some((part,index) => parts[index] !== part)) throw new Error('WebDAV href escaped the endpoint root.');
    return remotePath(parts.slice(settings.baseParts.length).join('/'));
  }
  async function props(path,collection,depth) {
    const response = await request('PROPFIND',path,{collection,headers:{Depth:String(depth),'Content-Type':'application/xml; charset=utf-8'},body:properties,allowed:[207,404]}); if (response.status === 404) return null;
    const entries = parseMultiStatus(response.bytes).map(item => { const name = hrefPath(item.href,path,collection); return metadata(item,name); });
    const seen = new Set(); for (const entry of entries) { if (seen.has(entry.path)) throw new Error('Duplicate WebDAV href.'); seen.add(entry.path); if (entry.path !== path && (depth !== 1 || !entry.path.startsWith(path ? path+'/':'') || entry.path.slice(path ? path.length+1:0).includes('/'))) throw new Error('WebDAV response escaped the requested depth/path.'); }
    const self = entries.find(entry => entry.path === path); if (!self || collection && self.type !== 'directory' || depth === 0 && entries.length !== 1) throw new Error('Incomplete WebDAV self metadata.'); return entries;
  }
  const api = {
    endpoint:settings.endpoint,
    async capabilities() {const response=await request('OPTIONS','',{collection:true,allowed:[200,204,405],limit:65536});if(response.status===405)return {declared:false,davClasses:[],methods:[]};const classes=String(response.headers.dav??'').split(',').map(x=>x.trim()).filter(x=>['1','2','3'].includes(x)),methods=String(response.headers.allow??'').split(',').map(x=>x.trim()).filter(x=>['OPTIONS','PROPFIND','GET','HEAD','PUT','MKCOL','DELETE'].includes(x));return {declared:classes.includes('1'),davClasses:[...new Set(classes)],methods:[...new Set(methods)],warning:'Declared capabilities do not prove strong ETag or conditional mutation correctness.'};},
    async list(path = '') { remotePath(path); const entries = await props(path,true,1); if (!entries) throw new Error('WebDAV directory not found.'); if (entries.length-1 > davLimits.entries) throw new Error('WebDAV list exceeds entry limit.'); return entries.filter(entry => entry.path !== path).sort((a,b) => Buffer.compare(Buffer.from(a.path),Buffer.from(b.path))); },
    async stat(path = '',{collection = false} = {}) { remotePath(path); const entries = await props(path,collection || !path,0); return entries?.[0] ?? null; },
    async read(path,{expected = null} = {}) { remotePath(path,false); if (expected) expected = condition(expected,'file',path); const response = await request('GET',path,{headers:expected ? {'If-Match':expected.etag}:{},allowed:[200],limit:davLimits.file}); if (expected && response.bytes.length !== expected.size) throw new Error('WebDAV read differs from expected content length.'); return response.bytes; },
    async write(path,bytes,{expected = null} = {}) { remotePath(path,false); if (types.isProxy(bytes) || !types.isUint8Array(bytes) || ![Uint8Array.prototype,Buffer.prototype].includes(Object.getPrototypeOf(bytes)) || bytes.byteLength > davLimits.file) throw new Error('WebDAV upload exceeds its bounded file limit.'); if (expected) expected = condition(expected,'file',path); const body = Buffer.from(bytes); await request('PUT',path,{headers:{'Content-Type':'application/octet-stream',...(expected ? {'If-Match':expected.etag}:{'If-None-Match':'*'})},body,allowed:[200,201,204]}); return api.stat(path); },
    async mkdir(path) { remotePath(path,false); const response = await request('MKCOL',path,{collection:true,allowed:[201,405]}); if (response.status === 405) { const item = await api.stat(path,{collection:true}); if (item?.type === 'directory') return item; throw new Error('Existing WebDAV path is not a collection.'); } return api.stat(path,{collection:true}); },
    async remove(path,{expected,collection = false} = {}) { remotePath(path,false); expected = condition(expected,collection ? 'directory':'file',path); if (collection && (await api.list(path)).length) throw new Error('Only empty WebDAV collections can be removed.'); await request('DELETE',path,{collection,headers:{'If-Match':expected.etag},allowed:[200,204]}); return {removed:true}; },
    close() { closed = true; authorization = null; for(const req of requests)req.destroy(new Error('WebDAV request scope is closed.'));requests.clear(); },
  };
  return api;
}
function condition(value,type,path) { const item = plain(value,['path','type','size','modifiedMs','etag','strongETag']); if (!strong(item.etag) || item.type !== type || item.path !== path || !Number.isSafeInteger(item.size) || item.size < 0 || item.size > davLimits.file) throw new Error('Conditional WebDAV operation requires matching strong bounded resource metadata.'); return item; }
