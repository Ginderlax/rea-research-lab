function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function select(label, choices = []) { const node = el('select'); node.setAttribute('aria-label', label); for (const [value, text] of choices) { const option = el('option', text); option.value = value; node.append(option); } return node; }
function download(filename, content) { const url = URL.createObjectURL(new Blob([content], { type: 'application/json' })); const link = el('a', 'Download'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function format(value) { return value === null || value === undefined ? '—' : typeof value === 'number' ? String(Number(value.toPrecision(8))) : String(value); }
function resultView(result) {
  const card = el('div', undefined, 'card'), stats = el('div', undefined, 'grid');
  for (const name of ['count', 'sum', 'mean', 'min', 'max', 'median', 'p95', 'sampleStdDev', 'missing']) { const cell = el('div'); cell.append(el('strong', name), el('p', format(result.statistics[name]))); stats.append(cell); }
  card.append(el('p', `${result.rowsMatched} matched rows; ${result.invalidTimes} invalid timestamps excluded.`, 'muted'), stats);
  if (result.points.length) {
    const canvas = el('canvas'); canvas.width = 900; canvas.height = 240; canvas.style.width = '100%'; canvas.setAttribute('aria-label', `${result.aggregate} of ${result.metric}; exact values are in the table below.`); canvas.setAttribute('role', 'img'); card.append(canvas);
    const context = canvas.getContext('2d'), points = result.points.filter(point => typeof point.value === 'number');
    if (context && points.length) {
      const low = Math.min(...points.map(point => point.value)), high = Math.max(...points.map(point => point.value)), range = high - low || 1;
      context.strokeStyle = '#3b82f6'; context.lineWidth = 2; context.beginPath(); points.forEach((point, i) => { const x = 35 + (points.length === 1 ? 0 : i / (points.length - 1)) * 830, y = 205 - ((point.value - low) / range) * 170; if (i === 0) context.moveTo(x, y); else context.lineTo(x, y); }); context.stroke(); context.fillStyle = '#64748b'; context.fillText(format(high), 5, 25); context.fillText(format(low), 5, 220);
    }
    const table = el('table'), header = el('tr'); for (const name of ['Time bucket (UTC)', 'Group', result.aggregate, 'Samples']) header.append(el('th', name)); const thead = el('thead'); thead.append(header); table.append(thead); const tbody = el('tbody');
    for (const point of result.points.slice(0, 500)) { const row = el('tr'); for (const value of [point.time, point.group, point.value, point.samples]) row.append(el('td', format(value))); tbody.append(row); } table.append(tbody); card.append(table);
    if (result.points.length > 500) card.append(el('p', 'Only the first 500 grouped rows are shown in the table.', 'muted'));
  }
  return card;
}
export async function render(root, api) {
  root.replaceChildren(el('h2', 'Local Metrics'), el('p', 'Import CSV, query numeric columns, save dashboard panels and evaluate threshold alerts.', 'muted'));
  const status = el('p', 'Loading…', 'status'); status.setAttribute('role', 'status');
  const importCard = el('div', undefined, 'card'), name = el('input'); name.placeholder = 'Dataset name'; name.setAttribute('aria-label', 'Dataset name');
  const csv = el('textarea'); csv.rows = 6; csv.setAttribute('aria-label', 'CSV data'); csv.placeholder = 'timestamp,service,value\n2026-01-01T00:00:00Z,web,12';
  const file = el('input'); file.type = 'file'; file.accept = '.csv,text/csv'; file.setAttribute('aria-label', 'Choose CSV file'); const importButton = el('button', 'Import CSV', 'button');
  importCard.append(el('h3', 'Import data'), name, file, csv, importButton);
  const queryCard = el('div', undefined, 'card'), fields = el('div', undefined, 'row');
  const datasets = select('Dataset'), metric = select('Metric column'), aggregate = select('Aggregation', ['mean', 'sum', 'count', 'min', 'max', 'median', 'p95', 'first', 'last'].map(value => [value, value]));
  const time = select('Timestamp column'), group = select('Group column'), interval = select('Time interval', [['60', '1 minute'], ['300', '5 minutes'], ['3600', '1 hour'], ['86400', '1 day']]); interval.value = '3600';
  fields.append(datasets, metric, aggregate, time, group, interval);
  const filters = el('textarea'); filters.rows = 2; filters.value = '[]'; filters.setAttribute('aria-label', 'Filters as JSON');
  const range = el('div', undefined, 'row'), from = el('input'), to = el('input'); from.placeholder = 'From: ISO timestamp (optional)'; from.setAttribute('aria-label', 'From time'); to.placeholder = 'To: ISO timestamp (optional)'; to.setAttribute('aria-label', 'To time'); range.append(from, to);
  const buttons = el('div', undefined, 'row'), queryButton = el('button', 'Run query', 'button'), title = el('input'), panelButton = el('button', 'Save panel', 'button'), exportButton = el('button', 'Export data', 'button'); title.placeholder = 'Panel or alert title'; title.setAttribute('aria-label', 'Panel or alert title'); buttons.append(queryButton, title, panelButton, exportButton);
  const alertRow = el('div', undefined, 'row'), operator = select('Alert comparison', [['gt', '>'], ['gte', '≥'], ['lt', '<'], ['lte', '≤'], ['eq', '='], ['ne', '≠']]), threshold = el('input'); threshold.type = 'number'; threshold.step = 'any'; threshold.placeholder = 'Threshold'; threshold.setAttribute('aria-label', 'Alert threshold'); const alertSave = el('button', 'Save alert', 'button'), evaluate = el('button', 'Evaluate alerts now', 'button'); alertRow.append(operator, threshold, alertSave, evaluate);
  queryCard.append(el('h3', 'Query and save'), fields, el('p', 'Filters: [{"column":"service","operator":"eq","value":"web"}]', 'muted'), filters, range, buttons, alertRow);
  const result = el('div'), dashboard = el('div'), alerts = el('div'); root.append(importCard, queryCard, result, dashboard, alerts, status);
  let data = { datasets: [], panels: [], alerts: [] };
  async function run(operation) { try { await operation(); } catch (error) { status.textContent = error.message; } }
  function populate() {
    const selected = data.datasets.find(item => item.id === datasets.value); metric.replaceChildren(); time.replaceChildren(); group.replaceChildren();
    time.append(Object.assign(el('option', 'No time grouping'), { value: '' })); group.append(Object.assign(el('option', 'No category grouping'), { value: '' }));
    for (const column of selected?.columns ?? []) { metric.append(Object.assign(el('option', column.name + (column.numeric ? '' : ' (text)')), { value: column.name })); time.append(Object.assign(el('option', column.name), { value: column.name })); group.append(Object.assign(el('option', column.name), { value: column.name })); }
    const numeric = selected?.columns.find(column => column.numeric); if (numeric) metric.value = numeric.name;
  }
  function options() { return { datasetId: datasets.value, metric: metric.value, aggregate: aggregate.value, timeColumn: time.value, groupColumn: group.value, intervalSeconds: Number(interval.value), filters: JSON.parse(filters.value), from: from.value, to: to.value }; }
  async function refresh() {
    const previous = datasets.value; data = await api('list', {}); datasets.replaceChildren(); for (const item of data.datasets) datasets.append(Object.assign(el('option', `${item.name} (${item.rowCount} rows)`), { value: item.id })); if (data.datasets.some(item => item.id === previous)) datasets.value = previous; populate();
    await showDashboard(); status.textContent = `${data.datasets.length} datasets stored locally.`;
  }
  async function showDashboard() {
    const response = await api('dashboard', {}); dashboard.replaceChildren(el('h3', 'Saved dashboard'));
    if (!response.panels.length) dashboard.append(el('p', 'Save a panel to start your dashboard.', 'muted'));
    for (const panel of response.panels) { const card = el('div', undefined, 'card'), remove = el('button', 'Remove panel', 'button'); card.append(el('h4', panel.title), panel.result ? resultView(panel.result) : el('p', panel.error)); remove.onclick = () => run(async () => { await api('panel-delete', { id: panel.id }); await refresh(); }); card.append(remove); dashboard.append(card); }
  }
  datasets.onchange = populate;
  file.onchange = () => run(async () => { if (!file.files[0]) return; if (file.files[0].size > 5 * 1024 * 1024) throw new Error('CSV file exceeds 5 MiB.'); csv.value = await file.files[0].text(); if (!name.value) name.value = file.files[0].name.replace(/\.csv$/i, ''); });
  importButton.onclick = () => run(async () => { const dataset = await api('ingest', { name: name.value, csv: csv.value }); await refresh(); datasets.value = dataset.id; populate(); status.textContent = `Imported ${dataset.rowCount} rows.`; });
  queryButton.onclick = () => run(async () => { const response = await api('query', options()); result.replaceChildren(el('h3', 'Query result'), resultView(response)); status.textContent = 'Query complete.'; });
  panelButton.onclick = () => run(async () => { await api('panel-save', { ...options(), title: title.value }); await showDashboard(); status.textContent = 'Panel saved.'; });
  exportButton.onclick = () => run(async () => { const exported = await api('export', { datasetId: datasets.value }); download(exported.filename, exported.content); status.textContent = 'Dataset export downloaded.'; });
  alertSave.onclick = () => run(async () => { if (threshold.value === '') throw new Error('Enter a threshold.'); await api('alert-save', { ...options(), title: title.value, operator: operator.value, threshold: Number(threshold.value) }); status.textContent = 'Alert saved. Evaluation runs when requested.'; });
  evaluate.onclick = () => run(async () => { const response = await api('alerts-evaluate', {}); alerts.replaceChildren(el('h3', 'On-demand alert evaluation')); for (const item of response.alerts) { const card = el('div', undefined, 'card'), remove = el('button', 'Remove alert', 'button'); card.append(el('strong', `${item.title}: ${item.state}`), el('p', item.error ?? `Value ${format(item.value)} ${item.operator} threshold ${item.threshold}`)); remove.onclick = () => run(async () => { await api('alert-delete', { id: item.id }); card.remove(); }); card.append(remove); alerts.append(card); } status.textContent = `Alerts evaluated at ${response.evaluatedAt}. No notifications are sent.`; });
  await run(refresh);
}
