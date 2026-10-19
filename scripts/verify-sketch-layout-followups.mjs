// Installed Notes46 API; fixed Sketch dataset identity remains historical.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { finalizeNotes46ReaderCli, verifyNotes46SketchLayoutFollowups } from './notes46-current-proof-dispatch.mjs';
export const proofIdentity = Object.freeze({
  dataset:'5ab5d2fdbea33dc3712c66050a47097170caef5bed7e7bf8fd22bc1637efffc7',
  verifier:'8116090c18432303df8b6fcb6f0e7ca7d6f6b811ebab9d1ef37090bdfc3d96f5',
  loader:'35fdaf67acd3b223c6f46419189a249c9a9b36d82e10065df2292615b4b74045',
  reviewManifest:'dd196558e07a7568d0424dff0a610a1b18627d0bee0b56c0cbbaad90f6f080c7'
});
export async function verifySketchLayoutFollowups({ repoRoot = fileURLToPath(new URL('../', import.meta.url)) } = {}) { return verifyNotes46SketchLayoutFollowups({ repoRoot }); }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 2 && args[0] === '--repo')) throw new Error('Expected optional --repo ROOT');
  const root = args.length ? resolve(args[1]) : fileURLToPath(new URL('../', import.meta.url));
  console.log(JSON.stringify(finalizeNotes46ReaderCli(root, await verifySketchLayoutFollowups({ repoRoot: root }))));
}
