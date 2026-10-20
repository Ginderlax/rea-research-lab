import test from 'node:test';
import assert from 'node:assert/strict';
import {render} from './client.mjs';

class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.events={};this.value='';this.checked=false;this.disabled=false;this._text='';}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];this._text='';}
  set textContent(text){this._text=String(text);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent??String(c)).join('');}
  addEventListener(name,handler){this.events[name]=handler;}
  async click(){if(!this.disabled)await this.events.click?.({target:this});}
}
function all(element){return [element,...element.children.flatMap(child=>child instanceof Element?all(child):[])];}
function field(root,label){const wrapper=all(root).find(e=>e.tagName==='label'&&e._text===label);assert.ok(wrapper,label);return wrapper.children.find(e=>['input','textarea','select'].includes(e.tagName));}
function button(root,label){const result=all(root).find(e=>e.tagName==='button'&&e._text===label);assert.ok(result,label);return result;}
async function setup(t,respond){const previous=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};t.after(()=>{globalThis.document=previous;});const root=new Element('main'),calls=[];await render(root,async(action,input)=>{calls.push({action,input:structuredClone(input)});if(action==='list')return {snapshots:[]};return respond(action,input);});return{root,calls};}

test('key UI lists current metadata and selects only another key for explicitly confirmed removal',async t=>{
  const current='a'.repeat(64),other='b'.repeat(64),f=await setup(t,async action=>action==='nativeKeyList'?{keys:[{current:true,id:current,userName:'User',hostName:'Host',created:'2026-01-01T00:00:00Z'},{current:false,id:other,userName:'Other',hostName:'Host2',created:'2026-01-02T00:00:00Z'}]}:{removedKeyID:other,remainingKeys:1});
  field(f.root,'Repository password').value='synthetic-ui-access';await button(f.root,'List repository keys').click();assert.ok(f.root.textContent.includes('* Current key'));assert.equal(field(f.root,'Repository password').value,'');assert.equal(all(f.root).filter(e=>e.tagName==='button'&&e._text==='Select this other key').length,1);await button(f.root,'Select this other key').click();assert.equal(field(f.root,'Key ID or unique prefix to remove').value,other);
  await button(f.root,'Remove selected other key').click();assert.equal(f.calls.filter(c=>c.action==='nativeKeyRemove').length,0);field(f.root,'Confirm removal of this other key').checked=true;field(f.root,'Repository password').value='synthetic-ui-access';await button(f.root,'Remove selected other key').click();assert.deepEqual(f.calls.find(c=>c.action==='nativeKeyRemove').input,{repository:'backup/restic',password:'synthetic-ui-access',insecureNoPassword:false,keyID:other,confirm:true});assert.equal(field(f.root,'Key ID or unique prefix to remove').value,'');assert.equal(field(f.root,'Confirm removal of this other key').checked,false);
});

test('key UI submits both new passwords and user-host metadata then clears request secrets on success and failure',async t=>{
  let fail=false;const f=await setup(t,async()=>{if(fail)throw Error('owned API refusal');return{keyID:'c'.repeat(64),oldKeyRemoved:false};});
  const fill=()=>{field(f.root,'Repository password').value='synthetic-ui-old';field(f.root,'New repository password').value='synthetic-ui-new';field(f.root,'Confirm new repository password').value='synthetic-ui-new';};fill();field(f.root,'New key user (blank uses operating-system user)').value='UI User';field(f.root,'New key host (blank uses this machine)').value='UI Host';await button(f.root,'Add repository key').click();
  const sent=f.calls.find(c=>c.action==='nativeKeyAdd').input;assert.equal(sent.username,'UI User');assert.equal(sent.hostname,'UI Host');assert.equal(sent.newPassword,sent.newPasswordConfirm);assert.equal(sent.newInsecureNoPassword,false);for(const label of ['Repository password','New repository password','Confirm new repository password'])assert.equal(field(f.root,label).value,'');assert.ok(f.root.textContent.includes('Verified new key'));
  fail=true;fill();await button(f.root,'Add repository key').click();assert.ok(f.root.textContent.includes('owned API refusal'));for(const label of ['Repository password','New repository password','Confirm new repository password'])assert.equal(field(f.root,label).value,'');
});

test('key UI requires password replacement confirmation and explicitly empty fields for either insecure checkbox',async t=>{
  const f=await setup(t,async()=>({keyID:'d'.repeat(64),oldKeyRemoved:true}));field(f.root,'Repository password').value='synthetic-ui-old';field(f.root,'New repository password').value='synthetic-ui-new';field(f.root,'Confirm new repository password').value='synthetic-ui-new';await button(f.root,'Change repository password').click();assert.equal(f.calls.some(c=>c.action==='nativeKeyPasswd'),false);
  field(f.root,'Create an empty password (insecure)').checked=true;field(f.root,'New repository password').value='must-not-be-discarded';field(f.root,'Confirm new repository password').value='must-not-be-discarded';await button(f.root,'Add repository key').click();assert.equal(f.calls.some(c=>c.action==='nativeKeyAdd'),false);
  field(f.root,'Confirm replacement of the key used by this password').checked=true;field(f.root,'Access or create an empty-password repository (insecure)').checked=true;field(f.root,'Repository password').value='';await button(f.root,'Change repository password').click();const sent=f.calls.find(c=>c.action==='nativeKeyPasswd').input;assert.equal(sent.password,'');assert.equal(sent.insecureNoPassword,true);assert.equal(sent.newPassword,'');assert.equal(sent.newPasswordConfirm,'');assert.equal(sent.newInsecureNoPassword,true);assert.equal(sent.confirm,true);assert.equal(field(f.root,'Confirm replacement of the key used by this password').checked,false);
});

test('an outstanding native request prevents a second key mutation rather than queueing another credential-bearing request',async t=>{
  let release,arrived;const held=new Promise(done=>release=done),ready=new Promise(done=>arrived=done);const f=await setup(t,async(action)=>{if(action==='nativeKeyList'){arrived();await held;return{keys:[]};}throw Error('Second request must not reach transport');});
  field(f.root,'Repository password').value='synthetic-ui-held';const pending=button(f.root,'List repository keys').click();await ready;field(f.root,'New repository password').value='synthetic-ui-new';field(f.root,'Confirm new repository password').value='synthetic-ui-new';try{await button(f.root,'Add repository key').click();assert.equal(f.calls.filter(c=>c.action.startsWith('native')).length,1);assert.ok(f.root.textContent.includes('Wait for the current repository operation'));assert.equal(field(f.root,'Repository password').value,'synthetic-ui-held');assert.equal(field(f.root,'New repository password').value,'synthetic-ui-new');assert.equal(field(f.root,'Confirm new repository password').value,'synthetic-ui-new');}finally{release();await pending;}for(const label of ['Repository password','New repository password','Confirm new repository password'])assert.equal(field(f.root,label).value,'');
});

test('every nonbusy validation rejection clears all password fields before another attempt',async t=>{
  const f=await setup(t,async()=>{throw Error('Validation must finish before transport');});
  const fill=()=>{field(f.root,'Repository password').value='synthetic-ui-access';field(f.root,'New repository password').value='synthetic-ui-new';field(f.root,'Confirm new repository password').value='synthetic-ui-new';};
  const clear=()=>{for(const label of ['Repository password','New repository password','Confirm new repository password'])assert.equal(field(f.root,label).value,'');};
  fill();field(f.root,'Access or create an empty-password repository (insecure)').checked=true;await button(f.root,'Open repository').click();clear();assert.ok(f.root.textContent.includes('Empty-password access requires an empty password field'));
  field(f.root,'Access or create an empty-password repository (insecure)').checked=false;fill();field(f.root,'Confirm new repository password').value='mismatch';await button(f.root,'Add repository key').click();clear();assert.ok(f.root.textContent.includes('two new repository passwords must match'));
  fill();field(f.root,'New repository password').value='';field(f.root,'Confirm new repository password').value='';await button(f.root,'Add repository key').click();clear();assert.ok(f.root.textContent.includes('Enter a nonempty new password'));
  fill();field(f.root,'Create an empty password (insecure)').checked=true;await button(f.root,'Add repository key').click();clear();assert.ok(f.root.textContent.includes('Empty-password creation requires empty new password fields'));
  field(f.root,'Create an empty password (insecure)').checked=false;fill();await button(f.root,'Change repository password').click();clear();assert.ok(f.root.textContent.includes('Confirm password replacement first'));
  fill();await button(f.root,'Remove selected other key').click();clear();assert.ok(f.root.textContent.includes('Confirm key removal first'));assert.equal(f.calls.filter(c=>c.action.startsWith('native')).length,0);
});

test('key list warning remains visible and lets the user select only a damaged noncurrent key',async t=>{
  const current='a'.repeat(64),damaged='0'.repeat(64),f=await setup(t,async()=>({currentKeyID:current,keys:[],keyWarnings:[{id:current,message:'Invalid restic key metadata.'},{id:damaged,message:'Restic storage SHA-256 verification failed.'}]}));
  field(f.root,'Repository password').value='synthetic-ui-access';await button(f.root,'List repository keys').click();assert.ok(f.root.textContent.includes(`Could not display key ${damaged}: Restic storage SHA-256 verification failed.`));assert.equal(all(f.root).filter(e=>e.tagName==='button'&&e._text==='Select this other key').length,1);await button(f.root,'Select this other key').click();assert.equal(field(f.root,'Key ID or unique prefix to remove').value,damaged);assert.equal(field(f.root,'Confirm removal of this other key').checked,false);
});

test('post-removal failure text visibly states that deletion already occurred and clears request secrets',async t=>{
  const removed='b'.repeat(64),message=`Restic key ${removed} was removed. Post-removal verification did not complete; inspect the remaining keys before retrying. owned config failure`,f=await setup(t,async()=>{throw Error(message);});
  field(f.root,'Repository password').value='synthetic-ui-access';field(f.root,'New repository password').value='synthetic-ui-unused';field(f.root,'Confirm new repository password').value='synthetic-ui-unused';field(f.root,'Key ID or unique prefix to remove').value=removed;field(f.root,'Confirm removal of this other key').checked=true;await button(f.root,'Remove selected other key').click();assert.ok(f.root.textContent.includes(message));for(const label of ['Repository password','New repository password','Confirm new repository password'])assert.equal(field(f.root,label).value,'');
});
