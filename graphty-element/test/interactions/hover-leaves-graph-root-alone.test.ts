/**
 * @file Hovering a node, and reading where a node is on screen, never recomputes the graph root's world matrix
 * (issue #10121). Reading a node's place used Babylon's forced world-matrix compute, which forces the parent too:
 * every hover on the "objects" path recomputed graph-root, which made every node's matrix stale, so the next frame
 * recomputed all of them and the next pick rebuilt every node's bounding box. Hover went 2.4 to 6.3 ms at 10,000
 * nodes. What is asserted is counted work: recomputes of the graph root and the nodes left stale.
 *
 * The hover is made by the browser's own input pipeline (test/helpers/real-input.ts).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { hover, nextFrame } from "../helpers/real-input";

const COUNT = 50;
const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Mount an element holding a row of nodes, drawn as objects.
 * @returns The element, drawn.
 */
async function loaded(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = "objects";
    element.layout = "fixed";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    element.nodeData = Array.from({ length: COUNT }, (_, id) => ({ id, position: { x: id - COUNT / 2, y: 0, z: 0 } }));
    await vi.waitFor(() => {
        assert.strictEqual(element.graph.getNodeCount(), COUNT);
    });
    await operationQueueOf(element.graph).waitForCompletion();
    element.zoomToFit();
    await element.waitForStableFrame();
    return element;
}

/**
 * Count the graph root's world-matrix recomputes while a step runs.
 * @param element - The element.
 * @param step - What to run.
 * @returns How many times the root was recomputed.
 */
async function rootRecomputes(element: Graphty, step: () => Promise<void> | void): Promise<number> {
    const root = element.graph.scene.getTransformNodeByName("graph-root");
    assert.isNotNull(root);
    let count = 0;
    const watch = root.onAfterWorldMatrixUpdateObservable.add(() => {
        count++;
    });
    try {
        await step();
    } finally {
        root.onAfterWorldMatrixUpdateObservable.remove(watch);
    }

    return count;
}

describe("a hover and a screen-position read (#10121)", () => {
    it("reading every node's screen position leaves the graph root and every other node alone", async () => {
        const element = await loaded();
        const nodes = element.graph.getNodes();
        const count = await rootRecomputes(element, () => {
            for (const node of nodes) {
                assert.isDefined(element.nodeScreenPosition(node.id));
            }
        });
        assert.strictEqual(count, 0, "graph root recomputes");
        assert.strictEqual(nodes.filter((node) => !node.mesh.isSynchronized()).length, 0, "nodes left stale");
    });

    it("hovering a node never recomputes the graph root", async () => {
        const element = await loaded();
        const middle = Math.floor(COUNT / 2);
        const spot = element.nodeScreenPosition(middle);
        assert.isDefined(spot);
        const count = await rootRecomputes(element, async () => {
            await hover(element, { x: spot.x, y: spot.y });
            await nextFrame();
            assert.strictEqual(element.session.selection.hovered, middle, "pointing at a node hovers it");
        });
        assert.strictEqual(count, 0, "graph root recomputes");
    });
});
