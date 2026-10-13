// Read-only verification of the historical DEFLATE/Copy .7z slice.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const app = import.meta.dirname, lab = path.resolve(app, '../../../..');
const receipt = JSON.parse(await readFile(path.join(app, 'sevenzip-validation.json')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let verified = 0;
for (const item of receipt.implementation_fingerprints) {
  if (!item.path.startsWith('products/rea-studio/apps/archive/') || item.path.includes('..')) throw new Error('Invalid archive source path');
  let bytes = await readFile(path.join(lab, item.path));
  if (bytes.length !== item.bytes || sha(bytes) !== item.sha256) {
    const historical = path.join(app, 'results/lzma-stage/prior-app', item.path.slice('products/rea-studio/apps/archive/'.length));
    bytes = await readFile(historical);
    if (bytes.length !== item.bytes || sha(bytes) !== item.sha256) throw new Error(`Historical 7Z slice source differs: ${item.path}`);
  }
  verified++;
}
for (const item of receipt.preserved_previous_receipts) {
  const bytes = await readFile(path.join(lab, item.path));
  if (bytes.length !== item.bytes || sha(bytes) !== item.sha256) throw new Error(`Historical receipt was changed: ${item.path}`);
  verified++;
}
if (receipt.full_feature_parity || receipt.all_ways_improved || receipt.test_run.passed !== 68 || receipt.test_run.failed || receipt.test_run.skipped || receipt.original_application_runtime_wrapper) throw new Error('Incorrect slice scope or result');
console.log(JSON.stringify({ status: 'pass', historical_slice: true, fingerprints: verified, archive_tests_recorded: receipt.test_run.passed,
  sevenzip_tests_recorded: receipt.test_run.sevenzip_passed, full_feature_parity: false, all_ways_improved: false }, null, 2));
