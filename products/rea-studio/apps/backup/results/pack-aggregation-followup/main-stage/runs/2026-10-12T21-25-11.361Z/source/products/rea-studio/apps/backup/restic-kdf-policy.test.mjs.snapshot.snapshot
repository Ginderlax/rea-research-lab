import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrateWriter,chooseParallelization,writerPolicy } from './restic-kdf-policy.mjs';
import { passwordKey } from './restic-crypto.mjs';
test('every permitted calibration preserves the observed original work floor and reader budget',() => {
  for (const milliseconds of [Number.MIN_VALUE,0.0001,1,50,200,499,500,501,1000,Number.MAX_VALUE]) {
    const p = chooseParallelization(milliseconds);
    assert.ok(p >= 13 && p <= 32); assert.ok(writerPolicy.N * writerPolicy.r * p <= 8388608);
  }
  assert.equal(chooseParallelization(500),13); assert.equal(chooseParallelization(100),32);
  for (const value of [0,-1,NaN,Infinity,-Infinity,null,'500',undefined]) assert.throws(() => chooseParallelization(value));
});
test('calibration is shared, immutable and usable by the native password derivation',async t => {
  const first = calibrateWriter(), second = calibrateWriter(); assert.equal(first,second);
  const result = await first; assert.ok(Object.isFrozen(result)); assert.ok(result.probeMilliseconds > 0);
  assert.ok(result.p >= 13 && result.p <= 32);
  const key = await passwordKey({...result,kdf:'scrypt',salt:Buffer.alloc(64,7).toString('base64')},'synthetic-policy-test-password');
  assert.equal(key.encrypt.length,32); assert.equal(key.k.length,16); assert.equal(key.r.length,16);
  t.diagnostic(JSON.stringify(result));
});
