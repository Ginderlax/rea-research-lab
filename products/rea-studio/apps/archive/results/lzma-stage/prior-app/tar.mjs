import { MAX_TOTAL, MAX_FILE, MAX_ENTRIES, clean } from './zip.mjs';

export const MAX_CONTAINER = 96 * 1024 * 1024;
const utf8 = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes);
const padded = size => Math.ceil(size / 512) * 512;
function text(bytes) { const end = bytes.indexOf(0); return utf8(end < 0 ? bytes : bytes.subarray(0, end)); }
function integer(bytes) {
  if (bytes[0] & 128) {
    let value = BigInt(bytes[0] & 127); for (const byte of bytes.subarray(1)) value = value * 256n + BigInt(byte);
    if (bytes[0] & 64) value -= 1n << BigInt(bytes.length * 8 - 1);
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('TAR integer exceeds the supported range.'); return Number(value);
  }
  const value = bytes.toString('ascii').replace(/\0.*$/, '').trim(); if (!/^[0-7]*$/.test(value)) throw new Error('Invalid TAR octal value.');
  const number = value ? parseInt(value, 8) : 0; if (!Number.isSafeInteger(number)) throw new Error('TAR integer exceeds the supported range.'); return number;
}
function writeOctal(header, offset, width, number) { const encoded = Math.max(0, Math.floor(number)).toString(8); if (encoded.length >= width) throw new Error('TAR number exceeds its header field.'); header.write(encoded.padStart(width - 1, '0') + '\0', offset, width, 'ascii'); }
function checksum(header) { let sum = 0; for (let i = 0; i < 512; i++) sum += i >= 148 && i < 156 ? 32 : header[i]; return sum; }
function header(name, size, type, mtime, mode = 0o644) {
  const output = Buffer.alloc(512); Buffer.from(name, 'utf8').copy(output, 0, 0, 100); writeOctal(output, 100, 8, mode); writeOctal(output, 108, 8, 0); writeOctal(output, 116, 8, 0);
  writeOctal(output, 124, 12, size); writeOctal(output, 136, 12, mtime); output[156] = type.charCodeAt(0); output.write('ustar\0', 257, 'ascii'); output.write('00', 263, 'ascii'); output.write(checksum(output).toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii'); return output;
}
function paxRecord(key, value) { const payload = Buffer.from(`${key}=${value}\n`, 'utf8'); let size = payload.length + 2; while (String(size).length + 1 + payload.length !== size) size = String(size).length + 1 + payload.length; return Buffer.concat([Buffer.from(`${size} `), payload]); }
function parsePax(data) {
  const result = new Map(); let at = 0;
  while (at < data.length) {
    const space = data.indexOf(32, at); if (space < 0 || space - at > 10 || !/^\d+$/.test(data.toString('ascii', at, space))) throw new Error('Invalid PAX record length.');
    const size = Number(data.toString('ascii', at, space)), end = at + size; if (size < space - at + 4 || end > data.length || data[end - 1] !== 10) throw new Error('Truncated PAX record.');
    const record = utf8(data.subarray(space + 1, end - 1)), equals = record.indexOf('='); if (equals < 1) throw new Error('Invalid PAX record.'); const key = record.slice(0, equals), value = record.slice(equals + 1); if (key.includes('\0') || value.includes('\0')) throw new Error('Invalid PAX text.'); result.set(key, value); at = end;
  }
  return result;
}
function apply(target, values) { for (const [key, value] of values) { if (value === '') target.delete(key); else target.set(key, value); } }
function decimal(value, label) { if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error(`Invalid PAX ${label}.`); const number = Number(value); if (!Number.isFinite(number)) throw new Error(`Invalid PAX ${label}.`); return number; }
function iso(seconds) { const date = new Date(seconds * 1000); if (!Number.isFinite(date.getTime())) throw new Error('Unsupported TAR timestamp.'); return date.toISOString(); }
export function makeTar(entries) {
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) throw new Error('Archive has too many entries.');
  const chunks = [], seen = new Set(), files = new Set(entries.filter(e => !e.directory).map(e => clean(e.name).toLowerCase())); let total = 0;
  for (const [index, item] of entries.entries()) {
    const normalized = clean(item.name), name = normalized + (item.directory ? '/' : ''), identity = normalized.toLowerCase(); if (seen.has(identity)) throw new Error('Duplicate archive path.'); seen.add(identity);
    const parts = identity.split('/'); while (parts.length > 1) { parts.pop(); if (files.has(parts.join('/'))) throw new Error('Archive path is both a file and a directory.'); }
    const data = item.directory ? Buffer.alloc(0) : Buffer.from(item.data); total += data.length; if (data.length > MAX_FILE || total > MAX_TOTAL) throw new Error('Archive input exceeds the local size limit.');
    const date = new Date(item.modifiedAt ?? '1980-01-01T00:00:00Z'); if (!Number.isFinite(date.getTime())) throw new Error('Use a valid archive modification date.'); const seconds = date.getTime() / 1000, records = [];
    if (Buffer.byteLength(name) > 100 || /[^\x20-\x7e]/.test(name)) records.push(paxRecord('path', name));
    const extendedTime = !Number.isInteger(seconds) || seconds < 0 || seconds > 0o77777777777, headerTime = extendedTime ? 0 : seconds;
    if (extendedTime) records.push(paxRecord('mtime', seconds));
    if (item.accessedAt !== undefined) { const atime = new Date(item.accessedAt).getTime() / 1000; if (!Number.isFinite(atime)) throw new Error('Use valid archive timestamps.'); records.push(paxRecord('atime', atime)); }
    if (records.length) { const pax = Buffer.concat(records); chunks.push(header(`PaxHeaders/entry-${index}`, pax.length, 'x', headerTime), pax, Buffer.alloc(padded(pax.length) - pax.length)); }
    const fallback = Buffer.byteLength(name) <= 100 && !/[^\x20-\x7e]/.test(name) ? name : `entry-${index}${item.directory ? '/' : ''}`;
    chunks.push(header(fallback, data.length, item.directory ? '5' : '0', headerTime, item.directory ? 0o755 : 0o644), data, Buffer.alloc(padded(data.length) - data.length));
  }
  chunks.push(Buffer.alloc(1024)); const result = Buffer.concat(chunks); if (result.length > MAX_CONTAINER) throw new Error('TAR container exceeds the local size limit.'); return result;
}
export function readTar(buffer, includeData = false) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1024 || buffer.length > MAX_CONTAINER || buffer.length % 512) throw new Error('Invalid TAR size.');
  const output = [], seen = new Set(), global = new Map(); let local = new Map(), longName, at = 0, total = 0, headers = 0, ended = false;
  while (at + 512 <= buffer.length) {
    const block = buffer.subarray(at, at + 512); at += 512;
    if (block.every(byte => byte === 0)) { if (at + 512 > buffer.length || !buffer.subarray(at).every(byte => byte === 0)) throw new Error('Invalid TAR end padding.'); ended = true; break; }
    if (++headers > MAX_ENTRIES * 3) throw new Error('TAR has too many headers.');
    const expected = integer(block.subarray(148, 156)), unsigned = checksum(block); let signed = 0; for (let i = 0; i < 512; i++) signed += i >= 148 && i < 156 ? 32 : block[i] > 127 ? block[i] - 256 : block[i]; if (expected !== unsigned && expected !== signed) throw new Error('TAR header checksum mismatch.');
    const kind = block[156] ? String.fromCharCode(block[156]) : '0', size = integer(block.subarray(124, 136)); if (size < 0) throw new Error('Invalid TAR size.');
    if (['x', 'g', 'L'].includes(kind)) { if (size > 65536 || at + padded(size) > buffer.length) throw new Error('TAR metadata exceeds its limit.'); const data = buffer.subarray(at, at + size); at += padded(size); if (kind === 'L') longName = text(data); else { const values = parsePax(data); if (kind === 'g') apply(global, values); else for (const [key, value] of values) local.set(key, value); } continue; }
    if (!['0', '5'].includes(kind)) throw new Error('Linked, device, sparse or unsupported TAR entries cannot be extracted.');
    const metadata = new Map(global); apply(metadata, local); local = new Map(); for (const [key, value] of metadata) if (key.startsWith('GNU.sparse') || key === 'SCHILY.realsize' || key === 'SCHILY.filetype' && value === 'sparse') throw new Error('Sparse TAR entries are unsupported.');
    const magic = block.toString('ascii', 257, 263), prefix = magic === 'ustar\0' ? text(block.subarray(345, 500)) : '';
    let name = metadata.get('path') ?? longName ?? (prefix ? prefix + '/' : '') + text(block.subarray(0, 100)); longName = undefined;
    while (name.startsWith('./')) name = name.slice(2);
    const directory = kind === '5' || name.endsWith('/'), actual = metadata.has('size') ? decimal(metadata.get('size'), 'size') : size;
    if (!Number.isSafeInteger(actual) || actual < 0 || actual > MAX_FILE || total + actual > MAX_TOTAL || at + padded(actual) > buffer.length || directory && actual !== 0) throw new Error('TAR entry exceeds the extraction size limit or is truncated.');
    if (directory && (name === '' || name === '.')) { at += padded(actual); continue; }
    const normalized = clean(name), identity = normalized.toLowerCase(); if (seen.has(identity)) throw new Error('Duplicate archive path.'); seen.add(identity); total += actual;
    const modifiedAt = iso(metadata.has('mtime') ? decimal(metadata.get('mtime'), 'mtime') : integer(block.subarray(136, 148)));
    output.push({ name: normalized + (directory ? '/' : ''), directory, size: actual, compressedSize: actual, method: 'tar', modifiedAt, ...(metadata.has('atime') ? { accessedAt: iso(decimal(metadata.get('atime'), 'atime')) } : {}), ...(includeData ? { data: Buffer.from(buffer.subarray(at, at + actual)) } : {}) }); at += padded(actual);
    if (output.length > MAX_ENTRIES) throw new Error('TAR has too many entries.');
  }
  if (!ended || local.size || longName !== undefined) throw new Error('TAR end record is missing.');
  const files = new Set(output.filter(e => !e.directory).map(e => clean(e.name).toLowerCase())); for (const entry of output) { const parts = clean(entry.name).toLowerCase().split('/'); while (parts.length > 1) { parts.pop(); if (files.has(parts.join('/'))) throw new Error('Archive path is both a file and a directory.'); } } return output;
}
