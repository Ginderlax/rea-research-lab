// SPDX-License-Identifier: MIT
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('./',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('slice-manifest.json',root),'utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(new URL('artifacts/analysis-input/',root),{recursive:true});
for(const e of manifest.entries){
 const full=fs.readFileSync(new URL(e.file,root));
 if(sha(full)!==e.fileSha256)throw Error('Production chunk hash mismatch');
 const slice=full.subarray(e.byteStart,e.byteEnd);
 if(sha(slice)!==e.sliceSha256)throw Error('Slice digest mismatch');
 fs.writeFileSync(new URL('artifacts/analysis-input/'+e.publicExport+'.js',root),(e.isFunction?'':'var ')+slice.toString('utf8')+';\nexport { '+e.local+' as '+e.publicExport+' };\n');
}
fs.writeFileSync(new URL('artifacts/analysis-input/package.json',root),JSON.stringify({name:'excalidraw-camera-and-version-focused-slices',version:'0.18.1',type:'module'},null,2));
console.log('Verified and prepared '+manifest.entries.length+' exact production-byte slices.');
