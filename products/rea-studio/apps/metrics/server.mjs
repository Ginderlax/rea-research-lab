import { randomUUID } from 'node:crypto';

const datasetKey = id => `metrics-dataset-${id}`;
const panelKey = id => `metrics-panel-${id}`;
const alertKey = id => `metrics-alert-${id}`;
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

export async function handle({ action, input = {}, store }) {
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
