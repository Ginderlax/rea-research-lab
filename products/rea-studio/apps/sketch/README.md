# REA Sketch

Working local development canvas editor. Start REA Studio and open **Sketch**. Draw rectangles, ellipses, arrows and text. Select and drag to move shapes; drag the blue square handle to resize. Change stroke/fill/text, undo/redo, delete shapes, zoom with the wheel, pan with the Pan tool or Space+drag, save/load/delete local scenes, and export SVG or JSON. The expandable JSON editor imports validated scenes. The starter architecture diagram demonstrates all four shape types.

The canvas handles pointer input and device pixel scaling. Selection tests topmost shapes, ellipse interiors and arrow-line proximity. Negative rectangle/ellipse dimensions normalize on release. Undo/redo snapshots are local to the open editor, with 100 retained checkpoints. Scenes persist shapes and viewport; saved scene storage is managed by the host. SVG uses plain geometric elements and escaped text; no script or external references are generated. Limits: 2,000 shapes, 5,000 characters per text shape, zoom 0.1–5, coordinate magnitude at most 1,000,000. Each scene has a versioned original JSON schema, not Excalidraw's schema.

## Current gaps against Excalidraw

This is an original implementation and does not import the study's reconstruction. It is **not a complete Excalidraw replacement**. It lacks freehand/rough drawing, line/polygon/diamond tools, multiple selection, grouping, rotation, snapping, alignment/distribution, layers/order controls, bound arrows, rich typography, text auto-layout/wrapping, image embedding, libraries, live collaboration, encrypted sharing, cloud storage, PNG export, mobile gesture support, Excalidraw file compatibility and broad accessibility support. Keyboard controls work while the canvas is focused; a complete accessible alternative to pointer editing has not been implemented. Text box resizing changes the selection geometry but not font size or text wrapping. No feature parity or universal quality improvement has been established.

Official [Excalidraw initial scene API documentation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/initialdata) was checked on 2026-10-12 to distinguish scene elements, app state and reusable libraries from this application's smaller scene/view model. Further feature inventory and comparative evaluation remain necessary.

## Validation

`node --test products/rea-studio/apps/sketch/app.test.mjs` exercises API persistence/export/delete, JSON roundtrip, safe SVG text escaping, color/coordinate/id validation, dimension normalization, hit-testing and undo/redo branching. Browser pointer behavior requires interactive verification; these tests do not establish usability, accessibility or Excalidraw parity.
