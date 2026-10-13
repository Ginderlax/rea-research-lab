import {createEditorVaultProofMigration,createEditorVaultProofMigrationFromRoot} from './editor-vault-proof-migration.mjs';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, lstatSync, realpathSync} from 'node:fs';
import {resolve, relative, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {createNotesInlineHistoricalResolver} from './verify-notes-inline-followups.mjs';

const studio = 'products/rea-studio/';
const notes = studio + 'apps/notes/results/notebook-trash-followup/';
const vault = studio + 'apps/vault/results/recycle-followup/';
const hash = b => createHash('sha256').update(b).digest('hex');
const pins = {
 notesPlan: 'e7cad54fc3fae5a3b67c9ad35f15ea9d920a1b158c92c9cec6bc4f5369535c49',
 notesPriorPlan: '0138f1edcc4ae7d0f2361754c5faca247d3153abefcb953ae58330bdd1d944c6',
 vaultPlan: 'afab12d14c078695c15b50de94c892f63c616d2cea77e941392384a91e18c1fe',
 checkpoint455: '4d73c4e77c042428c9ab946c5884dad69c052394037be5aeb4f2f21a5b0a9786',
 installation: '1f35380aad673b194663751a48e6be19e7f99d45b85a5de39eb83774bd252280',
 jex: '044885c906ba7d8cb97a95fbdd6bc2323ba31a3c301e7ed1d6e592acec8944af',
 kdbx: 'c79b1d0ea208df44fa0f137eb0ea9c5d0239212a58474834d11d63ea0d7f4d77',
};

function safe(p, publicPath = true) {
 assert.ok(typeof p === 'string' && p.length > 0 && p.length < 2048, 'Invalid proof path');
 assert.ok(!/[\\:\x00-\x1f]/.test(p) && !p.startsWith('/') && !p.endsWith('/'), 'Unsafe proof path: ' + p);
 assert.ok(p.split('/').every(v => v && v !== '.' && v !== '..'), 'Unsafe proof segment: ' + p);
 if (publicPath) assert.ok(!p.split('/').includes('.local'), 'Local public proof path: ' + p);
 return p;
}
function identity(r) {
 assert.ok(r && Number.isSafeInteger(r.bytes) && r.bytes >= 0 && r.bytes <= 32 * 1024 * 1024, 'Invalid proof byte bound');
 assert.match(r.sha256, /^[0-9a-f]{64}$/);
 return r;
}
function same(a, b, label) {
 identity(a); identity(b);
 assert.equal(a.bytes, b.bytes, 'Byte length: ' + label);
 assert.equal(a.sha256, b.sha256, 'SHA256: ' + label);
}
function entries(m) {
 const rows = m.records ?? m.files ?? m.copies;
 assert.ok(Array.isArray(rows) && rows.length <= 10000, 'Invalid manifest rows');
 const seen = new Set();
 for (const r of rows) { safe(r.path, false); identity(r); assert.ok(!seen.has(r.path), 'Duplicate manifest row: ' + r.path); seen.add(r.path); }
 return rows;
}
function noNative(b, p) {
 assert.ok(!(b[0] === 0x4d && b[1] === 0x5a), 'Native executable/library bytes: ' + p);
 assert.ok(!(b[0] === 0x50 && b[1] === 0x4b && [3, 5, 7].includes(b[2])), 'Native ZIP bytes: ' + p);
 assert.ok(!(b[0] === 0x03 && b[1] === 0xd9 && b[2] === 0xa2 && b[3] === 0x9a), 'Native KDBX bytes: ' + p);
 assert.ok(b.subarray(257, 262).toString() !== 'ustar', 'Native TAR bytes: ' + p);
}
function freezeLinks(f, manifest, receipt) {
 if (typeof f.manifest === 'string') assert.equal(f.manifestSha256, manifest.sha256, 'Original freeze manifest SHA');
 else same(f.manifest, manifest, 'Original freeze manifest');
 const r = f.receipt ?? f.validation;
 if (typeof r === 'string') assert.equal(f.receiptSha256, receipt.sha256, 'Original freeze receipt SHA');
 else same(r, receipt, 'Original freeze receipt');
}

// Pure guards also serve finite source-only regression fixtures.
export const assertPublicProofPath = p => safe(p);
export function assertInertProofBytes(b, p = 'synthetic.snapshot') {
 assert.ok(Buffer.isBuffer(b) && b.length <= 32 * 1024 * 1024, 'Invalid inert proof bytes');
 safe(p); noNative(b, p);
}

/** Source-only proof verification. onFile observes authenticated reads for a separate recorder.
 * No original programs, app modules, local carriers, network, hosts, or behavioral tests execute.
 * Reads are individually/aggregate bounded; this is not a hard I/O deadline or a race-free FS sandbox.
 */
export function verifyNotesVaultFollowups(root, {onFile, resolveHistorical} = {}) {
 resolveHistorical ??= createNotesInlineHistoricalResolver(root, {onFile});
 const base = realpathSync(resolve(root));
 const readRows = new Map();
 let total = 0;
 function location(p) {
  safe(p);
  let current = base;
  for (const segment of p.split('/')) { current = resolve(current, segment); assert.ok(!lstatSync(current).isSymbolicLink(), 'Symlink/reparse proof path: ' + p); }
  const actual = realpathSync(current), rel = relative(base, actual);
  assert.ok(rel && rel !== '..' && !rel.startsWith('..' + sep) && !rel.startsWith(sep), 'Escaping proof path: ' + p);
  return current;
 }
 function rawRead(p, expected, nativeCheck = false) {
  const at = location(p), stat = lstatSync(at);
  assert.ok(stat.isFile() && stat.size <= 32 * 1024 * 1024, 'Nonregular/oversized proof: ' + p);
  const b = readFileSync(at), r = {bytes: b.length, sha256: hash(b)};
  if (expected) same(r, expected, p);
  if (readRows.has(p)) same(r, readRows.get(p), 'Changed while verifying: ' + p);
  else { total += b.length; assert.ok(total <= 512 * 1024 * 1024 && readRows.size < 10000, 'Aggregate proof bound'); readRows.set(p, r); onFile?.({path: p, ...r}); }
  if (nativeCheck) noNative(b, p);
  return b;
 }
 const migration=createEditorVaultProofMigration(rawRead);function read(p,expected,nativeCheck=false){return rawRead(migration.resolve(p,expected)??p,expected,nativeCheck);}const json = (p, expected) => JSON.parse(read(p, expected).toString('utf8'));
 function tree(prefix, rel = '', found = []) {
  assert.ok(rel.split('/').length < 40 && found.length < 20000, 'Proof inventory bound');
  const dir = location(prefix + (rel ? '/' + rel : ''));
  assert.ok(lstatSync(dir).isDirectory(), 'Invalid proof folder');
  for (const d of readdirSync(dir, {withFileTypes: true})) {
   const p = rel ? rel + '/' + d.name : d.name; safe(p);
   if (d.isDirectory()) tree(prefix, p, found);
   else { assert.ok(d.isFile(), 'Nonregular proof inventory: ' + p); found.push(p); }
  }
  return found;
 }
 function plan(prefix, count, digest) {
  const mb = read(prefix + '/manifest.json.snapshot'); assert.equal(hash(mb), digest, 'Pinned plan manifest');
  const m = JSON.parse(mb), rows = entries(m); assert.equal(rows.length, count);
  assert.deepEqual(tree(prefix).sort(), [...rows.map(r => r.path + '.snapshot'), 'manifest.json.snapshot', 'freeze.json.snapshot'].sort(), 'Strict plan inventory');
  for (const r of rows) read(prefix + '/' + r.path + '.snapshot', r, true);
  const f = json(prefix + '/freeze.json.snapshot');
  same({bytes: mb.length, sha256: digest}, f.manifest, 'Plan freeze manifest');
  const receipt = rows.find(r => r.path === 'validation.json'); assert.ok(receipt); same(receipt, f.receipt, 'Plan freeze receipt');
  return {m, rows, json: n => json(prefix + '/' + n + '.snapshot'), read: n => read(prefix + '/' + n + '.snapshot')};
 }
 const np = plan(notes + 'publication-plan', 26, pins.notesPlan);
 const old = plan(notes + 'prior-publication-plan', 25, pins.notesPriorPlan);
 const vp = plan(vault + 'publication-plan', 45, pins.vaultPlan);
 const nv = np.json('validation.json'), ov = old.json('validation.json'), vv = vp.json('validation.json');
 assert.equal(nv.sourceOnly, true); assert.equal(nv.productionModified, false); assert.equal(nv.executedCurrentLayoutTests, 0); assert.equal(nv.prospectiveCurrentLayoutTests, 59);
 assert.equal(ov.prospectiveCurrentLayoutTests, 73); assert.equal(ov.executedCurrentLayoutTests, 0);
 const historical = np.json('historical-plan-reference.json'); assert.equal(historical.manifestSha256, pins.notesPriorPlan); assert.equal(historical.oldBytesUnchanged, true);
 for (const k of ['fullProductParity', 'securityParity', 'universalSuperiority', 'productionModified']) assert.equal(vv[k], false);
 assert.equal(vv.sourceOnly, true); assert.equal(vv.prospectiveFocusedGroups, 79);
 assert.deepEqual(vv.executions, {candidateRuntime: 0, behavioralTests: 0, originalProgram: 0, browser: 0, benchmarks: 0});

 // Every original Notes record belongs to exactly one public or explicit local-only row.
 const nm = np.json('public-preservation-map.json'), nx = np.json('local-exclusions.json'), nr = np.json('references.json');
 assert.equal(nm.publicCount, 920); assert.equal(nm.records.length, 920); assert.equal(nx.excluded.length, 15);
 assert.equal(nx.inspectedManifestRecordsAndSelfCarriers, 935); assert.equal(nx.wholeTreesPublicClaim, false);
 const noteIndex = new Map(), destinations = new Set();
 for (const r of [...nm.records, ...nx.excluded]) {
  safe(r.sourcePath, false); identity(r); const key = r.reference + ':' + r.sourcePath;
  assert.ok(!noteIndex.has(key), 'Duplicate Notes mapping: ' + key); noteIndex.set(key, r);
  if (r.destination) { const p = studio + safe(r.destination); assert.ok(!destinations.has(p), 'Duplicate Notes public path'); destinations.add(p); read(p, r, true); }
  else { assert.equal(r.localOnly, true); assert.equal(r.bytes, 9728); assert.equal(r.sha256, pins.jex); }
 }
 assert.equal(nr.references.length, 4);
 let noteManifestRows = 0;
 for (const ref of nr.references) {
  const lookup = p => { const r = noteIndex.get(ref.id + ':' + p); assert.ok(r?.destination, 'Missing public Notes identity: ' + p); return r; };
  const mr = lookup(ref.manifest); assert.equal(mr.sha256, ref.manifestSha256);
  const orig = json(studio + mr.destination, mr), rows = entries(orig); assert.equal(rows.length, ref.count); noteManifestRows += rows.length;
  const rr = lookup(ref.receipt); assert.equal(rr.sha256, ref.receiptSha256);
  const fr = lookup('freeze.json'), frozen = json(studio + fr.destination, fr);
  freezeLinks(frozen, mr, rr);
  const originalPaths = new Set(rows.map(r => r.path));
  for (const r of rows) { const mapped = noteIndex.get(ref.id + ':' + r.path); assert.ok(mapped, 'Missing Notes original row'); same(r, mapped, ref.id + ':' + r.path); }
  const epoch = [...noteIndex.values()].filter(r => r.reference === ref.id); assert.equal(epoch.length, rows.length + 2);
  for (const r of epoch) assert.ok(originalPaths.has(r.sourcePath) || [ref.manifest, 'freeze.json'].includes(r.sourcePath), 'Unexpected Notes self carrier');
 }
 assert.equal(noteManifestRows, 927); assert.equal(noteIndex.size, 935);
 for (const ref of nr.references) {
  const expectedPaths=nm.records.filter(r=>r.reference===ref.id).map(r=>r.destination.slice(('apps/notes/results/notebook-trash-followup/'+ref.id+'/').length));if(ref.id==='stage'){const alias=read(notes+'stage/NOTICE.md.snapshot',{bytes:543,sha256:'3d56a4257cdabb5f678d65ca0e8edfe045b7976a501ac6fcd712b93eef0d81a7'},true);assert.ok(alias.equals(read(notes+'publication-fix/NOTICE.md.snapshot')),'Exact separately documented current notice alias');expectedPaths.push('NOTICE.md.snapshot');}assert.deepEqual(tree(notes+ref.id).sort(),expectedPaths.sort(),'Strict Notes epoch inventory plus one exact current documentation alias');
 }

 // Vault deduplicates bytes, retaining every epoch/path relation and its one native exclusion.
 const vm = vp.json('selected-file-map.final.json'); assert.equal(vm.schema, 'rea-source-only-vault-publication-map/v2');
 assert.equal(vm.payload.length, 858); assert.equal(vm.epochs.length, 4); assert.equal(vm.excludedNativeCarriers.length, 1);
 assert.equal(vm.noRecursiveEpochCopy, true);
 const vaultIndex = new Map(), objects = new Map(); let published = 0, excluded = 0;
 for (const r of vm.payload) {
  safe(r.sourcePath, false); safe(r.originalPathAlias); identity(r); const key = r.epoch + ':' + r.sourcePath;
  assert.ok(!vaultIndex.has(key), 'Duplicate Vault epoch mapping'); vaultIndex.set(key, r);
  if (r.publication === 'local-only') { excluded++; assert.equal(r.bytes, 1911); assert.equal(r.sha256, pins.kdbx); assert.equal(r.proposedPublicBlob, null); assert.equal(r.publicPath, null); }
  else {
   assert.equal(r.publication, 'public-source'); safe(r.publicPath); published++;
   if (objects.has(r.publicPath)) same(objects.get(r.publicPath), r, 'Vault shared blob'); else objects.set(r.publicPath, r);
   read(r.publicPath, r, true);
  }
 }
 assert.equal(published, 857); assert.equal(excluded, 1); assert.equal(objects.size, 471);
 same(vm.excludedNativeCarriers[0], [...vaultIndex.values()].find(r => r.publication === 'local-only'), 'Vault excluded carrier');
 let vaultManifestRows = 0;
 for (const e of vm.epochs) {
  const lookup = p => { const r = vaultIndex.get(e.id + ':' + p); assert.ok(r?.publicPath, 'Missing Vault self carrier'); return r; };
  const mr = lookup(e.manifestName); assert.equal(mr.sha256, e.manifestSha); same(mr, e.manifest, 'Vault manifest descriptor');
  const orig = json(mr.publicPath, mr), rows = entries(orig); assert.equal(rows.length, e.count); vaultManifestRows += rows.length;
  assert.equal(lookup(e.receiptName).sha256, e.receiptSha); same(lookup(e.freezeName), e.freeze, 'Vault freeze descriptor');
  const frozen = json(lookup(e.freezeName).publicPath, lookup(e.freezeName));
  freezeLinks(frozen, mr, lookup(e.receiptName));
  for (const r of rows) { const mapped = vaultIndex.get(e.id + ':' + r.path); assert.ok(mapped, 'Missing Vault original row'); same(mapped, r, e.id + ':' + r.path); }
  const originalPaths = new Set(rows.map(r => r.path)), epoch = [...vaultIndex.values()].filter(r => r.epoch === e.id); assert.equal(epoch.length, rows.length + 2);
  for (const r of epoch) assert.ok(originalPaths.has(r.sourcePath) || [e.manifestName, e.freezeName].includes(r.sourcePath), 'Unexpected Vault self carrier');
 }
 assert.equal(vaultManifestRows, 850);
 const reuse = vp.json('public-existing-reuse.json'); assert.equal(reuse.files.length, 27);
 const rm = json(reuse.manifest.path, reuse.manifest), reusedRows = rm.files;
 assert.ok(Array.isArray(reusedRows)); assert.equal(reusedRows.length, 1454);
 for (const r of reuse.files) { read(r.path, r, true); const mapped = objects.get(r.path); assert.ok(mapped); same(r, mapped, 'Vault reused path'); const prior = reusedRows.find(x => x.preservedPath === r.path); assert.ok(prior, 'Missing reused original history manifest row'); assert.equal(prior.kind, 'public-inert-snapshot'); same(prior, r, 'Prior history identity'); }
 const newObjects = [...objects.keys()].filter(p => p.startsWith(vault + 'evidence-blobs/'));
 assert.equal(newObjects.length, 444); assert.equal(objects.size - newObjects.length, 27);
 assert.deepEqual(tree(vault + 'evidence-blobs').sort(), newObjects.map(p => p.slice((vault + 'evidence-blobs/').length)).sort(), 'Strict Vault new blob inventory');
 const jpegAliases = [...objects.keys()].filter(p => p.endsWith('.png')); assert.equal(jpegAliases.length, 4);
 for (const p of jpegAliases) assert.equal(read(p).subarray(0, 3).toString('hex'), 'ffd8ff', 'Intentional JPEG bytes under retained PNG alias');

 // Authenticate the root installer as a frozen source-only operation, then resolve proposals.
 const ip = studio + 'results/reviewed-followup-installation-20261013/';
 const imb = read(ip + 'preservation-manifest.json'); assert.equal(hash(imb), pins.installation);
 const im = JSON.parse(imb); assert.equal(im.copies.length, 8);
 for (const r of im.copies) read(ip + safe(r.path), r, true);
 const ir = im.copies.find(r => r.sourcePath === 'installation.json'); assert.ok(ir);
 const installation = json(ip + ir.path, ir);
 assert.equal(installation.installed.length, 34); assert.equal(installation.copies.length, 1879);
 assert.equal(installation.behaviorTestsRun, 0); assert.equal(installation.originalExecutions, 0); assert.equal(installation.browserWorkflows, 0);
 assert.equal(installation.allSourceBytesStableBeforeAfter, true);
 for (const k of ['fullProductParity', 'universalSuperiority']) assert.equal(installation[k], false);
 read(notes + 'production-installation/installation.json.snapshot', ir); read(vault + 'production-installation/installation.json.snapshot', ir);
 const installed = new Map();
 for (const r of installation.installed) { safe(r.destination); assert.ok(!installed.has(r.destination), 'Duplicate installed destination'); installed.set(r.destination, r); const resolution = resolveHistorical(r.destination, r.after); assert.ok(resolution, 'Missing explicit Notes inline historical mapping'); read(resolution.historicalPath, r.after); read(r.destination, resolution.currentExpected); }
 const copies = new Map(); for (const r of installation.copies) { safe(r.path); identity(r); const key = r.sourceRoot + ':' + r.sourcePath; assert.ok(!copies.has(key), 'Duplicate installer source mapping'); copies.set(key, r); read(r.path, r, true); }
 const nl = np.json('live-copy-list.json'); assert.equal(nl.proposals.length, 13);
 let noteAdapterReconstructions = 0;
 for (const p of nl.proposals) {
  const row = installed.get(studio + p.destination); assert.ok(row); same(row.after, {bytes: p.proposedBytes, sha256: p.proposedSha256}, 'Notes live proposal');
  read(notes + 'publication-plan/' + p.proposalPath + '.snapshot', row.after);
  const original = nm.records.find(r => r.sourceRoot + '/' + r.sourcePath === p.source); assert.ok(original, 'Missing Notes adapter source');
  same(original, {bytes: p.sourceBytes, sha256: p.sourceSha256}, 'Notes adapter input');
  if (p.byteIdentical) same(original, row.after, 'Exact Notes source');
  else if (!p.destination.endsWith('/README.md')) {
   let t = read(studio + original.destination).toString('utf8');
   if (p.destination.endsWith('-oracle.mjs')) {
    t = t.replace("new URL('../../../../',import.meta.url)", "new URL('./results/notebook-trash-followup/stage/',import.meta.url)")
     .replaceAll("new URL('prior-source-provenance.json',root)", "new URL('prior-source-provenance.json.snapshot',root)")
     .replaceAll("new URL('license-and-special-id-provenance.json',root)", "new URL('license-and-special-id-provenance.json.snapshot',root)")
     .replace("['prior-source-provenance.json','trash-source-provenance.json']", "['prior-source-provenance.json.snapshot','trash-source-provenance.json.snapshot']")
     .replaceAll('new URL(record.path,root)', "new URL(record.path+'.snapshot',root)")
     .replaceAll('new URL(special.path,root)', "new URL(special.path+'.snapshot',root)");
   } else if (p.destination.endsWith('/notebook-trash.test.mjs')) {
    t = t.replace("'../../../../.local/observations/'", "'../../.local/notes-notebook-trash-observations/'");
   } else {
    t = t.replaceAll('../../notes-trash-publication-fix-next/products/rea-studio/apps/notes/', './')
     .replaceAll('../products/rea-studio/apps/notes/', './')
     .replaceAll("'./ui-fixture.mjs'", "'./notebook-trash-review-fixture.mjs'")
     .replaceAll("process.env.NOTES_REVIEW_OUTPUT??'./observations/'", "process.env.NOTES_REVIEW_OUTPUT??'../../.local/notes-notebook-trash-observations/'")
     .replaceAll("process.env.NOTES_REVIEW_OUTPUT??'../.local/observations/'", "process.env.NOTES_REVIEW_OUTPUT??'../../.local/notes-notebook-trash-observations/'");
   }
   same({bytes: Buffer.byteLength(t), sha256: hash(Buffer.from(t))}, row.after, 'Notes path-only transform'); noteAdapterReconstructions++;
  }
 }
 assert.equal(noteAdapterReconstructions, 7);
 assert.equal(vm.install.length, 18); assert.equal(vm.docs.length, 3); let vaultAdapterReconstructions = 0;
 for (const p of vm.install) {
  const row = installed.get(p.destination); assert.ok(row); same(row.after, p.proposedIdentity ?? p, 'Vault installed proposal');
  const original = vm.payload.find(r => r.sourceRoot + '/' + r.sourcePath === p.source); assert.ok(original?.publicPath, 'Missing Vault adapter source');
  same(original, p.sourceIdentity ?? p, 'Vault adapter input');
  if (p.proposedBytesPath) { read(vault + 'publication-plan/' + p.proposedBytesPath + '.snapshot', row.after); }
  else same(original, row.after, 'Exact Vault source');
  if (Array.isArray(p.transform)) {
   let t = read(original.publicPath).toString('utf8');
   for (const transform of p.transform) { const from = Array.isArray(transform) ? transform[0] : transform.from, to = Array.isArray(transform) ? transform[1] : transform.to; assert.ok(typeof from === 'string' && from && typeof to === 'string' && t.includes(from), 'Missing exact adapter input'); t = t.replaceAll(from, to); }
   if (p.outputTransform) { assert.equal(p.destination, studio + 'apps/vault/recycle-boundary-fixture.mjs'); t = t.replaceAll("new URL('observations/", "new URL('../../.local/recycle-boundary-review/"); }
   same({bytes: Buffer.byteLength(t), sha256: hash(Buffer.from(t))}, row.after, 'Vault path-only transform'); vaultAdapterReconstructions++;
  }
 }
 assert.equal(vaultAdapterReconstructions, 7);
 for (const p of vm.docs) { const row = installed.get(p.destination); assert.ok(row?.documentation); const proposal = p.destination.endsWith('/README.md') ? 'proposed-docs/README.md' : p.source; read(vault + 'publication-plan/' + proposal + '.snapshot', row.after); }
 assert.equal(installed.size, nl.proposals.length + vm.install.length + vm.docs.length);

 // Resolve before-images to immutable 455 snapshots, never compare historical hashes to current code.
 const cp = studio + 'results/milestones/packs-notebooks-history-455ab6c-20261012/snapshot-manifest.json';
 const cb = read(cp); assert.equal(hash(cb), pins.checkpoint455);
 const checkpoint = JSON.parse(cb); assert.equal(checkpoint.sourceSnapshots.length, 674); assert.equal(checkpoint.metadataSnapshots.length, 23);
 assert.equal(checkpoint.originalReceiptsRebound, false); assert.equal(checkpoint.fullProductParity, false);
 const baseline = [...checkpoint.sourceSnapshots, ...checkpoint.metadataSnapshots]; let beforeImages = 0;
 for (const r of installation.installed.filter(r => r.before)) { const oldImage = baseline.find(b => b.sourcePath === r.destination && b.bytes === r.before.bytes && b.sha256 === r.before.sha256); assert.ok(oldImage, 'Missing immutable455 before-image: ' + r.destination); read(oldImage.snapshotPath, r.before); beforeImages++; }
 const vb = vp.json('production-reference-baseline.json');
 let vault455Baseline = 0, vaultPlanOnlyBaseline = 0;
 for (const r of vb.sourceFiles) {
  const oldImage = baseline.find(b => b.sourcePath === r.path && b.bytes === r.bytes && b.sha256 === r.sha256);
  if (oldImage) { read(oldImage.snapshotPath, r); vault455Baseline++; }
  else { assert.equal(r.path, studio + 'apps/vault/KDBX-COVERAGE.md'); assert.equal(r.sha256, 'e6f069cab063723d225f62cf98bf6e71f619755ed9e545e62d822104ec87ed39'); read(r.path, r); vaultPlanOnlyBaseline++; }
 }
 assert.equal(vault455Baseline, 30); assert.equal(vaultPlanOnlyBaseline, 1);
 for (const r of vb.selectedCurrentHistory) read(r.path, r);

 // Parent metadata may evolve; preserve only the original source SHA and capability ID projection.
 const binding = vp.json('requirements-binding.json'); assert.equal(binding.originalSources.length, 159); assert.equal(binding.capabilityIds.length, 232);
 const sourceRows = [], capabilityRows = [];
 for (const r of binding.registries) {
  const doc = json(r.path), registry = r.path.split('/').at(-1);
  for (const s of doc.sources) sourceRows.push({registry, id: s.id, sha256: s.sha256});
  for (const c of doc.capabilities ?? (doc.products ? doc.products.flatMap(p => p.capabilities) : doc.baselineProducts.flatMap(p => p.requirements))) capabilityRows.push({registry, id: c.id});
 }
 const sort = rows => rows.toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
 assert.deepEqual(sort(sourceRows), sort(binding.originalSources)); assert.deepEqual(sort(capabilityRows), sort(binding.capabilityIds));
 const nb = np.json('registry-identity-binding.json'); assert.equal(nb.sourceFingerprints, 159); assert.equal(nb.capabilityIDs, 232);
 const noteSources = nb.registries.flatMap(r => r.sources.map(s => ({registry: r.path.split('/').at(-1), ...s}))), noteCaps = nb.registries.flatMap(r => r.capabilityIDs.map(c => ({registry: r.path.split('/').at(-1), id: typeof c === 'string' ? c : c.id})));
 assert.deepEqual(sort(noteSources), sort(binding.originalSources)); assert.deepEqual(sort(noteCaps), sort(binding.capabilityIds));
 // Re-read every byte identity to detect source changes over the finite verification interval.
 for (const [p, r] of readRows) read(p, r);
 return {schema: 'rea-notes-vault-public-proof-verification/v1', notesOriginalPaths: 935, notesPublishedPaths: 920, notesExcludedJEXCopies: 15, vaultOriginalPaths: 858, vaultPublishedPathRecords: 857, vaultUniquePublicPaths: 471, vaultNewPublicPaths: 444, vaultReusedPublicPaths: 27, vaultExcludedKDBXCopies: 1, intentionalJPEGAliases: 4, strictNotesFinalPlan: 26, strictNotesHistoricalPlan: 25, strictVaultPlan: 45, installedFiles: 34, separatelyRecordedCurrentDocumentationAliases: 1, notesPathOnlyAdapterReconstructions: noteAdapterReconstructions, vaultPathOnlyAdapterReconstructions: vaultAdapterReconstructions, immutable455BeforeImages: beforeImages, vault455BaselineFiles: vault455Baseline, vaultPlanOnlyBaselineFiles: vaultPlanOnlyBaseline, originalSourceIdentities: 159, originalCapabilityIDs: 232, authenticatedFiles: readRows.size, authenticatedBytes: total, allSourceBytesStable: true, localCarrierBytesRequired: false, newBehaviorTests: 0, newOriginalExecutions: 0, notesNativeConfirmationBrowserAcceptance: false, fullProductParity: false, universalSuperiority: false};
}
if (process.argv.includes('--standalone')) console.log(JSON.stringify(verifyNotesVaultFollowups(resolve(import.meta.dirname, '..'))));
