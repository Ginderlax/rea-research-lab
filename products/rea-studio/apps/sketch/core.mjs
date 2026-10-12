const color = /^#[a-fA-F0-9]{6}$/;
function number(value, fallback = 0, limit = 1000000) { if (value === undefined) return fallback; if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) throw new Error('Scene contains an invalid coordinate'); return value; }
export function validateScene(scene) {
  if (!scene || typeof scene.name !== 'string' || !scene.name.trim() || scene.name.length > 120) throw new Error('A scene name is required');
  if (!Array.isArray(scene.shapes) || scene.shapes.length > 2000) throw new Error('Use at most 2,000 shapes');
  const ids = new Set(); const shapes = scene.shapes.map(shape => {
    if (!shape || !/^[\w-]{1,80}$/.test(shape.id) || ids.has(shape.id)) throw new Error('Shape identifiers must be unique'); ids.add(shape.id);
    if (!['rect', 'ellipse', 'arrow', 'text'].includes(shape.type)) throw new Error('Unsupported shape type');
    if (!color.test(shape.stroke || '#263238') || shape.fill && shape.fill !== 'none' && !color.test(shape.fill)) throw new Error('Colors must be six-digit hex values or no fill');
    const normalized = { id: shape.id, type: shape.type, x: number(shape.x), y: number(shape.y), w: number(shape.w, 100), h: number(shape.h, 60), stroke: shape.stroke || '#263238', fill: shape.fill || 'none', strokeWidth: number(shape.strokeWidth, 2, 30) };
    if (normalized.strokeWidth < 0.1) throw new Error('Stroke width must be positive');
    if (shape.type !== 'arrow') { if (normalized.w < 0) { normalized.x += normalized.w; normalized.w = -normalized.w; } if (normalized.h < 0) { normalized.y += normalized.h; normalized.h = -normalized.h; } }
    number(normalized.x); number(normalized.y); number(normalized.x + normalized.w); number(normalized.y + normalized.h);
    if (shape.type === 'text') { if (typeof shape.text !== 'string' || shape.text.length > 5000) throw new Error('Text must contain at most 5,000 characters'); normalized.text = shape.text; normalized.fontSize = number(shape.fontSize, 20, 200); if (normalized.fontSize < 6) throw new Error('Font size must be at least six'); }
    return normalized;
  });
  const view = scene.view || {}; const zoom = number(view.zoom, 1, 5); if (zoom < 0.1) throw new Error('Zoom must be 0.1–5');
  return { version: 1, name: scene.name, shapes, view: { zoom, x: number(view.x), y: number(view.y) } };
}
export function bounds(shape) { return { x: Math.min(shape.x, shape.x + shape.w), y: Math.min(shape.y, shape.y + shape.h), w: Math.abs(shape.w), h: Math.abs(shape.h) }; }
export function hitShape(shape, x, y, tolerance = 6) {
  const b = bounds(shape);
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
    if (shape.type === 'arrow') { const angle = Math.atan2(shape.h, shape.w), endX = shape.x + shape.w, endY = shape.y + shape.h, size = 12; return `<g fill="none" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"><line x1="${shape.x}" y1="${shape.y}" x2="${endX}" y2="${endY}"/><path d="M ${endX - size * Math.cos(angle - 0.45)} ${endY - size * Math.sin(angle - 0.45)} L ${endX} ${endY} L ${endX - size * Math.cos(angle + 0.45)} ${endY - size * Math.sin(angle + 0.45)}"/></g>`; }
    return `<text x="${shape.x}" y="${shape.y}" fill="${shape.stroke}" font-family="sans-serif" font-size="${shape.fontSize}" dominant-baseline="text-before-edge">${shape.text.split('\n').map((line, i) => `<tspan x="${shape.x}" dy="${i ? shape.fontSize * 1.25 : 0}">${escape(line)}</tspan>`).join('')}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}"><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#ffffff"/>${elements.join('')}</svg>`;
}
export const example = { version: 1, name: 'Architecture sketch', view: { zoom: 1, x: 25, y: 25 }, shapes: [{ id: 'input', type: 'rect', x: 30, y: 90, w: 170, h: 100, fill: '#e0f2fe', stroke: '#0369a1' }, { id: 'process', type: 'ellipse', x: 340, y: 80, w: 180, h: 120, fill: '#ecfccb', stroke: '#4d7c0f' }, { id: 'connect', type: 'arrow', x: 210, y: 140, w: 120, h: 0, stroke: '#334155' }, { id: 'label1', type: 'text', x: 55, y: 125, w: 120, h: 30, text: 'Local input', fontSize: 20, stroke: '#0f172a' }, { id: 'label2', type: 'text', x: 370, y: 125, w: 130, h: 30, text: 'Processing', fontSize: 20, stroke: '#0f172a' }] };
