/**
 * @file What an arrowhead on every edge adds to the heap, on both render paths (issue #10027).
 *
 * THE REPORT. Giving every edge of a 1,000,000-node graph an arrowhead crashed the renderer after
 * 45-50 seconds, on both paths. Directed graphs get arrowheads by default, so default data at that
 * size reaches it.
 *
 * WHAT IT COSTS NOW. Measured 2026-11-24 on master in headless Chromium (heap cap 4,096 MB) on an
 * RTX 4070 SUPER, with `benchmarks/compare`'s page: an Erdos-Renyi graph, live heap after a forced
 * collection once the load settled. Nothing crashed, in 2D or 3D, with arrowheads given at load or
 * added to a loaded graph, through 100 still frames and a 90-second force layout:
 *
 * | path | nodes | edges | no arrowheads | arrowheads | per edge |
 * | --- | --- | --- | --- | --- | --- |
 * | objects | 100,000 | 1,000,000 | 2,600 MB | 2,763 MB | about 170 bytes |
 * | batched | 1,000,000 | 1,000,000 | 719 MB | 2,100-2,500 MB | about 1.4-1.8 KB |
 * | batched | 1,000,000 | 2,000,000 | | 2,515 MB, `W_OBJECT_CAP` | (1,000,000 objects) |
 *
 * A 1,000,000-node graph cannot reach the objects path: it is refused there with `E_TOO_LARGE`
 * (`DEFAULT_LIMITS.renderCeiling`), so on that path the largest arrowed graph is 100,000 nodes and
 * 1,000,000 edges. On batched an arrowed edge is still an `Edge` of its own, the whole of its cost,
 * and `limits.objectEdges` (1,000,000 by default) bounds how many: past it an edge is drawn as a
 * plain line and `limits-warning` says so with `W_OBJECT_CAP`.
 *
 * WHAT IS ASSERTED. The bytes arrowheads add per edge, at 50,000 edges, stay under a bound that
 * keeps the largest arrowed graph each path accepts within three quarters of that 4,096 MB heap
 * (a quarter left for a layout and a run to allocate, as `session/limits.ts` budgets it):
 *
 * - objects: (3,072 MB - 2,600 MB) / 1,000,000 edges = about 490 bytes an edge;
 * - batched: (3,072 MB - 719 MB) / 1,000,000 objects (`objectEdges`) = about 2,460 bytes an edge.
 *
 * A change that makes an arrowed edge cost more than that puts the 1,000,000-edge graph back at
 * the heap's edge. With a GPU (`GRAPHTY_BROWSER_GPU` set) the full-size graphs load too, and their
 * live heap is held to the same three quarters of the heap cap:
 *
 * GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=browser-bench test/browser/arrowhead-memory.bench.test.ts
 *
 * Runs in the `browser-bench` project, which launches Chromium with `--expose-gc` and
 * `--enable-precise-memory-info`. Each case prints a `[arrowhead-memory]` line.
 */
import "../../src/graphty-element";

import { erdosRenyiGnmGraph } from "@graphty/graph-samples/generators";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { DEFAULT_LIMITS } from "../../src/session/limits";

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

/** The most bytes arrowheads may add per edge on each path; the file comment derives both. */
const BYTES_PER_EDGE: Record<RenderPath, number> = { objects: 490, batched: 2_460 };

/** The share of the heap cap a full-size arrowed graph may hold live. */
const HEAP_SHARE = 0.75;

afterEach(() => {
    document.body.replaceChildren();
});

/** The page's heap, exact under `--enable-precise-memory-info`. */
interface HeapInfo {
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
}

/**
 * The live heap: a full collection from a task of its own, then the heap in use.
 * @returns The bytes in use, and the cap.
 */
async function liveHeap(): Promise<HeapInfo> {
    const { gc } = globalThis as { gc?: (options: { type: "major"; execution: "async" }) => Promise<void> };
    if (gc === undefined) {
        throw new Error("gc() is missing: the browser-bench project must launch Chromium with --js-flags=--expose-gc");
    }

    await gc({ type: "major", execution: "async" });
    const { memory } = performance as { memory?: HeapInfo };
    if (memory === undefined) {
        throw new Error("performance.memory is missing: this benchmark runs in Chromium only");
    }

    return { usedJSHeapSize: memory.usedJSHeapSize, jsHeapSizeLimit: memory.jsHeapSizeLimit };
}

/**
 * Add one layer that sets every edge's arrowhead.
 * @param element - The element.
 * @param name - The layer's name.
 * @param type - The arrowhead.
 */
async function arrowheads(element: Graphty, name: string, type: "none" | "normal"): Promise<void> {
    await element.session.styles.add({
        name,
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": type },
    } as never);
}

/**
 * Wait until everything asked of the element is drawn.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Load a seeded random graph with plain edges, then give every edge an arrowhead.
 * @param path - The render path.
 * @param nodes - How many nodes.
 * @param edges - How many edges.
 * @returns The live heap before and after the arrowheads, and the element.
 */
async function arrowCost(
    path: RenderPath,
    nodes: number,
    edges: number,
): Promise<{ before: HeapInfo; after: HeapInfo; element: Graphty }> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.layout = "fixed";
    element.style.cssText = "display:block;width:640px;height:480px";
    if (path === "batched") {
        element.limits = { renderCeiling: Math.max(nodes, DEFAULT_LIMITS.renderCeiling) };
    }

    document.body.appendChild(element);
    await element.updateComplete;
    await settled(element);
    await arrowheads(element, "plain edges", "none");

    const graph = erdosRenyiGnmGraph({ n: nodes, m: edges, seed: 42 });
    const side = 4 * Math.sqrt(nodes);
    const positions = new Float32Array(3 * nodes);
    for (let row = 0; row < nodes; row++) {
        // a fixed scatter, so no layout runs
        positions[3 * row] = ((row * 0.618_034) % 1) * side;
        positions[3 * row + 1] = ((row * 0.414_214) % 1) * side;
    }

    await element.session.data.importColumns({
        nodeCount: nodes,
        sources: graph.src,
        targets: graph.dst,
        positions,
    });
    await settled(element);
    const before = await liveHeap();

    await arrowheads(element, "arrows", "normal");
    await settled(element);
    const after = await liveHeap();
    return { before, after, element };
}

/**
 * Print one case and check every edge is still drawn.
 * @param name - The case.
 * @param path - The render path.
 * @param edges - How many edges.
 * @param cost - What {@link arrowCost} measured.
 * @returns The bytes arrowheads added per edge.
 */
function reported(name: string, path: RenderPath, edges: number, cost: Awaited<ReturnType<typeof arrowCost>>): number {
    const { before, after, element } = cost;
    const perEdge = (after.usedJSHeapSize - before.usedJSHeapSize) / edges;
    const mb = (bytes: number): string => (bytes / 1_048_576).toFixed(0);
    console.log(
        `[arrowhead-memory] ${name} ${path}: ${mb(before.usedJSHeapSize)} MB -> ${mb(after.usedJSHeapSize)} MB ` +
            `of ${mb(after.jsHeapSizeLimit)} MB, ${perEdge.toFixed(0)} bytes an edge, ` +
            `rows ${JSON.stringify(element.rowCounts)}`,
    );
    const { pulledEdges, objectEdges } = element.rowCounts;
    assert.strictEqual(pulledEdges + objectEdges, edges, "every edge is drawn");
    assert.isAtMost(objectEdges, DEFAULT_LIMITS.objectEdges, "arrowed edges drawn as objects stay within objectEdges");
    return perEdge;
}

describe("arrowheads on every edge", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`add at most ${String(BYTES_PER_EDGE[path])} bytes an edge at 50,000 edges, ${path}`, async () => {
            const edges = 50_000;
            const perEdge = reported("5,000 x 50,000", path, edges, await arrowCost(path, 5_000, edges));

            assert.isBelow(perEdge, BYTES_PER_EDGE[path], "bytes arrowheads add per edge");
        });
    }

    // The largest arrowed graph each path accepts: 1,000,000 nodes cannot reach objects (E_TOO_LARGE).
    const FULL: Record<RenderPath, { nodes: number; edges: number }> = {
        objects: { nodes: DEFAULT_LIMITS.renderCeiling, edges: DEFAULT_LIMITS.edgesDrawn },
        batched: { nodes: 1_000_000, edges: 1_000_000 },
    };
    for (const path of ["objects", "batched"] as const) {
        const { nodes, edges } = FULL[path];
        it.skipIf(!GPU)(
            `hold ${String(nodes)} nodes and ${String(edges)} arrowed edges in ${String(HEAP_SHARE * 100)}% of the heap, ${path}`,
            async () => {
                const cost = await arrowCost(path, nodes, edges);
                reported(`${String(nodes)} x ${String(edges)}`, path, edges, cost);

                assert.isBelow(
                    cost.after.usedJSHeapSize,
                    HEAP_SHARE * cost.after.jsHeapSizeLimit,
                    "live heap with arrowheads",
                );
            },
        );
    }
});
