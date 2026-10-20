// New reverse-direction corpus; never refreshes prior upload/local receipts.
// Only execute after admission of this exact source and independent contract review.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createDAVDownload} from './dav-download.mjs';
import {fixtureServer} from './scripts/webdav-fixture.mjs';
import {createRecordedOracle,comparisonFlags,originalJSONLogs,hosted,digest} from './scripts/download-oracle.mjs';
hosted();
const corpus=JSON.parse(await fs.readFile(new URL('./scripts/download-corpus.json',import.meta.url),'utf8'));
assert.equal(corpus.schema,'rea-sync-webdav-download-original-corpus/v1');assert.equal(corpus.cases.length,11);assert.equal(corpus.profileKeys.length,7);assert.equal(corpus.profileMasks.first,0);assert.equal(corpus.profileMasks.last,127);
const auth={type:'basic',username:'synthetic-download-user',password:'synthetic-download-password-2026'};
const base=Date.parse(corpus.remoteModifiedISO);assert.equal(new Date(base).toUTCString(),corpus.remoteModifiedHTTP);
const sanitized=value=>{const text=JSON.stringify(value);for(const secret of[auth.password,auth.username,Buffer.from(auth.username+':'+auth.password).toString('base64')])assert(!text.includes(secret),'Credentials entered saved comparison evidence');return value;};
// Content/presence and file timestamp contracts are checked separately. Full raw
// mtimeNs observations remain in every snapshot and case receipt.
const comparable=tree=>({exists:tree.exists,directories:tree.directories,files:Object.fromEntries(Object.entries(tree.files).map(([name,row])=>[name,{bytes:row.bytes,sha256:row.sha256}]))});
const timestamps=tree=>Object.fromEntries(Object.entries(tree.files).map(([name,row])=>[name,row.mtimeNs]));
function copiedAndSkippedTimes(before,after,selected){const copied=new Set(selected),expectedRemote=(BigInt(base)*1000000n).toString();for(const[name,row]of Object.entries(after.files)){if(copied.has(name))assert.equal(row.mtimeNs,expectedRemote,'Copied file must preserve observed remote Last-Modified: '+name);else{assert(Object.hasOwn(before.files,name),'Unexpected unselected local file');assert.equal(row.mtimeNs,before.files[name].mtimeNs,'Skipped file timestamp changed: '+name);}}}
function writeMethods(fixture){return fixture.requests.filter(r=>['PUT','DELETE','MKCOL','MOVE','COPY','PROPPATCH','LOCK','UNLOCK'].includes(r.method));}
function names(logs,prefix){return logs.filter(row=>typeof row.msg==='string'&&prefix.test(row.msg)).map(row=>row.object).sort();}

test('authenticated rclone remote-to-local decisions and complete output bytes match reviewed native download',{timeout:25*60000},async t=>{
  const temporary=await fs.realpath(process.env.RUNNER_TEMP),evidence=await fs.realpath(process.env.REA_SYNC_DOWNLOAD_ORIGINAL_EVIDENCE);
  assert.equal(path.dirname(evidence),temporary);const root=await fs.mkdtemp(path.join(temporary,'rea-sync-download-original-'));let oracle,status='failed';
  t.after(async()=>{assert.equal(path.dirname(root),temporary);assert(path.basename(root).startsWith('rea-sync-download-original-'));await fs.rm(root,{recursive:true,force:true});});
  const records=[],failures=[];
  async function seedLocal(folder,values,{missing=false}={}){if(missing)return;await fs.mkdir(folder,{recursive:true});for(const [name,row]of Object.entries(values)){const file=path.join(folder,...name.split('/'));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,row.bytes,{flag:'wx'});const time=new Date(row.time);await fs.utimes(file,time,time);}await fs.mkdir(path.join(folder,'local-extra-empty'),{recursive:true});}
  try{
    oracle=await createRecordedOracle(root,{evidence,secrets:[auth.username,auth.password]});
    async function one({caseID,seed,destination,comparison={},filters={},targetMissing=false,decisions=null}){
      const area=path.join(root,caseID);await fs.mkdir(area);const originalTarget=path.join(area,'original-target'),nativeWorkspace=path.join(area,'native-workspace'),nativeTarget=path.join(nativeWorkspace,'target');await fs.mkdir(nativeWorkspace);
      await seedLocal(originalTarget,destination,{missing:targetMissing});await seedLocal(nativeTarget,destination,{missing:targetMissing});
      const fixture=await fixtureServer({seed,auth}),engine=createDAVDownload(nativeWorkspace),remoteBefore=fixture.snapshot();
      let observedNativeApplied=null,primaryError=null;
      async function stage(phase,value){assert(/^[a-z0-9-]+$/.test(phase));const row=sanitized({schema:'rea-sync-download-original-case-phase/v1',caseID,phase,comparison,filters,...value});const raw=Buffer.from(JSON.stringify(row,null,2)+'\n');assert(raw.length<=8*1024*1024);await fs.writeFile(path.join(evidence,caseID+'-phase-'+phase+'.json'),raw,{flag:'wx'});}
      try{
        const sourceBytes=Object.create(null);for(const[name,item]of fixture.entries){if(item.bytes!==null)sourceBytes[name]=await oracle.retainBytes(item.bytes);}
        const flags=await oracle.connectionFlags(fixture.endpoint,auth),originalBefore=await oracle.snapshot(originalTarget,{caseID,phase:'original-before'}),nativeBefore=await oracle.snapshot(nativeTarget,{caseID,phase:'native-before'});await stage('before',{sourceBytes,remoteBefore,originalBefore,nativeBefore});assert.deepEqual(comparable(nativeBefore),comparable(originalBefore));
        const filterFlags=Object.entries(filters).flatMap(([kind,items])=>items.flatMap(item=>['--'+kind,item]));
        const args=['copy',':webdav:',originalTarget,...comparisonFlags(comparison),...filterFlags,...flags];
        fixture.requests.length=0;const dry=await oracle.run([...args,'--dry-run'],{caseID:caseID+'-dry-run'});const afterDry=await oracle.snapshot(originalTarget,{caseID,phase:'original-after-dry-run'});await stage('original-dry-run',{afterDry,command:dry.record,http:structuredClone(fixture.requests)});assert.deepEqual(comparable(afterDry),comparable(originalBefore));assert.deepEqual(timestamps(afterDry),timestamps(originalBefore));assert.deepEqual(fixture.snapshot(),remoteBefore);assert.equal(writeMethods(fixture).length,0);
        const drySelected=names(originalJSONLogs(dry.stderr),/^Skipped copy as --dry-run/),dryHTTP=structuredClone(fixture.requests);
        fixture.requests.length=0;const applied=await oracle.run(args,{caseID:caseID+'-copy'});const originalAfter=await oracle.snapshot(originalTarget,{caseID,phase:'original-after-copy'}),selected=names(originalJSONLogs(applied.stderr),/^Copied \(/);await stage('original-copy',{originalAfter,selected,drySelected,command:applied.record,http:structuredClone(fixture.requests)});assert.deepEqual(selected,drySelected);copiedAndSkippedTimes(originalBefore,originalAfter,selected);assert.deepEqual(fixture.snapshot(),remoteBefore);assert.equal(writeMethods(fixture).length,0);const originalHTTP=structuredClone(fixture.requests);
        fixture.requests.length=0;const input={endpoint:fixture.endpoint,auth,source:'',destination:'target',mode:'copy',comparison,filters};const preview=await engine.preview(input),afterPreview=await oracle.snapshot(nativeTarget,{caseID,phase:'native-after-preview'});await stage('native-preview',{preview:{...preview,token:'[SYNTHETIC_PLAN_TOKEN_REDACTED]'},afterPreview,http:structuredClone(fixture.requests)});assert.equal(preview.direction,'webdav-to-local');assert.deepEqual(comparable(afterPreview),comparable(nativeBefore));assert.deepEqual(timestamps(afterPreview),timestamps(nativeBefore));assert.equal(writeMethods(fixture).length,0);assert.deepEqual(preview.operations.filter(o=>o.type==='copy').map(o=>o.path).sort(),selected);const previewHTTP=structuredClone(fixture.requests);
        fixture.requests.length=0;const nativeApplied=await engine.apply({endpoint:fixture.endpoint,auth,token:preview.token});observedNativeApplied=nativeApplied;const nativeAfter=await oracle.snapshot(nativeTarget,{caseID,phase:'native-after-copy'});await stage('native-copy',{nativeApplied,nativeAfter,http:structuredClone(fixture.requests)});assert.equal(nativeApplied.applied,true);assert.equal(nativeApplied.direction,'webdav-to-local');assert.deepEqual(comparable(nativeAfter),comparable(originalAfter));copiedAndSkippedTimes(nativeBefore,nativeAfter,selected);assert.deepEqual(timestamps(nativeAfter),timestamps(originalAfter));assert.deepEqual(fixture.snapshot(),remoteBefore);assert.equal(writeMethods(fixture).length,0);const applyHTTP=structuredClone(fixture.requests);
        if(decisions){assert.equal(decisions.length,11);for(const c of decisions)assert(Object.hasOwn(originalAfter.files,c.path));}
        // Preimages are independent actual local files, not a claim of whole-tree atomicity.
        let recovery=null;if(nativeApplied.retainedAt){recovery=await oracle.snapshot(path.join(nativeWorkspace,...nativeApplied.retainedAt.split('/')),{caseID,phase:'native-recovery'});}
        const record=sanitized({caseID,comparison,filters,sourceBytes,originalSelected:selected,originalDrySelected:drySelected,remoteBefore,remoteUnchanged:true,originalBefore,originalAfter,nativeBefore,nativeAfter,recovery,nativeApplied,preview:{...preview,token:'[CONSUMED_SYNTHETIC_PLAN_TOKEN]'},http:{dry:dryHTTP,original:originalHTTP,preview:previewHTTP,apply:applyHTTP},passed:true});records.push(record);await fs.writeFile(path.join(evidence,caseID+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
      }catch(error){
        primaryError=error;
        // Capture actual failed-final trees before fixture/root cleanup. Diagnostics
        // may fail too; retain those failures and always rethrow the primary error.
        const captureFailures=[],failure={caseID,name:error?.name??'UnknownError',message:String(error?.message??error),completed:error?.completed??null,failedOperation:error?.failedOperation??null,planConsumed:error?.planConsumed??null,retainedAt:error?.retainedAt??observedNativeApplied?.retainedAt??null};
        try{const seen=new WeakSet();failure.comparison=JSON.parse(JSON.stringify({actual:error?.actual??null,expected:error?.expected??null,operator:error?.operator??null,failureType:error?.failureType??null},(_key,value)=>{if(typeof value==='bigint')return value.toString();if(value&&typeof value==='object'){if(seen.has(value))return'[Circular]';seen.add(value);}return value;}));}catch(captureError){captureFailures.push({stage:'comparison-error-fields',name:captureError.name,message:captureError.message});}
        const failedFinal={};for(const[label,folder,phase]of [['original',originalTarget,'original-failed-final'],['native',nativeTarget,'native-failed-final']]){try{failedFinal[label]=await oracle.snapshot(folder,{caseID,phase});}catch(captureError){captureFailures.push({stage:phase,name:captureError.name,message:captureError.message});}}
        if(typeof failure.retainedAt==='string'){try{assert(failure.retainedAt.length<=2048&&!failure.retainedAt.includes('\\')&&!failure.retainedAt.includes(':')&&failure.retainedAt.split('/').every(p=>p&&p!=='.'&&p!=='..'));failedFinal.recovery=await oracle.snapshot(path.join(nativeWorkspace,...failure.retainedAt.split('/')),{caseID,phase:'recovery-failed-final'});}catch(captureError){captureFailures.push({stage:'recovery-failed-final',name:captureError.name,message:captureError.message});}}
        try{failures.push(sanitized(failure));}catch(captureError){captureFailures.push({stage:'failure-summary',name:captureError.name,message:captureError.message});failures.push({caseID,name:'PrimaryErrorRetainedInNodeEvents',message:'Failure summary could not be safely serialized; raw primary error remains failed.'});}try{await stage('failed',{failure,failedFinal,remote:fixture.snapshot(),http:structuredClone(fixture.requests),captureFailures});}catch(captureError){captureFailures.push({stage:'failed-case-journal',name:captureError.name,message:captureError.message});}
        if(captureFailures.length&&error&&typeof error==='object'){try{Object.defineProperty(error,'diagnosticCaptureFailures',{value:captureFailures,enumerable:true});}catch{console.error('Failed-case diagnostic capture incomplete; primary error retained.');}}
        throw error;
      }
      finally{
        const cleanupFailures=[];try{engine.close();}catch(error){cleanupFailures.push(error);}try{await fixture.close();}catch(error){cleanupFailures.push(error);}
        if(cleanupFailures.length){if(primaryError&&typeof primaryError==='object'){try{Object.defineProperty(primaryError,'ownedCleanupFailures',{value:cleanupFailures,enumerable:true});}catch{console.error('Owned cleanup failed after primary error.');}}else throw new AggregateError(cleanupFailures,'Owned reverse corpus cleanup failed.');}
      }
    }
    for(let mask=0;mask<128;mask++){
      const comparison=Object.fromEntries(corpus.profileKeys.map((key,index)=>[key,Boolean(mask&(1<<index))])),seed={},destination={'destination-extra.txt':{bytes:Buffer.from('keep local extra'),time:base}};
      for(const c of corpus.cases){seed[c.path]=c.source;if(Object.hasOwn(c,'destination'))destination[c.path]={bytes:Buffer.from(c.destination),time:base+c.destinationDeltaMs};}
      await one({caseID:'download-mask-'+String(mask).padStart(3,'0'),seed,destination,comparison,decisions:corpus.cases});
    }
    for(const item of corpus.heldOutFolders){
      const binary=Buffer.alloc(65539);for(let i=0;i<binary.length;i++)binary[i]=(i*113+Math.floor(i/257))&255;
      const seed=item.emptyRemote?{}:{'a.txt':'replacement','b.tmp':'new temporary','nested/space name.txt':'nested UTF8 — 雪 😀','nested/data.bin':binary,'nested/zero.bin':Buffer.alloc(0),'blocked/private.txt':'not selected','empty-remote-directory':null};
      const destination={'a.txt':{bytes:Buffer.from('old'),time:base-2000},'local-extra.txt':{bytes:Buffer.from('keep extra'),time:base},'blocked/old.txt':{bytes:Buffer.from('keep blocked extra'),time:base}};
      await one({caseID:'download-held-'+item.id,seed,destination,comparison:{ignoreTimes:true},filters:item.filters,targetMissing:item.targetMissing===true});
    }
    assert.equal(records.length,128+corpus.heldOutFolders.length);assert.equal(failures.length,0);status='passed';
  }finally{
    const original=oracle?await oracle.finish(status):null;const receipt=sanitized({schema:'rea-sync-webdav-download-original-corpus-attempt/v1',status,execution:Object.fromEntries(['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB'].map(k=>[k,process.env[k]??null])),sourceCommit:oracle?.sourceCommit,corpusSHA256:digest(await fs.readFile(new URL('./scripts/download-corpus.json',import.meta.url))),completedProfiles:records.filter(r=>r.caseID.startsWith('download-mask-')).length,completedHeldOutFolders:records.filter(r=>r.caseID.startsWith('download-held-')).length,plannedProfileMasks:128,plannedCasesPerProfile:11,decisionMatrixAcceptancePreclaimed:false,originalProcessReceipt:original?{commands:original.commands.length,status:original.status}:null,recordCaseIDs:records.map(r=>r.caseID),failures,scope:'Remote-to-local COPY only. Full native/source and transcript qualification is independent; no fullrclone/allprovider/performance/parity/superiority acceptance.',sourceOverlay:false,historicalReceiptsRebound:false,fullProductComplete:false,universalSuperiorityEstablished:false});await fs.writeFile(path.join(evidence,'download-original-corpus.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  }
});
