// Installed Notes46 entry point. Historical proof results are explicitly scoped.
import { fileURLToPath } from 'node:url';
import { finalizeNotes46ReaderCli } from './notes46-current-proof-dispatch.mjs';
import { resolve } from 'node:path';
import { verifyNotes46InlineFollowups as verifyNotesInlineFollowups, createNotes46InlineHistoricalResolver as createNotesInlineHistoricalResolver } from './notes46-current-proof-dispatch.mjs';
export { verifyNotesInlineFollowups, createNotesInlineHistoricalResolver };
export { assertNotesInlinePublicPath, assertNotesInlineInertBytes, applyNotesInlineQualificationOverrides } from '../products/rea-studio/experiments/notes46-installed-search-20261019/historical-api/scripts/verify-notes-inline-followups.mjs';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  if (!process.argv.slice(2).every(value => ["--standalone"].includes(value))) throw new Error('Unsupported current proof-reader CLI arguments');
  console.log(JSON.stringify(finalizeNotes46ReaderCli(root, verifyNotesInlineFollowups(root))));
}
