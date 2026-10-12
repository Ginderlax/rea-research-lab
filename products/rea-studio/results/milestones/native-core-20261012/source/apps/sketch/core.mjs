const color = /^#[a-fA-F0-9]{6}$/;
function number(value, fallback = 0, limit = 1000000) { if (value === undefined) return fallback; if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) throw new Error('Scene contains an invalid coordinate'); return value; }
export function validateScene(scene) {
  if (!scene || typeof scene.name !== 'string' || !scene.name.trim() || scene.name.length > 120) throw new Error('A scene name is required');
  if (!Array.isArray(scene.shapes) || scene.shapes.length > 2000) throw new Error('Use at most 2,000 shapes');
  const ids = new Set(); const shapes = scene.shapes.map(shape => {
    if (!shape || typeof shape.id !== 'string' || !/^[\w-]{1,80}$/.test(shape.id) || ids.has(shape.id)) throw new Error('Shape identifiers must be unique strings'); ids.add(shape.id);
    if (!['rect', 'ellipse', 'arrow', 'text', 'freedraw'].includes(shape.type)) throw new Error('Unsupported shape type');
    if (!color.test(shape.stroke || '#263238') || shape.fill && shape.fill !== 'none' && !color.test(shape.fill)) throw new Error('Colors must be six-digit hex values or no fill');
    const normalized = { id: shape.id, type: shape.type, x: number(shape.x), y: number(shape.y), w: number(shape.w, 100), h: number(shape.h, 60), stroke: shape.stroke || '#263238', fill: shape.fill || 'none', strokeWidth: number(shape.strokeWidth, 2, 30) };
    if (shape.groupIds !== undefined) { if (!Array.isArray(shape.groupIds) || shape.groupIds.length > 20 || shape.groupIds.some(id => typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id))) throw new Error('Invalid shape groups'); normalized.groupIds = [...shape.groupIds]; }
    if (normalized.strokeWidth < 0.1) throw new Error('Stroke width must be positive');
    if (shape.type !== 'arrow') { if (normalized.w < 0) { normalized.x += normalized.w; normalized.w = -normalized.w; } if (normalized.h < 0) { normalized.y += normalized.h; normalized.h = -normalized.h; } }
    number(normalized.x); number(normalized.y); number(normalized.x + normalized.w); number(normalized.y + normalized.h);
    if (shape.type === 'text') { if (typeof shape.text !== 'string' || shape.text.length > 5000) throw new Error('Text must contain at most 5,000 characters'); normalized.text = shape.text; normalized.fontSize = number(shape.fontSize, 20, 200); if (normalized.fontSize < 6) throw new Error('Font size must be at least six'); }
    if (shape.type === 'freedraw') { if (!Array.isArray(shape.points) || !shape.points.length || shape.points.length > 5000) throw new Error('Freehand strokes need 1–5,000 points'); normalized.points = shape.points.map(point => { if (!Array.isArray(point) || point.length !== 2) throw new Error('Invalid stroke point'); const p = [number(point[0]), number(point[1])]; number(normalized.x + p[0]); number(normalized.y + p[1]); return p; }); }
    if (shape.vendorElement !== undefined) { validateJSON(shape.vendorElement); validateJSON(shape.vendorBaseline); if (shape.vendorElement.id !== shape.id || shape.vendorBaseline?.id !== shape.id || shape.vendorBaseline?.type !== shape.type) throw new Error('Imported shape identifier or baseline mismatch'); normalized.vendorElement = structuredClone(shape.vendorElement); normalized.vendorBaseline = structuredClone(shape.vendorBaseline); }
    return normalized;
  });
  const view = scene.view || {}; const zoom = number(view.zoom, 1, 5); if (zoom < 0.1) throw new Error('Zoom must be 0.1–5');
  const result = { version: 1, name: scene.name, shapes, view: { zoom, x: number(view.x), y: number(view.y) } };
  if (scene.excalidrawDocument !== undefined) {
    validateDocument(scene.excalidrawDocument); result.excalidrawDocument = structuredClone(scene.excalidrawDocument);
    if (!Array.isArray(scene.excalidrawEditableIds) || scene.excalidrawEditableIds.length > 2000 || !Array.isArray(scene.importWarnings) || scene.importWarnings.some(w => typeof w !== 'string' || w.length > 1000)) throw new Error('Invalid imported scene metadata');
    result.excalidrawEditableIds = [...scene.excalidrawEditableIds]; const originals = new Map(scene.excalidrawDocument.elements.map(e => [e.id, e])); const editable = new Set(result.excalidrawEditableIds);
    if (editable.size !== result.excalidrawEditableIds.length || [...editable].some(id => typeof id !== 'string' || !originals.has(id))) throw new Error('Invalid editable element references');
    for (const shape of shapes) if (originals.has(shape.id) && (!editable.has(shape.id) || !shape.vendorElement || JSON.stringify(shape.vendorElement) !== JSON.stringify(originals.get(shape.id)))) throw new Error('Imported element identity is reserved; use a new shape identifier');
    const baseline = scene.excalidrawViewBaseline; if (!baseline || typeof baseline !== 'object') throw new Error('Invalid imported viewport baseline'); number(baseline.x); number(baseline.y); if (number(baseline.zoom, 1, 5) < 0.1) throw new Error('Invalid imported viewport baseline');
    result.excalidrawViewBaseline = structuredClone(baseline); result.importWarnings = [...scene.importWarnings];
  }
  return result;
}
export function bounds(shape) { if (shape.type === 'freedraw') { const xs = shape.points.map(p => shape.x + p[0]), ys = shape.points.map(p => shape.y + p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; } return { x: Math.min(shape.x, shape.x + shape.w), y: Math.min(shape.y, shape.y + shape.h), w: Math.abs(shape.w), h: Math.abs(shape.h) }; }
export function hitShape(shape, x, y, tolerance = 6) {
  const b = bounds(shape);
  if (shape.type === 'freedraw') { const points = shape.points; if (points.length === 1) return Math.hypot(x - shape.x - points[0][0], y - shape.y - points[0][1]) <= tolerance; return points.slice(1).some((point, i) => hitShape({ type: 'arrow', x: shape.x + points[i][0], y: shape.y + points[i][1], w: point[0] - points[i][0], h: point[1] - points[i][1] }, x, y, tolerance)); }
  if (shape.type === 'arrow') { const dx = shape.w, dy = shape.h; const t = Math.max(0, Math.min(1, ((x - shape.x) * dx + (y - shape.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - shape.x - dx * t, y - shape.y - dy * t) <= tolerance; }
  if (shape.type === 'ellipse') { const rx = b.w / 2 + tolerance, ry = b.h / 2 + tolerance; return ((x - b.x - b.w / 2) / rx) ** 2 + ((y - b.y - b.h / 2) / ry) ** 2 <= 1; }
  return x >= b.x - tolerance && x <= b.x + b.w + tolerance && y >= b.y - tolerance && y <= b.y + b.h + tolerance;
}
export function pickShape(shapes, x, y, tolerance) { return [...shapes].reverse().find(shape => hitShape(shape, x, y, tolerance)); }
export class History {
  constructor(limit = 100) { this.limit = limit; this.past = []; this.future = []; }
  checkpoint(scene) { this.past.push(structuredClone(scene)); if (this.past.length > this.limit) this.past.shift(); this.future = []; }
  undo(scene) { if (!this.past.length) return scene; this.future.push(structuredClone(scene)); return this.past.pop(); }
  redo(scene) { if (!this.future.length) return scene; this.past.push(structuredClone(scene)); return this.future.pop(); }
}
export function svg(scene) {
  const { shapes } = validateScene(scene); const boxes = shapes.map(bounds); const padding = 40; const minX = shapes.length ? Math.min(...boxes.map(b => b.x)) - padding : 0; const minY = shapes.length ? Math.min(...boxes.map(b => b.y)) - padding : 0; const width = shapes.length ? Math.max(...boxes.map(b => b.x + b.w)) - minX + padding : 800; const height = shapes.length ? Math.max(...boxes.map(b => b.y + b.h)) - minY + padding : 600;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const elements = shapes.map(shape => {
    const style = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"`;
    if (shape.type === 'rect') return `<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" ${style}/>`;
    if (shape.type === 'ellipse') return `<ellipse cx="${shape.x + shape.w / 2}" cy="${shape.y + shape.h / 2}" rx="${shape.w / 2}" ry="${shape.h / 2}" ${style}/>`;
    if (shape.type === 'freedraw') { if (shape.points.length === 1) return `<circle cx="${shape.x + shape.points[0][0]}" cy="${shape.y + shape.points[0][1]}" r="${shape.strokeWidth / 2}" fill="${shape.stroke}"/>`; return `<polyline points="${shape.points.map(p => `${shape.x + p[0]},${shape.y + p[1]}`).join(' ')}" fill="none" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`; }
    if (shape.type === 'arrow') { const angle = Math.atan2(shape.h, shape.w), endX = shape.x + shape.w, endY = shape.y + shape.h, size = 12; return `<g fill="none" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"><line x1="${shape.x}" y1="${shape.y}" x2="${endX}" y2="${endY}"/><path d="M ${endX - size * Math.cos(angle - 0.45)} ${endY - size * Math.sin(angle - 0.45)} L ${endX} ${endY} L ${endX - size * Math.cos(angle + 0.45)} ${endY - size * Math.sin(angle + 0.45)}"/></g>`; }
    return `<text x="${shape.x}" y="${shape.y}" fill="${shape.stroke}" font-family="sans-serif" font-size="${shape.fontSize}" dominant-baseline="text-before-edge">${shape.text.split('\n').map((line, i) => `<tspan x="${shape.x}" dy="${i ? shape.fontSize * 1.25 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}"><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#ffffff"/>${elements.join('')}</svg>`;
}
function validateJSON(value, depth = 0, budget = { keys: 0 }) {
  if (depth > 30 || ++budget.keys > 100000) throw new Error('Scene metadata is too complex');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('Scene metadata must contain finite numbers'); return; }
  if (typeof value !== 'object') throw new Error('Scene metadata must be JSON data');
  for (const item of Object.values(value)) validateJSON(item, depth + 1, budget);
}
export function validateDocument(document) {
  validateJSON(document); if (new TextEncoder().encode(JSON.stringify(document)).length > 4 * 1024 * 1024) throw new Error('Excalidraw import exceeds the 4 MiB document limit');
  if (!document || document.type !== 'excalidraw' || document.version !== 2 || !Array.isArray(document.elements) || document.elements.length > 2000 || document.appState && (typeof document.appState !== 'object' || Array.isArray(document.appState)) || document.files && (typeof document.files !== 'object' || Array.isArray(document.files))) throw new Error('Use an Excalidraw version 2 scene document');
  const ids = new Set(); for (const element of document.elements) { if (!element || typeof element.id !== 'string' || !/^[\w-]{1,80}$/.test(element.id) || ids.has(element.id) || typeof element.type !== 'string') throw new Error('Invalid or duplicate Excalidraw element identifier'); ids.add(element.id); for (const field of ['x', 'y', 'width', 'height', 'angle']) if (element[field] !== undefined && typeof element[field] !== 'number') throw new Error('Invalid Excalidraw geometry'); if (element.version !== undefined && (!Number.isSafeInteger(element.version) || element.version < 0 || element.version >= Number.MAX_SAFE_INTEGER)) throw new Error('Invalid Excalidraw element version'); }
  return document;
}
function projected(shape) { const { vendorElement, vendorBaseline, ...editable } = shape; return editable; }
function displayColor(value, fallback) { if (color.test(value)) return value; if (/^#[a-f\d]{3}$/i.test(value || '')) return '#' + value.slice(1).split('').map(c => c + c).join(''); return fallback; }
export function importExcalidraw(document, name = 'Imported Excalidraw scene') {
  validateDocument(document); const shapes = [], warnings = [];
  for (const element of document.elements) {
    const type = new Map([['rectangle', 'rect'], ['ellipse', 'ellipse'], ['arrow', 'arrow'], ['text', 'text'], ['freedraw', 'freedraw']]).get(element.type);
    if (element.isDeleted) continue;
    if (!type || element.angle || element.locked || type === 'arrow' && (element.elbowed || element.startBinding || element.endBinding || !Array.isArray(element.points) || element.points.length !== 2) || type === 'text' && (element.containerId || element.autoResize === false)) { warnings.push(`${element.id}: ${element.type} preserved without editable rendering`); continue; }
    try {
    const shape = { id: element.id, type, x: element.x ?? 0, y: element.y ?? 0, w: element.width ?? 100, h: element.height ?? 60, stroke: displayColor(element.strokeColor, '#263238'), fill: displayColor(element.backgroundColor, 'none'), strokeWidth: element.strokeWidth ?? 2, groupIds: [...(element.groupIds || [])] };
    if (type === 'arrow') { shape.x += element.points[0][0]; shape.y += element.points[0][1]; shape.w = element.points[1][0] - element.points[0][0]; shape.h = element.points[1][1] - element.points[0][1]; }
    if (type === 'text') { shape.text = element.text ?? ''; shape.fontSize = element.fontSize ?? 20; }
    if (type === 'freedraw') shape.points = structuredClone(element.points);
    const safe = validateScene({ name, shapes: [shape] }).shapes[0]; safe.vendorElement = structuredClone(element); safe.vendorBaseline = projected(safe); shapes.push(safe);
    if (element.roughness || element.opacity !== undefined && element.opacity !== 100 || element.fillStyle && element.fillStyle !== 'solid' || element.strokeStyle && element.strokeStyle !== 'solid' || element.roundness || type === 'text' && element.fontFamily !== 2 || type === 'arrow' && (element.startArrowhead || element.endArrowhead !== 'arrow')) warnings.push(`${element.id}: appearance approximated; native appearance metadata retained`);
    if (element.boundElements?.length) warnings.push(`${element.id}: geometry edits do not update its preserved external bindings`);
    } catch (error) { warnings.push(`${element.id}: preserved without editable rendering (${error.message})`); }
  }
  const editableIds = new Set(shapes.map(s => s.id)), renderedGroups = new Set(shapes.flatMap(s => s.groupIds || [])), mixedGroups = new Set();
  for (const element of document.elements) if (!element.isDeleted && !editableIds.has(element.id) && Array.isArray(element.groupIds)) for (const id of element.groupIds) if (renderedGroups.has(id)) mixedGroups.add(id);
  for (const id of mixedGroups) warnings.push(`${id}: group contains preserved non-editable elements; group actions affect editable projections only`);
  const z = document.appState?.zoom?.value ?? 1, zoom = Number.isFinite(z) ? Math.max(0.1, Math.min(5, z)) : 1;
  const scroll = key => typeof document.appState?.[key] === 'number' ? document.appState[key] : 0;
  const view = { zoom, x: Math.max(-1000000, Math.min(1000000, scroll('scrollX') * zoom)), y: Math.max(-1000000, Math.min(1000000, scroll('scrollY') * zoom)) };
  return validateScene({ name, shapes, view, excalidrawDocument: structuredClone(document), excalidrawEditableIds: shapes.map(s => s.id), excalidrawViewBaseline: view, importWarnings: warnings });
}
function newElement(shape) {
  const base = { id: shape.id, type: ({ rect: 'rectangle', ellipse: 'ellipse', arrow: 'arrow', text: 'text', freedraw: 'freedraw' })[shape.type], x: shape.x, y: shape.y, width: Math.abs(shape.w), height: Math.abs(shape.h), angle: 0, strokeColor: shape.stroke, backgroundColor: shape.fill === 'none' ? 'transparent' : shape.fill, fillStyle: 'solid', strokeWidth: shape.strokeWidth, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: shape.groupIds || [], frameId: null, roundness: null, seed: 1, version: 1, versionNonce: 0, index: null, isDeleted: false, boundElements: null, updated: 0, link: null, locked: false };
  if (shape.type === 'text') Object.assign(base, { text: shape.text, originalText: shape.text, fontSize: shape.fontSize, fontFamily: 2, textAlign: 'left', verticalAlign: 'top', containerId: null, autoResize: true, lineHeight: 1.25 });
  if (shape.type === 'arrow') Object.assign(base, { points: [[0, 0], [shape.w, shape.h]], lastCommittedPoint: null, startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: 'arrow', elbowed: false });
  if (shape.type === 'freedraw') { const b = bounds(shape), points = shape.points.length === 1 ? [shape.points[0], shape.points[0]] : shape.points; Object.assign(base, { width: b.w, height: b.h, points: structuredClone(points), pressures: [], simulatePressure: true, lastCommittedPoint: null }); }
  return base;
}
export function exportExcalidraw(input) {
  const scene = validateScene(input); const document = scene.excalidrawDocument ? structuredClone(scene.excalidrawDocument) : { type: 'excalidraw', version: 2, source: 'https://github.com/Ginderlax/rea-research-lab', elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} };
  const shapes = new Map(scene.shapes.map(shape => [shape.id, shape])); const editable = new Set(scene.excalidrawEditableIds || []);
  document.elements = document.elements.map(element => {
    const shape = shapes.get(element.id); if (!shape) return editable.has(element.id) ? { ...element, isDeleted: true, version: (element.version || 0) + 1 } : element;
    shapes.delete(element.id); if (JSON.stringify(projected(shape)) === JSON.stringify(shape.vendorBaseline)) return element;
    const changed = newElement(shape), baseline = shape.vendorBaseline, updated = { ...element, version: (element.version || 0) + 1 };
    const differs = key => JSON.stringify(shape[key]) !== JSON.stringify(baseline[key]);
    if (differs('x')) updated.x = changed.x; if (differs('y')) updated.y = changed.y;
    if (differs('w')) updated.width = changed.width; if (differs('h')) updated.height = changed.height;
    if (differs('groupIds')) updated.groupIds = changed.groupIds;
    if (differs('stroke')) updated.strokeColor = changed.strokeColor; if (differs('fill')) updated.backgroundColor = changed.backgroundColor; if (differs('strokeWidth')) updated.strokeWidth = changed.strokeWidth;
    if (shape.type === 'text') { if (differs('text')) Object.assign(updated, { text: changed.text, originalText: changed.originalText }); if (differs('fontSize')) updated.fontSize = changed.fontSize; }
    if (shape.type === 'arrow' && (differs('w') || differs('h') || differs('x') || differs('y'))) { updated.x = changed.x; updated.y = changed.y; updated.points = changed.points; updated.width = changed.width; updated.height = changed.height; }
    if (shape.type === 'freedraw' && differs('points')) { updated.points = changed.points; const b = bounds(shape); updated.width = b.w; updated.height = b.h; if (updated.pressures?.length && updated.pressures.length !== changed.points.length) { updated.pressures = []; updated.simulatePressure = true; } }
    return updated;
  });
  document.elements.push(...[...shapes.values()].map(newElement));
  if (!scene.excalidrawViewBaseline || JSON.stringify(scene.view) !== JSON.stringify(scene.excalidrawViewBaseline)) document.appState = { ...document.appState, zoom: { ...(document.appState?.zoom || {}), value: scene.view.zoom }, scrollX: scene.view.x / scene.view.zoom, scrollY: scene.view.y / scene.view.zoom };
  validateDocument(document); return document;
}
export function selectGroup(shapes, id) { const shape = shapes.find(s => s.id === id); if (!shape) return []; const group = shape.groupIds?.at(-1); return group ? shapes.filter(s => s.groupIds?.includes(group)).map(s => s.id) : [id]; }
export function groupSelection(scene, ids, groupId) { const selected = scene.shapes.filter(s => ids.includes(s.id)); if (!/^[\w-]{1,80}$/.test(groupId) || selected.length < 2) throw new Error('Select at least two shapes to group'); if (selected.some(s => (s.groupIds?.length || 0) >= 20)) throw new Error('Use at most 20 group levels'); for (const shape of selected) shape.groupIds = [...(shape.groupIds || []), groupId]; }
export function ungroupSelection(scene, ids) { for (const shape of scene.shapes) if (ids.includes(shape.id)) shape.groupIds = (shape.groupIds || []).slice(0, -1); }
export const example = { version: 1, name: 'Architecture sketch', view: { zoom: 1, x: 25, y: 25 }, shapes: [{ id: 'input', type: 'rect', x: 30, y: 90, w: 170, h: 100, fill: '#e0f2fe', stroke: '#0369a1' }, { id: 'process', type: 'ellipse', x: 340, y: 80, w: 180, h: 120, fill: '#ecfccb', stroke: '#4d7c0f' }, { id: 'connect', type: 'arrow', x: 210, y: 140, w: 120, h: 0, stroke: '#334155' }, { id: 'label1', type: 'text', x: 55, y: 125, w: 120, h: 30, text: 'Local input', fontSize: 20, stroke: '#0f172a' }, { id: 'label2', type: 'text', x: 370, y: 125, w: 130, h: 30, text: 'Processing', fontSize: 20, stroke: '#0f172a' }] };
