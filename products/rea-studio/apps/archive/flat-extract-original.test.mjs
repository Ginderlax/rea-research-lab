// Prospective hosted-only comparisons. Retained ZIP AES eight-group/29-command
// oracle remains a separate unchanged module and evidence namespace.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeFlatExtractOracle,hosted,hash} from './flat-extract-original-helper.mjs';
hosted();
const [{makeZip},{write7z},{handle},{createWorkspace}]=await Promise.all([
  import('./zip.mjs'),import('./sevenzip.mjs'),import('./server.mjs'),import('../../lib/storage.mjs'),
]);
const oracle=makeFlatExtractOracle(),workspace=await createWorkspace(oracle.file('workspace'));
const stamp='2020-01-02T03:04:06.000Z',stampNs=(BigInt(new Date(stamp).getTime())*1000000n).toString();
const entries=[
  {name:'branch',directory:true},{name:'branch/deeper',directory:true},{name:'empty-directory',directory:true},
  {name:'branch/bytes.bin',data:Buffer.from(Array.from({length:1024},(_,i)=>(i*31+7)%256))},
  {name:'branch/deeper/café-😀.txt',data:Buffer.from('Owned flat extraction Unicode λ 😀 é e\u0301\n')},
  {name:'branch/empty.bin',data:Buffer.alloc(0)},
].map(row=>({...row,data:row.data??Buffer.alloc(0),modifiedAt:stamp,mtimeMs:new Date(stamp).getTime()}));
const ordinal=(a,b)=>a<b?-1:a>b?1:0;
const fileProjection=tree=>tree.files.map(row=>({path:row.path,bytes:row.bytes,sha256:row.sha256})).sort((a,b)=>ordinal(a.path,b.path));
function expectedFiles(source=entries,flat=false){return source.filter(row=>!row.directory).map(row=>({path:flat?path.posix.basename(row.name):row.name,bytes:row.data.length,sha256:hash(row.data)})).sort((a,b)=>ordinal(a.path,b.path));}
function assertTree(tree,{flat=false,source=entries,directories}={}){
  assert.deepEqual(fileProjection(tree),expectedFiles(source,flat));
  if(directories!==undefined)assert.deepEqual([...tree.directories].sort(ordinal),[...directories].sort(ordinal));
  for(const row of tree.files)assert.equal(row.mtimeNs,stampNs,'Every restored file retains the owned fixed timestamp');
}
function write(relative,bytes){const file=oracle.file(relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes,{flag:'wx'});return file;}
function prepareSource(){
  const root=oracle.file('original-source');fs.mkdirSync(root);
  for(const row of entries){const file=path.join(root,...row.name.split('/'));if(row.directory)fs.mkdirSync(file,{recursive:true});else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,row.data,{flag:'wx'});fs.utimesSync(file,new Date(stamp),new Date(stamp));}}
  return root;
}
let completed=0;const cases=[];
function group(name,body){test(name,async()=>{try{await body();completed++;cases.push({name,status:'passed'});oracle.check({kind:'flat-group-completed',name});}catch(error){oracle.record.failure??={name:error.name,message:error.message};try{oracle.captureFailure('flat-failed-group-'+(cases.length+1));}catch(captureError){(oracle.record.failureCaptureErrors??=[]).push({name:captureError.name,message:captureError.message});}cases.push({name,status:'failed'});throw error;}});}
async function originalExtract(relative,label,{password,source=entries}={}){
  const archive=oracle.file(relative),originalDirs=source.filter(row=>row.directory).map(row=>row.name);
  for(const [command,suffix,extra,flat,directories]of[
    ['x','full',[],false,originalDirs],
    ['e','plain-flat',[],true,originalDirs.map(name=>path.posix.basename(name))],
    ['e','files-only',['-xtd'],true,[]],
  ]){
    const destination=oracle.file('original-output/'+label+'-'+suffix);assert(!fs.existsSync(destination));
    await oracle.cli(label+'-'+suffix,[command,'-y',archive,'-o'+destination,...extra],{password});
    const tree=oracle.snapshot('original-output/'+label+'-'+suffix,label+'-'+suffix);assertTree(tree,{flat,source,directories});
    oracle.check({kind:'flat-original-extraction',label,command,directoryMetadataExcluded:extra.includes('-xtd'),filesMatch:true,timestampsMatch:true,directories:tree.directories,ordinaryEDirectoryBehaviorDifferentFromNativeFilesOnly:command==='e'&&extra.length===0});
  }
}
async function nativeExtract(relative,label,{password,source=entries}={}){
  const before=fs.readFileSync(oracle.file(relative));
  assert(relative.startsWith('workspace/'));const archivePath=relative.slice('workspace/'.length);
  for(const pathMode of ['flat','full']){
    const destination=label+'-native-'+pathMode;
    const result=await handle({action:'extract',input:{path:archivePath,destination,pathMode,confirm:true,...(password===undefined?{}:{password})},workspace});
    assert.equal(result.verified,true);assert.equal(result.extracted,pathMode==='flat'?source.filter(row=>!row.directory).length:source.length);
    const tree=oracle.snapshot('workspace/'+destination,label+'-native-'+pathMode);
    assertTree(tree,{flat:pathMode==='flat',source,directories:pathMode==='flat'?[]:source.filter(row=>row.directory).map(row=>row.name)});
  }
  assert(fs.readFileSync(oracle.file(relative)).equals(before));
}

group('flat extraction comparisons authenticate the complete released CLI and paired library',async()=>{
  const result=await oracle.cli('flat-version',['i']);assert.match(result.stdout.toString('utf8'),/7-Zip 26\.04.*x64|7-Zip 26\.04/s);
  oracle.check({kind:'flat-whole-cli-version',version:'26.04',wholeCLI:true,sourceAssociatedRelease:true,reproducibleBuildProvenance:false});
});

group('native and original ZIP7ZandAESZIP match file bytes dates and full paths while directory metadata behavior stays explicit',async()=>{
  const source=prepareSource(),before=oracle.snapshot('original-source','flat-original-source-before');
  for(const format of ['zip','7z','aeszip']){
    const password=format==='aeszip'?oracle.privatePassword():undefined,extension=format==='7z'?'7z':'zip';
    const nativeRelative='workspace/native-'+format+'.'+extension;
    const bytes=format==='7z'?write7z(entries,{method:'copy'}):makeZip(entries,'store',format==='aeszip'?{encryption:'aes256',password}:{});
    write(nativeRelative,bytes);oracle.preserve(nativeRelative,'native-'+format);
    await originalExtract(nativeRelative,'native-'+format,{password});await nativeExtract(nativeRelative,'native-'+format,{password});
    const originalRelative='workspace/original-'+format+'.'+extension;
    const switches=format==='7z'?['-t7z','-m0=Copy','-ms=off','-mhc=off']:['-tzip','-mm=Copy',...(format==='aeszip'?['-mem=AES256']:[])];
    await oracle.cli('flat-create-'+format,['a',...switches,oracle.file(originalRelative),'.'],{cwd:source,password});
    oracle.preserve(originalRelative,'original-'+format);await originalExtract(originalRelative,'original-'+format,{password});await nativeExtract(originalRelative,'original-'+format,{password});
    oracle.check({kind:'flat-bidirectional-archive',format,writerDirections:['native','original'],nativeModes:['flat','full'],originalModes:['e','e -xtd','x'],fileBytesAndDatesExact:true,plainEDirectoryMetadataIsSeparate:true,passwordContentsRetained:false});
  }
  const after=oracle.snapshot('original-source','flat-original-source-after');assert.deepEqual(after.files,before.files);assert.deepEqual(after.directories,before.directories);
});

group('directory-only extraction records native empty destination versus original e directory entries and e-xtd no-output behavior',async()=>{
  const directories=entries.filter(row=>row.directory),relative='workspace/directories-only.zip';write(relative,makeZip(directories,'store'));oracle.preserve(relative,'directories-only');
  for(const [command,label,extra]of[['x','directory-full',[]],['e','directory-plain-flat',[]],['e','directory-files-only',['-xtd']]]){
    const destination=oracle.file('original-output/'+label);assert(!fs.existsSync(destination));
    await oracle.cli(label,[command,'-y',oracle.file(relative),'-o'+destination,...extra]);
    if(extra.length){assert(!fs.existsSync(destination),'Pinned original source returns before output creation when -xtd selects no entries');}
    else{const tree=oracle.snapshot('original-output/'+label,label);assert.deepEqual(tree.files,[]);assert.deepEqual([...tree.directories].sort(ordinal),directories.map(row=>command==='x'?row.name:path.posix.basename(row.name)).sort(ordinal));}
  }
  await nativeExtract(relative,'directories-only',{source:directories});
  const empty=oracle.snapshot('workspace/directories-only-native-flat','native-empty-destination');assert.deepEqual(empty.files,[]);assert.deepEqual(empty.directories,[]);
  oracle.check({kind:'directory-only-policy-difference',nativeFlatCreatesEmptyNewDestination:true,nativeFlatExtractedFiles:0,originalEStillProcessesDirectoryMetadata:true,originalEXtdCreatesNoDestination:true,originalModesEquivalentClaimed:false});
});

group('flat collisions refuse before native destination parents while original explicit overwrite and full paths remain distinct',async()=>{
  const source=[{name:'a/report.txt',data:Buffer.from('first')},{name:'b/report.txt',data:Buffer.from('second')}].map(row=>({...row,modifiedAt:stamp}));
  const relative='workspace/collision.zip',bytes=makeZip(source,'store');write(relative,bytes);oracle.preserve(relative,'collision');
  await assert.rejects(handle({action:'extract',input:{path:'collision.zip',destination:'refused-parent/target',pathMode:'flat',confirm:true},workspace}),/duplicate filenames/);
  assert(!fs.existsSync(path.join(workspace.root,'refused-parent')));assert(fs.readFileSync(oracle.file(relative)).equals(bytes));
  const flat=oracle.file('original-output/collision-overwrite');await oracle.cli('collision-overwrite',['e','-y',oracle.file(relative),'-o'+flat]);
  const flatTree=oracle.snapshot('original-output/collision-overwrite','collision-overwrite');assert.deepEqual(fileProjection(flatTree),[{path:'report.txt',bytes:6,sha256:hash(Buffer.from('second'))}]);
  const full=oracle.file('original-output/collision-full');await oracle.cli('collision-full',['x','-y',oracle.file(relative),'-o'+full]);
  const fullTree=oracle.snapshot('original-output/collision-full','collision-full');assertTree(fullTree,{source,directories:['a','b']});
  const native=await handle({action:'extract',input:{path:'collision.zip',destination:'collision-native-full',pathMode:'full',confirm:true},workspace});assert.equal(native.extracted,2);
  const nativeTree=oracle.snapshot('workspace/collision-native-full','collision-native-full');assertTree(nativeTree,{source,directories:['a','b']});
  oracle.check({kind:'collision-policy-difference',nativeFlatRefusedBeforeParent:true,originalEExplicitYesOverwritesWithLaterEntry:true,originalXAndNativeFullKeepBothPaths:true,overwriteParityClaimed:false});
});

test.after(()=>{
  oracle.finish({schema:'rea-archive-flat-extract-original-summary/v1',plannedGroups:4,completedGroups:completed,cases,allFourGroupsCompleted:completed===4,plannedCommands:27,wholeCLITranscripts:true,retainedZIPAESGroupsRebound:false,fullProductAcceptance:false});
  assert.equal(completed,4);assert.equal(oracle.record.commands.length,27);assert.equal(oracle.record.status,'passed');
});
