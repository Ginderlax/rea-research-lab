import http from 'node:http';
import { createHash } from 'node:crypto';
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export async function fixtureServer({seed = {},auth = null,prefix = '/dav/'} = {}) {
  const entries = new Map(), requests = [], failures = new Map(); let version = 0;
  const time = 'Thu, 01 Oct 2026 00:00:00 GMT';
  function create(name,bytes = null) { const old = entries.get(name); entries.set(name,{bytes:bytes === null ? null:Buffer.from(bytes),etag:`"fixture-${++version}"`,modified:time}); if (old?.bytes === null && bytes !== null) throw Error('Fixture type collision.'); }
  create('');
  function mkdir(name) { const parts = name.split('/'); for (let i = 1; i <= parts.length; i++) { const part = parts.slice(0,i).join('/'); if (!entries.has(part)) create(part); } }
  function put(name,bytes) { const parent = name.includes('/') ? name.slice(0,name.lastIndexOf('/')):''; mkdir(parent); create(name,bytes); touch(parent); }
  function touch(name) { const item = entries.get(name); if (item) item.etag = `"fixture-${++version}"`; }
  for (const [name,value] of Object.entries(seed)) value === null ? mkdir(name):put(name,value);
  function xml(names) {
    return '<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:" xmlns:x="urn:fixture">'+names.map(name => {
      const item = entries.get(name), href = prefix+name.split('/').filter(Boolean).map(encodeURIComponent).join('/')+(item.bytes === null && name ? '/':'');
      return `<d:response><d:href>${escape(href)}</d:href><d:propstat><d:prop><d:resourcetype>${item.bytes === null ? '<d:collection/>':''}</d:resourcetype><d:getcontentlength>${item.bytes?.length ?? 0}</d:getcontentlength><d:getlastmodified>${time}</d:getlastmodified><d:getetag>${escape(item.etag)}</d:getetag><x:retained>ignored fixture metadata</x:retained></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat><d:propstat><d:prop><d:quota-used-bytes/></d:prop><d:status>HTTP/1.1 404 Not Found</d:status></d:propstat></d:response>`;
    }).join('')+'</d:multistatus>';
  }
  const server = http.createServer((req,res) => { serve(req,res).catch(()=>{if(res.headersSent)res.destroy();else{res.writeHead(500);res.end();}}); });
  async function serve(req,res) {
    const record = {method:req.method,path:req.url,depth:req.headers.depth,ifMatch:req.headers['if-match'],ifNoneMatch:req.headers['if-none-match'],authorizationPresent:Boolean(req.headers.authorization)}; requests.push(record);
    function reply(status,body = '',headers = {}) { record.status = status; res.writeHead(status,headers); res.end(body); }
    if (auth && req.headers.authorization !== 'Basic '+Buffer.from(auth.username+':'+auth.password).toString('base64')) return reply(401,'',{ 'WWW-Authenticate':'Basic realm="synthetic-fixture", charset="UTF-8"' });
    let name; try { const url = new URL(req.url,'http://fixture.invalid'); if (!url.pathname.startsWith(prefix) || url.search || url.hash) return reply(404); name = url.pathname.slice(prefix.length).split('/').map(decodeURIComponent).join('/').replace(/\/$/,''); if (name.split('/').some(part => ['.','..'].includes(part) || part.includes('\\'))) return reply(400); } catch { return reply(400); }
    const failure = failures.get(req.method+' '+name); if (failure) { if (failure.once) failures.delete(req.method+' '+name); if (failure.run) return failure.run(req,res,record); return reply(failure.status,failure.body ?? '',failure.headers ?? {}); }
    const item = entries.get(name), parent = name.includes('/') ? name.slice(0,name.lastIndexOf('/')):'';
    if (req.headers['if-match'] && (!item || req.headers['if-match'] !== item.etag)) return reply(412);
    if (req.headers['if-none-match'] === '*' && item) return reply(412);
    if (req.method === 'OPTIONS') return reply(200,'',{DAV:'1','Allow':'OPTIONS, PROPFIND, GET, PUT, MKCOL, DELETE'});
    if (req.method === 'PROPFIND') {
      if (!item) return reply(404); const depth = req.headers.depth ?? 'infinity'; if (!['0','1'].includes(depth)) return reply(403);
      const names = [name]; if (depth === '1' && item.bytes === null) for (const key of entries.keys()) if (key !== name && key.startsWith(name ? name+'/':'') && !key.slice(name ? name.length+1:0).includes('/')) names.push(key);
      return reply(207,xml(names),{'Content-Type':'application/xml; charset=utf-8'});
    }
    if (req.method === 'GET' || req.method === 'HEAD') { if (!item || item.bytes === null) return reply(404); return reply(200,req.method === 'HEAD' ? '':item.bytes,{'Content-Length':item.bytes.length,'Content-Type':'application/octet-stream','Last-Modified':item.modified,ETag:item.etag}); }
    if (req.method === 'MKCOL') { if (item) return reply(405); if (!entries.has(parent) || entries.get(parent).bytes !== null) return reply(409); create(name); touch(parent); return reply(201); }
    if (req.method === 'PUT') {
      if (!entries.has(parent) || entries.get(parent).bytes !== null || item?.bytes === null) return reply(409);
      let size = 0; const chunks = []; for await (const chunk of req) { size += chunk.length; if (size > 64*1024*1024) return reply(413); chunks.push(chunk); } create(name,Buffer.concat(chunks,size)); touch(parent); return reply(item ? 204:201,'',{ETag:entries.get(name).etag});
    }
    if (req.method === 'DELETE') { if (!item || !name) return reply(404); for (const key of [...entries.keys()]) if (key === name || key.startsWith(name+'/')) entries.delete(key); touch(parent); return reply(204); }
    return reply(405);
  }
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve)); const address = server.address(), endpoint = `http://127.0.0.1:${address.port}${prefix}`;
  return {endpoint,entries,requests,failures,put,mkdir,xml,reset(values = seed) { entries.clear(); version = 0; create(''); for (const [name,value] of Object.entries(values)) value === null ? mkdir(name):put(name,value); requests.length = 0; failures.clear(); },snapshot() { return Object.fromEntries([...entries].sort(([a],[b]) => a.localeCompare(b)).map(([name,item]) => [name,item.bytes === null ? {type:'directory'}:{type:'file',size:item.bytes.length,sha256:createHash('sha256').update(item.bytes).digest('hex')}])); },async close() { server.closeAllConnections(); await new Promise((resolve,reject) => server.close(error => error ? reject(error):resolve())); }};
}
