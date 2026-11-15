/**
 * @file What `getNodes()` costs on the `"batched"` render path at a million nodes (issue #8169).
 *
 * The batched path draws most nodes from row tables with no `Node` object. `getNodes()` used to
 * return `Array.from(dataManager.nodes.values())`, and that walk built a `Node` for every row: at a
 * million nodes the renderer grew by about 4.4 GB and the page crashed. Now it returns an array
 * that builds a node's `Node` only when that element is read, and `getNodeIds()` enumerates the
 * ids building none.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: the `Node`s each call builds. The time and the heap each step
 * adds are printed as `[get-nodes-batched]`, not asserted. The old cost is printed beside the new
 * one as what reading `SAMPLE` elements costs per `Node`, times the rows, because building them
 * all -- what the old call did -- crashes the page.
 *
 * Measured on the development machine (i9-14900, headless Chromium, software renderer), heap
 * after a full collection:
 *
 *   at 1,000,000 nodes, this code
 *     getNodes()                                66 ms,   no heap growth,  0 Nodes built
 *     getNodeIds()                              65 ms,   4 MB,            0 Nodes built
 *     reading 50,000 elements                1,506 ms, 434 MB,       50,000 Nodes built
 *     the old getNodes(), projected         30,110 ms, 8,678 MB,  1,000,000 Nodes built
 *   at 200,000 nodes, the old getNodes() (Array.from over the node map), measured
 *     getNodes()                             6,288 ms, 1,716 MB,    200,000 Nodes built
 *
 * The old call costs about 8.6 KB of heap and 30 microseconds per Node at both sizes; the renderer
 * process grew by more than the JS heap, which is why a million crashed it.
 *
 * This file gates no push: it runs in the "browser-bench" project.
 */

import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { dataManagerInternals } from "../../src/managers/DataManager";

const NODES = 1_000_000;
/** The elements read to price one `Node`: enough to average over, few enough to fit the heap. */
const SAMPLE = 50_000;

/** Run a full garbage collection; the page runs with `--expose-gc`. */
async function collect(): Promise<void> {
    const { gc } = globalThis as { gc?: (options: { type: "major"; execution: "async" }) => Promise<void> };
    if (gc === undefined) {
        throw new Error("gc() is missing: the browser-bench project must launch Chromium with --js-flags=--expose-gc");
    }

    await gc({ type: "major", execution: "async" });
}

/**
 * The JS heap in use after a full collection.
 * @returns Bytes.
 */
async function heap(): Promise<number> {
    await collect();
    return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
}

interface Cost {
    ms: number;
    bytes: number;
    built: number;
}

describe("getNodes on the batched path at a million nodes", () => {
    let element: Graphty;
    const built = (): number => dataManagerInternals.nodesBuilt(element.graph.getDataManager());

    /**
     * Time a step, and count the heap it keeps and the `Node`s it builds.
     * @param work - The step; what it returns is kept alive until the heap is read.
     * @returns The cost.
     */
    async function cost(work: () => unknown): Promise<Cost> {
        const startHeap = await heap();
        const startBuilt = built();
        const start = performance.now();
        const kept = work();
        const ms = performance.now() - start;
        const bytes = (await heap()) - startHeap;
        assert.isDefined(kept);
        return { ms, bytes, built: built() - startBuilt };
    }

    const report = (what: string, c: Cost): void => {
        const mb = (c.bytes / 1e6).toFixed(1);
        console.log(
            `[get-nodes-batched] ${what}: ${c.ms.toFixed(1)} ms, ${mb} MB heap, ${String(c.built)} Nodes built`,
        );
    };

    beforeAll(async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        element.limits = { renderCeiling: NODES };
        document.body.appendChild(element);
        await element.updateComplete;
        await vi.waitFor(() => {
            assert.isTrue(element.graph.initialized);
        });
        element.graph.setRenderPath("batched");
        await element.graph.setLayout("random");
        await element.graph.addNodes(Array.from({ length: NODES }, (_, at) => ({ id: `n${String(at)}` })));
        await element.waitForSettled();
        element.graph.engine.stopRenderLoop();
        assert.strictEqual(element.getNodeCount(), NODES);
    });

    afterAll(() => {
        element.remove();
    });

    it("getNodes() and getNodeIds() build no Node; reading an element builds that one", async () => {
        const unbuilt = NODES - built();
        console.log(`[get-nodes-batched] ${String(unbuilt)} of ${String(NODES)} rows have no Node after the load`);

        const nodes = await cost(() => element.getNodes());
        report("getNodes()", nodes);
        assert.strictEqual(nodes.built, 0, "getNodes() builds no Node");

        const ids = await cost(() => element.getNodeIds());
        report("getNodeIds()", ids);
        assert.strictEqual(ids.built, 0, "getNodeIds() builds no Node");

        const array = element.getNodes();
        assert.strictEqual(array.length, NODES);
        const read = await cost(() => array.slice(NODES - SAMPLE));
        report(`reading the last ${String(SAMPLE)} elements`, read);
        assert.strictEqual(read.built, Math.min(SAMPLE, unbuilt), "one Node per element read");

        const scale = unbuilt / read.built;
        report(`the old getNodes(), projected over ${String(unbuilt)} unbuilt rows`, {
            ms: read.ms * scale,
            bytes: read.bytes * scale,
            built: unbuilt,
        });
    });
});
