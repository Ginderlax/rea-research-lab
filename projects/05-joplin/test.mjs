// SPDX-License-Identifier: AGPL-3.0-or-later
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import * as recovered from './reconstruction.mjs';
const require=createRequire(import.meta.url);
const original=require('./artifacts/package/urlUtils.js');
const originalHeader=require('./artifacts/package/headerAnchor.js').default;
function anchors(headings){
 let callback;
 originalHeader({core:{ruler:{push:(name,fn)=>{callback=fn;}}}});
 class Token{constructor(type,tag,nesting){Object.assign(this,{type,tag,nesting});}}
 const tokens=headings.flatMap(content=>[{type:'heading_open'},{type:'inline',content,children:[]},{type:'heading_close'}]);
 callback({tokens,Token});
 return tokens.filter(t=>t.type==='inline').map(t=>t.children.find(c=>c.type==='heading_anchor_open').attrs.find(a=>a[0]==='name')[1]);
}
const failures=[];let passed=0;const counts={resourceRecognition:0,resourceParsing:0,fragmentDecoding:0,headingBatches:0};
function outcome(fn,arg){try{return {value:fn(arg)}}catch(e){return {error:e.name}}}
function compare(kind,arg,a,b){counts[kind]++;if(isDeepStrictEqual(a,b))passed++;else failures.push({kind,arg,original:a,reconstruction:b});}
const id='0123456789abcdef0123456789abcdef';
const ids=[id,'G'.repeat(32),'0'.repeat(31),'0'.repeat(33),'_'.repeat(32),'é'.repeat(32),''];
const prefixes=[':/','joplin://','JOPLIN://','https://',''];
const tails=['','#','#Title','#A+B','#%E6%95%B0%E6%8D%AE','#bad%ZZ','#x%20y',' "title"','#x "title"','#x\t"title"',' bad','\n"title"',' "a\nb"',' "a" "b"','#quote"word','\n','\r','\r\n','\u2028','#x\n',' "title"\n'];
for(const prefix of prefixes)for(const candidate of ids)for(const tail of tails){const arg=prefix+candidate+tail;compare('resourceRecognition',arg,outcome(original.isResourceUrl,arg),outcome(recovered.isResourceUrl,arg));compare('resourceParsing',arg,outcome(original.parseResourceUrl,arg),outcome(recovered.parseResourceUrl,arg));}
for(const arg of ['','hello+world','%20','%E6%95%B0%E6%8D%AE','%ZZ','%','100%25','%F0%9F%94%97',null,123])compare('fragmentDecoding',arg,outcome(original.urlDecode,arg),outcome(recovered.decodeQueryFragment,arg));
const headingTexts=['A title','A title','A-title','a-title-1','Résumé','数据','!!!','','A  B','123','_Leading_','a\nb','link [label](x)','🔗','Foo_','Foo-1'];
for(let batch=0;batch<150;batch++){const hs=Array.from({length:1+(batch%17)},(_,i)=>headingTexts[(batch*7+i*3)%headingTexts.length]);compare('headingBatches',hs,anchors(hs),recovered.headingAnchors(hs));}
const result={testedAt:new Date().toISOString(),oracle:'Exact released @joplin/renderer 3.7.1 urlUtils.js and headerAnchor.js loaded unchanged; minimal token host stub for header plugin.',counts,total:passed+failures.length,passed,failed:failures.length,failures,scope:'String URL recognition/parsing, percent-decoding errors, and heading name generation. No Markdown parser, renderer UI, plugin activation, synchronization, or note storage tested.'};
const replayRoot=new URL('./artifacts/replays/',import.meta.url);fs.mkdirSync(replayRoot,{recursive:true});const replayDir=fs.mkdtempSync(new URL('test-',replayRoot));
fs.writeFileSync(replayDir+'/test-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log('Replay saved to '+replayDir);if(failures.length)process.exitCode=1;
