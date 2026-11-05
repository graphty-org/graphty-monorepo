/**
 * @file The 3D `fitToGraph` distance (issue #5349): framing one big node with `extent: "drawn"`
 * puts every corner of its drawn box inside the viewport, whatever the canvas aspect and whether
 * the node is tall or wide. Read through the public API, `nodeScreenPosition().bounds`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const SHAPES = {
    round: { "node.size": 40 },
    tall: { "node.width": 10, "node.height": 60, "node.depth": 10 },
    wide: { "node.width": 60, "node.height": 10, "node.depth": 10 },
} as const;

/**
 * A mounted 3D element holding one big node (a sphere, or a box of the given proportions) at the origin, and a small
 * node beside it so the graph is more than the one node.
 * @param width - The canvas width in CSS pixels.
 * @param height - The canvas height in CSS pixels.
 * @param shape - The node's proportions.
 * @param withNeighbour - Whether to add the small node; without it the load-time fit frames the big one alone.
 * @returns The element.
 */
async function mounted(
    width: number,
    height: number,
    shape: keyof typeof SHAPES,
    withNeighbour = true,
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(width)}px`;
    element.style.height = `${String(height)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "big box",
        target: "node",
        selector: { match: "ids", nodes: ["big"] },
        set: shape === "round" ? SHAPES.round : { "node.shape": "box", ...SHAPES[shape] },
    });
    await element.session.data.addNodes([
        { id: "big", position: { x: 0, y: 0, z: 0 } },
        ...(withNeighbour ? [{ id: "small", position: { x: 200, y: 0, z: 0 } }] : []),
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("3D fitToGraph keeps the whole framed box on screen (#5349)", () => {
    const sizes = [
        [480, 360],
        [360, 480],
        [640, 240],
        [240, 640],
    ] as const;

    for (const [width, height] of sizes) {
        for (const shape of ["round", "tall", "wide"] as const) {
            it(`a ${shape} node in a ${String(width)} x ${String(height)} view`, async () => {
                const element = await mounted(width, height, shape);

                await element.zoomToNodes("big", { animate: false, extent: "drawn" });
                await element.waitForStableFrame();
                assertWhole(element, width, height);
            });

            it(`the load-time fit of a lone ${shape} node in a ${String(width)} x ${String(height)} view`, async () => {
                const element = await mounted(width, height, shape, false);
                assertWhole(element, width, height);
            });
        }
    }
});

/**
 * Assert that the big node's drawn box is inside the view and fills a good share of it.
 * @param element - The element.
 * @param width - The canvas width.
 * @param height - The canvas height.
 */
function assertWhole(element: Graphty, width: number, height: number): void {
    const at = element.graph.nodeScreenPosition("big");
    assert.isDefined(at, "the node is drawn");
    const { left, top, right, bottom } = at.bounds;
    const where = `left ${left.toFixed(1)} top ${top.toFixed(1)} right ${right.toFixed(1)} bottom ${bottom.toFixed(1)}`;
    assert.isAtLeast(left, -0.5, `left edge in view: ${where}`);
    assert.isAtLeast(top, -0.5, `top edge in view: ${where}`);
    assert.isAtMost(right, width + 0.5, `right edge in view: ${where}`);
    assert.isAtMost(bottom, height + 0.5, `bottom edge in view: ${where}`);

    // Framed, not lost in the distance: the node fills a good share of one side.
    const share = Math.max((right - left) / width, (bottom - top) / height);
    assert.isAbove(share, 0.4, `the node fills the view: ${where}`);
}
