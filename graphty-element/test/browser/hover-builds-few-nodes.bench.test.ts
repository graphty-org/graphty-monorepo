/**
 * @file What one real pointer hover on a node costs in a large connected graph with arrowed edges, on both render
 * paths, for round and boxed nodes, on a node and on an edge (issue #9166).
 *
 * On the `"batched"` path a row is drawn with no `Node` until something asks for one. An edge used to trim its arrowed
 * end by asking for both ends' `Node`s, so a hover built one `Node`, its edges built their far ends', and so on through
 * the whole connected component (about 8.7 KB of heap and tens of microseconds each); a shape that is not round built
 * every `Node` at load. The correctness of what is built is `batched-hover-builds-few-nodes.test.ts`.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: the `Node`s a batched hover builds stay a handful. The time from the hover to a
 * settled frame and the heap kept are printed as `[hover-builds-few-nodes]`, not asserted.
 *
 * This file gates no push: it runs in the "browser-bench" project.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { hover } from "../helpers/real-input";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const CASES: { path: RenderPath; count: number }[] = [
    { path: "objects", count: 1_000 },
    { path: "objects", count: 10_000 },
    { path: "batched", count: 1_000 },
    { path: "batched", count: 10_000 },
    { path: "batched", count: 100_000 },
];
const SHAPES = ["sphere", "box"] as const;
/** Where the pointer goes: onto the middle node, or onto the middle of the edge it starts. */
const TARGETS = ["node", "edge"] as const;

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

/**
 * A directed chain of nodes on a fixed grid, drawn in 2D with the default arrowheads.
 * @param path - The render path.
 * @param count - How many nodes.
 * @param shape - Their shape.
 * @returns The element.
 */
async function mounted(path: RenderPath, count: number, shape: string): Promise<Graphty> {
    (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.limits = { renderCeiling: count };
    element.style.display = "block";
    element.style.width = "600px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "shape",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": shape, "node.meshDetail": "low" },
    });
    const columns = Math.ceil(Math.sqrt(count));
    await element.session.data.addNodes(
        Array.from({ length: count }, (_, i) => ({
            id: `n${String(i)}`,
            position: { x: (i % columns) * 2, y: Math.floor(i / columns) * 2, z: 0 },
        })),
    );
    await element.session.data.addEdges(
        Array.from({ length: count - 1 }, (_, i) => ({ src: `n${String(i)}`, dst: `n${String(i + 1)}` })),
    );
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

describe("one real hover in a large connected arrowed graph", () => {
    for (const { path, count } of CASES) {
        for (const shape of SHAPES) {
            for (const target of TARGETS) {
                it(`${path}, ${String(count)} ${shape} nodes, on a ${target}`, async () => {
                    const element = await mounted(path, count, shape);
                    const manager = element.graph.getDataManager();
                    const atLoad = dataManagerInternals.nodesBuilt(manager);
                    const middle = `n${String(Math.floor(count / 2))}`;
                    const nextId = `n${String(Math.floor(count / 2) + 1)}`;
                    // Framing the whole graph puts 100,000 nodes about a pixel apart, where the middle of an edge
                    // touches the nodes beside it; frame the hovered pair instead, so where the pointer lands is
                    // unambiguous. The camera reads two positions, so it is counted apart from the hover.
                    await element.zoomToNodes([middle, nextId], { animate: false });
                    await element.waitForStableFrame();
                    const beforeHover = dataManagerInternals.nodesBuilt(manager);
                    const center = element.nodeScreenPosition(middle);
                    const next = element.nodeScreenPosition(nextId);
                    assert.isDefined(center);
                    assert.isDefined(next);
                    const at = target === "node" ? center : { x: (center.x + next.x) / 2, y: (center.y + next.y) / 2 };

                    const startHeap = await heap();
                    const start = performance.now();
                    await hover(element, at);
                    await operationQueueOf(element.graph).waitForCompletion();
                    await element.waitForSettled();
                    await element.waitForStableFrame();
                    await element.waitForStableFrame();
                    const ms = performance.now() - start;
                    const bytes = (await heap()) - startHeap;
                    const builtByHover = dataManagerInternals.nodesBuilt(manager) - beforeHover;
                    console.log(
                        `[hover-builds-few-nodes] ${path} ${String(count)} ${shape} on a ${target}: hover to settled ${ms.toFixed(1)} ms, ` +
                            `${(bytes / 1e6).toFixed(1)} MB heap kept, ${String(atLoad)} Nodes at load, ` +
                            `${String(beforeHover - atLoad)} by the zoom, ${String(builtByHover)} by the hover`,
                    );
                    assert.equal(
                        element.session.selection.hovered,
                        target === "node" ? middle : null,
                        "the hover's target",
                    );
                    if (path === "batched") {
                        assert.isAtMost(
                            beforeHover + builtByHover,
                            4,
                            "a batched zoom and hover build a handful of Nodes",
                        );
                    }
                });
            }
        }
    }
});
