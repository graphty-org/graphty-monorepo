/**
 * @file Counted-work scaling of the 2D/3D switch: `Graph.setViewMode` and `setViewMode` on the
 * element rebuild every node and edge mesh, so on a graph of n and of 4n nodes they may do about
 * 4x the work, not 16x (issue #2895).
 *
 * Each element disposed one at a time takes its mesh, its action manager and its drag handler's
 * observers out of scene-wide lists by a search, so rebuilding them one by one cost the size of
 * the scene per element. Counted, never timed: see `visitsDuring`.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

const SIZES = [100, 400] as const;

/**
 * Wait until every queued operation has run and the pass that derives it has painted it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.graph.getSession().styles.settled();
}

/**
 * Mount a graphty-element with `size` nodes on a path, in 3D, its render loop stopped.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    element.graph.engine.stopRenderLoop();
    await element.graph.setLayout("random");
    await element.graph.addNodes(Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` })));
    await element.graph.addEdges(
        Array.from({ length: size - 1 }, (_, at) => ({ source: `n${String(at)}`, target: `n${String(at + 1)}` })),
    );
    await settled(element);
    element.graph.update();
    return element;
}

/**
 * Assert every node was drawn again: each `Node`'s mesh live and in the scene, and on the
 * `"batched"` path each row with no `Node` drawn by a batch again, with none built for it.
 * @param element - The element.
 * @param size - The node count.
 */
function assertRebuilt(element: Graphty, size: number): void {
    const { scene } = element.graph;
    const live = new Set(scene.meshes);
    const manager = element.graph.getDataManager();
    const nodes = [...dataManagerInternals.builtNodes(manager)];
    assert.isTrue(
        nodes.every((node) => !node.mesh.isDisposed() && live.has(node.mesh)),
        "every node mesh is live and in the scene",
    );
    const rows = element.graph.getNodeBatches()?.columnRowCount ?? 0;
    assert.strictEqual(nodes.length + rows, size, "every row drawn by its Node or a batch");
}

describe("switching between 2D and 3D", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    const cases: [string, (element: Graphty) => Promise<void>][] = [
        ["Graph.setViewMode", (element) => element.graph.setViewMode("2d")],
        ["Graphty.setViewMode", (element) => element.setViewMode("2d")],
    ];

    for (const [name, toTwoD] of cases) {
        it(`${name} does work in proportion to the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const visits = await visitsDuring(() => toTwoD(element));
                        await settled(element);
                        assert.strictEqual(element.graph.getViewMode(), "2d", "the scene is 2D");
                        element.graph.update();
                        assertRebuilt(element, size);
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, growth: "linear", counter: `elements visited by ${name}("2d")` },
            );
        });
    }
});
