import { randomUUID } from 'node:crypto';
import { clone, dashboardModel, parseDashboard, projectDashboard, panelEntries, panelAt, validateGrid, selectVariable, variableValues, interpolate, normalizeFrames, transformFrames, hasPrecisionSensitiveNumbers } from './core.mjs';
import { calculationDefinitions, NullValueMode, reduceField, isReducerID, encodeCalculation, decodeCalculation } from './native-calculations.mjs';

const datasetKey = id => `metrics-dataset-${id}`;
const panelKey = id => `metrics-panel-${id}`;
const alertKey = id => `metrics-alert-${id}`;
const grafanaKey = id => `metrics-grafana-${id}`;
const idPattern = /^[a-f0-9-]{36}$/;
function id(value) { if (typeof value !== 'string' || !idPattern.test(value)) throw new Error('Choose a valid record ID.'); return value; }
function boundedText(value, name, limit = 200) { if (typeof value !== 'string' || value.length > limit || !value.trim()) throw new Error(`${name} must contain 1–${limit} characters.`); return value.trim(); }

/** RFC-4180-style comma-separated text, including multiline quoted fields. */
export function parseCsv(csv) {
  if (typeof csv !== 'string' || Buffer.byteLength(csv) > 5 * 1024 * 1024) throw new Error('CSV must be text no larger than 5 MiB.');
  csv = csv.replace(/^\uFEFF/, '');
  const records = []; let row = [], field = '', quoted = false, afterQuote = false;
  function endField() { row.push(field); field = ''; afterQuote = false; if (row.length > 128) throw new Error('CSV supports at most 128 columns.'); }
  function endRow() { endField(); records.push(row); row = []; if (records.length > 25001) throw new Error('CSV supports at most 25,000 data rows.'); }
  for (let at = 0; at < csv.length; at++) {
    const ch = csv[at];
    if (quoted) { if (ch === '"') { if (csv[at + 1] === '"') { field += '"'; at++; } else { quoted = false; afterQuote = true; } } else field += ch; continue; }
    if (afterQuote && ch !== ',' && ch !== '\n' && ch !== '\r') throw new Error('Unexpected character after a closing CSV quote.');
    if (ch === '"') { if (field) throw new Error('CSV quote must start a field.'); quoted = true; }
    else if (ch === ',') endField();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && csv[at + 1] === '\n') at++; endRow(); }
    else field += ch;
  }
  if (quoted) throw new Error('CSV has an unterminated quoted field.');
  if (field !== '' || row.length || afterQuote) endRow();
  if (!records.length) throw new Error('CSV needs a header row.');
  const headers = records.shift().map(name => name.trim());
  if (headers.some(name => !name || name.length > 128) || new Set(headers).size !== headers.length) throw new Error('Column names must be nonempty, unique and no longer than 128 characters.');
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const rows = records.map((record, at) => {
    if (record.length !== headers.length) throw new Error(`CSV row ${at + 2} has ${record.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(record.map((value, index) => {
      const trimmed = value.trim();
      const converted = trimmed === '' ? null : numeric.test(trimmed) && Number.isFinite(Number(trimmed)) ? Number(trimmed) : value;
      return [headers[index], converted];
    }));
  });
  const columns = headers.map(name => ({ name, numeric: rows.some(row => typeof row[name] === 'number'), missing: rows.filter(row => row[name] === null).length }));
  return { columns, rows };
}

export function statistics(values) {
  const finite = values.filter(value => typeof value === 'number' && Number.isFinite(value));
  const sorted = [...finite].sort((a, b) => a - b);
  let count = 0, mean = 0, m2 = 0, sum = 0, compensation = 0;
  for (const value of finite) {
    count++; const difference = value - mean; mean += difference / count; m2 += difference * (value - mean);
    const adjusted = value - compensation, next = sum + adjusted; compensation = (next - sum) - adjusted; sum = next;
  }
  const median = count ? count % 2 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : null;
  const p95 = count ? sorted[Math.max(0, Math.ceil(count * 0.95) - 1)] : null;
  const result = { count, missing: values.filter(value => value === null || value === undefined).length, nonNumeric: values.length - count - values.filter(value => value === null || value === undefined).length, sum: count ? sum : null, mean: count ? mean : null, min: count ? sorted[0] : null, max: count ? sorted[count - 1] : null, median, p95, first: count ? finite[0] : null, last: count ? finite[count - 1] : null, sampleStdDev: count > 1 ? Math.sqrt(m2 / (count - 1)) : null };
  // JSON has no Infinity/NaN representation: reject overflow rather than silently stringify to null.
  for (const value of Object.values(result)) if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Numeric calculation overflowed; rescale the values.');
  return result;
}

const aggregates = new Set(['mean', 'sum', 'min', 'max', 'count', 'median', 'p95', 'first', 'last']);
const comparators = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => typeof a === 'number' && typeof b === 'number' && a > b, gte: (a, b) => typeof a === 'number' && typeof b === 'number' && a >= b, lt: (a, b) => typeof a === 'number' && typeof b === 'number' && a < b, lte: (a, b) => typeof a === 'number' && typeof b === 'number' && a <= b, contains: (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase().includes(b.toLowerCase()) };
function timestamp(value) {
  if (typeof value !== 'string') return null;
  const parts = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,3})?(?:Z|[+-](\d\d):(\d\d))$/.exec(value);
  if (!parts) return null;
  const [year, month, day, hour, minute, second, offsetHour = 0, offsetMinute = 0] = parts.slice(1).map(part => part === undefined ? undefined : Number(part));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return null;
  const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null;
}
export function query(dataset, options = {}) {
  const names = new Set(dataset.columns.map(column => column.name));
  const metric = options.metric;
  if (!names.has(metric)) throw new Error('Choose an existing metric column.');
  const aggregate = options.aggregate ?? 'mean'; if (!aggregates.has(aggregate)) throw new Error('Unsupported aggregation.');
  const filters = options.filters ?? []; if (!Array.isArray(filters) || filters.length > 10) throw new Error('Use at most 10 filters.');
  for (const filter of filters) if (!filter || !names.has(filter.column) || !Object.hasOwn(comparators, filter.operator)) throw new Error('Invalid filter column or operator.');
  const time = options.timeColumn || null;
  if (time && !names.has(time)) throw new Error('Choose an existing timestamp column.');
  const category = options.groupColumn || null; if (category && !names.has(category)) throw new Error('Choose an existing group column.');
  const seconds = Number(options.intervalSeconds ?? 3600); if (time && (!Number.isInteger(seconds) || seconds < 1 || seconds > 31_536_000)) throw new Error('Interval must be whole seconds from 1 through 31,536,000.');
  const from = options.from ? timestamp(options.from) : null, to = options.to ? timestamp(options.to) : null;
  if ((options.from && from === null) || (options.to && to === null) || (from !== null && to !== null && from > to)) throw new Error('Time range must use ordered ISO timestamps with an explicit timezone.');
  if ((from !== null || to !== null) && !time) throw new Error('Time ranges require a timestamp column.');
  const selected = [], groups = new Map(); let invalidTimes = 0;
  for (const row of dataset.rows) {
    if (!filters.every(filter => comparators[filter.operator](row[filter.column], filter.value))) continue;
    const instant = time ? timestamp(row[time]) : null;
    if (time && instant === null) { invalidTimes++; continue; }
    if ((from !== null && instant < from) || (to !== null && instant > to)) continue;
    selected.push(row);
    const bucket = time ? Math.floor(instant / (seconds * 1000)) * seconds * 1000 : null;
    const group = category ? row[category] : null, key = JSON.stringify([bucket, group]);
    if (!groups.has(key)) groups.set(key, { time: bucket === null ? null : new Date(bucket).toISOString(), group, values: [] });
    groups.get(key).values.push(row[metric]);
  }
  const points = [...groups.values()].map(group => { const stats = statistics(group.values); return { time: group.time, group: group.group, value: stats[aggregate], samples: stats.count }; }).sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')) || String(a.group ?? '').localeCompare(String(b.group ?? '')));
  return { datasetId: dataset.id, metric, aggregate, rowsMatched: selected.length, invalidTimes, statistics: statistics(selected.map(row => row[metric])), points, rows: selected.slice(0, 100), rowsTruncated: selected.length > 100 };
}
function metadata(dataset) { const { rows, ...meta } = dataset; return { ...meta, rowCount: rows.length }; }
async function getDataset(store, value) { const dataset = await store.get(datasetKey(id(value)), null); if (!dataset || dataset.deleted) throw new Error('Dataset does not exist.'); return dataset; }
async function list(store, prefix) { const items = await Promise.all((await store.list(prefix)).map(key => store.get(key, null))); return items.filter(item => item && !item.deleted); }

function validateReducers(reducers, strict = false) {
  if (!Array.isArray(reducers) || reducers.length > 256 || reducers.some(value => typeof value !== 'string' || value.length > 128 || (strict && !isReducerID(value) && !['current', 'avg', 'total'].includes(value)))) throw new Error('Choose at most 256 calculation IDs.');
  return reducers;
}
function calculationField(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Provide a calculation field.');
  if (Buffer.byteLength(JSON.stringify(input)) > 1024 * 1024) throw new Error('Calculation input exceeds 1 MiB.');
  if (!['number', 'time', 'string', 'boolean', 'trace', 'geo', 'enum', 'other', 'frame', 'nestedFrames'].includes(input.type)) throw new Error('Choose a released Grafana field type.');
  const values = decodeCalculation(input.values);
  if (values !== undefined && (!Array.isArray(values) || values.length > 25000 || values.some(value => Array.isArray(value) || (typeof value === 'string' && value.length > 4096)))) throw new Error('Use at most 25,000 primitive samples; text samples allow 4,096 characters.');
  const config = input.config === undefined ? {} : input.config;
  if (!config || typeof config !== 'object' || Array.isArray(config) || Object.keys(config).some(key => key !== 'nullValueMode') || (config.nullValueMode !== undefined && config.nullValueMode !== null && (typeof config.nullValueMode !== 'string' || config.nullValueMode.length > 128))) throw new Error('Use a text null mode, null, or the default null mode.');
  const field = { type: input.type, config, values };
  if (input.state !== undefined) {
    if (!input.state || typeof input.state !== 'object' || Array.isArray(input.state) || Object.keys(input.state).some(key => key !== 'calcs')) throw new Error('Calculation state accepts a calcs cache only.');
    field.state = {};
    if (input.state.calcs !== undefined) {
      const calcs = input.state.calcs;
      if (!calcs || typeof calcs !== 'object' || Array.isArray(calcs) || Object.keys(calcs).length > 256 || Object.keys(calcs).some(key => ['__proto__', 'constructor', 'prototype', 'hasOwnProperty'].includes(key))) throw new Error('Use a plain calculation cache with at most 256 safe keys.');
      field.state.calcs = Object.fromEntries(Object.entries(calcs).map(([key, value]) => [key, decodeCalculation(value)]));
    }
  }
  return field;
}
function nativeReduction(field, reducers) {
  const result = reduceField({ field, reducers });
  return { contract: '@grafana/data@13.2.3/reduceField', result: encodeCalculation(result), state: encodeCalculation(field.state), samples: field.values?.length ?? null, fieldType: field.type, nullValueMode: field.config.nullValueMode === undefined ? NullValueMode.Ignore : field.config.nullValueMode, reducers, encoding: 'special-values-v1' };
}

async function getGrafana(store, value) { const record = await store.get(grafanaKey(id(value)), null); if (!record || record.deleted) throw new Error('Dashboard does not exist.'); return record; }
function grafanaMetadata(record) { const projection = projectDashboard(record.document); return { id: record.id, title: projection.title, format: projection.format, revision: record.revision, modified: record.modified, importedAt: record.importedAt, panelCount: projection.panels.length }; }
function editableGrafana(record, revision) { if (revision !== record.revision) throw new Error('Dashboard changed since it was opened. Reload before editing.'); if (record.precisionSensitive) throw new Error('Dashboard numbers exceed lossless local numeric precision; original JSON is retained without editing.'); const { model } = dashboardModel(record.document); if (!model) throw new Error('V2 dashboard resources are retained without local editing.'); if (model.editable === false) throw new Error('This dashboard has editable=false.'); return model; }
function shortText(value, label, limit = 2000) { if (typeof value !== 'string' || value.length > limit) throw new Error(`${label} must be text up to ${limit} characters.`); return value; }
async function saveGrafana(store, record, changed = true) { if (changed) { record.modified = true; record.revision++; record.updatedAt = new Date().toISOString(); } await store.set(grafanaKey(record.id), record); return grafanaMetadata(record); }
function queryFrames(result, refId) {
  const groups = new Map();
  for (const point of result.points) { const key = JSON.stringify(point.group); if (!groups.has(key)) groups.set(key, { group: point.group, points: [] }); groups.get(key).points.push(point); }
  if (!groups.size) groups.set('null', { group: null, points: [] });
  return [...groups.values()].map(({ group, points }) => {
    const fields = [];
    if (points.some(point => point.time !== null)) fields.push({ name: 'Time', type: 'time', values: points.map(point => point.time === null ? null : Date.parse(point.time)) });
    if (group !== null) fields.push({ name: 'Group', type: 'string', values: points.map(point => point.group) });
    fields.push({ name: result.metric, type: 'number', values: points.map(point => point.value) });
    return { name: `${refId}: ${result.aggregate}${group === null ? '' : ` (${group})`}`, refId, fields, length: points.length };
  });
}
export async function renderGrafanaPanel(store, record, entry) {
  const { model } = dashboardModel(record.document), panel = panelAt(model, entry.path), warnings = [...entry.retained], variables = variableValues(model);
  if (panel.type === 'row') return { kind: 'row', warnings };
  if (panel.type === 'text') {
    const content = panel.options?.content ?? panel.content ?? '', mode = panel.options?.mode ?? panel.mode ?? 'markdown';
    if (!['markdown', 'code'].includes(mode)) warnings.push(`Text mode ${mode} is shown as literal text; HTML and embedded content are not executed.`);
    return { kind: 'text', content: interpolate(content, variables, warnings), sourceContent: content, mode, warnings };
  }
  if (!['table', 'stat', 'timeseries'].includes(panel.type)) return { kind: 'retained', warnings };
  const frames = [];
  try {
    if (panel.snapshotData) frames.push(...normalizeFrames(panel.snapshotData, 'Snapshot data'));
    else {
      const targets = panel.targets ?? [];
      for (const [index, target] of targets.entries()) {
        if (!target || typeof target !== 'object' || Array.isArray(target)) { warnings.push('Non-object target metadata is retained without execution.'); continue; }
        if (target.hide) continue;
        const refId = target.refId ?? String(index), sourceBindings = record.bindings?.[entry.path], binding = sourceBindings && Object.hasOwn(sourceBindings, refId) ? sourceBindings[refId] : undefined;
        if (binding) {
          const options = clone(binding);
          options.filters = (options.filters ?? []).map(filter => ({ ...filter, value: interpolate(filter.value, variables, warnings) }));
          frames.push(...queryFrames(query(await getDataset(store, binding.datasetId), options), refId));
        } else if (Array.isArray(target.data)) frames.push(...normalizeFrames(target.data, `Target ${refId} inline data`).map(frame => ({ ...frame, refId })));
        else warnings.push(`Target ${refId} query and data-source reference are retained; bind a local CSV query to preview data.`);
      }
    }
    const transformed = transformFrames(frames, panel.transformations);
    if (!transformed.length) return { kind: 'retained', warnings: [...warnings, 'No saved inline frames or local query bindings are available.'] };
    if (model.time?.from || model.time?.to) warnings.push('Dashboard time settings are retained. Saved inline frames use their saved range; CSV bindings use their explicit query range.');
    if (panel.timeFrom || panel.timeShift || panel.relativeTime) warnings.push('Panel time overrides are retained without evaluation.');
    let calculations;
    if (panel.type === 'stat') {
      const reducers = validateReducers(panel.options?.reduceOptions?.calcs ?? ['lastNotNull']);
      const work = transformed.reduce((total, frame) => total + frame.fields.filter(field => field.type === 'number').reduce((count, field) => count + field.values.length, 0), 0) * Math.max(1, reducers.length);
      if (work > 4_000_000) throw new Error('Stat calculation preview exceeds 4,000,000 sample/calculation pairs. Reduce fields or calculations; the original dashboard is retained.');
      if (panel.options?.reduceOptions?.values) warnings.push('Stat values mode is retained; local preview shows calculations.');
      for (const reducer of reducers) if (!isReducerID(reducer) && !['current', 'avg', 'total'].includes(reducer)) warnings.push(`Calculation ${reducer} is retained but is not a released built-in reducer.`);
      calculations = transformed.map(frame => ({ name: frame.name ?? frame.refId ?? 'Saved frame', fields: frame.fields.filter(field => field.type === 'number').map(field => {
        if (field.values.some(value => value && typeof value === 'object')) throw new Error('Stat previews require primitive samples; object-valued fields are retained.');
        const result = reduceField({ field: { ...field, state: undefined, config: { ...(panel.fieldConfig?.defaults ?? {}), ...(field.config ?? {}) } }, reducers });
        return { name: field.name, values: encodeCalculation(Object.fromEntries(reducers.map(id => [id, result[id === 'current' ? 'lastNotNull' : id === 'avg' ? 'mean' : id === 'total' ? 'sum' : id]]))) };
      }) }));
    }
    return { kind: panel.type, frames: transformed, warnings, calculations, reducers: panel.type === 'stat' ? panel.options?.reduceOptions?.calcs ?? ['lastNotNull'] : undefined };
  } catch (error) { return { kind: 'retained', warnings: [...warnings, error.message] }; }
}

async function grafanaAction({ action, input, store }) {
  if (action === 'grafana-list') return { dashboards: (await list(store, 'metrics-grafana-')).map(grafanaMetadata) };
  if (action === 'grafana-import' || action === 'grafana-create') {
    const text = action === 'grafana-import' ? input.content : JSON.stringify({ title: boundedText(input.title || 'New dashboard', 'Dashboard title'), uid: randomUUID().replaceAll('-', '').slice(0, 12), schemaVersion: 42, version: 0, editable: true, tags: [], panels: [], templating: { list: [] }, time: { from: 'now-6h', to: 'now' }, timezone: 'browser', annotations: { list: [] }, links: [] }, null, 2);
    const document = parseDashboard(text), record = { id: randomUUID(), document, originalText: text, precisionSensitive: hasPrecisionSensitiveNumbers(text), modified: false, revision: 1, bindings: {}, importedAt: new Date().toISOString() };
    await saveGrafana(store, record, false); return grafanaMetadata(record);
  }
  const record = await getGrafana(store, input.id);
  if (action === 'grafana-export') return { filename: `${grafanaMetadata(record).title.replace(/[^a-z0-9_-]+/gi, '-') || 'dashboard'}.json`, content: record.modified ? JSON.stringify(record.document, null, 2) : record.originalText, unchanged: !record.modified };
  if (action === 'grafana-load') {
    const projection = projectDashboard(record.document);
    if (record.precisionSensitive) { projection.editable = false; projection.warnings.push('Some number tokens exceed lossless local precision. The original JSON is retained unchanged; editing is unavailable.'); }
    return { ...grafanaMetadata(record), ...projection, bindings: record.bindings, panels: await Promise.all(projection.panels.map(async entry => ({ ...entry, preview: await renderGrafanaPanel(store, record, entry) }))) };
  }
  const model = editableGrafana(record, input.revision);
  const beforeDocument = JSON.stringify(record.document);
  if (action === 'grafana-update') {
    const patch = input.patch; if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !['title', 'description', 'tags', 'timezone', 'time'].includes(key))) throw new Error('Unsupported dashboard edit.');
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'title') model.title = boundedText(value, 'Dashboard title');
      else if (key === 'tags') { if (!Array.isArray(value) || value.length > 100 || value.some(tag => typeof tag !== 'string' || tag.length > 200)) throw new Error('Use at most 100 text tags.'); model.tags = clone(value); }
      else if (key === 'time') { if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(field => !['from', 'to'].includes(field))) throw new Error('Time edits allow from and to only.'); model.time = { ...(model.time ?? {}) }; for (const field of Object.keys(value)) model.time[field] = shortText(value[field], 'Time value', 200); }
      else model[key] = shortText(value, key);
    }
  } else if (action === 'grafana-panel-update') {
    const panel = panelAt(model, input.path), patch = input.patch;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !['title', 'description', 'gridPos', 'textContent', 'calculations'].includes(key))) throw new Error('Unsupported panel edit.');
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'gridPos') panel.gridPos = { ...(panel.gridPos ?? {}), ...validateGrid(value) };
      else if (key === 'textContent') { if (panel.type !== 'text') throw new Error('Text content requires a text panel.'); shortText(value, 'Panel content', 100000); if (panel.options) panel.options.content = value; else panel.content = value; }
      else if (key === 'calculations') { if (panel.type !== 'stat') throw new Error('Calculation selection requires a stat panel.'); validateReducers(value, true); if (!value.length || value.length > 124) throw new Error('Choose 1–124 stat calculations.'); panel.options = { ...(panel.options ?? {}), reduceOptions: { ...(panel.options?.reduceOptions ?? {}), calcs: clone(value) } }; }
      else panel[key] = shortText(value, key);
    }
  } else if (action === 'grafana-variable-select') selectVariable(model, input.index, input.value);
  else if (action === 'grafana-variable-add') {
    const name = boundedText(input.name, 'Variable name', 64); if (!/^[A-Za-z_]\w*$/.test(name) || (model.templating?.list ?? []).some(variable => variable.name === name)) throw new Error('Variable name must be unique and use letters, digits and underscores.');
    if (!['textbox', 'constant', 'custom'].includes(input.type)) throw new Error('Choose a custom, constant or textbox variable.');
    const values = input.values; if (!Array.isArray(values) || !values.length || values.length > 500 || values.some(value => typeof value !== 'string' || value.length > 2000)) throw new Error('Provide 1–500 text values.');
    const variable = { name, label: name, type: input.type, hide: input.type === 'constant' ? 2 : 0, query: input.type === 'custom' ? values.join(',') : values[0], current: { text: values[0], value: values[0] }, options: values.map((value, index) => ({ text: value, value, selected: index === 0 })), multi: false, includeAll: false, skipUrlSync: false };
    model.templating ??= {}; model.templating.list ??= []; model.templating.list.push(variable);
  } else if (action === 'grafana-panel-add') {
    if (!['text', 'table', 'stat', 'timeseries', 'row'].includes(input.type)) throw new Error('Choose a supported panel type.');
    model.panels ??= []; if (panelEntries(model).length >= 1000) throw new Error('Dashboard supports at most 1,000 panels.');
    const numeric = panelEntries(model).map(({ panel }) => panel.id).filter(Number.isSafeInteger), newId = Math.max(0, ...numeric) + 1;
    const panel = { id: newId, title: boundedText(input.title || 'New panel', 'Panel title'), type: input.type, gridPos: validateGrid(input.gridPos ?? { x: 0, y: Math.max(0, ...panelEntries(model).map(({ panel }) => (panel.gridPos?.y ?? 0) + (panel.gridPos?.h ?? 0))), w: 12, h: 8 }), targets: [] };
    if (input.type === 'text') panel.options = { mode: 'markdown', content: shortText(input.content ?? '', 'Panel content', 100000) };
    else if (input.type !== 'row') panel.targets = [{ refId: 'A' }];
    if (input.type === 'row') { panel.collapsed = false; panel.panels = []; }
    model.panels.push(panel);
  } else if (action === 'grafana-panel-remove') {
    const oldEntries = panelEntries(model), removing = panelAt(model, input.path), parts = input.path.split('/'), at = Number(parts.pop()), parent = parts.length ? panelAt(model, parts.join('/')).panels : model.panels;
    parent.splice(at, 1);
    const oldBindings = record.bindings; record.bindings = {};
    for (const entry of panelEntries(model)) { const old = oldEntries.find(previous => previous.panel === entry.panel); if (old && oldBindings[old.path]) record.bindings[entry.path] = oldBindings[old.path]; }
    if (!removing) throw new Error('Panel does not exist.');
  } else if (action === 'grafana-bind') {
    const panel = panelAt(model, input.path), refId = shortText(input.refId, 'Query reference', 128);
    if (!(panel.targets ?? []).some(target => (target.refId ?? '') === refId)) throw new Error('Choose an existing target reference.');
    const dataset = await getDataset(store, input.query?.datasetId); query(dataset, input.query);
    record.bindings[input.path] ??= {}; Object.defineProperty(record.bindings[input.path], refId, { value: clone(input.query), enumerable: true, configurable: true, writable: true });
    // Bindings are local sidecar state, so the imported document remains byte-identical.
    record.revision++; await saveGrafana(store, record, false); return grafanaMetadata(record);
  } else throw new Error(`Unknown Grafana action: ${action}`);
  return saveGrafana(store, record, JSON.stringify(record.document) !== beforeDocument);
}

export async function handle({ action, input = {}, store }) {
  if (action === 'native-calculations') return { contract: '@grafana/data@13.2.3/reduceField', calculations: calculationDefinitions, nullValueModes: NullValueMode, maxSamples: 25000, maxInputBytes: 1024 * 1024, types: ['number', 'time', 'string', 'boolean', 'trace', 'geo', 'enum', 'other', 'frame', 'nestedFrames'], encoding: 'special-values-v1' };
  if (action === 'native-reduce') return nativeReduction(calculationField(input.field), validateReducers(input.reducers));
  if (action === 'native-reduce-dataset') {
    const dataset = await getDataset(store, input.datasetId);
    if (!dataset.columns.some(column => column.name === input.metric)) throw new Error('Choose an existing metric column.');
    const filters = input.filters ?? []; if (!Array.isArray(filters) || filters.length > 10 || filters.some(filter => !filter || !dataset.columns.some(column => column.name === filter.column) || !Object.hasOwn(comparators, filter.operator))) throw new Error('Use at most 10 valid filters.');
    const values = dataset.rows.filter(row => filters.every(filter => comparators[filter.operator](row[filter.column], filter.value))).map(row => row[input.metric]);
    return nativeReduction(calculationField({ type: input.type ?? 'number', values, config: input.config }), validateReducers(input.reducers));
  }
  if (action.startsWith('grafana-')) return grafanaAction({ action, input, store });
  if (action === 'ingest') {
    const parsed = parseCsv(input.csv), dataset = { id: randomUUID(), name: boundedText(input.name, 'Dataset name'), createdAt: new Date().toISOString(), ...parsed };
    await store.set(datasetKey(dataset.id), dataset); return metadata(dataset);
  }
  if (action === 'list') return { datasets: (await list(store, 'metrics-dataset-')).map(metadata), panels: await list(store, 'metrics-panel-'), alerts: await list(store, 'metrics-alert-') };
  if (action === 'query') return query(await getDataset(store, input.datasetId), input);
  if (action === 'dataset-delete') { const dataset = await getDataset(store, input.id); await store.set(datasetKey(dataset.id), { ...dataset, deleted: true }); return { deleted: true }; }
  if (action === 'panel-save') {
    const dataset = await getDataset(store, input.datasetId); query(dataset, input);
    const panel = { id: input.id ? id(input.id) : randomUUID(), title: boundedText(input.title, 'Panel title'), datasetId: dataset.id, metric: input.metric, aggregate: input.aggregate ?? 'mean', timeColumn: input.timeColumn ?? '', groupColumn: input.groupColumn ?? '', intervalSeconds: Number(input.intervalSeconds ?? 3600), filters: input.filters ?? [], from: input.from ?? '', to: input.to ?? '' };
    await store.set(panelKey(panel.id), panel); return panel;
  }
  if (action === 'panel-delete' || action === 'alert-delete') { const key = action === 'panel-delete' ? panelKey(id(input.id)) : alertKey(id(input.id)); await store.set(key, { id: input.id, deleted: true }); return { deleted: true }; }
  if (action === 'dashboard') {
    const panels = await list(store, 'metrics-panel-');
    return { panels: await Promise.all(panels.map(async panel => { try { return { ...panel, result: query(await getDataset(store, panel.datasetId), panel) }; } catch (error) { return { ...panel, error: error.message }; } })) };
  }
  if (action === 'alert-save') {
    const dataset = await getDataset(store, input.datasetId); const result = query(dataset, input);
    if (!['gt', 'gte', 'lt', 'lte', 'eq', 'ne'].includes(input.operator) || typeof input.threshold !== 'number' || !Number.isFinite(input.threshold)) throw new Error('Alert requires a numeric threshold and supported comparison.');
    const alert = { id: input.id ? id(input.id) : randomUUID(), title: boundedText(input.title, 'Alert title'), datasetId: dataset.id, metric: input.metric, aggregate: result.aggregate, operator: input.operator, threshold: input.threshold, filters: input.filters ?? [], timeColumn: input.timeColumn ?? '', intervalSeconds: Number(input.intervalSeconds ?? 3600), from: input.from ?? '', to: input.to ?? '' };
    await store.set(alertKey(alert.id), alert); return alert;
  }
  if (action === 'alerts-evaluate') {
    const alerts = await list(store, 'metrics-alert-');
    return { evaluatedAt: new Date().toISOString(), mode: 'on-demand', alerts: await Promise.all(alerts.map(async alert => { try { const result = query(await getDataset(store, alert.datasetId), alert); const value = result.statistics[alert.aggregate]; return { ...alert, value, state: value === null ? 'no-data' : comparators[alert.operator](value, alert.threshold) ? 'firing' : 'normal' }; } catch (error) { return { ...alert, state: 'error', error: error.message }; } })) };
  }
  if (action === 'export') { const dataset = await getDataset(store, input.datasetId); return { filename: `${dataset.name.replace(/[^a-z0-9_-]+/gi, '-') || 'dataset'}.json`, content: JSON.stringify(dataset, null, 2) }; }
  throw new Error(`Unknown metrics action: ${action}`);
}
