import { History, bounds, pickShape, validateScene, selectGroup, groupSelection, ungroupSelection } from './core.mjs';
function el(tag, text, attrs = {}) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; Object.assign(node, attrs); return node; }
function button(label, fn) { const node = el('button', label, { type: 'button', className: 'button' }); node.addEventListener('click', fn); return node; }
export async function render(root, api) {
  root.replaceChildren(); const initial = await api('list', {}); let scenes = initial.scenes, scene = structuredClone(initial.example), savedId = '', selected = new Set(), gesture, space = false, tool = 'select'; const history = new History();
  const status = el('p', 'Draw with a shape tool. Shift-click or drag empty space to select multiple shapes.', { className: 'status', role: 'status' });
  const name = el('input', undefined, { value: scene.name, placeholder: 'Scene name', ariaLabel: 'Scene name' }), picker = el('select', undefined, { ariaLabel: 'Saved scenes' });
  const tools = el('div', undefined, { className: 'row' }), controls = el('div', undefined, { className: 'row' }), actions = el('div', undefined, { className: 'row' });
  const stroke = el('input', undefined, { type: 'color', value: '#263238', title: 'Stroke color' }), fill = el('input', undefined, { type: 'color', value: '#e0f2fe', title: 'Fill color' }), filled = el('input', undefined, { type: 'checkbox', checked: true, title: 'Fill shapes' }), text = el('input', undefined, { value: 'Text label', placeholder: 'Text for new or selected labels' }), zoom = el('span', '100%');
  const canvas = el('canvas', undefined, { tabIndex: 0, ariaLabel: 'Sketch canvas. Draw shapes or freehand; Select moves and resizes; Shift-click selects multiple; space drag pans; wheel zooms.' }); canvas.style.cssText = 'display:block;width:100%;height:560px;border:1px solid #b6c2d1;border-radius:8px;touch-action:none;background:white;'; const context = canvas.getContext('2d');
  const props = el('p', 'No shape selected', { className: 'muted' }), warnings = el('div', undefined, { className: 'card', role: 'note' });
  const info = el('p', 'Canvas keys: Delete removes selection; Ctrl/Cmd+A selects all editable shapes; Ctrl/Cmd+G groups; Ctrl/Cmd+Shift+G ungroups; Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z redoes; Escape cancels; Space+drag pans. Drag empty space for a selection box; Shift adds to selection. Freehand strokes can move, group and change color; their individual points cannot yet be resized or edited.', { className: 'muted' });
  const json = el('textarea', undefined, { rows: 10, ariaLabel: 'Studio scene JSON' }); json.style.width = '100%';
  const nativeFile = el('input', undefined, { type: 'file', accept: '.excalidraw,application/json', ariaLabel: 'Import Excalidraw scene file' });
  async function attempt(fn) { try { await fn(); status.style.color = ''; } catch (error) { status.textContent = error.message; status.style.color = '#b42318'; } }
  function mark(message) { status.textContent = message; }
  function refreshPicker() { picker.replaceChildren(el('option', 'Choose saved scene', { value: '' })); for (const entry of scenes) picker.append(el('option', entry.name, { value: entry.id })); picker.value = savedId; }
  function world(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left - scene.view.x) / scene.view.zoom, y: (event.clientY - rect.top - scene.view.y) / scene.view.zoom, screenX: event.clientX - rect.left, screenY: event.clientY - rect.top }; }
  function selection() { return scene.shapes.filter(shape => selected.has(shape.id)); }
  function single() { const shapes = selection(); return shapes.length === 1 ? shapes[0] : undefined; }
  function selectedProps() {
    const shapes = selection(), shape = single(); props.textContent = shape ? `${shape.type} selected · x ${Math.round(shape.x)}, y ${Math.round(shape.y)}, width ${Math.round(shape.w)}, height ${Math.round(shape.h)}` : shapes.length ? `${shapes.length} editable shapes selected` : 'No shape selected';
    if (shape) { stroke.value = shape.stroke; if (shape.fill !== 'none') fill.value = shape.fill; filled.checked = shape.fill !== 'none'; if (shape.type === 'text') text.value = shape.text; }
  }
  function showWarnings() {
    warnings.replaceChildren(); warnings.hidden = !scene.excalidrawDocument;
    if (!scene.excalidrawDocument) return;
    const total = scene.excalidrawDocument.elements.length; warnings.append(el('strong', `Imported Excalidraw document: ${scene.excalidrawEditableIds.length} of ${total} original elements have editable projections.`), el('p', 'Native .excalidraw export preserves unsupported elements, deleted records, image files and unknown metadata. The canvas and SVG show editable projections only. Native appearance may differ from this geometric preview.', { className: 'muted' }));
    const list = el('ul'); for (const warning of scene.importWarnings) list.append(el('li', warning)); if (list.childElementCount) warnings.append(list);
  }
  function paintShape(shape) {
    context.strokeStyle = shape.stroke; context.fillStyle = shape.fill; context.lineWidth = shape.strokeWidth; context.lineCap = 'round'; context.lineJoin = 'round'; context.beginPath();
    if (shape.type === 'rect') context.rect(shape.x, shape.y, shape.w, shape.h);
    if (shape.type === 'ellipse') { const b = bounds(shape); context.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.max(0.1, b.w / 2), Math.max(0.1, b.h / 2), 0, 0, Math.PI * 2); }
    if (shape.type === 'arrow') { const x = shape.x + shape.w, y = shape.y + shape.h, angle = Math.atan2(shape.h, shape.w); context.moveTo(shape.x, shape.y); context.lineTo(x, y); context.moveTo(x - 12 * Math.cos(angle - 0.45), y - 12 * Math.sin(angle - 0.45)); context.lineTo(x, y); context.lineTo(x - 12 * Math.cos(angle + 0.45), y - 12 * Math.sin(angle + 0.45)); }
    if (shape.type === 'freedraw') { const points = shape.points; context.moveTo(shape.x + points[0][0], shape.y + points[0][1]); for (const point of points.slice(1)) context.lineTo(shape.x + point[0], shape.y + point[1]); if (points.length === 1) { context.arc(shape.x + points[0][0], shape.y + points[0][1], shape.strokeWidth / 2, 0, Math.PI * 2); context.fillStyle = shape.stroke; context.fill(); } }
    if (shape.type === 'text') { context.font = `${shape.fontSize}px sans-serif`; context.textBaseline = 'top'; context.fillStyle = shape.stroke; shape.text.split('\n').forEach((line, i) => context.fillText(line, shape.x, shape.y + i * shape.fontSize * 1.25)); return; }
    if (shape.fill !== 'none' && !['arrow', 'freedraw'].includes(shape.type)) context.fill(); context.stroke();
  }
  function draw() {
    const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, width = Math.max(1, Math.round(rect.width * dpr)), height = Math.max(1, Math.round(rect.height * dpr)); if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, rect.width, rect.height); context.save(); context.translate(scene.view.x, scene.view.y); context.scale(scene.view.zoom, scene.view.zoom);
    for (const shape of scene.shapes) paintShape(shape);
    context.strokeStyle = '#2563eb'; context.lineWidth = 1 / scene.view.zoom; context.setLineDash([5 / scene.view.zoom, 3 / scene.view.zoom]);
    for (const shape of selection()) { const b = bounds(shape); context.strokeRect(b.x - 4 / scene.view.zoom, b.y - 4 / scene.view.zoom, b.w + 8 / scene.view.zoom, b.h + 8 / scene.view.zoom); }
    if (gesture?.mode === 'marquee') { const b = bounds({ x: gesture.point.x, y: gesture.point.y, w: gesture.end.x - gesture.point.x, h: gesture.end.y - gesture.point.y }); context.strokeRect(b.x, b.y, b.w, b.h); }
    context.setLineDash([]); const shape = single(); if (shape && shape.type !== 'freedraw') { const b = bounds(shape), x = shape.type === 'arrow' ? shape.x + shape.w : b.x + b.w, y = shape.type === 'arrow' ? shape.y + shape.h : b.y + b.h; context.fillStyle = '#2563eb'; context.fillRect(x - 5 / scene.view.zoom, y - 5 / scene.view.zoom, 10 / scene.view.zoom, 10 / scene.view.zoom); }
    context.restore(); zoom.textContent = `${Math.round(scene.view.zoom * 100)}%`; selectedProps(); if (!gesture) json.value = JSON.stringify(scene, null, 2);
  }
  function undo() { scene = history.undo(scene); selected.clear(); name.value = scene.name; showWarnings(); draw(); mark('Undo'); }
  function redo() { scene = history.redo(scene); selected.clear(); name.value = scene.name; showWarnings(); draw(); mark('Redo'); }
  function removeSelection() { if (!selected.size) return; history.checkpoint(scene); scene.shapes = scene.shapes.filter(shape => !selected.has(shape.id)); selected.clear(); draw(); mark('Selected shapes removed; native export retains imported deletion records'); }
  function group() { return attempt(() => { if (selected.size < 2) throw new Error('Select at least two editable shapes'); if (selection().some(s => (s.groupIds?.length || 0) >= 20)) throw new Error('Use at most 20 group levels'); history.checkpoint(scene); groupSelection(scene, [...selected], crypto.randomUUID()); draw(); mark('Selection grouped; clicking any member selects the group'); }); }
  function ungroup() { if (!selection().some(s => s.groupIds?.length)) return mark('Select a group first'); history.checkpoint(scene); ungroupSelection(scene, [...selected]); draw(); mark('Outer group removed from selection'); }
  function download(content, type, filename) { const anchor = el('a', '', { href: URL.createObjectURL(new Blob([content], { type })), download: filename }); anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 500); }
  function load(imported, id = '') { scene = imported; savedId = id; selected.clear(); name.value = scene.name; refreshPicker(); showWarnings(); draw(); }
  for (const type of ['select', 'pan', 'rect', 'ellipse', 'arrow', 'text', 'freedraw']) { const label = type === 'rect' ? 'Rectangle' : type === 'freedraw' ? 'Freehand' : type[0].toUpperCase() + type.slice(1); const node = button(label, () => { tool = type; for (const sibling of tools.children) sibling.setAttribute('aria-pressed', String(sibling === node)); canvas.style.cursor = type === 'pan' ? 'grab' : type === 'select' ? 'default' : 'crosshair'; }); node.setAttribute('aria-pressed', String(type === tool)); tools.append(node); }
  const fillLabel = el('label', 'Fill '); fillLabel.append(filled, fill);
  controls.append(el('span', 'Stroke '), stroke, fillLabel, text, button('Apply style/text to selected', () => { if (!selected.size) return mark('Select a shape first'); history.checkpoint(scene); for (const shape of selection()) { shape.stroke = stroke.value; shape.fill = filled.checked && !['arrow', 'text', 'freedraw'].includes(shape.type) ? fill.value : 'none'; if (shape.type === 'text') { shape.text = text.value; context.font = `${shape.fontSize}px sans-serif`; shape.w = Math.max(15, ...shape.text.split('\n').map(line => context.measureText(line).width)); shape.h = Math.max(shape.fontSize * 1.25, shape.text.split('\n').length * shape.fontSize * 1.25); } } draw(); mark('Selection style updated'); }), button('Select all', () => { selected = new Set(scene.shapes.map(s => s.id)); draw(); }), button('Group', group), button('Ungroup', ungroup), button('Undo', undo), button('Redo', redo), button('Delete selected', removeSelection), zoom, button('Reset view', () => { scene.view = { x: 25, y: 25, zoom: 1 }; draw(); }));
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.button !== 1) return; event.preventDefault(); canvas.focus(); canvas.setPointerCapture(event.pointerId); const point = world(event), snapshot = structuredClone(scene);
    if (tool === 'pan' || space || event.button === 1) { gesture = { mode: 'pan', point, view: { ...scene.view }, snapshot }; return; }
    if (tool === 'select') {
      const current = single(), b = current && bounds(current), x = current?.type === 'arrow' ? current.x + current.w : b && b.x + b.w, y = current?.type === 'arrow' ? current.y + current.h : b && b.y + b.h;
      if (current && current.type !== 'freedraw' && !event.shiftKey && Math.hypot(point.x - x, point.y - y) <= 10 / scene.view.zoom) gesture = { mode: 'resize', point, shape: structuredClone(current), snapshot };
      else { const hit = pickShape(scene.shapes, point.x, point.y, 6 / scene.view.zoom); if (hit) { const ids = selectGroup(scene.shapes, hit.id); if (event.shiftKey) { const remove = ids.every(id => selected.has(id)); for (const id of ids) remove ? selected.delete(id) : selected.add(id); } else if (!selected.has(hit.id)) selected = new Set(ids); gesture = selected.has(hit.id) ? { mode: 'move', point, originals: selection().map(s => ({ id: s.id, x: s.x, y: s.y })), snapshot } : undefined; } else { if (!event.shiftKey) selected.clear(); gesture = { mode: 'marquee', point, end: point, initial: new Set(selected), snapshot }; } }
      draw(); return;
    }
    if (scene.shapes.length >= 2000) return mark('Scene is limited to 2,000 editable shapes');
    history.checkpoint(scene); const shape = { id: crypto.randomUUID(), type: tool, x: point.x, y: point.y, w: tool === 'text' ? 130 : 0, h: tool === 'text' ? 25 : 0, stroke: stroke.value, fill: filled.checked && !['arrow', 'text', 'freedraw'].includes(tool) ? fill.value : 'none', strokeWidth: 2 };
    if (tool === 'text') { shape.text = text.value; shape.fontSize = 20; context.font = '20px sans-serif'; shape.w = Math.max(15, ...shape.text.split('\n').map(line => context.measureText(line).width)); shape.h = shape.text.split('\n').length * 25; }
    if (tool === 'freedraw') shape.points = [[0, 0]];
    scene.shapes.push(shape); selected = new Set([shape.id]); gesture = tool === 'text' ? undefined : { mode: tool === 'freedraw' ? 'freedraw' : 'draw', point, snapshot }; draw(); mark('Unsaved drawing');
  });
  canvas.addEventListener('pointermove', event => {
    if (!gesture) return; const point = world(event);
    if (gesture.mode === 'pan') { scene.view.x = gesture.view.x + point.screenX - gesture.point.screenX; scene.view.y = gesture.view.y + point.screenY - gesture.point.screenY; draw(); return; }
    if (gesture.mode === 'marquee') { gesture.end = point; const b = bounds({ x: gesture.point.x, y: gesture.point.y, w: point.x - gesture.point.x, h: point.y - gesture.point.y }); selected = new Set(gesture.initial); for (const shape of scene.shapes) { const other = bounds(shape); if (other.x + other.w >= b.x && other.x <= b.x + b.w && other.y + other.h >= b.y && other.y <= b.y + b.h) for (const id of selectGroup(scene.shapes, shape.id)) selected.add(id); } draw(); return; }
    if (!gesture.changed && !['draw', 'freedraw'].includes(gesture.mode) && Math.hypot(point.x - gesture.point.x, point.y - gesture.point.y) > 0.5) { history.checkpoint(gesture.snapshot); gesture.changed = true; }
    if (gesture.mode === 'move') for (const original of gesture.originals) { const shape = scene.shapes.find(s => s.id === original.id); shape.x = original.x + point.x - gesture.point.x; shape.y = original.y + point.y - gesture.point.y; }
    const shape = single(); if (gesture.mode === 'move') { draw(); return; } if (!shape) return;
    if (gesture.mode === 'resize' || gesture.mode === 'draw') { shape.w = point.x - shape.x; shape.h = point.y - shape.y; }
    if (gesture.mode === 'freedraw' && shape.points.length < 5000) { const p = [point.x - shape.x, point.y - shape.y], last = shape.points.at(-1); if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1 / scene.view.zoom) shape.points.push(p); const b = bounds(shape); shape.w = b.w; shape.h = b.h; }
    draw();
  });
  function finish() {
    if (!gesture) return; const previous = gesture, shape = single();
    if (shape && ['draw', 'resize'].includes(previous.mode)) { if (Math.abs(shape.w) < 3 && Math.abs(shape.h) < 3) { shape.w = 100; shape.h = shape.type === 'arrow' ? 0 : 60; } if (shape.type !== 'arrow') { if (shape.w < 0) { shape.x += shape.w; shape.w = -shape.w; } if (shape.h < 0) { shape.y += shape.h; shape.h = -shape.h; } } }
    gesture = undefined; try { scene = validateScene(scene); draw(); mark(previous.mode === 'marquee' ? `${selected.size} editable shapes selected` : 'Unsaved drawing'); } catch (error) { scene = previous.snapshot; selected.clear(); draw(); mark(`Change rejected: ${error.message}`); }
  }
  canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', () => { if (gesture) { scene = gesture.snapshot; gesture = undefined; selected.clear(); draw(); } });
  canvas.addEventListener('wheel', event => { event.preventDefault(); const p = world(event); scene.view.zoom = Math.max(0.1, Math.min(5, scene.view.zoom * Math.exp(-event.deltaY * 0.001))); scene.view.x = p.screenX - p.x * scene.view.zoom; scene.view.y = p.screenY - p.y * scene.view.zoom; draw(); }, { passive: false });
  canvas.addEventListener('keydown', event => {
    if (event.code === 'Space') { event.preventDefault(); space = true; }
    if (event.key === 'Escape') { if (gesture) scene = gesture.snapshot; gesture = undefined; selected.clear(); draw(); }
    if (event.ctrlKey || event.metaKey) { const key = event.key.toLowerCase(); if (key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); } if (key === 'a') { event.preventDefault(); selected = new Set(scene.shapes.map(s => s.id)); draw(); } if (key === 'g') { event.preventDefault(); event.shiftKey ? ungroup() : group(); } }
    if (['Delete', 'Backspace'].includes(event.key) && selected.size) { event.preventDefault(); removeSelection(); }
  });
  canvas.addEventListener('keyup', event => { if (event.code === 'Space') space = false; }); canvas.addEventListener('blur', () => { space = false; });
  picker.addEventListener('change', () => { const saved = scenes.find(s => s.id === picker.value); if (saved) { history.past = []; history.future = []; load(structuredClone(saved), saved.id); mark('Loaded scene'); } }); name.addEventListener('input', () => { scene.name = name.value; });
  nativeFile.addEventListener('change', () => attempt(async () => { const file = nativeFile.files[0]; if (!file) return; if (file.size > 4 * 1024 * 1024) throw new Error('Excalidraw import exceeds 4 MiB'); const response = await api('importExcalidraw', { document: await file.text(), name: file.name.replace(/\.excalidraw$/i, '').slice(0, 120) || 'Imported Excalidraw scene' }); history.checkpoint(scene); load(response.scene); mark('Native document imported; review preservation warnings, then save'); nativeFile.value = ''; }));
  actions.append(picker, name, button('New scene', () => { history.past = []; history.future = []; load({ version: 1, name: 'Untitled scene', shapes: [], view: { x: 25, y: 25, zoom: 1 } }); }), button('Save', () => attempt(async () => { scene.name = name.value; const response = await api('save', { id: savedId || undefined, scene }); scenes = (await api('list', {})).scenes; load(response.scene, response.scene.id); mark('Scene saved'); })), button('Export SVG', () => attempt(async () => { const response = await api('svg', { scene }); download(response.svg, 'image/svg+xml', 'sketch.svg'); mark(scene.excalidrawDocument ? 'SVG exported: editable projections only; unsupported imported content remains in native export' : 'SVG exported'); })), button('Export Studio JSON', () => download(JSON.stringify(scene, null, 2), 'application/json', 'sketch.json')), button('Export .excalidraw', () => attempt(async () => { const response = await api('exportExcalidraw', { scene }); download(JSON.stringify(response.document, null, 2), 'application/json', 'sketch.excalidraw'); mark('Native Excalidraw version 2 document exported'); })), button('Delete saved scene', () => attempt(async () => { if (!savedId) throw new Error('Choose a saved scene'); if (!confirm('Delete this saved scene?')) return; await api('delete', { id: savedId }); savedId = ''; scenes = (await api('list', {})).scenes; refreshPicker(); mark('Deleted; drawing remains on canvas'); })));
  const nativeControls = el('div', undefined, { className: 'row' }); nativeControls.append(el('label', 'Import .excalidraw file '), nativeFile);
  const advanced = el('details'); advanced.append(el('summary', 'Scene JSON · copy, edit or import'), json, button('Import JSON as new scene', () => attempt(async () => { const data = JSON.parse(json.value), imported = data.type === 'excalidraw' ? (await api('importExcalidraw', { document: data })).scene : validateScene(data); history.checkpoint(scene); load(imported); mark('Imported; save to retain scene'); })));
  root.append(el('h2', 'Sketch · local canvas editor'), status, actions, nativeControls, warnings, tools, controls, canvas, props, info, advanced); refreshPicker(); showWarnings(); const observer = new ResizeObserver(draw); observer.observe(canvas); draw(); return () => observer.disconnect();
}
