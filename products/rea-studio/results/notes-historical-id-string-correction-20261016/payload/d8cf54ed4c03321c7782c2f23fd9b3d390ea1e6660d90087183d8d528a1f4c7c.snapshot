// Real filesystem/HTTP regression cases. Hosted execution only for acceptance;
// no original product or fabricated DOS alias is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createDAVTransfer } from './dav-transfer.mjs';
import { fixtureServer } from './scripts/webdav-fixture.mjs';

const auth = { type: 'basic', username: 'owned-path-user', password: 'owned-synthetic-path-password' };
const mutating = request => ['PUT', 'DELETE', 'MKCOL'].includes(request.method);
async function fixture(t) {
  const temporary = await fs.realpath(os.tmpdir());
  const spelling = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-dav-canonical-path-'));
  const owner = await fs.realpath(spelling), relative = path.relative(temporary, owner);
  assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
  assert(path.basename(owner).startsWith('rea-dav-canonical-path-'));
  const server = await fixtureServer({ seed: { 'replace.txt': 'old remote bytes', 'extra.txt': 'retained extra bytes' }, auth });
  const services = [];
  t.after(async () => {
    for (const service of services) service.close();
    await server.close();
    // Recursively remove only the exact owned canonical temporary child.
    assert.equal(await fs.realpath(owner), owner);
    const cleanup = path.relative(temporary, owner);
    assert(cleanup && cleanup !== '..' && !cleanup.startsWith('..' + path.sep) && !path.isAbsolute(cleanup));
    assert(path.basename(owner).startsWith('rea-dav-canonical-path-'));
    await fs.rm(owner, { recursive: true, force: true });
  });
  const spelledRoot = path.join(spelling, 'workspace');
  await fs.mkdir(path.join(spelledRoot, 'source'), { recursive: true });
  await fs.writeFile(path.join(spelledRoot, 'source', 'replace.txt'), 'new local replacement');
  const canonicalRoot = await fs.realpath(spelledRoot);
  const engine = root => { const value = createDAVTransfer(root); services.push(value); return value; };
  return { owner, spelledRoot, canonicalRoot, server, engine,
    input: { endpoint: server.endpoint, auth, source: 'source', destination: '', mode: 'sync' } };
}
async function applyAndInspect(x, engine) {
  const preview = await engine.preview(x.input);
  assert.deepEqual(preview.counts, { copy: 1, remove: 1, mkdir: 0 });
  const result = await engine.apply({ endpoint: x.input.endpoint, auth, token: preview.token, allowDeletes: true });
  assert.equal(result.applied, true);
  assert.equal(x.server.entries.get('replace.txt').bytes.toString(), 'new local replacement');
  assert.equal(x.server.entries.has('extra.txt'), false);
  assert(result.retainedAt && !path.isAbsolute(result.retainedAt) && !result.retainedAt.split('/').includes('..'));
  const history = path.join(x.canonicalRoot, ...result.retainedAt.split('/'));
  const manifest = JSON.parse(await fs.readFile(path.join(history, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.retained.map(row => row.path), ['replace.txt', 'extra.txt']);
  assert.deepEqual(await Promise.all(manifest.retained.map(row => fs.readFile(path.join(history, row.bytes), 'utf8'))), ['old remote bytes', 'retained extra bytes']);
  assert.equal(JSON.stringify(manifest).includes(auth.password), false);
  return result;
}

test('DAV native canonical workspace supports preview apply and exact recovery bytes', async t => {
  const x = await fixture(t); await applyAndInspect(x, x.engine(x.canonicalRoot));
});

test('Windows observed DOS8.3 workspace root preserves strict transfer and recovery behavior', { skip: process.platform !== 'win32' }, async t => {
  const x = await fixture(t), submitted = path.resolve(x.spelledRoot);
  const differentSpelling = submitted !== x.canonicalRoot;
  const shortComponent = /(?:^|\\)[^\\]*~\d+(?:\\|$)/i.test(submitted);
  t.diagnostic(JSON.stringify({ kind: 'native-workspace-root-spelling', submitted, canonical: x.canonicalRoot, differentSpelling, observedShortComponent: shortComponent, syntheticAliasConstructed: false }));
  if (!differentSpelling || !shortComponent) {
    t.skip('This Windows temporary root exposes no actual distinct DOS8.3 spelling; no alias acceptance is claimed.');
    return;
  }
  assert.equal(await fs.realpath(submitted), x.canonicalRoot);
  await applyAndInspect(x, x.engine(submitted));
});

test('DAV refuses a workspace-root junction before any network request', async t => {
  const x = await fixture(t), alias = path.join(x.owner, 'workspace-root-junction');
  await fs.symlink(x.canonicalRoot, alias, 'junction');
  assert.equal((await fs.lstat(alias)).isSymbolicLink(), true);
  await assert.rejects(x.engine(alias).preview(x.input), /aliases|links/);
  assert.equal(x.server.requests.length, 0);
});

test('DAV refuses a reparse ancestor of the configured workspace before network', async t => {
  const x = await fixture(t), physical = path.join(x.owner, 'physical-parent'), alias = path.join(x.owner, 'parent-junction');
  await fs.mkdir(path.join(physical, 'workspace', 'source'), { recursive: true });
  await fs.writeFile(path.join(physical, 'workspace', 'source', 'owned.txt'), 'owned ancestor target');
  await fs.symlink(physical, alias, 'junction');
  assert.equal((await fs.lstat(alias)).isSymbolicLink(), true);
  await assert.rejects(x.engine(path.join(alias, 'workspace')).preview(x.input), /aliases|links/);
  assert.equal(x.server.requests.length, 0);
});

test('DAV canonical-root handling retains the one-hardlink source guard', async t => {
  const x = await fixture(t);
  await fs.link(path.join(x.canonicalRoot, 'source', 'replace.txt'), path.join(x.owner, 'owned-second-link.txt'));
  await assert.rejects(x.engine(x.spelledRoot).preview(x.input), /one link/);
  assert.equal(x.server.requests.length, 0);
});

test('DAV rechecks configured root and refuses a junction substituted after preview', async t => {
  const x = await fixture(t), engine = x.engine(x.spelledRoot), preview = await engine.preview(x.input);
  const moved = path.join(x.owner, 'moved-owned-workspace');
  // Both names are exact children of this case's already verified owner.
  assert.equal(path.dirname(x.canonicalRoot), x.owner); assert.equal(path.dirname(moved), x.owner);
  await fs.rename(x.canonicalRoot, moved);
  await fs.symlink(moved, x.canonicalRoot, 'junction');
  const writesBefore = x.server.requests.filter(mutating).length;
  await assert.rejects(engine.apply({ endpoint: x.input.endpoint, auth, token: preview.token, allowDeletes: true }), /aliases|links/);
  assert.equal(x.server.requests.filter(mutating).length, writesBefore);
  assert.equal(x.server.entries.get('replace.txt').bytes.toString(), 'old remote bytes');
  assert.equal(x.server.entries.get('extra.txt').bytes.toString(), 'retained extra bytes');
});
