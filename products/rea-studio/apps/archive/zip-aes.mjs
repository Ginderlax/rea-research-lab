// SPDX-License-Identifier: LGPL-2.1-or-later
// Source assistance: Igor Pavlov, 7-Zip26.04 WzAes/MyAes/Zip sources;
// retained license and exact provenance are in SEVENZIP-AES-LGPL.txt and
// ZIP-AES-COMPATIBILITY.md. Node supplies the native cryptographic primitives.
// Source-authored, unexecuted. Classic WinZip AE-1/AE-2 AES-256 payloads only.
// Format contract: immutable7-Zip26.04 commit9128b80e... WzAes/MyAes/Aes.c
// and WinZip AE specification1.04. No original program is imported or invoked.
import {createCipheriv,createHmac,pbkdf2Sync,randomBytes,timingSafeEqual} from 'node:crypto';
import {operationBudget} from './operation-budget.mjs';

export const ZIP_AES = Object.freeze({extraID:0x9901,method:99,strength:3,writerVersion:2,saltBytes:16,verifierBytes:2,macBytes:10,passwordBytes:99,maxCompressedBytes:64*1024*1024});
const failure=()=>new Error('The ZIP password is incorrect or the encrypted ZIP data is damaged.');
export function validateZipPassword(password,{allowEmpty=false}={}){
  if(typeof password!=='string'||password.length<(allowEmpty?0:1)||password.length>ZIP_AES.passwordBytes||!/^[\x20-\x7f]*$/.test(password))throw new Error('ZIP AES passwords must contain '+(allowEmpty?'0':'1')+'–99 ASCII characters (U+0020 through U+007F).');
  return Buffer.from(password,'ascii');
}
function input(bytes,extra=0){if(!Buffer.isBuffer(bytes)||bytes.length>ZIP_AES.maxCompressedBytes+extra)throw new Error('ZIP AES payload exceeds the local size limit.');}
function derive(password,salt,budget,allowEmpty){const bytes=validateZipPassword(password,{allowEmpty});let key;try{budget.check();budget.work(1000*4*(64+bytes.length+salt.length));key=pbkdf2Sync(bytes,salt,1000,66,'sha1');budget.check();return key;}catch(error){key?.fill(0);throw error;}finally{bytes.fill(0);}}
// The released counter is zero-initialized, preincrements its little-endian low
// 64 bits, and leaves its upper64bits zero. We encrypt counter blocks with ECB;
// plaintext is never encrypted in ECB mode. Native AES-CTR's counter differs.
function counterXor(bytes,key,budget){
  const output=Buffer.alloc(bytes.length),counterBlocks=Buffer.alloc(16*1024),cipher=createCipheriv('aes-256-ecb',key,null);cipher.setAutoPadding(false);let block=0n,offset=0;
  try{
    while(offset<bytes.length){budget.check();const length=Math.min(counterBlocks.length,Math.ceil((bytes.length-offset)/16)*16);counterBlocks.fill(0);for(let at=0;at<length;at+=16){block++;if(block>0xffffffffffffffffn)throw new Error('ZIP AES counter exceeds its format bound.');counterBlocks.writeBigUInt64LE(block,at);}
      const stream=cipher.update(counterBlocks.subarray(0,length));try{if(stream.length!==length)throw new Error('ZIP AES counter block size changed.');const count=Math.min(length,bytes.length-offset);for(let at=0;at<count;at++)output[offset+at]=bytes[offset+at]^stream[at];offset+=count;budget.work(length+count);}finally{stream.fill(0);}
    }
    const final=cipher.final();try{if(final.length!==0)throw new Error('ZIP AES cipher retained unexpected bytes.');}finally{final.fill(0);}budget.check();return output;
  }catch(error){output.fill(0);throw error;}finally{counterBlocks.fill(0);}
}
function mac(ciphertext,key,budget){budget.check();budget.work(ciphertext.length);const hash=createHmac('sha1',key).update(ciphertext).digest();try{budget.check();return Buffer.from(hash.subarray(0,ZIP_AES.macBytes));}finally{hash.fill(0);}}
export function encryptWinZipAES(compressed,{password,operationBudget:sharedBudget}={}){
  input(compressed);const budget=operationBudget({operationBudget:sharedBudget}),salt=randomBytes(ZIP_AES.saltBytes);let key,ciphertext,tag;
  try{key=derive(password,salt,budget,false);ciphertext=counterXor(compressed,key.subarray(0,32),budget);tag=mac(ciphertext,key.subarray(32,64),budget);return Buffer.concat([salt,key.subarray(64,66),ciphertext,tag]);}
  finally{key?.fill(0);ciphertext?.fill(0);tag?.fill(0);salt.fill(0);}
}
export function decryptWinZipAES(packed,{password,operationBudget:sharedBudget}={}){
  input(packed,ZIP_AES.saltBytes+ZIP_AES.verifierBytes+ZIP_AES.macBytes);if(packed.length<28)throw new Error('ZIP AES payload is truncated.');const budget=operationBudget({operationBudget:sharedBudget});let key,tag;
  try{key=derive(password,packed.subarray(0,16),budget,true);const ciphertext=packed.subarray(18,packed.length-10);tag=mac(ciphertext,key.subarray(32,64),budget);const verifierOK=timingSafeEqual(key.subarray(64,66),packed.subarray(16,18)),tagOK=timingSafeEqual(tag,packed.subarray(packed.length-10));if(!verifierOK||!tagOK)throw failure();return counterXor(ciphertext,key.subarray(0,32),budget);}
  finally{key?.fill(0);tag?.fill(0);}
}
