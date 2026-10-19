import test from 'node:test';
import assert from 'node:assert/strict';
import { compareOriginal } from './compare-original.mjs';
test('native execution matches independent released Node-RED runtime and scalar SwitchNode corpus', { timeout: 30000 }, async () => {
  const result = await compareOriginal();
  assert.equal(result.runtimeCases.failed, 0, JSON.stringify(result.runtimeCases.results.filter(r => !r.passed), null, 2));
  assert.equal(result.scalarSwitchCases.failed, 0, JSON.stringify(result.scalarSwitchCases.failures, null, 2));
  assert.equal(result.original.originalRuntimeExecuted, true);
});
