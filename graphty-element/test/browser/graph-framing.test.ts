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

    it("keeps only the corners of the box it framed, not one spot per node", async () => {
        const element = await mounted();
        await framed(element);
        // The spot list holds a Vector3 per node (97 MiB at a million nodes); the box kept after the
        // fit is read only for its corners, to tell whether a repaint moved the extent.
        const { fittedBox } = element.graph.getUpdateManager() as unknown as { fittedBox: object | undefined };
        assert.isDefined(fittedBox, "the fit kept its box");
        assert.sameMembers(Object.keys(fittedBox), ["min", "max"]);
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

    it("frames a fixed box edge to edge whatever the nodes' extent", async () => {
        const element = await mounted();
        // a box twice the centers' box each way, as tall as the canvas's shape: the nodes fill its middle half
        await element.session.config.set({
            framing: { extent: "centers", padding: 0, box: { min: [-200, -150], max: [200, 150] } },
        });
        const { a, b } = await framed(element);
        assert.closeTo(a.x, WIDTH / 4, 1, "a's center is a quarter in from the left");
        assert.closeTo(b.x, (WIDTH * 3) / 4, 1, "b's center is a quarter in from the right");
        assert.closeTo((a.y + b.y) / 2, HEIGHT / 2, 1, "the box is centered up and down");
    });
});

/** A Pajek drawing: four vertices inside the file's 0..1 square, which Pajek frames whatever the vertices' extent. */
const PAJEK = [
    "*Vertices 4",
    '1 "a" 0.2 0.2',
    '2 "b" 0.8 0.2',
    '3 "c" 0.8 0.8',
    '4 "d" 0.2 0.8',
    "*Edges",
    "1 2",
    "2 3",
    "3 4",
    "4 1",
].join("\n");

/**
 * Load the Pajek drawing as the graphty app's file styles do, framed as Pajek frames it.
 * @param element - The element.
 */
async function loadPajek(element: Graphty): Promise<void> {
    await element.loadFromFile(new File([PAJEK], "square.net"), {
        replace: true,
        styles: "file",
        layout: "recommended",
        styleOptions: { framing: "file" },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Where every node's center is drawn after a fit, as a box in CSS pixels.
 * @param element - The element.
 * @returns The box of the node centers on screen.
 */
async function fittedCenters(element: Graphty): Promise<{ left: number; right: number; top: number; bottom: number }> {
    element.zoomToFit();
    await element.waitForStableFrame();
    const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const id of ["1", "2", "3", "4"]) {
        const at = element.graph.nodeScreenPosition(id);
        assert.isDefined(at, `node ${id} is drawn`);
        box.left = Math.min(box.left, at.x);
        box.right = Math.max(box.right, at.x);
        box.top = Math.min(box.top, at.y);
        box.bottom = Math.max(box.bottom, at.y);
    }

    return box;
}

/**
 * Assert the fit framed the nodes: their centers fill the canvas's middle, not a corner of an old box.
 * @param box - The node centers' box on screen.
 */
function assertFramesNodes(box: { left: number; right: number; top: number; bottom: number }): void {
    // padding 0 fits the centers to the canvas's edge: within a pixel of it
    assert.isAtLeast(box.left, -1, "every node is on the canvas");
    assert.isAtMost(box.right, WIDTH + 1, "every node is on the canvas");
    assert.isAtLeast(box.top, -1, "every node is on the canvas");
    assert.isAtMost(box.bottom, HEIGHT + 1, "every node is on the canvas");
    assert.closeTo((box.left + box.right) / 2, WIDTH / 2, WIDTH / 10, "the nodes are centered across");
    assert.closeTo((box.top + box.bottom) / 2, HEIGHT / 2, HEIGHT / 10, "the nodes are centered up and down");
    assert.isAbove(box.bottom - box.top, HEIGHT / 2, "the nodes fill the canvas, not a corner of it");
}

describe("a file's fixed framing box", () => {
    it("frames the file's square while its positions are drawn, and the nodes once another layout runs", async () => {
        const element = await mounted();
        await loadPajek(element);
        assert.isDefined(element.session.config.framing?.box, "the load framed Pajek's square");
        // The square 0..1 is framed edge to edge across the shorter side: 0.2..0.8 fills its middle 60%.
        const own = await fittedCenters(element);
        assert.closeTo(own.bottom - own.top, HEIGHT * 0.6, 2, "the file's square fills the canvas's shorter side");

        await element.setLayout("circular", { dim: 2 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assertFramesNodes(await fittedCenters(element));
    });

    it("frames the square drawn at the file's scale, and the same file loaded unstyled spreads (issue #1171)", async () => {
        // Each square side is 0.6 file units. Styled, the load gives the fixed layout the file's scale, so the
        // spacing spread stays off and the nodes sit inside the box framed at that scale.
        const element = await mounted();
        await loadPajek(element);
        const gap = (): number => {
            const a = element.graph.getNode("1")?.getPosition();
            const b = element.graph.getNode("2")?.getPosition();
            assert.isDefined(a, "node 1 is drawn");
            assert.isDefined(b, "node 2 is drawn");
            return Math.abs(b.x - a.x);
        };
        const box = element.session.config.framing?.box;
        assert.isDefined(box, "the load framed Pajek's square");
        assert.closeTo(gap(), 0.6 * (box.max[0] - box.min[0]), 1e-3, "the nodes are drawn at the box's scale");

        // Unstyled, nothing sets a scale or a box: the spacing spread draws the 0.6 side three node widths long.
        await element.loadFromFile(new File([PAJEK], "square.net"), {
            replace: true,
            layout: "recommended",
            styles: "none",
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isUndefined(element.session.config.framing?.box, "no box frames the unstyled load");
        assert.closeTo(gap(), 3, 1e-3, "the unit-spaced square is spread to the spacing");
        assertFramesNodes(await fittedCenters(element));
    });

    it("is dropped by a load that does not frame as its file does", async () => {
        const element = await mounted();
        await loadPajek(element);
        assert.isDefined(element.session.config.framing?.box, "the load framed Pajek's square");

        await element.loadFromFile(new File([PAJEK], "square.net"), {
            replace: true,
            layout: "recommended",
            styles: "none",
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.isUndefined(element.session.config.framing?.box, "the new graph is not framed by the last file's box");
        assertFramesNodes(await fittedCenters(element));
    });
});
