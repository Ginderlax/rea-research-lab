// Source-assisted new local comparison contract. Native MD5 decisions reproduce
// local rclone flags; separate SHA-256 fingerprints protect preview/apply state.
const booleans = ['checksum','sizeOnly','ignoreSize','ignoreTimes','ignoreExisting','update','noUpdateModtime'];
export function comparisonOptions(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => ![...booleans,'modifyWindowNs'].includes(key))) throw new Error('Unsupported native comparison option.');
  for (const key of booleans) if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error(`${key} must be boolean.`);
  const requested = value.modifyWindowNs ?? '100';
  if (typeof requested !== 'string' || !/^\d{1,15}$/.test(requested) || BigInt(requested) > 86400000000000n) throw new Error('Use a modification tolerance of at most one day, in integer nanoseconds.');
  const result = Object.fromEntries(booleans.map(key => [key,Boolean(value[key])]));
  result.modifyWindowNs = (BigInt(requested) < 100n ? 100n:BigInt(requested)).toString();
  return result;
}
export function compareFiles(source,destination,settings = {}) {
  const options = comparisonOptions(settings), window = BigInt(options.modifyWindowNs);
  const validate = file => { if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || typeof file.md5 !== 'string' || !/^[a-f0-9]{32}$/.test(file.md5) || typeof file.mtimeNs !== 'string' || !/^-?\d{1,22}$/.test(file.mtimeNs)) throw new Error('Invalid local comparison metadata.'); };
  validate(source);
  const copy = reason => ({type:'copy',reason}), skip = reason => ({type:'skip',reason});
  if (!destination) return copy('missing-destination');
  validate(destination);
  if (options.ignoreExisting) return skip('ignore-existing');
  if (options.ignoreTimes) return copy('ignore-times');
  const delta = BigInt(destination.mtimeNs) - BigInt(source.mtimeNs);
  function equal(sizeOnly,checksum,forceHash = false) {
    if (!options.ignoreSize && source.size !== destination.size) return copy('different-size');
    if (sizeOnly) return skip('size-only');
    if (checksum) return source.md5 === destination.md5 ? skip('matching-md5'):copy('different-md5');
    if (!forceHash && delta < window && delta > -window) return skip('matching-size-and-time');
    if (source.md5 !== destination.md5) return copy('different-md5');
    return options.noUpdateModtime ? skip('matching-md5-with-time-retained'):{type:'updateModtime',reason:'matching-md5-different-time',mtimeNs:source.mtimeNs};
  }
  if (options.update) {
    if (delta >= window) return skip('destination-newer');
    if (delta <= -window) return equal(options.sizeOnly,options.checksum,true);
    return equal(!options.checksum,options.checksum);
  }
  return equal(options.sizeOnly,options.checksum);
}
