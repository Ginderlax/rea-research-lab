import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// The declared study domain is one content chunk: regular files < 512 KiB.
export function smallFileContentIds(bytes) {
  if (!Buffer.isBuffer(bytes)) throw new TypeError('Expected file bytes.');
  if (bytes.length >= 512 * 1024) throw new RangeError('This study does not reconstruct content-defined chunking.');
  return bytes.length === 0 ? [] : [createHash('sha256').update(bytes).digest('hex')];
}

export function verifyStorageId(filename, bytes) {
  return /^[a-f0-9]{64}$/.test(filename) && createHash('sha256').update(bytes).digest('hex') === filename;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = ['same document', 'same document', 'changed document', ''].map(text => ({ text, content_ids: smallFileContentIds(Buffer.from(text)) }));
  console.log(JSON.stringify({ items, meaning: 'Equal small-file bytes select the same content identifier; empty files retain no data blobs.' }, null, 2));
}
