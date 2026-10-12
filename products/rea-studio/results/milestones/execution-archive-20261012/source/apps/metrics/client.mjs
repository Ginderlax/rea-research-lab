function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function select(label, choices = []) { const node = el('select'); node.setAttribute('aria-label', label); for (const [value, text] of choices) { const option = el('option', text); option.value = value; node.append(option); } return node; }
function download(filename, content) { const url = URL.createObjectURL(new Blob([content], { type: 'application/json' })); const link = el('a', 'Download'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function format(value) { return value === null || value === undefined ? '—' : typeof value === 'number' ? String(Number(value.toPrecision(8))) : String(value); }
function bounds(values) { let low = Infinity, high = -Infinity; for (const value of values) { low = Math.min(low, value); high = Math.max(high, value); } return [low, high]; }
function labeled(label, input) { const wrapper = el('label', label); wrapper.append(input); return wrapper; }
function input(value, label, type = 'text') { const node = el('input'); node.value = value ?? ''; node.type = type; node.setAttribute('aria-label', label); return node; }
function frameView(preview) {
  const view = el('div');
  if (preview.kind === 'text') { const content = el('pre', preview.content); content.style.maxHeight = 'none'; view.append(content, el('p', `${preview.mode} content shown as literal text.`, 'muted')); }
  if (preview.frames?.length) {
    if (preview.kind === 'timeseries') {
      const canvas = el('canvas'); canvas.width = 900; canvas.height = 250; canvas.style.width = '100%'; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Local saved-frame line chart. Exact values follow in the tables.'); view.append(canvas);
      const context = canvas.getContext('2d'), series = [], colors = ['#b8ed88', '#60a5fa', '#fbbf24', '#f472b6'];
      for (const frame of preview.frames) { const time = frame.fields.find(field => field.type === 'time'); for (const field of frame.fields.filter(field => field.type === 'number')) series.push({ name: `${frame.name ?? frame.refId ?? ''} ${field.name}`, values: field.values, x: time?.values ?? field.values.map((_, index) => index) }); }
      const values = series.flatMap(item => item.values.filter(value => typeof value === 'number' && Number.isFinite(value))), times = series.flatMap(item => item.x.filter(value => typeof value === 'number' && Number.isFinite(value)));
      if (context && values.length && times.length) {
        const [low, high] = bounds(values), [minTime, maxTime] = bounds(times);
        series.forEach((item, index) => { context.strokeStyle = colors[index % colors.length]; context.lineWidth = 2; context.beginPath(); let connected = false; item.values.forEach((value, at) => { const instant = item.x[at]; if (typeof value !== 'number' || !Number.isFinite(value) || typeof instant !== 'number' || !Number.isFinite(instant)) { connected = false; return; } const x = 45 + (instant - minTime) / (maxTime - minTime || 1) * 830, y = 205 - (value - low) / (high - low || 1) * 175; if (connected) context.lineTo(x, y); else context.moveTo(x, y); connected = true; }); context.stroke(); view.append(el('p', item.name, 'muted')); });
        context.fillStyle = '#9eacc0'; context.fillText(format(high), 5, 20); context.fillText(format(low), 5, 220);
      } else view.append(el('p', 'This frame has no numeric time-series data.', 'muted'));
    }
    for (const frame of preview.frames) {
      view.append(el('h4', frame.name ?? frame.refId ?? 'Saved data frame'));
      if (preview.kind === 'stat') {
        const stats = el('div', undefined, 'row');
        for (const field of frame.fields.filter(field => field.type === 'number')) { const value = field.values.findLast(value => typeof value === 'number' && Number.isFinite(value)); const cell = el('div'); cell.append(el('strong', `${field.name}: ${format(value)}`), el('p', 'Last numeric value', 'muted')); stats.append(cell); }
        view.append(stats);
      }
      const table = el('table'), head = el('thead'), headings = el('tr'); for (const field of frame.fields) headings.append(el('th', field.name)); head.append(headings); table.append(head); const body = el('tbody');
      for (let index = 0; index < Math.min(frame.length, 500); index++) { const row = el('tr'); for (const field of frame.fields) { const value = field.values[index]; row.append(el('td', field.type === 'time' && typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8.64e15 ? new Date(value).toISOString() : format(value))); } body.append(row); } table.append(body); const scroll = el('div'); scroll.style.overflowX = 'auto'; scroll.append(table); view.append(scroll);
      if (frame.length > 500) view.append(el('p', `${frame.length} rows; the first 500 are shown.`, 'muted'));
    }
  }
  for (const warning of preview.warnings ?? []) view.append(el('p', warning, 'muted'));
  return view;
}
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
  const result = el('div'), dashboard = el('div'), alerts = el('div'), exchange = el('div', undefined, 'card'); root.append(importCard, queryCard, result, dashboard, exchange, alerts, status);
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
  const json = el('textarea'); json.rows = 6; json.setAttribute('aria-label', 'Grafana dashboard JSON'); json.placeholder = 'Paste exported Grafana dashboard JSON';
  const jsonFile = el('input'); jsonFile.type = 'file'; jsonFile.accept = '.json,application/json'; jsonFile.setAttribute('aria-label', 'Choose Grafana dashboard JSON');
  const imports = el('div', undefined, 'row'), importDashboard = el('button', 'Import Grafana JSON'), createDashboard = el('button', 'Create dashboard'), chooseDashboard = select('Grafana dashboard'), exportDashboard = el('button', 'Export dashboard JSON'), reloadDashboard = el('button', 'Reload dashboard'); imports.append(importDashboard, createDashboard, chooseDashboard, exportDashboard, reloadDashboard);
  const documentView = el('div'); exchange.append(el('h3', 'Grafana dashboard exchange'), el('p', 'Import complete dashboard JSON, preview saved data or bind local CSV queries, edit layout and variables, then export. Queries and unavailable features stay in the exported document.', 'muted'), jsonFile, json, imports, documentView);
  let opened;
  async function refreshExchange(selectedId = chooseDashboard.value) {
    const response = await api('grafana-list', {}); chooseDashboard.replaceChildren();
    for (const item of response.dashboards) chooseDashboard.append(Object.assign(el('option', `${item.title} · ${item.format}`), { value: item.id }));
    if (response.dashboards.some(item => item.id === selectedId)) chooseDashboard.value = selectedId;
    await openDashboard();
  }
  async function mutate(action, fields) { await api(action, { id: opened.id, revision: opened.revision, ...fields }); await refreshExchange(opened.id); }
  async function openDashboard() {
    documentView.replaceChildren(); opened = undefined;
    if (!chooseDashboard.value) { exportDashboard.disabled = true; documentView.append(el('p', 'Import or create a dashboard to begin.', 'muted')); return; }
    opened = await api('grafana-load', { id: chooseDashboard.value }); exportDashboard.disabled = false;
    documentView.append(el('h3', opened.title), el('p', `${opened.format} · revision ${opened.revision} · ${opened.modified ? 'supported fields edited' : 'original JSON exports unchanged'}`, 'muted'));
    for (const warning of opened.warnings) documentView.append(el('p', warning, 'muted'));
    if (!opened.editable) documentView.append(el('p', 'Dashboard retained without editing. Export keeps the imported document.', 'muted'));
    const metadata = el('details'); metadata.append(el('summary', 'Dashboard settings'));
    const newTitle = input(opened.title, 'Dashboard title'), description = input(opened.description, 'Dashboard description'), timeFrom = input(opened.time?.from, 'Dashboard range from'), timeTo = input(opened.time?.to, 'Dashboard range to'), saveMetadata = el('button', 'Save dashboard settings'); saveMetadata.disabled = !opened.editable;
    metadata.append(labeled('Title', newTitle), labeled('Description', description), labeled('Range from (retained setting)', timeFrom), labeled('Range to (retained setting)', timeTo), saveMetadata); saveMetadata.onclick = () => run(() => { const patch = {}; if (newTitle.value !== opened.title) patch.title = newTitle.value; if (description.value !== (opened.description ?? '')) patch.description = description.value; const timePatch = {}; if (timeFrom.value !== (opened.time?.from ?? '')) timePatch.from = timeFrom.value; if (timeTo.value !== (opened.time?.to ?? '')) timePatch.to = timeTo.value; if (Object.keys(timePatch).length) patch.time = timePatch; return mutate('grafana-update', { patch }); }); documentView.append(metadata);
    const variables = el('div', undefined, 'row');
    for (const variable of opened.variables) {
      if (variable.hide === 2 && variable.type !== 'constant') continue;
      let control;
      if (variable.type === 'custom') {
        control = select(`Variable ${variable.name}`); control.multiple = Boolean(variable.multi); const chosen = Array.isArray(variable.current?.value) ? variable.current.value : [variable.current?.value];
        if (variable.includeAll && !(variable.options ?? []).some(option => option.value === '$__all')) control.append(Object.assign(el('option', 'All'), { value: '$__all', selected: chosen.includes('$__all') }));
        for (const option of variable.options ?? []) control.append(Object.assign(el('option', option.text ?? option.value), { value: String(option.value), selected: chosen.includes(option.value) }));
        control.onchange = () => run(() => mutate('grafana-variable-select', { index: variable.index, value: control.multiple ? [...control.selectedOptions].map(option => (variable.options ?? []).find(item => String(item.value) === option.value)?.value ?? option.value) : (variable.options ?? []).find(item => String(item.value) === control.value)?.value ?? control.value }));
      } else { control = input(variable.current?.value ?? variable.query, `Variable ${variable.name}`); control.onchange = () => run(() => mutate('grafana-variable-select', { index: variable.index, value: control.value })); }
      control.disabled = !opened.editable || !variable.locallyEditable; variables.append(labeled(`${variable.label || variable.name} (${variable.type}${variable.locallyEditable ? '' : ', retained'})`, control));
    }
    documentView.append(variables);
    const addVariable = el('details'); addVariable.append(el('summary', 'Add local variable')); const variableName = input('', 'New variable name'), variableType = select('New variable type', [['custom', 'Custom choices'], ['textbox', 'Textbox'], ['constant', 'Constant']]), variableOptions = input('', 'New variable values'), addVariableButton = el('button', 'Add variable'); addVariableButton.disabled = !opened.editable; addVariable.append(labeled('Name', variableName), variableType, labeled('Values (one per comma; custom values cannot contain commas)', variableOptions), addVariableButton); addVariableButton.onclick = () => run(() => mutate('grafana-variable-add', { name: variableName.value, type: variableType.value, values: variableType.value === 'custom' ? variableOptions.value.split(',').map(value => value.trim()) : [variableOptions.value] })); documentView.append(addVariable);
    const grid = el('div'); grid.style.display = 'grid'; grid.style.gridTemplateColumns = 'repeat(24, minmax(0, 1fr))'; grid.style.gridAutoRows = '30px'; grid.style.gap = '8px'; grid.style.marginTop = '20px';
    let nextRow = 0;
    for (const panel of opened.panels) {
      const card = el('section', undefined, 'card'), position = panel.gridPos;
      const valid = ['x', 'y', 'w', 'h'].every(key => Number.isInteger(position[key])) && position.x >= 0 && position.y >= 0 && position.w > 0 && position.w <= 24 && position.x + position.w <= 24 && position.h > 0;
      card.style.gridColumn = valid ? `${position.x + 1} / span ${position.w}` : '1 / span 24'; card.style.gridRow = valid ? `${position.y + 1} / span ${position.h}` : `${nextRow + 1} / span 8`; nextRow = Math.max(nextRow, valid ? position.y + position.h : nextRow + 8); card.style.margin = '0'; card.style.padding = '12px'; card.style.overflow = 'auto'; card.style.minWidth = '0';
      card.append(el('h4', `${panel.title} · ${panel.type ?? 'retained'}`), frameView(panel.preview));
      const details = el('details'); details.append(el('summary', `Edit panel ${panel.id ?? panel.path}`)); const panelTitle = input(panel.rawTitle, `Panel ${panel.path} title`), panelDescription = input(panel.description, `Panel ${panel.path} description`), dimensions = el('div', undefined, 'row'), controls = {};
      for (const key of ['x', 'y', 'w', 'h']) { controls[key] = input(position[key] ?? (key === 'w' ? 12 : key === 'h' ? 8 : 0), `Panel ${panel.path} ${key}`, 'number'); controls[key].style.width = '75px'; dimensions.append(labeled(key, controls[key])); }
      const save = el('button', 'Save panel layout'), remove = el('button', 'Remove panel'); save.disabled = remove.disabled = !opened.editable;
      details.append(labeled('Title', panelTitle), labeled('Description', panelDescription), dimensions);
      let textContent; if (panel.preview.kind === 'text') { textContent = el('textarea'); textContent.value = panel.preview.sourceContent; textContent.setAttribute('aria-label', `Panel ${panel.path} text content`); details.append(textContent); }
      details.append(save, remove); save.onclick = () => run(() => { const patch = {}; if (panelTitle.value !== panel.rawTitle) patch.title = panelTitle.value; if (panelDescription.value !== panel.description) patch.description = panelDescription.value; const gridPos = Object.fromEntries(Object.entries(controls).map(([key, node]) => [key, Number(node.value)])); if (Object.keys(gridPos).some(key => gridPos[key] !== position[key])) patch.gridPos = gridPos; if (textContent && textContent.value !== panel.preview.sourceContent) patch.textContent = textContent.value; return mutate('grafana-panel-update', { path: panel.path, patch }); }); remove.onclick = () => run(() => mutate('grafana-panel-remove', { path: panel.path }));
      if (panel.targets.length && ['table', 'stat', 'timeseries'].includes(panel.type)) { const target = select(`Panel ${panel.path} target`, panel.targets.map((item, index) => [item.refId ?? String(index), item.refId ?? String(index)])), bind = el('button', 'Bind current CSV query'); bind.disabled = !opened.editable; details.append(el('p', 'Use the dataset and query controls above to bind this target locally. Original query JSON remains unchanged.', 'muted'), target, bind); bind.onclick = () => run(() => mutate('grafana-bind', { path: panel.path, refId: target.value, query: options() })); }
      const retainedJson = el('details'); retainedJson.append(el('summary', 'Retained queries, sources and transformations'), el('pre', JSON.stringify({ datasource: panel.datasource, targets: panel.retainedTargets, transformations: panel.transformations }, null, 2))); details.append(retainedJson); card.append(details); grid.append(card);
    }
    documentView.append(grid);
    const addRow = el('div', undefined, 'row'), newPanelTitle = input('', 'New Grafana panel title'), panelType = select('New Grafana panel type', ['text', 'table', 'stat', 'timeseries', 'row'].map(value => [value, value])), addPanel = el('button', 'Add panel'); newPanelTitle.placeholder = 'New panel title'; addPanel.disabled = !opened.editable; addRow.append(newPanelTitle, panelType, addPanel); addPanel.onclick = () => run(() => mutate('grafana-panel-add', { title: newPanelTitle.value, type: panelType.value })); documentView.append(addRow);
  }
  jsonFile.onchange = () => run(async () => { if (!jsonFile.files[0]) return; if (jsonFile.files[0].size > 5 * 1024 * 1024) throw new Error('Dashboard file exceeds 5 MiB.'); json.value = await jsonFile.files[0].text(); });
  importDashboard.onclick = () => run(async () => { const imported = await api('grafana-import', { content: json.value }); await refreshExchange(imported.id); status.textContent = 'Dashboard imported. The complete original JSON is retained.'; });
  createDashboard.onclick = () => run(async () => { const created = await api('grafana-create', { title: 'New dashboard' }); await refreshExchange(created.id); status.textContent = 'Dashboard created.'; });
  chooseDashboard.onchange = () => run(openDashboard); reloadDashboard.onclick = () => run(() => refreshExchange());
  exportDashboard.onclick = () => run(async () => { const exported = await api('grafana-export', { id: opened.id }); download(exported.filename, exported.content); status.textContent = exported.unchanged ? 'Original dashboard JSON downloaded unchanged.' : 'Dashboard JSON downloaded with supported edits.'; });
  datasets.onchange = populate;
  file.onchange = () => run(async () => { if (!file.files[0]) return; if (file.files[0].size > 5 * 1024 * 1024) throw new Error('CSV file exceeds 5 MiB.'); csv.value = await file.files[0].text(); if (!name.value) name.value = file.files[0].name.replace(/\.csv$/i, ''); });
  importButton.onclick = () => run(async () => { const dataset = await api('ingest', { name: name.value, csv: csv.value }); await refresh(); datasets.value = dataset.id; populate(); status.textContent = `Imported ${dataset.rowCount} rows.`; });
  queryButton.onclick = () => run(async () => { const response = await api('query', options()); result.replaceChildren(el('h3', 'Query result'), resultView(response)); status.textContent = 'Query complete.'; });
  panelButton.onclick = () => run(async () => { await api('panel-save', { ...options(), title: title.value }); await showDashboard(); status.textContent = 'Panel saved.'; });
  exportButton.onclick = () => run(async () => { const exported = await api('export', { datasetId: datasets.value }); download(exported.filename, exported.content); status.textContent = 'Dataset export downloaded.'; });
  alertSave.onclick = () => run(async () => { if (threshold.value === '') throw new Error('Enter a threshold.'); await api('alert-save', { ...options(), title: title.value, operator: operator.value, threshold: Number(threshold.value) }); status.textContent = 'Alert saved. Evaluation runs when requested.'; });
  evaluate.onclick = () => run(async () => { const response = await api('alerts-evaluate', {}); alerts.replaceChildren(el('h3', 'On-demand alert evaluation')); for (const item of response.alerts) { const card = el('div', undefined, 'card'), remove = el('button', 'Remove alert', 'button'); card.append(el('strong', `${item.title}: ${item.state}`), el('p', item.error ?? `Value ${format(item.value)} ${item.operator} threshold ${item.threshold}`)); remove.onclick = () => run(async () => { await api('alert-delete', { id: item.id }); card.remove(); }); card.append(remove); alerts.append(card); } status.textContent = `Alerts evaluated at ${response.evaluatedAt}. No notifications are sent.`; });
  await run(async () => { await refresh(); await refreshExchange(); });
}
