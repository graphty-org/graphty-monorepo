/**
 * @file What a second data source costs an element at 100,000 nodes and 1,000,000 edges, on both
 * render paths: the first source loaded, then one percent more merged in, with the time each took,
 * the JavaScript heap the page kept, and, on `"batched"`, whether the graph store let its builder go
 * again after the second source (a held builder is a second copy of the whole graph). Printed as
 * `[multi-source]` lines, never asserted beyond the graph each load made.
 *
 * Run with: npx vitest run --project=browser-bench test/browser/multi-source-scale.bench.test.ts
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { GraphStore } from "../../src/data/GraphStore";
import { operationQueueOf } from "../../src/Graph";

const NODES = 100_000;
const EDGES = 1_000_000;
/** The second source: one percent of the graph, half of its nodes shared with the first. */
const MORE_NODES = NODES / 100;
const MORE_EDGES = EDGES / 100;
/** The first source, so both together stay inside the objects path's ceilings. */
const FIRST_NODES = NODES - MORE_NODES;
const FIRST_EDGES = EDGES - MORE_EDGES;
/** A safety limit, not a budget: the objects path builds an object per node and edge. */
const TIMEOUT_MS = 1_800_000;

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * A CSV edge list.
 * @param nodes - How many nodes.
 * @param edges - How many edges.
 * @param first - The first node's number.
 * @returns The text.
 */
function edgeList(nodes: number, edges: number, first: number): string {
    const lines = ["source,target"];
    for (let at = 0; at < edges; at++) {
        lines.push(`n${String((at % nodes) + first)},n${String(((at * 7 + 1) % nodes) + first)}`);
    }

    return lines.join("\n");
}

/**
 * The page's JavaScript heap after a collection.
 * @returns Megabytes.
 */
function heapMb(): number {
    (globalThis as { gc?: () => void }).gc?.();
    const { memory } = performance as unknown as { memory?: { usedJSHeapSize: number } };
    return Math.round((memory?.usedJSHeapSize ?? 0) / 2 ** 20);
}

/**
 * Wait until the element has finished the work a load queued.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

describe("two data sources at 100k nodes and 1M edges", { timeout: TIMEOUT_MS }, () => {
    for (const path of ["batched", "objects"] as const) {
        it(`on ${path}`, async () => {
            const element = document.createElement("graphty-element");
            element.renderer = "webgl";
            element.renderPath = path;
            element.layout = "fixed";
            element.style.display = "block";
            element.style.width = "400px";
            element.style.height = "300px";
            document.body.appendChild(element);
            const heap0 = heapMb();
            let start = performance.now();
            await element.session.data.import({
                type: "csv",
                config: { data: edgeList(FIRST_NODES, FIRST_EDGES, 0) },
                name: "a.csv",
            });
            await settled(element);
            const firstMs = performance.now() - start;
            const heap1 = heapMb();
            start = performance.now();
            await element.session.data.import(
                {
                    type: "csv",
                    config: { data: edgeList(MORE_NODES, MORE_EDGES, FIRST_NODES - MORE_NODES / 2) },
                    name: "b.csv",
                },
                { mode: "merge" },
            );
            await settled(element);
            const secondMs = performance.now() - start;
            const heap2 = heapMb();
            const { store } = element.graph.getDataManager() as unknown as { store: GraphStore };
            const row = {
                path,
                firstMs: Math.round(firstMs),
                secondMs: Math.round(secondMs),
                heapMb: [heap0, heap1, heap2],
                builder: store.builderRelease,
            };
            console.log(`[multi-source] ${JSON.stringify(row)}`);
            assert.strictEqual(element.session.data.snapshot().edgeCount, EDGES);
        });
    }
});
