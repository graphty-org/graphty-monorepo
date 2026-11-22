/**
 * @file How long a frame of default spheres takes at each node count, at full and at low detail
 * (issue #9548): the measurement behind `Limits.fullDetailTriangleBudget`.
 *
 * Each size mounts the element with the nodes on a grid three units apart (no edges, fixed
 * layout, the camera fitted to them), sets `node.meshDetail` on every node through a layer, and
 * times 30 frames, each one `scene.render()` followed by a one-pixel `readPixels`, which waits for
 * the GPU to finish the frame. The number to read is the median frame and the triangles drawn in
 * it (`scene.getActiveIndices() / 3`).
 *
 * Numbers go to the console as `[node-detail-frame]` lines; nothing about speed is asserted. Runs
 * only when `GRAPHTY_BROWSER_GPU` is set, since it measures the renderer named there:
 *
 * GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=browser-bench test/browser/node-detail-frame.bench.test.ts
 * GRAPHTY_BROWSER_GPU=swiftshader npx vitest run --project=browser-bench test/browser/node-detail-frame.bench.test.ts
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const GPU = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";
const FRAMES = 30;
const CASES: readonly (readonly [number, "full" | "low"])[] = [
    [250, "full"],
    [500, "full"],
    [1_000, "full"],
    [2_000, "full"],
    [3_000, "full"],
    [5_000, "full"],
    [7_500, "full"],
    [10_000, "full"],
    [20_000, "full"],
    [30_000, "full"],
    [10_000, "low"],
    [50_000, "low"],
];

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

describe.skipIf(GPU === "")("a frame of default spheres", () => {
    for (const [n, detail] of CASES) {
        it(`at ${String(n)} nodes, ${detail} detail`, async () => {
            const created = document.createElement("graphty-element");
            created.setAttribute("renderer", "webgl");
            created.style.width = "1280px";
            created.style.height = "720px";
            created.style.display = "block";
            document.body.appendChild(created);
            element = created;
            created.layout = "fixed";
            const side = Math.ceil(Math.sqrt(n));
            created.nodeData = Array.from({ length: n }, (_, i) => ({
                id: i,
                position: { x: (i % side) * 3, y: Math.floor(i / side) * 3, z: 0 },
            }));
            await created.session.styles.add({
                name: "Detail",
                target: "node",
                selector: { match: "everything" },
                set: { "node.meshDetail": detail },
            });
            await created.waitForSettled();

            const { scene } = created.graph;
            const gl = (scene.getEngine() as unknown as { _gl: WebGL2RenderingContext })._gl;
            const pixel = new Uint8Array(4);
            const frames: number[] = [];
            for (let i = 0; i < FRAMES; i++) {
                await new Promise((resolve) => requestAnimationFrame(resolve));
                const start = performance.now();
                scene.render();
                gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                frames.push(performance.now() - start);
            }

            const triangles = scene.getActiveIndices() / 3;
            const sorted = frames.slice(1).sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            console.log(
                `[node-detail-frame] gpu=${GPU} nodes=${String(n)} detail=${detail} triangles=${String(triangles)} ` +
                    `frame median=${median.toFixed(1)}ms fps=${(1000 / median).toFixed(1)}`,
            );
            assert.isAbove(triangles, 0, "the nodes were drawn");
        });
    }
});
