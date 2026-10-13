// Root must supply the independently frozen dataset digest; metadata is not its own authority.
import assert from 'node:assert/strict';
import {hash,validateDataset,verifyDataset,filesystemReader} from './proof-verifier.mjs';
export function parsePinnedDataset(bytes,expectedSHA256) {
  assert.ok(Buffer.isBuffer(bytes));assert.match(expectedSHA256,/^[0-9a-f]{64}$/);
  assert.equal(hash(bytes),expectedSHA256,'Frozen public proof dataset identity');
  return validateDataset(JSON.parse(bytes));
}
export async function verifyInstalledLayoutProof(repo,datasetBytes,expectedSHA256) {
  return verifyDataset(parsePinnedDataset(datasetBytes,expectedSHA256),filesystemReader(repo));
}
