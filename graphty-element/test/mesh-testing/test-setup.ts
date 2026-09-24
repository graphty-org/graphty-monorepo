/**
 * Setup file for the "mesh" vitest project.
 *
 * The mesh lane runs Babylon's NullEngine in Node against the real `NodeMesh`, `EdgeMesh` and
 * `RichTextLabel`. Two of those need a browser surface Node does not have -- `RichTextLabel`
 * measures text through `document.createElement("canvas")` and draws through the 2D context
 * Babylon's `DynamicTexture` hands it -- so this file installs one before any test runs.
 *
 * The polyfill itself lives in `./recording-canvas`, because the tests need to READ what was drawn
 * as well as let it happen: it records every call made on the 2D context, which is how a label
 * test asserts that the product drew the text it was given rather than that a mock echoed it back.
 *
 * This file must stay free of Babylon and of anything under `src/`. It is loaded before the test
 * module graph, and importing the code under test from a setup file makes the order in which
 * modules initialise depend on the setup file rather than on the test.
 */

import { beforeAll } from "vitest";

import { installCanvasPolyfills } from "./recording-canvas";

/**
 * Installs the canvas and document polyfills the mesh lane needs.
 *
 * Exported as well as invoked so a test that runs outside this project -- `real-mesh-simple.test.ts`
 * also runs in the browser project -- can call it directly without depending on setup-file order.
 * It is idempotent and a no-op where a real `document` already exists.
 */
export function setup(): void {
    installCanvasPolyfills();
}

setup();

// Babylon prints a version banner from its first engine in every file. The "default" project
// silences it in test/setup.ts, which this project deliberately does not load; without this the
// banner lands in the middle of the test output as stray stdout. The import is dynamic because
// pulling Babylon in at setup time would fix the module graph's initialisation order here rather
// than in the test.
beforeAll(async () => {
    const { Logger } = await import("@babylonjs/core");
    Logger.LogLevels = Logger.ErrorLogLevel;
});
