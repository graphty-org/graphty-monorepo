/**
 * @file The cost of drawing nodes whose mesh a consumer read, on both render paths.
 *
 * Under `"batched"`, reading `node.mesh` keeps a node of a look no batch draws (these ringed circles)
 * on its look's shared source, in its place in the draw order (test/browser/held-node-draw-order.test.ts).
 * This times what that costs a frame: for each size, 2D ringed circles of two looks are loaded,
 * every node's mesh is read, and `scene.render` is timed over a run of frames, on `"objects"` and on
 * `"batched"`. Plain circles, which a batch draws, are timed with some of their meshes read: none,
 * one in the middle, or the first and the last, which takes every row between them off the batch so
 * each keeps its place. Numbers go to the console as `[held-node-draw-order]` lines; nothing about
 * speed is asserted, only how many nodes draw by their own mesh.
 *
 * npx vitest run --project=browser-bench test/browser/held-node-draw-order.bench.test.ts
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const FRAMES = 120;

let element: Graphty | null = null;

afterEach(() => {
    element?.remove();
    element = null;
});

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

describe("drawing nodes whose mesh a consumer read", () => {
    for (const size of [100, 2_000, 10_000]) {
        for (const path of ["objects", "batched"] as const) {
            it(`${String(size)} nodes on ${path}`, async () => {
                const created = document.createElement("graphty-element");
                created.renderPath = path;
                created.style.width = "1280px";
                created.style.height = "720px";
                created.style.display = "block";
                document.body.appendChild(created);
                element = created;
                await created.updateComplete;
                const side = Math.ceil(Math.sqrt(size));
                await created.session.data.addNodes(
                    Array.from({ length: size }, (_, id) => ({
                        id,
                        position: { x: (id % side) * 0.9, y: Math.floor(id / side) * 0.9, z: 0 },
                    })),
                );
                await created.graph.setLayout("fixed", { dim: 3 });
                await created.setViewMode("2d");
                for (const [parity, ring] of [
                    [0, "#000000"],
                    [1, "#2563eb"],
                ] as const) {
                    await created.session.styles.add({
                        name: `ring ${ring}`,
                        target: "node",
                        selector: {
                            match: "ids",
                            nodes: Array.from({ length: size }, (_, id) => id).filter((id) => id % 2 === parity),
                        },
                        set: { "node.shape": "ellipse", "node.borderColor": ring, "node.borderWidth": 0.15 },
                    } as never);
                }

                await operationQueueOf(created.graph).waitForCompletion();
                await created.waitForStableFrame();
                const { graph } = created;
                const readStart = performance.now();
                for (let id = 0; id < size; id++) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                const readMs = performance.now() - readStart;
                await created.waitForStableFrame();
                assert.equal(graph.rowCounts.objectNodes, size, "every read node draws by its own mesh");

                const scene = graph.getScene();
                const renders: number[] = [];
                for (let frame = 0; frame < FRAMES; frame++) {
                    const start = performance.now();
                    scene.render();
                    renders.push(performance.now() - start);
                }

                console.log(
                    `[held-node-draw-order] nodes=${String(size)} path=${path} readMeshes=${readMs.toFixed(0)}ms ` +
                        `render median/p95=${quantile(renders, 0.5).toFixed(2)}/${quantile(renders, 0.95).toFixed(2)}ms`,
                );
            });
        }
    }
});

/**
 * Time a run of frames of a scene.
 * @param graph - The graph.
 * @returns The median and 95th percentile, in ms.
 */
function frameTimes(graph: Graphty["graph"]): string {
    const scene = graph.getScene();
    const renders: number[] = [];
    for (let frame = 0; frame < FRAMES; frame++) {
        const start = performance.now();
        scene.render();
        renders.push(performance.now() - start);
    }

    return `${quantile(renders, 0.5).toFixed(2)}/${quantile(renders, 0.95).toFixed(2)}ms`;
}

describe("drawing plain nodes a batch draws when some of their meshes are read", () => {
    for (const size of [2_000, 10_000, 50_000]) {
        for (const [label, reads, held] of [
            ["none", [], 0],
            ["the middle one", [Math.floor(size / 2)], 1],
            ["the first and the last", [0, size - 1], size],
        ] as const) {
            it(`${String(size)} nodes, ${label} read`, async () => {
                const created = document.createElement("graphty-element");
                created.renderPath = "batched";
                created.style.width = "1280px";
                created.style.height = "720px";
                created.style.display = "block";
                document.body.appendChild(created);
                element = created;
                await created.updateComplete;
                const side = Math.ceil(Math.sqrt(size));
                await created.session.data.addNodes(
                    Array.from({ length: size }, (_, id) => ({
                        id,
                        position: { x: (id % side) * 0.9, y: Math.floor(id / side) * 0.9, z: 0 },
                    })),
                );
                await created.graph.setLayout("fixed", { dim: 3 });
                await created.setViewMode("2d");
                await created.session.styles.add({
                    name: "plain",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shape": "ellipse", "node.size": 1.2 },
                } as never);
                await operationQueueOf(created.graph).waitForCompletion();
                await created.waitForStableFrame();
                const { graph } = created;
                const start = performance.now();
                for (const id of reads) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                // the frame that takes the rows off the batch
                graph.getScene().render();
                const holdMs = performance.now() - start;
                await created.waitForStableFrame();
                console.log(
                    `[held-node-draw-order] plain nodes=${String(size)} read=${label} hold=${holdMs.toFixed(0)}ms ` +
                        `objectNodes=${String(graph.rowCounts.objectNodes)} render median/p95=${frameTimes(graph)}`,
                );
                assert.equal(graph.rowCounts.objectNodes, held);
            });
        }
    }
});
