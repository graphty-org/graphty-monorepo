# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/cytoscape-extensions
package: every graphty layout and algorithm as a Cytoscape.js v3 extension.

## Testing

- One test project (Node.js, headless Cytoscape). It resolves the graphty packages through their
  dist, so build them first. `test/gpu-device.test.ts` needs a real GPU and follows the
  `GRAPHTY_GPU_REQUIRE` rule of webgpu-graph-algorithms
- Storybook demo (`npm run storybook`, `stories/`): the extensions in a real Cytoscape instance.
  The Demo stories run any layout, algorithm, generator, bundled dataset or file format on a
  seeded graph-samples network (100 to 50,000 nodes), backend auto, CPU or GPU, with the backend
  that ran, why, and the time on screen. The Gallery stories run every one of them at once on
  small seeded graphs, one tile each; `test/demo-catalog.test.ts` fails when the extension
  registers something `stories/catalog.ts` does not list. The stories import `src/`, so edits
  show up live (reload the page after an algorithm change: Cytoscape cannot re-register a method)
- Visual review captures every story (project `cytoscape-extensions`; it waits on each story
  root's `whenDone()` and fails a story whose console says "graphty demo failed"). Captures hide
  run times. The capture browser has no WebGPU (visual-review removes `navigator.gpu`), so in CI
  every story runs the CPU path and shows "this runtime has no WebGPU" as the reason, and the
  GPU-only spring-electrical tile shows that it did not run and why. The GPU path is covered by
  the package's GPU tests, not by images
