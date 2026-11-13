/**
 * @file Where an edge's label is drawn, read off a real edge on a real graph.
 *
 * Each test asks for a label through a style layer, the way any consumer does, and then reads the
 * label the edge actually built: the words it draws and where its plane sits against the middle of
 * the line. The placement is read after the graph is laid out again, so it is the position the
 * edge puts the label at on every frame it moves, not only the one it was built with.
 */

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LabelStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { RichTextLabel } from "../../src/meshes/RichTextLabel";
import type { GraphSession } from "../../src/session";

/** Two nodes and the edge between them. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge whose label is measured. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** The words the label is asked to draw. */
const WORDS = "HELLO";

/** How close two world positions must be to count as the same place, in world units. */
const SAME_PLACE = 1e-3;

/** A distance a label is asked to stand off from the line, in world units. */
const OFFSET = 1.5;

describe("an edge's label", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;
    let scale: number;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();
        layerId = undefined;
        scale = 2;

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        // Circular rather than physics, so the nodes do not drift between the readings.
        await graph.setLayout("circular", { scale });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The one edge the element holds.
     * @returns The edge.
     */
    function edgeObject(): Edge {
        const [edge] = Array.from(graph.getDataManager().edges.values());

        assert.isDefined(edge, "the graph holds the one edge");

        return edge;
    }

    /**
     * Where one node is drawn, in world space.
     * @param id - The node id.
     * @returns The position.
     */
    function nodeAt(id: string): Vector3 {
        const node = graph.getNodes().find((candidate) => String(candidate.id) === id);

        assert.isDefined(node, `the graph holds a node called ${id}`);

        return node.mesh.getAbsolutePosition();
    }

    /** The layer the test asked for, so a later step can change its placement. */
    let layerId: string | undefined;

    /**
     * Ask for the label through a layer (or change the one already asked for), lay the graph out
     * again so the edge places the label as it does on every frame it moves, and return where the
     * label sits against the middle of the line.
     * @param style - The label's placement.
     * @returns The label and its plane's position minus the line's middle.
     */
    async function labelFrom(style: LabelStyle): Promise<{ label: RichTextLabel; from: Vector3 }> {
        const set = { "edge.label": WORDS, "edge.labelStyle": style };

        if (layerId === undefined) {
            ({ id: layerId } = await session.styles.add({
                name: "edge words",
                target: "edge",
                selector: { match: "everything" },
                set,
            }));
        } else {
            await session.styles.update(layerId, { set });
        }

        await operationQueueOf(graph).waitForCompletion();
        // A new scale moves both nodes, so the edge has to place its label again.
        scale += 1;
        await graph.setLayout("circular", { scale });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        const { label } = edgeObject();

        assert.isNotNull(label, "a layer that writes words onto an edge builds it a label");
        assert.isNotNull(label.labelMesh, "and the label has a plane in the scene");

        const middle = Vector3.Center(nodeAt("alpha"), nodeAt("omega"));

        return { label, from: label.labelMesh.getAbsolutePosition().subtract(middle) };
    }

    it("draws no label until a layer asks for one", () => {
        assert.isNull(edgeObject().label);
    });

    it("draws the words the layer wrote", async () => {
        const { label } = await labelFrom({});
        const drawn = label.textRuns.map((line) => line.map((run) => run.text).join("")).join("\n");

        assert.strictEqual(drawn, WORDS);
    });

    it("hangs above the middle of the line, touching it, when its style names no location", async () => {
        const unnamed = (await labelFrom({})).from;
        const top = (await labelFrom({ location: "top", attachOffset: 0 })).from;

        assert.isAbove(unnamed.y, SAME_PLACE, `the label is above the middle: ${unnamed.toString()}`);
        assert.closeTo(Vector3.Distance(unnamed, top), 0, SAME_PLACE, "exactly where location top, offset 0 puts it");
    });

    it("hangs above, below, left and right of the middle where its location says", async () => {
        const top = (await labelFrom({ location: "top" })).from;
        const bottom = (await labelFrom({ location: "bottom" })).from;
        const left = (await labelFrom({ location: "left" })).from;
        const right = (await labelFrom({ location: "right" })).from;

        assert.isAbove(top.y, SAME_PLACE, `top is above the middle: ${top.toString()}`);
        assert.isBelow(bottom.y, -SAME_PLACE, `bottom is below the middle: ${bottom.toString()}`);
        assert.isBelow(left.x, -SAME_PLACE, `left is left of the middle: ${left.toString()}`);
        assert.isAbove(right.x, SAME_PLACE, `right is right of the middle: ${right.toString()}`);
        assert.closeTo(top.x, 0, SAME_PLACE, "top stays centered across the line");
        assert.closeTo(left.y, 0, SAME_PLACE, "left stays centered up and down");
    });

    it("moves out by its attachOffset, in world units, from where its location puts it", async () => {
        const touching = (await labelFrom({ location: "top", attachOffset: 0 })).from;
        const clear = (await labelFrom({ location: "top", attachOffset: OFFSET })).from;
        const besideTouching = (await labelFrom({ location: "right", attachOffset: 0 })).from;
        const besideClear = (await labelFrom({ location: "right", attachOffset: OFFSET })).from;

        assert.closeTo(clear.y - touching.y, OFFSET, SAME_PLACE, "the offset lifts a label on top");
        assert.closeTo(clear.x, touching.x, SAME_PLACE, "and does not move it across");
        assert.closeTo(besideClear.x - besideTouching.x, OFFSET, SAME_PLACE, "the offset pushes a label on the right");
        assert.closeTo(besideClear.y, besideTouching.y, SAME_PLACE, "and does not move it up or down");
    });
});
