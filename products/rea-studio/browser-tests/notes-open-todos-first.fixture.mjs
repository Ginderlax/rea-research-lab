// Source-only prospective fixture. The separate bindings start UNBOUND and refuse
// execution. Existing 36 browser cases and their owned fixtures are unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {test as base, expect} from '@playwright/test';
assert.equal(process.platform, 'win32'); assert.equal(process.version, 'v24.16.0');
for (const [key,value] of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_JOB:'draft-recovery-real-chromium',GITHUB_EVENT_NAME:'push',REA_NOTES_SORT_SOURCE_ADMITTED:'true'})) assert.equal(process.env[key],value,key);
for(const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
const sourceEpoch='notes-open-todos-first-v1', studioRoot=path.resolve(import.meta.dirname,'..');
const identity=bytes=>({bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
const bindings=JSON.parse(await fs.readFile(new URL('./notes-open-todos-first.source-bindings.json',import.meta.url),'utf8'));
assert.equal(bindings.schema,'rea-notes-open-todos-first-browser-source-bindings/v1'); assert.equal(bindings.sourceEpoch,sourceEpoch);
assert.equal(bindings.executionAuthorized,true); assert.equal(bindings.parent,'cf418c439be76d78a703a2e265166ceeb5fc4070');
assert.equal(typeof bindings.branch,'string'); assert(/^[A-Za-z0-9/_-]+$/.test(bindings.branch)); assert.equal(process.env.GITHUB_REF,'refs/heads/'+bindings.branch);
assert.equal(bindings.runtimeSources.length,3); assert.equal(bindings.sharedRuntimeStaticSources.length,7);
assert.equal(bindings.fullClosureAdmitted,true); assert.equal(bindings.productAcceptancePreclaimed,false);
for(const row of [...bindings.runtimeSources,...bindings.sharedRuntimeStaticSources]){
  assert(row.path.startsWith('products/rea-studio/')); assert(!row.path.includes('..')); assert.equal(row.rawMode,'100644');
  assert.deepEqual(identity(await fs.readFile(path.join(studioRoot,row.path.slice('products/rea-studio/'.length)))),{bytes:row.bytes,sha256:row.sha256});
}
const {start}=await import('../server.mjs');
const root=page=>page.locator('#app-root > div');
const field=(page,name)=>root(page).getByLabel(name,{exact:true});
const button=(page,name)=>root(page).getByRole('button',{name,exact:true});
const list=page=>root(page).getByRole('heading',{level:3,name:/^\d+ notes$/}).locator('..');
const notice=page=>root(page).locator('[aria-label="List order status"]');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
async function bounded(operation,ms,label){let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),ms);})]);}finally{clearTimeout(timer);}}
export const test=base.extend({studio:async({page},use,info)=>{
  assert(/^[A-Za-z0-9_-]{1,200}$/.test(info.testId));assert.equal(info.retry,0);
  const browser=page.context().browser();assert(browser);assert.equal(browser.browserType().name(),'chromium');assert.equal(browser.version(),'156.0.8078.4');
  const evidence=await fs.realpath(process.env.REA_BROWSER_EVIDENCE),dataRoot=await fs.realpath(process.env.REA_BROWSER_DATA_ROOT);
  const dataDir=await fs.mkdtemp(path.join(dataRoot,'notes-order-case-'));
  const relative=path.relative(dataRoot,dataDir);assert(relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative));
  let host;try{host=await start({port:0,dataDir});}catch(error){await fs.rm(dataDir,{recursive:true,force:true});throw error;}
  const requests=[],responses=[],fixtureRequests=[],errors=[],observations=[],holds=[],injectedFailures=[],consoleErrors=[],tasks=new Set(),pending=new Set(),waiters=new Set();
  const owns=request=>request.url().startsWith(host.url+'/');
  function finish(request){if(!owns(request))return;pending.delete(request);if(!pending.size)for(const done of waiters)done();}
  page.on('request',request=>{if(!owns(request))return;pending.add(request);if(!request.url().startsWith(host.url+'/api/notes/'))return;assert(requests.length<120);requests.push({path:new URL(request.url()).pathname,input:request.postDataJSON()});});
  page.on('requestfinished',finish);
  page.on('requestfailed',request=>{finish(request);if(!owns(request))return;const pathname=new URL(request.url()).pathname,expected=injectedFailures.find(row=>!row.observed&&row.path===pathname&&row.used);if(expected){expected.observed=true;expected.failure=request.failure()?.errorText??'';}else errors.push({type:'unexpected-request-failure',path:pathname,failure:request.failure()?.errorText??''});});
  page.on('pageerror',error=>errors.push({type:'pageerror',message:error.message.slice(0,2000)}));
  page.on('console',message=>{if(message.type()!=='error')return;const row={message:message.text().slice(0,2000),url:message.location().url};if(row.url===host.url+'/favicon.ico'&&/404/.test(row.message))return;consoleErrors.push(row);});
  page.on('response',response=>{if(!response.url().startsWith(host.url+'/api/notes/'))return;const task=(async()=>{const bytes=await response.body();assert(bytes.length<=1024*1024);responses.push({path:new URL(response.url()).pathname,status:response.status(),input:response.request().postDataJSON(),body:identity(bytes)});if(!response.ok())errors.push({type:'unexpected-UI-HTTP-response',status:response.status(),url:response.url()});})().catch(error=>errors.push({type:'response-observer',message:String(error)}));tasks.add(task);task.finally(()=>tasks.delete(task));});
  async function settle(){let done;try{if(pending.size){const operation=new Promise(resolve=>{done=resolve;waiters.add(done);});if(!pending.size)done();await bounded(operation,7000,'Owned HTTP requests did not drain');}}finally{if(done)waiters.delete(done);}await bounded(Promise.all([...tasks]),7000,'Response observers did not drain');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
  async function raw(action,input={}){assert(fixtureRequests.length<80);const response=await page.request.post(host.url+'/api/notes/'+action,{headers:{'x-rea-token':host.token},data:input});const bytes=await response.body();assert(bytes.length<=1024*1024);const payload=JSON.parse(bytes);fixtureRequests.push({action,input,status:response.status(),body:identity(bytes)});return{status:response.status(),payload};}
  async function api(action,input={}){const row=await raw(action,input);assert.equal(row.status,200,action);return row.payload.result;}
  const state=()=>fs.readFile(path.join(dataDir,'notes/records/notes-state-v2.json'));
  const saves=()=>requests.filter(row=>row.path==='/api/notes/save');
  const s={page,url:host.url,api,raw,state,saves,settle,requests,responses,fixtureRequests,observations,injectedFailures};
  s.fields=async()=>({title:await field(page,'Note title').inputValue(),body:await field(page,'Markdown note').inputValue(),tags:await field(page,'Note tags').inputValue(),notebookId:await field(page,'Notebook').inputValue()});
  s.draft=async()=>{await button(page,'New to-do').click();await field(page,'Note title').fill('  unsaved order draft 🧪  ');await field(page,'Markdown note').fill('# Raw draft\nno implicit save');await field(page,'Note tags').fill(' work, work ');return s.fields();};
  s.visible=async result=>{await expect(list(page).getByRole('button')).toHaveText(result.notes.map(row=>row.title+' · '+row.notebook+' · '+row.tags.join(', ')));};
  s.result=async mode=>{const result=await api('list',{openTodosFirst:mode});assert.equal(result.openTodosFirst,mode);await s.visible(result);return result;};
  s.toggle=async mode=>{const change=page.waitForResponse(row=>row.url()===host.url+'/api/notes/list-order'),refresh=page.waitForResponse(row=>row.url()===host.url+'/api/notes/list'&&row.request().postDataJSON().openTodosFirst===mode);await field(page,'Open to-dos first').setChecked(mode);assert.equal((await change).status(),200);const response=await refresh;assert.equal(response.status(),200);const result=(await response.json()).result;await s.visible(result);await expect(field(page,'Open to-dos first')).toBeEnabled();await expect(notice(page)).toHaveText('List order saved for this workspace.');return result;};
  s.reload=async()=>{await settle();await page.reload();await expect(button(page,'Refresh recovery copies')).toBeEnabled();await expect(field(page,'Open to-dos first')).toBeEnabled();await settle();};
  s.failOnce=async action=>{const row={path:'/api/notes/'+action,used:false,observed:false,injectedBeforeHandler:true,responseFabricated:false};injectedFailures.push(row);await page.route(host.url+row.path,async route=>{if(row.used)return route.continue();row.used=true;await route.abort('failed');});return row;};
  s.hold=async mode=>{
    const entered=deferred(),released=deferred(),finished=deferred(),hold={used:false,entered:entered.promise,release:released.resolve,finished:finished.promise};holds.push(hold);
    await page.route(host.url+'/api/notes/list',async route=>{const input=route.request().postDataJSON();if(hold.used||input.openTodosFirst!==mode)return route.continue();hold.used=true;try{const actual=await route.fetch({timeout:15000}),bytes=await actual.body();assert.equal(actual.status(),200);assert(bytes.length<=1024*1024);const result=JSON.parse(bytes).result;const row={kind:'held-unchanged-actual-order-response',input,status:actual.status(),body:identity(bytes),ids:result.notes.map(note=>note.id),handlerMocked:false,responseRewritten:false};observations.push(row);entered.resolve(row);await released.promise;await route.fulfill({response:actual});}catch(error){errors.push({type:'held-response',message:String(error)});entered.reject(error);}finally{finished.resolve();}});return hold;
  };
  try{
    const open=await api('save',{title:'Old open task',body:'open',tags:['work'],newTodo:true});await new Promise(resolve=>setTimeout(resolve,5));
    let complete=await api('save',{title:'Completed task',body:'done',tags:['work'],newTodo:true});complete=(await api('todo-completed',{id:complete.id,revision:complete.revision,completed:true})).note;await new Promise(resolve=>setTimeout(resolve,5));
    const regular=await api('save',{title:'Newest ordinary note',body:'ordinary',tags:['work']});assert(open.updatedAt<complete.updatedAt&&complete.updatedAt<regular.updatedAt);
    s.seed={open:open.id,complete:complete.id,regular:regular.id};s.expectedOn=[open.id,regular.id,complete.id];s.expectedOff=[regular.id,complete.id,open.id];
    observations.push({kind:'owned-actual-HTTP-seed',ids:s.seed,updatedAt:[open.updatedAt,complete.updatedAt,regular.updatedAt],setupOnly:true});
    await page.goto(host.url+'/#notes');await expect(root(page).getByRole('heading',{name:'Local Notes',exact:true})).toBeVisible();await expect(button(page,'Refresh recovery copies')).toBeEnabled();await expect(field(page,'Open to-dos first')).toBeEnabled();await settle();await use(s);
  }finally{
    const cleanup={holdsFinished:false,requestsDrained:false,screenshotSaved:false,contextClosed:false,hostClosed:false,dataRemoved:false};
    async function step(name,operation){try{await bounded(operation(),7000,name+' cleanup deadline');cleanup[name]=true;}catch(error){errors.push({type:'cleanup',step:name,message:String(error).slice(0,2000)});}}
    for(const hold of holds)hold.release();await step('holdsFinished',()=>Promise.all(holds.filter(row=>row.used).map(row=>row.finished)));await step('requestsDrained',()=>settle());
    await step('screenshotSaved',async()=>{await fs.mkdir(path.join(evidence,'screenshots'),{recursive:true});await page.screenshot({path:path.join(evidence,'screenshots','order-'+info.testId+'.png'),fullPage:false});});
    let finalDisk=null;try{finalDisk=identity(await state());}catch(error){errors.push({type:'final-disk',message:String(error)});}await step('contextClosed',()=>page.context().close());await step('hostClosed',()=>host.close());
    if(cleanup.contextClosed&&cleanup.hostClosed)await step('dataRemoved',async()=>{const rel=path.relative(dataRoot,dataDir);assert(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel));assert(path.basename(dataDir).startsWith('notes-order-case-'));await fs.rm(dataDir,{recursive:true,force:true});});
    const allowedConsole=consoleErrors.filter(row=>injectedFailures.some(value=>value.observed&&row.url===host.url+value.path&&/net::ERR_FAILED/.test(row.message)));
    errors.push(...consoleErrors.filter(row=>!allowedConsole.includes(row)).map(row=>({type:'console',...row})));if(allowedConsole.length>injectedFailures.length)errors.push({type:'extra-console-errors',count:allowedConsole.length});
    const report={schema:'rea-notes-open-todos-first-real-browser-case/v1',sourceEpoch,sourceCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,title:info.title,testId:info.testId,retry:info.retry,statusAtFixtureClose:info.status??null,realBrowser:true,actualHTTP:true,browserName:browser.browserType().name(),browserVersion:browser.version(),requests,responses,fixtureRequests,injectedFailures,observations,errors,cleanup,pendingOwnedRequests:pending.size,NotesUISaveRequests:saves().length,screenshot:'screenshots/order-'+info.testId+'.png',finalDisk,originalProductExecutions:0,handlerResponsesRewritten:false,fullParity:false,superiority:false};
    await fs.writeFile(path.join(evidence,'order-case-'+info.testId+'.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    expect(errors).toEqual([]);expect(injectedFailures.every(row=>row.used&&row.observed)).toBe(true);expect(pending.size).toBe(0);expect(tasks.size).toBe(0);expect(Object.values(cleanup).every(Boolean)).toBe(true);
  }
}});
export{assert,expect,root,field,button,list,notice,bounded,identity};
