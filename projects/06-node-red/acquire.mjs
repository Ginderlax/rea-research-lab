// SPDX-License-Identifier: Apache-2.0
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('provenance.json',root),'utf8'));
const response=await fetch(meta.tarballUrl);if(!response.ok)throw Error('HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(crypto.createHash('sha256').update(bytes).digest('hex')!==meta.sha256)throw Error('SHA-256 mismatch');
if('sha512-'+crypto.createHash('sha512').update(bytes).digest('base64')!==meta.expectedIntegrity)throw Error('Registry integrity mismatch');
fs.mkdirSync(new URL('artifacts/',root),{recursive:true});
fs.writeFileSync(new URL('artifacts/package.tgz',root),bytes);
execFileSync('tar',['-xzf',fileURLToPath(new URL('artifacts/package.tgz',root)),'-C',fileURLToPath(new URL('artifacts/',root))]);
console.log('Acquired exact version '+meta.name+' '+meta.version+'; digests verified.');
