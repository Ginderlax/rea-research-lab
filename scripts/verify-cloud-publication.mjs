// The documented current CLI now dispatches to the installed46 epoch. The
// original producer remains byte-exact in the independently acquired2a root.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNotes46Publication } from './verify-notes46-publication.mjs';

assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--evidence');
assert(path.isAbsolute(process.argv[3]));
await runNotes46Publication({ repoRoot: fileURLToPath(new URL('../', import.meta.url)), evidence: process.argv[3] });
