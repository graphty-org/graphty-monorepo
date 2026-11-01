/**
 * @file The project setting `framing` (issue #5367): how zoom-to-fit frames the graph. By default every node is framed
 * whole; `extent: "centers"` with a `padding` fits the node centers alone into the canvas, `padding` CSS pixels in from
 * its shorter side and the same share in from its longer one, as sigma.js frames a graph.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const WIDTH = 480;
const HEIGHT = 360;
const PADDING = 30;

/** Two big nodes 200 apart across and 100 apart up: the centers' box is wider than the canvas's shape. */
const NODES = [
    { id: "a", position: { x: -100, y: -50, z: 0 } },
    { id: "b", position: { x: 100, y: 50, z: 0 } },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted 2D element holding the two nodes, drawn big.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "big nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 40 },
    });
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Frame the graph and read where each node is drawn on the canvas.
 * @param element - The element.
 * @returns Each node's center and box on screen, in CSS pixels.
 */
async function framed(
    element: Graphty,
): Promise<Record<string, { x: number; y: number; left: number; right: number; top: number; bottom: number }>> {
    element.zoomToFit();
    await element.waitForStableFrame();
    return Object.fromEntries(
        NODES.map(({ id }) => {
            const at = element.graph.nodeScreenPosition(id);
            assert.isDefined(at, `node ${id} is drawn`);
            return [id, { x: at.x, y: at.y, ...at.bounds }];
        }),
    );
}

describe("the framing setting", () => {
    it("frames every node whole by default", async () => {
        const element = await mounted();
        assert.isUndefined(element.session.config.framing);
        const { a, b } = await framed(element);
        assert.isAtLeast(a.left, 0, "a is whole on screen");
        assert.isAtMost(b.right, WIDTH, "b is whole on screen");
    });

    it("fits the node centers padding pixels in, and frames again when the setting changes", async () => {
        const element = await mounted();
        const before = await framed(element);

        await element.session.config.set({ framing: { extent: "centers", padding: PADDING } });
        const { a, b } = await framed(element);
        // The canvas less PADDING at each end of its shorter side (360 - 60 = 300 of 360) is 400 of its 480 px across,
        // which the centers' box, twice as wide as tall, fills from side to side: 40 px in from each side.
        const inset = (WIDTH * PADDING) / HEIGHT;
        assert.closeTo(a.x, inset, 1, "a's center is the padding's share in from the left");
        assert.closeTo(b.x, WIDTH - inset, 1, "b's center is the padding's share in from the right");
        assert.closeTo((a.y + b.y) / 2, HEIGHT / 2, 1, "the centers' box is centered up and down");
        assert.isBelow(a.left, 0, "a big node at the edge runs past the canvas, as sigma.js draws it");
        assert.isAbove(b.x - a.x, before.b.x - before.a.x, "the graph is drawn larger than when framed whole");

        await element.session.config.set({ framing: undefined });
        const back = await framed(element);
        assert.closeTo(back.a.x, before.a.x, 1, "the element's own framing is back");
    });
});
