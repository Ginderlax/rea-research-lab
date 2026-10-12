import fs from 'node:fs/promises';import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const mode=process.argv[2];
if(mode==='normal'){process.stdout.write('café\n');process.stderr.write('diagnostic\n');}
else if(mode==='exact'){process.stdout.write(Buffer.alloc(Number(process.argv[3]),120));process.stderr.write(Buffer.alloc(Number(process.argv[4]),121));}
else if(mode==='stdout'){setInterval(()=>process.stdout.write(Buffer.alloc(4096,120)),1);}
else if(mode==='stderr'){setInterval(()=>process.stderr.write(Buffer.alloc(4096,121)),1);}
else if(mode==='stall')setInterval(()=>{},1000);
else if(mode==='exit'){process.stderr.write('synthetic controlled failure');process.exitCode=7;}
else if(mode==='context'){process.stdout.write(JSON.stringify({hasNodeTestContext:Object.hasOwn(process.env,'NODE_TEST_CONTEXT')}));}
else if(mode==='tree'){const child=spawn(process.execPath,[fileURLToPath(new URL('./descendant.mjs',import.meta.url))],{stdio:'ignore',windowsHide:true});await fs.writeFile(process.argv[3],JSON.stringify({parent:process.pid,child:child.pid}));setInterval(()=>{},1000);}
else if(mode==='mutate-source'){await fs.writeFile(process.argv[3],'export const finite = false;\n');process.stdout.write('changed owned source\n');}
else if(mode==='delete-source'){await fs.unlink(process.argv[3]);process.stdout.write('deleted owned source\n');}
else throw new Error('Unknown synthetic runner');
