import test from 'node:test'; import assert from 'node:assert/strict'; import { render } from './client.mjs'; import { handle } from './server.mjs'; import { nativeFixture } from './fixtures.mjs';
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.style = {}; this.listeners = new Map(); this.attributes = {}; this.value = ''; }
  append(...children) { this.children.push(...children); } replaceChildren(...children) { this.children = children; }
  get childElementCount() { return this.children.length; }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
  setAttribute(key, value) { this.attributes[key] = value; }
  async event(type, values = {}) { const event = { button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {}, ...values }; for (const callback of this.listeners.get(type) || []) await callback(event); }
  click() { return this.event('click'); } focus() {} setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 560 }; }
  getContext() { return new Proxy({ measureText: text => ({ width: text.length * 10 }) }, { get: (target, key) => key in target ? target[key] : () => {} }); }
}
function descendants(root) { return [root, ...root.children.flatMap(descendants)]; }
function find(root, tag, text) { return descendants(root).find(element => element.tagName === tag && (text === undefined || element.textContent === text)); }
async function harness(fn) {
  const previous = { document: globalThis.document, window: globalThis.window, ResizeObserver: globalThis.ResizeObserver }; let disconnected = false;
  globalThis.document = { createElement: tag => new Element(tag) }; globalThis.window = { devicePixelRatio: 1 }; globalThis.ResizeObserver = class { observe() {} disconnect() { disconnected = true; } };
  const data = new Map(), store = { get: async (key, fallback) => structuredClone(data.has(key) ? data.get(key) : fallback), set: async (key, value) => data.set(key, structuredClone(value)) };
  const root = new Element('root'); const cleanup = await render(root, (action, input) => handle({ action, input, store }));
  try { await fn(root, store); } finally { cleanup(); assert.equal(disconnected, true); for (const [key, value] of Object.entries(previous)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
}
test('canvas event handlers draw freehand, group multiple shapes, move a group and undo/redo real scene data', async () => {
  await harness(async root => {
    const canvas = find(root, 'canvas'), state = () => JSON.parse(find(root, 'textarea').value);
    await find(root, 'button', 'Freehand').click(); await canvas.event('pointerdown', { clientX: 100, clientY: 200 }); await canvas.event('pointermove', { clientX: 120, clientY: 210 }); await canvas.event('pointermove', { clientX: 140, clientY: 220 }); await canvas.event('pointerup');
    const ink = state().shapes.at(-1); assert.equal(ink.type, 'freedraw'); assert.deepEqual(ink.points, [[0, 0], [20, 10], [40, 20]]);
    await find(root, 'button', 'Select all').click(); await find(root, 'button', 'Group').click(); const grouped = state(); assert.ok(grouped.shapes.every(s => s.groupIds?.length === 1)); assert.equal(new Set(grouped.shapes.map(s => s.groupIds[0])).size, 1);
    await find(root, 'button', 'Select').click(); await canvas.event('pointerdown', { clientX: 100, clientY: 140 }); await canvas.event('pointermove', { clientX: 170, clientY: 170 }); await canvas.event('pointerup'); const moved = state(); for (let i = 0; i < moved.shapes.length; i++) { assert.equal(moved.shapes[i].x, grouped.shapes[i].x + 70); assert.equal(moved.shapes[i].y, grouped.shapes[i].y + 30); }
    await find(root, 'button', 'Undo').click(); assert.deepEqual(state(), grouped); await find(root, 'button', 'Redo').click(); assert.deepEqual(state(), moved);
    await find(root, 'button', 'Select all').click(); await find(root, 'button', 'Ungroup').click(); assert.ok(state().shapes.every(s => s.groupIds.length === 0));
    await find(root, 'button', 'Save').click(); assert.match(find(root, 'p').textContent, /saved/);
  });
});
test('native file import keeps preservation warnings visible and saves inert unsupported data', async () => {
  await harness(async (root, store) => {
    const file = descendants(root).find(node => node.tagName === 'input' && node.type === 'file'), original = nativeFixture(); const content = JSON.stringify(original); file.files = [{ name: 'Research.excalidraw', size: Buffer.byteLength(content), text: async () => content }]; await file.event('change');
    const warning = descendants(root).find(node => node.role === 'note'); assert.equal(warning.hidden, false); assert.ok(descendants(warning).some(node => node.textContent === 'future: future-widget preserved without editable rendering')); assert.match(descendants(warning).find(node => node.tagName === 'p').textContent, /canvas and SVG show editable projections only/);
    assert.equal(JSON.parse(find(root, 'textarea').value).shapes.length, 5); await find(root, 'button', 'Save').click(); const saved = (await handle({ action: 'list', store })).scenes[0]; assert.deepEqual((await handle({ action: 'exportExcalidraw', input: { id: saved.id }, store })).document, original);
    assert.equal(descendants(root).filter(node => ['script', 'iframe', 'img'].includes(node.tagName)).length, 0);
  });
});
