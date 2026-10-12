/** Grafana exchange projections. The complete imported object remains authoritative. */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const clone = value => JSON.parse(JSON.stringify(value));
function decimalIdentity(token) {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(token); if (!match) return token;
  let digits = (match[2] + (match[3] ?? '')).replace(/^0+/, ''), exponent = BigInt(match[4] ?? '0') - BigInt((match[3] ?? '').length);
  if (!digits) return '0';
  const trailing = /0*$/.exec(digits)[0].length; digits = digits.slice(0, digits.length - trailing); exponent += BigInt(trailing);
  return `${match[1]}${digits}e${exponent}`;
}
export function hasPrecisionSensitiveNumbers(text) {
  let sensitive = false;
  JSON.parse(text, (_key, value, context) => { if (typeof value === 'number' && (!Number.isFinite(value) || (context?.source && decimalIdentity(context.source) !== decimalIdentity(String(value))))) sensitive = true; return value; });
  return sensitive;
}
export function dashboardModel(document) {
  if (!object(document)) throw new Error('Dashboard JSON must be an object.');
  if (document.kind === 'Dashboard' && object(document.spec)) {
    if (/\/v2/.test(document.apiVersion ?? '')) return { format: 'V2 resource (retained)', model: null };
    return { format: 'V1 resource', model: document.spec };
  }
  if (object(document.dashboard)) return { format: 'Dashboard API envelope', model: document.dashboard };
  if (typeof document.title === 'string' || Array.isArray(document.panels)) return { format: 'Classic', model: document };
  throw new Error('Expected a Classic dashboard, dashboard API envelope or Dashboard resource.');
}
export function parseDashboard(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > 5 * 1024 * 1024) throw new Error('Dashboard JSON must be text no larger than 5 MiB.');
  let document; try { document = JSON.parse(text); } catch { throw new Error('Dashboard JSON is not valid JSON.'); }
  // Bound object depth/size before recursive projection. Unknown fields are preserved.
  let count = 0; const pending = [[document, 0]];
  while (pending.length) { const [item, depth] = pending.pop(); if (++count > 200000 || depth > 80) throw new Error('Dashboard JSON exceeds the supported structure limits.'); if (item && typeof item === 'object') for (const value of Object.values(item)) pending.push([value, depth + 1]); }
  const { model } = dashboardModel(document);
  if (model) {
    if (model.panels !== undefined && !Array.isArray(model.panels)) throw new Error('Dashboard panels must be an array.');
    if (model.templating?.list !== undefined && !Array.isArray(model.templating.list)) throw new Error('Dashboard variable list must be an array.');
    if ((model.templating?.list?.length ?? 0) > 1000) throw new Error('Dashboard supports at most 1,000 variables.');
    const panels = panelEntries(model); if (panels.length > 1000) throw new Error('Dashboard supports at most 1,000 panels.');
  }
  return document;
}
export function panelEntries(model) {
  const result = [];
  function visit(panels, prefix = '') { for (const [index, panel] of (panels ?? []).entries()) { if (!object(panel)) continue; const path = prefix ? `${prefix}/${index}` : String(index); result.push({ path, panel }); if (Array.isArray(panel.panels)) visit(panel.panels, path); } }
  visit(model.panels); return result;
}
export function panelAt(model, path) {
  if (typeof path !== 'string' || !/^\d+(?:\/\d+)*$/.test(path)) throw new Error('Choose a panel path.');
  let panels = model.panels, panel;
  const indexes = path.split('/').map(Number);
  for (const index of indexes) { panel = panels?.[index]; if (!object(panel)) throw new Error('Panel does not exist.'); panels = panel.panels; }
  return panel;
}
export function validateGrid(value) {
  if (!object(value) || Object.keys(value).some(key => !['x', 'y', 'w', 'h'].includes(key)) || !['x', 'y', 'w', 'h'].every(key => Number.isInteger(value[key]))) throw new Error('Panel grid requires integer x, y, width and height.');
  if (value.x < 0 || value.y < 0 || value.w < 1 || value.w > 24 || value.x + value.w > 24 || value.h < 1 || value.h > 1000 || value.y > 100000) throw new Error('Panel must fit the 24-column grid; height is 1–1,000 units.');
  return value;
}
export function variableValues(model) {
  const values = Object.create(null);
  for (const variable of model?.templating?.list ?? []) if (object(variable) && typeof variable.name === 'string') {
    let value = variable.current?.value;
    if (value === undefined && ['constant', 'textbox'].includes(variable.type)) value = variable.query;
    if (value === '$__all' || (Array.isArray(value) && value.includes('$__all'))) value = variable.allValue || (Array.isArray(variable.options) ? variable.options : []).filter(option => object(option) && option.value !== '$__all').map(option => option.value);
    if (value !== undefined) values[variable.name] = value;
  }
  return values;
}
export function interpolate(value, variables, warnings = []) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\{([A-Za-z_]\w*)(?::([^}]+))?\}|\$([A-Za-z_]\w*)/g, (match, name, format, short) => {
    name ||= short;
    if (!Object.hasOwn(variables, name)) { warnings.push(`Variable ${name} has no saved local value.`); return match; }
    if (format && !['raw', 'csv'].includes(format)) { warnings.push(`Variable format ${format} is retained but not evaluated.`); return match; }
    return Array.isArray(variables[name]) ? variables[name].join(',') : String(variables[name] ?? '');
  });
}
export function projectDashboard(document) {
  const { format, model } = dashboardModel(document), warnings = [];
  if (!model) return { format, title: document.spec?.title ?? document.metadata?.name ?? 'Retained dashboard', editable: false, variables: [], panels: [], warnings: ['V2 elements, layouts and variables are preserved; local rendering and editing require Classic or V1 JSON.'] };
  const variables = variableValues(model);
  if (model.annotations?.list?.length) warnings.push('Annotations are retained; annotation queries and overlays are unavailable.');
  if (model.refresh) warnings.push('Refresh interval is retained; data evaluation is on demand.');
  return { format, title: model.title ?? 'Untitled dashboard', description: model.description ?? '', time: model.time ?? {}, editable: model.editable !== false,
    variables: (model.templating?.list ?? []).map((variable, index) => object(variable) ? ({ ...clone(variable), options: (Array.isArray(variable.options) ? variable.options : []).filter(object), index, locallyEditable: ['custom', 'constant', 'textbox'].includes(variable.type) }) : null).filter(Boolean),
    panels: panelEntries(model).map(({ panel, path }) => {
      const retained = [];
      if (!['text', 'table', 'stat', 'timeseries', 'row'].includes(panel.type)) retained.push(`Panel type ${panel.type ?? '(unspecified)'} is retained without a renderer.`);
      if (panel.repeat) retained.push('Panel repetition is retained without expansion.');
      if (panel.libraryPanel) retained.push('Library-panel reference is retained without retrieval.');
      if (panel.alert) retained.push('Legacy alert definition is retained without evaluation.');
      if (panel.links?.length) retained.push('Panel links are retained without navigation.');
      if (panel.fieldConfig?.overrides?.length) retained.push('Field overrides are retained without evaluation.');
      if (panel.fieldConfig?.defaults && Object.keys(panel.fieldConfig.defaults).length) retained.push('Field units, thresholds, mappings and style settings are retained; this preview uses plain values.');
      if (panel.options && panel.type !== 'text') retained.push('Visualization options are retained; this preview uses the local renderer defaults.');
      if (panel.targets !== undefined && !Array.isArray(panel.targets)) retained.push('Non-array target metadata is retained without execution.');
      if (panel.transformations !== undefined && !Array.isArray(panel.transformations)) retained.push('Non-array transformation metadata is retained without execution.');
      if (panel.type === 'row' || path.includes('/')) retained.push('Row nesting and collapsed state are retained; this preview displays saved panels in the absolute grid.');
      return { path, id: panel.id, type: panel.type, title: interpolate(panel.title ?? 'Untitled panel', variables, retained), rawTitle: panel.title ?? '', description: panel.description ?? '', gridPos: clone(panel.gridPos ?? {}), collapsed: Boolean(panel.collapsed), targets: clone(Array.isArray(panel.targets) ? panel.targets.filter(object) : []), retainedTargets: clone(panel.targets ?? []), datasource: clone(panel.datasource ?? null), transformations: clone(panel.transformations ?? []), retained };
    }), warnings };
}
export function selectVariable(model, index, value) {
  const variable = model.templating?.list?.[index];
  if (!object(variable) || !['custom', 'constant', 'textbox'].includes(variable.type)) throw new Error('Only custom, constant and textbox variables can be edited locally.');
  const selected = Array.isArray(value) ? value : [value];
  if (!selected.length || selected.some(item => typeof item !== 'string' && typeof item !== 'number') || selected.length > 500) throw new Error('Choose one or more variable values.');
  if (!variable.multi && selected.length !== 1) throw new Error('This variable does not allow multiple values.');
  const options = Array.isArray(variable.options) ? variable.options.filter(object) : [];
  if (variable.type === 'custom' && selected.some(item => !options.some(option => option.value === item) && !(item === '$__all' && variable.includeAll))) throw new Error('Choose a saved custom-variable option.');
  const texts = selected.map(item => item === '$__all' ? 'All' : options.find(option => option.value === item)?.text ?? String(item));
  variable.current = { ...(variable.current ?? {}), value: variable.multi ? selected : selected[0], text: variable.multi ? texts : texts[0] };
  if (Array.isArray(variable.options)) for (const option of variable.options.filter(object)) option.selected = selected.includes(option.value);
}
export function normalizeFrames(value, origin) {
  if (!Array.isArray(value)) throw new Error(`${origin} must contain an array of data frames.`);
  return value.map((frame, index) => {
    if (!object(frame) || !Array.isArray(frame.fields) || frame.fields.length > 128) throw new Error(`${origin} frame ${index + 1} requires at most 128 fields.`);
    let length;
    const fields = frame.fields.map(field => {
      if (!object(field) || typeof field.name !== 'string' || !Array.isArray(field.values)) throw new Error('Only saved data-frame fields with values arrays can be rendered.');
      length ??= field.values.length;
      if (field.values.length !== length || length > 25000) throw new Error('Frame fields need equal lengths of at most 25,000 values.');
      return clone(field);
    });
    return { ...clone(frame), fields, length: length ?? 0 };
  });
}
export function transformFrames(frames, transformations) {
  let output = clone(frames);
  for (const transform of transformations ?? []) {
    if (transform.disabled) continue;
    if (transform.filter || transform.topic) throw new Error(`Transformation ${transform.id} scoped filtering is retained without execution.`);
    const options = transform.options ?? {};
    if (transform.id === 'filterFieldsByName') {
      if (Object.keys(options).some(key => !['include', 'exclude'].includes(key)) || (options.include && !Array.isArray(options.include.names)) || (options.exclude && !Array.isArray(options.exclude.names))) throw new Error('Only explicit field-name inclusion/exclusion is supported.');
      output = output.map(frame => ({ ...frame, fields: frame.fields.filter(field => (!options.include || options.include.names.includes(field.name)) && (!options.exclude || !options.exclude.names.includes(field.name))) }));
    } else if (transform.id === 'organize') {
      if (output.length !== 1) throw new Error('Organize fields requires exactly one frame.');
      if (Object.keys(options).some(key => !['excludeByName', 'indexByName', 'renameByName', 'includeByName'].includes(key))) throw new Error('Organize options are retained without execution.');
      output[0].fields = output[0].fields.filter(field => !options.excludeByName?.[field.name] && (!options.includeByName || options.includeByName[field.name] !== false))
        .map((field, index) => ({ field, index })).sort((a, b) => (options.indexByName?.[a.field.name] ?? a.index) - (options.indexByName?.[b.field.name] ?? b.index))
        .map(({ field }) => ({ ...field, name: options.renameByName?.[field.name] ?? field.name }));
    } else throw new Error(`Transformation ${transform.id ?? '(unspecified)'} is retained without execution.`);
  }
  return output;
}
