import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handle } from './server.mjs';
import { parseDashboard, interpolate } from './core.mjs';
function fixture() { const data = new Map(); const store = { get: async (key, fallback) => structuredClone(data.get(key) ?? fallback), set: async (key, value) => data.set(key, structuredClone(value)), list: async prefix => [...data.keys()].filter(key => key.startsWith(prefix)) }; return { store, call: (action, input) => handle({ action, input, store }) }; }
const source = file => readFile(new URL(`./fixtures/${file}`, import.meta.url), 'utf8');
async function local(call) { return call('grafana-import', { content: await source('local-dashboard.json') }); }
test('three untouched pinned official Grafana fixtures export byte for byte', async () => {
  const { call } = fixture();
  for (const file of ['vendor/original-textbox.json', 'vendor/original-v1-resource.json', 'vendor/original-v2-text.json']) { const content = await source(file), record = await call('grafana-import', { content }); assert.equal((await call('grafana-export', record)).content, content); const opened = await call('grafana-load', record); assert.equal(opened.modified, false); if (file.includes('v2')) { assert.equal(opened.editable, false); assert.equal(opened.panels.length, 0); } else assert.ok(opened.panels.length > 0); }
});
test('original inline query data renders exact text fields while random-walk query remains retained', async () => {
  const { call } = fixture(), record = await call('grafana-import', { content: await source('vendor/original-textbox.json') }), opened = await call('grafana-load', record);
  assert.equal(opened.panels[0].preview.kind, 'table'); assert.deepEqual(opened.panels[0].preview.frames[0].fields[0].values, ['Contains+Plus', 'Contains&Ampersand', 'Contains white space']);
  assert.equal(opened.panels[1].preview.kind, 'retained'); assert.match(opened.panels[1].preview.warnings.join(' '), /data-source reference.*retained/);
});
test('panel geometry edits preserve unknown grid fields and all other document values', async () => {
  const { call } = fixture(), content = await source('local-dashboard.json'), record = await call('grafana-import', { content }), expected = JSON.parse(content);
  await call('grafana-panel-update', { ...record, path: '0', patch: { gridPos: { x: 2, y: 3, w: 20, h: 6 } } }); Object.assign(expected.panels[0].gridPos, { x: 2, y: 3, w: 20, h: 6 });
  assert.deepEqual(JSON.parse((await call('grafana-export', record)).content), expected);
  await assert.rejects(call('grafana-panel-update', { ...record, path: '0', patch: { title: 'Stale edit' } }), /Reload/);
});
test('dashboard metadata updates only supplied fields across API and V1 envelopes', async () => {
  for (const wrapper of ['api', 'v1']) {
    const { call } = fixture(), raw = JSON.parse(await source('local-dashboard.json')), document = wrapper === 'api' ? { dashboard: raw, meta: { folderUid: 'kept' }, overwrite: false } : { apiVersion: 'dashboard.grafana.app/v1', kind: 'Dashboard', metadata: { name: 'keep', resourceVersion: '12' }, spec: raw, status: { arbitrary: true } };
    const record = await call('grafana-import', { content: JSON.stringify(document) }); await call('grafana-update', { ...record, patch: { title: 'Renamed', time: { from: 'now-12h' } } }); raw.title = 'Renamed'; raw.time.from = 'now-12h'; assert.deepEqual(JSON.parse((await call('grafana-export', record)).content), document);
  }
});
test('saved frames render, transformations preserve exact ordered values and unsupported types are identified', async () => {
  const { call } = fixture(), record = await local(call), opened = await call('grafana-load', record);
  assert.equal(opened.panels[0].preview.content, 'Saved local data for web.'); assert.equal(opened.panels[0].rawTitle, 'Service $env');
  assert.deepEqual(opened.panels[1].preview.frames[0].fields[1].values, [10, 30, 20]); assert.deepEqual(opened.panels[2].preview.frames[0].fields.map(field => [field.name, field.values]), [['CPU', [10, 90]], ['Service', ['web', 'db']]]);
  assert.equal(opened.panels[3].preview.kind, 'retained'); assert.match(opened.panels[3].preview.warnings.join(' '), /heatmap/);
});
test('custom variable selection updates current/options precisely and rerenders titles and text', async () => {
  const { call } = fixture(), record = await local(call), expected = JSON.parse(await source('local-dashboard.json'));
  await call('grafana-variable-select', { ...record, index: 0, value: 'db' }); const variable = expected.templating.list[0]; variable.current.value = 'db'; variable.current.text = 'db'; variable.options[0].selected = false; variable.options[1].selected = true;
  assert.deepEqual(JSON.parse((await call('grafana-export', record)).content), expected); const opened = await call('grafana-load', record); assert.equal(opened.panels[0].title, 'Service db'); assert.equal(opened.panels[0].preview.content, 'Saved local data for db.');
  await assert.rejects(call('grafana-variable-select', { id: record.id, revision: opened.revision, index: 0, value: 'missing' }), /saved/);
});
test('local CSV bindings filter via saved variables without modifying original remote query or document bytes', async () => {
  const { call } = fixture(), record = await local(call), dataset = await call('ingest', { name: 'Services', csv: 'service,value\nweb,10\nweb,30\ndb,90' });
  const bind = await call('grafana-bind', { ...record, path: '1', refId: 'A', query: { datasetId: dataset.id, metric: 'value', aggregate: 'mean', filters: [{ column: 'service', operator: 'eq', value: '$env' }] } });
  assert.equal((await call('grafana-export', record)).content, await source('local-dashboard.json')); assert.deepEqual((await call('grafana-load', record)).panels[1].preview.frames[0].fields[0].values, [20]);
  await call('grafana-variable-select', { id: record.id, revision: bind.revision, index: 0, value: 'db' }); assert.deepEqual((await call('grafana-load', record)).panels[1].preview.frames[0].fields[0].values, [90]);
  const selected = await call('grafana-load', record); await call('grafana-bind', { id: record.id, revision: selected.revision, path: '1', refId: 'A', query: { datasetId: dataset.id, metric: 'value', aggregate: 'mean', groupColumn: 'service' } }); const grouped = (await call('grafana-load', record)).panels[1].preview.frames; assert.deepEqual(grouped.map(frame => [frame.name, frame.fields.at(-1).values]), [['A: mean (db)', [90]], ['A: mean (web)', [20]]]);
});
test('new panels and three variable kinds produce persisted dashboards with unique panel IDs', async () => {
  const { call } = fixture(); let record = await call('grafana-create', { title: 'Created' });
  for (const type of ['text', 'table', 'stat', 'timeseries', 'row']) record = await call('grafana-panel-add', { ...record, type, title: type });
  for (const type of ['custom', 'textbox', 'constant']) record = await call('grafana-variable-add', { ...record, name: `var_${type}`, type, values: ['one', 'two'] });
  const opened = await call('grafana-load', record); assert.deepEqual(opened.panels.map(panel => panel.id), [1, 2, 3, 4, 5]); assert.equal(opened.variables.length, 3); assert.equal((await call('grafana-list')).dashboards[0].panelCount, 5);
});
test('removing panels remaps local bindings without silently attaching them to a different panel', async () => {
  const { call } = fixture(); let record = await local(call); const dataset = await call('ingest', { name: 'Test', csv: 'value\n99' });
  record = await call('grafana-bind', { ...record, path: '2', refId: 'A', query: { datasetId: dataset.id, metric: 'value' } }); record = await call('grafana-panel-remove', { ...record, path: '1' }); const opened = await call('grafana-load', record); assert.equal(opened.panels[1].id, 3); assert.equal(opened.bindings['1'].A.datasetId, dataset.id); assert.equal(opened.bindings['2'], undefined);
});
test('unsupported transformations and unequal saved frames prevent misleading previews', async () => {
  const { call } = fixture(), document = JSON.parse(await source('local-dashboard.json')); document.panels[1].transformations = [{ id: 'joinByField', options: { byField: 'Time' } }]; document.panels[2].targets[0].data[0].fields[0].values.pop();
  const record = await call('grafana-import', { content: JSON.stringify(document) }), opened = await call('grafana-load', record); assert.equal(opened.panels[1].preview.kind, 'retained'); assert.match(opened.panels[1].preview.warnings.join(' '), /joinByField/); assert.equal(opened.panels[2].preview.kind, 'retained'); assert.match(opened.panels[2].preview.warnings.join(' '), /equal lengths/);
});
test('malformed documents, forbidden edits, grid bounds and read-only dashboards reject without changing data', async () => {
  for (const content of ['[1,2]', '{', '{}', '{"title":"bad","panels":{}}']) assert.throws(() => parseDashboard(content));
  const { call } = fixture(), record = await local(call); await assert.rejects(call('grafana-panel-update', { ...record, path: '0', patch: { gridPos: { x: 20, y: 0, w: 12, h: 5 } } }), /24-column/); await assert.rejects(call('grafana-update', { ...record, patch: { __proto__: null, unsupported: 3 } }), /Unsupported/);
  assert.equal((await call('grafana-export', record)).content, await source('local-dashboard.json'));
  const document = JSON.parse(await source('local-dashboard.json')); document.editable = false; const readonly = await call('grafana-import', { content: JSON.stringify(document) }); await assert.rejects(call('grafana-update', { ...readonly, patch: { title: 'No' } }), /editable=false/);
});
test('variable interpolation retains unrecognized names/formats and supports multi-value raw/CSV', () => {
  const warnings = []; assert.equal(interpolate('$env ${env:csv} ${env:regex} $missing', { env: ['web', 'db'] }, warnings), 'web,db web,db ${env:regex} $missing'); assert.equal(warnings.length, 2);
});
test('no-op edits keep original bytes and numbers beyond lossless local precision force retained-only exchange', async () => {
  const { call } = fixture(), record = await local(call); const saved = await call('grafana-update', { ...record, patch: {} }); assert.equal(saved.revision, record.revision); assert.equal((await call('grafana-export', record)).content, await source('local-dashboard.json'));
  for (const token of ['9007199254740993', '0.123456789012345678901', '1e999', '1e-999']) { const content = `{"title":"Precision","panels":[],"unknownNumber":${token}}`, imported = await call('grafana-import', { content }); assert.equal((await call('grafana-load', imported)).editable, false); await assert.rejects(call('grafana-update', { ...imported, patch: { title: 'Changed' } }), /precision/); assert.equal((await call('grafana-export', imported)).content, content); }
});
