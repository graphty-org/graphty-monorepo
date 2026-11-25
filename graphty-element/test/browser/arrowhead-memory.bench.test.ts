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
 * 1,000,000 edges. When the batched rows above were measured, an arrowed edge there was an `Edge` of
 * its own, bounded by `limits.objectEdges`; batched now draws the head from the row tables
 * (`ArrowCapBatch.setPulled`), so an arrowed edge builds no `Edge` and costs less than those rows.
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
 * "Bytes" here are the live JS heap plus what the arrowhead cap batches hold in their Float32Arrays:
 * those are ArrayBuffers outside the JS heap, which `performance.memory` never counts, so they are
 * read from the batches. The counted checks (one cap an edge, its buffer bytes, `objectEdges`) gate
 * pull requests in `arrowhead-memory.test.ts`; this file only measures, and gates nothing.
 *
 * Runs in the `browser-bench` project, which launches Chromium with `--expose-gc` and
 * `--enable-precise-memory-info`. Each case prints a `[arrowhead-memory]` line.
 */
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { DEFAULT_LIMITS } from "../../src/session/limits";
import { arrowCost, capBuffers } from "../helpers/arrowhead-load";

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

/** The most bytes arrowheads may add per edge on each path; the file comment derives both. */
const BYTES_PER_EDGE: Record<RenderPath, number> = { objects: 490, batched: 2_460 };

/** The share of the heap cap a full-size arrowed graph may hold live. */
const HEAP_SHARE = 0.75;

afterEach(() => {
    document.body.replaceChildren();
});

/** The page's memory: the JS heap, exact under `--enable-precise-memory-info`, and the cap buffers. */
interface Memory {
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
    capBytes: number;
}

/**
 * The live heap after a full collection from a task of its own, and the cap buffers beside it.
 * @param element - The element.
 * @returns The bytes in use, and the heap cap.
 */
async function liveMemory(element: Graphty): Promise<Memory> {
    const { gc } = globalThis as { gc?: (options: { type: "major"; execution: "async" }) => Promise<void> };
    if (gc === undefined) {
        throw new Error("gc() is missing: the browser-bench project must launch Chromium with --js-flags=--expose-gc");
    }

    await gc({ type: "major", execution: "async" });
    const { memory } = performance as { memory?: Omit<Memory, "capBytes"> };
    if (memory === undefined) {
        throw new Error("performance.memory is missing: this benchmark runs in Chromium only");
    }

    return {
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        capBytes: capBuffers(element).bytes,
    };
}

/**
 * The heap and the cap buffers together.
 * @param memory - One sample.
 * @returns The bytes.
 */
function used(memory: Memory): number {
    return memory.usedJSHeapSize + memory.capBytes;
}

/**
 * Print one case and check every edge is still drawn.
 * @param name - The case.
 * @param path - The render path.
 * @param edges - How many edges.
 * @param cost - What {@link arrowCost} measured.
 * @returns The bytes arrowheads added per edge.
 */
function reported(
    name: string,
    path: RenderPath,
    edges: number,
    cost: Awaited<ReturnType<typeof arrowCost<Memory>>>,
): number {
    const { before, after, element } = cost;
    const perEdge = (used(after) - used(before)) / edges;
    const mb = (bytes: number): string => (bytes / 1_048_576).toFixed(0);
    console.log(
        `[arrowhead-memory] ${name} ${path}: ${mb(used(before))} MB -> ${mb(used(after))} MB ` +
            `(cap buffers ${mb(after.capBytes)} MB) of ${mb(after.jsHeapSizeLimit)} MB, ` +
            `${perEdge.toFixed(0)} bytes an edge, rows ${JSON.stringify(element.rowCounts)}`,
    );
    const { pulledEdges, objectEdges } = element.rowCounts;
    assert.strictEqual(pulledEdges + objectEdges, edges, "every edge is drawn");
    return perEdge;
}

describe("arrowheads on every edge", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`add at most ${String(BYTES_PER_EDGE[path])} bytes an edge at 50,000 edges, ${path}`, async () => {
            const edges = 50_000;
            const perEdge = reported("5,000 x 50,000", path, edges, await arrowCost(path, 5_000, edges, liveMemory));

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
                const cost = await arrowCost(path, nodes, edges, liveMemory);
                reported(`${String(nodes)} x ${String(edges)}`, path, edges, cost);

                assert.isBelow(
                    used(cost.after),
                    HEAP_SHARE * cost.after.jsHeapSizeLimit,
                    "live heap and cap buffers with arrowheads",
                );
            },
        );
    }
});
