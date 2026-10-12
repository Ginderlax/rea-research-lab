import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {executeNode,createExecution,advanceExecution,preflight} from './native.mjs';
import {executeOriginalNode,executeOriginalWait,verifyOriginalIntegrity,observations,comparisons} from './original-harness.mjs';
const require=createRequire(new URL('../../../../.local/automation-original/package.json',import.meta.url)),axios=require('axios');
const make=(parameters)=>({id:'HTTP',name:'HTTP',type:'n8n-nodes-base.httpRequest',typeVersion:4.4,position:[0,0],parameters:{authentication:'none',method:'GET',options:{timeout:1000},...parameters}});
async function fixture(t){const requests=[];const server=http.createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const url=new URL(req.url,'http://fixture');requests.push({method:req.method,path:url.pathname,query:Object.fromEntries(url.searchParams),headers:req.headers,body:Buffer.concat(chunks).toString()});if(url.pathname==='/slow'){setTimeout(()=>{res.writeHead(200,{'content-type':'application/json'});res.end('{"late":true}');},100);return;}if(url.pathname==='/large'){res.writeHead(200,{'content-type':'text/plain'});res.end('x'.repeat(1024*1024+1));return;}if(url.pathname==='/redirect'){res.writeHead(302,{location:'/json'});res.end();return;}res.setHeader('content-type',url.pathname==='/text'?'text/plain; charset=utf-8':'application/json');res.removeHeader('date');if(url.pathname==='/bad'){res.end('bad JSON');return;}if(url.pathname==='/status')res.statusCode=418;res.end(url.pathname==='/array'?'[{"a":1},{"a":2}]':url.pathname==='/text'?'hello':JSON.stringify({ok:true,method:req.method,query:Object.fromEntries(url.searchParams),body:Buffer.concat(chunks).toString()}));});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));return{url:`http://127.0.0.1:${server.address().port}`,requests};}
async function independentAxiosTransport(options){const headers={...options.headers};let data=options.body;if(data!==undefined&&typeof data==='object'&&!Buffer.isBuffer(data)){data=JSON.stringify(data);headers['content-type']??='application/json';}const response=await axios({url:options.uri,method:options.method,headers,params:options.qs,data,responseType:options.json?'json':'arraybuffer',timeout:options.timeout,maxRedirects:options.followRedirect?options.maxRedirects??10:0,validateStatus:()=>true,proxy:false});if(options.simple!==false&&(response.status<200||response.status>=300)){const error=new Error(`HTTP ${response.status}`);error.statusCode=response.status;throw error;}return{body:options.json?response.data:Buffer.from(response.data),headers:response.headers.toJSON(),statusCode:response.status,statusMessage:response.statusText};}
test('native HTTP node request construction and JSON/text/array/full-response shapes match independently executed exact original module',async t=>{
 const{url,requests}=await fixture(t);
 for(const parameters of [
  {url:`${url}/json`},{url:`${url}/array`},{url:`${url}/text`},{url:`${url}/redirect`},
  {url:`${url}/json`,method:'POST',sendBody:true,contentType:'json',specifyBody:'json',jsonBody:'{"name":"Ada"}'},
  {url:`${url}/json`,method:'PUT',sendBody:true,contentType:'raw',rawContentType:'text/plain',body:'raw café'},
  {url:`${url}/json`,method:'PATCH',sendBody:true,bodyParameters:{parameters:[{name:'changed',value:true}]}},
  {url:`${url}/json`,method:'DELETE'},
  {url:`${url}/json`,method:'HEAD',options:{timeout:1000,response:{response:{responseFormat:'text'}}}},
  {url:`${url}/json`,method:'OPTIONS'},
  {url:`${url}/json?q=old`,sendQuery:true,queryParameters:{parameters:[{name:'q',value:'new'}]}},
  {url:`${url}/json`,sendQuery:true,queryParameters:{parameters:[{name:'q',value:'a b'}]},sendHeaders:true,headerParameters:{parameters:[{name:'X-Check',value:'yes'}]}},
  {url:`${url}/json`,options:{timeout:1000,response:{response:{responseFormat:'json',fullResponse:true}}}},
  {url:`${url}/text`,options:{timeout:1000,response:{response:{responseFormat:'text',fullResponse:true,outputPropertyName:'result'}}}},
  {url:`${url}/status`,options:{timeout:1000,response:{response:{responseFormat:'json',neverError:true}}}},
  {url:`${url}/bad`,options:{timeout:1000,response:{response:{responseFormat:'autodetect',neverError:true}}}}
 ]){const node=make(parameters);const before=requests.length;const candidate=await executeNode(node,[{json:{}}]);const original=await executeOriginalNode(node,[{json:{}}],{httpTransport:independentAxiosTransport});const normalize=value=>JSON.parse(JSON.stringify(value,(key,entry)=>['date','connection','keep-alive','content-length','transfer-encoding'].includes(key)?undefined:entry));assert.deepEqual(normalize(candidate),normalize(original),JSON.stringify(parameters));if(parameters.options?.response?.response?.fullResponse)comparisons.normalizedHttpOutputMatches++;else{assert.deepEqual(candidate,original);comparisons.exactOutputMatches++;}assert.equal(requests.length-before,parameters.url.endsWith('/redirect')?4:2);assert.equal(requests.at(-1).method,requests.at(before).method);assert.equal(requests.at(-1).body,requests.at(before).body);assert.deepEqual(requests.at(-1).query,requests.at(before).query);}
});
test('native HTTP timeout, cancellation, invalid JSON, bad status and response bounds fail against real endpoints',async t=>{
 const{url}=await fixture(t);
 for(const[route,options,code]of [['slow',{timeout:10},'NATIVE_HTTP_TIMEOUT'],['bad',{timeout:1000,response:{response:{responseFormat:'json'}}},'NATIVE_HTTP_JSON'],['status',{timeout:1000},'NATIVE_HTTP_STATUS'],['large',{timeout:1000,response:{response:{responseFormat:'text'}}},'NATIVE_LIMIT']])await assert.rejects(executeNode(make({url:`${url}/${route}`,options}),[{json:{}}]),error=>error.code===code);
 const controller=new AbortController(),promise=executeNode(make({url:`${url}/slow`}),[{json:{}}],{signal:controller.signal});setTimeout(()=>controller.abort(),10);await assert.rejects(promise,error=>error.code==='NATIVE_CANCELLED');
});
test('native and authenticated exact original HTTP module both reject timeout, failed status and invalid explicit JSON',async t=>{
 const{url}=await fixture(t);
 for(const[route,options]of [['slow',{timeout:10}],['status',{timeout:1000}],['bad',{timeout:1000,response:{response:{responseFormat:'json'}}}]]){const node=make({url:`${url}/${route}`,options});await assert.rejects(executeNode(node,[{json:{}}]));await assert.rejects(executeOriginalNode(node,[{json:{}}],{httpTransport:independentAxiosTransport}));comparisons.rejectionOutcomeMatches++;}
});
test('source-extracted exact original Wait execute/putToWait methods and released validation helpers establish interval and output contract',async()=>{
 for(const[amount,unit]of [[0,'seconds'],[0.01,'seconds'],[0.5,'minutes'],[1/3600,'hours'],[1/86400,'days'],[60,'seconds']]){const node={name:'Wait',type:'n8n-nodes-base.wait',typeVersion:1.1,parameters:{resume:'timeInterval',amount,unit},position:[0,0]},items=[{json:{keep:1},pairedItem:{item:3}}];assert.deepEqual(await executeNode(node,structuredClone(items),{now:12345}),await executeOriginalWait(node,structuredClone(items),12345));comparisons.waitMethodOutputMatches++;}
});
test.after(async()=>{await verifyOriginalIntegrity();console.log(`Authenticated original HTTP/Wait observations: ${JSON.stringify(observations)}`);console.log(`Original comparison accounting: ${JSON.stringify(comparisons)}`);});
