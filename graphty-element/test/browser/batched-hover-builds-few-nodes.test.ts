/**
 * @file On the `"batched"` render path a row is drawn with no `Node` until something asks for one. A real pointer
 * hover, a click and a border on one node of a large connected graph with arrowed edges build a `Node` for that node
 * only: the edges around it trim their ends from the rows, and never build their far ends' `Node`s, which used to
 * build every `Node` in the connected component, one edge after the next (issue #9166). Finding the hovered node's
 * edges looks at those edges only, on either render path, never at every built `Edge` (issue #10028).
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { click, hover, type Point } from "../helpers/real-input";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const COUNT = 10_000;
const COLUMNS = 100;
/** The `Node`s an action on one node may build: that node's. */
const FEW = 1;
/** The built `Edge`s a hover may look at to find the hovered node's: its two edges, each asked about a few times. */
const FEW_EDGES = 16;

/**
 * A chain on the batched path, drawn with the default arrowheads, on a fixed grid.
 * @param directed - Whether its edges carry arrowheads.
 * @param shape - The nodes' shape, when not the default sphere.
 * @param edges - What a layer paints on every edge, if anything.
 * @param count - How many nodes.
 * @param view - The view mode.
 * @param path - The render path.
 * @returns The element.
 */
async function mounted(
    directed: boolean,
    shape?: string,
    edges?: Record<string, unknown>,
    count = COUNT,
    view: "2d" | "3d" = "2d",
    path: RenderPath = "batched",
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.directed = directed;
    element.style.display = "block";
    element.style.width = "600px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    await operationQueueOf(element.graph).waitForCompletion();
    if (shape !== undefined) {
        await element.session.styles.add({
            name: "shape",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": shape },
        });
    }

    if (edges !== undefined) {
        await element.session.styles.add({
            name: "edges",
            target: "edge",
            selector: { match: "everything" },
            set: edges,
        });
    }

    await element.session.data.addNodes(
        Array.from({ length: count }, (_, i) => ({
            id: `n${String(i)}`,
            flagged: `n${String(i)}` === middleOf(count),
            position: { x: (i % COLUMNS) * 2, y: Math.floor(i / COLUMNS) * 2, z: 0 },
        })),
    );
    await element.session.data.addEdges(
        Array.from({ length: count - 1 }, (_, i) => ({ src: `n${String(i)}`, dst: `n${String(i + 1)}` })),
    );
    await element.graph.setLayout("fixed", { dim: view === "2d" ? 2 : 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * The node in the middle of a chain's grid.
 * @param count - How many nodes the chain has.
 * @returns Its id.
 */
function middleOf(count: number): string {
    return `n${String(count / 2 + COLUMNS / 2)}`;
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
 * The built `Edge`s looked at so far to find a node's built edges.
 * @param element - The element.
 * @returns The count.
 */
function walked(element: Graphty): number {
    return dataManagerInternals.edgesWalkedByEnd(element.graph.getDataManager());
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
    const middle = middleOf(element.getNodeCount());
    const at = element.nodeScreenPosition(middle);
    assert.isDefined(at);
    await hover(element, at);
    await drawn(element);
    assert.equal(element.session.selection.hovered, middle, "the hover reached the node");
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
        assert.deepEqual([...element.session.selection.nodes], [middleOf(COUNT)], "the click selected it");
        assert.isAtMost(built(element), FEW, "the click");
    });

    // the hovered node's edges are found from the store's incidence lists: filing every built Edge under its ends on
    // the first hover took half a second on a 100,000-node graph with a million arrowed edges (issue #10028)
    it.each(["batched", "objects"] as const)(
        "a first real hover looks at the hovered node's edges only (%s)",
        async (path) => {
            const element = await mounted(true, undefined, undefined, COUNT, "2d", path);
            const before = walked(element);
            const middle = middleOf(COUNT);
            const at = element.nodeScreenPosition(middle);
            assert.isDefined(at);

            await hover(element, at);
            await drawn(element);
            assert.equal(element.session.selection.hovered, middle, "the hover reached the node");
            assert.isAtMost(walked(element) - before, FEW_EDGES, "the built edges looked at");
        },
    );

    // a shape that is not round is trimmed by its box, its outline or a ray, never a radius
    it.each(["box", "cylinder", "star"])("a load and a real hover of %s nodes", async (shape) => {
        const element = await mounted(true, shape);
        assert.equal(built(element), 0, "the load builds no Node");

        await hoverMiddle(element);
    });

    // a line with no arrowhead drawn as an Edge (a label, a dash) or along a curve starts at its ends' outlines; 2,000
    // nodes, as 10,000 edge labels take minutes to draw in software
    it.each([{ "edge.label": "e" }, { "edge.style": "dash" }, { "edge.curvature": true }, { "edge.route": "arc" }])(
        "a real hover with undirected edges set %o",
        async (set) => {
            const element = await mounted(false, undefined, set, 2_000);
            assert.equal(built(element), 0, "the load builds no Node");
            await hoverMiddle(element);
        },
    );

    // every pointer move that misses a node measures the edges under it, and a click or `elementAt` there measures
    // every edge: each must read the edges' ends from their rows, not build their Nodes
    it.each(["2d", "3d"] as const)("a real hover and a click on an edge, and on empty canvas (%s)", async (view) => {
        const element = await mounted(true, undefined, undefined, COUNT, view);
        assert.equal(built(element), 0, "the load builds no Node");
        const middle = Number(middleOf(COUNT).slice(1));
        const a = element.nodeScreenPosition(`n${String(middle)}`);
        const b = element.nodeScreenPosition(`n${String(middle + 1)}`);
        assert.isDefined(a);
        assert.isDefined(b);
        const onEdge = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

        await hover(element, onEdge);
        await drawn(element);
        assert.isNull(element.session.selection.hovered, "the hover is on the edge, not a node");
        assert.equal(element.elementAt(onEdge)?.kind, "edge", "an edge is under the pointer");
        assert.equal(built(element), 0, "the hover and elementAt on the edge");

        await click(element, onEdge);
        await drawn(element);
        assert.equal(built(element), 0, "the click on the edge");

        // the canvas's corner, outside the framed grid
        const empty = { x: 3, y: 3 };
        await hover(element, empty);
        await drawn(element);
        assert.isNull(element.elementAt(empty), "nothing is under the empty point");
        await click(element, empty);
        await drawn(element);
        assert.equal(built(element), 0, "the hover and click on empty canvas");
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
