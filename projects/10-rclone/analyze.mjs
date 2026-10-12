import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeGoRelease } from '../../scripts/analyze-go-release.mjs';
analyzeGoRelease(dirname(fileURLToPath(import.meta.url)));
