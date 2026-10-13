import {Worker} from 'node:worker_threads';
export const PATTERN_LIMITS=Object.freeze({activeWorkers:4,oldGenerationMb:64,youngGenerationMb:16,stackMb:4,queryBytes:32*1024,contentBytes:2*1024*1024,resultBytes:2*1024*1024,deadlineMs:5000});
const active=new Set();
function failure(code){const error=new Error({invalid:'Invalid or unsupported regular expression.',busy:'Regular-expression search is busy. Try again when a search finishes.',timeout:'Regular-expression search reached its time limit.',disposed:'Regular-expression search was disposed.',failed:'Regular-expression worker failed; results are incomplete.'}[code]);error.code=code;return error;}
export function patternWorkerState(){return{active:active.size,limit:PATTERN_LIMITS.activeWorkers};}
export async function disposePatternSearches(workspace){await Promise.allSettled([...active].filter(s=>s.workspace===workspace).map(s=>s.close('disposed')));}
export async function createPatternSession(workspace,options,deadline) {
  if(active.size>=PATTERN_LIMITS.activeWorkers)throw failure('busy');
  const {query,matchCase,useRegex,wholeWord}=options;
  if(typeof query!=='string'||Buffer.byteLength(query)>PATTERN_LIMITS.queryBytes||[matchCase,useRegex,wholeWord].some(x=>typeof x!=='boolean')||!Number.isFinite(deadline))throw failure('invalid');
  deadline=Math.min(deadline,performance.now()+PATTERN_LIMITS.deadlineMs);if(deadline<=performance.now())throw failure('timeout');
  const worker=new Worker(new URL('./search-pattern-worker.mjs',import.meta.url),{workerData:{query,matchCase,useRegex,wholeWord},resourceLimits:{maxOldGenerationSizeMb:PATTERN_LIMITS.oldGenerationMb,maxYoungGenerationSizeMb:PATTERN_LIMITS.youngGenerationMb,stackSizeMb:PATTERN_LIMITS.stackMb}});
  let pending=null,sequence=0,closed=false,closing=null,lifetimeTimer,closedCode=null;
  const exited=new Promise(resolve=>worker.once('exit',resolve));
  const session={workspace,async close(code='disposed'){
    if(closing)return closing;
    closed=true;closedCode=code;clearTimeout(lifetimeTimer);if(pending){clearTimeout(pending.timer);pending.reject(failure(code));pending=null;}
    closing=(async()=>{await worker.terminate();await exited;active.delete(session);})();return closing;
  },async match(content,maxMatches){
    if(typeof content!=='string'||Buffer.byteLength(content)>PATTERN_LIMITS.contentBytes||!Number.isInteger(maxMatches)||maxMatches<1||maxMatches>1001)throw failure('failed');
    return request({id:++sequence,content,maxMatches});
  }};
  active.add(session);
  // The absolute lifetime also covers idle gaps during parent filesystem reads.
  // Direct helper callers cannot extend it beyond the declared five seconds.
  lifetimeTimer=setTimeout(()=>{session.close('timeout').catch(()=>{});},Math.max(1,deadline-performance.now()));
  function request(message){
    if(closed)return Promise.reject(failure(closedCode??'disposed'));
    if(pending)return Promise.reject(failure('busy'));
    return new Promise((resolve,reject)=>{
      const remaining=deadline-performance.now();if(remaining<=0){reject(failure('timeout'));return;}
      const timer=setTimeout(()=>{if(pending){pending=null;reject(failure('timeout'));}session.close('timeout').catch(()=>{});},remaining);
      pending={resolve,reject,timer,id:message?.id};if(message)worker.postMessage(message);
    });
  }
  worker.on('message',data=>{
    if(!pending)return;
    if(data.ready&&pending.id===undefined||data.invalid||data.id===pending.id){
      const operation=pending;pending=null;clearTimeout(operation.timer);
      if(data.invalid)operation.reject(failure('invalid'));
      else if(data.failed)operation.reject(failure('failed'));
      else if(data.ready)operation.resolve();
      else if(Array.isArray(data.rows)&&Buffer.byteLength(JSON.stringify(data.rows))<=PATTERN_LIMITS.resultBytes)operation.resolve(data.rows);
      else operation.reject(failure('failed'));
    }
  });
  worker.on('error',()=>{if(pending){clearTimeout(pending.timer);pending.reject(failure('failed'));pending=null;}});
  worker.on('exit',()=>{closed=true;closedCode??='failed';clearTimeout(lifetimeTimer);active.delete(session);if(pending){clearTimeout(pending.timer);pending.reject(failure('failed'));pending=null;}});
  try{await request();return session;}catch(error){await session.close(error.code??'failed');throw error;}
}
