import test from 'node:test';
import assert from 'node:assert/strict';
import { ui, find, gate } from './notebook-trash-review-fixture.mjs';

const lastList = f => f.calls.filter(call => call.action === 'list').at(-1);
test('Search mode starts as Text and Filters sends explicit mode while preserving the unsaved draft', async t => {
  const f = await ui(t), mode = f.byLabel('Search mode'), search = f.byLabel('Search notes');
  assert.equal(mode.value, 'simple'); assert.equal(lastList(f).input.searchMode, 'simple');
  f.type(f.byLabel('Note title'), 'Retain this draft'); f.type(f.byLabel('Markdown note'), 'Body remains unsaved');
  const before = JSON.stringify(f.read()), writes = f.calls.filter(call => call.action === 'save').length;
  mode.value = 'filters'; search.value = 'type:todo -tag:spam'; await mode.onchange();
  assert.equal(lastList(f).input.searchMode, 'filters'); assert.equal(lastList(f).input.search, search.value);
  assert.equal(f.byLabel('Note title').value, 'Retain this draft'); assert.equal(f.byLabel('Markdown note').value, 'Body remains unsaved');
  assert.equal(JSON.stringify(f.read()), before); assert.equal(f.calls.filter(call => call.action === 'save').length, writes);
});

test('unsupported filter reports its error without saving or losing the current draft', async t => {
  const f = await ui(t); f.type(f.byLabel('Note title'), 'Keep draft');
  f.byLabel('Search mode').value = 'filters'; f.byLabel('Search notes').value = 'any:1';
  const before = JSON.stringify(f.read()); await f.click(f.byText('Search'));
  assert.match(find(f.root, node => node.attributes.role === 'status').textContent, /does not yet support any:/);
  assert.equal(f.byLabel('Note title').value, 'Keep draft'); assert.equal(JSON.stringify(f.read()), before);
});

test('held earlier search cannot publish over results from a newer mode and query', async t => {
  const held = gate(); let hold = true;
  const f = await ui(t, async ({ action, input }) => { if (action === 'list' && input.search === 'A note' && hold) { held.enter(); await held.held; } });
  const search = f.byLabel('Search notes'); search.value = 'A note'; const pending = f.click(f.byText('Search')); await held.started;
  f.byLabel('Search mode').value = 'filters'; search.value = 'type:todo'; await f.click(f.byText('Search'));
  assert.ok(find(f.root, node => node.tagName === 'h3' && node.textContent === '0 notes'));
  hold = false; held.release(); await pending;
  assert.equal(lastList(f).input.searchMode, 'filters');
  assert.ok(find(f.root, node => node.tagName === 'h3' && node.textContent === '0 notes'));
  assert.equal(find(f.root, node => node.tagName === 'button' && node.textContent.startsWith('A note ·')), null);
});
