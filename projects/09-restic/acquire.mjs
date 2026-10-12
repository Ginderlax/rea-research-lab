import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireWindowsRelease } from '../../scripts/acquire-windows-release.mjs';
await acquireWindowsRelease(dirname(fileURLToPath(import.meta.url)));
