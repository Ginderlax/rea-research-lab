import assert from 'node:assert/strict';
import path from 'node:path';
import {defineConfig} from '@playwright/test';
assert.equal(process.platform,'win32');assert.equal(process.arch,'x64');assert.equal(process.version,'v24.16.0');
assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted');
assert(path.isAbsolute(process.env.REA_BROWSER_EVIDENCE??''));assert(path.isAbsolute(process.env.REA_BROWSER_DATA_ROOT??''));
export default defineConfig({
  testDir:import.meta.dirname,testMatch:'sync-webdav-download.spec.mjs',forbidOnly:true,fullyParallel:false,workers:1,retries:0,
  timeout:120000,expect:{timeout:10000},globalTimeout:12*60000,
  outputDir:path.join(process.env.REA_BROWSER_EVIDENCE,'playwright-output'),
  reporter:[['line'],['json',{outputFile:path.join(process.env.REA_BROWSER_EVIDENCE,'playwright-results.json')}]],
  use:{browserName:'chromium',channel:'chromium',headless:true,viewport:{width:1440,height:1100},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',
    actionTimeout:10000,navigationTimeout:15000,acceptDownloads:true,screenshot:'only-on-failure',trace:'off',video:'off'},
});
