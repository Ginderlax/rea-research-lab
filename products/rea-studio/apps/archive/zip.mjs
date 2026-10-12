import { deflateRawSync, inflateRawSync } from 'node:zlib';

export const MAX_TOTAL = 64 * 1024 * 1024, MAX_FILE = 16 * 1024 * 1024, MAX_ENTRIES = 10000;
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1; return c >>> 0; });
export function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = table[(c ^ b) & 255] ^ c >>> 8; return (c ^ 0xffffffff) >>> 0; }
export function clean(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 || value.startsWith('/') || value.includes('\\') || value.includes('\0')) throw new Error('Use a relative path with forward slashes.');
  const name = value.replace(/\/$/, '');
  for (const part of name.split('/')) if (!part || part === '.' || part === '..' || /[:<>"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)) throw new Error('Archive contains an unsafe or unsupported path.');
  return name;
}
function extra(id, bytes) { const header = Buffer.alloc(4); header.writeUInt16LE(id); header.writeUInt16LE(bytes.length, 2); return Buffer.concat([header, bytes]); }
function extras(bytes) {
  const values = new Map(); let at = 0;
  while (at < bytes.length) { if (at + 4 > bytes.length) throw new Error('Truncated ZIP extra field.'); const id = bytes.readUInt16LE(at), size = bytes.readUInt16LE(at + 2); at += 4; if (at + size > bytes.length || values.has(id)) throw new Error('Truncated or duplicate ZIP extra field.'); values.set(id, bytes.subarray(at, at + size)); at += size; }
  return values;
}
function number64(bytes, offset) { if (offset + 8 > bytes.length) throw new Error('Truncated ZIP64 value.'); const value = bytes.readBigUInt64LE(offset); if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('ZIP64 value exceeds the supported integer range.'); return Number(value); }
function zip64Extra(values) { const bytes = Buffer.alloc(values.length * 8); values.forEach((value, index) => bytes.writeBigUInt64LE(BigInt(value), index * 8)); return extra(1, bytes); }
function expand64(values, fields) {
  let at = 0; const data = values.get(1);
  return fields.map(([value, sentinel, width = 8]) => { if (value !== sentinel) return value; if (!data || at + width > data.length) throw new Error('Missing or truncated ZIP64 extra field.'); const result = width === 8 ? number64(data, at) : data.readUInt32LE(at); at += width; return result; });
}
const FILETIME_EPOCH = 11644473600000n;
function timestampFields(item) {
  if (item.modifiedAt === undefined) return { dosTime: 0, dosDate: 33, data: Buffer.alloc(0) };
  const date = new Date(item.modifiedAt);
  if (!Number.isFinite(date.getTime())) throw new Error('Use a valid archive modification date.');
  // DOS dates carry local wall time; NTFS timestamps retain the exact UTC instant.
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  const dosTime = date.getHours() << 11 | date.getMinutes() << 5 | date.getSeconds() >>> 1;
  const dosDate = (year - 1980) << 9 | (date.getMonth() + 1) << 5 | date.getDate();
  const ntfs = Buffer.alloc(32); ntfs.writeUInt16LE(1, 4); ntfs.writeUInt16LE(24, 6);
  for (const [index, name] of ['modifiedAt', 'accessedAt', 'createdAt'].entries()) { const at = new Date(item[name] ?? item.modifiedAt).getTime(); if (!Number.isFinite(at)) throw new Error('Use valid archive timestamps.'); const ticks = (BigInt(Math.trunc(at)) + FILETIME_EPOCH) * 10000n; if (ticks < 0n || ticks > 0xffffffffffffffffn) throw new Error('Archive date exceeds the NTFS timestamp range.'); ntfs.writeBigUInt64LE(ticks, 8 + index * 8); }
  return { dosTime, dosDate, data: extra(0x000a, ntfs) };
}
function dates(fields, time, date) {
  const result = {};
  const ntfs = fields.get(0x000a);
  if (ntfs) { if (ntfs.length < 4) throw new Error('Invalid NTFS ZIP timestamps.'); let at = 4;
    while (at < ntfs.length) { if (at + 4 > ntfs.length) throw new Error('Invalid NTFS ZIP timestamp attribute.'); const tag = ntfs.readUInt16LE(at), size = ntfs.readUInt16LE(at + 2); at += 4; if (at + size > ntfs.length) throw new Error('Truncated NTFS ZIP timestamps.');
      if (tag === 1) { if (size !== 24) throw new Error('Invalid NTFS ZIP timestamps.'); for (const [index, name] of ['modifiedAt','accessedAt','createdAt'].entries()) { const ticks = ntfs.readBigUInt64LE(at + index * 8); if (ticks) { const ms = Number(ticks / 10000n - FILETIME_EPOCH), d = new Date(ms); if (!Number.isFinite(d.getTime())) throw new Error('Unsupported ZIP timestamp range.'); result[name] = d.toISOString(); } } } at += size;
    }
  }
  const unix = fields.get(0x5455); if (!result.modifiedAt && unix?.length >= 5 && (unix[0] & 1)) result.modifiedAt = new Date(unix.readUInt32LE(1) * 1000).toISOString();
  if (!result.modifiedAt && date) { const d = new Date(1980 + (date >>> 9), (date >>> 5 & 15) - 1, date & 31, time >>> 11, time >>> 5 & 63, (time & 31) * 2); if (Number.isFinite(d.getTime())) result.modifiedAt = d.toISOString(); }
  return result;
}
function collisions(entries) {
  const files = new Set(entries.filter(e => !e.directory).map(e => clean(e.name).toLowerCase()));
  for (const e of entries) { const parts = clean(e.name).toLowerCase().split('/'); while (parts.length > 1) { parts.pop(); if (files.has(parts.join('/'))) throw new Error('ZIP path is both a file and a directory.'); } }
}
const CP437_HIGH = Array.from('ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ');
function entryName(encoded, flags, fields) {
  const utf8 = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (flags & 0x800) return utf8(encoded);
  const unicode = fields.get(0x7075);
  if (unicode && unicode.length >= 5 && unicode[0] === 1 && unicode.readUInt32LE(1) === crc32(encoded)) return utf8(unicode.subarray(5));
  return [...encoded].map(value => value < 128 ? String.fromCharCode(value) : CP437_HIGH[value - 128]).join('');
}
export function makeZip(entries, compression = 'deflate', options = {}) {
  if (!['store','deflate'].includes(compression)) throw new Error('Choose store or deflate compression.');
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) throw new Error('Archive has too many entries.');
  if (options.level !== undefined && (!Number.isInteger(options.level) || options.level < 0 || options.level > 9)) throw new Error('Choose a compression level from zero to nine.');
  const comment = Buffer.from(options.comment ?? '', 'utf8'); if (comment.length > 65535) throw new Error('ZIP comment exceeds 65535 bytes.');
  collisions(entries); const zip64 = options.zip64 === true, descriptor = options.dataDescriptor === true;
  const locals = [], centrals = []; let offset = 0, total = 0; const seen = new Set();
  for (const item of entries) {
    const normalized = clean(item.name), identity = normalized.toLowerCase(); if (seen.has(identity)) throw new Error('Duplicate archive path.'); seen.add(identity);
    const directory = !!item.directory, name = Buffer.from(normalized + (directory ? '/' : ''), 'utf8'), data = directory ? Buffer.alloc(0) : Buffer.from(item.data);
    total += data.length; if (data.length > MAX_FILE || total > MAX_TOTAL || name.length > 65535) throw new Error('Archive input exceeds the local size limit.');
    const method = directory || compression === 'store' ? 0 : 8, compressed = method === 8 ? deflateRawSync(data, { level: options.level ?? 6 }) : data, checksum = crc32(data);
    const stamp = timestampFields(item), localExtra = Buffer.concat([zip64 ? zip64Extra([descriptor ? 0 : data.length, descriptor ? 0 : compressed.length]) : Buffer.alloc(0), stamp.data]);
    const centralExtra = Buffer.concat([zip64 ? zip64Extra([data.length, compressed.length, offset]) : Buffer.alloc(0), stamp.data]), version = zip64 ? 45 : 20, flags = 0x800 | (descriptor ? 8 : 0);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(version, 4); local.writeUInt16LE(flags, 6); local.writeUInt16LE(method, 8); local.writeUInt16LE(stamp.dosTime, 10); local.writeUInt16LE(stamp.dosDate, 12);
    local.writeUInt32LE(descriptor ? 0 : checksum, 14); local.writeUInt32LE(zip64 ? 0xffffffff : descriptor ? 0 : compressed.length, 18); local.writeUInt32LE(zip64 ? 0xffffffff : descriptor ? 0 : data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(localExtra.length, 28);
    const trailer = descriptor ? Buffer.alloc(zip64 ? 24 : 16) : Buffer.alloc(0); if (descriptor) { trailer.writeUInt32LE(0x08074b50); trailer.writeUInt32LE(checksum, 4); if (zip64) { trailer.writeBigUInt64LE(BigInt(compressed.length), 8); trailer.writeBigUInt64LE(BigInt(data.length), 16); } else { trailer.writeUInt32LE(compressed.length, 8); trailer.writeUInt32LE(data.length, 12); } }
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(version, 4); central.writeUInt16LE(version, 6); central.writeUInt16LE(flags, 8); central.writeUInt16LE(method, 10); central.writeUInt16LE(stamp.dosTime, 12); central.writeUInt16LE(stamp.dosDate, 14); central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(zip64 ? 0xffffffff : compressed.length, 20); central.writeUInt32LE(zip64 ? 0xffffffff : data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt16LE(centralExtra.length, 30); central.writeUInt32LE(directory ? 0x10 : 0, 38); central.writeUInt32LE(zip64 ? 0xffffffff : offset, 42);
    locals.push(local, name, localExtra, compressed, trailer); centrals.push(central, name, centralExtra); offset += local.length + name.length + localExtra.length + compressed.length + trailer.length;
  }
  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0), ends = [];
  if (zip64) { const z = Buffer.alloc(56); z.writeUInt32LE(0x06064b50); z.writeBigUInt64LE(44n, 4); z.writeUInt16LE(45, 12); z.writeUInt16LE(45, 14); z.writeBigUInt64LE(BigInt(entries.length), 24); z.writeBigUInt64LE(BigInt(entries.length), 32); z.writeBigUInt64LE(BigInt(centralSize), 40); z.writeBigUInt64LE(BigInt(offset), 48); const locator = Buffer.alloc(20); locator.writeUInt32LE(0x07064b50); locator.writeBigUInt64LE(BigInt(offset + centralSize), 8); locator.writeUInt32LE(1, 16); ends.push(z, locator); }
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(zip64 ? 0xffff : entries.length, 8); end.writeUInt16LE(zip64 ? 0xffff : entries.length, 10); end.writeUInt32LE(zip64 ? 0xffffffff : centralSize, 12); end.writeUInt32LE(zip64 ? 0xffffffff : offset, 16); end.writeUInt16LE(comment.length, 20);
  return Buffer.concat([...locals, ...centrals, ...ends, end, comment]);
}
export function readZip(buffer, includeData = false) {
  if (!Buffer.isBuffer(buffer) || buffer.length > MAX_TOTAL + 4 * 1024 * 1024 || buffer.length < 22) throw new Error('Invalid ZIP size.');
  let end = -1; for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { end = i; break; }
  if (end < 0) throw new Error('ZIP end record not found.');
  let disk = buffer.readUInt16LE(end + 4), centralDisk = buffer.readUInt16LE(end + 6), diskCount = buffer.readUInt16LE(end + 8), count = buffer.readUInt16LE(end + 10), centralSize = buffer.readUInt32LE(end + 12), start = buffer.readUInt32LE(end + 16), directoryEnd = end;
  const hasLocator = end >= 20 && buffer.readUInt32LE(end - 20) === 0x07064b50;
  if (hasLocator) { const locator = end - 20; if (buffer.readUInt32LE(locator + 4) || buffer.readUInt32LE(locator + 16) !== 1) throw new Error('Multi-disk ZIP64 is not supported.'); const z = number64(buffer, locator + 8);
    if (z + 56 > locator || buffer.readUInt32LE(z) !== 0x06064b50 || number64(buffer, z + 4) < 44 || z + 12 + number64(buffer, z + 4) !== locator) throw new Error('Invalid ZIP64 end record.');
    if (buffer.readUInt16LE(z + 14) > 45 || buffer.readUInt32LE(z + 16) || buffer.readUInt32LE(z + 20) || number64(buffer, z + 24) !== number64(buffer, z + 32)) throw new Error('Unsupported ZIP64 version or disk layout.');
    const values = [buffer.readUInt32LE(z + 16), buffer.readUInt32LE(z + 20), number64(buffer, z + 24), number64(buffer, z + 32), number64(buffer, z + 40), number64(buffer, z + 48)];
    for (const [actual, old, sentinel] of [[values[0], disk, 0xffff], [values[1], centralDisk, 0xffff], [values[2], diskCount, 0xffff], [values[3], count, 0xffff], [values[4], centralSize, 0xffffffff], [values[5], start, 0xffffffff]]) if (old !== sentinel && old !== actual) throw new Error('Classic and ZIP64 end records disagree.');
    [disk, centralDisk, diskCount, count, centralSize, start] = values; directoryEnd = z;
  } else if (disk === 0xffff || centralDisk === 0xffff || diskCount === 0xffff || count === 0xffff || centralSize === 0xffffffff || start === 0xffffffff) throw new Error('Missing ZIP64 end locator.');
  if (disk || centralDisk || diskCount !== count) throw new Error('Multi-disk ZIP is not supported.');
  if (count > MAX_ENTRIES || start + centralSize !== directoryEnd) throw new Error('Invalid central directory.');
  const output = [], seen = new Set(), intervals = []; let cursor = start, total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > directoryEnd || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP central directory.');
    const flags = buffer.readUInt16LE(cursor + 8), method = buffer.readUInt16LE(cursor + 10), checksum = buffer.readUInt32LE(cursor + 16), nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32), mode = buffer.readUInt32LE(cursor + 38) >>> 16;
    if (flags & ~0x80e || ![0,8].includes(method) || (method === 0 && (flags & 6)) || (mode & 0xf000) === 0xa000) throw new Error('Encrypted, linked or unsupported ZIP entry.');
    const entryEnd = cursor + 46 + nameLength + extraLength + commentLength; if (entryEnd > directoryEnd) throw new Error('Truncated ZIP directory.');
    const encoded = buffer.subarray(cursor + 46, cursor + 46 + nameLength), fields = extras(buffer.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength));
    const central64Sizes = buffer.readUInt32LE(cursor + 24) === 0xffffffff || buffer.readUInt32LE(cursor + 20) === 0xffffffff;
    const [size, compressedSize, localOffset, entryDisk] = expand64(fields, [[buffer.readUInt32LE(cursor + 24), 0xffffffff], [buffer.readUInt32LE(cursor + 20), 0xffffffff], [buffer.readUInt32LE(cursor + 42), 0xffffffff], [buffer.readUInt16LE(cursor + 34), 0xffff, 4]]); if (entryDisk) throw new Error('Multi-disk ZIP entry is not supported.');
    const name = entryName(encoded, flags, fields), normalized = clean(name), identity = normalized.toLowerCase(), directory = name.endsWith('/'); if (seen.has(identity)) throw new Error('Duplicate archive path.'); seen.add(identity);
    total += size; if (size > MAX_FILE || total > MAX_TOTAL || compressedSize > MAX_TOTAL) throw new Error('ZIP exceeds the extraction size limit.');
    if (localOffset + 30 > start || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Invalid local ZIP header.');
    const localNameLength = buffer.readUInt16LE(localOffset + 26), localExtraLength = buffer.readUInt16LE(localOffset + 28), dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > start || buffer.readUInt16LE(localOffset + 6) !== flags || buffer.readUInt16LE(localOffset + 8) !== method || !buffer.subarray(localOffset + 30, localOffset + 30 + localNameLength).equals(encoded)) throw new Error('ZIP headers disagree.');
    const localFields = extras(buffer.subarray(localOffset + 30 + localNameLength, dataStart)), local64 = buffer.readUInt32LE(localOffset + 18) === 0xffffffff || buffer.readUInt32LE(localOffset + 22) === 0xffffffff;
    const [localSize, localCompressed] = expand64(localFields, [[buffer.readUInt32LE(localOffset + 22), 0xffffffff], [buffer.readUInt32LE(localOffset + 18), 0xffffffff]]);
    let dataEnd = dataStart + compressedSize;
    if (flags & 8) {
      // Streaming local headers may contain zeros while the directory stores ZIP64 sizes.
      const descriptor64 = local64 || central64Sizes;
      // A CRC may itself equal the optional signature; test both encodings.
      const starts = dataEnd + 4 <= start && buffer.readUInt32LE(dataEnd) === 0x08074b50 ? [dataEnd + 4, dataEnd] : [dataEnd]; let descriptorEnd = null;
      for (const at of starts) { const width = descriptor64 ? 20 : 12; if (at + width > start) continue; try { const compressed = descriptor64 ? number64(buffer, at + 4) : buffer.readUInt32LE(at + 4), original = descriptor64 ? number64(buffer, at + 12) : buffer.readUInt32LE(at + 8); if (buffer.readUInt32LE(at) === checksum && compressed === compressedSize && original === size) { descriptorEnd = at + width; break; } } catch { /* Try the alternate descriptor encoding. */ } }
      if (descriptorEnd === null) throw new Error('ZIP data descriptor disagrees with its directory.'); dataEnd = descriptorEnd;
      if ((localSize && localSize !== size) || (localCompressed && localCompressed !== compressedSize) || (buffer.readUInt32LE(localOffset + 14) && buffer.readUInt32LE(localOffset + 14) !== checksum)) throw new Error('ZIP streaming header disagrees.');
    } else if (buffer.readUInt32LE(localOffset + 14) !== checksum || localCompressed !== compressedSize || localSize !== size) throw new Error('ZIP sizes or checksums disagree.');
    intervals.push([localOffset, dataEnd]); const compressed = buffer.subarray(dataStart, dataStart + compressedSize); let data;
    try { if (method === 8) { const inflated = inflateRawSync(compressed, { maxOutputLength: Math.max(1, size), info: true }); if (inflated.engine.bytesWritten !== compressed.length) throw new Error('Unused compressed bytes.'); data = inflated.buffer; } else data = Buffer.from(compressed); } catch { throw new Error('ZIP compressed data is corrupt or exceeds its declared size.'); }
    if (data.length !== size || crc32(data) !== checksum || (directory && size !== 0)) throw new Error('ZIP data failed size or CRC integrity verification.');
    output.push({ name, size, compressedSize, method: method === 8 ? 'deflate' : 'store', crc32: checksum.toString(16).padStart(8,'0'), directory, zip64: local64 || fields.has(1), dataDescriptor: Boolean(flags & 8), ...dates(fields, buffer.readUInt16LE(cursor + 12), buffer.readUInt16LE(cursor + 14)), ...(includeData ? { data } : {}) }); cursor = entryEnd;
  }
  if (cursor !== directoryEnd) throw new Error('ZIP directory entry count mismatch.'); intervals.sort((a,b) => a[0] - b[0]); for (let i = 1; i < intervals.length; i++) if (intervals[i][0] < intervals[i - 1][1]) throw new Error('Overlapping ZIP entries are unsupported.'); collisions(output); return output;
}
