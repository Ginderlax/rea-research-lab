// Finite DOM controls only; genuine browser and HTTP cases are separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {render} from './client.mjs';
import {makeDom,deferred} from './sevenzip-aes-ui-fixture.mjs';
async function setup(t,api){const d=makeDom();t.after(()=>d.restore());const dispose=await render(d.root,api);t.after(dispose);return{...d,dispose};}
const marked=(d,tag,key,value)=>d.root.querySelectorAll(tag).find(n=>n.getAttribute(key)===value);

test('extraction defaults to Full paths and sends only the explicitly selected flat mode',async t=>{
  const calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input:{...input}});return{extracted:2,destination:input.destination};});
  const mode=d.field('Extraction paths');assert.equal(mode.value,'full');assert.deepEqual(mode.options.map(o=>[o.value,o.textContent]),[['full','Full paths'],['flat','Files only']]);
  d.field('Confirm extraction').checked=true;await d.button('Verify and extract').click();assert.equal(calls.length,1);assert.equal(calls[0].action,'extract');assert.equal(calls[0].input.pathMode,'full');assert.equal(calls[0].input.confirm,true);
  mode.value='flat';await mode.emit('change');await d.button('Verify and extract').click();assert.equal(calls.length,2);assert.equal(calls[1].input.pathMode,'flat');assert.equal(Object.hasOwn(calls[1].input,'password'),false);
});

test('changing extraction mode invalidates only the old extraction outcome and issues no request',async t=>{
  const calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input});if(action==='list')return{format:'zip',entries:[{name:'nested/owned.txt',size:5,method:'store'}]};return{extracted:1,destination:input.destination};});
  const listing=marked(d,'div','data-archive-listing','true'),result=marked(d,'p','data-archive-result','extract'),outcome=marked(d,'p','data-archive-operation','Verify and extract');
  await d.button('List and verify every entry').click();d.field('Confirm extraction').checked=true;await d.button('Verify and extract').click();assert(result.textContent.includes('archive/restored'));assert.equal(outcome.textContent,'Done.');assert(listing.textContent.includes('nested/owned.txt'));
  const count=calls.length;d.field('Extraction paths').value='flat';await d.field('Extraction paths').emit('change');assert.equal(result.textContent,'');assert.equal(outcome.textContent,'');assert.equal(calls.length,count);assert(listing.textContent.includes('nested/owned.txt'));
});

test('flat collision refusal replaces previous success inline and scrubs the request password',async t=>{
  let reject=false;const calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input:{...input}});if(reject)throw new Error('Files only extraction has duplicate filenames; use Full paths or a different archive.');return{extracted:1,destination:input.destination};});
  const mode=d.field('Extraction paths'),result=marked(d,'p','data-archive-result','extract'),outcome=marked(d,'p','data-archive-operation','Verify and extract');
  d.field('Confirm extraction').checked=true;await d.button('Verify and extract').click();assert(result.textContent.includes('archive/restored'));
  mode.value='flat';await mode.emit('change');d.field('Use an archive password').checked=true;await d.field('Use an archive password').emit('change');d.field('Inspection/extraction password').value='owned flat password';reject=true;await d.button('Verify and extract').click();
  assert.equal(calls[1].input.pathMode,'flat');assert.equal(calls[1].input.password,'owned flat password');assert.equal(result.textContent,'');assert.equal(outcome.className,'status error');assert(outcome.textContent.includes('duplicate filenames'));assert.equal(d.field('Inspection/extraction password').value,'');assert.equal(d.root.getAttribute('aria-busy'),'false');assert.equal(mode.disabled,false);
});

test('held flat extraction captures its mode blocks duplicates and disposal prevents late output',async t=>{
  const gate=deferred(),calls=[],d=await setup(t,async(action,input)=>{calls.push({action,input:{...input}});return gate.promise;});
  const mode=d.field('Extraction paths');mode.value='flat';await mode.emit('change');d.field('Confirm extraction').checked=true;
  d.field('Use an archive password').checked=true;await d.field('Use an archive password').emit('change');d.field('Inspection/extraction password').value='held owned password';
  const pending=d.button('Verify and extract').click();assert.equal(calls.length,1);assert.equal(calls[0].input.pathMode,'flat');assert.equal(mode.disabled,true);assert.equal(d.root.getAttribute('aria-busy'),'true');await d.button('Verify and extract').click();assert.equal(calls.length,1);
  mode.value='full';await mode.emit('change');assert.equal(calls[0].input.pathMode,'flat');d.dispose();assert.equal(d.field('Inspection/extraction password').value,'');const before=d.root.textContent;
  gate.resolve({extracted:1,destination:'archive/restored'});await pending;assert.equal(d.root.textContent,before);assert.equal(d.root.getAttribute('aria-busy'),'false');
});
