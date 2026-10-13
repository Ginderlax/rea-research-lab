import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib';

// These codec bounds match the archive container/file budgets. No dictionaries
// are supplied, and a frame cannot request an unbounded native history window.
export const MAX_ZSTD_INPUT = 96 * 1024 * 1024, MAX_ZSTD_WINDOW = 64 * 1024 * 1024;
export const MAX_ZSTD_FRAMES = 10000, MAX_ZSTD_BLOCKS = 100000;
const FILE_LIMIT = 16 * 1024 * 1024, MAGIC = 0xfd2fb528;
function budget(value) { if (!Number.isInteger(value) || value < 0 || value > MAX_ZSTD_INPUT) throw new Error('Invalid Zstandard output size limit.'); return value; }
export function isZstd(buffer) { if (buffer.length < 4) return false; const magic = buffer.readUInt32LE(0); return magic === MAGIC || magic >= 0x184d2a50 && magic <= 0x184d2a5f; }
export function makeZstd(data, options = {}) {
  const limit = budget(options.maxOutput ?? FILE_LIMIT), level = options.level ?? 3;
  if (!Buffer.isBuffer(data) || data.length > limit) throw new Error('Zstandard input exceeds the local size limit.');
  if (!Number.isInteger(level) || level < 1 || level > 19) throw new Error('Choose a Zstandard compression level from one to nineteen.');
  const bytes = zstdCompressSync(data, { params: { [constants.ZSTD_c_compressionLevel]: level, [constants.ZSTD_c_checksumFlag]: 1, [constants.ZSTD_c_windowLog]: 23, [constants.ZSTD_c_nbWorkers]: 0 } });
  if (bytes.length > MAX_ZSTD_INPUT) throw new Error('Zstandard container exceeds the local size limit.');
  return bytes;
}
export function readZstd(buffer, maxOutput = FILE_LIMIT) {
  budget(maxOutput);
  if (!Buffer.isBuffer(buffer) || buffer.length < 8 || buffer.length > MAX_ZSTD_INPUT) throw new Error('Invalid Zstandard container size.');
  let at = 0, total = 0, blocks = 0; const frames = [], chunks = [];
  function requireBytes(size) { if (at + size > buffer.length) throw new Error('Truncated Zstandard frame.'); }
  function integer(width) { requireBytes(width); let value = 0n; for (let i = 0; i < width; i++) value |= BigInt(buffer[at + i]) << BigInt(i * 8); at += width; return value; }
  while (at < buffer.length) {
    if (frames.length >= MAX_ZSTD_FRAMES) throw new Error('Zstandard has too many frames.');
    const start = at; requireBytes(4); const magic = buffer.readUInt32LE(at); at += 4;
    if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
      requireBytes(4); const size = buffer.readUInt32LE(at); at += 4; requireBytes(size); at += size;
      frames.push({ skippable: true, size: 0, compressedSize: at - start, metadataBytes: size }); continue;
    }
    if (magic !== MAGIC) throw new Error('Unsupported Zstandard header or trailing bytes.');
    requireBytes(1); const descriptor = buffer[at++], single = Boolean(descriptor & 32), checksum = Boolean(descriptor & 4);
    if (descriptor & 8) throw new Error('Reserved Zstandard frame flag.');
    // Bit 4 is explicitly unused by the current format and must be ignored.
    let window = 0;
    if (!single) { requireBytes(1); const wd = buffer[at++], base = 2 ** (10 + (wd >>> 3)); window = base + base / 8 * (wd & 7); }
    const dictWidth = [0, 1, 2, 4][descriptor & 3];
    if (integer(dictWidth) !== 0n) throw new Error('Zstandard dictionaries are not supported.');
    const sizeWidth = [single ? 1 : 0, 2, 4, 8][descriptor >>> 6];
    const contentSize = sizeWidth ? integer(sizeWidth) + (sizeWidth === 2 ? 256n : 0n) : null;
    if (contentSize !== null && contentSize > BigInt(maxOutput - total)) throw new Error('Zstandard exceeds the extraction size limit.');
    if (single) window = Number(contentSize);
    if (window > MAX_ZSTD_WINDOW) throw new Error('Zstandard history window exceeds the local size limit.');
    const blockLimit = Math.min(window, 128 * 1024); let last = false;
    do {
      if (++blocks > MAX_ZSTD_BLOCKS) throw new Error('Zstandard has too many blocks.');
      requireBytes(3); const header = buffer[at] | buffer[at + 1] << 8 | buffer[at + 2] << 16; at += 3;
      const type = header >>> 1 & 3, size = header >>> 3; last = Boolean(header & 1);
      if (type === 3 || size > blockLimit) throw new Error('Invalid Zstandard block type or size.');
      const stored = type === 1 ? 1 : size; requireBytes(stored); at += stored;
    } while (!last);
    let contentChecksum;
    if (checksum) { requireBytes(4); contentChecksum = buffer.readUInt32LE(at).toString(16).padStart(8, '0'); at += 4; }
    const frame = buffer.subarray(start, at); let data;
    try {
      const decoded = zstdDecompressSync(frame, { info: true, maxOutputLength: Math.max(1, maxOutput - total), params: { [constants.ZSTD_d_windowLogMax]: 26 } });
      if (decoded.engine.bytesWritten !== frame.length) throw new Error('Unused frame bytes.');
      data = decoded.buffer;
    } catch { throw new Error('Zstandard compressed data or checksum is corrupt, unsupported, or exceeds the extraction size limit.'); }
    if (contentSize !== null && BigInt(data.length) !== contentSize || total + data.length > maxOutput) throw new Error('Zstandard frame failed size verification.');
    total += data.length; chunks.push(data);
    frames.push({ skippable: false, size: data.length, compressedSize: frame.length, windowSize: window, checksum, ...(contentChecksum ? { contentChecksum } : {}) });
  }
  return { data: Buffer.concat(chunks, total), frames };
}
