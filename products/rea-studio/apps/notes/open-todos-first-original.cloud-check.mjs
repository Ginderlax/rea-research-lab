// Test-only source-assisted original comparison. Original Joplin AGPL notices
// remain in the pinned original file; no upstream code is a runtime dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_ENVIRONMENT!=='github-hosted'||process.env.RUNNER_OS!=='Windows'||process.env.GITHUB_REPOSITORY!=='Ginderlax/rea-research-lab'||process.env.REA_NOTES_SORT_SOURCE_ADMITTED!=='true')throw new Error('Source-admitted hosted Notes original comparison required.');
for(const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[key]));assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
const {orderTodoNotes}=await import('./core.mjs');
const digest=b=>createHash('sha256').update(b).digest('hex');
test('32 finite ordering observations match exact pinned Note.sortNotes for both partition settings',async()=>{
  const raw=await readFile(new URL('../../experiments/notes-open-todos-first-20261021/original/Note.ts',import.meta.url));assert.equal(raw.length,45302);assert.equal(digest(raw),'5f1a200dc970179ad6fd193f7ffc47f09f88261cff8f893ccc793517ebbe9647');
  const source=raw.toString('utf8'),start=source.indexOf('\tpublic static sortNotes('),end=source.indexOf('\n\t}\n',start);assert(start>=0&&end>start);assert.equal(source.indexOf('\tpublic static sortNotes(',start+1),-1);
  const method=source.slice(start,end+4);assert(method.trimEnd().endsWith('}'));
  // The adapter is explicit. These cases select unique numeric update times,
  // so neither title collation nor the original equal-time fallback is used.
  const adapter='class Note {\n'+method+'\n}; Note;', stripped=stripTypeScriptTypes(adapter);
  const Original=vm.runInNewContext(stripped,{getCollator:()=>new Intl.Collator('en')},{timeout:1000});
  let observations=0;const records=[];
  for(let mask=0;mask<16;mask++)for(const enabled of [false,true]){
    const notes=Array.from({length:4},(_,i)=>({id:String(i),is_todo:(mask>>i)&1,todo_completed:i%2?0:100,title:'item'+i,user_updated_time:(i+1)*1000,user_created_time:i}));
    const before=structuredClone(notes),candidate=notes.map(n=>({id:n.id,title:n.title,updatedAt:new Date(n.user_updated_time).toISOString(),todo:{isTodo:Boolean(n.is_todo),due:0,completed:n.todo_completed}}));
    const original=Original.sortNotes(notes.map(n=>({...n})),[{by:'user_updated_time',dir:'DESC'}],enabled);
    const candidateIDs=orderTodoNotes(candidate,enabled).map(n=>n.id),originalIDs=Array.from(original,n=>n.id);assert.deepEqual(candidateIDs,originalIDs);assert.deepEqual(notes,before);observations++;records.push({mask,enabled,input:before,originalIDs,candidateIDs});
  }
  assert.equal(observations,32);assert.equal(records.length,32);const report={schema:'rea-notes-open-todos-first-original-observations/v2',sourceEpoch:'notes-open-todos-first-v1',sourceCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,originalSourceCommit:'7e2765a3857754d12dbadea442b60ceaf9d4b23d',sourceSHA256:digest(raw),methodSHA256:digest(method),adapterSHA256:digest(adapter),strippedAdapterSHA256:digest(stripped),collatorAdapter:'getCollator=()=>new Intl.Collator(en); unique numeric times bypass title/tie comparison',observations,records,originalDatabaseExecutions:0,originalFullAppExecutions:0,originalGUISessions:0,scope:'Exactly16 isTodo masks x2 flags; fixed input order, unique numeric updated times and alternating completion state. No permutations, title/natural-sort/tie/default-setting-persistence parity'};const output=JSON.stringify(report);assert(Buffer.byteLength(output)<=65536);console.log(output);
});
