// Eleven fixed historical source carriers only. No directory-wide exception.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep, posix } from 'node:path';
const MANIFEST = { path: 'products/rea-studio/results/historical-carrier-delivery-20261015/preservation-manifest.json', bytes: 47735, sha256: '0b31135d5091b8cbf64ce4d21475f3e1c32605cccccfb3eb3d4b05c858105f1e' };
const sha = b => createHash('sha256').update(b).digest('hex');
function safe(p) { assert(typeof p==='string'&&p.length>0&&p.length<=4096&&!/[\\:\x00-\x1f\x7f]/.test(p)&&!p.startsWith('/'));assert(p.split('/').every(s=>s&&s!=='.'&&s!=='..'));return p; }
function id(r) { assert(r&&Number.isSafeInteger(r.bytes)&&r.bytes>=0&&r.bytes<=600*1024&&/^[0-9a-f]{64}$/.test(r.sha256));return{bytes:r.bytes,sha256:r.sha256}; }
function same(a,b) { assert.deepEqual(id(a),id(b)); }

export function createHistoricalCarrierPolicy(rawRead) {
  assert.equal(typeof rawRead,'function');const seen=new Map();let bytes=0;
  function read(p,expected){safe(p);const b=rawRead(p);assert(Buffer.isBuffer(b)&&b.length<=600*1024);const observed={bytes:b.length,sha256:sha(b)};same(observed,expected);if(seen.has(p))same(observed,seen.get(p));else{seen.set(p,observed);bytes+=b.length;assert(seen.size<=16&&bytes<=2*1024*1024,'Fixed historical-carrier policy read budget');}return b;}
  const m=JSON.parse(read(MANIFEST.path,MANIFEST));assert.equal(m.schema,'rea-historical-carrier-delivery-transition/v1');assert.equal(m.sourceOnly,true);assert.equal(m.genericDirectoryException,false);assert.equal(m.historicalReceiptsRewritten,false);assert.equal(m.auditCoverageComplete,false);assert.equal(m.restoredCarriers.length,80);assert.equal(m.exceptions.length,11);assert.equal(m.declaringManifests.length,3);
  const authorities=new Map();for(const spec of m.declaringManifests){safe(spec.path);id(spec);assert(!authorities.has(spec.path));authorities.set(spec.path,spec);}
  const originals=new Map(),allowed=new Map();
  for(const row of m.exceptions){safe(row.path);safe(row.declaringManifest);safe(row.declaredPath);id(row);assert(row.path.endsWith('.snapshot'));assert(!allowed.has(row.path));
    const spec=authorities.get(row.declaringManifest);assert(spec);assert.equal(spec.field,'snapshots');assert.equal(spec.pointer,'path');assert.equal(spec.base,'prefix');
    if(!originals.has(spec.path))originals.set(spec.path,JSON.parse(read(spec.path,spec)));
    const original=originals.get(spec.path),matches=original.snapshots.filter(r=>r.path===row.declaredPath);assert.equal(matches.length,1);same(matches[0],row);assert.equal(posix.dirname(spec.path)+'/'+row.declaredPath,row.path);
    const restored=m.restoredCarriers.filter(r=>r.path===row.path);assert.equal(restored.length,1);same(restored[0],row);assert.equal(restored[0].declaringManifest,row.declaringManifest);
    read(row.path,row);allowed.set(row.path,row);
  }
  assert.equal(originals.size,2);assert.equal([...allowed.keys()].filter(p=>p.split('/').includes('.local')).length,10);assert.equal([...allowed.keys()].filter(p=>p.split('/').includes('node_modules')).length,1);
  return{
    allows(row){safe(row.path);const expected=allowed.get(row.path);if(!expected)return false;same(row,expected);return true;},
    summary(){for(const[p,r]of seen)read(p,r);return{sourceOnly:true,exactHistoricalCarrierExceptions:11,originalDeclaringManifestsAuthenticated:2,mandatoryCarrierPayloads:11,knownRestoredCarriers:80,auditCoverageComplete:false,genericDirectoryException:false,historicalReceiptsRewritten:false,applicationExecutions:0,authenticatedFiles:seen.size,authenticatedBytes:bytes};},
  };
}
export function createHistoricalCarrierPolicyFromRoot(root) {
  const base=realpathSync(resolve(root));return createHistoricalCarrierPolicy(p=>{let at=base;for(const s of safe(p).split('/')){at=resolve(at,s);assert(!lstatSync(at).isSymbolicLink(),'Node-reported link in fixed historical proof path');}const real=realpathSync(at),rel=relative(base,real);assert(rel&&rel!=='..'&&!rel.startsWith('..'+sep)&&!rel.startsWith(sep)&&!isAbsolute(rel));const st=lstatSync(at);assert(st.isFile()&&st.size<=600*1024);const b=readFileSync(at);assert.equal(b.length,st.size);return b;});
}
