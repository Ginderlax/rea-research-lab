import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,field,beginRestore} from './ui-fixture.mjs';

test('restore refuses an already modified main editor and preserves the unsaved draft',async t=>{
  const f=await fixture(t,'preexisting-draft-before-restore');
  const restore=await beginRestore(f.root);
  const encryptedBefore=structuredClone(f.store.value);
  field(f.root,'Notes').value='Unsaved draft present before pressing Restore';
  const requestsBefore=f.requests.length;
  await restore.start();
  f.observation.after={title:field(f.root,'Title').value,notes:field(f.root,'Notes').value};
  f.observation.restoreRequests=f.requests.slice(requestsBefore).filter(x=>x.action==='historyRestore').length;
  f.observation.encryptedRecordUnchanged=JSON.stringify(encryptedBefore)===JSON.stringify(f.store.value);
  assert.equal(f.observation.after.notes,'Unsaved draft present before pressing Restore','Released KeePass disables/refuses history restore while the entry dialog contains unsaved changes.');
  assert.equal(f.observation.restoreRequests,0,'No restore effect should be requested for an already modified editor.');
  assert.ok(f.observation.encryptedRecordUnchanged,'A refused restore should leave the encrypted record unchanged.');
});
