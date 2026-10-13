import test from 'node:test';import assert from 'node:assert/strict';
import {ui,gate,find} from './notebook-trash-review-fixture.mjs';
// Candidate UI adapter: explicitly Cancel/Confirm the actual in-page controls.
// The baseline bodies and native-dialog expectations remain inert in baseline/.
test('actual staged client confirms notebook cascade, allows management of trash, restores and keeps dirty drafts',async t=>{
 const f=await ui(t);f.manage();const before=f.calls.length,pending=f.click(f.byText('Move notebook to trash')),dialog=find(f.root,n=>n.attributes.role==='alertdialog');assert.match(dialog.children[1].textContent,/all its subnotebooks/);await f.click(find(dialog,n=>n.textContent==='Cancel'));await pending;assert.equal(f.calls.slice(before).some(c=>c.action==='notebook-trash'),false);
 await f.confirmNotebook('Move notebook to trash');assert.equal(Object.values(f.read().notes)[0].deletedAt!==null,true);assert.equal(f.byLabel('Manage notebook').options.find(o=>o.value===f.parent).disabled,false);
 const restored=f.click(f.byText('Restore notebook')),restoreDialog=find(f.root,n=>n.attributes.role==='alertdialog');assert.match(restoreDialog.children[1].textContent,/including notes trashed separately/);await f.click(find(restoreDialog,n=>n.textContent==='Confirm restore notebook'));await restored;assert.equal(Object.values(f.read().notes)[0].deletedAt,null);
 const body=f.byLabel('Markdown note');body.value='private dirty draft';body.oninput();const requests=f.calls.length;await f.click(f.byText('Move notebook to trash'));assert.equal(f.calls.length,requests);assert.equal(body.value,'private dirty draft');assert.equal(find(f.root,n=>n.attributes.role==='status').textContent,'Save your draft before changing notebook organization.');
});
test('held notebook operation disables selection/editor controls and refuses duplicate requests until one commit',async t=>{
 const g=gate();let held=true;const f=await ui(t,async({action})=>{if(action==='notebook-trash'&&held){g.enter();await g.held;}});f.manage();const first=f.confirmNotebook('Move notebook to trash');await g.started;
 assert.equal(f.byLabel('Manage notebook').disabled,true);assert.equal(f.byLabel('Markdown note').disabled,true);await f.byText('Move notebook to trash').onclick();assert.equal(f.calls.filter(c=>c.action==='notebook-trash').length,1);held=false;g.release();await first;assert.equal(f.byLabel('Manage notebook').disabled,false);assert.equal(f.byLabel('Markdown note').disabled,false);
});
