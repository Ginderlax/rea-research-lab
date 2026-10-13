const keys = ['checksum','sizeOnly','ignoreSize','ignoreTimes','ignoreExisting','update','noUpdateModtime'];
export function davComparisonOptions(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key=>!keys.includes(key))) throw Error('Unsupported generic WebDAV comparison option.');
  for (const key of keys) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw Error('Comparison options must be boolean.');
  return Object.fromEntries(keys.map(key=>[key,Boolean(value[key])]));
}
// Pinned generic vendor=other advertises no hashes and no time precision.
// Downloaded safety hashes never replace rclone's comparison contract.
export function compareDAV(source,destination,settings = {}) {
  const options = davComparisonOptions(settings), copy = reason=>({type:'copy',reason}), skip=reason=>({type:'skip',reason});
  const validate = item=>{ if (!Number.isSafeInteger(item.size) || item.size<0 || !Number.isFinite(item.modifiedMs??0)) throw Error('Invalid comparison metadata.'); };
  validate(source); if (!destination) return copy('missing-destination'); validate(destination);
  if (options.ignoreExisting) return skip('ignore-existing');
  if (options.ignoreTimes) return copy('ignore-times');
  if(source.mtimeNs!==undefined && (typeof source.mtimeNs!=='string' || !/^-?\d{1,22}$/.test(source.mtimeNs))) throw Error('Invalid source nanosecond time.');
  const delta = BigInt(Math.trunc((destination.modifiedMs??0)*1e6))-(source.mtimeNs!==undefined?BigInt(source.mtimeNs):BigInt(Math.trunc((source.modifiedMs??0)*1e6)));
  if (options.update && delta>=1000000000n) return skip('destination-newer');
  if (!options.ignoreSize && source.size!==destination.size) return copy('different-size');
  if (options.sizeOnly) return skip('size-only');
  if (options.checksum) return skip('no-common-hash-size-fallback');
  if (options.update && delta<=-1000000000n) return copy('source-newer-no-common-hash');
  return skip('generic-webdav-size-equal');
}
