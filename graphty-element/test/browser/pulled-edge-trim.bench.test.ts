/**
 * @file What stopping pulled lines at translucent outlines costs a frame (issue #8281): 50,000 nodes and
 * 500,000 plain edges on the `"batched"` path, every line pulled from the row table, drawn opaque (each line's
 * shader reads one `rowExtent` texel per end and stops at the centre) and translucent (it reads the end's shape
 * and stops at its outline), as spheres and as triangles (whose outline is read from `rowOutline`).
 *
 * A frame is `scene.render` and a one-pixel read, so the GPU's work is in it. Numbers go to the console as
 * `[pulled-edge-trim]` lines; nothing about speed is asserted. It is meant for a real card (on SwiftShader one
 * frame of half a million lines takes many seconds); without `GRAPHTY_BROWSER_GPU` it runs WebGL only:
 *
 *     npx vitest run --project=browser-bench test/browser/pulled-edge-trim.bench.test.ts
 *     GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=browser-bench test/browser/pulled-edge-trim.bench.test.ts
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";
const RENDERERS = GPU ? (["webgl", "webgpu"] as const) : (["webgl"] as const);

const NODES = 50_000;
const EDGES = 500_000;
const FRAMES = 30;
const SIDE = Math.ceil(Math.sqrt(NODES));

/**
 * A seeded generator.
 * @param seed - The seed.
 * @returns The next number in [0, 1).
 */
function rng(seed: number): () => number {
    let state = seed;
    return () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/**
 * The value at a fraction of the sorted list.
 * @param values - The values.
 * @param at - 0.5 for the median.
 * @returns The value.
 */
function quantile(values: readonly number[], at: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(at * sorted.length))] ?? Number.NaN;
}

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

describe("pulled lines stopped at translucent outlines, 50,000 nodes and 500,000 edges", () => {
    describe.each(RENDERERS)("on %s", (renderer) => {
        it.each([
            ["sphere", 1],
            ["sphere", 0.5],
            ["triangle", 0.5],
        ] as const)("%s at opacity %s", async (shape, opacity) => {
            const created = document.createElement("graphty-element");
            created.renderer = renderer;
            created.renderPath = "batched";
            created.style.width = "1280px";
            created.style.height = "720px";
            created.style.display = "block";
            document.body.appendChild(created);
            element = created;
            await created.updateComplete;
            await operationQueueOf(created.graph).waitForCompletion();
            const rand = rng(8281);
            await created.session.data.addNodes(
                Array.from({ length: NODES }, (_, id) => ({
                    id,
                    position: { x: (id % SIDE) * 3, y: Math.floor(id / SIDE) * 3, z: 0 },
                })),
            );
            await created.session.data.addEdges(
                Array.from({ length: EDGES }, (_, i) => {
                    const src = i % NODES;
                    // a near neighbour, so most lines are short and both ends matter
                    const dst = (src + 1 + Math.floor(rand() * SIDE * 2)) % NODES;
                    return { src, dst };
                }),
            );
            await created.graph.setLayout("fixed", { dim: 3 });
            await created.setViewMode("2d");
            await created.session.styles.add({
                name: "look",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shape": shape, "node.opacity": opacity },
            } as never);
            await created.session.styles.add({
                name: "plain",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.arrowHead": "none" },
            } as never);
            const loaded = performance.now();
            await operationQueueOf(created.graph).waitForCompletion();
            await created.waitForStableFrame();
            console.log(`[pulled-edge-trim] settled in ${(performance.now() - loaded).toFixed(0)} ms`);
            assert.strictEqual(created.rendererStatus?.active, renderer, created.rendererStatus?.reason ?? "");
            assert.deepInclude(created.graph.rowCounts, { pulledEdges: EDGES });

            const { engine } = created.graph;
            const scene = created.graph.getScene();
            await scene.whenReadyAsync();
            const frames: number[] = [];
            for (let i = 0; i < FRAMES; i++) {
                const start = performance.now();
                engine.beginFrame();
                scene.render();
                const read = engine.readPixels(0, 0, 1, 1);
                engine.endFrame();
                await read;
                frames.push(performance.now() - start);
            }
            const timed = frames.slice(2);
            console.log(
                `[pulled-edge-trim] renderer=${renderer} shape=${shape} opacity=${String(opacity)} ` +
                    `frame median/p95=${quantile(timed, 0.5).toFixed(1)}/${quantile(timed, 0.95).toFixed(1)}`,
            );
            assert.lengthOf(frames, FRAMES);
        });
    });
});
