// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createSourceMetadataReader, readSourceMetadata, runWindowsMetadataBatch, WINDOWS_METADATA_SCRIPT } from './source-metadata.mjs';
import { createArchiveHandler } from './server.mjs';
import { createWorkspace } from '../../lib/storage.mjs';

const WINDOW_ROOT = 'C:\\owned-metadata-fixture';
const WINDOWS_ONLY = { skip: process.platform !== 'win32' };
const fixedDate = '2107-01-01T00:00:00.123Z';
const windowsSources = [
  { path: WINDOW_ROOT + '\\年😀', directory: true },
  { path: WINDOW_ROOT + "\\年😀\\quoted'$();😀.txt", directory: false }
];
function wireDate(iso) {
  // Fixture values are whole milliseconds; production verifies independent
  // decimal-ms and exact-UTC representations supplied by .NET.
  return { utc: iso.slice(0, -1) + '0000Z', ms: String(Date.parse(iso)) + '.0000' };
}
function responseFor(request, iso = fixedDate) {
  const date = wireDate(iso);
  return JSON.stringify({ version: 1, items: request.sources.map((source, index) => ({
    index, path: source.path, directory: source.directory,
    modifiedAtUtc: date.utc, modifiedAtMs: date.ms,
    accessedAtUtc: date.utc, accessedAtMs: date.ms,
    createdAtUtc: date.utc, createdAtMs: date.ms
  })) });
}

test('Windows batch reader correlates every Unicode path/type and preserves dates across the 32-bit-seconds boundary', async () => {
  for (const iso of ['1969-12-31T23:59:59.123Z', '2106-02-07T06:28:15.123Z', '2106-02-07T06:28:16.123Z', fixedDate, '2026-10-15T12:34:56.789Z']) {
    let calls = 0;
    const reader = createSourceMetadataReader({ platform: 'win32', nativeRead: async input => {
      calls += 1;
      const request = JSON.parse(input);
      assert.equal(request.root, WINDOW_ROOT);
      assert.deepEqual(request.sources.map(source => source.path), windowsSources.map(source => source.path));
      assert.equal(Object.hasOwn(request, 'password'), false);
      return responseFor(request, iso);
    } });
    assert.deepEqual(await reader(windowsSources, WINDOW_ROOT), windowsSources.map(() => ({ modifiedAt: iso, accessedAt: iso, createdAt: iso })));
    assert.equal(calls, 1);
  }
});

test('Windows metadata transport correlates literal DOS-short aliases and refuses substituted expanded paths', async () => {
  const shortRoot = 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\owned-alias-fixture';
  const sources = [{ path: shortRoot + '\\年😀.txt', directory: false }];
  let request;
  const reader = createSourceMetadataReader({ platform: 'win32', nativeRead: async input => {
    request = JSON.parse(input);
    assert.equal(request.root, shortRoot);
    assert.equal(request.sources[0].path, sources[0].path);
    return responseFor(request);
  } });
  assert.deepEqual(await reader(sources, shortRoot), [{ modifiedAt: fixedDate, accessedAt: fixedDate, createdAt: fixedDate }]);
  const substituted = createSourceMetadataReader({ platform: 'win32', nativeRead: async input => {
    const response = JSON.parse(responseFor(JSON.parse(input)));
    response.items[0].path = sources[0].path.replace('RUNNER~1', 'runneradmin');
    return JSON.stringify(response);
  } });
  await assert.rejects(substituted(sources, shortRoot), /archive creation was refused/);
});

test('exact native UTC and decimal milliseconds agree before whole-millisecond reduction, including negative fractional milliseconds', async () => {
  for (const [utc, decimal, expected] of [
    ['2107-01-01T00:00:00.1230016Z', String(Date.parse(fixedDate)) + '.0016', fixedDate],
    ['1969-12-31T23:59:59.1230016Z', '-876.9984', '1969-12-31T23:59:59.123Z']
  ]) {
    const reader = createSourceMetadataReader({ platform: 'win32', nativeRead: async input => {
      const response = JSON.parse(responseFor(JSON.parse(input)));
      for (const row of response.items) for (const prefix of ['modifiedAt', 'accessedAt', 'createdAt']) { row[prefix + 'Utc'] = utc; row[prefix + 'Ms'] = decimal; }
      return JSON.stringify(response);
    } });
    assert.equal((await reader(windowsSources, WINDOW_ROOT))[0].modifiedAt, expected);
  }
});

test('malformed native output, missing/reordered/type-mismatched paths and inconsistent/nonfinite dates refuse with redacted errors', async () => {
  const invalid = [
    () => '{',
    () => JSON.stringify({ version: 1, items: [] }),
    value => { value.items.reverse(); return JSON.stringify(value); },
    value => { value.items[0].path = WINDOW_ROOT + '\\different'; return JSON.stringify(value); },
    value => { value.items[0].directory = false; return JSON.stringify(value); },
    value => { value.items[0].modifiedAtUtc = 'Invalid Date'; return JSON.stringify(value); },
    value => { value.items[0].modifiedAtUtc = '2107-02-30T00:00:00.1230000Z'; return JSON.stringify(value); },
    value => { value.items[0].modifiedAtMs = 'Infinity'; return JSON.stringify(value); },
    value => { value.items[0].modifiedAtMs = '0.0000'; return JSON.stringify(value); }
  ];
  for (const damage of invalid) {
    const reader = createSourceMetadataReader({ platform: 'win32', nativeRead: async input => damage(JSON.parse(responseFor(JSON.parse(input)))) });
    await assert.rejects(reader(windowsSources, WINDOW_ROOT), error => error.message.includes('archive creation was refused') && !error.message.includes(WINDOW_ROOT));
  }
  const failed = createSourceMetadataReader({ platform: 'win32', nativeRead: async () => { throw new Error('private transport details'); } });
  await assert.rejects(failed(windowsSources, WINDOW_ROOT), error => !error.message.includes('private transport details'));
});

test('metadata reader rejects escaped/duplicate paths and preserves the original non-Windows stat-date contract', async () => {
  let calls = 0;
  const reader = createSourceMetadataReader({ platform: 'win32', nativeRead: async () => { calls += 1; return ''; } });
  for (const sources of [[{ path: 'C:\\outside\\file', directory: false }], [windowsSources[0], windowsSources[0]], [{ path: 'relative', directory: false }]]) {
    await assert.rejects(reader(sources, WINDOW_ROOT));
  }
  assert.equal(calls, 0);
  const stat = { mtime: new Date(fixedDate), atime: new Date('1969-12-31T23:59:59.123Z'), birthtime: new Date('2026-10-15T12:34:56.789Z') };
  const ordinary = createSourceMetadataReader({ platform: 'linux', nativeRead: async () => { throw new Error('must not run'); } });
  assert.deepEqual(await ordinary([{ stat }], '/owned'), [{ modifiedAt: stat.mtime.toISOString(), accessedAt: stat.atime.toISOString(), createdAt: stat.birthtime.toISOString() }]);
});

async function fixture(t) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rea-source-metadata-'));
  const workspace = await createWorkspace(path.join(temporary, 'workspace'));
  t.after(async () => {
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    assert(path.basename(temporary).startsWith('rea-source-metadata-'));
    await fs.rm(temporary, { recursive: true, force: true });
  });
  return { temporary, workspace, root: workspace.root };
}

test('one metadata collection covers every walked directory/file; failure precedes output directory/archive creation', async t => {
  const { root, workspace } = await fixture(t);
  await fs.mkdir(path.join(root, 'source', 'empty'), { recursive: true });
  await fs.writeFile(path.join(root, 'source', 'a.txt'), 'small source');
  let calls = 0;
  const handler = createArchiveHandler({ sourceMetadata: async sources => {
    calls += 1;
    assert.equal(sources.length, 2);
    assert.deepEqual(sources.map(source => source.directory).sort(), [false, true]);
    assert.equal(await fs.readFile(path.join(root, 'source', 'a.txt'), 'utf8'), 'small source');
    throw new Error('Owned metadata fixture refusal.');
  } });
  await assert.rejects(handler({ action: 'create', input: { source: 'source', output: 'never/created.7z', format: 'sevenzip', compression: 'store' }, workspace }), /fixture refusal/);
  assert.equal(calls, 1);
  await assert.rejects(fs.stat(path.join(root, 'never')), { code: 'ENOENT' });
});

test('single-file GZIP/Zstandard metadata failure also precedes output writes', async t => {
  const { root, workspace } = await fixture(t);
  await fs.writeFile(path.join(root, 'source.txt'), 'small source');
  let calls = 0;
  const handler = createArchiveHandler({ sourceMetadata: async sources => { calls += 1; assert.equal(sources.length, 1); assert.equal(sources[0].directory, false); throw new Error('Owned metadata fixture refusal.'); } });
  for (const [format, output] of [['gzip', 'never/created.gz'], ['zstd', 'never/created.zst']]) {
    await assert.rejects(handler({ action: 'create', input: { source: 'source.txt', output, format }, workspace }), /fixture refusal/);
  }
  assert.equal(calls, 2);
  await assert.rejects(fs.stat(path.join(root, 'never')), { code: 'ENOENT' });
});

// Independent native fixture setter/observer. No application helper or Node
// stat timestamps establish the expected Windows filesystem dates.
const NATIVE_FIXTURE_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$culture = [Globalization.CultureInfo]::InvariantCulture
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json -ErrorAction Stop
  $rows = New-Object 'System.Collections.Generic.List[object]'
  foreach ($row in @($request.rows)) {
    $item = Get-Item -LiteralPath ([string]$row.path) -Force -ErrorAction Stop
    if ($request.mode -eq 'set') {
      $item.LastWriteTimeUtc = [DateTime]::ParseExact([string]$row.modifiedAt, 'o', $culture, [Globalization.DateTimeStyles]::RoundtripKind)
      $item.LastAccessTimeUtc = [DateTime]::ParseExact([string]$row.accessedAt, 'o', $culture, [Globalization.DateTimeStyles]::RoundtripKind)
    } elseif ($request.mode -ne 'read') { throw 'mode' }
    $item.Refresh()
    $rows.Add(@{ path = $item.FullName; modifiedAt = $item.LastWriteTimeUtc.ToString('o', $culture); accessedAt = $item.LastAccessTimeUtc.ToString('o', $culture) })
  }
  [Console]::Out.Write((@{ rows = @($rows.ToArray()) } | ConvertTo-Json -Depth 4 -Compress))
} catch { [Console]::Error.WriteLine('Owned native fixture failed.'); exit 1 }
`;
async function nativeFixture(mode, rows, ownedRoot) {
  // Only fixture paths are canonicalized. The real handler below deliberately
  // retains os.tmpdir()'s original spelling to exercise hosted DOS short aliases.
  const realRoot = await fs.realpath(ownedRoot);
  const canonicalRows = await Promise.all(rows.map(async row => {
    const canonical = await fs.realpath(row.path), relative = path.relative(realRoot, canonical);
    assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    return { ...row, path: canonical };
  }));
  const executable = path.win32.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const input = JSON.stringify({ mode, rows: canonicalRows });
  const stdout = await new Promise((resolve, reject) => {
    const child = execFile(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(NATIVE_FIXTURE_SCRIPT, 'utf16le').toString('base64')],
      { encoding: 'utf8', windowsHide: true, shell: false, timeout: 15000, maxBuffer: 1024 * 1024 },
      (error, output) => error ? reject(new Error('Owned native fixture process failed.')) : resolve(output));
    child.stdin.on('error', () => {}); child.stdin.end(input, 'utf8');
  });
  const result = JSON.parse(stdout);
  assert.equal(result.rows.length, canonicalRows.length);
  for (let index = 0; index < canonicalRows.length; index++) assert.equal(path.win32.normalize(result.rows[index].path).toLowerCase(), path.win32.normalize(canonicalRows[index].path).toLowerCase());
  return result.rows;
}
function milliseconds(iso) { return new Date(Date.parse(iso)).toISOString(); }

// Test-only second attempt on an owned synthetic request if the production
// transport refuses. The production program and its generic errors stay intact.
async function diagnoseNativeFailure(t, label, input) {
  const marker = "  [Console]::Error.WriteLine('Native Windows source metadata failed.')";
  const diagnostic = `  [Console]::Out.Write((@{ diagnosticFailure = @{ exceptionType = $_.Exception.GetType().FullName; errorId = $_.FullyQualifiedErrorId; lineNumber = $_.InvocationInfo.ScriptLineNumber; category = [string]$_.CategoryInfo.Category } } | ConvertTo-Json -Compress -Depth 4))`;
  assert.equal(WINDOWS_METADATA_SCRIPT.split(marker).length, 2);
  const encoded = Buffer.from(WINDOWS_METADATA_SCRIPT.replace(marker, diagnostic + '\n' + marker), 'utf16le').toString('base64');
  const executable = path.win32.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const output = await new Promise(resolve => {
    const child = execFile(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { encoding: 'utf8', windowsHide: true, shell: false, timeout: 15000, maxBuffer: 16 * 1024 },
      (error, stdout) => resolve({ failed: Boolean(error), stdout }));
    child.stdin.on('error', () => {}); child.stdin.end(input, 'utf8');
  });
  let failure;
  try { failure = JSON.parse(output.stdout).diagnosticFailure; } catch {}
  t.diagnostic(JSON.stringify({ kind: 'windows-source-metadata-native-failure', label, failed: output.failed,
    diagnosticFailure: failure ?? null, diagnosticResponseBytes: Buffer.byteLength(output.stdout) }));
}

function diagnoseNativeResponse(t, label, response) {
  const bytes = Buffer.byteLength(response);
  if (bytes > 16 * 1024) { t.diagnostic(JSON.stringify({ kind: 'windows-source-metadata-response', label, bytes, omitted: true })); return; }
  try {
    const parsed = JSON.parse(response);
    const items = parsed.items?.map(({ index, path: literalPath, normalizedPath, directory, modifiedAtUtc, modifiedAtMs,
      accessedAtUtc, accessedAtMs, createdAtUtc, createdAtMs }) => ({ index, path: literalPath, normalizedPath, directory,
      modifiedAtUtc, modifiedAtMs, accessedAtUtc, accessedAtMs, createdAtUtc, createdAtMs }));
    t.diagnostic(JSON.stringify({ kind: 'windows-source-metadata-response', label, bytes, version: parsed.version, items }));
  } catch { t.diagnostic(JSON.stringify({ kind: 'windows-source-metadata-response', label, bytes, invalidJson: true })); }
}

test('Windows native source → plain ZIP/plain+encrypted 7Z → native restored dates cover 1969/2106 boundary/2107 and Unicode names', WINDOWS_ONLY, async t => {
  const { root, workspace } = await fixture(t), source = path.join(root, 'source-年😀');
  await fs.mkdir(source);
  const dates = ['1969-12-31T23:59:59.123Z', '2106-02-07T06:28:15.123Z', '2106-02-07T06:28:16.123Z', fixedDate, '2026-10-15T12:34:56.789Z'];
  const names = dates.map((_, index) => `date-${index}-年😀'$();.txt`);
  for (const name of names) await fs.writeFile(path.join(source, name), 'Owned native timestamp fixture.');
  const empty = path.join(source, 'empty-年😀'); await fs.mkdir(empty);
  const sourceRows = names.map((name, index) => ({ path: path.join(source, name), modifiedAt: wireDate(dates[index]).utc, accessedAt: wireDate(dates[(index + 1) % dates.length]).utc }));
  sourceRows.push({ path: empty, modifiedAt: wireDate(fixedDate).utc, accessedAt: wireDate(fixedDate).utc });
  const password = randomBytes(18).toString('base64url');
  for (const [label, format, encrypted] of [['zip', 'zip', false], ['plain', 'sevenzip', false], ['encrypted', 'sevenzip', true]]) {
    const before = await nativeFixture('set', sourceRows, root);
    for (let index = 0; index < before.length; index++) {
      assert.equal(milliseconds(before[index].modifiedAt), milliseconds(sourceRows[index].modifiedAt));
      assert.equal(milliseconds(before[index].accessedAt), milliseconds(sourceRows[index].accessedAt));
    }
    let batches = 0, captured;
    const reader = createSourceMetadataReader({ platform: 'win32', nativeRead: async input => {
      batches += 1; const request = JSON.parse(input);
      assert.equal(request.sources.length, names.length + 1);
      assert.equal(Object.hasOwn(request, 'password'), false);
      const canonicalRoot = await fs.realpath(request.root);
      t.diagnostic(JSON.stringify({ kind: 'windows-source-path-spelling', label, literalRoot: request.root, canonicalRoot,
        differentSpelling: path.win32.normalize(request.root).toLowerCase() !== path.win32.normalize(canonicalRoot).toLowerCase() }));
      let response;
      try { response = await runWindowsMetadataBatch(input); }
      catch (error) { await diagnoseNativeFailure(t, label, input); throw error; }
      diagnoseNativeResponse(t, label, response);
      return response;
    } });
    const handler = createArchiveHandler({ sourceMetadata: async (sources, sourceRoot) => {
      const result = await reader(sources, sourceRoot);
      captured = new Map(sources.map((entry, index) => [path.basename(entry.path), result[index]]));
      return result;
    } });
    const call = (action, input) => handler({ action, input, workspace });
    const archive = label + (format === 'zip' ? '.zip' : '.7z'), destination = 'restored-' + label;
    await call('create', { source: path.basename(source), output: archive, format, compression: 'store', ...(encrypted ? { password, encryptHeaders: true } : {}) });
    assert.equal(batches, 1);
    const list = await call('list', { path: archive, ...(encrypted ? { password } : {}) });
    for (let index = 0; index < names.length; index++) {
      const entry = list.entries.find(entry => entry.name === names[index]);
      assert.equal(entry.modifiedAt, dates[index]);
      if (format === 'zip') assert.equal(entry.accessedAt, captured.get(names[index]).accessedAt);
      else assert.equal(entry.accessedAt, undefined); // Existing 7Z contract stores mtime only.
    }
    const sourceAfter = await nativeFixture('read', sourceRows, root);
    for (const row of sourceAfter) {
      assert.equal(milliseconds(row.modifiedAt), captured.get(path.basename(row.path)).modifiedAt);
      assert.equal(milliseconds(row.accessedAt), captured.get(path.basename(row.path)).accessedAt);
    }
    await call('extract', { path: archive, destination, confirm: true, ...(encrypted ? { password } : {}) });
    const restored = await nativeFixture('read', sourceRows.map(row => ({ path: path.join(root, destination, path.basename(row.path)) })), root);
    for (const row of restored) {
      const metadata = captured.get(path.basename(row.path));
      assert.equal(milliseconds(row.modifiedAt), metadata.modifiedAt);
      assert.equal(milliseconds(row.accessedAt), format === 'zip' ? metadata.accessedAt : metadata.modifiedAt);
    }
  }
});

test('Windows invalid JSON, process failure and disappeared source refuse before any archive output', WINDOWS_ONLY, async t => {
  const { root, workspace } = await fixture(t); await fs.mkdir(path.join(root, 'source'));
  for (const [label, nativeRead] of [['invalid-json', async () => '{'], ['missing-rows', async () => JSON.stringify({ version: 1, items: [] })], ['process-failure', async () => { throw new Error('transport detail'); }]]) {
    await fs.writeFile(path.join(root, 'source', 'file.txt'), 'source');
    const sourceMetadata = createSourceMetadataReader({ platform: 'win32', nativeRead });
    const handler = createArchiveHandler({ sourceMetadata });
    await assert.rejects(handler({ action: 'create', input: { source: 'source', output: 'never/' + label + '.7z', format: 'sevenzip', compression: 'store' }, workspace }), /archive creation was refused/);
    await assert.rejects(fs.stat(path.join(root, 'never')), { code: 'ENOENT' });
  }
  const handler = createArchiveHandler({ sourceMetadata: async (sources, sourceRoot) => {
    await fs.unlink(sources[0].path);
    return readSourceMetadata(sources, sourceRoot);
  } });
  await assert.rejects(handler({ action: 'create', input: { source: 'source', output: 'never/missing.7z', format: 'sevenzip', compression: 'store' }, workspace }), /archive creation was refused/);
  await assert.rejects(fs.stat(path.join(root, 'never')), { code: 'ENOENT' });
});

test('Windows existing no-link walk rejects a junction before calling the metadata batch', WINDOWS_ONLY, async t => {
  const { temporary, root, workspace } = await fixture(t);
  await fs.mkdir(path.join(root, 'source')); await fs.mkdir(path.join(temporary, 'outside'));
  await fs.writeFile(path.join(temporary, 'outside', 'file.txt'), 'outside');
  await fs.symlink(path.join(temporary, 'outside'), path.join(root, 'source', 'link'), 'junction');
  let batches = 0;
  const handler = createArchiveHandler({ sourceMetadata: async () => { batches += 1; throw new Error('must not run'); } });
  await assert.rejects(handler({ action: 'create', input: { source: 'source', output: 'never/links.zip', format: 'zip' }, workspace }), /[Ss]ymbolic links/);
  assert.equal(batches, 0);
  await assert.rejects(fs.stat(path.join(root, 'never')), { code: 'ENOENT' });
});
