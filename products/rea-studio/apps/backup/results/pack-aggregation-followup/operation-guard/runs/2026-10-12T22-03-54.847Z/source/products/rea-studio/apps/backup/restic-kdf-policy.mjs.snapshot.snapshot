import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { passwordKey } from './restic-crypto.mjs';

// This floor matches the highest work factor observed in the three authenticated
// original-release initialization runs on this machine. It does not establish
// resistance to attacks, or equivalence to the original on every other machine.
export const writerPolicy = Object.freeze({ N:32768, r:8, minimumP:13, maximumP:32, targetMilliseconds:500 });
export function chooseParallelization(probeMilliseconds, probeP = writerPolicy.minimumP) {
  if (!Number.isFinite(probeMilliseconds) || probeMilliseconds <= 0 || !Number.isSafeInteger(probeP) || probeP < 1 || probeP > writerPolicy.maximumP) throw new Error('Invalid scrypt calibration measurement.');
  return Math.min(writerPolicy.maximumP, Math.max(writerPolicy.minimumP, Math.ceil(writerPolicy.targetMilliseconds * probeP / probeMilliseconds)));
}
let calibration;
export function calibrateWriter() {
  if (!calibration) calibration = measure().catch(error => { calibration = undefined; throw error; });
  return calibration;
}
async function measure() {
  const { N,r,minimumP,maximumP,targetMilliseconds } = writerPolicy;
  const document = { kdf:'scrypt',N,r,p:minimumP,salt:randomBytes(64).toString('base64') };
  const begun = performance.now();
  const temporary = await passwordKey(document,'REA synthetic calibration probe; never a repository password');
  const probeMilliseconds = performance.now() - begun;
  for (const bytes of Object.values(temporary)) bytes.fill(0);
  const p = chooseParallelization(probeMilliseconds);
  return Object.freeze({ N,r,p,minimumP,maximumP,targetMilliseconds,probeMilliseconds,estimatedMilliseconds:probeMilliseconds * p / minimumP,policy:'Measured Node/OpenSSL writer work with fixed observed-original floor; timing estimate is not a guaranteed deadline or security audit.' });
}
