// Bounded .7z codec. Container contracts were
// studied in the pinned official 7-Zip 26.04 SDK 7zFormat.txt / Methods.txt and
// full-product 7zIn.cpp / 7zOut.cpp. No original application is invoked here.
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { decodeLzma, decodeLzma2 } from './lzma.mjs';
import { encodeLzma, encodeLzma2 } from './encode-lzma.mjs';

export const LIMITS = Object.freeze({ file: 16 * 1024 ** 2, total: 64 * 1024 ** 2,
  container: 96 * 1024 ** 2, header: 16 * 1024 ** 2, entries: 10000, depth: 128 });
const SIG = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
const EPOCH = 116444736000000000n;
const fail = message => { throw new Error(`7z: ${message}`); };
const typedByteLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteLength').get;
function byteLength(data, label) {
  if (!(data instanceof Uint8Array)) fail(`${label} must be Buffer or Uint8Array bytes`);
  try { return typedByteLength.call(data); } catch { fail(`${label} must be Buffer or Uint8Array bytes`); }
}
function copyBytes(data, length) {
  const buffer = Buffer.allocUnsafe(length); Uint8Array.prototype.set.call(buffer, data); return buffer;
}
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const byte = n => Buffer.from([n]);
const join = buffers => Buffer.concat(buffers);
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b; };
export function encodeNumber(value) {
  value = BigInt(value);
  if (value < 0n || value > 0xffffffffffffffffn) fail('integer outside UINT64');
  let first = 0, mask = 0x80, extra = 0;
  for (; extra < 8; extra++, mask >>>= 1) {
    if (value < (1n << BigInt(7 * (extra + 1)))) {
      first |= Number(value >> BigInt(8 * extra)); break;
    }
    first |= mask;
  }
  const result = Buffer.alloc(extra + 1); result[0] = first;
  for (let i = 0; i < extra; i++) result[i + 1] = Number((value >> BigInt(8 * i)) & 255n);
  return result;
}
class Reader {
  constructor(data) { this.data = data; this.pos = 0; }
  take(size) {
    if (!Number.isSafeInteger(size) || size < 0 || size > this.data.length - this.pos) fail('truncated header');
    const b = this.data.subarray(this.pos, this.pos + size); this.pos += size; return b;
  }
  byte() { return this.take(1)[0]; }
  uint32() { return this.take(4).readUInt32LE(); }
  numberBig() {
    const first = this.byte(); let value = 0n, mask = 0x80;
    for (let i = 0; i < 8; i++, mask >>>= 1) {
      if (!(first & mask)) return value | (BigInt(first & (mask - 1)) << BigInt(8 * i));
      value |= BigInt(this.byte()) << BigInt(8 * i);
    }
    return value;
  }
  number(max = LIMITS.container, what = 'integer') {
    const n = this.numberBig(); if (n > BigInt(max)) fail(`${what} exceeds bound`); return Number(n);
  }
  property() { const n = this.numberBig(); return n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n; }
  id(expected) { if (this.property() !== expected) fail(`expected property ${expected.toString(16)}`); }
  end() { if (this.pos !== this.data.length) fail('trailing header data'); }
}
export function decodeNumber(data) { const r = new Reader(data); const value = r.numberBig(); r.end(); return value; }
function bits(values) {
  const b = Buffer.alloc(Math.ceil(values.length / 8));
  values.forEach((v, i) => { if (v) b[i >>> 3] |= 0x80 >>> (i & 7); }); return b;
}
function readBits(r, count) {
  const b = r.take(Math.ceil(count / 8));
  return Array.from({ length: count }, (_, i) => Boolean(b[i >>> 3] & (0x80 >>> (i & 7))));
}
function defined(r, count) {
  const all = r.byte(); if (all !== 0 && all !== 1) fail('invalid defined flag');
  return all ? Array(count).fill(true) : readBits(r, count);
}
function digests(r, count) { return defined(r, count).map(on => on ? r.uint32() : null); }
const writeDigests = values => join([byte(0x0a), byte(1), ...values.map(u32)]);
function validUnicode(value) {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = value.charCodeAt(++i); if (!(d >= 0xdc00 && d <= 0xdfff)) fail('invalid UTF-16 filename');
    } else if (c >= 0xdc00 && c <= 0xdfff) fail('invalid UTF-16 filename');
  }
}
function cleanPath(name) {
  if (typeof name !== 'string' || !name || name.length > 4096 || name.startsWith('/') || /[\\\0]/.test(name)) fail('unsafe path');
  validUnicode(name);
  const path = name.endsWith('/') ? name.slice(0, -1) : name;
  const parts = path.split('/'); if (parts.length > LIMITS.depth) fail('path depth exceeds bound');
  for (const part of parts) {
    if (!part || part === '.' || part === '..' || /[:<>"|?*\x00-\x1f]/.test(part) || /[. ]$/.test(part)
      || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)) fail('unsafe path');
  }
  return path;
}
function checkPaths(entries) {
  const seen = new Map();
  for (const e of entries) {
    e.name = cleanPath(e.name); const key = e.name.toLowerCase();
    if (seen.has(key)) fail('duplicate or case-colliding path'); seen.set(key, e.directory);
  }
  for (const key of seen.keys()) {
    const parts = key.split('/'); parts.pop(); let ancestor = '';
    for (const p of parts) { ancestor += (ancestor ? '/' : '') + p; if (seen.get(ancestor) === false) fail('file ancestor collision'); }
  }
}
function storedLzma2Encode(data) {
  const chunks = [];
  for (let pos = 0; pos < data.length; pos += 65536) {
    const chunk = data.subarray(pos, pos + 65536), n = chunk.length - 1;
    chunks.push(Buffer.from([pos ? 2 : 1, n >>> 8, n & 255]), chunk);
  }
  chunks.push(byte(0)); return join(chunks);
}
function storedLzma2Decode(data, size, properties) {
  if (properties.length !== 1 || properties[0] > 40) fail('invalid LZMA2 properties');
  const dict = properties[0] === 40 ? 0xffffffff : (2 + (properties[0] & 1)) * 2 ** (Math.floor(properties[0] / 2) + 11);
  if (dict > LIMITS.total) fail('LZMA2 dictionary exceeds bound');
  const r = new Reader(data), chunks = []; let output = 0, reset = false, count = 0;
  for (;;) {
    const control = r.byte(); if (++count > 100000) fail('LZMA2 chunk count exceeds bound');
    if (control === 0) { r.end(); break; }
    if (control >= 0x80) fail('compressed LZMA2 chunks are not supported yet');
    if (control !== 1 && control !== 2) fail('invalid LZMA2 control');
    if (control === 1) reset = true; else if (!reset) fail('LZMA2 dictionary was not reset');
    const n = (r.byte() << 8 | r.byte()) + 1; output += n;
    if (output > size) fail('LZMA2 output exceeds declared size'); chunks.push(r.take(n));
  }
  if (output !== size) fail('LZMA2 output size mismatch'); return join(chunks);
}
function decodeCoder(packed, folder) {
  const { method, properties, size } = folder; let data;
  if (method === '00') {
    if (properties.length) fail('Copy properties are not supported'); data = packed;
  } else if (method === '040108') {
    if (properties.length) fail('DEFLATE properties are not supported');
    try {
      const result = inflateRawSync(packed, { maxOutputLength: Math.max(1, size + 1), info: true });
      if (result.engine.bytesWritten !== packed.length) fail('trailing DEFLATE data'); data = result.buffer;
    } catch (error) { fail(`invalid DEFLATE stream: ${error.message}`); }
  } else if (method === '21') data = decodeLzma2(packed, size, properties, { maxOutput: size });
  else if (method === '030101') data = decodeLzma(packed, size, properties, { maxOutput: size });
  else fail(`unsupported coder ${method}`);
  if (data.length !== size) fail('folder output size mismatch'); return data;
}
function parseStreams(r, outputBound) {
  let id = r.property(), packPos = 0, packSizes = [], packCRCs = [], folders = [];
  if (id === 6) {
    packPos = r.number(LIMITS.container, 'pack offset'); const count = r.number(LIMITS.entries, 'pack stream count');
    r.id(9); packSizes = Array.from({ length: count }, () => r.number(LIMITS.container, 'packed size'));
    packCRCs = Array(count).fill(null); id = r.property();
    if (id === 10) { packCRCs = digests(r, count); id = r.property(); }
    if (id !== 0) fail('unsupported PackInfo property'); id = r.property();
  }
  if (id === 7) {
    r.id(11); const count = r.number(LIMITS.entries, 'folder count'); if (r.byte() !== 0) fail('external folder metadata is not supported');
    folders = Array.from({ length: count }, () => {
      if (r.number(32, 'coder count') !== 1) fail('multiple coders and filters are not supported');
      const flags = r.byte(), n = flags & 15; if (!n || n > 8 || flags & 0xc0) fail('invalid coder flags');
      const methodBytes = r.take(n); if (n === 8 && methodBytes[0] & 0x80) fail('method ID exceeds 63 bits');
      const method = methodBytes.toString('hex');
      if (flags & 16 && (r.number(16) !== 1 || r.number(16) !== 1)) fail('complex coder streams are not supported');
      const properties = flags & 32 ? r.take(r.number(1024, 'coder properties size')) : Buffer.alloc(0);
      return { method, properties, size: 0, crc: null, subSizes: [], subCRCs: [] };
    });
    r.id(12); let total = 0;
    for (const folder of folders) { folder.size = r.number(outputBound, 'folder output size'); total += folder.size; if (total > outputBound) fail('total folder output exceeds bound'); }
    id = r.property(); if (id === 10) { const crcs = digests(r, count); folders.forEach((f, i) => { f.crc = crcs[i]; }); id = r.property(); }
    if (id !== 0) fail('unsupported UnpackInfo property'); id = r.property();
  }
  let counts = folders.map(() => 1), subs = false;
  if (id === 8) {
    subs = true; id = r.property();
    if (id === 13) { counts = folders.map(() => r.number(LIMITS.entries, 'substream count')); id = r.property(); }
    if (counts.reduce((a, n) => a + n, 0) > LIMITS.entries) fail('total substream count exceeds bound');
    if (id === 9) {
      folders.forEach((f, i) => {
        let total = 0; for (let j = 1; j < counts[i]; j++) { const n = r.number(outputBound, 'substream size'); total += n; if (total > f.size) fail('substream sizes exceed folder'); f.subSizes.push(n); }
      }); id = r.property();
    } else if (counts.some(n => n > 1)) fail('missing solid substream sizes');
    folders.forEach((f, i) => { if (counts[i]) f.subSizes.push(f.size - f.subSizes.reduce((a, n) => a + n, 0)); else if (f.size) fail('nonempty folder without substreams'); });
    const digestCount = folders.reduce((n, f, i) => n + (counts[i] === 1 && f.crc !== null ? 0 : counts[i]), 0);
    let crcs = Array(digestCount).fill(null);
    if (id === 10) { crcs = digests(r, digestCount); id = r.property(); }
    let pos = 0;
    folders.forEach((f, i) => { f.subCRCs = counts[i] === 1 && f.crc !== null ? [f.crc] : crcs.slice(pos, pos += counts[i]); });
    if (id !== 0) fail('unsupported SubStreamsInfo property'); id = r.property();
  }
  if (!subs) folders.forEach(f => { f.subSizes = [f.size]; f.subCRCs = [f.crc]; });
  if (id !== 0) fail('unsupported StreamsInfo property');
  if (folders.length !== packSizes.length) fail('folder/pack stream count mismatch');
  return { packPos, packSizes, packCRCs, folders };
}
function parseFiles(r) {
  const count = r.number(LIMITS.entries, 'file count');
  const files = Array.from({ length: count }, () => ({ name: null, directory: false, mtimeMs: null, attributes: null }));
  let empty = Array(count).fill(false), emptyFile = [], anti = [], propertyCount = 0; const seen = new Set();
  for (;;) {
    const id = r.property(); if (id === 0) break;
    if (++propertyCount > 100000) fail('file property count exceeds bound');
    const p = new Reader(r.take(r.number(LIMITS.header, 'file property size')));
    // The official writer emits repeated Dummy alignment properties. Reject
    // duplicate semantic metadata, but allow repeated bounded ancillary data.
    if (id >= 14 && id <= 21) { if (seen.has(id)) fail('duplicate file property'); seen.add(id); }
    if (id === 14) empty = readBits(p, count);
    else if (id === 15 || id === 16) {
      if (!seen.has(14)) fail('empty-file property before empty-stream property');
      const values = readBits(p, empty.filter(Boolean).length); if (id === 15) emptyFile = values; else anti = values;
    } else if (id === 17) {
      if (p.byte() !== 0) fail('external names are not supported');
      for (const file of files) {
        const start = p.pos; let length = 0;
        while (p.take(2).readUInt16LE() !== 0) { if (++length > 4096) fail('filename exceeds bound'); }
        file.name = p.data.subarray(start, p.pos - 2).toString('utf16le'); validUnicode(file.name);
      }
    } else if (id >= 18 && id <= 21) {
      const on = defined(p, count); if (p.byte() !== 0) fail('external file metadata is not supported');
      files.forEach((file, i) => {
        if (!on[i]) return;
        if (id === 21) file.attributes = p.uint32();
        else {
          const raw = p.take(8).readBigUInt64LE(), ms = (raw - EPOCH) / 10000n;
          if (ms < -8640000000000000n || ms > 8640000000000000n) fail('file timestamp outside supported range');
          if (id === 20) file.mtimeMs = Number(ms);
        }
      });
    } else if (id === 25) {
      for (const b of p.take(p.data.length)) if (b !== 0) fail('nonzero Dummy alignment data');
    } else { p.take(p.data.length); } // Ignored bounded ancillary properties.
    p.end();
  }
  let ei = 0;
  files.forEach((file, i) => {
    file.hasStream = !empty[i];
    if (empty[i]) { if (anti[ei]) fail('anti-files are not supported'); file.directory = !emptyFile[ei++]; }
    if (file.attributes !== null) {
      const attrDirectory = Boolean(file.attributes & 16);
      if (attrDirectory !== file.directory) fail('directory attribute contradicts file stream');
      if (file.attributes & 0x8000) {
        const type = (file.attributes >>> 16) & 0xf000;
        if (type && type !== (file.directory ? 0x4000 : 0x8000)) fail('links and special file types are not supported');
      }
    }
  });
  checkPaths(files); return files;
}
function readPacked(streams, archive, nextStart, ranges, outputBound) {
  let pos = 32 + streams.packPos, total = 0; const substreams = [];
  streams.folders.forEach((folder, i) => {
    const size = streams.packSizes[i];
    if (size > nextStart - pos || pos < 32) fail('packed stream overlaps next header');
    if (size) ranges.push([pos, pos + size]);
    const packed = archive.subarray(pos, pos + size); pos += size;
    if (streams.packCRCs[i] !== null && crc32(packed) !== streams.packCRCs[i]) fail('packed stream CRC mismatch');
    const output = decodeCoder(packed, folder); total += output.length; if (total > outputBound) fail('output exceeds bound');
    if (folder.crc !== null && crc32(output) !== folder.crc) fail('folder CRC mismatch');
    let offset = 0;
    folder.subSizes.forEach((size, j) => {
      const data = output.subarray(offset, offset + size); offset += size;
      const crc = folder.subCRCs[j]; if (crc !== null && crc32(data) !== crc) fail('file CRC mismatch');
      const method = folder.method === '00' ? 'store' : folder.method === '040108' ? 'deflate' : folder.method === '030101' ? 'lzma' : 'lzma2';
      substreams.push({ data: Buffer.from(data), crc, method, solid: folder.subSizes.length > 1,
        block: i, compressedSize: folder.subSizes.length > 1 ? null : streams.packSizes[i] });
    });
    if (offset !== output.length) fail('folder substreams do not consume output');
  });
  return substreams;
}
export function read7z(archive) {
  const length = byteLength(archive, 'archive input');
  if (length < 32 || length > LIMITS.container) fail('container size exceeds bound');
  if (!Buffer.isBuffer(archive)) archive = copyBytes(archive, length);
  if (!archive.subarray(0, 6).equals(SIG)) fail('invalid signature');
  if (archive[6] !== 0) fail('unsupported archive major version');
  if (crc32(archive.subarray(12, 32)) !== archive.readUInt32LE(8)) fail('start header CRC mismatch');
  const offset = archive.readBigUInt64LE(12), size = archive.readBigUInt64LE(20);
  if (offset > BigInt(LIMITS.container) || size > BigInt(LIMITS.header) || 32n + offset + size !== BigInt(archive.length)) fail('invalid next header bounds or trailing archive data');
  const nextStart = 32 + Number(offset), next = archive.subarray(nextStart);
  if (crc32(next) !== archive.readUInt32LE(28)) fail('next header CRC mismatch');
  if (!size) { if (offset) fail('unreferenced payload'); return []; }
  const ranges = []; let r = new Reader(next), id = r.property();
  if (id === 23) {
    const encoded = parseStreams(r, LIMITS.header); r.end();
    const streams = readPacked(encoded, archive, nextStart, ranges, LIMITS.header);
    if (streams.length !== 1) fail('encoded header must have one output stream');
    r = new Reader(streams[0].data); id = r.property();
  }
  if (id !== 1) fail('missing plain Header or unsupported nested encoded header');
  id = r.property();
  if (id === 2) {
    let count = 0;
    while (r.property() !== 0) { if (++count > 100000) fail('archive property count exceeds bound'); r.take(r.number(LIMITS.header, 'archive property size')); }
    id = r.property();
  }
  if (id === 3) fail('additional/external metadata streams are not supported');
  let streams = null;
  if (id === 4) { streams = parseStreams(r, LIMITS.total); id = r.property(); }
  let files = [];
  if (id === 5) { files = parseFiles(r); id = r.property(); }
  if (id !== 0) fail('unsupported Header property'); r.end();
  if (streams && streams.folders.some(f => f.subSizes.some(n => n > LIMITS.file))) fail('file size exceeds bound');
  const unpacked = streams ? readPacked(streams, archive, nextStart, ranges, LIMITS.total) : [];
  let index = 0;
  files.forEach(file => {
    if (file.hasStream) {
      const stream = unpacked[index++]; if (!stream) fail('file/stream count mismatch');
      Object.assign(file, stream);
    } else { file.data = Buffer.alloc(0); file.crc = null; file.method = 'store'; file.solid = false; file.compressedSize = 0; }
  });
  if (index !== unpacked.length) fail('unassigned unpacked streams');
  ranges.sort((a, b) => a[0] - b[0]); let end = 32;
  for (const [start, stop] of ranges) { if (start !== end) fail('overlapping or unreferenced packed data'); end = stop; }
  if (end !== nextStart) fail('unreferenced packed data');
  return files.map(({ hasStream, attributes, ...file }) => file);
}
function packStreams(groups, method, packPos = 0) {
  const methodBytes = Buffer.from(method === 'copy' ? '00' : method === 'deflate' ? '040108' : method === 'lzma' ? '030101' : '21', 'hex');
  const defaultProps = method === 'lzma2-store' ? Buffer.from([0]) : Buffer.alloc(0);
  const header = [byte(6), encodeNumber(packPos), encodeNumber(groups.length), byte(9), ...groups.map(g => encodeNumber(g.packed.length)),
    writeDigests(groups.map(g => crc32(g.packed))), byte(0), byte(7), byte(11), encodeNumber(groups.length), byte(0)];
  for (const g of groups) {
    const props = g.properties ?? defaultProps;
    header.push(encodeNumber(1), byte(methodBytes.length | (props.length ? 32 : 0)), methodBytes);
    if (props.length) header.push(encodeNumber(props.length), props);
  }
  header.push(byte(12), ...groups.map(g => encodeNumber(g.raw.length)), writeDigests(groups.map(g => crc32(g.raw))), byte(0), byte(8));
  if (groups.some(g => g.files.length !== 1)) header.push(byte(13), ...groups.map(g => encodeNumber(g.files.length)));
  if (groups.some(g => g.files.length > 1)) header.push(byte(9), ...groups.flatMap(g => g.files.slice(0, -1).map(f => encodeNumber(f.data.length))));
  const subCRCs = groups.flatMap(g => g.files.length === 1 ? [] : g.files.map(f => crc32(f.data)));
  if (subCRCs.length) header.push(writeDigests(subCRCs)); header.push(byte(0), byte(0));
  return join(header);
}
const prop = (id, data) => join([byte(id), encodeNumber(data.length), data]);
export function write7z(input, { method = 'deflate', level = 6, solid = false, encodedHeader = false, profile = 'balanced', dictionarySize, searchDepth, lc, lp, pb, endMarker = false, headerMethod = method.startsWith('lzma') ? 'lzma' : 'deflate', maxTimeMs, maxSteps } = {}) {
  if (!['copy', 'deflate', 'lzma2-store', 'lzma', 'lzma2'].includes(method)) fail('unsupported writer method');
  if (!Number.isInteger(level) || level < 0 || level > 9) fail('DEFLATE level must be 0..9');
  if (!Array.isArray(input) || input.length > LIMITS.entries) fail('entry count exceeds bound');
  let total = 0;
  const files = input.map(entry => {
    if (!entry || typeof entry !== 'object') fail('entry must be an object');
    const data = entry.data ?? Buffer.alloc(0);
    const length = byteLength(data, 'file content');
    if (length > LIMITS.file || total + length > LIMITS.total) fail('input size exceeds bound');
    if (entry.directory && length) fail('directory has content');
    total += length;
    const file = { ...entry, directory: Boolean(entry.directory), data: copyBytes(data, length) };
    if (file.mtimeMs != null && (!Number.isSafeInteger(file.mtimeMs) || file.mtimeMs < -11644473600000
      || file.mtimeMs > Number((0xffffffffffffffffn - EPOCH) / 10000n))) fail('unsupported timestamp');
    return file;
  }); checkPaths(files);
  const nonempty = files.filter(f => !f.directory && f.data.length);
  let packedTotal = 0;
  const encoderOptions = { profile, dictionarySize, searchDepth, lc, lp, pb, endMarker, maxTimeMs, maxSteps };
  const groups = (solid && nonempty.length ? [nonempty] : nonempty.map(f => [f])).map(group => {
    const raw = join(group.map(f => f.data));
    const opts = { ...encoderOptions, maxOutput: LIMITS.container - packedTotal };
    const encoded = method === 'lzma' ? encodeLzma(raw, opts) : method === 'lzma2' ? encodeLzma2(raw, opts) : { packed: method === 'copy' ? raw : method === 'deflate' ? deflateRawSync(raw, { level }) : storedLzma2Encode(raw) };
    if (encoded.packed.length > LIMITS.container - packedTotal) fail('packed output exceeds container bound');
    packedTotal += encoded.packed.length;
    return { files: group, raw, ...encoded };
  });
  const header = [byte(1)]; if (groups.length) header.push(byte(4), packStreams(groups, method));
  if (files.length) {
    header.push(byte(5), encodeNumber(files.length));
    const empty = files.map(f => f.directory || f.data.length === 0);
    if (empty.some(Boolean)) {
      header.push(prop(14, bits(empty))); const emptyFiles = files.filter((f, i) => empty[i]).map(f => !f.directory);
      if (emptyFiles.some(Boolean)) header.push(prop(15, bits(emptyFiles)));
    }
    header.push(prop(17, join([byte(0), ...files.map(f => Buffer.from(`${f.name}\0`, 'utf16le'))])));
    if (files.some(f => f.mtimeMs != null)) {
      const on = files.map(f => f.mtimeMs != null), time = on.every(Boolean) ? byte(1) : join([byte(0), bits(on)]);
      header.push(prop(20, join([time, byte(0), ...files.filter((f, i) => on[i]).map(f => u64(BigInt(f.mtimeMs) * 10000n + EPOCH))])));
    }
    header.push(prop(21, join([byte(1), byte(0), ...files.map(f => u32(f.directory ? 16 : 32))])), byte(0));
  }
  header.push(byte(0)); let next = join(header), packed = groups.map(g => g.packed);
  if (next.length > LIMITS.header) fail('header exceeds bound');
  if (encodedHeader) {
    if (!['lzma', 'lzma2', 'deflate'].includes(headerMethod)) fail('unsupported header method');
    const encoded = headerMethod === 'lzma' ? encodeLzma(next, { ...encoderOptions, endMarker: false, maxOutput: LIMITS.container - packedTotal }) : headerMethod === 'lzma2' ? encodeLzma2(next, { ...encoderOptions, endMarker: false, maxOutput: LIMITS.container - packedTotal }) : { packed: deflateRawSync(next, { level }) };
    const g = { files: [{ data: next }], raw: next, ...encoded };
    next = join([byte(23), packStreams([g], headerMethod, packedTotal)]); packed.push(g.packed);
  }
  const offset = packed.reduce((n, p) => n + p.length, 0), start = join([u64(BigInt(offset)), u64(BigInt(next.length)), u32(crc32(next))]);
  if (32 + offset + next.length > LIMITS.container) fail('container exceeds bound');
  const archive = join([SIG, Buffer.from([0, 4]), u32(crc32(start)), start, ...packed, next]);
  if (archive.length > LIMITS.container) fail('container exceeds bound'); return archive;
}
