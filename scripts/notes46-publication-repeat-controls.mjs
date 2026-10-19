// Prospective current46 repeat guards. These consume actual hosted child data;
// fixture clones never replace or rewrite the retained raw child receipts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { projectNotes46CurrentPublicationRepeat } from './notes46-installed-source-view.mjs';

export const notes46PublicationRepeatControlRoster = Object.freeze([
  ['actual-first-child-qualified', 'positive'],
  ['actual-two-child-nine-clock-repeat', 'positive'],
  ['unbranded-view-before-callbacks', 'negative'],
  ['coherently-foreign-source-and-phase', 'negative'],
  ['coherently-foreign-run-and-phase', 'negative'],
  ['undefined-is-not-json', 'negative'],
  ['nan-is-not-json', 'negative'],
  ['infinity-is-not-json', 'negative'],
  ['negative-zero-is-not-lossless-json', 'negative'],
  ['sparse-array-is-not-json', 'negative'],
  ['accessor-rejected-before-getter', 'negative'],
  ['nonenumerable-field-is-not-json', 'negative'],
  ['inverted-named-clock-with-coherent-summary-hash', 'negative'],
  ['unknown-nonclock-field-remains-in-comparison', 'negative'],
  ['wrong-raw-closed-summary-hash', 'negative'],
  ['pending-boundary-with-coherent-summary-hash', 'negative'],
  ['missing-whole-root-integrity-pass-with-coherent-hash', 'negative'],
  ['foreign-disposal-attempt', 'negative']
].map(([name, kind]) => Object.freeze({ name, kind })));

export async function runNotes46PublicationRepeatControls({ first, firstPhase, second, secondPhase, sourceView, emit }) {
  assert.equal(typeof emit, 'function'); const results = [];
  const qualify = (value, phase) => projectNotes46CurrentPublicationRepeat(value, phase, sourceView);
  const hashInput = value => {
    const bytes = Buffer.from(JSON.stringify(value.historicalInputProof));
    value.historicalCleanup.closedSummaryIdentity = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  };
  function run(name, kind, operation) {
    assert.deepEqual(notes46PublicationRepeatControlRoster[results.length], { name, kind });
    operation(); const row = { name, kind, passed: true }; results.push(row); emit('current46-repeat-control', row);
  }
  function reject(name, mutate, message) {
    run(name, 'negative', () => {
      const value = structuredClone(first), phase = structuredClone(firstPhase);
      let mutations = 0; mutate(value, phase, () => mutations++); assert(mutations > 0, 'The named fixture mutation must be applied');
      assert.throws(() => qualify(value, phase), message);
    });
  }
  run('actual-first-child-qualified', 'positive', () => {
    const result = qualify(first, firstPhase); assert.equal(result.namedClockFieldsProjected, 9);
    assert.equal(result.rawClosedSummaryIdentityVerifiedBeforeProjection, true); assert.equal(result.rawReceiptsRewritten, false);
  });
  run('actual-two-child-nine-clock-repeat', 'positive', () => {
    assert(Date.parse(firstPhase.completedAtUtc) <= Date.parse(secondPhase.startedAtUtc));
    assert.deepEqual(qualify(first, firstPhase).stable, qualify(second, secondPhase).stable);
  });
  run('unbranded-view-before-callbacks', 'negative', () => {
    let callbacks = 0;
    const forged = Object.freeze({ recheck() { callbacks++; }, summary() { callbacks++; return sourceView.summary(); } });
    assert.throws(() => projectNotes46CurrentPublicationRepeat(first, firstPhase, forged), /Genuine current46 source-view brand/);
    assert.equal(callbacks, 0);
  });
  reject('coherently-foreign-source-and-phase', (value, phase, hit) => {
    const foreign = phase.sourceCommit === '1'.repeat(40) ? '2'.repeat(40) : '1'.repeat(40);
    phase.sourceCommit = foreign; value.currentWorkflowSourceSHA = foreign;
    value.historicalInputProof.workflowSourceSHA = foreign; value.historicalCleanup.workflowSourceSHA = foreign; hashInput(value); hit();
  }, /Actual owned phase identity sourceCommit/);
  reject('coherently-foreign-run-and-phase', (value, phase, hit) => {
    const foreign = phase.runId === '1' ? '2' : '1'; phase.runId = foreign;
    value.historicalInputProof.workflowRun = foreign; value.historicalCleanup.workflowRun = foreign; hashInput(value); hit();
  }, /Actual owned phase identity runId/);
  reject('undefined-is-not-json', (value, phase, hit) => { value.controlOnlyUnknown = undefined; hit(); }, /JSON primitive required/);
  reject('nan-is-not-json', (value, phase, hit) => { value.controlOnlyUnknown = NaN; hit(); }, /Lossless finite JSON number/);
  reject('infinity-is-not-json', (value, phase, hit) => { value.controlOnlyUnknown = Infinity; hit(); }, /Lossless finite JSON number/);
  reject('negative-zero-is-not-lossless-json', (value, phase, hit) => { value.controlOnlyUnknown = -0; hit(); }, /Lossless finite JSON number/);
  reject('sparse-array-is-not-json', (value, phase, hit) => { value.controlOnlyUnknown = Array(2); value.controlOnlyUnknown[1] = true; hit(); }, /Dense JSON array/);
  run('accessor-rejected-before-getter', 'negative', () => {
    const value = structuredClone(first); let getterCalls = 0;
    Object.defineProperty(value, 'controlOnlyUnknown', { enumerable: true, get() { getterCalls++; return true; } });
    assert.throws(() => qualify(value, structuredClone(firstPhase)), /Repeat input accessors rejected/); assert.equal(getterCalls, 0);
  });
  reject('nonenumerable-field-is-not-json', (value, phase, hit) => {
    Object.defineProperty(value, 'controlOnlyUnknown', { enumerable: false, value: true }); hit();
  }, /Only enumerable JSON members/);
  reject('inverted-named-clock-with-coherent-summary-hash', (value, phase, hit) => {
    value.historicalInputProof.boundaries[0].before.checkedAt = new Date(Date.parse(phase.completedAtUtc) + 1).toISOString(); hashInput(value); hit();
  }, /Nine named observation clocks ordered/);
  run('unknown-nonclock-field-remains-in-comparison', 'negative', () => {
    const value = structuredClone(first); value.controlOnlyUnknown = 'must remain';
    const original = qualify(first, firstPhase), changed = qualify(value, structuredClone(firstPhase));
    assert.equal(changed.stable.controlOnlyUnknown, 'must remain'); assert.throws(() => assert.deepEqual(changed.stable, original.stable));
  });
  reject('wrong-raw-closed-summary-hash', (value, phase, hit) => { value.historicalCleanup.closedSummaryIdentity.sha256 = '0'.repeat(64); hit(); }, /Cleanup binds the exact raw unprojected/);
  reject('pending-boundary-with-coherent-summary-hash', (value, phase, hit) => { value.historicalInputProof.pendingOuterBoundary = true; hashInput(value); hit(); }, assert.AssertionError);
  reject('missing-whole-root-integrity-pass-with-coherent-hash', (value, phase, hit) => { value.historicalInputProof.fullIntegrityPasses = 1; hashInput(value); hit(); }, assert.AssertionError);
  reject('foreign-disposal-attempt', (value, phase, hit) => { value.historicalCleanup.workflowAttempt = phase.runAttempt === '1' ? '2' : '1'; hit(); }, assert.AssertionError);
  assert.equal(results.length, notes46PublicationRepeatControlRoster.length);
  return { schema: 'rea-notes46-current-publication-repeat-controls/v1', status: 'passed', checks: results.length,
    positive: results.filter(row => row.kind === 'positive').length, negative: results.filter(row => row.kind === 'negative').length,
    namedClockFieldsProjected: 9, rawActualReceiptsRewritten: false, original551ControlsChanged: false, results };
}
