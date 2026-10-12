import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { RabinBoundaries,MIN,MAX } from './rabin.mjs';
const polynomial='3da3358b4dc173';
function split(bytes,width){const splitter=new RabinBoundaries(polynomial),rows=[];for(let offset=0;offset<bytes.length;offset+=width)rows.push(...splitter.push(bytes.subarray(offset,offset+width)));return[...rows,...splitter.finish()];}
test('pinned original zero-byte chunk boundary/cut/digest vectors',()=>{
 const bytes=Buffer.alloc(4*MIN),rows=split(bytes,8191);assert.equal(rows.length,4);
 for(const row of rows){assert.equal(row.length,MIN);assert.equal(row.cut,'0');assert.equal(createHash('sha256').update(bytes.subarray(row.start,row.start+row.length)).digest('hex'),'07854d2fef297a06ba81685e660c332de36d5d18d546927d30daad6d7fda1541');}
});
test('stream segmentation does not change boundaries or fingerprints',()=>{
 const bytes=Buffer.concat(Array.from({length:65536},(_,counter)=>createHash('sha256').update('rabin-fixture:'+counter).digest()));
 const expected=split(bytes,bytes.length);for(const width of[1,17,65536,MIN-64,MIN,MAX])assert.deepEqual(split(bytes,width),expected);
 assert.equal(expected.reduce((total,row)=>total+row.length,0),bytes.length);
});
test('empty/tiny tails, EOF and invalid polynomial/input bounds',()=>{
 assert.deepEqual(split(Buffer.alloc(0),1),[]);assert.deepEqual(split(Buffer.from('short'),1),[{start:0,length:5,cut:'1'}]);
 assert.throws(()=>new RabinBoundaries('1'));const c=new RabinBoundaries(polynomial);assert.throws(()=>c.push(Buffer.alloc(64*1024*1024+1)));assert.deepEqual(c.finish(),[]);assert.deepEqual(c.finish(),[]);assert.throws(()=>c.push(Buffer.alloc(0)));
});
