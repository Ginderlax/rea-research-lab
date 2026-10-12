import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'PUBLICATION-MANIFEST.json'), 'utf8'));
const index = JSON.parse(readFileSync(join(root, 'PROJECT-INDEX.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let checkedBytes = 0, parsedJson = 0, checkedScripts = 0;
const forbidden = /(^|\/)(artifacts|node_modules|tooling|__pycache__)(\/|$)|\.(exe|dll|zip|tgz|bundle|tar|7z|pyc)$/i;
const credentialPattern = /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
for (const entry of manifest.files) {
  assert.ok(!entry.path.startsWith('/') && !entry.path.split('/').includes('..') && !entry.path.includes('\\'));
  assert.ok(!forbidden.test(entry.path), `Excluded vendor/runtime material found in publication: ${entry.path}`);
  const target = join(root, entry.path), bytes = readFileSync(target);
  assert.equal(bytes.length, entry.bytes, `Size mismatch: ${entry.path}`);
  assert.equal(sha(bytes), entry.sha256, `Digest mismatch: ${entry.path}`);
  checkedBytes += bytes.length;
  const source = bytes.toString('utf8');
  assert.ok(!credentialPattern.test(source), `Potential credential material requires review: ${entry.path}`);
  if (entry.path.endsWith('.json')) { JSON.parse(source); parsedJson++; }
  if (/\.(?:mjs|cjs|js)$/.test(entry.path)) {
    const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8', timeout: 30000 });
    assert.equal(syntax.status, 0, `${entry.path}: ${syntax.stderr}`); checkedScripts++;
  }
}
assert.equal(index.projects.length, 10);
for (const project of index.projects) {
  assert.equal(project.status, 'completed-bounded-study');
  assert.equal(project.final_mismatches, 0);
  for (const name of ['study.json', 'REPORT.md']) assert.ok(existsSync(join(root, 'projects', project.id, name)), `Missing ${project.id}/${name}`);
  const studyRoot = join(root, 'projects', project.id);
  const study = JSON.parse(readFileSync(join(studyRoot, 'study.json'), 'utf8'));
  assert.equal(study.status, project.status);
  for (const [file, digest] of Object.entries(study.file_sha256 ?? {})) assert.equal(sha(readFileSync(join(studyRoot, file))), digest, `Study-local digest differs: ${project.id}/${file}`);
  const record = JSON.parse(readFileSync(join(studyRoot, project.result_record), 'utf8'));
  const count = project.id === '04-excalidraw' ? record.counts.coordinateCalls + record.counts.versionCalls
    : project.id === '09-restic' ? record.content_id_comparisons
    : project.id === '10-rclone' ? record.differential_assertions
    : record.total ?? record.cases;
  assert.equal(count, project.differential_comparison_count, `Count differs: ${project.id}`);
  assert.equal(record.failed ?? record.mismatches ?? record.failures?.length ?? 0, 0, `Recorded failures: ${project.id}`);
  assert.ok(project.rea_evidence_ids.length > 0, `Missing REA reference: ${project.id}`);
}
for (const name of ['README.md', 'SERIES-STUDY.md', 'TOOLING.md', 'LICENSES.md']) {
  const markdown = readFileSync(join(root, name), 'utf8');
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    assert.ok(existsSync(join(root, target)), `${name} links to missing ${target}`);
  }
}
const receipt = {
  status: 'passed', checked_at_utc: new Date().toISOString(), projects: index.projects.length,
  payload_files: manifest.files.length, payload_bytes: checkedBytes, json_files_parsed: parsedJson,
  javascript_syntax_checks: checkedScripts, publication_sha256_checks: manifest.files.length,
  project_metadata_and_record_counts_consistent: true, excluded_artifacts_not_in_payload: true,
  credential_pattern_scan_passed: true, root_document_links_resolve: true,
  scope: 'Publication integrity, syntax and existing record consistency; this does not rerun all original behavioral experiments.'
};
if (process.argv.includes('--write')) writeFileSync(join(root, 'VALIDATION.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
