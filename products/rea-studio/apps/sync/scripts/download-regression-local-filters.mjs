import * as fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { compileFilters } from '../native-filters.mjs';
import { createRecordedOracle,digest,hosted } from './download-oracle.mjs';
// Fresh hosted regression adapter. Historical corpus, decisions and receipts remain unchanged.
hosted();
const temporary=await fs.realpath(process.env.RUNNER_TEMP),evidenceParent=await fs.realpath(process.env.REA_SYNC_ORIGINAL_EVIDENCE);
const relative=path.relative(temporary,evidenceParent);assert(relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative));
for(let at=evidenceParent;;at=path.dirname(at)){assert(!(await fs.lstat(at)).isSymbolicLink());if(path.dirname(at)===at)break;}
const evidence=path.join(evidenceParent,'regression-local-filters');await fs.mkdir(evidence);
const root=await fs.mkdtemp(path.join(temporary,'rea-sync-local-filters-'));
const records = [], failures = [];
let oracle,finished=false,summaryWritten=false,primaryError;
const summary={schema:'rea-sync-preserved-local-filters/v1',status:'running',historicalSourceCommit:'beab1f3668cf652e7663f3fd7216ac607506ac06',historicalSource:'scripts/verify-filters.mjs',allFixturesSynthetic:true,records,failures,fullProductComplete:false,universalSuperiorityEstablished:false};
async function saveSummary(){const file=path.join(evidence,'summary.json'),next=summaryWritten?file+'.tmp':file;await fs.writeFile(next,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});if(summaryWritten)await fs.rename(next,file);summaryWritten=true;}
async function cleanup(){const errors=[];if(oracle&&!finished)try{await oracle.finish('failed');}catch(e){errors.push(e);}try{assert(!(await fs.lstat(root)).isSymbolicLink());assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),temporary);assert(path.basename(root).startsWith('rea-sync-local-filters-'));await fs.rm(root,{recursive:true,force:true});}catch(e){errors.push(e);}if(errors.length){summary.status='failed';summary.cleanupErrors=errors.map(e=>e.message);try{await saveSummary();}catch(e){summary.cleanupErrors.push(e.message);}if(primaryError)primaryError.cleanupErrors=summary.cleanupErrors;else throw new AggregateError(errors,'Regression cleanup or evidence finalization failed');}}
const corpus = [];
for (const prefix of ['','dir/','dir/sub/','other/','other/dir/','Unicode/']) for (const name of ['a.txt','b.jpg','data.PDF','note.md','file1','file2','x.bin','_.txt','!.txt','1.txt','雪.txt','café.txt','K.txt','ſ.txt','Σ.txt','ς.txt','a b.txt','a\u00a0b.txt','😀.txt','𐐀.txt','a{b}.txt','\ufeffa.txt']) corpus.push(prefix+name);
const cases = [
  {},{include:['*.txt']},{exclude:['*.txt']},{include:['*.txt'],exclude:['a.txt']},{include:['/a.txt']},
  {filter:['- a.txt','+ *.txt','- **']},{filter:['+ a.txt','- *.txt']},{filter:['- **','!','+ b.jpg','- **']},
  {filterFrom:['# comment\n ;comment\n- a.txt\n+ *.{txt,jpg}\n- **\n']},{includeFrom:['*.txt\n# ignored\n'],excludeFrom:['a.txt\n']},
  {include:['dir/**']},{include:['/dir/**']},{exclude:['/dir/']},{include:['/dir/']},{filter:['+ /dir/']},
  {include:['{dir,other}/**']},{include:['{dir/**,other/**}']},{include:['*.{txt,{jpg,PDF}}']},
  {include:['dir/**/a.txt']},{include:['[ab].txt']},{include:['[^a].txt']},{include:['[!a].txt']},
  {include:['[[:alpha:]].txt']},{include:['\\d.txt']},{include:['\\w.txt']},{include:['\\W.txt']},
  {include:['*\\s*.txt']},{include:['*\\S*.txt']},{include:['[\\d].txt']},{include:['[\\s].txt']},
  {include:['*[\\s]*.txt']},{include:['*[\\S]*.txt']},{include:['[\\W].txt'],ignoreCase:true},
  {include:['*.pdf'],ignoreCase:true},{include:['k.txt','s.txt','σ.txt'],ignoreCase:true},{include:['\\w.txt'],ignoreCase:true},
  {minSize:3,maxSize:7},{include:['*.txt'],minSize:5},{filesFrom:['/a.txt\n dir/b.jpg\nmissing\n']},
  {filesFrom:['']},{filesFromRaw:['a b.txt\na\u00a0b.txt\n#not-a-comment\n']},{filesFrom0:['a.txt\0dir/b.jpg\0']},
  {filesFrom:['a.txt'],include:['*.txt']},{include:['***']},{filter:['invalid']},{include:['[a']},{include:['{a,b']},
  {include:['?.txt']},{include:['😀.txt','𐐨.txt'],ignoreCase:true},{include:['[😀].txt']},
  {includeFrom:['\u0085a.txt\u0085\n\ufeffa.txt\n']},{filesFrom:['\u0085a.txt\u0085\n\ufeffa.txt\n']},
  {include:['a\\{b\\}.txt']},{include:['*.txt'],filter:['!','+ b.jpg']},
  {filter:['+ /dir/a.txt','+ /dir/sub/*','- **']},{include:['/dir/**'],filterFrom:['!\n+ b.jpg\n- **\n']},
];
try {
  await saveSummary();oracle=await createRecordedOracle(root,{evidence});
  Object.assign(summary,{sourceCommit:oracle.sourceCommit,version:oracle.version,originalSHA256:oracle.originalSHA256,zipSHA256:oracle.zipSHA256,moduleSHA256:digest(await fs.readFile(new URL('../native-filters.mjs',import.meta.url))),files:corpus.length,cases:cases.length,inputCorpusSHA256:digest(Buffer.from(JSON.stringify({corpus,cases})))});
  const source = path.join(root,'source'); await fs.mkdir(source);
  const sizes = new Map();
  for (let i = 0; i < corpus.length; i++) { const file = path.join(source,corpus[i]); await fs.mkdir(path.dirname(file),{recursive:true}); const size = i%13; sizes.set(corpus[i],size); await fs.writeFile(file,Buffer.alloc(size,i%256),{flag:'wx'}); }
  const sourceBefore=await oracle.snapshot(source,{caseID:'local-filter-corpus',phase:'before'});
  for (let index = 0; index < cases.length; index++) {
    const options = cases[index], args = ['lsjson',source,'--recursive','--files-only'],listInputs=[];
    // Deliberately reverse flag-family ordering; rclone normalizes families.
    for (const [key,flag] of [['filterFrom','filter-from'],['filter','filter'],['excludeFrom','exclude-from'],['exclude','exclude'],['includeFrom','include-from'],['include','include'],['filesFrom','files-from'],['filesFromRaw','files-from-raw'],['filesFrom0','files-from0']]) for (const [offset,value] of (options[key] ?? []).entries()) {
      let text = value; if (key.includes('From')) { text = path.join(root,`${index}-${key}-${offset}.txt`); await fs.writeFile(text,value,{flag:'wx'});listInputs.push({key,offset,file:path.basename(text),...await oracle.retainBytes(Buffer.from(value))}); } args.push('--'+flag,text);
    }
    if (options.ignoreCase) args.push('--ignore-case');
    for (const [key,flag] of [['minSize','min-size'],['maxSize','max-size']]) if (options[key] !== undefined) args.push('--'+flag,String(options[key])+'B');
    let expected, actual, originalError, nativeError;
    // Exit 1 is the pinned CLI's ordinary argument/filter rejection. Other process failures are fatal.
    const original=await oracle.run(args,{caseID:'local-filter-'+index,expectedExitCodes:[0,1]});
    if(original.exitCode===1)originalError='Original CLI exited 1: '+original.stderr;else expected=JSON.parse(original.stdout).map(item=>item.Path).sort();
    try { const filter = compileFilters(options), budget = {remaining:100000000}; actual = corpus.filter(name => { const segments = name.split('/'); for (let i = 1; i < segments.length; i++) if (!filter.includeDirectory(segments.slice(0,i).join('/'),budget)) return false; return filter.includeFile(name,sizes.get(name),budget); }).sort(); } catch (error) { nativeError = error.message; }
    const passed = Boolean(originalError) === Boolean(nativeError) && (originalError || JSON.stringify(expected) === JSON.stringify(actual));
    const record = {caseID:'local-filter-'+index,index,options,listInputs,originalExitCode:original.exitCode,passed:Boolean(passed),expected,actual,originalError,nativeError}; records.push(record); if (!passed) failures.push(record);
    summary.originalCLIExecutions=oracle.executions;await saveSummary();console.log(JSON.stringify({index,passed:Boolean(passed),originalCount:expected?.length,nativeCount:actual?.length}));
  }
  const sourceAfter=await oracle.snapshot(source,{caseID:'local-filter-corpus',phase:'after'});assert.deepEqual(sourceAfter.files,sourceBefore.files,'Filter comparison changed source files');assert.deepEqual(sourceAfter.directories,sourceBefore.directories);
  summary.status=failures.length?'failed':'passed';summary.completedAtUtc=new Date().toISOString();await saveSummary();await oracle.finish(summary.status);finished=true;
  if (failures.length) process.exitCode = 1;
} catch(error) {
  primaryError=error;summary.status='failed';summary.error={message:error.message};try{await saveSummary();}catch(e){error.summaryWriteError=e.message;}throw error;
} finally {
  await cleanup();
}
