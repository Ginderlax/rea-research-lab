// Installed Notes46 entry point. Historical proof results are explicitly scoped.
import { fileURLToPath } from 'node:url';
import { finalizeNotes46ReaderCli } from './notes46-current-proof-dispatch.mjs';
import { resolve } from 'node:path';
import { verifyNotes46EditorSaveFollowup } from './notes46-current-proof-dispatch.mjs';
export { verifyNotes46EditorSaveFollowup };
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  if (!process.argv.slice(2).every(value => ["--require-current"].includes(value))) throw new Error('Unsupported current proof-reader CLI arguments');
  console.log(JSON.stringify(finalizeNotes46ReaderCli(root, verifyNotes46EditorSaveFollowup(root, { requireCurrent: process.argv.includes('--require-current') }))));
}
