import {createWebDAV} from './webdav.mjs';
import {createDAVTransfer} from './dav-transfer.mjs';
import {createDAVDownload} from './dav-download.mjs';
import {boundedInput} from './dav-input.mjs';
const inputs={
  'webdav-status':[],
  'webdav-list':['endpoint','auth','path'],
  'webdav-capabilities':['endpoint','auth'],
  'webdav-plan':['endpoint','auth','source','destination','mode','filters','comparison'],
  'webdav-apply':['endpoint','auth','token','confirm','allowDeletes'],
  'webdav-download-plan':['endpoint','auth','source','destination','mode','filters','comparison'],
  'webdav-download-apply':['endpoint','auth','token','confirm'],
};
// The host constructs one service per workspace and disposes it with that workspace.
// Busy requests fail immediately, so queued credential-bearing inputs cannot accumulate.
export function createDAVActions(workspace,store=null) {
  let transfer=createDAVTransfer(workspace),download=createDAVDownload(workspace),busy=false,closed=false,lastResult=null,activeClient=null;
  async function persist(result) {
    lastResult=result;
    if(store)await store.set('sync.webdav.lastResult',result);
  }
  return {
    close(){closed=true;transfer.close();download.close();activeClient?.close();},
    async handle(action,input={}) {
      if(!Object.hasOwn(inputs,action))throw Error('Unknown native WebDAV action.');
      input=boundedInput(input,inputs[action]);
      if(closed)throw Error('WebDAV service is closed.');
      if(action==='webdav-status')return {lastResult:store?await store.get('sync.webdav.lastResult',null):lastResult,cache:transfer.cache(),downloadCache:download.cache(),backend:'Generic WebDAV only; anonymous or request-scoped Basic authentication.',fullProductComplete:false,universalSuperiorityEstablished:false};
      if(busy)throw Error('A WebDAV request is already running in this workspace.');busy=true;
      try {
        // A preview in the opposite direction invalidates its volatile tokens.
        // Shared serialized metadata therefore stays within the existing service cap.
        if(action==='webdav-plan'){download.close();download=createDAVDownload(workspace);return await transfer.preview(input);}
        if(action==='webdav-download-plan'){transfer.close();transfer=createDAVTransfer(workspace);return await download.preview(input);}
        if(action==='webdav-download-apply'){
          if(input.confirm!==true)throw Error('Approve the displayed WebDAV download preview before applying it.');
          const {confirm,...settings}=input;let result;
          try{result=await download.apply(settings);}catch(error){
            if(error.planConsumed){
              const failure={direction:'webdav-to-local',status:'partial-failure',completed:error.completed??[],failedOperation:error.failedOperation??null,retainedAt:error.retainedAt??null,completedAt:new Date().toISOString(),error:error.message};let persistence='';
              try{await persist(failure);}catch{persistence=' The status record could not be saved.';}
              throw Error(`WebDAV download stopped after ${failure.completed.length} verified local operations.${failure.failedOperation?.localMayHaveChanged?' The current local operation may have changed '+failure.failedOperation.path+'.':''}${failure.retainedAt?' Recovery bytes are retained in '+failure.retainedAt+'.':''} ${error.message}${persistence}`);
            }
            throw error;
          }
          const value={...result,status:'completed',completedAt:new Date().toISOString()};
          try{await persist(value);}catch{throw Error(`WebDAV download completed (${value.completed.length} verified local operations), but the status record could not be saved.${value.retainedAt?' Recovery bytes are retained in '+value.retainedAt+'.':''}`);}
          return value;
        }
        if(action==='webdav-apply') {
          if(input.confirm!==true)throw Error('Approve the displayed WebDAV preview before applying it.');
          const {confirm,...settings}=input;let result;
          try {result=await transfer.apply(settings);}catch(error){
            if(error.planConsumed){const failure={status:'partial-failure',completed:error.completed??[],failedOperation:error.failedOperation??null,retainedAt:error.retainedAt??null,completedAt:new Date().toISOString(),error:error.message};let persistence='';try{await persist(failure);}catch{persistence=' The status record could not be saved.';}
              throw Error(`WebDAV stopped after ${failure.completed.length} verified operations.${failure.failedOperation?.remoteMayHaveChanged?' The current remote operation may have changed '+failure.failedOperation.path+'.':''}${failure.retainedAt?' Prior bytes are retained in '+failure.retainedAt+'.':''} ${error.message}${persistence}`);
            }throw error;
          }
          const value={...result,status:'completed',completedAt:new Date().toISOString()};try{await persist(value);}catch{throw Error(`WebDAV remote operations completed (${value.completed.length} verified operations), but the status record could not be saved.${value.retainedAt?' Prior bytes are retained in '+value.retainedAt+'.':''}`);}return value;
        }
        const client=createWebDAV({endpoint:input.endpoint,...(input.auth?{auth:input.auth}:{})});activeClient=client;
        try {return action==='webdav-list'?{endpoint:client.endpoint,path:input.path??'',entries:await client.list(input.path??'')}:await client.capabilities();}finally{client.close();activeClient=null;}
      }finally{input.auth=null;busy=false;}
    },
  };
}
