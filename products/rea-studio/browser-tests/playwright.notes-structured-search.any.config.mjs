import assert from 'node:assert/strict';
import path from 'node:path';
import { defineConfig } from '@playwright/test';
assert.equal(process.env.CI, 'true'); assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted');
assert.equal(process.env.GITHUB_JOB, 'draft-recovery-real-chromium');
assert(path.isAbsolute(process.env.REA_BROWSER_EVIDENCE ?? ''));
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: ['notes-draft-recovery.spec.mjs', 'notes-draft-recovery.storage.spec.mjs', 'notes-structured-search-legacy-eight.spec.mjs', 'notes-structured-search.any.spec.mjs', 'notes-structured-search.spec.mjs'],
  forbidOnly: true, fullyParallel: false, workers: 1, retries: 0,
  timeout: 60000, expect: { timeout: 7000 }, globalTimeout: 15 * 60000,
  outputDir: path.join(process.env.REA_BROWSER_EVIDENCE, 'playwright-output'),
  reporter: [['line'], ['json', { outputFile: path.join(process.env.REA_BROWSER_EVIDENCE, 'playwright-results.json') }]],
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } }],
  use: { headless: true, viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1,
    locale: 'en-US', timezoneId: 'UTC', actionTimeout: 7000, navigationTimeout: 15000,
    acceptDownloads: true, screenshot: 'only-on-failure', trace: 'off', video: 'off' }
});
