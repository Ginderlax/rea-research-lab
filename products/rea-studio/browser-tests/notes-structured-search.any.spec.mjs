// Prospective real Chromium ANY regressions. Expected IDs refer only to this
// owned synthetic replacement fixture; original notebook diagnostics are separate.
import { assert, expect, test, field, button, root, list, bounded, identity } from './notes-structured-search.any-fixture.mjs';

const unchanged = async (s, before, draft = null) => {
  await s.settle();
  if (draft) assert.deepEqual(await s.fields(), draft);
  assert.equal(s.saves().length, 0);
  assert.deepEqual(await s.state(), before);
};
const visible = async (s, result) => expect(list(s.page).getByRole('button')).toHaveText(
  result.notes.map(row => row.title + ' · ' + row.notebook + ' · ' + row.tags.join(', ')));

test('ANY first modifier chooses real HTTP union or conjunction and publishes exact visible rows', async ({ studio: s }) => {
  const before = await s.state(), union = [s.seed.plan, s.seed.archived, s.seed.complete];
  for (const [query, expected] of [
    ['any:1 title:Release body:archived', union],
    ['any:0 title:Release body:archived', []],
    ['any:1 any:0 title:Release body:archived', union],
    ['any:0 any:1 title:Release body:archived', []],
    ['-any:1 title:Release body:archived', union],
    ['ANY:1 title:Release body:archived', union],
    ['any:"1" title:Release body:archived', []],
    ['any:2 title:Release body:archived', []],
    ['any:01 title:Release body:archived', []],
    ['any:true title:Release body:archived', []],
  ]) await s.search(query, 'filters', expected);
  s.observations.push({ kind: 'actual-any-first-modifier-and-literal-value-policy', firstModifierWins: true, exactUnquotedOneUsesUnion: true, negatedModifierFlagIgnored: true });
  await unchanged(s, before);
});

test('ANY negative tags restrict only their tagged-note complement and retain independent alternatives', async ({ studio: s }) => {
  const before = await s.state();
  for (const [query, expected] of [
    ['any:0 -tag:spam', [s.seed.plan, s.seed.task, s.seed.complete, s.seed.untagged]],
    ['any:1 -tag:spam', [s.seed.plan, s.seed.task, s.seed.complete]],
    ['any:0 -tag:*', [s.seed.untagged]],
    ['any:1 -tag:*', []],
    ['any:1 -tag:work title:"Untagged memo"', [s.seed.archived, s.seed.untagged]],
  ]) await s.search(query, 'filters', expected);
  s.observations.push({ kind: 'actual-any-tag-complement-universe-discrimination', physicallyUntaggedNote: s.seed.untagged, tagUniverseDoesNotRestrictIndependentTitleAlternative: true });
  await unchanged(s, before);
});

test('ANY type and completion alternatives union only matching active note IDs', async ({ studio: s }) => {
  const before = await s.state();
  for (const [query, expected] of [
    ['any:1 type:note iscompleted:1', [s.seed.plan, s.seed.archived, s.seed.untagged, s.seed.complete]],
    ['any:0 type:note iscompleted:1', []],
    ['any:1 iscompleted:0 iscompleted:1', [s.seed.task, s.seed.complete]],
    ['any:0 iscompleted:0 iscompleted:1', []],
  ]) await s.search(query, 'filters', expected);
  s.observations.push({ kind: 'actual-any-type-completion-union-versus-conjunction', trashedNoteExcluded: s.seed.trash });
  await unchanged(s, before);
});

test('ANY notebook restrictions and empty alternatives enforce the explicit replacement policy', async ({ studio: s }) => {
  const before = await s.state(), lab = [s.seed.plan, s.seed.archived, s.seed.task];
  for (const [query, expected] of [
    ['any:1 notebook:Lab tag:work tag:spam', lab],
    ['any:0 notebook:Lab tag:work', [s.seed.plan, s.seed.task]],
    ['any:1 notebook:Lab -notebook:Child tag:work tag:spam', [s.seed.plan]],
    ['any:1 notebook:Lab', lab],
    ['any:0 notebook:Lab', lab],
    ['any:1 notebook:Missing type:todo', []],
    ['any:1', []],
    ['any:0', [s.seed.plan, s.seed.archived, s.seed.task, s.seed.complete, s.seed.untagged]],
  ]) await s.search(query, 'filters', expected);
  s.observations.push({ kind: 'actual-any-explicit-replacement-notebook-empty-policy', notebookConditionsRemainIndependent: true,
    ordinaryClausesAbsentWithAny1AndNoNotebookReturnsEmpty: true, notebookOnlyUsesSelectedScope: true,
    originalNotebookLaneAMissingFTSOutcomes: 8, originalPlainMirrorDifferencesRemainDiagnostics: ['002', '003', '007', '008'], originalGUIOrFTSParityClaimed: false });
  await unchanged(s, before);
});

test('ANY alternatives cannot escape independent notebook tag type or trash selectors', async ({ studio: s }) => {
  const before = await s.state();
  await s.search('any:1 tag:work tag:spam title:Untagged', 'filters', [s.seed.plan, s.seed.archived, s.seed.task, s.seed.complete, s.seed.untagged]);
  await s.select('Filter notebook', s.seed.child, [s.seed.archived, s.seed.task]);
  await s.select('Filter notebook', '', [s.seed.plan, s.seed.archived, s.seed.task, s.seed.complete, s.seed.untagged]);
  await s.select('Filter tag', 'work', [s.seed.plan, s.seed.task, s.seed.complete]);
  await s.select('Filter tag', '', [s.seed.plan, s.seed.archived, s.seed.task, s.seed.complete, s.seed.untagged]);
  await s.select('Filter note type', 'notes', [s.seed.plan, s.seed.archived, s.seed.untagged]);
  await s.select('Filter note type', 'all', [s.seed.plan, s.seed.archived, s.seed.task, s.seed.complete, s.seed.untagged]);
  await s.select('Show trash', true, [s.seed.trash]);
  await s.select('Filter notebook', s.seed.child, []);
  await s.select('Filter notebook', '', [s.seed.trash]);
  await s.select('Filter note type', 'todos', []);
  await s.select('Filter note type', 'all', [s.seed.trash]);
  await s.select('Filter tag', 'spam', []);
  await s.select('Filter tag', '', [s.seed.trash]);
  await s.select('Show trash', false, [s.seed.plan, s.seed.archived, s.seed.task, s.seed.complete, s.seed.untagged]);
  s.observations.push({ kind: 'actual-any-independent-existing-selectors', notebookTagTypeAndTrashRestrictedActualRows: true });
  await unchanged(s, before);
});

test('ANY search preserves all dirty fields and native recovery copies without implicit Save', async ({ studio: s }) => {
  const draft = await s.draft(), before = await s.state();
  await s.search('any:1 title:Release tag:spam', 'filters', [s.seed.plan, s.seed.archived]);
  await unchanged(s, before, draft);
  await s.search('any:0 title:Release tag:spam', 'filters', []);
  await unchanged(s, before, draft);
  await s.search('any:"1" title:Release body:archived', 'filters', []);
  await unchanged(s, before, draft);
  await s.search('any:1 tag:work tag:spam', 'filters', [s.seed.plan, s.seed.archived, s.seed.task, s.seed.complete]);
  await s.select('Filter notebook', s.seed.child, [s.seed.archived, s.seed.task]);
  await unchanged(s, before, draft);
  await expect.poll(async () => { const row = await s.copy(); return row && { title: row.title, body: row.body, tags: row.tags, notebookId: row.notebookId,
    isTodo: row.isTodo, sourceNoteId: row.sourceNoteId, sourceRevision: row.sourceRevision, pendingSave: row.pendingSave }; }).toEqual({ ...draft, isTodo: true, sourceNoteId: null, sourceRevision: 0, pendingSave: false });
  await expect(root(s.page).getByLabel('Draft recovery status', { exact: true })).toHaveText('Recovery copy saved in this browser.');
  const copyBefore = await s.copy(); await s.settle(); await s.page.reload();
  await expect(button(s.page, 'Refresh recovery copies')).toBeEnabled(); await s.settle();
  await expect(field(s.page, 'Search mode')).toHaveValue('simple'); await expect(field(s.page, 'Search notes')).toHaveValue('');
  assert.deepEqual(await s.copy(), copyBefore);
  await button(s.page, 'Refresh recovery copies').click();
  const recovery = root(s.page).locator('section[aria-label=' + JSON.stringify('Recovery copy: ' + draft.title) + ']');
  await expect(recovery).toBeVisible();
  await expect(recovery.getByLabel('I want a separate note from this recovery copy', { exact: true })).not.toBeChecked();
  await expect(recovery.getByRole('button', { name: 'Recover as new to-do', exact: true })).toBeDisabled();
  s.observations.push({ kind: 'actual-any-native-IndexedDB-raw-unsaved-copy-and-reload', copyBefore, explicitSeparateCopyConsentStillRequired: true, sourceStateUnchanged: true });
  await unchanged(s, before);
});

test('Newer conjunction results and dirty fields survive an older unchanged actual ANY response', async ({ studio: s }) => {
  const draft = await s.draft(), before = await s.state();
  await s.search('title:"Release plan"', 'filters', [s.seed.plan]);
  const query = 'any:1 title:Release body:archived', hold = await s.hold(query, 'filters');
  try {
    await field(s.page, 'Search notes').fill(query); await button(s.page, 'Search').click();
    const old = await bounded(hold.entered, 15000, 'Actual old ANY response was not held');
    assert.deepEqual(old.ids, [s.seed.plan, s.seed.archived, s.seed.complete].sort());
    const expected = { ...draft, body: draft.body + '\nNewer dirty body while actual ANY response waits' };
    await field(s.page, 'Markdown note').fill(expected.body);
    const latest = await s.search('any:0 title:Release body:archived', 'filters', []);
    assert.notDeepEqual(old.ids, latest.notes.map(row => row.id).sort()); assert.deepEqual(await s.fields(), expected);
    hold.release(); await bounded(hold.finished, 7000, 'Old unchanged ANY response was not released'); await s.settle();
    await visible(s, latest); await unchanged(s, before, expected);
    s.observations.push({ kind: 'actual-any-older-response-suppressed-after-newer-conjunction', oldActualBody: old.body, oldIds: old.ids,
      latestIds: latest.notes.map(row => row.id).sort(), handlerMocked: false, responseRewritten: false, dirtyFieldsRetained: true });
  } finally { hold.release(); if (hold.used) await bounded(hold.finished, 7000, 'Owned ANY held route did not finish'); }
});

test('ANY cannot bypass genuine unsupported or malformed400 and valid search recovers the dirty editor', async ({ studio: s }) => {
  const draft = await s.draft(), before = await s.state();
  await s.search('tag:work', 'filters', [s.seed.plan, s.seed.task, s.seed.complete]);
  for (const [query, errorPattern] of [
    ['any:1 resource:image/*', /does not yet support resource:/],
    ['any:1 -type:todo', /can't be negated/],
    ['any:1 iscompleted:true', /must be "1" or "0"/],
  ]) {
    const response = s.page.waitForResponse(row => row.url() === s.url + '/api/notes/list' && row.request().postDataJSON().search === query && row.request().postDataJSON().searchMode === 'filters');
    s.expectedHttpFailures.push({ path: '/api/notes/list', query, status: 400, observed: false });
    await field(s.page, 'Search notes').fill(query); await button(s.page, 'Search').click();
    const actual = await response, bytes = await actual.body(); assert.equal(actual.status(), 400); assert(bytes.length <= 1024 * 1024);
    const payload = JSON.parse(bytes); assert.equal(typeof payload.error, 'string'); assert.match(payload.error, errorPattern);
    await expect(root(s.page).getByRole('status')).toHaveText(payload.error);
    s.observations.push({ kind: 'actual-any400-bound-to-visible-error', query, status: actual.status(), error: payload.error, body: identity(bytes) });
    await unchanged(s, before, draft);
  }
  await s.search('any:1 title:Release tag:spam', 'filters', [s.seed.plan, s.seed.archived]);
  await unchanged(s, before, draft);
});
