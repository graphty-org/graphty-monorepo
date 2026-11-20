/**
 * @file On the `"batched"` render path a row is drawn with no `Node` until something asks for one. A real pointer
 * hover, a click and a border on one node of a large connected graph with arrowed edges build a `Node` for that node
 * only: the edges around it trim their ends from the rows, and never build their far ends' `Node`s, which used to
 * build every `Node` in the connected component, one edge after the next (issue #9166).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { click, hover, type Point } from "../helpers/real-input";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const COUNT = 10_000;
const COLUMNS = 100;
const MIDDLE = 5_050;
/** The `Node`s an action on one node may build: that node's. */
const FEW = 1;

/**
 * A 10,000-node chain on the batched path, drawn with the default arrowheads, on a fixed grid.
 * @param directed - Whether its edges carry arrowheads.
 * @param shape - The nodes' shape, when not the default sphere.
 * @returns The element.
 */
async function mounted(directed: boolean, shape?: string): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = "batched";
    element.directed = directed;
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
    if (shape !== undefined) {
        await element.session.styles.add({
            name: "shape",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": shape },
        });
    }

    await element.session.data.addNodes(
        Array.from({ length: COUNT }, (_, i) => ({
            id: `n${String(i)}`,
            flagged: i === MIDDLE,
            position: { x: (i % COLUMNS) * 2, y: Math.floor(i / COLUMNS) * 2, z: 0 },
        })),
    );
    await element.session.data.addEdges(
        Array.from({ length: COUNT - 1 }, (_, i) => ({ src: `n${String(i)}`, dst: `n${String(i + 1)}` })),
    );
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * The `Node`s built so far.
 * @param element - The element.
 * @returns The count.
 */
function built(element: Graphty): number {
    return dataManagerInternals.nodesBuilt(element.graph.getDataManager());
}

/**
 * Let the frames that follow an action draw: the walk over the edges a new `Node` touches runs in them.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForSettled();
    for (let frame = 0; frame < 4; frame++) {
        await element.waitForStableFrame();
    }
}

/**
 * Move the pointer onto the middle node, with real input, and check that it built that node's `Node` and no other.
 * @param element - The element.
 * @returns Where the node is on the page.
 */
async function hoverMiddle(element: Graphty): Promise<Point> {
    const at = element.nodeScreenPosition(`n${String(MIDDLE)}`);
    assert.isDefined(at);
    await hover(element, at);
    await drawn(element);
    assert.equal(element.session.selection.hovered, `n${String(MIDDLE)}`, "the hover reached the node");
    assert.isAtMost(built(element), FEW, "the hover");
    return at;
}

describe("one node acted on in a 10,000-node connected batched graph builds that node's Node, not its component", () => {
    it.each([true, false])("a real hover, then a click (directed %s)", async (directed) => {
        const element = await mounted(directed);
        assert.equal(built(element), 0, "the load builds no Node");

        const at = await hoverMiddle(element);

        await click(element, at);
        await drawn(element);
        assert.deepEqual([...element.session.selection.nodes], [`n${String(MIDDLE)}`], "the click selected it");
        assert.isAtMost(built(element), FEW, "the click");
    });

    // a shape that is not round is trimmed by its box, its outline or a ray, never a radius
    it.each(["box", "cylinder", "star"])("a load and a real hover of %s nodes", async (shape) => {
        const element = await mounted(true, shape);
        assert.equal(built(element), 0, "the load builds no Node");

        await hoverMiddle(element);
    });

    it("a border on one node", async () => {
        const element = await mounted(true);
        assert.equal(built(element), 0, "the load builds no Node");
        // a border is drawn by a Node, so the flagged node gets one
        await element.session.styles.add({
            name: "border",
            target: "node",
            selector: { match: "expression", where: "data.flagged == `true`" },
            set: { "node.borderWidth": 0.3, "node.borderColor": "#ff0000" },
        });
        await drawn(element);
        assert.isAtMost(built(element), FEW);
    });
});
