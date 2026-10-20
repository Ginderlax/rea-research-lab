import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createCipheriv,createHmac,pbkdf2Sync} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {makeZip,readZip} from './zip.mjs';
import {ZIP_AES,validateZipPassword,encryptWinZipAES,decryptWinZipAES} from './zip-aes.mjs';
import {OperationBudget} from './operation-budget.mjs';

// Authored independent format construction. This uses standard crypto primitives,
// its own per-block counter implementation and bitwise CRC, not candidate helpers.
// It is a specification cross-check, not original-CLI provenance or a frozen KAT.
const password='Owned ASCII fixture password 42',observations=[];
function referenceCRC(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function referencePacked(bytes,pass=password){
  const salt=Buffer.from('000102030405060708090a0b0c0d0e0f','hex'),derived=pbkdf2Sync(Buffer.from(pass,'ascii'),salt,1000,66,'sha1'),encrypted=Buffer.alloc(bytes.length);
  try{for(let at=0,index=1;at<bytes.length;at+=16,index++){const counter=Buffer.alloc(16);counter.writeUInt32LE(index,0);const cipher=createCipheriv('aes-256-ecb',derived.subarray(0,32),null);cipher.setAutoPadding(false);const keyStream=Buffer.concat([cipher.update(counter),cipher.final()]);for(let j=0;j<16&&at+j<bytes.length;j++)encrypted[at+j]=bytes[at+j]^keyStream[j];keyStream.fill(0);counter.fill(0);}const tag=createHmac('sha1',derived.subarray(32,64)).update(encrypted).digest().subarray(0,10);return Buffer.concat([salt,derived.subarray(64,66),encrypted,tag]);}finally{derived.fill(0);encrypted.fill(0);}
}
function field(value){const header=Buffer.alloc(4);header.writeUInt16LE(0x9901);header.writeUInt16LE(value.length,2);return Buffer.concat([header,value]);}
function referenceZIP({data=Buffer.from('Independent AE wire fixture\n'),method=8,version=2,pass=password,extraTail=Buffer.alloc(0),extraFields=Buffer.alloc(0),compressedOverride}={}){
  const name=Buffer.from('fixture.txt'),compressed=compressedOverride??(method===8?deflateRawSync(data):data),packed=referencePacked(compressed,pass),aes=Buffer.concat([Buffer.from([version,0,0x41,0x45,3,method,0]),extraTail]),extra=Buffer.concat([field(aes),extraFields]),crc=version===1?referenceCRC(data):0;
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(51,4);local.writeUInt16LE(0x801,6);local.writeUInt16LE(99,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);local.writeUInt16LE(extra.length,28);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(51,4);central.writeUInt16LE(51,6);central.writeUInt16LE(0x801,8);central.writeUInt16LE(99,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt16LE(extra.length,30);
  const centralStart=30+name.length+extra.length+packed.length,end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(46+name.length+extra.length,12);end.writeUInt32LE(centralStart,16);return Buffer.concat([local,name,extra,packed,central,name,extra,end]);
}
function headers(bytes){const end=bytes.length-22,central=bytes.readUInt32LE(end+16),local=bytes.readUInt32LE(central+42),localExtra=local+30+bytes.readUInt16LE(local+26),centralExtra=central+46+bytes.readUInt16LE(central+28),data=localExtra+bytes.readUInt16LE(local+28);return{end,central,local,localExtra,centralExtra,data,packed:bytes.readUInt32LE(central+20)};}
function edit(bytes,fn){const copy=Buffer.from(bytes);fn(copy,headers(copy));return copy;}
function observed(id,detail={}){observations.push({id,...detail});}

test('ZIP AES password policy distinguishes explicit empty reads and rejects unsupported writer input',()=>{
  for(const pass of[' ',String.fromCharCode(0x7f),'x'.repeat(99)]){const owned=validateZipPassword(pass);assert.equal(owned.length,pass.length);owned.fill(0);}
  assert.equal(validateZipPassword('',{allowEmpty:true}).length,0);
  for(const pass of[undefined,null,1,'','x'.repeat(100),'a\0b','a\rb','a\nb','café','😀'])assert.throws(()=>validateZipPassword(pass),/ASCII/);
  for(const pass of[undefined,null,'a\tb','x'.repeat(100)])assert.throws(()=>validateZipPassword(pass,{allowEmpty:true}),/ASCII/);
  observed('password-policy');
});
test('AES helper matches a separately authored little-endian per-block counter and HMAC wire payload',()=>{
  const sizes=[0,1,15,16,17,16383,16384,16385,40000];
  for(const size of sizes){const bytes=Buffer.from(Array.from({length:size},(_,i)=>(i*37+11)&255)),packed=referencePacked(bytes);assert.deepEqual(decryptWinZipAES(packed,{password}),bytes);const candidate=encryptWinZipAES(bytes,{password});assert.equal(candidate.length,size+28);assert.deepEqual(decryptWinZipAES(candidate,{password}),bytes);assert.throws(()=>decryptWinZipAES(candidate,{password:'incorrect'}),/incorrect|damaged/);}
  observed('independent-payload-construction',{sizes});
});
test('AE1 and AE2 independently constructed stored/DEFLATE envelopes preserve bytes and report CRC policy',()=>{
  for(const version of[1,2])for(const method of[0,8])for(const size of[0,1,257]){const data=Buffer.from(Array.from({length:size},(_,i)=>i&255)),zip=referenceZIP({data,method,version}),row=readZip(zip,true,{password})[0];assert.deepEqual(row.data,data);assert.equal(row.aesVersion,version);assert.equal(row.authenticationVerified,true);assert.equal(row.contentChecksum,version===1);assert.equal(row.encryption,'winzip-aes256');if(version===1)assert.equal(row.crc32,referenceCRC(data).toString(16).padStart(8,'0'));else assert.equal(Object.hasOwn(row,'crc32'),false);assert.equal(Object.hasOwn(readZip(zip,false,{password})[0],'data'),false);}
  assert.deepEqual(readZip(referenceZIP({extraTail:Buffer.from([1,2,3])}),true,{password})[0].data,Buffer.from('Independent AE wire fixture\n'));
  observed('independent-ae1-ae2-envelopes',{versions:[1,2],methods:[0,8],sizes:[0,1,257],futureExtraTailAccepted:true});
});
test('AE1 validates recorded CRC while AE2 requires zero header CRC after authentication',()=>{
  const ae1=referenceZIP({version:1}),badCRC=edit(ae1,(b,h)=>{b.writeUInt32LE(123,14);b.writeUInt32LE(123,h.central+16);});assert.throws(()=>readZip(badCRC,true,{password}),/CRC/);
  const ae2=referenceZIP({version:2}),badAE2=edit(ae2,(b,h)=>{b.writeUInt32LE(123,14);b.writeUInt32LE(123,h.central+16);});assert.throws(()=>readZip(badAE2,true,{password}),/zero CRC/);
  const emptyPassword=referenceZIP({pass:''});assert.equal(readZip(emptyPassword,true,{password:''})[0].authenticationVerified,true);assert.throws(()=>readZip(emptyPassword),/ASCII/);observed('crc-policy-explicit-empty');
});
test('candidate AE2 writer retains Unicode names, binary/empty files, dates and plain directories',()=>{
  const rows=[{name:'café/bytes.bin',data:Buffer.from(Array.from({length:4096},(_,i)=>i&255)),modifiedAt:'2020-01-02T03:04:05.678Z'},{name:'empty.bin',data:Buffer.alloc(0)},{name:'empty/',directory:true,data:Buffer.alloc(0)}];
  for(const compression of['store','deflate']){const zip=makeZip(rows,compression,{encryption:'aes256',password,comment:'Visible Unicode comment 🌍'}),restored=readZip(zip,true,{password});for(const source of rows){const row=restored.find(e=>e.name===source.name);assert.deepEqual(row.data,source.data);if(source.directory)assert.equal(row.encrypted,undefined);else{assert.equal(row.encrypted,true);assert.equal(row.aesVersion,2);assert.equal(row.contentChecksum,false);}}assert.equal(restored[0].modifiedAt,rows[0].modifiedAt);assert(zip.includes(Buffer.from(rows[0].name)));assert(zip.includes(Buffer.from('Visible Unicode comment')));assert.equal(zip.includes(Buffer.from(password)),false);assert.equal(rows[0].data[1],1);}
  const first=makeZip([{name:'a',data:Buffer.from('same')}],'store',{encryption:'aes256',password}),second=makeZip([{name:'a',data:Buffer.from('same')}],'store',{encryption:'aes256',password});assert.notDeepEqual(first,second);observed('candidate-writer',{compression:['store','deflate'],sourceBuffersPreserved:true,randomSaltObserved:true});
});
test('salt, verifier, ciphertext and authentication trailer changes all reject encrypted reads',()=>{
  const zip=referenceZIP({data:Buffer.alloc(128,77)}),h=headers(zip);for(const offset of[0,15,16,17,18,h.packed-11,h.packed-10,h.packed-1])assert.throws(()=>readZip(edit(zip,b=>{b[h.data+offset]^=1;}),true,{password}),/incorrect|damaged|corrupt/);
  for(const n of[0,1,17,27])assert.throws(()=>decryptWinZipAES(Buffer.alloc(n),{password}),/truncated/);observed('tampering',{regions:['salt','verifier','ciphertext','tag']});
});
test('whole-archive authentication runs before any member inflation including earlier plain members',()=>{
  const corruptCompressed=referenceZIP({compressedOverride:Buffer.from([0xff,0xff,0xff])}),good=makeZip([{name:'first',data:Buffer.from('plain')},{name:'second',data:Buffer.from('later')}],'deflate',{encryption:'aes256',password});
  // Make first AES member authenticate but contain invalid DEFLATE; damage the
  // later member MAC. Authentication failure must precede earlier inflation.
  const one=headers(good),secondCentral=one.central+46+good.readUInt16LE(one.central+28)+good.readUInt16LE(one.central+30)+good.readUInt16LE(one.central+32),secondLocal=good.readUInt32LE(secondCentral+42),secondData=secondLocal+30+good.readUInt16LE(secondLocal+26)+good.readUInt16LE(secondLocal+28),firstSize=good.readUInt32LE(one.central+20),firstPlain=Buffer.alloc(firstSize-28,0xff),replacement=referencePacked(firstPlain);
  replacement.copy(good,one.data);good[secondData+good.readUInt32LE(secondCentral+20)-1]^=1;assert.throws(()=>readZip(good,true,{password}),/incorrect|damaged/);assert.throws(()=>readZip(corruptCompressed,true,{password}),/compressed data/);
  // Mixed archives: a damaged earlier unencrypted DEFLATE member must likewise
  // remain uninflated until a later encrypted member's MAC is verified.
  const plain=makeZip([{name:'first',data:Buffer.from('plain')}],'deflate'),encrypted=referenceZIP(),ph=headers(plain),eh=headers(encrypted),firstBody=Buffer.from(plain.subarray(0,ph.central)),lastBody=encrypted.subarray(0,eh.central),firstCD=plain.subarray(ph.central,ph.end),lastCD=Buffer.from(encrypted.subarray(eh.central,eh.end)),end=Buffer.from(encrypted.subarray(eh.end));firstBody[ph.data]=0xff;lastCD.writeUInt32LE(firstBody.length,42);end.writeUInt16LE(2,8);end.writeUInt16LE(2,10);end.writeUInt32LE(firstCD.length+lastCD.length,12);end.writeUInt32LE(firstBody.length+lastBody.length,16);const combined=Buffer.concat([firstBody,lastBody,firstCD,lastCD,end]);combined[firstBody.length+eh.data+eh.packed-1]^=1;assert.throws(()=>readZip(combined,true,{password}),/incorrect|damaged/);observed('authenticate-all-before-inflate',{encryptedFirst:true,plainFirst:true});
});
test('inconsistent metadata, unsupported AES profiles and unsafe paths reject before password work',()=>{
  const zip=referenceZIP();const changes=[b=>b.writeUInt16LE(0x800,6),(b,h)=>b.writeUInt16LE(0x800,h.central+8),(b,h)=>{b[h.localExtra+4+2]=0x58;b[h.centralExtra+4+2]=0x58;},(b,h)=>{b[h.localExtra+4+4]=1;b[h.centralExtra+4+4]=1;},(b,h)=>{b[h.localExtra+4]=3;b[h.centralExtra+4]=3;},(b,h)=>{b.writeUInt16LE(93,h.localExtra+4+5);b.writeUInt16LE(93,h.centralExtra+4+5);},(b,h)=>b[h.localExtra+4]^=1,(b,h)=>{b.writeUInt16LE(0x809,6);b.writeUInt16LE(0x809,h.central+8);},(b,h)=>{b[30]=b[h.central+46]=0x2f;}];
  for(const change of changes)assert.throws(()=>readZip(edit(zip,change),false,{password:undefined}),/unsupported|metadata|headers|method|path|relative/i);
  const plain=makeZip([{name:'a',data:Buffer.from('a')}],'store');assert.throws(()=>readZip(edit(plain,(b,h)=>{b.writeUInt16LE(1,6);b.writeUInt16LE(1,h.central+8);})),/unsupported/);observed('metadata-refusals',{cases:changes.length+1});
});
test('explicit method and AES local limits refuse unsupported options without altering plain ZIP behavior',()=>{
  const rows=[{name:'a',data:Buffer.from('a')}];assert.throws(()=>makeZip(rows,'store',{password}),error=>error.message==='Choose AES-256 ZIP encryption before supplying a ZIP password.');
  for(const options of[{encryption:'zipcrypto',password},{encryption:'aes256',password,zip64:true},{encryption:'aes256',password,dataDescriptor:true}])assert.throws(()=>makeZip(rows,'store',options),/AES|classic/);
  assert.throws(()=>makeZip(rows,'zstd',{encryption:'aes256',password}),/classic/);assert.throws(()=>makeZip([{name:'big',data:Buffer.alloc(16*1024*1024+1)}],'store',{encryption:'aes256',password}),/size limit/);
  for(const zip64 of[false,true])for(const dataDescriptor of[false,true])assert.equal(readZip(makeZip(rows,'deflate',{zip64,dataDescriptor}),true)[0].data.toString(),'a');observed('options-limits-plain-regression');
});
test('shared step and elapsed budgets reject before unbounded AES work and propagate through complete archives',()=>{
  assert.throws(()=>makeZip([{name:'a',data:Buffer.from('a')}],'store',{encryption:'aes256',password,operationBudget:new OperationBudget({maxSteps:0})}),/step budget/);
  const zip=referenceZIP();assert.throws(()=>readZip(zip,true,{password,operationBudget:new OperationBudget({maxSteps:1})}),/step budget/);assert.throws(()=>new OperationBudget({maxTimeMs:0}),/elapsed-time/);assert.throws(()=>decryptWinZipAES(referencePacked(Buffer.from('x')),{password,operationBudget:{}}),/OperationBudget/);observed('cooperative-budget');
});
test('AES preflight enforces duplicate/ZIP64 extras, case collisions and aggregate entry/size limits before authentication',()=>{
  assert.throws(()=>readZip(referenceZIP({extraFields:field(Buffer.from([2,0,0x41,0x45,3,8,0]))})),/duplicate/);
  assert.throws(()=>readZip(referenceZIP({extraFields:Buffer.from([0x99])})),/extra field/);
  assert.throws(()=>readZip(referenceZIP({extraFields:Buffer.from([1,0,0,0])})),/ZIP64/);
  const original=referenceZIP(),header=headers(original),prefix=Buffer.from('MZxx'),sfx=Buffer.concat([prefix,original]);sfx.writeUInt32LE(prefix.length,header.central+prefix.length+42);sfx.writeUInt32LE(header.central+prefix.length,header.end+prefix.length+16);assert.throws(()=>readZip(sfx),/leading-prefix/);
  const zip=referenceZIP();assert.throws(()=>readZip(edit(zip,(b,h)=>{b.writeUInt32LE(16*1024*1024+1,22);b.writeUInt32LE(16*1024*1024+1,h.central+24);})),/size limit/);
  assert.throws(()=>readZip(edit(zip,(b,h)=>{b.writeUInt16LE(10001,h.end+8);b.writeUInt16LE(10001,h.end+10);})),/central directory/);
  assert.throws(()=>makeZip(Array.from({length:10001},(_,i)=>({name:'f'+i,data:Buffer.alloc(0)})),'store',{encryption:'aes256',password}),/too many/);
  const five=makeZip(Array.from({length:5},(_,i)=>({name:'f'+i,data:Buffer.alloc(0)})),'store',{encryption:'aes256',password}),end=five.length-22;let at=five.readUInt32LE(end+16);
  while(at<end){const local=five.readUInt32LE(at+42);five.writeUInt32LE(16*1024*1024,local+22);five.writeUInt32LE(16*1024*1024,at+24);at+=46+five.readUInt16LE(at+28)+five.readUInt16LE(at+30)+five.readUInt16LE(at+32);}assert.throws(()=>readZip(five),/size limit/);
  const pair=makeZip([{name:'a',data:Buffer.alloc(0)},{name:'b',data:Buffer.alloc(0)}],'store',{encryption:'aes256',password}),first=headers(pair),second=first.central+46+pair.readUInt16LE(first.central+28)+pair.readUInt16LE(first.central+30),secondLocal=pair.readUInt32LE(second+42);pair[second+46]=pair[secondLocal+30]=0x41;assert.throws(()=>readZip(pair),/Duplicate/);observed('structural-preflight-limits');
});
test.after(async()=>{const out=process.env.ARCHIVE_ZIP_AES_OBSERVATIONS;if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'zip-aes-core.json'),JSON.stringify({schema:'rea-archive-zip-aes-core-observations/v1',observations,originalExecutions:0,browserExecutions:0,independentFormatConstruction:true,independentOriginalProvenance:false,fullProductComplete:false,universalSuperiorityEstablished:false},null,2)+'\n',{flag:'wx'});}});
