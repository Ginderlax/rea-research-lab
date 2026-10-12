// SPDX-License-Identifier: MIT
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(new URL('./slice-manifest.json',import.meta.url),'utf8'));
for(const entry of manifest.entries){const bytes=fs.readFileSync(new URL(entry.file,import.meta.url));if(sha(bytes)!==entry.fileSha256||sha(bytes.subarray(entry.byteStart,entry.byteEnd))!==entry.sliceSha256)throw Error('Released chunk or slice digest mismatch');}
const child=spawnSync(process.execPath,[fileURLToPath(new URL('./test.mjs',import.meta.url))],{stdio:'inherit'});
if(child.error)throw child.error;process.exitCode=child.status??1;
