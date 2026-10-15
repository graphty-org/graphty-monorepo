/**
 * @file Counted-work scaling of a restyle that gives every node a new mesh: a style layer that
 * changes every node's shape, drawn by the next frame, runs on a graph of n and of 4n nodes and may
 * do no more than 4x the work, not 16x (issue #2749).
 *
 * Each node rebuilt disposes its old mesh, its action manager and its drag handler, and Babylon
 * takes each of those out of scene-wide lists one search at a time, so rebuilding them one by one
 * cost the size of the scene per node. Counted, never timed: see `visitsDuring`.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
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
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped.
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
 * The shapes every node is drawn with.
 * @param element - The element.
 * @returns The distinct shape types.
 */
function shapes(element: Graphty): Set<string | undefined> {
    return new Set([...element.graph.getDataManager().nodes.values()].map((node) => node.shapeType));
}

describe("restyling every node's shape", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    it("does work in proportion to the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const element = await mount(size);
                try {
                    assert.notDeepEqual([...shapes(element)], ["box"], "the nodes start as something else");
                    await element.graph.getSession().styles.add({
                        name: "boxes",
                        target: "node",
                        selector: { match: "everything" },
                        set: { "node.shape": "box" },
                    });
                    await settled(element);
                    // The frame is what rebuilds the meshes the pass repainted.
                    const visits = await visitsDuring(() => {
                        element.graph.update();
                    });
                    assert.deepStrictEqual([...shapes(element)], ["box"], "every node was rebuilt as a box");
                    const nodes = [...element.graph.getDataManager().nodes.values()];
                    assert.isTrue(
                        nodes.every(
                            (node) => !node.mesh.isDisposed() && element.graph.scene.meshes.includes(node.mesh),
                        ),
                        "every new mesh is live and in the scene",
                    );
                    return visits;
                } finally {
                    element.remove();
                }
            },
            { sizes: SIZES, growth: "linear", counter: "elements visited by the frame that rebuilds every node" },
        );
    });
});
