// Development oracle only. Production Automation imports neither these packages
// nor this script. No credentials or original n8n services are started here.
import {readFile,writeFile,mkdir,open,unlink,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const app=new URL('./',import.meta.url),base=new URL('../../../../.local/automation-original/',app),manifest=JSON.parse(await readFile(new URL('native-original-manifest.json',app),'utf8')),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),cwd=fileURLToPath(base),lock=new URL('.acquisition.lock',base);
await mkdir(base,{recursive:true});
let ready=true;
try{await access(new URL('package-lock.json',base));await import('./original-harness.mjs');}catch{ready=false;}
if(!ready){
 const guard=await open(lock,'wx');
 try{
  for(const record of manifest.archives){let bytes;try{bytes=await readFile(new URL(`${record.name}-${record.version}.tgz`,base));}catch{}
   if(!bytes||hash(bytes)!==record.archiveSha256){const response=await fetch(record.archiveUrl);if(!response.ok)throw new Error(`Official archive unavailable: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
   if(bytes.length!==record.archiveBytes||hash(bytes)!==record.archiveSha256||`sha512-${createHash('sha512').update(bytes).digest('base64')}`!==record.integrity)throw new Error(`Pinned archive authentication failed: ${record.name}`);
   await writeFile(new URL(`${record.name}-${record.version}.tgz`,base),bytes);
   if(record.name==='n8n')continue;const target=new URL(`original/${record.name}/`,base);await mkdir(target,{recursive:true});const args=['-xzf',fileURLToPath(new URL(`${record.name}-${record.version}.tgz`,base)),'-C',fileURLToPath(target)];if(record.name==='n8n-nodes-base')args.push('package/package.json','package/LICENSE.md','package/dist/nodes/ManualTrigger','package/dist/nodes/Set','package/dist/nodes/If','package/dist/nodes/Wait','package/dist/nodes/HttpRequest','package/dist/utils');const result=spawnSync('tar',args,{encoding:'utf8',timeout:60000});if(result.status!==0)throw new Error(`Authenticated archive extraction failed: ${result.stderr}`);
  }
  for(const contract of manifest.contracts){const response=await fetch(contract.url);if(!response.ok)throw new Error(`Immutable upstream source unavailable: ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());if(hash(bytes)!==contract.sha256)throw new Error('Immutable upstream source changed');await writeFile(new URL(contract.localFile,base),bytes);}
  const packageBytes=await readFile(new URL('native-original-package.json',app)),lockBytes=await readFile(new URL('native-original-package-lock.json',app));if(hash(lockBytes)!==manifest.packageLockSha256)throw new Error('Pinned dependency lock changed');await writeFile(new URL('package.json',base),packageBytes);await writeFile(new URL('package-lock.json',base),lockBytes);
  const command=process.platform==='win32'?'cmd.exe':'npm',args=process.platform==='win32'?['/d','/s','/c','npm ci --ignore-scripts --no-audit --no-fund']:['ci','--ignore-scripts','--no-audit','--no-fund'],installed=spawnSync(command,args,{cwd,stdio:'inherit',timeout:300000});if(installed.status!==0)throw new Error('Pinned oracle dependency acquisition failed');
 }finally{await guard.close();await unlink(lock);}
}
// A failed import is cached by ESM; verify in a fresh process after acquisition.
const verified=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('original-harness.mjs',app).href)}); console.log('All original archives, source/dependency files and immutable contracts verified');`],{stdio:'inherit',timeout:60000});if(verified.status!==0)process.exit(verified.status??1);
if(!process.argv.includes('--acquire-only')){const compared=spawnSync(process.execPath,['--test',fileURLToPath(new URL('native.test.mjs',app)),fileURLToPath(new URL('native-http.test.mjs',app))],{stdio:'inherit',timeout:60000});process.exit(compared.status??1);}
