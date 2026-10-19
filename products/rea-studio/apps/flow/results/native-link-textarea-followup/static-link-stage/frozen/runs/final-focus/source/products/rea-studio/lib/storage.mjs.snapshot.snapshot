import { promises as fs, lstatSync, realpathSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

function inside(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}

export async function createWorkspace(root) {
  root = resolve(root);
  await fs.mkdir(root, { recursive: true });
  if (lstatSync(root).isSymbolicLink()) throw new Error('Workspace root cannot be a symbolic link');
  const realRoot = realpathSync(root);
  return {
    root,
    resolve(input = '') {
      if (typeof input !== 'string' || input.includes('\0') || input.length > 2048 || isAbsolute(input) || /^[a-z]:/i.test(input) || input.startsWith('\\')) throw new Error('Invalid workspace path');
      const parts = input.replaceAll('\\', '/').split('/').filter(part => part && part !== '.');
      if (parts.some(part => part === '..' || part.includes(':'))) throw new Error('Workspace path traversal is forbidden');
      if (parts.some(part => /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) || /[. ]$/.test(part))) throw new Error('Reserved workspace filename');
      const target = resolve(root, ...parts);
      if (!inside(root, target)) throw new Error('Path is outside the workspace');
      let checked = root;
      for (const part of parts) {
        checked = join(checked, part);
        try {
          if (lstatSync(checked).isSymbolicLink()) throw new Error('Symbolic links are not allowed in this workspace');
          if (!inside(realRoot, realpathSync(checked))) throw new Error('Resolved path is outside the workspace');
        } catch (error) {
          if (error.code === 'ENOENT') break;
          throw error;
        }
      }
      return target;
    }
  };
}

export async function createStore(root) {
  await fs.mkdir(root, { recursive: true });
  const filename = key => {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_.-]{1,120}$/.test(key) || key === '.' || key === '..') throw new Error('Invalid record key');
    return join(root, `${key}.json`);
  };
  return {
    async get(key, fallback = null) {
      try { return JSON.parse(await fs.readFile(filename(key), 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') return structuredClone(fallback); throw error; }
    },
    async set(key, value) {
      const target = filename(key);
      const content = JSON.stringify(value);
      if (Buffer.byteLength(content) > 16 * 1024 * 1024) throw new Error('Record exceeds the development storage limit');
      const temp = `${target}.${randomUUID()}.pending`;
      await fs.writeFile(temp, content, { flag: 'wx', mode: 0o600 });
      try { await fs.rename(temp, target); }
      catch (error) { await fs.rm(temp, { force: true }); throw error; }
      return value;
    },
    async list(prefix = '') {
      return (await fs.readdir(root)).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).filter(key => key.startsWith(prefix)).sort();
    }
  };
}
