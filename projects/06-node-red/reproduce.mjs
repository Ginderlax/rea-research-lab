// SPDX-License-Identifier: Apache-2.0
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const evidence=JSON.parse(fs.readFileSync(new URL('./rea-evidence-summary.json',import.meta.url),'utf8'));
for(const entry of evidence.selectedFiles){if(sha(fs.readFileSync(new URL('./artifacts/package/'+entry.path,import.meta.url)))!==entry.sha256)throw Error('Released file digest mismatch: '+entry.path);}
const child=spawnSync(process.execPath,[fileURLToPath(new URL('./test.mjs',import.meta.url))],{stdio:'inherit'});
if(child.error)throw child.error;process.exitCode=child.status??1;
