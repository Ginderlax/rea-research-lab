import { createHash } from 'node:crypto';

export const MAX_ARCHIVE = 8 * 1024 * 1024, MAX_RESOURCE = 4 * 1024 * 1024;
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const isJoplinId = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const common = 'id created_time updated_time user_created_time user_updated_time encryption_cipher_text encryption_applied is_shared user_data type_';
const fields = {
  1: `${common} title body parent_id is_conflict latitude longitude altitude author source_url is_todo todo_due todo_completed source source_application application_data order markup_language share_id master_key_id conflict_original_id deleted_time is_locked extracted_resource_ids`,
  2: `${common} title parent_id icon share_id master_key_id deleted_time`,
  4: `${common} title mime filename file_extension size encryption_blob_encrypted share_id master_key_id is_locked blob_updated_time ocr_text ocr_details ocr_status ocr_error ocr_driver_id`,
  5: `${common} title parent_id`,
  6: `${common.replace(' user_data', '')} note_id tag_id`,
};
const dateFields = ['created_time', 'updated_time', 'user_created_time', 'user_updated_time', 'sync_time'];
const mimeExtensions = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'application/pdf': 'pdf', 'text/plain': 'txt', 'text/markdown': 'md', 'application/json': 'json', 'application/octet-stream': '', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4' };
export function decodeBase64(value, limit, name = 'File') {
  if (typeof value !== 'string' || value.length > Math.ceil(limit / 3) * 4 || value.length % 4 || /[^A-Za-z0-9+/=]/.test(value)) throw new Error(`${name} must be canonical base64 within its size limit.`);
  const data = Buffer.from(value, 'base64');
  if (data.length > limit || data.toString('base64') !== value) throw new Error(`${name} exceeds its size limit or is not canonical base64.`);
  return data;
}
function ascii(header, offset, length) { const raw = header.subarray(offset, offset + length); if (raw.some(byte => byte > 127)) throw new Error('Non-ASCII TAR header fields are unsupported.'); const end = raw.indexOf(0); return raw.subarray(0, end < 0 ? length : end).toString('latin1'); }
function octal(header, offset, length) { const value = ascii(header, offset, length).trim(); if (!/^[0-7]*$/.test(value)) throw new Error('Unsupported TAR numeric encoding.'); return value ? Number.parseInt(value, 8) : 0; }
function validPath(name) { if (!/^(?:[a-f0-9]{32}\.md|resources\/[a-f0-9]{32}(?:\.[A-Za-z0-9_-]{1,20})?)$/.test(name)) throw new Error(`Unsupported or unsafe archive path: ${name}`); }
export function readTar(data) {
  if (!Buffer.isBuffer(data) || data.length > MAX_ARCHIVE || data.length < 1024 || data.length % 512) throw new Error('JEX must be an uncompressed TAR within 8 MiB, with complete blocks.');
  const files = new Map(); let offset = 0, ended = false;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512); offset += 512;
    if (header.every(byte => byte === 0)) {
      if (offset + 512 > data.length || !data.subarray(offset).every(byte => byte === 0)) throw new Error('TAR needs two zero end blocks and no trailing data.');
      ended = true; break;
    }
    const checksum = [...header].reduce((sum, byte, i) => sum + (i >= 148 && i < 156 ? 32 : byte), 0);
    if (octal(header, 148, 8) !== checksum) throw new Error('TAR header checksum mismatch.');
    if (ascii(header, 345, 155) || ascii(header, 157, 100)) throw new Error('TAR prefixes and links are unsupported.');
    const name = ascii(header, 0, 100), type = header[156], size = octal(header, 124, 12);
    if (!Number.isSafeInteger(size) || size > MAX_RESOURCE || offset + Math.ceil(size / 512) * 512 > data.length) throw new Error('TAR entry is oversized or truncated.');
    if (type === 53 && name === 'resources/' && size === 0) continue;
    if (type !== 0 && type !== 48) throw new Error('Only regular TAR files are supported; links, PAX and special entries are rejected.');
    validPath(name); if (files.has(name)) throw new Error('Duplicate archive path.');
    if (files.size >= 3000) throw new Error('Archive has more than 3,000 entries.');
    files.set(name, Buffer.from(data.subarray(offset, offset + size)));
    const padded = Math.ceil(size / 512) * 512;
    if (!data.subarray(offset + size, offset + padded).every(byte => byte === 0)) throw new Error('Nonzero TAR padding.');
    offset += padded;
  }
  if (!ended || !files.size) throw new Error('Archive is empty or has no complete end marker.');
  return files;
}
function writeOctal(header, offset, length, value) { const encoded = value.toString(8); if (encoded.length > length - 1) throw new Error('TAR value overflow.'); header.write(encoded.padStart(length - 1, '0') + '\0', offset, length, 'ascii'); }
export function writeTar(files) {
  const blocks = []; let total = 1024;
  for (const [name, value] of files) {
    validPath(name); const data = Buffer.from(value); if (data.length > MAX_RESOURCE) throw new Error('Resource exceeds 4 MiB.');
    const header = Buffer.alloc(512); header.write(name, 0, 100, 'ascii'); writeOctal(header, 100, 8, 0o600); writeOctal(header, 108, 8, 0); writeOctal(header, 116, 8, 0); writeOctal(header, 124, 12, data.length); writeOctal(header, 136, 12, 0); header.fill(32, 148, 156); header[156] = 48; header.write('ustar\0', 257, 6, 'ascii'); header.write('00', 263, 2, 'ascii');
    header.write([...header].reduce((a, b) => a + b, 0).toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    const padding = Buffer.alloc((512 - data.length % 512) % 512); total += header.length + data.length + padding.length;
    if (total > MAX_ARCHIVE) throw new Error('Export exceeds the 8 MiB JEX limit.'); blocks.push(header, data, padding);
  }
  if (!blocks.length) throw new Error('There is no data to export.');
  return Buffer.concat([...blocks, Buffer.alloc(1024)], total);
}
export function parseRecord(data, filename) {
  if (data.length > 400_000) throw new Error('Raw item exceeds the text limit.');
  let content; try { content = new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { throw new Error('Raw item is not UTF-8.'); }
  if (content.includes('\0')) throw new Error('Raw item contains NUL.');
  const lines = content.split('\n'); if (lines.at(-1) === '') lines.pop();
  const props = Object.create(null); let split = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].trim()) { split = i; break; }
    const match = /^([a-z][a-z0-9_]*):[ ]?(.*)$/.exec(lines[i]); if (!match || Object.hasOwn(props, match[1])) throw new Error('Malformed or duplicate raw property.');
    props[match[1]] = match[2];
  }
  const type = Number(props.type_); if (!Object.hasOwn(fields, type)) throw new Error(`Unsupported Joplin record type: ${props.type_}`);
  if (!isJoplinId(props.id) || filename !== `${props.id}.md`) throw new Error('Raw record ID and filename must agree.');
  const allowed = new Set(fields[type].split(' '));
  for (const key of Object.keys(props)) if (!allowed.has(key) || key === 'title' || key === 'body') throw new Error(`Unsupported raw metadata: ${key}`);
  for (const key of ['encryption_applied', 'encryption_blob_encrypted']) if (props[key] && props[key] !== '0') throw new Error('Encrypted records/resources are unsupported; decrypt in Joplin first.');
  if (props.encryption_cipher_text) throw new Error('Encrypted record payload is unsupported.');
  const numericFields = ['deleted_time', 'is_shared', 'is_conflict', 'is_locked', 'is_todo', 'todo_due', 'todo_completed', 'order', 'markup_language', 'latitude', 'longitude', 'altitude', 'size', 'blob_updated_time', 'ocr_status', 'ocr_driver_id'];
  for (const key of numericFields) if (props[key] && (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(props[key]) || !Number.isFinite(Number(props[key])))) throw new Error(`Invalid numeric raw metadata: ${key}`);
  for (const key of ['is_shared', 'is_conflict', 'is_locked', 'is_todo']) if (props[key] && !['0', '1'].includes(props[key])) throw new Error(`Unsupported Boolean raw metadata: ${key}`);
  for (const key of ['todo_due', 'todo_completed', 'deleted_time', 'blob_updated_time']) if (props[key] && (!Number.isSafeInteger(Number(props[key])) || Number(props[key]) < 0 || Number(props[key]) > 8.64e15)) throw new Error(`Invalid timestamp raw metadata: ${key}`);
  for (const key of dateFields) if (props[key] && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(props[key]) || !Number.isFinite(Date.parse(props[key])) || new Date(props[key]).toISOString() !== props[key])) throw new Error(`Invalid raw date: ${key}`);
  if (props.deleted_time && !/^\d+$/.test(props.deleted_time)) throw new Error('Invalid deleted timestamp.');
  if (props.markup_language && !['', '1'].includes(props.markup_language)) throw new Error('Only Markdown note records are supported; HTML notes are rejected.');
  const before = split < 0 ? [] : lines.slice(0, split);
  const hasTitle = type !== 6;
  if (hasTitle && before.length > 1 && before[1] !== '') throw new Error('Raw title must be followed by a blank line.');
  if (!hasTitle && before.length) throw new Error('Relation record cannot contain a title or body.');
  const title = hasTitle ? before[0] ?? '' : undefined, body = type === 1 ? before.slice(2).join('\n') : undefined;
  if (title && /[\r\n]/.test(title)) throw new Error('Raw record title must stay on a single line.');
  if (title?.length > 300 || body?.length > 200_000 || (type !== 1 && before.slice(2).join('\n'))) throw new Error('Unsupported title/body content or limit.');
  return { type, title, body, props: Object.fromEntries(Object.entries(props).reverse()) };
}
export function serializeRecord(record) {
  if (record.type !== 6 && /[\r\n]/.test(record.title ?? '')) throw new Error('Raw record title must stay on a single line. Existing labels remain saved; edit the label or use JSON backup to preserve note text.');
  const pieces = []; if (record.type !== 6) pieces.push(record.title ?? ''); if (record.type === 1 && record.body) pieces.push(record.body);
  pieces.push(Object.entries(record.props).map(([key, value]) => `${key}: ${value}`).join('\n'));
  return Buffer.from(pieces.join('\n\n'), 'utf8');
}
export function resourceName(record) {
  let ext = record.props.file_extension ?? '';
  if (ext && !/^[A-Za-z0-9_-]{1,20}$/.test(ext)) throw new Error('Unsafe resource extension.');
  if (!ext) { if (!Object.hasOwn(mimeExtensions, record.props.mime ?? 'application/octet-stream')) throw new Error('Resource needs an explicit extension for this unsupported MIME fallback.'); ext = mimeExtensions[record.props.mime ?? 'application/octet-stream']; }
  return `resources/${record.props.id}${ext ? '.' + ext : ''}`;
}
export function readJex(data) {
  const files = readTar(data), records = new Map(), resources = new Map();
  for (const [name, bytes] of files) if (!name.startsWith('resources/')) {
    const record = parseRecord(bytes, name); if (records.has(record.props.id)) throw new Error('Duplicate item ID.'); records.set(record.props.id, record);
  }
  if (records.size > 2000 || [...records.values()].filter(r => r.type === 1).length > 1000) throw new Error('JEX has too many items or notes.');
  for (const [id, r] of records) {
    const requireType = (target, type, label) => { if (!isJoplinId(target) || records.get(target)?.type !== type) throw new Error(`Broken ${label} relation in ${id}.`); };
    if ((r.type === 1 || r.type === 2) && r.props.parent_id) requireType(r.props.parent_id, 2, 'notebook');
    if (r.type === 6) { requireType(r.props.note_id, 1, 'note/tag'); requireType(r.props.tag_id, 5, 'note/tag'); }
    if (r.type === 5 && r.props.parent_id) throw new Error('Nested tag metadata is unsupported.');
    if (r.type === 4) {
      const name = resourceName(r), bytes = files.get(name); if (!bytes) throw new Error(`Missing resource binary: ${name}`);
      if (r.props.size && (!/^\d+$/.test(r.props.size) || Number(r.props.size) !== bytes.length)) throw new Error('Resource size does not match binary.');
      resources.set(id, { record: r, bytes, name, sha256: digest(bytes) });
    }
  }
  for (const name of files.keys()) if (name.startsWith('resources/') && ![...resources.values()].some(r => r.name === name)) throw new Error('Orphan or mismatched resource binary.');
  const duplicateLinks = new Set();
  for (const r of records.values()) if (r.type === 6) { const link = r.props.note_id + ':' + r.props.tag_id; if (duplicateLinks.has(link)) throw new Error('Duplicate note/tag relation.'); duplicateLinks.add(link); }
  for (const r of records.values()) {
    if (r.type === 2) { const seen = new Set([r.props.id]); let parent = r.props.parent_id; while (parent) { if (seen.has(parent)) throw new Error('Notebook hierarchy cycle.'); if (seen.size >= 64) throw new Error('Notebook hierarchy exceeds the supported 64 levels.'); seen.add(parent); parent = records.get(parent).props.parent_id; } }
    if (r.type === 1) for (const link of r.body.matchAll(/:\/([a-f0-9]{32})(?![a-f0-9])/gi)) if (![1, 4].includes(records.get(link[1].toLowerCase())?.type)) throw new Error(`Unresolved note/resource link: ${link[1]}`);
  }
  return { records, resources };
}
