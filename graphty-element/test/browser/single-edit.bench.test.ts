/**
 * @file What one data edit costs on a large graph, on both render paths (issue #9164): a removed edge,
 * a changed node and edge value, an added node and edge, the add undone and redone, and a removed
 * node, under the starting rows
 * (Everything, Selected and Hovered, the graphty app's project). At 100,000 nodes and a million
 * edges each of these took 76-102 s before the fix: every edit repainted every element and placed
 * every edge again.
 *
 * Runs in the `browser-bench` project, never under coverage:
 *   npx vitest run --project=browser-bench test/browser/single-edit.bench.test.ts
 * VITE_SINGLE_EDIT_SIZES picks the sizes as `nodes/edges,...` (default 1000/10000, 9000/90000 and
 * 99000/990000: clear of the 10,000-node detail threshold, and just under the default ceilings so an add
 * is not refused) and VITE_SINGLE_EDIT_PATHS
 * the paths (default `objects,batched`). Each edit prints, as `[single-edit]`, the time until its
 * promise resolves, the time until the frame that draws it has been updated (once the graph is
 * loaded and at rest the render loop is stopped and `graph.update()` drives the frames, so the
 * canvas's own draw is not counted), and the edges placed and elements repainted.
 *
 * After each step, off its clock, the GPU is made to finish what the step queued (`drainGpu`), so no step is
 * charged for the frames drawn before it; that time is printed as `gpu after`.
 *
 * The ids of the edges an edit names are read before its clock starts, and strict state (the
 * test-only check of every drawn element after each pass, test/setup.ts) is off, so a step times
 * what a consumer's edit costs.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: each edit places at most the edges of its own pairs and
 * repaints at most the elements it changed, at every size.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { NodeBatches } from "../../src/meshes/NodeBatch";
import { Node } from "../../src/Node";
import { dispatcherOf } from "../../src/session/GraphSession";

// Below 10,000 nodes or well above: an add or removal that crosses `largeGraphThreshold` (10,000) changes how
// every node is drawn, and repaints the whole graph by design.
// Strict state (test/setup.ts) checks every drawn element against the project after each pass:
// a test-only walk of the whole graph that a consumer never runs, so it is off for the timings.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const SIZES = String(import.meta.env.VITE_SINGLE_EDIT_SIZES ?? "1000/10000,9000/90000,99000/990000")
    .split(",")
    .map((size) => size.split("/").map(Number) as [number, number]);
const PATHS = String(import.meta.env.VITE_SINGLE_EDIT_PATHS ?? "objects,batched").split(",") as (
    "objects" | "batched"
)[];

/**
 * A fixed pseudo-random number source.
 * @param seed - The seed.
 * @returns The next number in [0, 1).
 */
function random(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
}

/**
 * Let every queued write and pass finish, and update the frames that draw them.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.graph.getSession().styles.settled();
    element.graph.update();
    while (element.graph.getStylePainter().hasPending) {
        element.graph.update();
    }

    element.graph.update();
}

/**
 * Wait, off the clock, until the GPU has run every command queued so far and the browser has shown a frame.
 *
 * The frames here are driven by hand with the render loop stopped, so nothing presents them and nothing holds
 * the page back while the GPU falls behind: each `graph.update()` queues a whole frame and returns. Under the
 * software renderer CI draws with (SwiftShader), on four reserved cores, one frame of a million edges takes the
 * GPU process seconds. Without this drain the queue grew step after step until a step that happened to give
 * the event loop a turn (a style pass yielding with a timer) let the browser commit a frame, and that commit
 * waited for the whole backlog: one step in a run took about 75 s, a different step each run, and every
 * other step was charged a share of the frames the steps before it drew.
 * @param element - The element.
 * @returns How long the drain took.
 */
async function drainGpu(element: Graphty): Promise<number> {
    const start = performance.now();
    const engine = element.graph.engine as unknown as { _gl?: WebGLRenderingContext };
    engine._gl?.finish();
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
    return performance.now() - start;
}

interface Step {
    readonly awaitMs: number;
    readonly drawnMs: number;
    /** How long the GPU took, after the step was drawn, to run what it queued (not part of `drawnMs`). */
    readonly gpuMs: number;
    readonly placed: number;
    readonly repainted: number;
}

/**
 * Run one edit, timed until it is drawn, counting the edges placed and the elements repainted.
 * @param element - The element.
 * @param edit - The edit.
 * @returns What it cost.
 */
async function measure(element: Graphty, edit: () => Promise<unknown>): Promise<Step> {
    const placed = vi.spyOn(Edge.prototype, "update");
    const nodes = vi.spyOn(Node.prototype, "applySessionPaint");
    const rows = vi.spyOn(NodeBatches.prototype, "paintRow");
    const edges = vi.spyOn(Edge.prototype, "applySessionPaint");
    try {
        const start = performance.now();
        await edit();
        const awaitMs = performance.now() - start;
        await drawn(element);
        const drawnMs = performance.now() - start;
        const gpuMs = await drainGpu(element);
        return {
            awaitMs,
            drawnMs,
            gpuMs,
            placed: placed.mock.calls.length,
            repainted:
                nodes.mock.calls.length +
                rows.mock.results.filter(({ value }) => value === true).length +
                edges.mock.calls.length,
        };
    } finally {
        placed.mockRestore();
        nodes.mockRestore();
        rows.mockRestore();
        edges.mockRestore();
    }
}

describe("one data edit on a large graph", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    for (const path of PATHS) {
        for (const [nodeCount, edgeCount] of SIZES) {
            it(`${path}: ${String(nodeCount)} nodes, ${String(edgeCount)} edges`, async () => {
                const element = document.createElement("graphty-element");
                element.renderer = "webgl";
                element.renderPath = path;
                element.layout = "fixed";
                element.style.display = "block";
                element.style.width = "400px";
                element.style.height = "300px";
                document.body.appendChild(element);
                await element.waitForStableFrame();
                await element.session.config.set({ startingRows: true });
                const next = random(7);
                const loadStart = performance.now();
                await element.session.data.addNodes(
                    Array.from({ length: nodeCount }, (_, id) => ({
                        id,
                        group: id % 5,
                        position: { x: next() * 100, y: next() * 100, z: 0 },
                    })),
                );
                await element.session.data.addEdges(
                    Array.from({ length: edgeCount }, () => ({
                        source: Math.floor(next() * nodeCount),
                        target: Math.floor(next() * nodeCount),
                    })),
                );
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                const loadMs = performance.now() - loadStart;
                // From here the frames are driven by hand, so a step times its own work and not the canvas's draw.
                element.graph.engine.stopRenderLoop();
                const loadGpuMs = await drainGpu(element);
                const { data } = element.session;
                // Read before the clock starts: a page of edges is a read of its own, not part of an edit.
                const [first, second, third] = [1, 5, 9].map(
                    (offset) => data.edgePage({ offset, limit: 1 }).records[0].id,
                );

                const steps: Record<string, Step> = {
                    "remove an edge": await measure(element, () => data.removeEdges([first])),
                    "remove another edge": await measure(element, () => data.removeEdges([second])),
                    "undo the removed edge": await measure(element, () => element.session.undo()),
                    "redo the edge removal": await measure(element, () => element.session.redo()),
                    "change a node value": await measure(element, () =>
                        data.updateNodes([{ id: 7, values: { group: 99 } }]),
                    ),
                    "undo the node value": await measure(element, () => element.session.undo()),
                    "change an edge value": await measure(element, () =>
                        data.updateEdges([{ id: third, values: { w: 7 } }]),
                    ),
                    "undo the edge value": await measure(element, () => element.session.undo()),
                    "add a node": await measure(element, () =>
                        data.addNodes([{ id: "extra", group: 1, position: { x: 1, y: 2, z: 0 } }]),
                    ),
                    "add an edge": await measure(element, () => data.addEdges([{ source: "extra", target: 3 }])),
                    "undo the added edge": await measure(element, () => element.session.undo()),
                    "redo it": await measure(element, () => element.session.redo()),
                    "remove a node": await measure(element, () => data.removeNodes([11])),
                    "undo the removed node": await measure(element, () => element.session.undo()),
                    "redo the removal": await measure(element, () => element.session.redo()),
                };

                const ms = (value: number): string => `${value.toFixed(0)} ms`;
                console.log(
                    `[single-edit] ${path} ${String(nodeCount)}/${String(edgeCount)}: load ${ms(loadMs)}, ` +
                        `gpu after the load ${ms(loadGpuMs)}`,
                );
                for (const [edit, step] of Object.entries(steps)) {
                    console.log(
                        `[single-edit] ${path} ${String(nodeCount)}/${String(edgeCount)} ${edit}: ` +
                            `resolved ${ms(step.awaitMs)}, drawn ${ms(step.drawnMs)}, gpu after ${ms(step.gpuMs)}, ` +
                            `${String(step.placed)} edges placed, ${String(step.repainted)} repainted`,
                    );
                }

                for (const [edit, step] of Object.entries(steps)) {
                    // An edge's ends and the edges of a removed node's pairs: a handful at any size.
                    assert.isAtMost(step.placed, 64, `${edit} places only the edges of its own pairs`);
                    // An added edge, and under "batched" the `Node`s its two ends are built for it; a node put back
                    // with its edges.
                    assert.isAtMost(step.repainted, 64, `${edit} repaints only what it changed`);
                }
            });
        }
    }
});
