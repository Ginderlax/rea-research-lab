import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { compileFilters } from '../native-filters.mjs';
const exec = promisify(execFile), digest = data => createHash('sha256').update(data).digest('hex');
const repository = new URL('../../../../../',import.meta.url);
const root = await fs.mkdtemp(path.join(os.tmpdir(),'rea-rclone-filters-'));
const records = [], failures = [];
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
  const zip = await fs.readFile(new URL('projects/10-rclone/artifacts/rclone-v1.75.2-windows-amd64.zip',repository));
  if (digest(zip) !== '8a9db2bad1dc79a65b3348fd857069598e2aab7cf4d118b77b1df23055aff818') throw Error('Original ZIP differs.');
  const original = await fs.readFile(new URL('projects/10-rclone/artifacts/unpacked/rclone-v1.75.2-windows-amd64/rclone.exe',repository));
  if (digest(original) !== '41eab3e118d264920b62c3327966c5ece0dc4dd715ee617d9e30450d8ead95a4') throw Error('Original executable differs.');
  const executable = path.join(root,'rclone.exe'); await fs.writeFile(executable,original,{flag:'wx'});
  if (digest(await fs.readFile(executable)) !== digest(original)) throw Error('Private oracle copy differs.');
  const config = path.join(root,'synthetic-empty.conf'); await fs.writeFile(config,'',{flag:'wx'});
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('RCLONE_')));
  const run = async args => (await exec(executable,['--config',config,'--ask-password=false','--log-level','ERROR',...args],{env:environment,cwd:root,timeout:30000,maxBuffer:2*1024*1024,windowsHide:true})).stdout;
  const version = await run(['version']);
  const source = path.join(root,'source'); await fs.mkdir(source);
  const sizes = new Map();
  for (let i = 0; i < corpus.length; i++) { const file = path.join(source,corpus[i]); await fs.mkdir(path.dirname(file),{recursive:true}); const size = i%13; sizes.set(corpus[i],size); await fs.writeFile(file,Buffer.alloc(size,i%256),{flag:'wx'}); }
  for (let index = 0; index < cases.length; index++) {
    const options = cases[index], args = ['lsjson',source,'--recursive','--files-only'];
    // Deliberately reverse flag-family ordering; rclone normalizes families.
    for (const [key,flag] of [['filterFrom','filter-from'],['filter','filter'],['excludeFrom','exclude-from'],['exclude','exclude'],['includeFrom','include-from'],['include','include'],['filesFrom','files-from'],['filesFromRaw','files-from-raw'],['filesFrom0','files-from0']]) for (const [offset,value] of (options[key] ?? []).entries()) {
      let text = value; if (key.includes('From')) { text = path.join(root,`${index}-${key}-${offset}.txt`); await fs.writeFile(text,value,{flag:'wx'}); } args.push('--'+flag,text);
    }
    if (options.ignoreCase) args.push('--ignore-case');
    for (const [key,flag] of [['minSize','min-size'],['maxSize','max-size']]) if (options[key] !== undefined) args.push('--'+flag,String(options[key])+'B');
    let expected, actual, originalError, nativeError;
    try { expected = JSON.parse(await run(args)).map(item => item.Path).sort(); } catch (error) { originalError = String(error.stderr ?? error.message); }
    try { const filter = compileFilters(options), budget = {remaining:100000000}; actual = corpus.filter(name => { const segments = name.split('/'); for (let i = 1; i < segments.length; i++) if (!filter.includeDirectory(segments.slice(0,i).join('/'),budget)) return false; return filter.includeFile(name,sizes.get(name),budget); }).sort(); } catch (error) { nativeError = error.message; }
    const passed = Boolean(originalError) === Boolean(nativeError) && (originalError || JSON.stringify(expected) === JSON.stringify(actual));
    const record = {index,options,passed:Boolean(passed),expected,actual,originalError,nativeError}; records.push(record); if (!passed) failures.push(record);
    console.log(JSON.stringify({index,passed:Boolean(passed),originalCount:expected?.length,nativeCount:actual?.length}));
  }
  const result = {checkedAt:new Date().toISOString(),baseline:'rclonev1.75.2',sourceCommit:'be8d6044eacb843b74d335db0c5fbe09222031fe',version,originalSHA256:digest(original),moduleSHA256:digest(await fs.readFile(new URL('../native-filters.mjs',import.meta.url))),allFixturesSynthetic:true,priorReconstructionReadOrImported:false,files:corpus.length,originalCLIExecutions:cases.length+1,records,failures,fullProductComplete:false,universalSuperiorityEstablished:false};
  await fs.writeFile(new URL('../results/filter-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  if (failures.length) process.exitCode = 1;
} finally {
  if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('rea-rclone-filters-')) throw Error('Unsafe private-fixture cleanup target.');
  await fs.rm(root,{recursive:true,force:true});
}
