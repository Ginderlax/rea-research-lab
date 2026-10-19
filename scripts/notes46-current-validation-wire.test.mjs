// Prospective hosted-only regression for the actual current publication seam.
// It imports only the pure wire helper, never the records CLI or old predicates.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createNotes46CurrentValidationWire, NOTES46_ABSENT_HISTORICAL_RESOLVER_PATH } from './notes46-current-validation-wire.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64'); assert.equal(process.version, 'v24.16.0');
for (const [key, value] of Object.entries({ CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab',GITHUB_SERVER_URL:'https://github.com',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/experiment/notes46-installed-search-20261019',GITHUB_JOB:'publication-integrity' })) assert.equal(process.env[key], value, key);
for (const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(process.env[key]));
assert(/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA));
const gitEnv = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_'))), GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never' };
const head = spawnSync('git',['--no-replace-objects','-C',root,'rev-parse','HEAD'],{env:gitEnv,shell:false,windowsHide:true,timeout:30000,maxBuffer:4096});
assert.equal(head.error,undefined);assert.equal(head.status,0);assert.equal(head.signal,null);assert.equal(head.stdout.toString().trim(),process.env.GITHUB_SHA);
function fixture() {
  return { schema:'rea-notes46-current-publication-validation/v1',status:'passed',checked_at_utc:'2026-10-19T07:34:58.148Z',
    currentWorkflowSourceSHA:process.env.GITHUB_SHA,projects:10,payload_files:29118,
    actualCommittedPayloadCensusExact:true,actualPayloadGitBlobsAuthenticated:true,
    notes46CurrentSourceProof:{currentNotesSources:46,sourceOnly:true},
    historicalValidation:{schema:'rea-notes46-historical2a-record-predicates/v1',status:'passed',historicalInputCommit:'2a8482b42784eb262d6d5b82e62d8d1220dc4821',
      everyUniqueOldHistoricalPredicateRetained:true,followupEvidence:{notesInlineVerification:{sourceOnly:true,sourceStable:true,qualificationCorrectionAliases:32,sourceIDSHAPairs:159,resolveHistorical:undefined},retained:{nothing:null,flag:false,count:0,text:'Équipe / exact text',array:[1,'two',null,true,{keep:'all fields'}]}}},
    historicalInputProof:{pendingOuterBoundary:false,pendingExecutionBoundaries:0,fullIntegrityPasses:2},
    historicalCleanup:{status:'disposed',closedSummaryIdentity:{bytes:2513,sha256:'65d82ee10ef26d9bf34467a799480ce66d809f514477db4e6a532158fe39f673'}},
    historicalReceiptsRebound:false,fullProductParity:false,superiority:false };
}
const inline = value => value.historicalValidation.followupEvidence.notesInlineVerification;
function freeze(value) { if(value && typeof value==='object' && !Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value; }

test('only the exact absent historical resolver is omitted without changing input or persisted fields', {concurrency:false}, () => {
  const original=freeze(fixture()),encodedBefore=JSON.stringify(original,null,2),wire=createNotes46CurrentValidationWire(original);
  assert.deepEqual(NOTES46_ABSENT_HISTORICAL_RESOLVER_PATH,['historicalValidation','followupEvidence','notesInlineVerification','resolveHistorical']);
  assert.equal(Object.hasOwn(inline(original),'resolveHistorical'),true);assert.equal(inline(original).resolveHistorical,undefined);
  assert.equal(Object.hasOwn(inline(wire),'resolveHistorical'),false);assert.notEqual(wire,original);
  assert.equal(JSON.stringify(original,null,2),encodedBefore);assert.equal(JSON.stringify(wire,null,2),encodedBefore);
  const expected=fixture();delete inline(expected).resolveHistorical;assert.deepEqual(wire,expected);
  const temporary=fs.realpathSync(process.env.RUNNER_TEMP);assert(path.isAbsolute(temporary));
  for(let at=temporary;;){assert(!fs.lstatSync(at).isSymbolicLink());const up=path.dirname(at);if(up===at)break;at=up;}
  const owned=fs.mkdtempSync(path.join(temporary,'rea-notes46-wire-readback-'));
  const relative=path.relative(temporary,owned);assert(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep));assert.equal(fs.realpathSync(owned),owned);
  const fromRepository=path.relative(root,owned);assert(path.isAbsolute(fromRepository)||fromRepository==='..'||fromRepository.startsWith('..'+path.sep));
  try { const target=path.join(owned,'VALIDATION.json'),bytes=Buffer.from(JSON.stringify(wire,null,2));fs.writeFileSync(target,bytes,{flag:'wx'});
    assert.deepEqual(fs.readFileSync(target),bytes);assert.deepEqual(JSON.parse(fs.readFileSync(target)),wire);
  } finally { const resolved=fs.realpathSync(owned),check=path.relative(temporary,resolved);assert.equal(resolved,owned);assert(check&&!path.isAbsolute(check)&&check!=='..'&&!check.startsWith('..'+path.sep));fs.rmSync(resolved,{recursive:true}); }
});
test('an already absent optional resolver retains every other current wire value', {concurrency:false}, () => {
  const original=fixture();delete inline(original).resolveHistorical;const wire=createNotes46CurrentValidationWire(freeze(original));assert.deepEqual(wire,original);assert.deepEqual(createNotes46CurrentValidationWire(wire),wire);
});
test('shared plain data and an own __proto__ key survive without prototype mutation', {concurrency:false}, () => {
  const original=fixture(),shared={keep:'same data twice'};original.first=shared;original.second=shared;
  Object.defineProperty(original,'__proto__',{value:{data:'ordinary own key'},enumerable:true,writable:true,configurable:true});
  const wire=createNotes46CurrentValidationWire(original);assert.equal(Object.getPrototypeOf(wire),Object.prototype);assert.equal(Object.hasOwn(wire,'__proto__'),true);assert.deepEqual(wire.__proto__,{data:'ordinary own key'});assert.deepEqual(wire.first,wire.second);assert.deepEqual(JSON.parse(JSON.stringify(wire)),wire);
});

const rejected = [
  ['present historical resolver function', value => {inline(value).resolveHistorical=()=>null;}],
  ['present historical resolver null', value => {inline(value).resolveHistorical=null;}],
  ['present historical resolver nonempty data', value => {inline(value).resolveHistorical='unexpected';}],
  ['undefined at any other path', value => {value.other={unexpected:undefined};}],
  ['a dotted-key lookalike for the permitted path', value => {value['historicalValidation.followupEvidence.notesInlineVerification']={resolveHistorical:undefined};}],
  ['function at any other path', value => {value.other=()=>true;}],
  ['negative zero that JSON would change', value => {value.other=-0;}],
  ['bigint that JSON cannot encode', value => {value.other=1n;}],
  ['symbol value that JSON would omit', value => {value.other=Symbol('value');}],
  ['symbol key that JSON would omit', value => {value[Symbol('key')]=1;}],
  ['sparse array that JSON would fill with null', value => {value.other=Array(2);}],
  ['extra array property that JSON would omit', value => {value.other=[1,2];value.other.extra='lost';}],
  ['nonenumerable ordinary field that JSON would omit', value => {Object.defineProperty(value,'hidden',{value:'lost',enumerable:false});}],
  ['nonenumerable array index', value => {value.other=[1];Object.defineProperty(value.other,'0',{value:1,enumerable:false});}],
  ['date toJSON conversion', value => {value.other=new Date('2026-10-19T00:00:00Z');}],
  ['Map container that JSON would replace', value => {value.other=new Map([['keep',1]]);}],
  ['cyclic data', value => {value.other=value;}],
  ['foreign current schema', value => {value.schema='rea-other/v1';}],
  ['foreign historical schema', value => {value.historicalValidation.schema='rea-other-historical/v1';}],
  ['missing exact historical inline summary', value => {delete value.historicalValidation.followupEvidence.notesInlineVerification;}],
];
for(const [title,mutate] of rejected)test('reject '+title,{concurrency:false},()=>{const value=fixture();mutate(value);assert.throws(()=>createNotes46CurrentValidationWire(value));});
test('reject every nonfinite numeric value independently', {concurrency:false}, () => {
  for(const number of [NaN,Infinity,-Infinity]){const value=fixture();value.other=number;assert.throws(()=>createNotes46CurrentValidationWire(value),/lossless JSON numbers/);}
});
test('reject accessors without invoking them or mutating their source', {concurrency:false}, () => {
  let reads=0;const value=fixture();Object.defineProperty(value,'other',{get(){reads++;return'not data';},enumerable:true});assert.throws(()=>createNotes46CurrentValidationWire(value),/Accessor/);assert.equal(reads,0);assert.equal(Object.hasOwn(Object.getOwnPropertyDescriptor(value,'other'),'get'),true);
});
test('reject accessor at the optional resolver slot without invoking it', {concurrency:false}, () => {
  let reads=0;const value=fixture();Object.defineProperty(inline(value),'resolveHistorical',{get(){reads++;return undefined;},enumerable:true});assert.throws(()=>createNotes46CurrentValidationWire(value),/Accessor/);assert.equal(reads,0);
});
test('reject own toJSON without calling its hook', {concurrency:false}, () => {
  let calls=0;const value=fixture();value.other={toJSON(){calls++;return{};}};assert.throws(()=>createNotes46CurrentValidationWire(value),/toJSON/);assert.equal(calls,0);
});
test('reject nonordinary prototypes without calling inherited toJSON', {concurrency:false}, () => {
  let calls=0;const value=fixture();value.other=Object.create({toJSON(){calls++;return{};}});assert.throws(()=>createNotes46CurrentValidationWire(value),/ordinary/);assert.equal(calls,0);
});
test('reject proxy input without invoking proxy traps', {concurrency:false}, () => {
  let calls=0;const value=fixture();value.other=new Proxy({keep:1},{ownKeys(target){calls++;return Reflect.ownKeys(target);},getPrototypeOf(target){calls++;return Reflect.getPrototypeOf(target);},get(target,name){calls++;return target[name];}});assert.throws(()=>createNotes46CurrentValidationWire(value),/Proxy/);assert.equal(calls,0);
});
test('reject overdeep data rather than truncate it', {concurrency:false}, () => {
  const value=fixture();let at=value;for(let i=0;i<66;i++){at.deep={};at=at.deep;}assert.throws(()=>createNotes46CurrentValidationWire(value),/bounds/);
});
test('reject an oversized serialized member rather than drop fields', {concurrency:false}, () => {
  const value=fixture();value.other='x'.repeat(8*1024*1024);assert.throws(()=>createNotes46CurrentValidationWire(value),/member bound/);assert.equal(value.other.length,8*1024*1024);
});
