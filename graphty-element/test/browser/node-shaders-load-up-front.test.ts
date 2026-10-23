/**
 * @file Drawing nodes never fetches a Babylon shader module.
 *
 * Babylon.js's StandardMaterial runs `import()` for its `default.vertex` and `default.fragment`
 * shaders the first time a material compiles, even when the shaders are already loaded, and a
 * bundler turns that into a fetch of a separate chunk. When that fetch fails -- iPad Safari on a
 * Vite dev server ("Importing a module script failed"), or a production tab left open across a
 * redeploy that removed the old hashed chunk -- the material never becomes ready and no node is
 * drawn, with no error anywhere. The element loads the shaders with itself and tells every
 * StandardMaterial so, so drawing fetches nothing.
 */

import { ShaderStore } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import { Graphty } from "../../src/graphty-element";

/** How long the element may take to build its renderer and draw. */
const MOUNT_TIMEOUT_MS = 15000;

/** A Babylon default material shader module, as the dev server or a bundle names its file. */
const DEFAULT_SHADER_FILE = /default\.(vertex|fragment)/;

let container: HTMLDivElement | null = null;

afterEach(() => {
    container?.remove();
    container = null;
});

/**
 * Every default shader module this page has fetched so far.
 * @returns The fetched URLs.
 */
function fetchedDefaultShaders(): string[] {
    return performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => DEFAULT_SHADER_FILE.test(new URL(name).pathname.split("/").pop() ?? ""));
}

describe("node shaders", () => {
    it("are in Babylon's shader store before any element renders", () => {
        for (const name of ["defaultVertexShader", "defaultPixelShader"]) {
            assert.isString(ShaderStore.ShadersStore[name], `GLSL ${name} is loaded`);
            assert.isString(ShaderStore.ShadersStoreWGSL[name], `WGSL ${name} is loaded`);
        }
    });

    it("are not fetched when a graph draws its nodes", async () => {
        // The resource timing buffer holds 250 entries and the test page has already filled it.
        performance.clearResourceTimings();

        container = document.createElement("div");
        container.style.width = "480px";
        container.style.height = "360px";
        document.body.appendChild(container);
        const element = document.createElement("graphty-element");
        assert.instanceOf(element, Graphty);
        element.style.display = "block";
        element.style.width = "100%";
        element.style.height = "100%";
        container.appendChild(element);
        await vi.waitFor(() => assert.isTrue(element.graph.initialized), { timeout: MOUNT_TIMEOUT_MS });

        element.nodeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
        element.edgeData = [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ];
        await element.waitForStableFrame({ timeoutMs: MOUNT_TIMEOUT_MS });

        assert.isAbove(element.graph.getNodeCount(), 0, "the graph drew its nodes");
        assert.deepEqual(fetchedDefaultShaders(), [], "drawing fetched no shader module");
    });
});
