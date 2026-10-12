import {mkdir, mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';

// Every rerun writes into a new local directory; recorded study results stay intact.
export async function replayOutput(root, kind) {
  const parent = join(root, 'artifacts', 'replays');
  await mkdir(parent, {recursive:true});
  const directory = await mkdtemp(join(parent, kind + '-'));
  console.log('Replay outputs: ' + directory);
  return directory;
}
