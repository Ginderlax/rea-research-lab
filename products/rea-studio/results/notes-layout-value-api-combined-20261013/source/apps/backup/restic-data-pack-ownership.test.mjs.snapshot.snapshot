import test from 'node:test';
import assert from 'node:assert/strict';
import {zstdDecompressSync} from 'node:zlib';
import {createDataPackWriter} from './restic-data-pack.mjs';
import {hash,randomKey,open} from './restic-crypto.mjs';

const observations=[];
const busy=error=>error instanceof Error&&error.code==='ERR_RESTIC_DATA_PACK_BUSY';
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function heldCommit(){const entered=deferred(),release=deferred(),packs=[];let calls=0;return {entered,release,packs,get calls(){return calls;},async commit(pack){calls++;if(calls===1){entered.resolve(pack);await release.promise;}packs.push(pack);}};}
function decoded(packs,key){
  const rows=[];
  for(const pack of packs){
    assert.equal(hash(pack.bytes),pack.id);
    const headerLength=pack.bytes.readUInt32LE(pack.bytes.length-4),headerStart=pack.bytes.length-4-headerLength;
    assert.ok(headerStart>=0);const header=open(key,pack.bytes.subarray(headerStart,-4));
    const index=[];let offset=0;
    for(let position=0;position<header.length;){
      const type=header[position];assert.ok(type===0||type===2);
      const width=type===2?41:37,length=header.readUInt32LE(position+1),uncompressed=type===2?header.readUInt32LE(position+5):0;
      const id=header.subarray(position+(type===2?9:5),position+width).toString('hex');
      let bytes=open(key,pack.bytes.subarray(offset,offset+length));
      if(uncompressed){bytes=zstdDecompressSync(bytes,{maxOutputLength:uncompressed});assert.equal(bytes.length,uncompressed);}
      assert.equal(hash(bytes),id);rows.push({id,bytes});
      index.push({id,type:'data',offset,length,...(uncompressed?{uncompressed_length:uncompressed}:{})});
      offset+=length;position+=width;
    }
    assert.equal(offset,headerStart);assert.deepEqual(index,pack.blobs);
  }
  return rows;
}
function verify(packs,key,expected){
  const rows=decoded(packs,key),ids=expected.map(hash);
  assert.deepEqual(rows.map(row=>row.id),ids);
  assert.equal(new Set(ids).size,ids.length);
  rows.forEach((row,index)=>assert.deepEqual(row.bytes,expected[index]));
  return ids;
}
function observe(name,extra){observations.push({name,...extra});}

for(const version of [1,2]){
  test(`v${version} save during held explicit flush rejects before guard/input inspection and preserves rightful bytes`,{timeout:5000},async()=>{
    const key=randomKey(),held=heldCommit();let guards=0;
    const writer=createDataPackWriter({key,version,guard(){guards++;},commit:held.commit}),a=Buffer.from('A accepted '.repeat(60)),b=Buffer.from('B accepted later '.repeat(60));
    assert.equal(await writer.save(a),hash(a));const operation=writer.flush();await held.entered.promise;
    const before=guards;await assert.rejects(writer.save(b),busy);await assert.rejects(writer.save(a),busy);
    const malformed=Object.create(null,{length:{get(){throw new Error('caller input was inspected during a rejected overlap');}}});
    await assert.rejects(writer.save(malformed),busy);
    assert.equal(guards,before);assert.equal(writer.count,1);assert.equal(writer.has(hash(a)),true);assert.equal(writer.has(hash(b)),false);assert.equal(held.calls,1);
    held.release.resolve();await operation;assert.equal(writer.count,0);
    assert.equal(await writer.save(b),hash(b));await writer.flush();
    const ids=verify(held.packs,key,[a,b]);observe(`save-vs-flush/v${version}`,{rejectedCalls:3,commitCalls:held.calls,acceptedIDs:ids,exactBytes:true});
  });
  test(`v${version} second flush and dispose reject during held flush without clearing pending rows`,{timeout:5000},async()=>{
    const key=randomKey(),held=heldCommit(),writer=createDataPackWriter({key,version,commit:held.commit}),a=Buffer.from('owned explicit flush'),b=Buffer.from('owned after disposal');
    await writer.save(a);const operation=writer.flush();await held.entered.promise;
    await assert.rejects(writer.flush(),busy);assert.throws(()=>writer.dispose(),busy);assert.equal(writer.count,1);assert.equal(writer.has(hash(a)),true);
    held.release.resolve();await operation;verify(held.packs,key,[a]);assert.equal(held.calls,1);
    assert.doesNotThrow(()=>writer.dispose());await writer.save(b);await writer.flush();verify(held.packs,key,[a,b]);
    observe(`flush-vs-flush-and-dispose/v${version}`,{rejectedCalls:2,commitCalls:held.calls,exactBytes:true});
  });
  test(`v${version} save owns its automatic previous-pack flush and snapshots incoming caller bytes`,{timeout:5000},async()=>{
    const key=randomKey(),held=heldCommit(),writer=createDataPackWriter({key,version,compression:'off',target:256,commit:held.commit});
    const a=Buffer.alloc(70,0x41),b=Buffer.alloc(70,0x42),originalB=Buffer.from(b),c=Buffer.alloc(70,0x43);
    await writer.save(a);const operation=writer.save(b);await held.entered.promise;
    b.fill(0);await assert.rejects(writer.save(c),busy);await assert.rejects(writer.flush(),busy);assert.throws(()=>writer.dispose(),busy);
    assert.equal(writer.count,1);assert.equal(writer.has(hash(a)),true);assert.equal(writer.has(hash(c)),false);
    held.release.resolve();assert.equal(await operation,hash(originalB));assert.equal(writer.count,1);
    await writer.flush();await writer.save(c);await writer.flush();const ids=verify(held.packs,key,[a,originalB,c]);
    observe(`save-vs-automatic-old-flush/v${version}`,{rejectedCalls:3,commitCalls:held.calls,acceptedIDs:ids,incomingSnapshotPreserved:true});
  });
  test(`v${version} first save retains ownership through its automatic current-pack commit`,{timeout:5000},async()=>{
    const key=randomKey(),held=heldCommit(),writer=createDataPackWriter({key,version,compression:'off',target:128,commit:held.commit}),a=Buffer.alloc(70,0x51),b=Buffer.alloc(70,0x52);
    const operation=writer.save(a);await held.entered.promise;
    await assert.rejects(writer.save(b),busy);await assert.rejects(writer.flush(),busy);assert.throws(()=>writer.dispose(),busy);
    assert.equal(writer.count,1);held.release.resolve();assert.equal(await operation,hash(a));assert.equal(writer.count,0);
    assert.equal(await writer.save(b),hash(b));await writer.flush();verify(held.packs,key,[a,b]);
    observe(`save-vs-automatic-current-flush/v${version}`,{rejectedCalls:3,commitCalls:held.calls,exactBytes:true});
  });
  test(`v${version} reentrant commit callback gets immediate public-operation rejections`,async()=>{
    const key=randomKey(),packs=[],a=Buffer.from('owned reentrant data');let writer;
    writer=createDataPackWriter({key,version,commit:async pack=>{
      await assert.rejects(writer.save(Buffer.from('callback must not enqueue')),busy);await assert.rejects(writer.flush(),busy);assert.throws(()=>writer.dispose(),busy);
      assert.equal(writer.count,1);assert.equal(writer.has(hash(a)),true);packs.push(pack);
    }});
    await writer.save(a);await writer.flush();assert.equal(writer.count,0);verify(packs,key,[a]);
    observe(`reentrant-commit/v${version}`,{rejectedCalls:3,commitCalls:packs.length,exactBytes:true});
  });
}

// Child-local observation of owned ciphertext allocations, not a benchmark.
// Existing crypto concatenates nonce/ciphertext/tag in three buffers. Retain
// those output references only, then independently authenticate their content.
function observeCiphertext(){
  const real=Buffer.concat,ciphertext=[];
  Buffer.concat=function(list,...args){const result=Reflect.apply(real,this,[list,...args]);if(list.length===3&&list[0].length===16&&list[2].length===16&&result.length===list.reduce((sum,row)=>sum+row.length,0))ciphertext.push(result);return result;};
  return {ciphertext,restore(){Buffer.concat=real;}};
}
for(const mode of ['explicit','automatic-old','automatic-current'])test(`held ${mode} commit rejection preserves primary Error, releases busy and wipes owned payloads`,{timeout:5000},async()=>{
  const key=randomKey(),entered=deferred(),release=deferred(),primary=new Error(`owned ${mode} commit failure`),a=Buffer.alloc(70,0x61),b=Buffer.alloc(70,0x62),sourceA=Buffer.from(a),sourceB=Buffer.from(b);
  const hook=observeCiphertext();let calls=0,pack,writer,owned=[];
  try {
    writer=createDataPackWriter({key,version:1,compression:'off',target:mode==='explicit'?1024:mode==='automatic-old'?256:128,commit:async value=>{calls++;pack=value;entered.resolve();await release.promise;throw primary;}});
    let operation;
    if(mode==='automatic-current')operation=writer.save(a);
    else {await writer.save(a);operation=mode==='explicit'?writer.flush():writer.save(b);}
    // Attach the rejection observer before releasing the held callback.
    const rejected=assert.rejects(operation,error=>error===primary);await entered.promise;
    owned=hook.ciphertext.filter(bytes=>{try{const plain=open(key,bytes);return plain.equals(a)||plain.equals(b);}catch{return false;}});
    assert.equal(owned.length,mode==='automatic-old'?2:1);assert.ok(owned.every(bytes=>bytes.some(Boolean)));
    await assert.rejects(writer.save(Buffer.from('must reject before poisoning')),busy);await assert.rejects(writer.flush(),busy);assert.throws(()=>writer.dispose(),busy);assert.equal(writer.count,1);
    release.resolve();await rejected;assert.equal(writer.count,0);assert.equal(writer.has(hash(a)),false);assert.equal(writer.has(hash(b)),false);
    assert.ok(owned.every(bytes=>bytes.every(value=>value===0)));
    await assert.rejects(writer.save(Buffer.from('later')),error=>error===primary);await assert.rejects(writer.flush(),error=>error===primary);assert.doesNotThrow(()=>writer.dispose());assert.equal(calls,1);
    // A separately allocated serialized pack is still a valid immutable copy;
    // it is not the pending payload buffer that cleanup zeroes.
    verify([pack],key,[a]);assert.deepEqual(a,sourceA);assert.deepEqual(b,sourceB);
    observe(`commit-failure/${mode}`,{rejectedCalls:3,commitCalls:calls,pendingCountAfterFailure:writer.count,ownedCiphertextBuffersZeroed:owned.length,primaryErrorIdentityPreserved:true,busyReleased:true,callerBuffersUnchanged:true});
  }finally{release.resolve();hook.restore();}
});

test('guard and validation failures release ownership while retaining previously accepted pending data',async()=>{
  const key=randomKey(),packs=[],primary=new Error('owned initial guard failure'),a=Buffer.from('prior accepted data'),b=Buffer.from('later accepted data');let failure=false;
  const writer=createDataPackWriter({key,version:1,guard(){if(failure)throw primary;},commit:async pack=>packs.push(pack)});
  await writer.save(a);await assert.rejects(writer.save(new Uint8Array(1)),/8 MiB/);assert.equal(writer.count,1);
  failure=true;await assert.rejects(writer.save(b),error=>error===primary);await assert.rejects(writer.flush(),error=>error===primary);assert.equal(writer.count,1);
  failure=false;await writer.save(b);await writer.flush();verify(packs,key,[a,b]);
  observe('non-commit-failure-ownership',{pendingRetained:true,busyReleased:true,exactBytes:true});
});
test('guard failure at automatic old-flush entry wipes only the unqueued incoming ciphertext and permits a safe retry',async()=>{
  const key=randomKey(),packs=[],primary=new Error('owned automatic flush entry guard'),a=Buffer.alloc(70,0x71),b=Buffer.alloc(70,0x72),hook=observeCiphertext();let armed=false,guardCalls=0;
  try {
    const writer=createDataPackWriter({key,version:1,compression:'off',target:256,guard(){if(armed&&++guardCalls===2)throw primary;},commit:async pack=>packs.push(pack)});
    await writer.save(a);const pending=hook.ciphertext.find(bytes=>open(key,bytes).equals(a));assert.ok(pending);
    armed=true;await assert.rejects(writer.save(b),error=>error===primary);
    assert.equal(hook.ciphertext.length,2);const incoming=hook.ciphertext[1];assert.ok(incoming.every(value=>value===0));assert.ok(pending.some(Boolean));
    assert.equal(writer.count,1);assert.equal(writer.has(hash(a)),true);assert.equal(writer.has(hash(b)),false);assert.equal(packs.length,0);
    armed=false;assert.equal(await writer.save(b),hash(b));await writer.flush();verify(packs,key,[a,b]);assert.ok(pending.every(value=>value===0));
    observe('guard-at-automatic-flush-entry',{unqueuedCiphertextZeroed:true,acceptedPendingRetained:true,busyReleased:true,retryCommitsExactAcceptedBytes:true});
  }finally{hook.restore();}
});
test('guard expiry after held old-pack commit retains that committed pack, rejects incoming acceptance and wipes both owned payloads', {timeout:5000},async()=>{
  const key=randomKey(),entered=deferred(),release=deferred(),primary=new Error('owned after-commit guard expiry'),packs=[],a=Buffer.alloc(70,0x73),b=Buffer.alloc(70,0x74),hook=observeCiphertext();let expired=false;
  try {
    const writer=createDataPackWriter({key,version:1,compression:'off',target:256,guard(){if(expired)throw primary;},commit:async pack=>{entered.resolve();await release.promise;packs.push(pack);expired=true;}});
    await writer.save(a);const operation=writer.save(b),rejected=assert.rejects(operation,error=>error===primary);await entered.promise;
    const owned=hook.ciphertext.filter(bytes=>{try{const plain=open(key,bytes);return plain.equals(a)||plain.equals(b);}catch{return false;}});assert.equal(owned.length,2);
    await assert.rejects(writer.flush(),busy);assert.throws(()=>writer.dispose(),busy);
    release.resolve();await rejected;assert.equal(writer.count,0);assert.equal(writer.has(hash(b)),false);assert.ok(owned.every(bytes=>bytes.every(value=>value===0)));
    verify(packs,key,[a]);await assert.rejects(writer.save(Buffer.from('later')),error=>error===primary);await assert.rejects(writer.flush(),error=>error===primary);assert.doesNotThrow(()=>writer.dispose());assert.equal(packs.length,1);
    observe('guard-after-held-automatic-commit',{ownedCiphertextBuffersZeroed:2,originalPrimaryErrorPreserved:true,busyReleased:true,earlierAcceptedCommittedBytesPreserved:true,incomingNotAccepted:true});
  }finally{release.resolve();hook.restore();}
});
test('dispose is synchronous, clears owned queued ciphertext, leaves caller bytes intact and releases ownership',async()=>{
  const key=randomKey(),source=Buffer.from('private pending disposal'),original=Buffer.from(source),hook=observeCiphertext(),packs=[];
  try {
    const writer=createDataPackWriter({key,version:2,commit:async pack=>packs.push(pack)});await writer.save(source);
    const owned=hook.ciphertext.filter(bytes=>{try{const plain=open(key,bytes);return plain.equals(source)||zstdDecompressSync(plain,{maxOutputLength:source.length}).equals(source);}catch{return false;}});
    assert.equal(owned.length,1);assert.equal(writer.dispose(),undefined);assert.equal(writer.count,0);assert.ok(owned[0].every(value=>value===0));assert.deepEqual(source,original);
    await writer.save(Buffer.from('later after disposal'));await writer.flush();verify(packs,key,[Buffer.from('later after disposal')]);
    observe('dispose-pending',{ciphertextBuffersZeroed:1,busyReleased:true,callerBytesUnchanged:true});
  }finally{hook.restore();}
});
test.after(()=>console.log(JSON.stringify({packOperationOwnershipObservations:observations})));
