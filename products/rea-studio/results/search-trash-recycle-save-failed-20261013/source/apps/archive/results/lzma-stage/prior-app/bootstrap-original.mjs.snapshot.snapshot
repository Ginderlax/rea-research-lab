// Verification-only acquisition. Application code never imports or runs vendor binaries.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const directory = path.dirname(fileURLToPath(import.meta.url)), lab = path.resolve(directory, '../../../..');
const cache = path.join(lab, '.local/archive-original');
export const installerPath = path.join(cache, '7z2604-x64.exe'), bootstrapPath = path.join(cache, '7zr.exe');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = [
  { name: '7z2604-x64.exe', bytes: 1664082, sha256: 'd54bf805f9f3704d1e8db2fa3498ae7ef2df0312b40b558e7c71c734430a665d', url: 'https://github.com/ip7z/7zip/releases/download/26.04/7z2604-x64.exe', backup: path.join(directory, 'fixtures/oracles/7z2604-x64.exe') },
  { name: '7zr.exe', bytes: 602624, sha256: '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282', url: 'https://github.com/ip7z/7zip/releases/download/26.04/7zr.exe', backup: path.join(lab, 'projects/08-7zip/artifacts/7zr.exe') }
];
function authenticate(bytes, asset) { if (bytes.length !== asset.bytes || sha(bytes) !== asset.sha256) throw new Error('Original archive oracle bytes differ from the pinned official release: ' + asset.name); }
export async function prepareOriginalArchiveOracle() {
  await fs.mkdir(cache, { recursive: true }); const acquired = [];
  for (const asset of assets) {
    const target = path.join(cache, asset.name); let bytes, source;
    try { bytes = await fs.readFile(target); source = 'existing authenticated cache'; }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try { bytes = await fs.readFile(asset.backup); source = 'preserved local backup'; }
      catch (backupError) {
        if (backupError.code !== 'ENOENT') throw backupError;
        const response = await fetch(asset.url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error('Original archive oracle download failed: ' + response.status + ' ' + asset.name);
        bytes = Buffer.from(await response.arrayBuffer()); source = 'official publisher URL';
      }
      authenticate(bytes, asset); await fs.writeFile(target, bytes, { flag: 'wx' });
    }
    authenticate(bytes, asset); acquired.push({ path: '.local/archive-original/' + asset.name, bytes: asset.bytes, sha256: asset.sha256, source_url: asset.url, acquisition_source: source });
  }
  const record = { schema: 'rea-archive-original-acquisition/v1', checked_at_utc: new Date().toISOString(), original_release: '7-Zip 26.04', scope: 'Independent test programs only; not published and never used by the application runtime.', assets: acquired };
  try { await fs.writeFile(path.join(cache, 'acquisition.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return record;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await prepareOriginalArchiveOracle(), null, 2));
