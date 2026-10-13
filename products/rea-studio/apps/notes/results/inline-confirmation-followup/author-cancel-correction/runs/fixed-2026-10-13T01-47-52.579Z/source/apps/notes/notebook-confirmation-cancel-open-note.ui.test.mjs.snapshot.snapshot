import test from 'node:test';import assert from 'node:assert/strict';import {ui,find} from './notebook-trash-review-fixture.mjs';
test('Cancel with an opened saved note leaves attachments, draft, generation-facing UI and backend requests unchanged',async t=>{
 const f=await ui(t);await f.open();await Promise.resolve();f.manage();
 const before=JSON.stringify(f.read()),calls=f.calls.length,body=f.byLabel('Markdown note').value,status=find(f.root,n=>n.attributes.role==='status').textContent;
 const attachments=find(f.root,n=>n.tagName==='h3'&&n.textContent==='Attachments');assert.ok(attachments);
 const draft=f.byLabel('Markdown note'),saved=f.byText('Save note'),trigger=f.byText('Move notebook to trash'),pending=f.click(trigger),dialog=find(f.root,n=>n.attributes.role==='alertdialog');assert.ok(dialog);
 await f.click(find(dialog,n=>n.tagName==='button'&&n.textContent==='Cancel'));await pending;await Promise.resolve();
 assert.equal(JSON.stringify(f.read()),before);assert.equal(draft.value,body);assert.equal(draft.disabled,false);assert.equal(saved.disabled,false);assert.equal(document.activeElement,trigger);assert.equal(find(f.root,n=>n.attributes.role==='alertdialog'),null);assert.equal(find(f.root,n=>n.attributes.role==='status').textContent,status);assert.deepEqual(f.calls.slice(calls),[],'Cancel must not refresh attachments or issue notebook/read requests');
});
