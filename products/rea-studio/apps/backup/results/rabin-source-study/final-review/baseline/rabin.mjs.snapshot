import { validPolynomial } from './restic-crypto.mjs';
// Source-assisted translation of the pinned restic/chunker v0.4.0 rolling
// fingerprint/reset contracts. BSD-2-Clause license/source retained in references.
export const MIN=512*1024, MAX=8*1024*1024, TOTAL=64*1024*1024;
const degree=value=>value.toString(2).length-1;
function remainder(value,polynomial){const d=degree(polynomial);while(value&&degree(value)>=d)value^=polynomial<<BigInt(degree(value)-d);return value;}
function tables(polynomial){
 const outHigh=new Uint32Array(256),outLow=new Uint32Array(256),modHigh=new Uint32Array(256),modLow=new Uint32Array(256);
 for(let byte=0;byte<256;byte++){
  let value=BigInt(byte);for(let i=0;i<63;i++)value=remainder(value<<8n,polynomial);
  outHigh[byte]=Number(value>>32n);outLow[byte]=Number(value&0xffffffffn);
  const high=BigInt(byte)<<53n,mod=remainder(high,polynomial)|high;
  modHigh[byte]=Number(mod>>32n);modLow[byte]=Number(mod&0xffffffffn);
 }
 return{outHigh,outLow,modHigh,modLow};
}
export class RabinBoundaries{
 #tables;#window=new Uint8Array(64);#high=0;#low=1;#wpos=1;#count=0;#pre=MIN-64;#start=0;#total=0;#closed=false;
 constructor(polynomial){if(!validPolynomial(polynomial))throw new Error('Use a valid degree-53 restic polynomial.');this.#tables=tables(BigInt('0x'+polynomial));this.#window[0]=1;}
 #reset(){this.#window.fill(0);this.#window[0]=1;this.#high=0;this.#low=1;this.#wpos=1;this.#count=0;this.#pre=MIN-64;}
 #record(){return{start:this.#start,length:this.#count,cut:((BigInt(this.#high)<<32n)|BigInt(this.#low)).toString(16)};}
 push(bytes){
  if(this.#closed)throw new Error('Chunker is already finished.');
  if(!Buffer.isBuffer(bytes)||bytes.length+this.#total>TOTAL)throw new Error('Chunker exceeds its bounded 64 MiB input contract.');
  const rows=[],t=this.#tables;let offset=0;this.#total+=bytes.length;
  while(offset<bytes.length){
   if(this.#pre){const skipped=Math.min(this.#pre,bytes.length-offset);this.#count+=skipped;this.#pre-=skipped;offset+=skipped;continue;}
   const byte=bytes[offset++],out=this.#window[this.#wpos];this.#window[this.#wpos]=byte;this.#wpos=(this.#wpos+1)&63;
   let high=(this.#high^t.outHigh[out])>>>0,low=(this.#low^t.outLow[out])>>>0;
   const index=high>>>13;high=((high<<8)|(low>>>24))>>>0;low=((low<<8)|byte)>>>0;
   this.#high=(high^t.modHigh[index])>>>0;this.#low=(low^t.modLow[index])>>>0;this.#count++;
   if(this.#count>=MIN&&((this.#low&0xfffff)===0||this.#count>=MAX)){rows.push(this.#record());this.#start+=this.#count;this.#reset();}
  }
  return rows;
 }
 finish(){if(this.#closed)return[];this.#closed=true;return this.#count?[this.#record()]:[];}
}
