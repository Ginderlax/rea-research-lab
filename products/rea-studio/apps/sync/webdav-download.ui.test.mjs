// Semantic UI regression source. Real Chromium evidence is a separate hosted job.
import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {renderWebDAVDownload} from './client.mjs';
before(()=>{assert.equal(process.platform,'win32');assert.equal(process.version,'v24.16.0');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');});
class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.events=new Map();this.dataset={};this.value='';this.checked=false;this.textContent='';}
  append(...items){for(const item of items){this.children.push(item);if(this.tagName==='SELECT'&&this.children.length===1)this.value=item.value;}}
  replaceChildren(...items){this.children=[];this.append(...items);}
  addEventListener(name,fn){this.events.set(name,[...(this.events.get(name)??[]),fn]);}
  async dispatch(name){for(const fn of this.events.get(name)??[])await fn();}
  async click(){await this.dispatch('click');}
}
function fixture(api){const original=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};const root=new Element('div');renderWebDAVDownload(root,api);function find(id,current=root){if(current.dataset.testid===id)return current;for(const child of current.children){const found=find(id,child);if(found)return found;}}return {get:id=>find('dav-download-'+id),close(){globalThis.document=original;}};}
const plan={token:'owned-token',direction:'webdav-to-local',endpoint:'https://example.invalid/dav/',source:'remote',destination:'local/target',counts:{copy:1,replace:1,mkdir:0},operations:[{type:'copy',path:'file.txt',destination:{size:3}}],skipped:[],expiresAt:'2030-01-01T00:00:00Z'};
test('download UI previews, clears each request password and requires visible approval before fresh-credential apply',async()=>{
  const calls=[],ui=fixture(async(action,input)=>{calls.push({action,input:structuredClone(input)});if(action==='webdav-download-plan')return structuredClone(plan);if(action==='webdav-download-apply')return {completed:[{type:'copy',path:'file.txt'}],retainedAt:'.rea-sync-history/owned'};throw Error('Unexpected request.');});
  try{ui.get('username').value='owned-user';ui.get('password').value='preview-secret';await ui.get('preview').click();assert.equal(calls[0].input.mode,'copy');assert.equal(calls[0].input.auth.password,'preview-secret');assert.equal(ui.get('password').value,'');ui.get('password').value='must-clear-rejection';await ui.get('apply').click();assert.equal(calls.length,1);assert.equal(ui.get('password').value,'');assert.match(ui.get('result').textContent,/Approve the displayed/);assert.equal(ui.get('plan').children.length,0);ui.get('password').value='second-preview-secret';await ui.get('preview').click();ui.get('confirm').checked=true;ui.get('password').value='fresh-apply-secret';await ui.get('apply').click();assert.equal(calls[2].input.auth.password,'fresh-apply-secret');assert.equal(calls[2].input.confirm,true);assert.equal(ui.get('password').value,'');assert.match(ui.get('result').textContent,/1 files verified in local\/target/);assert.match(ui.get('result').textContent,/Recovery bytes retained/);assert.equal(ui.get('plan').children.length,0);await ui.get('apply').click();assert.equal(calls.length,3);}finally{ui.close();}
});
test('download endpoint, username and path edits invalidate displayed approval',async()=>{
  for(const name of ['endpoint','username','source','destination','comparison','filter']){let applications=0;const ui=fixture(async action=>{if(action==='webdav-download-plan')return structuredClone(plan);applications++;});try{await ui.get('preview').click();ui.get('confirm').checked=true;ui.get(name).value='changed';await ui.get(name).dispatch('input');ui.get('password').value='sensitive';await ui.get('apply').click();assert.equal(applications,0);assert.equal(ui.get('confirm').checked,false);assert.equal(ui.get('password').value,'');assert.equal(ui.get('plan').children.length,0);}finally{ui.close();}}
});
test('delayed preview cannot publish old settings and a busy click preserves current inputs without another request',async()=>{
  let resolve,calls=0;const pending=new Promise(done=>resolve=done),ui=fixture(async()=>{calls++;return pending;});
  try{ui.get('password').value='in-flight-secret';const first=ui.get('preview').click();await ui.get('apply').click();assert.equal(calls,1);assert.equal(ui.get('password').value,'in-flight-secret');assert.match(ui.get('result').textContent,/Wait for the current/);ui.get('destination').value='changed';await ui.get('destination').dispatch('input');resolve(structuredClone(plan));await first;assert.equal(ui.get('password').value,'');assert.equal(ui.get('plan').children.length,0);assert.match(ui.get('result').textContent,/Settings changed during preview/);}finally{ui.close();}
});
test('wrong-password preview errors and consumed partial apply errors clear secrets and expose actual server disclosure',async()=>{
  let failPreview=true,applications=0;const ui=fixture(async action=>{if(action==='webdav-download-plan'){if(failPreview)throw Error('WebDAV GET returned HTTP 401.');return structuredClone(plan);}applications++;throw Error('WebDAV download stopped after 1 verified local operations. The current local operation may have changed b.txt. Recovery bytes are retained in .rea-sync-history/owned.');});
  try{ui.get('password').value='wrong-secret';await ui.get('preview').click();assert.equal(ui.get('password').value,'');assert.match(ui.get('result').textContent,/HTTP 401/);failPreview=false;await ui.get('preview').click();ui.get('confirm').checked=true;ui.get('password').value='fresh-secret';await ui.get('apply').click();assert.equal(ui.get('password').value,'');assert.match(ui.get('result').textContent,/stopped after 1 verified/);assert.match(ui.get('result').textContent,/may have changed b\.txt/);assert.match(ui.get('result').textContent,/Recovery bytes/);await ui.get('apply').click();assert.equal(applications,1);}finally{ui.close();}
});
test('saved partial status displays the download direction, failure and recovery location',async()=>{
  const ui=fixture(async action=>{assert.equal(action,'webdav-status');return {lastResult:{direction:'webdav-to-local',status:'partial-failure',completedAt:'2030-01-01T00:00:00Z',retainedAt:'.rea-sync-history/owned',error:'Local publication may have changed file.txt.'}};});
  try{ui.get('password').value='clear-on-status';await ui.get('status').click();assert.equal(ui.get('password').value,'');assert.match(ui.get('result').textContent,/Last download: partial-failure/);assert.match(ui.get('result').textContent,/may have changed file\.txt/);assert.match(ui.get('result').textContent,/\.rea-sync-history/);}finally{ui.close();}
});
