// Original synthetic data following the pinned v0.18.1 public element types.
export function nativeFixture() {
  const base = (id, type, extra = {}) => ({ id, type, x: 40, y: 50, width: 100, height: 60, angle: 0, strokeColor: '#263238', backgroundColor: 'transparent', fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: 321, version: 7, versionNonce: 1234, index: 'a0', isDeleted: false, boundElements: [], updated: 1700000000000, link: null, locked: false, ...extra });
  return {
    type: 'excalidraw', version: 2, source: 'https://excalidraw.com', futureDocumentFlag: { preserve: true },
    elements: [
      base('box', 'rectangle', { strokeColor: '#abc', roughness: 2, fillStyle: 'hachure', opacity: 70, groupIds: ['inner', 'outer'], customData: JSON.parse('{"__proto__":{"inert":true},"notes":"<script>never execute</script>"}'), futureElementFlag: { nested: [1, 'unchanged'] } }),
      base('oval', 'ellipse', { x: 200, groupIds: ['outer'] }),
      base('label', 'text', { x: 60, y: 65, width: 90, height: 25, text: 'Native label', originalText: 'Native label', fontSize: 20, fontFamily: 2, textAlign: 'left', verticalAlign: 'top', containerId: null, autoResize: true, lineHeight: 1.25 }),
      base('arrow', 'arrow', { x: 30, y: 140, width: 100, height: 30, points: [[10, 20], [110, -10]], startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: 'arrow', lastCommittedPoint: null, elbowed: false }),
      base('stroke', 'freedraw', { x: 150, y: 150, width: 40, height: 30, points: [[0, 0], [20, -10], [40, 20]], pressures: [0.2, 0.4, 0.7], simulatePressure: false, lastCommittedPoint: null }),
      base('picture', 'image', { fileId: 'pixel', status: 'saved', scale: [1, 1], crop: null }),
      base('rotated', 'ellipse', { angle: Math.PI / 4 }),
      base('locked', 'rectangle', { locked: true }),
      base('bound', 'arrow', { points: [[0, 0], [100, 60]], startBinding: { elementId: 'box', focus: 0, gap: 1 }, endBinding: null, startArrowhead: null, endArrowhead: 'arrow', elbowed: false }),
      base('future', 'future-widget', { futurePayload: { url: 'https://invalid.example/no-fetch', html: '<iframe src="javascript:bad"></iframe>' } }),
      base('deleted', 'text', { text: 'Deleted but retained', isDeleted: true })
    ],
    appState: { viewBackgroundColor: '#fffce8', gridSize: 20, gridStep: 5, zoom: { value: 1.5, futureZoomFlag: true }, scrollX: -20, scrollY: 30, unknownState: ['retain', 42] },
    files: { pixel: { id: 'pixel', mimeType: 'image/png', dataURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=', created: 1700000000000, lastRetrieved: 1700000000001, unknownFileFlag: 'retain' } }
  };
}
