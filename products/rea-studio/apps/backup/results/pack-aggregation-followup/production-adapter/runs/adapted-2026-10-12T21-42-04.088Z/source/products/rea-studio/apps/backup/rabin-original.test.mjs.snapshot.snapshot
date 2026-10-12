import test from 'node:test';
import assert from 'node:assert/strict';
import {compareOriginal} from './rabin-original-compare.mjs';
test('authenticated released restic matches thirty ordered Rabin boundary and plaintext identity cases',async()=>{const result=await compareOriginal();assert.deepEqual(result,{files:30,chunks:126,originalExecutions:30});});
