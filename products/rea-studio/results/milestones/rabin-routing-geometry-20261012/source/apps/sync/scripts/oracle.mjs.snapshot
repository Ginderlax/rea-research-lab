import * as fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
const execute = promisify(execFile);
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const sourceCommit = 'be8d6044eacb843b74d335db0c5fbe09222031fe';
export async function createOracle(root) {
  const repository = new URL('../../../../../',import.meta.url);
  const zip = await fs.readFile(new URL('projects/10-rclone/artifacts/rclone-v1.75.2-windows-amd64.zip',repository));
  const original = await fs.readFile(new URL('projects/10-rclone/artifacts/unpacked/rclone-v1.75.2-windows-amd64/rclone.exe',repository));
  if (digest(zip) !== '8a9db2bad1dc79a65b3348fd857069598e2aab7cf4d118b77b1df23055aff818' || digest(original) !== '41eab3e118d264920b62c3327966c5ece0dc4dd715ee617d9e30450d8ead95a4') throw Error('Pinned original artifact differs.');
  const executable = path.join(root,'rclone.exe'), config = path.join(root,'synthetic-empty.conf');
  await fs.writeFile(executable,original,{flag:'wx'}); await fs.writeFile(config,'',{flag:'wx'});
  if (digest(await fs.readFile(executable)) !== digest(original)) throw Error('Private original copy differs.');
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('RCLONE_'))); let executions = 0;
  async function run(args) { executions++; return execute(executable,['--config',config,'--ask-password=false','--stats=0','--use-json-log','--log-level','DEBUG',...args],{cwd:root,env:environment,timeout:30000,maxBuffer:4*1024*1024,windowsHide:true}); }
  const version = (await run(['version'])).stdout;
  return {run,version,sourceCommit,zipSHA256:digest(zip),originalSHA256:digest(original),get executions() { return executions; }};
}
export function comparisonFlags(options) {
  const flags = [];
  for (const [key,flag] of [['checksum','checksum'],['sizeOnly','size-only'],['ignoreSize','ignore-size'],['ignoreTimes','ignore-times'],['ignoreExisting','ignore-existing'],['update','update'],['noUpdateModtime','no-update-modtime']]) if (options[key]) flags.push('--'+flag);
  if (options.modifyWindowNs !== undefined) flags.push('--modify-window',options.modifyWindowNs+'ns');
  return flags;
}
export function logs(stderr) { return stderr.trim().split('\n').filter(Boolean).map(text => JSON.parse(text)); }
