// Authored test source only. A separately reviewed source-admission workflow
// must admit this module and all imports on a real supported hosted runner.
import test from 'node:test';
import assert from 'node:assert/strict';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_ENVIRONMENT!=='github-hosted'||process.env.RUNNER_OS!=='Windows'||process.env.GITHUB_REPOSITORY!=='Ginderlax/rea-research-lab'||process.env.REA_NOTES_SORT_SOURCE_ADMITTED!=='true')throw new Error('Source-admitted hosted Notes verification required.');
const {orderTodoNotes}=await import('./core.mjs');
const {handle}=await import('./server.mjs');
const make=(id,time,todo)=>({id,title:id,body:'retained',tags:[],notebook:'Notes',updatedAt:new Date(time).toISOString(),...(todo?{todo}:{})});
const mixed=()=>[make('old-open',1,{isTodo:true,due:123,completed:0}),make('new-note',4),make('completed',3,{isTodo:true,due:123,completed:2}),make('new-open',2,{isTodo:true,due:0,completed:0})];
test('open to-dos lead without changing ordinary updated-time order or input ownership',()=>{
  const rows=mixed(),before=structuredClone(rows);
  assert.deepEqual(orderTodoNotes(rows).map(n=>n.id),['new-open','old-open','new-note','completed']);
  assert.deepEqual(orderTodoNotes(rows,false).map(n=>n.id),['new-note','completed','new-open','old-open']);
  assert.deepEqual(rows,before);assert.notEqual(orderTodoNotes(rows),rows);
});
test('equal-time order remains stable and imported to-do metadata has the same partition',()=>{
  const rows=[make('regular',1),{...make('imported-open',1),joplin:{props:{is_todo:'1',todo_due:'1000',todo_completed:'0'}}},make('local-open',1,{isTodo:true,due:0,completed:0}),make('done',1,{isTodo:true,due:0,completed:1})];
  assert.deepEqual(orderTodoNotes(rows,true).map(n=>n.id),['imported-open','local-open','regular','done']);
  assert.deepEqual(orderTodoNotes(rows,false).map(n=>n.id),rows.map(n=>n.id));
  assert.deepEqual(orderTodoNotes([],true),[]);assert.equal(orderTodoNotes([rows[0]])[0],rows[0]);
});
test('nonboolean ordering options are refused instead of coercing strings',()=>{
  for(const value of ['false','true',0,1,null,{},[]])assert.throws(()=>orderTodoNotes([],value),/Choose whether/);
});
function memory(initial=[]){const data=new Map(initial),writes=[];return{data,writes,async get(k,fallback){return data.has(k)?structuredClone(data.get(k)):structuredClone(fallback);},async set(k,v){writes.push(k);data.set(k,structuredClone(v));},async list(prefix){return [...data.keys()].filter(k=>k.startsWith(prefix));}};}
async function fixture(){
  const store=memory(),call=(action,input={})=>handle({action,input,store});
  const regular=await call('save',{title:'regular',body:'body',notebook:'Notes',tags:[]});
  const open=await call('save',{title:'open',body:'body',notebook:'Notes',tags:[],newTodo:true});
  const completed=await call('save',{title:'completed',body:'body',notebook:'Notes',tags:[],newTodo:true});
  await call('todo-completed',{id:completed.id,revision:completed.revision,completed:true});
  const state=store.data.get('notes-state-v2');state.notes[regular.id].updatedAt=new Date(3000).toISOString();state.notes[completed.id].updatedAt=new Date(2000).toISOString();state.notes[open.id].updatedAt=new Date(1000).toISOString();
  return{store,call,regular,open,completed};
}
test('workspace preference survives a new store instance while listing never mutates notes',async()=>{
  const {store,call,regular,open,completed}=await fixture(),before=structuredClone(store.data.get('notes-state-v2')),writes=store.writes.length;
  const first=await call('list');assert.equal(first.openTodosFirst,true);assert.deepEqual(first.notes.map(n=>n.id),[open.id,regular.id,completed.id]);assert.equal(store.writes.length,writes);
  await call('list-order',{openTodosFirst:false});assert.equal(store.writes.at(-1),'notes-open-todos-first-v1');assert.deepEqual(store.data.get('notes-state-v2'),before);
  const restarted=memory([...store.data]);const second=await handle({action:'list',store:restarted});assert.equal(second.openTodosFirst,false);assert.deepEqual(second.notes.map(n=>n.id),[regular.id,completed.id,open.id]);assert.equal(restarted.writes.length,0);
  await handle({action:'list',input:{openTodosFirst:true},store:restarted});assert.equal(restarted.data.get('notes-open-todos-first-v1'),false);assert.deepEqual(restarted.data.get('notes-state-v2'),before);
});
test('filters still exclude unrelated rows before ordering and invalid preferences do not write',async()=>{
  const {store,call,open,completed}=await fixture(),writes=store.writes.length;
  assert.deepEqual((await call('list',{todoFilter:'open'})).notes.map(n=>n.id),[open.id]);
  assert.deepEqual((await call('list',{todoFilter:'completed'})).notes.map(n=>n.id),[completed.id]);
  assert.deepEqual((await call('list',{search:'missing'})).notes,[]);
  await assert.rejects(call('list-order',{openTodosFirst:'false'}),/Choose whether/);await assert.rejects(call('list',{openTodosFirst:'false'}),/Choose whether/);assert.equal(store.writes.length,writes);
});
test('unavailable preference reads fall back without overwriting saved notes or corrupt settings',async()=>{
  const {store,open}=await fixture(),before=structuredClone(store.data.get('notes-state-v2'));
  store.data.set('notes-open-todos-first-v1','malformed');const corrupt=await handle({action:'list',store});assert.equal(corrupt.openTodosFirst,true);assert.equal(corrupt.orderPreferenceAvailable,false);assert.equal(corrupt.notes[0].id,open.id);assert.equal(store.data.get('notes-open-todos-first-v1'),'malformed');
  const get=store.get;store.get=async(k,fallback)=>{if(k==='notes-open-todos-first-v1')throw new Error('Preference read unavailable');return get.call(store,k,fallback);};const unavailable=await handle({action:'list',store});assert.equal(unavailable.openTodosFirst,true);assert.equal(unavailable.orderPreferenceAvailable,false);assert.deepEqual(store.data.get('notes-state-v2'),before);
});
test('a preference write failure is preserved with no automatic retry or note mutation',async()=>{
  const {store}=await fixture(),before=structuredClone(store.data.get('notes-state-v2'));let attempts=0;
  const set=store.set;store.set=async(k,v)=>{if(k==='notes-open-todos-first-v1'){attempts++;throw new Error('Preference write failed');}return set.call(store,k,v);};
  await assert.rejects(handle({action:'list-order',input:{openTodosFirst:false},store}),/Preference write failed/);assert.equal(attempts,1);assert.deepEqual(store.data.get('notes-state-v2'),before);assert.equal(store.data.has('notes-open-todos-first-v1'),false);
});
