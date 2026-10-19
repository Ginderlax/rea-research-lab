// Diagnostic-only observer. Product calls, arguments, limits and callbacks are forwarded.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
assert.equal(process.platform,'win32');assert.equal(process.version,'v24.16.0');
assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
assert.equal(process.env.GITHUB_REPOSITORY,'Ginderlax/rea-research-lab');
const repository=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const raw=fs.readFileSync(path.join(repository,'products/rea-studio/apps/archive/source-metadata.mjs'));
assert.equal(createHash('sha256').update(raw).digest('hex'),'79bf64f3cf9f8a25ce73faf45201aa5b9a547ff4cb3d019fe046dbf7ba4bbeed');
const source=raw.toString('utf8').replace(/\r\n?/g,'\n'),marker='export const WINDOWS_METADATA_SCRIPT = String.raw`';
assert.equal(source.split(marker).length,2);const start=source.indexOf(marker)+marker.length,end=source.indexOf('\n`;',start);assert(end>start);
const script=source.slice(start,end+1),encoded=Buffer.from(script,'utf16le').toString('base64');
const scriptSHA256=createHash('sha256').update(Buffer.from(script,'utf16le')).digest('hex');
const directory=fs.realpathSync(process.env.REA_ARCHIVE_NATIVE_TRACE),temporary=fs.realpathSync(process.env.RUNNER_TEMP),relative=path.relative(temporary,directory);
assert(relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative));assert(!fs.lstatSync(directory).isSymbolicLink());
const executable=path.win32.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
const file=path.join(directory,'native-events-'+process.pid+'.jsonl');
const original=childProcess.execFile;let sequence=0,records=0,written=0,observabilityFailed=false;
const testFile=['app.integration.test.mjs','app.test.mjs'].includes(path.basename(process.argv[1]??''))?path.basename(process.argv[1]):'test-runner';
function record(row){try{const bytes=Buffer.from(JSON.stringify(row)+'\n');written+=bytes.length;assert(written<=128*1024);fs.writeFileSync(file,bytes,{flag:records===0?'wx':'a'});records++;}catch{observabilityFailed=true;process.exitCode=1;process.stderr.write('Archive native diagnostic trace could not be retained.\n');}}
process.on('exit',()=>{if(observabilityFailed)process.exitCode=1;});
childProcess.execFile=function(...args){
 const command=args[0],argv=args[1],options=args[2],callback=args[3];
 const selected=typeof command==='string'&&path.win32.normalize(command).toLowerCase()===executable.toLowerCase()&&Array.isArray(argv)&&argv.length===5&&argv.slice(0,4).join('\0')===['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand'].join('\0')&&argv[4]===encoded;
 if(!selected)return Reflect.apply(original,this,args);
 assert.equal(args.length,4);assert.equal(typeof callback,'function');assert.equal(options.timeout,15000);assert.equal(options.maxBuffer,64*1024*1024);assert.equal(options.encoding,'utf8');assert.equal(options.windowsHide,true);assert.equal(options.shell,false);
 const started=performance.now(),call=++sequence;assert(call<=64);let child;
 const observed=function(error,stdout,stderr){
  record({schema:'rea-archive-native-exec-observation/v1',runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,sourceCommit:process.env.GITHUB_SHA,processId:process.pid,sequence:call,testFile,scriptSHA256,timeoutMs:15000,maxBuffer:64*1024*1024,elapsedMs:performance.now()-started,childPid:child?.pid??null,callbackObserved:true,error:error?{name:error.name,code:typeof error.code==='string'||typeof error.code==='number'?error.code:null,killed:error.killed===true,signal:typeof error.signal==='string'?error.signal:null}:null,stdoutBytes:Buffer.byteLength(stdout??''),stderrBytes:Buffer.byteLength(stderr??''),inputRecorded:false,outputContentsRecorded:false,argumentsModified:false,limitsModified:false,retried:false});
  return Reflect.apply(callback,this,[error,stdout,stderr]);
 };
 child=Reflect.apply(original,this,[command,argv,options,observed]);return child;
};
syncBuiltinESMExports();
