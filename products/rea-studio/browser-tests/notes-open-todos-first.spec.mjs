// Prospective genuine Chromium + actual replacement HTTP observations. Transport
// failures are explicitly injected before the handler; no successful body is faked.
import {assert,expect,test,field,button,list,notice,bounded} from './notes-open-todos-first.fixture.mjs';
const ids=result=>result.notes.map(row=>row.id);
async function unchanged(s,before,draft=null){await s.settle();assert.deepEqual(await s.state(),before);assert.equal(s.saves().length,0);if(draft)assert.deepEqual(await s.fields(),draft);}

test('Open to-dos default first and explicit off then on survive real workspace reload without saving the dirty editor',async({studio:s})=>{
  const before=await s.state();await expect(field(s.page,'Open to-dos first')).toBeChecked();assert.deepEqual(ids(await s.result(true)),s.expectedOn);
  const draft=await s.draft();assert.deepEqual(ids(await s.toggle(false)),s.expectedOff);await unchanged(s,before,draft);
  await s.reload();await expect(field(s.page,'Open to-dos first')).not.toBeChecked();assert.deepEqual(ids(await s.result(false)),s.expectedOff);assert.equal((await s.api('list')).openTodosFirst,false);
  assert.deepEqual(ids(await s.toggle(true)),s.expectedOn);await s.reload();await expect(field(s.page,'Open to-dos first')).toBeChecked();assert.deepEqual(ids(await s.result(true)),s.expectedOn);assert.equal((await s.api('list')).openTodosFirst,true);
  s.observations.push({kind:'default-and-explicit-both-preferences-persisted-across-real-reload',default:true,explicitOff:true,explicitOn:true,NotesUISaveRequests:s.saves().length});await unchanged(s,before);
});

test('Invalid order payloads receive genuine HTTP400 and leave saved preference and note bytes unchanged',async({studio:s})=>{
  const before=await s.state();await s.toggle(false);const draft=await s.draft(),writeCount=s.requests.filter(row=>row.path==='/api/notes/list-order').length;
  for(const action of ['list-order','list'])for(const value of ['false','true',0,1,null,{},[]]){
    const row=await s.raw(action,{openTodosFirst:value});assert.equal(row.status,400);assert.equal(typeof row.payload.error,'string');assert.match(row.payload.error,/Choose whether open to-dos appear first/);
  }
  assert.equal((await s.api('list')).openTodosFirst,false);assert.equal(s.requests.filter(row=>row.path==='/api/notes/list-order').length,writeCount);await expect(field(s.page,'Open to-dos first')).not.toBeChecked();assert.deepEqual(ids(await s.result(false)),s.expectedOff);
  s.observations.push({kind:'actual14-invalid-HTTP400-options',actions:['list-order','list'],values:['false','true',0,1,null,{},[]],preferenceStill:false,fixtureHTTPRequestsSeparateFromUI:true});await unchanged(s,before,draft);
});

test('A real older first-order response released after a saved off selection cannot replace newer rows or dirty fields',async({studio:s})=>{
  const before=await s.state(),draft=await s.draft(),hold=await s.hold(true);
  try{
    await button(s.page,'Search').click();const old=await bounded(hold.entered,15000,'Actual old ordered response did not enter hold');assert.deepEqual(old.ids,s.expectedOn);
    const newer=await s.toggle(false);assert.deepEqual(ids(newer),s.expectedOff);assert.notDeepEqual(old.ids,ids(newer));
    hold.release();await bounded(hold.finished,7000,'Actual old ordered response did not finish');await s.settle();await s.visible(newer);await expect(field(s.page,'Open to-dos first')).not.toBeChecked();await expect(notice(s.page)).toHaveText('List order saved for this workspace.');
    s.observations.push({kind:'old-unchanged-actual-response-suppressed-after-new-order',oldIds:old.ids,newIds:ids(newer),oldBody:old.body,handlerMocked:false,responseRewritten:false});await unchanged(s,before,draft);
  }finally{hold.release();if(hold.used)await bounded(hold.finished,7000,'Owned held ordering route cleanup');}
});

test('One injected failed preference transport still shows the chosen actual read-only order without retry and reload checks saved default',async({studio:s})=>{
  const before=await s.state(),draft=await s.draft();await s.failOnce('list-order');const writes=s.requests.filter(row=>row.path==='/api/notes/list-order').length;
  await field(s.page,'Open to-dos first').uncheck();await expect(field(s.page,'Open to-dos first')).toBeEnabled();await expect(notice(s.page)).toHaveText('This order is shown for this view. Saving the preference could not be confirmed; reopen Notes to check.');
  await expect(field(s.page,'Open to-dos first')).not.toBeChecked();assert.deepEqual(ids(await s.result(false)),s.expectedOff);assert.equal(s.requests.filter(row=>row.path==='/api/notes/list-order').length-writes,1);assert.equal((await s.api('list')).openTodosFirst,true);await unchanged(s,before,draft);
  await s.reload();await expect(field(s.page,'Open to-dos first')).toBeChecked();assert.deepEqual(ids(await s.result(true)),s.expectedOn);
  s.observations.push({kind:'injected-write-transport-failure-actual-list-success',writeAttemptCount:1,writeRetried:false,injectedBeforeHandler:true,actualReadOnlyOffOrder:true,savedDefaultAfterReload:true});await unchanged(s,before);
});

test('Failed preference and refresh transports restore the last actually rendered checkbox and never claim the unrendered order',async({studio:s})=>{
  const before=await s.state(),draft=await s.draft();await s.failOnce('list-order');await s.failOnce('list');const writes=s.requests.filter(row=>row.path==='/api/notes/list-order').length,lists=s.requests.filter(row=>row.path==='/api/notes/list').length;
  await field(s.page,'Open to-dos first').uncheck();await expect(field(s.page,'Open to-dos first')).toBeEnabled();await expect(notice(s.page)).toHaveText('Could not save or refresh list order. Reopen Notes to check the saved preference.');await expect(field(s.page,'Open to-dos first')).toBeChecked();
  assert.equal(s.requests.filter(row=>row.path==='/api/notes/list-order').length-writes,1);assert.equal(s.requests.filter(row=>row.path==='/api/notes/list').length-lists,1);await s.visible(await s.api('list'));await unchanged(s,before,draft);
  s.observations.push({kind:'injected-write-plus-read-transport-failure',writeAttemptCount:1,refreshAttemptCount:1,lastRenderedModeRestored:true,unrenderedOrderClaimed:false,writeRetried:false,injectedBeforeHandler:true});
});

test('A confirmed preference write with failed list refresh reports its distinct outcome and reload reads the saved choice',async({studio:s})=>{
  const before=await s.state();await s.failOnce('list');const writes=s.requests.filter(row=>row.path==='/api/notes/list-order').length;
  await field(s.page,'Open to-dos first').uncheck();await expect(field(s.page,'Open to-dos first')).toBeEnabled();await expect(notice(s.page)).toHaveText('List order was saved, but the list could not be refreshed. Reopen Notes to reload it.');await expect(field(s.page,'Open to-dos first')).toBeChecked();
  assert.equal(s.requests.filter(row=>row.path==='/api/notes/list-order').length-writes,1);assert.equal((await s.api('list')).openTodosFirst,false);await s.visible(await s.api('list',{openTodosFirst:true}));await unchanged(s,before);
  await s.reload();await expect(field(s.page,'Open to-dos first')).not.toBeChecked();assert.deepEqual(ids(await s.result(false)),s.expectedOff);await unchanged(s,before);
  s.observations.push({kind:'confirmed-write-injected-list-failure',writeConfirmed:true,lastRenderedModeRestored:true,reloadedSavedMode:false,writeAttemptCount:1});
});
