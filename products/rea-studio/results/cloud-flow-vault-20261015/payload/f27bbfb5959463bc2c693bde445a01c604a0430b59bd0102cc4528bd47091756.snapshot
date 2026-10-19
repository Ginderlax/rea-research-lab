import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createWorkspace} from '../../lib/storage.mjs';
import {handle} from './server.mjs';
import {editorRelativePath,MAX_EDITOR_PATH_CHARACTERS} from './file-path.mjs';
function name(length){const prefix=Array.from({length:5},(_,i)=>String(i)+'d'.repeat(179)).join('/')+'/';return prefix+'f'.repeat(length-prefix.length);}
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'rea-search-path-')),workspace=await createWorkspace(path.join(root,'workspace'));t.after(async()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('rea-search-path-'));await fs.rm(root,{recursive:true,force:true});});return{workspace,put:async n=>{const file=workspace.resolve(n);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,'needle\n');},call:(action,input)=>handle({action,input,workspace})};}
test('search and read share the exact1024 UTF-16 path boundary',async t=>{
 const{put,call}=await fixture(t),at=name(MAX_EDITOR_PATH_CHARACTERS),over=name(MAX_EDITOR_PATH_CHARACTERS+1);
 assert.equal(at.length,1024);assert.equal(over.length,1025);await put(at);await put(over);
 const result=await call('search',{query:'needle'});assert.deepEqual(result.matches.map(r=>r.path),[at]);
 assert.deepEqual(result.skipped,[{path:over,reason:'editor-path-contract'}]);assert.deepEqual(result.limitReasons,['editor-path-contract']);assert.equal(result.truncated,true);
 assert.equal((await call('read',{path:at})).content,'needle\n');await assert.rejects(call('read',{path:over}),/relative file path/);
});
test('search skips an overlong directory before resolving descendants and explicitly reports incomplete coverage',async t=>{
 const{put,call}=await fixture(t),folder=name(1096),file=folder+'/inside.txt';await put(file);
 const result=await call('search',{query:'needle'});assert.equal(result.matches.length,0);assert.equal(result.searchedFiles,0);
 assert.deepEqual(result.skipped,[{path:folder,reason:'editor-path-contract'}]);assert.equal(result.truncated,true);assert.deepEqual(result.limitReasons,['editor-path-contract']);
});
test('shared path validation preserves existing read/save semantics including astral code-unit length and normalization',()=>{
 assert.equal(editorRelativePath('folder\\file'),'folder/file');assert.equal(editorRelativePath('🧪'.repeat(512)).length,1024);
 for(const value of ['🧪'.repeat(513),' ','\0',null,42])assert.throws(()=>editorRelativePath(value),/relative file path/);
});
