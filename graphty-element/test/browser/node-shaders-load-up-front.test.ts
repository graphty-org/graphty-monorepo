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

import { Engine, FreeCamera, MeshBuilder, Scene, ShaderStore, StandardMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import { Graphty } from "../../src/graphty-element";
import { useBundledStandardShaders } from "../../src/meshes/bundledStandardShaders";

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

    it("are not imported by a material drawn in the same task it was made in", () => {
        // A node's material is made in an update pass and drawn by the render that follows, in
        // the same task (issue #4241). Babylon.js 9 keeps "already loaded" per material class, on
        // a private static loader; this sets it back to a fresh page's state, so the first scene
        // shows Babylon's own lazy import and the second that the pin skips it.
        const loader = (
            StandardMaterial as unknown as { _ShaderLoader: Record<"_webGL" | "_webGPU", { loaded: boolean }> }
        )._ShaderLoader;
        const canvas = document.createElement("canvas");
        const engine = new Engine(canvas);
        const lazySteps: Record<string, boolean> = {};
        let pinnedNow = false;
        const createEffect = engine.createEffect.bind(engine);
        engine.createEffect = ((...args: Parameters<Engine["createEffect"]>) => {
            const options = args[1] as { extraInitializationsAsync?: unknown };
            if (args[0] === "default") {
                lazySteps[pinnedNow ? "pinned" : "unpinned"] = options.extraInitializationsAsync !== undefined;
            }

            return createEffect(...args);
        }) as Engine["createEffect"];
        try {
            for (const pinned of [false, true]) {
                pinnedNow = pinned;
                loader._webGL.loaded = false;
                loader._webGPU.loaded = false;
                const scene = new Scene(engine);
                new FreeCamera("camera", new Vector3(0, 0, -5), scene).setTarget(Vector3.Zero());
                if (pinned) {
                    useBundledStandardShaders();
                }

                MeshBuilder.CreateBox("box", {}, scene).material = new StandardMaterial("material", scene);
                scene.render();
            }

            assert.deepEqual(
                lazySteps,
                { unpinned: true, pinned: false },
                "Babylon imports the shaders for a fresh class; the element's pin skips the import",
            );
        } finally {
            useBundledStandardShaders();
            engine.dispose();
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
        await vi.waitFor(() => assert.isTrue(element.graph.initialized));

        element.nodeData = [{ id: "a" }, { id: "b" }, { id: "c" }];
        element.edgeData = [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ];
        await element.waitForStableFrame();

        assert.isAbove(element.graph.getNodeCount(), 0, "the graph drew its nodes");
        assert.deepEqual(fetchedDefaultShaders(), [], "drawing fetched no shader module");
    });
});
