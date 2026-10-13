import {types} from 'node:util';
export const inputLimits=Object.freeze({nodes:4096,bytes:128*1024,depth:12,keys:64,array:256});
// Copy only after validating descriptor values, before invoking any caller getter.
export function boundedInput(value,allowed) {
  let nodes=0,bytes=0; const seen=new Set();
  function copy(item,depth) {
    if (++nodes>inputLimits.nodes || depth>inputLimits.depth) throw Error('WebDAV input exceeds its structural budget.');
    if (item===null || typeof item==='boolean') return item;
    if (typeof item==='number') { if(!Number.isFinite(item)) throw Error('Nonfinite WebDAV input.'); return item; }
    if (typeof item==='string') { bytes+=item.length*2; if(bytes>inputLimits.bytes || !item.isWellFormed()) throw Error('WebDAV input exceeds its text budget.'); return item; }
    if (!item || typeof item!=='object' || types.isProxy(item) || seen.has(item)) throw Error('Use acyclic plain WebDAV input.');
    const array=Array.isArray(item); if(array ? Object.getPrototypeOf(item)!==Array.prototype || item.length>inputLimits.array : ![Object.prototype,null].includes(Object.getPrototypeOf(item))) throw Error('Use bounded plain WebDAV input.');
    seen.add(item); const descriptors=Reflect.ownKeys(item); if(descriptors.length>(array?inputLimits.array+1:inputLimits.keys)) throw Error('WebDAV input has too many properties.');
    const result=array?[]:Object.create(null);
    for(const key of descriptors) { if(array && key==='length') continue; const desc=Object.getOwnPropertyDescriptor(item,key); if(typeof key!=='string' || !desc.enumerable || !Object.hasOwn(desc,'value') || array && !/^(0|[1-9]\d*)$/.test(key)) throw Error('WebDAV input cannot contain accessors or hidden properties.'); bytes+=key.length*2; if(bytes>inputLimits.bytes) throw Error('WebDAV input exceeds its text budget.'); if(depth===0 && !allowed.includes(key)) throw Error('Unsupported WebDAV action input.'); result[key]=copy(desc.value,depth+1); }
    if(array && result.length!==item.length) throw Error('Sparse WebDAV input arrays are unsupported.'); seen.delete(item); return result;
  }
  return copy(value,0);
}
