// SPDX-License-Identifier: AGPL-3.0-or-later
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url)),focused=path.join(root,'artifacts/analysis-input'),savedEvidenceDir=path.join(root,'artifacts/evidence');
const replayRoot=path.join(root,'artifacts/replays');fs.mkdirSync(replayRoot,{recursive:true});const evidenceDir=fs.mkdtempSync(path.join(replayRoot,'rea-'));
const files=["urlUtils.js","headerAnchor.js"];
fs.mkdirSync(focused,{recursive:true});fs.mkdirSync(evidenceDir,{recursive:true});
if(files.length){
 for(const file of [...files,'package.json']){const out=path.join(focused,file);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(path.join(root,'artifacts/package',file),out);}
}else execFileSync(process.execPath,[path.join(root,'prepare-analysis.mjs')],{stdio:'inherit'});
const rea=process.env.REA_CLI??fileURLToPath(new URL('../../../rea-backup-2026-10-12/runtime/node_modules/rea-agents/scripts/rea.mjs',import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function run(name,args){
 const r=spawnSync(process.execPath,['--max-old-space-size=512','--max-semi-space-size=4',rea,...args,'--json'],{encoding:'utf8',maxBuffer:100*1024*1024});
 fs.writeFileSync(path.join(evidenceDir,name+'.json'),r.stdout??'');fs.writeFileSync(path.join(evidenceDir,name+'.stderr.txt'),r.stderr??'');
 if(r.status!==0)throw Error(name+' failed: '+r.stderr);
 return JSON.parse(r.stdout);
}
const analysis=process.env.REA_REUSE_ANALYSIS==='1'?JSON.parse(fs.readFileSync(path.join(savedEvidenceDir,'analysis.json'),'utf8')):run('analysis',['analyze-javascript-application',focused,'--max-heap-mb','512','--analysis-timeout-ms','120000']);
const summaryRequest={source:{kind:'inline',evidence:analysis},view:{kind:'summary'}};
fs.writeFileSync(path.join(evidenceDir,'summary-request.json'),JSON.stringify(summaryRequest));
const summary=run('summary',['inspect-analysis-view',path.join(evidenceDir,'summary-request.json')]);
const traceRequest={application:analysis,seed:{kind:'module',value:"urlUtils.js"},direction:'outgoing'};
fs.writeFileSync(path.join(evidenceDir,'trace-request.json'),JSON.stringify(traceRequest));
const trace=run('trace',['trace-application-feature',path.join(evidenceDir,'trace-request.json')]);
const targetFunction="parseResourceUrl";
const sg=analysis.normalized_result.semantic_graph;
const target=sg.nodes.find(n=>n.kind==='function'&&n.label===targetFunction);
if(!target)throw Error('Semantic function selector missing');
const semanticDirection='forward-influence';
const seedParameter="url";
const seedCandidates=sg.nodes.filter(n=>n.function_node_id===target.node_id&&n.kind==='parameter'&&n.label===seedParameter);
const semanticSeed=seedCandidates[0];if(!semanticSeed)throw Error('Semantic seed missing');
const semanticRequest={application:analysis,query:{seed:{kind:'semantic-node',node_id:semanticSeed.node_id},direction:semanticDirection}};
fs.writeFileSync(path.join(evidenceDir,'semantic-request.json'),JSON.stringify(semanticRequest));
const semantic=run('semantic',['trace-javascript-semantics',path.join(evidenceDir,'semantic-request.json')]);
const nodes=analysis.normalized_result.graph.nodes.filter(n=>n.kind==='javascript-module').map(n=>({nodeId:n.node_id,observations:n.observations.map(o=>({label:o.label,location:o.evidence?.location?.value,semanticRole:o.properties?.semantic_role}))}));
const manifestFiles=files.length?[...files,'package.json']:fs.readdirSync(focused);
const st=semantic.normalized_result;
const result={reaVersion:'6.4.0',generatedAt:new Date().toISOString(),coverage:'Focused extracted subset only; full shipped tarball retained locally. Static analysis does not establish runtime execution.',selectedFiles:manifestFiles.map(f=>({path:f,sha256:sha(fs.readFileSync(path.join(focused,f)))})),analysisEvidenceId:analysis.evidence_id,summaryEvidenceId:summary.evidence_id,traceEvidenceId:trace.evidence_id,semanticEvidenceId:semantic.evidence_id,semanticTrace:{seedFunction:targetFunction,seedNodeId:semanticSeed.node_id,seedKind:semanticSeed.kind,direction:semanticDirection,status:st.status,nodeCount:st.nodes.length,relationCount:st.relations.length,unknownCount:st.unknowns.length,coverage:st.coverage,summary:st.summary,limitations:st.limitations},analysisArtifactDigest:analysis.subject.digest.sha256,statistics:analysis.normalized_result.statistics,semanticGraph:{graphId:sg.graph_id,nodes:sg.nodes.length,relations:sg.relations.length,unknowns:sg.unknowns.length,coverage:sg.coverage,functionNodes:sg.nodes.filter(n=>n.kind==='function').map(n=>({id:n.node_id,label:n.label,location:n.evidence.location.value}))},summary:summary.normalized_result.summary,trace:{seed:trace.normalized_result.seed,seedMatches:trace.normalized_result.seed_matches,coverage:trace.normalized_result.coverage,keys:Object.keys(trace.normalized_result)},moduleNodes:nodes,limitations:analysis.limitations};
fs.writeFileSync(path.join(evidenceDir,'rea-evidence-summary.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({project:"05-joplin",analysis:analysis.evidence_id,statistics:result.statistics,trace:trace.evidence_id},null,2));
