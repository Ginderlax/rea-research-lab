// Authored source only. Execute solely in the admitted GitHub-hosted job.
// Every key mutation below uses the visible application controls. Owned API/file
// operations prepare fixtures and independently inspect the resulting repository.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {test as base,expect} from '@playwright/test';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
const {start}=await import('../server.mjs');
const evidence=await fs.realpath(process.env.REA_BROWSER_EVIDENCE),dataRoot=await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
const identity=bytes=>({bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
const secretA='synthetic-browser-key-access-2026',secretB='synthetic-browser-key-second-2026',secretC='synthetic-browser-key-new-2026';
const secretValues=[secretA,secretB,secretC,'must-not-be-discarded','synthetic-browser-wrong-password'];
const write=(name,value)=>fs.writeFile(path.join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const later=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
async function bounded(promise,ms,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label)),ms))]);}finally{clearTimeout(timer);}}
function assertNoSecrets(bytes){const text=Buffer.isBuffer(bytes)?bytes.toString('utf8'):JSON.stringify(bytes);for(const secret of secretValues)assert(!text.includes(secret),'A synthetic private password entered a response or saved metadata');}
async function repositoryFiles(root,{keys=false}={}){
  const rows={};async function walk(relative){const directory=path.join(root,relative);for(const child of await fs.readdir(directory,{withFileTypes:true})){const rel=relative?relative+'/'+child.name:child.name;assert(!child.isSymbolicLink());if(child.isDirectory()){if(['keys','locks','tmp'].includes(rel)&&!(keys&&rel==='keys'))continue;await walk(rel);}else{assert(child.isFile());const b=await fs.readFile(path.join(root,rel));rows[rel]=identity(b);}}}
  await walk('');return rows;
}
const test=base.extend({
  studio:async({page},use,info)=>{
    assert.equal(path.dirname(dataRoot),await fs.realpath(process.env.RUNNER_TEMP));
    const dataDir=await fs.mkdtemp(path.join(dataRoot,'case-'));let host=await start({port:0,dataDir});
    const errors=[],expectedAuxiliary404=[],expected400Paths=new Set(),observations=[],requests=[],held=[];
    const pending=new Set(),drainWaiters=new Set(),counts={started:0,finished:0,failed:0};
    const own=request=>request.url().startsWith(host.url+'/');
    function settle(request,kind){if(!own(request))return;pending.delete(request);counts[kind]++;if(!pending.size)for(const resolve of drainWaiters)resolve();}
    page.on('request',request=>{if(!own(request))return;pending.add(request);counts.started++;if(request.url().includes('/api/')){assert(requests.length<200);const input=request.postDataJSON();requests.push({method:request.method(),path:new URL(request.url()).pathname,inputKeys:input&&typeof input==='object'?Object.keys(input).sort():[],passwordBodiesRetained:false});}});
    page.on('requestfinished',r=>settle(r,'finished'));
    page.on('requestfailed',r=>{settle(r,'failed');if(own(r))errors.push({type:'requestfailed',path:new URL(r.url()).pathname,failure:r.failure()});});
    page.on('pageerror',e=>errors.push({type:'pageerror',name:e.name,message:e.message}));
    page.on('console',message=>{if(message.type()!=='error')return;const row={type:'console',text:message.text(),location:message.location()};if(row.location.url===host.url+'/favicon.ico'&&/404/.test(row.text))expectedAuxiliary404.push(row);else if([...expected400Paths].some(p=>row.location.url===host.url+p)&&/400/.test(row.text))observations.push({type:'expected-genuine-400-console',...row});else errors.push(row);});
    const native=()=>page.locator('section').filter({has:page.getByRole('heading',{name:'Encrypted restic repositories',exact:true})}).first();
    const field=label=>native().getByLabel(label,{exact:true});
    async function clear(){for(const label of ['Repository password','New repository password','Confirm new repository password'])await expect(field(label)).toHaveValue('');}
    async function access(password,insecure=false){await field('Access or create an empty-password repository (insecure)').setChecked(insecure);await field('Repository password').fill(password);}
    async function ui(action,label,status=200){const target='/api/backup/'+action;if(status===400)expected400Paths.add(target);const response=page.waitForResponse(r=>r.url()===host.url+target&&r.request().method()==='POST');await native().getByRole('button',{name:label,exact:true}).click();const actual=await response;const raw=await actual.body();assert.equal(actual.status(),status,raw.toString());assertNoSecrets(raw);const body=JSON.parse(raw);observations.push({type:'visible-key-operation',action,status,body:identity(raw)});await clear();return body.result??body;}
    async function api(action,input={},status=200){const response=await page.request.post(host.url+'/api/backup/'+action,{headers:{'X-REA-Token':host.token},data:input});const body=await response.body();assert.equal(response.status(),status,body.toString());assertNoSecrets(body);return JSON.parse(body).result??JSON.parse(body);}
    async function open(){await page.goto(host.url+'/#backup');await expect(native().getByRole('heading',{name:'Repository access keys',exact:true})).toBeVisible();await field('Restic repository folder').fill('native');}
    async function init(password=secretA,insecure=false){await open();await field('New repository format version (1 or 2)').fill('2');await access(password,insecure);return ui('nativeInit','Create encrypted repository');}
    async function newPassword(password,insecure=false){await field('New repository password').fill(password);await field('Confirm new repository password').fill(password);await field('Create an empty password (insecure)').setChecked(insecure);await field('New key user (blank uses operating-system user)').fill('Synthetic Browser User');await field('New key host (blank uses this machine)').fill('Synthetic Browser Host');}
    async function restart(){await page.goto('about:blank');await bounded(host.close(),5000,'Owned host restart close deadline');host=await start({port:0,dataDir});await open();observations.push({type:'owned-host-restart',sameDataDirectory:true});}
    const s={page,field,native,access,ui,api,open,init,newPassword,clear,restart,observations,requests,expected400Paths,dataDir,
      get url(){return host.url;},get repository(){return path.join(dataDir,'backup/workspace/native');},
      async holdList(){const entered=later(),released=later(),finished=later();let used=false;const pattern=host.url+'/api/backup/nativeKeyList';await page.route(pattern,async route=>{if(used)return route.continue();used=true;try{const actual=await route.fetch({timeout:30000});const bytes=await actual.body();assert.equal(actual.status(),200);assertNoSecrets(bytes);observations.push({type:'delay-after-genuine-host-response',status:actual.status(),body:identity(bytes),handlerMocked:false});entered.resolve(JSON.parse(bytes).result);await released.promise;await route.fulfill({response:actual});}catch(e){entered.reject(e);throw e;}finally{finished.resolve();}});const gate={entered:entered.promise,release:released.resolve,finished:finished.promise,used:()=>used};held.push(gate);return gate;}
    };
    try{await use(s);}finally{
      const cleanup={released:false,screenshot:false,drained:false,contextClosed:false,hostClosed:false,pending:null,counts};const failures=[];
      async function step(name,fn){try{await fn();cleanup[name]=true;}catch(e){failures.push({stage:name,name:e.name,message:e.message});}}
      await step('released',async()=>{for(const gate of held)gate.release();await bounded(Promise.all(held.filter(g=>g.used()).map(g=>g.finished)),5000,'Held actual responses did not finish');});
      await step('screenshot',async()=>{await fs.mkdir(path.join(evidence,'screenshots'),{recursive:true});if(!page.isClosed())await page.screenshot({path:path.join(evidence,'screenshots',info.testId+'.png'),fullPage:false});else throw Error('Page closed before evidence screenshot');});
      await step('drained',async()=>{if(pending.size){let resolve;const drained=new Promise(done=>{resolve=done;drainWaiters.add(done);});try{if(!pending.size)resolve();await bounded(drained,5000,'Owned browser requests did not drain');}finally{drainWaiters.delete(resolve);}}assert.equal(pending.size,0);});
      await step('contextClosed',()=>bounded(page.context().close(),5000,'Owned browser context close deadline'));
      await step('hostClosed',()=>bounded(host.close(),5000,'Owned host close deadline'));cleanup.pending=pending.size;
      await write('case-'+info.testId+'.json',{schema:'rea-backup-native-keys-browser-case/v1',title:info.title,testId:info.testId,retry:info.retry,statusAtFixtureClose:info.status,realBrowser:true,genuineHTTP:true,originalProductExecutions:0,syntheticFixtureOnly:true,passwordBodiesRetained:false,observations,requests,expectedAuxiliary404,errors,cleanup,failures});
      expect(errors).toEqual([]);expect(failures).toEqual([]);expect(cleanup.drained&&cleanup.contextClosed&&cleanup.hostClosed&&cleanup.pending===0).toBe(true);
    }
  }
});
test.beforeAll(async({browser})=>{expect(browser.version()).toBe('156.0.8078.4');const row={schema:'rea-backup-native-keys-real-browser/v1',browser:'chromium',version:browser.version(),retries:0,workers:1,originalProductExecutions:0};await write('browser-worker-'+process.pid+'.json',row);});

test('visible key lifecycle preserves a native snapshot through password replacement, removal and restart',async({studio:s})=>{
  const first=await s.init();await s.api('putFile',{path:'source/hello.txt',content:'Owned browser key lifecycle — exact restore bytes'});await s.field('Source folder').fill('source');await s.access(secretA);const snapshot=await s.ui('nativeSnapshot','Save restic snapshot');const baseline=await repositoryFiles(s.repository);
  await s.access(secretA);await s.newPassword(secretB);const second=await s.ui('nativeKeyAdd','Add repository key');expect(second.oldKeyRemoved).toBe(false);await s.access(secretB);const list=await s.ui('nativeKeyList','List repository keys');expect(list.keys).toHaveLength(2);expect(list.currentKeyID).toBe(second.keyID);await expect(s.native()).toContainText('* Current key');
  await s.access(secretB);await s.newPassword(secretC);await s.field('Confirm replacement of the key used by this password').check();const changed=await s.ui('nativeKeyPasswd','Change repository password');expect(changed.previousKeyID).toBe(second.keyID);expect(changed.oldKeyRemoved).toBe(true);await s.api('nativeInfo',{repository:'native',password:secretB},400);await s.api('nativeInfo',{repository:'native',password:secretA});
  await s.access(secretC);await s.field('Key ID or unique prefix to remove').fill(first.keyID);await s.field('Confirm removal of this other key').check();const removed=await s.ui('nativeKeyRemove','Remove selected other key');expect(removed.removedKeyID).toBe(first.keyID);expect(removed.keyRemoved).toBe(true);expect(removed.postRemovalVerified).toBe(true);expect(await repositoryFiles(s.repository)).toEqual(baseline);
  await s.restart();await s.access(secretC);const after=await s.ui('nativeKeyList','List repository keys');expect(after.keys.map(k=>k.id)).toEqual([changed.keyID]);await s.field('Restic snapshot ID').fill(snapshot.id);await s.access(secretC);expect((await s.ui('nativeCheck','Verify restic snapshot')).verified).toBe(true);await s.field('New restore folder').fill('restored');await s.field('Confirm restore').check();await s.access(secretC);await s.ui('nativeRestore','Restore restic snapshot');expect(await fs.readFile(path.join(s.dataDir,'backup/workspace/restored/source/hello.txt'),'utf8')).toBe('Owned browser key lifecycle — exact restore bytes');
  const key=await fs.readFile(path.join(s.repository,'keys',changed.keyID));assertNoSecrets(key);s.observations.push({type:'independent-native-data-check',nonKeyRepositoryUnchanged:true,restoredExactBytes:true,keyID:changed.keyID,key:identity(key)});
});

test('rejected key forms clear secrets and a wrong access password returns the genuine host error',async({studio:s})=>{
  await s.init();const before=await repositoryFiles(s.repository,{keys:true}),requestsBefore=()=>s.requests.filter(r=>r.path.endsWith('/nativeKeyAdd')||r.path.endsWith('/nativeKeyPasswd')).length;
  await s.access(secretA);await s.field('New repository password').fill(secretB);await s.field('Confirm new repository password').fill(secretC);const count=requestsBefore();await s.native().getByRole('button',{name:'Add repository key',exact:true}).click();await expect(s.page.locator('.status.error')).toHaveCount(0);await s.clear();expect(requestsBefore()).toBe(count);await expect(s.page.locator('p.status').first()).toContainText('must match');
  await s.access(secretA);await s.newPassword(secretB);await s.native().getByRole('button',{name:'Change repository password',exact:true}).click();await s.clear();expect(requestsBefore()).toBe(count);await expect(s.page.locator('p.status').first()).toContainText('Confirm password replacement');
  await s.access('synthetic-browser-wrong-password');const body=await s.ui('nativeKeyList','List repository keys',400);expect(typeof body.error).toBe('string');expect(await repositoryFiles(s.repository,{keys:true})).toEqual(before);
});

test('empty-password controls require explicit opt-in and never discard a nonempty secret',async({studio:s})=>{
  await s.open();await s.access('');const refused=await s.ui('nativeInit','Create encrypted repository',400);expect(typeof refused.error).toBe('string');await s.access('',true);const initial=await s.ui('nativeInit','Create encrypted repository');
  await s.access('must-not-be-discarded',true);const calls=s.requests.length;await s.native().getByRole('button',{name:'List repository keys',exact:true}).click();await s.clear();expect(s.requests.length).toBe(calls);await expect(s.page.locator('p.status').first()).toContainText('empty password field');
  await s.access('',true);await s.newPassword('must-not-be-discarded',true);await s.native().getByRole('button',{name:'Add repository key',exact:true}).click();await s.clear();expect(s.requests.length).toBe(calls);await expect(s.page.locator('p.status').first()).toContainText('empty new password fields');
  await s.access('',true);await s.newPassword(secretB);const second=await s.ui('nativeKeyAdd','Add repository key');await s.access(secretB);await s.newPassword('',true);await s.field('Confirm replacement of the key used by this password').check();const changed=await s.ui('nativeKeyPasswd','Change repository password');expect(changed.previousKeyID).toBe(second.keyID);await s.access('',true);const listed=await s.ui('nativeKeyList','List repository keys');expect(listed.keys.map(k=>k.id).sort()).toEqual([initial.keyID,changed.keyID].sort());await s.access('');await s.ui('nativeKeyList','List repository keys',400);
});

test('a held genuine key-list response blocks another mutation until the active request completes',async({studio:s})=>{
  await s.init();const before=await repositoryFiles(s.repository,{keys:true});await s.access(secretA);const gate=await s.holdList();const listing=s.native().getByRole('button',{name:'List repository keys',exact:true}).click();await listing;await bounded(gate.entered,30000,'Actual host key list was not reached');await s.newPassword(secretB);const mutationsBefore=s.requests.filter(r=>r.path.endsWith('/nativeKeyAdd')).length;await s.native().getByRole('button',{name:'Add repository key',exact:true}).click();await expect(s.page.locator('p.status').first()).toContainText('Wait for the current repository operation');expect(s.requests.filter(r=>r.path.endsWith('/nativeKeyAdd')).length).toBe(mutationsBefore);await expect(s.field('Repository password')).toHaveValue(secretA);await expect(s.field('New repository password')).toHaveValue(secretB);gate.release();await bounded(gate.finished,5000,'Held genuine response did not finish');await s.clear();expect(await repositoryFiles(s.repository,{keys:true})).toEqual(before);
});

test('an unrelated damaged key is warned about and can be removed through visible controls',async({studio:s})=>{
  await s.init();const baseline=await repositoryFiles(s.repository),damaged=Buffer.from('{owned malformed key metadata'),id=identity(damaged).sha256;await fs.writeFile(path.join(s.repository,'keys',id),damaged,{flag:'wx'});await s.access(secretA);const listing=await s.ui('nativeKeyList','List repository keys');expect(listing.keys).toHaveLength(1);expect(listing.keyWarnings.some(k=>k.id===id)).toBe(true);await expect(s.native()).toContainText('Could not display key '+id);await s.native().getByRole('button',{name:'Select this other key',exact:true}).click();await expect(s.field('Key ID or unique prefix to remove')).toHaveValue(id);await s.field('Confirm removal of this other key').check();await s.access(secretA);const removed=await s.ui('nativeKeyRemove','Remove selected other key');expect(removed.removedKeyID).toBe(id);expect(removed.postRemovalVerified).toBe(true);expect(await repositoryFiles(s.repository)).toEqual(baseline);expect((await fs.readdir(path.join(s.repository,'keys'))).length).toBe(1);
});
