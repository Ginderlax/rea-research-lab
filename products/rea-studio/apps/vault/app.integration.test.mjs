import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { start } from '../../server.mjs';
import { exportKdbx,importKdbx,materializeKdbxDocument,decodeKdbxDate } from './kdbx.mjs';
import { recycleView } from './recycle.mjs';
import { one,nodes,text,serializeXml } from './xml.mjs';

test('vault HTTP CRUD persists encrypted data across host restarts and authenticates master passwords',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-vault-http-')); let host = await start({ port: 0,dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-vault-http-')); await fs.rm(dataDir,{ recursive: true,force: true }); });
  async function call(action,input = {},expected = 200) {
    const response = await fetch(`${host.url}/api/vault/${action}`,{ method: 'POST',headers: { 'content-type': 'application/json','x-rea-token': host.token },body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status,expected,payload.error); return payload.result ?? payload;
  }
  await call('create',{ password: 'HTTP-synthetic-master' }); const saved = await call('save',{ title: 'HTTP entry',password: 'HTTP-synthetic-secret' });
  const persisted = await fs.readFile(path.join(dataDir,'vault','records','vault.database.json'),'utf8'); assert.equal(persisted.includes('HTTP-synthetic-secret'),false); assert.equal(persisted.includes('HTTP-synthetic-master'),false);
  // Close while unlocked: the host's disposal hook must drop the key/session.
  await host.close(); host = await start({ port: 0,dataDir });
  assert.equal((await call('status')).locked,true); await call('unlock',{ password: 'incorrect-master-password' },400);
  await call('unlock',{ password: 'HTTP-synthetic-master' }); assert.equal((await call('read',{ id: saved.id })).entry.password,'HTTP-synthetic-secret');
  assert.equal((await fetch(`${host.url}/apps/vault/client.mjs`)).status,200);
});

test('KDBX HTTP import/export preserves encrypted document metadata across restart and failed replacement leaves existing data intact',async t => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(),'rea-vault-kdbx-http-')); let host = await start({ port: 0,dataDir });
  t.after(async () => { await host.close(); assert.equal(path.dirname(dataDir),path.resolve(os.tmpdir())); assert.ok(path.basename(dataDir).startsWith('rea-vault-kdbx-http-')); await fs.rm(dataDir,{ recursive: true,force: true }); });
  async function call(action,input = {},expected = 200) {
    const response = await fetch(`${host.url}/api/vault/${action}`,{ method: 'POST',headers: { 'content-type': 'application/json','x-rea-token': host.token },body: JSON.stringify(input) });
    const payload = await response.json(); assert.equal(response.status,expected,payload.error); return payload.result ?? payload;
  }
  const now = '2024-01-02T03:04:05Z', credentials = { password: 'Synthetic-source-password' }, options = { kdf: 'argon2id',memoryMiB: 8,passes: 1,parallelism: 1 };
  const original = { version: 1,entries: [{ id: '00000000-1111-2222-3333-444444444444',title: 'HTTP KDBX account',username: 'Synthetic-user',password: 'Synthetic-sensitive-password',url: '',group: 'Study/Nested',notes: 'Encrypted document note',totpSecret: '',createdAt: now,updatedAt: now }] };
  const bytes = await exportKdbx(original,credentials,options), source = await importKdbx(bytes,credentials); source.kdbx.xml = source.kdbx.xml.replace('</Meta>','<CustomData><Item><Key>study.private</Key><Value>Synthetic-private-metadata</Value></Item></CustomData></Meta>');
  const fileBase64 = (await exportKdbx(source,credentials,options)).toString('base64');
  await call('importKdbx',{ fileBase64,password: credentials.password,localPassword: 'Local-synthetic-master' });
  const persisted = await fs.readFile(path.join(dataDir,'vault','records','vault.database.json'),'utf8');
  for (const secret of ['Synthetic-sensitive-password','Synthetic-private-metadata','Local-synthetic-master','Synthetic-source-password','Encrypted document note']) assert.equal(persisted.includes(secret),false);
  await call('importKdbx',{ fileBase64,password: credentials.password,localPassword: 'Local-synthetic-master' },400);
  await call('importKdbx',{ fileBase64,password: 'wrong',localPassword: 'Local-synthetic-master',confirmReplace: true },400);
  assert.equal((await call('list')).entries.length,1);
  await host.close(); host = await start({ port: 0,dataDir }); await call('exportKdbx',{ password: credentials.password,options },400);
  await call('unlock',{ password: 'Local-synthetic-master' }); const entry = (await call('read',{ id: original.entries[0].id })).entry;
  await call('save',{ ...entry,password: 'Edited-synthetic-password' }); const exported = await call('exportKdbx',{ password: 'New-export-password',options });
  assert.equal(exported.bytes,Buffer.from(exported.fileBase64,'base64').length);
  const decoded = await importKdbx(Buffer.from(exported.fileBase64,'base64'),{ password: 'New-export-password' }); assert.equal(decoded.entries[0].password,'Edited-synthetic-password'); assert.match(decoded.kdbx.xml,/Synthetic-private-metadata/); assert.equal(decoded.entries[0].group,'Study/Nested');
  // A normal deletion moves the native entry into an enabled recycle bin.
  // Total exported entries still includes that entry until confirmed permanent deletion.
  const key = Buffer.alloc(32,0x49), nativeBefore = nativeEntry(decoded,entry.id), historyBefore = serializeXml(one(nativeBefore.node,'History',true));
  assert.equal((await call('historyList',{ id: entry.id })).revisions.length,1);
  assert.equal(nodes(one(nativeBefore.node,'History',true),'Entry').length,1);
  const beforeHistory = nodes(one(nativeBefore.node,'History',true),'Entry')[0];
  assert.equal(text(one(nodes(beforeHistory,'String').find(n => text(one(n,'Key',true)) === 'Password'),'Value',true)),'Synthetic-sensitive-password');
  const deleted = await call('delete',{ id: entry.id,confirm: true });
  assert.deepEqual(deleted,{ deleted: true,recycled: true,permanent: false,id: entry.id });
  assert.equal((await call('list')).entries.length,0);
  await call('read',{ id: entry.id },400); await call('historyList',{ id: entry.id },400);
  const listed = (await call('recycleList')).entries;
  assert.equal(listed.length,1); assert.equal(listed[0].id,entry.id); assert.equal(listed[0].inRecycleBin,true);
  assert.equal(listed[0].canRestorePreviousGroup,true); assert.equal(listed[0].previousGroup,'Nested');
  for (const name of ['password','notes','totpSecret']) assert.equal(Object.hasOwn(listed[0],name),false);
  const preview = (await call('recycleRead',{ id: entry.id,revision: listed[0].recycleRevision })).entry;
  for (const name of ['id','title','username','url','notes','totpSecret']) assert.equal(preview[name],entry[name]);
  assert.equal(preview.password,'Edited-synthetic-password'); assert.equal(preview.group,'Recycle Bin');
  async function retainedExport() {
    const exported = await call('exportKdbx',{ password: credentials.password,options });
    assert.equal(exported.bytes,Buffer.from(exported.fileBase64,'base64').length);
    const retained = await importKdbx(Buffer.from(exported.fileBase64,'base64'),credentials);
    assert.equal(retained.entries.length,1); assert.equal(retained.entries[0].id,entry.id);
    assert.equal(retained.entries[0].password,'Edited-synthetic-password'); assert.equal(retained.entries[0].group,'Recycle Bin');
    assert.equal(recycleView(retained,key).entries.length,0);
    const bin = recycleView(retained,key,{ bin: true }).entries; assert.equal(bin.length,1); assert.equal(bin[0].id,entry.id); assert.equal(bin[0].inRecycleBin,true);
    const native = nativeEntry(retained,entry.id), binUUID = text(one(native.meta,'RecycleBinUUID',true));
    assert.notEqual(binUUID,Buffer.alloc(16).toString('base64'));
    assert.equal(text(one(native.parent,'UUID',true)),binUUID);
    assert.equal(text(one(native.node,'PreviousParentGroup',true)),text(one(nativeBefore.parent,'UUID',true)));
    assert.equal(serializeXml(one(native.node,'History',true)),historyBefore);
    assert.equal(nodes(one(native.root,'DeletedObjects') ?? { children: [] },'DeletedObject').length,0);
    assert.match(retained.kdbx.xml,/Synthetic-private-metadata/);
    return binUUID;
  }
  const retainedBinUUID = await retainedExport();
  await host.close(); host = await start({ port: 0,dataDir });
  assert.equal((await call('status')).locked,true); await call('recycleList',{},400);
  await call('unlock',{ password: 'Local-synthetic-master' });
  assert.equal((await call('list')).entries.length,0);
  const reloaded = (await call('recycleList')).entries; assert.equal(reloaded.length,1); assert.equal(reloaded[0].id,entry.id);
  assert.equal(await retainedExport(),retainedBinUUID);
  const record = path.join(dataDir,'vault','records','vault.database.json'), beforeRejected = await fs.readFile(record,'utf8');
  const unsupported = await call('emptyRecycleBin',{ confirm: true },400); assert.match(unsupported.error,/unsupported/i);
  await call('recycleDelete',{ id: entry.id,revision: reloaded[0].recycleRevision,confirm: false,permanent: true },400);
  await call('recycleDelete',{ id: entry.id,revision: '0'.repeat(64),confirm: true,permanent: true },400);
  assert.equal(await fs.readFile(record,'utf8'),beforeRejected);
  for (const secret of ['Synthetic-sensitive-password','Edited-synthetic-password','Synthetic-private-metadata','Local-synthetic-master','Encrypted document note']) assert.equal(beforeRejected.includes(secret),false);
  const purged = await call('recycleDelete',{ id: entry.id,revision: reloaded[0].recycleRevision,confirm: true,permanent: true });
  assert.deepEqual(purged,{ deleted: true,recycled: false,permanent: true,id: entry.id });
  async function purgedExport() {
    assert.equal((await call('list')).entries.length,0); assert.equal((await call('recycleList')).entries.length,0);
    const empty = await call('exportKdbx',{ password: credentials.password,options });
    assert.equal(empty.bytes,Buffer.from(empty.fileBase64,'base64').length);
    const native = await importKdbx(Buffer.from(empty.fileBase64,'base64'),credentials);
    assert.equal(native.entries.length,0); assert.equal(recycleView(native,key).entries.length,0); assert.equal(recycleView(native,key,{ bin: true }).entries.length,0);
    const xml = materializeKdbxDocument(native), root = one(xml,'Root',true), tombstones = nodes(one(root,'DeletedObjects',true),'DeletedObject');
    assert.equal(tombstones.length,1); assert.equal(Buffer.from(text(one(tombstones[0],'UUID',true)),'base64').toString('hex'),entry.id.replaceAll('-',''));
    assert.ok(Number.isFinite(Date.parse(decodeKdbxDate(text(one(tombstones[0],'DeletionTime',true))))));
    assert.equal(text(one(one(xml,'Meta',true),'RecycleBinUUID',true)),retainedBinUUID); assert.match(native.kdbx.xml,/Synthetic-private-metadata/);
  }
  await purgedExport();
  await host.close(); host = await start({ port: 0,dataDir }); assert.equal((await call('status')).locked,true);
  await call('unlock',{ password: 'Local-synthetic-master' }); await purgedExport();
  key.fill(0);
  console.log('REA_VAULT_HTTP_RECYCLE_EXPORT '+JSON.stringify({ softDeletedExportedEntries: 1,activeEntries: 0,recycledEntries: 1,historySnapshotsRetained: 1,exportedUUIDBinMembership: true,previousParentRetained: true,metadataRetained: true,recycledRestartRetained: true,purgedExportedEntries: 0,tombstones: 1,tombstoneUUIDMatches: true,purgeRestartRetained: true,unsupportedEmptyBinRejected: true,failedMutationsLeaveEncryptedBytesExact: true,secondTestHostInstances: 4,secondTestHostInstanceRestarts: 3,actualOSHostProcessRestarts: 0,originalExecutions: 0 }));
});

// Native classification uses RecycleBinUUID ancestry, independently of a group-name filter.
function nativeEntry(data,id) {
  const xml = materializeKdbxDocument(data), root = one(xml,'Root',true), meta = one(xml,'Meta',true), wanted = Buffer.from(id.replaceAll('-',''),'hex').toString('base64');
  const pending = [one(root,'Group',true)]; let found;
  while (pending.length) { const group = pending.pop(); for (const node of nodes(group,'Entry')) if (text(one(node,'UUID',true)) === wanted) { assert.equal(found,undefined); found = { node,parent: group }; } pending.push(...nodes(group,'Group')); }
  assert.ok(found,'Exported native entry UUID must remain present'); return { xml,root,meta,...found };
}
