/**
 * @file The tooltip a layer gives an edge, drawn while the real pointer is over the edge's line.
 *
 * `edge.tooltip` was withdrawn in 2.0 because nothing could tell that the pointer was over a line. The element now
 * reads that on every move (the pointer cursor says a line can be clicked, and a click selects the edge), so the
 * same read puts the edge's tooltip up and takes it down. This file drives the real pointer onto the line's middle,
 * onto a node and off the canvas, and asks the edge what it draws.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import { hover, nextFrame, nodePoint, type Point } from "../helpers/real-input";

/** How wide the canvas is: inside the test frame's viewport, where the real pointer reaches. */
const WIDTH = 400;

/** How tall it is. */
const HEIGHT = 300;

describe("an edge tooltip a layer asks for", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "alpha" }, { id: "omega" }]);
        await graph.addEdges([{ src: "alpha", dst: "omega" }]);
        await graph.setLayout("circular");
        await operationQueueOf(graph).waitForCompletion();
        await graph.getSession().styles.add({
            name: "the edge's tooltip",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.tooltip": "the only edge" },
        });
        await graph.getSession().styles.settled();
        await graph.waitForStableFrame();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The one edge.
     * @returns it
     */
    function edge(): Edge {
        const [only] = [...graph.getDataManager().edges.values()];
        assert.isDefined(only, "the graph holds its edge");
        return only;
    }

    /**
     * The name of the mesh the edge's tooltip is drawn on, or null when it has none (a name, so a failure prints).
     * @returns the name or null
     */
    function tooltipMesh(): string | null {
        const mesh = edge().tooltip?.labelMesh;
        return mesh === undefined || mesh === null || mesh.isDisposed() ? null : mesh.name;
    }

    /**
     * Moves the real pointer and lets the scene hear it.
     * @param at - where, in canvas pixels
     */
    async function pointerTo(at: Point): Promise<void> {
        await hover(graph.canvas, at);
        await graph.waitForStableFrame();
        await nextFrame();
    }

    /**
     * The middle of the edge's line on screen.
     * @returns the point
     */
    function lineMiddle(): Point {
        const a = nodePoint(graph, "alpha");
        const b = nodePoint(graph, "omega");
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    it("is not drawn at rest, and is drawn with its words when the pointer is over the line", async () => {
        assert.isNull(tooltipMesh(), "a tooltip is hover-only");
        assert.strictEqual(edge().tooltipText, "the only edge", "the paint recorded its words");
        await pointerTo(lineMiddle());
        assert.isNotNull(tooltipMesh(), "the pointer over the line drew the edge's tooltip");
        assert.isTrue(edge().tooltip?.labelMesh?.isEnabled() ?? false, "and it is shown");
    });

    it("goes away when the pointer moves onto a node, and when it leaves the canvas", async () => {
        await pointerTo(lineMiddle());
        assert.isNotNull(tooltipMesh());
        await pointerTo(nodePoint(graph, "alpha"));
        assert.isNull(tooltipMesh(), "over a node no line is pointed at");
        await pointerTo(lineMiddle());
        assert.isNotNull(tooltipMesh(), "back over the line");
        await pointerTo({ x: 2, y: 2 });
        assert.isNull(tooltipMesh(), "on empty canvas the tooltip goes");
    });

    it("is not drawn on an edge no layer gave one", async () => {
        const [layer] = graph
            .getSession()
            .styles.list()
            .filter((each) => each.name === "the edge's tooltip");
        assert.isDefined(layer);
        await graph.getSession().styles.remove(layer.id);
        await graph.getSession().styles.settled();
        await pointerTo(lineMiddle());
        assert.isNull(tooltipMesh(), "no words, no tooltip");
    });
});
