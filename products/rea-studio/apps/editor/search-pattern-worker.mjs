import {parentPort,workerData} from 'node:worker_threads';
import {sourcePattern,unicodePattern,scanPatternFile} from './search-pattern.mjs';
let pattern;
try{pattern=new RegExp(unicodePattern(sourcePattern(workerData.query,workerData)),workerData.matchCase?'gu':'giu');parentPort.postMessage({ready:true});}
catch{parentPort.postMessage({invalid:true});parentPort.close();}
if(pattern)parentPort.on('message',({id,content,maxMatches})=>{
  try{
    if(typeof content!=='string'||Buffer.byteLength(content)>2*1024*1024||!Number.isInteger(maxMatches)||maxMatches<1||maxMatches>1001)throw Error('Invalid bounded worker request.');
    const rows=scanPatternFile(content,pattern,maxMatches);
    if(Buffer.byteLength(JSON.stringify(rows))>2*1024*1024)throw Error('Worker result exceeds output budget.');
    parentPort.postMessage({id,rows});
  }catch{parentPort.postMessage({id,failed:true});}
});
