import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { crc32, MAX_FILE } from './zip.mjs';
import { MAX_CONTAINER } from './tar.mjs';

function latin(value, label) { if (typeof value !== 'string' || /[^\x01-\xff]/.test(value) || value.length > 4096) throw new Error(`Use Latin-1 ${label} text without nulls, up to 4096 characters.`); return Buffer.from(value, 'latin1'); }
export function makeGzip(data, options = {}) {
  if (!Buffer.isBuffer(data) || data.length > (options.maxOutput ?? MAX_FILE) || data.length > MAX_CONTAINER) throw new Error('GZIP input exceeds the local size limit.');
  const level = options.level ?? 6; if (!Number.isInteger(level) || level < 0 || level > 9) throw new Error('Choose a compression level from zero to nine.');
  const name = options.name ? latin(options.name, 'filename') : Buffer.alloc(0), comment = options.comment ? latin(options.comment, 'comment') : Buffer.alloc(0); if (/[\\/]/.test(options.name ?? '')) throw new Error('GZIP filenames cannot contain directories.');
  const modified = options.modifiedAt ? Math.floor(new Date(options.modifiedAt).getTime() / 1000) : 0; if (!Number.isFinite(modified) || modified < 0 || modified > 0xffffffff) throw new Error('GZIP dates must be between 1970 and February 2106.');
  const fixed = Buffer.alloc(10); fixed[0] = 31; fixed[1] = 139; fixed[2] = 8; fixed[3] = (name.length ? 8 : 0) | (comment.length ? 16 : 0) | (options.headerCrc ? 2 : 0); fixed.writeUInt32LE(modified, 4); fixed[8] = level === 9 ? 2 : level === 1 ? 4 : 0; fixed[9] = 255;
  const fields = [fixed, ...(name.length ? [name, Buffer.alloc(1)] : []), ...(comment.length ? [comment, Buffer.alloc(1)] : [])];
  const header = Buffer.concat(fields); if (options.headerCrc) { const crc = Buffer.alloc(2); crc.writeUInt16LE(crc32(header) & 65535); fields.push(crc); }
  const trailer = Buffer.alloc(8); trailer.writeUInt32LE(crc32(data)); trailer.writeUInt32LE(data.length, 4); return Buffer.concat([...fields, deflateRawSync(data, { level }), trailer]);
}
export function readGzip(buffer, maxOutput = MAX_FILE) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 18 || buffer.length > MAX_CONTAINER || !Number.isInteger(maxOutput) || maxOutput < 0 || maxOutput > MAX_CONTAINER) throw new Error('Invalid GZIP size.');
  let at = 0, total = 0; const members = [], chunks = [];
  while (at < buffer.length) {
    const start = at; if (members.length >= 10000 || at + 10 > buffer.length || buffer[at] !== 31 || buffer[at + 1] !== 139 || buffer[at + 2] !== 8 || buffer[at + 3] & 224) throw new Error('Unsupported or truncated GZIP header.');
    const flags = buffer[at + 3], modified = buffer.readUInt32LE(at + 4); at += 10;
    if (flags & 4) { if (at + 2 > buffer.length) throw new Error('Truncated GZIP extra field.'); const size = buffer.readUInt16LE(at); at += 2; if (at + size > buffer.length) throw new Error('Truncated GZIP extra field.'); at += size; }
    function field() { const end = buffer.indexOf(0, at); if (end < 0 || end - at > 4096) throw new Error('Invalid GZIP filename or comment.'); const value = buffer.toString('latin1', at, end); at = end + 1; return value; }
    const name = flags & 8 ? field() : undefined, comment = flags & 16 ? field() : undefined;
    if (flags & 2) { if (at + 2 > buffer.length || buffer.readUInt16LE(at) !== (crc32(buffer.subarray(start, at)) & 65535)) throw new Error('GZIP header CRC mismatch.'); at += 2; }
    let inflated; try { inflated = inflateRawSync(buffer.subarray(at), { maxOutputLength: Math.max(1, maxOutput - total), info: true }); } catch { throw new Error('GZIP compressed data is corrupt or exceeds the extraction size limit.'); }
    at += inflated.engine.bytesWritten; const data = inflated.buffer; if (at + 8 > buffer.length || buffer.readUInt32LE(at) !== crc32(data) || buffer.readUInt32LE(at + 4) !== data.length) throw new Error('GZIP trailer size or CRC mismatch.'); at += 8; total += data.length; if (total > maxOutput) throw new Error('GZIP exceeds the extraction size limit.');
    chunks.push(data); members.push({ size: data.length, compressedSize: at - start, crc32: crc32(data).toString(16).padStart(8, '0'), ...(name !== undefined ? { name } : {}), ...(comment !== undefined ? { comment } : {}), ...(modified ? { modifiedAt: new Date(modified * 1000).toISOString() } : {}) });
  }
  return { data: Buffer.concat(chunks, total), members };
}
