// Host lifecycle only. No server, filesystem, child-spawn or product imports.
export const HOST_STARTUP_MS=30000;
export const HOST_CLEANUP_MS=5000;
export const HOST_LOG_LIMIT=1024*1024;

export function validStageHostReady(value) {
  if(!value || typeof value!=='object' || Array.isArray(value)) return false;
  if(JSON.stringify(Object.keys(value).sort())!==JSON.stringify(['token','url'])) return false;
  if(typeof value.token!=='string' || !/^[0-9a-f]{64}$/.test(value.token) || typeof value.url!=='string') return false;
  const match=/^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(value.url);
  return match!==null && Number(match[1])<=65535;
}

export function stageHostLifecycle(p,{setTimer=setTimeout,clearTimer=clearTimeout,onClosed=()=>{}}={}) {
  let readinessSettled=false,ready=false,resolveReady,rejectReady;
  let exit=null,terminalFault=null,logs='',logBytes=0,killRequested=false;
  let startupTimer=null,cleanupTimer=null,closePromise=null,resolveClose,rejectClose,closeSettled=false,closedObserved=false;
  const readyPromise=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const clearStartup=()=>{if(startupTimer!==null){clearTimer(startupTimer);startupTimer=null;}};
  const clearCleanup=()=>{if(cleanupTimer!==null){clearTimer(cleanupTimer);cleanupTimer=null;}};
  const exitedError=()=>new Error('Stage host exited '+exit.code+logs);
  function settleReadiness(error,value) {
    if(readinessSettled) return;
    readinessSettled=true;clearStartup();
    if(error) rejectReady(error);else {ready=true;resolveReady(value);}
  }
  function settleClose(error=null) {
    if(!closePromise) return;
    if(exit && !closedObserved) {
      closedObserved=true;
      try {onClosed({code:exit.code,signal:exit.signal,logs});}
      catch {terminalFault??=new Error('Stage host close observation failed');}
    }
    if(closeSettled) return;
    clearCleanup();
    error=terminalFault??error;
    if(!error && exit && exit.code!==0) error=exitedError();
    closeSettled=true;
    if(error) rejectClose(error);else resolveClose();
  }
  function kill() {if(!exit && !killRequested){killRequested=true;try {p.kill();}catch { /* The existing terminal failure stays primary. */ }}}
  function fail(error) {
    terminalFault??=error;
    settleReadiness(terminalFault);
    settleClose(terminalFault);
    kill();
  }
  function onData(chunk) {
    if(terminalFault) return;
    logBytes+=chunk.length;
    if(logBytes>HOST_LOG_LIMIT) {fail(new Error('Stage host logs exceed bound'));return;}
    logs+=chunk.toString('utf8');
  }
  // Subscribe immediately, before awaiting IPC. Exit state is independent of readiness.
  p.on('error',()=>{if(!exit) fail(new Error('Stage host process error'));});
  p.once('exit',(code,signal)=>{
    exit={code,signal:signal??null};clearStartup();
    if(!readinessSettled) {
      terminalFault??=exitedError();
      settleReadiness(terminalFault);
    }
    settleClose();
  });
  p.on('message',value=>{
    if(readinessSettled || exit || terminalFault) return;
    if(!validStageHostReady(value)) {fail(new Error('Stage host readiness payload invalid'));return;}
    settleReadiness(null,{url:value.url,token:value.token});
  });
  for(const stream of [p.stdout,p.stderr]) stream.on('data',onData);
  startupTimer=setTimer(()=>{
    if(!readinessSettled && !exit) fail(new Error('Stage host deadline exceeded'));
  },HOST_STARTUP_MS);

  function close() {
    if(closePromise) return closePromise;
    closePromise=new Promise((resolve,reject)=>{resolveClose=resolve;rejectClose=reject;});
    if(terminalFault) {settleClose(terminalFault);return closePromise;}
    if(exit) {settleClose();return closePromise;}
    if(!ready) {fail(new Error('Stage host closed before readiness'));return closePromise;}
    cleanupTimer=setTimer(()=>fail(new Error('Stage host cleanup deadline')),HOST_CLEANUP_MS);
    if(!p.connected) {fail(new Error('Stage host IPC disconnected'));return closePromise;}
    try {
      p.send('close',error=>{
        // A late send callback cannot replace a recorded exit result.
        if(error && !exit) fail(new Error('Stage host close send failed'));
      });
    } catch {
      if(!exit) fail(new Error('Stage host close send failed'));
    }
    return closePromise;
  }
  return {ready:readyPromise,close};
}
