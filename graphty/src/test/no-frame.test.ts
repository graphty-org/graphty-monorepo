/**
 * A browser test file that never opens a project does not load the project frame (issue #3343).
 * The shared setup used to import the whole frame before every file's first test, and on a busy
 * machine that import alone ran past the 30 second hook limit in files that never needed it.
 */
import { assert, it } from "vitest";

import { loadedFrame } from "../workspace/frameLoader";

it("loads none of the frame's modules", () => {
    assert.isNull(loadedFrame());
    const frameModules = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => name.includes("/src/workspace/frame/"));
    assert.deepEqual(frameModules, []);
});
