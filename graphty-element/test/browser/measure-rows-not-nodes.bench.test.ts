/**
 * @file What box selection, framing, the SVG figure and the 2D/3D switch cost on the `"batched"`
 * render path at a million nodes (issue #8204).
 *
 * The batched path draws most nodes from row tables with no `Node` object. Each of these features
 * used to build a `Node` for every row only to read where it is drawn -- about 8.7 KB of heap and
 * 30 microseconds a row, which stalled or crashed the page at a million nodes. Each now reads the
 * row tables. The correctness of what they answer is `measure-rows-not-nodes.test.ts`.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: the `Node`s each feature builds (none), and that the heap it
 * keeps stays far below one `Node` per row (`KEPT_PER_ROW`). The time each takes is printed as
 * `[measure-rows-not-nodes]`, not asserted.
 *
 * This file gates no push: it runs in the "browser-bench" project.
 */

import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { dataManagerInternals } from "../../src/managers/DataManager";

const NODES = 1_000_000;
/**
 * The most heap a feature may keep per row: a `Node` costs about 8,700 bytes, so a feature under
 * this builds nothing of the sort. The figure keeps its SVG text, about 100 bytes a node.
 */
const KEPT_PER_ROW = 500;

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

describe("measuring rows on the batched path at a million nodes", () => {
    let element: Graphty;
    const built = (): number => dataManagerInternals.nodesBuilt(element.graph.getDataManager());

    /**
     * Run a feature; assert it builds no `Node` and keeps no `Node`'s worth of heap per row.
     * @param what - The feature.
     * @param work - Runs it; what it resolves to is kept alive until the heap is read.
     */
    async function measure(what: string, work: () => Promise<unknown>): Promise<void> {
        const startHeap = await heap();
        const startBuilt = built();
        const start = performance.now();
        const kept = await work();
        const ms = performance.now() - start;
        const bytes = (await heap()) - startHeap;
        const count = built() - startBuilt;
        console.log(
            `[measure-rows-not-nodes] ${what}: ${ms.toFixed(1)} ms, ${(bytes / 1e6).toFixed(1)} MB heap kept, ${String(count)} Nodes built`,
        );
        assert.isDefined(kept);
        assert.strictEqual(count, 0, `${what} builds no Node`);
        assert.isBelow(bytes, NODES * KEPT_PER_ROW, `${what} keeps no Node's worth of heap per row`);
    }

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
        await element.waitForStableFrame();
        assert.strictEqual(element.getNodeCount(), NODES);
        console.log(`[measure-rows-not-nodes] ${String(NODES - built())} of ${String(NODES)} rows have no Node`);
    });

    afterAll(() => {
        element.remove();
    });

    it("box selection builds no Node", async () => {
        await measure("nodesInRect", () =>
            Promise.resolve(element.nodesInRect({ x: 0, y: 0, width: 200, height: 150 })),
        );
    });

    it("framing the whole graph builds no Node", async () => {
        await measure("fitToGraph", () => Promise.resolve(element.graph.resolveCameraPreset("fitToGraph")));
        await measure("zoomToFit", async () => {
            element.zoomToFit();
            await element.waitForStableFrame();
            return element.getCameraState();
        });
    });

    it("the SVG figure builds no Node", async () => {
        await measure("exportFigure", () => element.exportFigure());
    });

    it("the 2D/3D switch builds no Node", async () => {
        await measure("setViewMode 2d", async () => {
            await element.setViewMode("2d");
            await element.waitForStableFrame();
            return element.getCameraState();
        });
        await measure("setViewMode 3d", async () => {
            await element.setViewMode("3d");
            await element.waitForStableFrame();
            return element.getCameraState();
        });
    });
});
