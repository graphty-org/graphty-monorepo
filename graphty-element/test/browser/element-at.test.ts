/**
 * @file `element.elementAt({ x, y })` answers what a click at that point would select. Each test
 * takes a grid of points across the element, asks `elementAt` at each, clicks it with the real
 * mouse, and compares the answer with the selection the click made, in 2D and in 3D.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

// Inside the test frame's 414-pixel-wide viewport: a point outside it receives no click.
const WIDTH = 400;
const HEIGHT = 200;

// A numeric id 0 is falsy: it catches code that tests the id for truthiness.
const NODES = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: 6, y: 0, z: 0 } },
    { id: 0, position: { x: 3, y: 4, z: 0 } },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding three nodes at fixed places, drawn.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    const { graph } = element;
    await operationQueueOf(graph).waitForCompletion();
    await graph.addNodes(NODES);
    await graph.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: 0 },
    ]);
    await graph.setLayout("fixed", { dim: 3 });
    await graph.setViewMode(viewMode);
    await operationQueueOf(graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node's center is drawn, in CSS pixels from the element's top-left corner.
 * @param element - The element.
 * @param id - The node.
 * @returns The point.
 */
function centerOf(element: Graphty, id: string | number): { x: number; y: number } {
    const mesh = element.graph.getNodeMesh(String(id));
    assert.isNotNull(mesh, `node ${String(id)} has a mesh`);
    return element.worldToScreen(mesh.getAbsolutePosition());
}

/**
 * Read `elementAt` at a point, click there, and read what the click selected.
 *
 * No hover first: `elementAt` picks from the point it is given, not from where the mouse is, and
 * the click moves the mouse to the point itself. A hover per point doubled the driver round trips
 * and made the grid test take over a third of the test budget.
 * @param element - The element.
 * @param point - The point, in CSS pixels from the element's top-left corner.
 * @returns The id `elementAt` gave (or null) and the id the click selected (or null).
 */
async function answerAndClick(
    element: Graphty,
    point: { x: number; y: number },
): Promise<{ answered: string | number | null; selected: string | number | null }> {
    const hit = element.elementAt(point);
    if (hit !== null) {
        assert.strictEqual(hit.kind, "node", "only nodes are found today");
    }

    // The points differ, so no two clicks in a row make a double-click. A copy: the browser driver
    // rescales a `position` in place to the test frame's zoom.
    await userEvent.click(element, { position: { ...point } });
    return { answered: hit?.id ?? null, selected: element.getSelectedNode()?.id ?? null };
}

describe.each(["2d", "3d"] as const)("elementAt in %s", (viewMode) => {
    it("names the node drawn at each node's center, with its id as loaded", async () => {
        const element = await mounted(viewMode);

        for (const { id } of NODES) {
            assert.deepStrictEqual(element.elementAt(centerOf(element, id)), { kind: "node", id });
        }

        assert.isNull(element.elementAt({ x: 2, y: 2 }), "the corner is empty canvas");
    });

    it("returns the node a click at the same point selects, across the whole element", async () => {
        const element = await mounted(viewMode);
        const points = NODES.map(({ id }) => centerOf(element, id));
        for (let y = 20; y < HEIGHT; y += 40) {
            for (let x = 20; x < WIDTH; x += 40) {
                points.push({ x, y });
            }
        }

        let nodes = 0;
        let empty = 0;
        for (const point of points) {
            const { answered, selected } = await answerAndClick(element, point);
            assert.strictEqual(answered, selected, `at (${String(point.x)}, ${String(point.y)})`);
            if (answered === null) {
                empty++;
            } else {
                nodes++;
            }
        }

        assert.isAtLeast(nodes, NODES.length, "some points landed on nodes");
        assert.isAtLeast(empty, 1, "some points landed on empty canvas");
    });
});
