import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {createWorkspace}from'../../lib/storage.mjs';import {searchWorkspace}from'./workspace-search.mjs';import{handle,dispose}from'./server.mjs';import{createPatternSession,patternWorkerState,PATTERN_LIMITS}from'./search-pattern-session.mjs';import{sourcePattern}from'./search-pattern.mjs';
const base=path.resolve(import.meta.dirname,'../../../../../.local/pattern-tests');let counter=0;
async function fixture(t,files){await fs.mkdir(base,{recursive:true});const dir=await fs.mkdtemp(path.join(base,`${++counter}-`)),workspace=await createWorkspace(dir);for(const[name,content]of Object.entries(files)){await fs.mkdir(path.dirname(workspace.resolve(name)),{recursive:true});await fs.writeFile(workspace.resolve(name),content);}t.after(async()=>{await dispose(workspace);assert.equal(path.dirname(dir),base);await fs.rm(dir,{recursive:true,force:true});assert.equal(patternWorkerState().active,0);});return workspace;}
const spans=data=>data.matches.map(m=>[m.path,m.line,m.column,m.endColumn,m.start,m.end]);
test('whole-word options preserve released edge wrapping and Unicode word adjacency',async t=>{
 assert.equal(sourcePattern('a|b',{useRegex:true,wholeWord:true}),'\\ba|b\\b');assert.equal(sourcePattern('.a',{wholeWord:true}),'\\.a\\b');assert.equal(sourcePattern('é',{wholeWord:true}),'é');
 const w=await fixture(t,{'a.txt':'cat cats xcat cat_ cat́ cat\u200cb CAT\ncat! (cat)\n'});
 const d=await searchWorkspace(w,{query:'cat',wholeWord:true,matchCase:false});assert.deepEqual(d.matches.map(x=>[x.line,x.column]),[[1,1],[1,31],[2,1],[2,7]]);assert.equal(d.truncated,false);assert.equal(d.useRegex,false);
});
test('regex Unicode classes CRLF BOM and UTF-16 spans map exact saved bytes',async t=>{
 const content='🧪 café ١２ 42\r\n漢字 é\r\n',w=await fixture(t,{'u.txt':Buffer.concat([Buffer.from([239,187,191]),Buffer.from(content)])});
 const d=await handle({action:'search',input:{query:'\\w+|\\d+',useRegex:true},workspace:w});assert.deepEqual(spans(d),[['u.txt',1,4,8,3,7],['u.txt',1,9,11,8,10],['u.txt',1,12,14,11,13],['u.txt',2,1,3,15,17],['u.txt',2,4,6,18,20]]);const read=await handle({action:'read',input:{path:'u.txt'},workspace:w});assert.equal(read.content,content);assert.equal(d.matches[0].revision,read.revision);for(const m of d.matches)assert.ok(read.content.slice(m.start,m.end));
});
test('zero-length Unicode advancement is finite and never splits astral characters',async t=>{
 const w=await fixture(t,{'a.txt':'🧪a\r\n\r\n','empty.txt':''}),d=await searchWorkspace(w,{query:'(?:)',useRegex:true});assert.deepEqual(spans(d),[['a.txt',1,1,1,0,0],['a.txt',1,3,3,2,2],['a.txt',1,4,4,3,3],['a.txt',2,1,1,5,5]]);assert.equal(d.truncated,false);assert.equal(d.searchedFiles,2);assert.ok(d.zeroLength.includes('differ'));
 const a=await searchWorkspace(w,{query:'^|$',useRegex:true});assert.deepEqual(a.matches.map(m=>[m.line,m.column]),[[1,1],[1,4],[2,1]]);
});
test('invalid and unsupported options fail explicitly before filesystem traversal and release workers',async t=>{
 const w=await fixture(t,{'a.txt':'a'});for(const input of[{query:'[',useRegex:true},{query:'(?i)a',useRegex:true},{query:'[\\W]',useRegex:true},{query:'a',wholeWord:null},{query:'a',useRegex:'true'}])await assert.rejects(searchWorkspace(w,input),/Invalid|supported|true or false/);assert.equal(patternWorkerState().active,0);
 const missing={resolve(){throw Error('must not traverse');}};await assert.rejects(searchWorkspace(missing,{query:'[',useRegex:true}),/Invalid/);
});
test('isolated match budget distinguishes exact1000 and additional empty matches',async t=>{
 const w=await fixture(t,{'a.txt':'x'.repeat(999)}),exact=await searchWorkspace(w,{query:'(?:)',useRegex:true});assert.equal(exact.matches.length,1000);assert.equal(exact.truncated,false);await fs.writeFile(w.resolve('a.txt'),'x'.repeat(1000));const over=await searchWorkspace(w,{query:'(?:)',useRegex:true});assert.equal(over.matches.length,1000);assert.deepEqual(over.limitReasons,['match-limit']);
});
test('request-scoped worker admission, disposal and retry preserve private ownership',async()=>{
 const owned={};const sessions=await Promise.all(Array.from({length:PATTERN_LIMITS.activeWorkers},()=>createPatternSession(owned,{query:'a',useRegex:true,wholeWord:false,matchCase:true},performance.now()+5000)));
 try{assert.equal(patternWorkerState().active,4);await assert.rejects(createPatternSession({}, {query:'a',useRegex:true,wholeWord:false,matchCase:true},performance.now()+5000),/busy/);await dispose(owned);assert.equal(patternWorkerState().active,0);for(const s of sessions)await assert.rejects(s.match('a',1),/disposed/);const retry=await createPatternSession({}, {query:'a',useRegex:true,wholeWord:false,matchCase:true},performance.now()+5000);assert.equal((await retry.match('a',1)).length,1);await retry.close();}finally{await Promise.all(sessions.map(s=>s.close()));}assert.equal(patternWorkerState().active,0);
});
test('catastrophic expression times out off main thread and reports incomplete results after worker exit',async t=>{
 const w=await fixture(t,{'a.txt':'a'.repeat(25000)+'!'});let fired=false;const tick=setTimeout(()=>{fired=true;},25);try{const d=await searchWorkspace(w,{query:'^(a+)+$',useRegex:true});assert.equal(fired,true);assert.equal(d.truncated,true);assert.deepEqual(d.limitReasons,['regex-time-limit']);assert.deepEqual(d.skipped,[{path:'a.txt',reason:'regex-time-limit'}]);assert.equal(d.matches.length,0);assert.equal(patternWorkerState().active,0);}finally{clearTimeout(tick);}
});
test('disposal of an active matcher rejects after exit and a later search succeeds',async t=>{
 const w=await fixture(t,{'a.txt':'a'.repeat(25000)+'!'}),pending=searchWorkspace(w,{query:'^(a+)+$',useRegex:true});while(!patternWorkerState().active)await new Promise(r=>setImmediate(r));await new Promise(r=>setTimeout(r,100));await dispose(w);await assert.rejects(pending,/disposed/);assert.equal(patternWorkerState().active,0);const d=await searchWorkspace(w,{query:'!$',useRegex:true});assert.equal(d.matches.length,1);
});
test('default literal output retains exact historical object shape and escaping',async t=>{
 const w=await fixture(t,{'a.txt':'[a]+ cat cats\n'}),d=await searchWorkspace(w,{query:'[a]+'});assert.equal(d.matches.length,1);assert.equal(Object.hasOwn(d,'useRegex'),false);assert.equal(Object.hasOwn(d,'patternLimits'),false);const regex=await searchWorkspace(w,{query:'cat',useRegex:true,wholeWord:true});assert.equal(regex.matches.length,1);
});
test('idle worker lifetime expires and its exit releases ownership before a later request',async()=>{
 const owned={},s=await createPatternSession(owned,{query:'a',useRegex:true,wholeWord:false,matchCase:true},performance.now()+150);await new Promise(r=>setTimeout(r,250));assert.equal(patternWorkerState().active,0);await assert.rejects(s.match('a',1),/time limit/);await s.close();
});
test('input/content/span budgets reject before worker copy and preserve later valid operation',async()=>{
 await assert.rejects(createPatternSession({}, {query:'x'.repeat(PATTERN_LIMITS.queryBytes+1),useRegex:true,wholeWord:false,matchCase:true},performance.now()+5000),/Invalid/);assert.equal(patternWorkerState().active,0);const s=await createPatternSession({}, {query:'x',useRegex:true,wholeWord:false,matchCase:true},performance.now()+5000);try{await assert.rejects(s.match('x'.repeat(PATTERN_LIMITS.contentBytes+1),1),/failed/);await assert.rejects(s.match('x',1002),/failed/);assert.equal((await s.match('x',1)).length,1);}finally{await s.close();}assert.equal(patternWorkerState().active,0);
});
