import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from './client.mjs';
import { makeDom, deferred } from './sevenzip-aes-ui-fixture.mjs';

async function setup(t,api) { const d=makeDom(); t.after(()=>d.restore()); const dispose=await render(d.root,api);t.after(dispose);return {...d,dispose}; }
function select(d,label,value) { const c=d.field(label);c.value=value;return c.emit('change'); }
async function encryptZip(d,password) { d.field('Encrypt ZIP contents with AES-256').checked=true;await d.field('Encrypt ZIP contents with AES-256').emit('change');d.field('ZIP creation password (1–99 ASCII characters)').value=password; }

test('explicit ZIP AES selection supplies the chosen method and only its request-scoped password',async t=>{
  const calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input});return{path:input.output,format:'zip',entries:1,originalBytes:8,bytes:170,encrypted:true};});
  await select(d,'Compression','store');await encryptZip(d,'owned ZIP password');
  assert.equal(d.field('Encrypt 7Z contents with AES-256').disabled,true);
  assert.equal(d.field('ZIP creation password (1–99 ASCII characters)').disabled,false);
  assert.equal(d.field('Use ZIP64 layout').disabled,true);
  await d.button('Create archive').click();
  assert.equal(calls.length,1);assert.equal(calls[0].action,'create');
  assert.equal(calls[0].input.format,'zip');assert.equal(calls[0].input.compression,'store');
  assert.equal(calls[0].input.encryption,'aes256');assert.equal(calls[0].input.password,'owned ZIP password');
  assert.equal(Object.hasOwn(calls[0].input,'encryptHeaders'),false);
  assert.equal(d.field('ZIP creation password (1–99 ASCII characters)').value,'');
  assert(d.root.textContent.includes('names and archive comments remain visible'));
  assert(d.root.textContent.includes('AES-256'));assert.equal(d.root.getAttribute('aria-busy'),'false');
});

test('plain ZIP omits secrets and unsupported compression or ZIP64 disables explicit AES creation',async t=>{
  const calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input});return{path:input.output,format:'zip',entries:0,originalBytes:0,bytes:22};});
  await encryptZip(d,'discard when incompatible');await select(d,'Compression','zstd');
  assert.equal(d.field('Encrypt ZIP contents with AES-256').disabled,true);
  assert.equal(d.field('Encrypt ZIP contents with AES-256').checked,false);
  assert.equal(d.field('ZIP creation password (1–99 ASCII characters)').value,'');
  await select(d,'Compression','deflate');d.field('Use ZIP64 layout').checked=true;await d.field('Use ZIP64 layout').emit('change');
  assert.equal(d.field('Encrypt ZIP contents with AES-256').disabled,true);
  await d.button('Create archive').click();assert.equal(calls.length,1);
  assert.equal(calls[0].input.zip64,true);assert.equal(Object.hasOwn(calls[0].input,'password'),false);assert.equal(Object.hasOwn(calls[0].input,'encryption'),false);
});

test('format changes and deselected ZIP encryption clear the matching password without changing 7Z choices',async t=>{
  const d=await setup(t,async()=>{throw new Error('No request expected');});
  await encryptZip(d,'discard on toggle');d.field('Encrypt ZIP contents with AES-256').checked=false;await d.field('Encrypt ZIP contents with AES-256').emit('change');
  assert.equal(d.field('ZIP creation password (1–99 ASCII characters)').value,'');
  await encryptZip(d,'discard on format');await select(d,'Archive format','sevenzip');
  assert.equal(d.field('ZIP creation password (1–99 ASCII characters)').value,'');assert.equal(d.field('Encrypt ZIP contents with AES-256').disabled,true);
  assert.equal(d.field('Encrypt 7Z contents with AES-256').disabled,false);
  d.field('Encrypt 7Z contents with AES-256').checked=true;await d.field('Encrypt 7Z contents with AES-256').emit('change');
  assert.equal(d.field('7Z creation password (1–128 UTF16 units)').disabled,false);
  assert.equal(d.field('ZIP creation password (1–99 ASCII characters)').disabled,true);
});

test('ZIP authentication results distinguish AE-2 from a recorded CRC and scrub passwords after refusal',async t=>{
  let fail=false;const calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input});if(fail)throw new Error('ZIP password or content authentication failed.');return{format:'zip',entries:[{name:'owned.txt',size:8,method:'deflate',encrypted:true,encryption:'winzip-aes256',aesVersion:2,authenticationVerified:true}]};});
  d.field('Use an archive password').checked=true;await d.field('Use an archive password').emit('change');d.field('Inspection/extraction password').value='owned read password';
  await d.button('List and verify every entry').click();assert.equal(calls[0].input.password,'owned read password');assert.equal(d.field('Inspection/extraction password').value,'');
  assert(d.root.textContent.includes('any recorded content CRC'));assert(d.root.textContent.includes('not authenticated'));assert(d.root.textContent.includes('Not recorded'));
  fail=true;d.field('Inspection/extraction password').value='wrong owned password';await d.button('List and verify every entry').click();
  assert.equal(d.field('Inspection/extraction password').value,'');assert.equal(d.button('Verify and extract').disabled,false);assert(d.root.textContent.includes('authentication failed'));
  d.field('Inspection/extraction password').value='discard on deselection';d.field('Use an archive password').checked=false;await d.field('Use an archive password').emit('change');assert.equal(d.field('Inspection/extraction password').value,'');
});

test('held ZIP creation blocks duplicate operations and disposal scrubs all three detached password inputs',async t=>{
  const gate=deferred(),calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input});return gate.promise;});
  await encryptZip(d,'held owned ZIP password');const pending=d.button('Create archive').click();
  assert.equal(d.root.getAttribute('aria-busy'),'true');assert.equal(d.button('Verify and extract').disabled,true);
  await d.button('Create archive').click();assert.equal(calls.length,1);d.dispose();
  for(const label of ['7Z creation password (1–128 UTF16 units)','ZIP creation password (1–99 ASCII characters)','Inspection/extraction password'])assert.equal(d.field(label).value,'');
  const before=d.root.textContent;gate.resolve({path:'late.zip',format:'zip',entries:1,originalBytes:8,bytes:170,encrypted:true});await pending;assert.equal(d.root.textContent,before);
});
