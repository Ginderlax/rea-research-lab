// Static synthetic child only. Run solely through the reviewed full-job phase;
// these markers stay in its private, unuploaded capture and fake output file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const stdoutMarker='REA_NOTES_DIAGNOSTIC_CONTAINMENT_STDOUT_MARKER_V1';
const stderrMarker='REA_NOTES_DIAGNOSTIC_CONTAINMENT_STDERR_MARKER_V1';
const fakeMarker='REA_NOTES_DIAGNOSTIC_CONTAINMENT_FAKE_OUTPUT_V1';
function main(){
  assert.deepEqual(process.argv.slice(2),[]);assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
  for(const[k,v]of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_EVENT_NAME:'push',GITHUB_JOB:'full-current-installed',REA_NOTES_ORDER_ROLE:'full'}))assert.equal(process.env[k],v);
  for(const key of['GITHUB_SHA','REA_NOTES_ORDER_PARENT'])assert(/^[0-9a-f]{40}$/.test(process.env[key]));assert.equal(process.env.GITHUB_WORKFLOW_SHA,process.env.GITHUB_SHA);for(const key of['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])assert(/^[1-9][0-9]*$/.test(process.env[key]));assert(/^[0-9a-f]{64}$/.test(process.env.REA_NOTES_ORDER_MANIFEST_SHA256));
  const temp=fs.realpathSync(process.env.RUNNER_TEMP),root=path.join(temp,'rea-notes-order-diagnostics-containment-'+process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT),file=path.join(root,'private-containment-output.txt');assert.equal(path.dirname(root),temp);assert.equal(process.env.GITHUB_OUTPUT,file);
  let at=path.parse(root).root;for(const part of root.slice(at.length).split(path.sep).filter(Boolean)){at=path.join(at,part);const s=fs.lstatSync(at);assert(s.isDirectory()&&!s.isSymbolicLink());}assert.equal(fs.realpathSync(root).toLowerCase(),root.toLowerCase());const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size===0);assert.equal(fs.realpathSync(file).toLowerCase(),file.toLowerCase());
  const names=['GITHUB_OUTPUT','GITHUB_ENV','GITHUB_PATH','GITHUB_STEP_SUMMARY','GITHUB_STATE','GITHUB_TOKEN','GH_TOKEN','ACTIONS_RUNTIME_TOKEN','ACTIONS_ID_TOKEN_REQUEST_TOKEN','ACTIONS_ID_TOKEN_REQUEST_URL'];
  for(const name of names){const matches=Object.keys(process.env).filter(k=>k.toUpperCase()===name);if(name==='GITHUB_OUTPUT')assert.deepEqual(matches,['GITHUB_OUTPUT']);else assert.equal(matches.length,0);}
  fs.appendFileSync(file,'containment_owned_output='+fakeMarker+'\n');
  const report={schema:'rea-notes-full-diagnostic-containment-child/v1',source:process.env.GITHUB_SHA,parent:process.env.REA_NOTES_ORDER_PARENT,runID:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,job:process.env.GITHUB_JOB,role:'full',realParentChannelsAbsent:10,privateFakeOutputOwned:true,code:'EXPECTED_CHILD_REFUSAL',expectedExitCode:23};
  process.stdout.write(stdoutMarker+'\n'+JSON.stringify(report)+'\n');process.stderr.write(stderrMarker+'\n');process.exitCode=23;
}
try{main();}catch{process.stderr.write(JSON.stringify({schema:'rea-notes-full-diagnostic-containment-child/v1',status:'refused',code:'CONTAINMENT_GUARD_REFUSED'})+'\n');process.exitCode=24;}
