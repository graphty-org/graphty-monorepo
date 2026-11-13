/**
 * @file Where the words at each end of an arrow are drawn, read off a real edge on a real graph.
 *
 * Each test asks for the captions through a style layer, the way any consumer does, and then reads
 * the captions the edge actually built: the words each draws and where its plane sits against the
 * arrow cap it belongs to. The placement is read after the graph is laid out again, so it is the
 * position the edge puts each caption at on every frame it moves, not only the one it was built
 * with. Whether the captions reach the pixels, and in the look a layer asks for, is
 * `an-arrow-caption-draws.test.ts`.
 */

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LabelStyle } from "../../src/catalog/types";
import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { RichTextLabel } from "../../src/meshes/RichTextLabel";
import type { GraphSession } from "../../src/session";

/** Two nodes and the edge between them: the smallest graph with two ends to caption. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/** The one edge both captions are measured on. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** The words at the head of the arrow. */
const HEAD = "HEAD";

/** The words at its tail. */
const TAIL = "TAIL";

/** How close two world positions must be to count as the same place, in world units. */
const SAME_PLACE = 1e-3;

/** A distance a caption is asked to stand off from its cap, in world units. */
const OFFSET = 1.5;

/** How far a caption stands off its cap when its style does not say: the element's documented default. */
const DEFAULT_OFFSET = 0.3;

describe("the words at the ends of an arrow", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;
    let scale: number;
    /** The layer the test asked for, so a later step can change its placement. */
    let layerId: string | undefined;

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

    /**
     * The words a caption draws.
     * @param caption - The caption.
     * @returns Its text, one line per line.
     */
    function wordsOf(caption: RichTextLabel): string {
        return caption.textRuns.map((line) => line.map((run) => run.text).join("")).join("\n");
    }

    /**
     * Where a caption's plane sits, in world space.
     * @param caption - The caption, or null when the edge built none.
     * @returns The position.
     */
    function placeOf(caption: RichTextLabel | null): Vector3 {
        assert.isNotNull(caption, "the edge is drawing a caption at this end");
        assert.isNotNull(caption.labelMesh, "and the caption has a plane in the scene");

        return caption.labelMesh.getAbsolutePosition();
    }

    /**
     * Ask for both captions through a layer (or change the one already asked for), lay the graph
     * out again so the edge places them as it does on every frame it moves, and return the edge.
     * @param headStyle - The head caption's placement; the tail caption keeps its defaults.
     * @returns The edge, placed.
     */
    async function captioned(headStyle: LabelStyle): Promise<Edge> {
        const set = {
            "edge.arrowHead": "normal",
            "edge.arrowHeadText": HEAD,
            "edge.arrowHeadTextStyle": headStyle,
            "edge.arrowTail": "normal",
            "edge.arrowTailText": TAIL,
        };

        if (layerId === undefined) {
            ({ id: layerId } = await session.styles.add({
                name: "captions at both ends",
                target: "edge",
                selector: { match: "everything" },
                set,
            }));
        } else {
            await session.styles.update(layerId, { set });
        }

        await operationQueueOf(graph).waitForCompletion();
        // A new scale moves both nodes, so the edge has to place its captions again.
        scale += 1;
        await graph.setLayout("circular", { scale });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        return edgeObject();
    }

    /**
     * Where the head caption sits against the head's arrow cap.
     * @param headStyle - The head caption's placement.
     * @returns The caption's position minus the cap's.
     */
    async function headFromCap(headStyle: LabelStyle): Promise<Vector3> {
        const edge = await captioned(headStyle);

        assert.isNotNull(edge.arrowCap, "the edge draws an arrow cap at its head");

        return placeOf(edge.arrowHeadText).subtract(edge.arrowCap.position);
    }

    it("draws no captions until a layer asks for them", () => {
        const edge = edgeObject();

        assert.isNull(edge.arrowHeadText);
        assert.isNull(edge.arrowTailText);
    });

    it("draws each end's own words, at its own end", async () => {
        const edge = await captioned({});

        assert.isNotNull(edge.arrowHeadText, "the head carries a caption");
        assert.isNotNull(edge.arrowTailText, "the tail carries a caption");
        assert.strictEqual(wordsOf(edge.arrowHeadText), HEAD);
        assert.strictEqual(wordsOf(edge.arrowTailText), TAIL);

        const head = placeOf(edge.arrowHeadText);
        const tail = placeOf(edge.arrowTailText);
        const alpha = nodeAt("alpha");
        const omega = nodeAt("omega");

        assert.isBelow(
            Vector3.Distance(head, omega),
            Vector3.Distance(head, alpha),
            "the head's words are by the target",
        );
        assert.isBelow(
            Vector3.Distance(tail, alpha),
            Vector3.Distance(tail, omega),
            "the tail's words are by the source",
        );
    });

    it("hangs above its cap, a little clear of it, when its style names no placement", async () => {
        const unnamed = await headFromCap({});
        const touching = await headFromCap({ location: "top", attachOffset: 0 });

        assert.closeTo(unnamed.x, 0, SAME_PLACE, "centered across the cap");
        assert.isAbove(unnamed.y, SAME_PLACE, `above the cap: ${unnamed.toString()}`);
        assert.closeTo(unnamed.y - touching.y, DEFAULT_OFFSET, SAME_PLACE, "and clear of it by the default offset");
    });

    it("hangs above, below, left and right of its cap where its location says", async () => {
        const top = await headFromCap({ location: "top" });
        const bottom = await headFromCap({ location: "bottom" });
        const left = await headFromCap({ location: "left" });
        const right = await headFromCap({ location: "right" });

        assert.isAbove(top.y, SAME_PLACE, `top is above the cap: ${top.toString()}`);
        assert.isBelow(bottom.y, -SAME_PLACE, `bottom is below the cap: ${bottom.toString()}`);
        assert.isBelow(left.x, -SAME_PLACE, `left is left of the cap: ${left.toString()}`);
        assert.isAbove(right.x, SAME_PLACE, `right is right of the cap: ${right.toString()}`);
    });

    it("moves out by its attachOffset, in world units, from where its location puts it", async () => {
        const touching = await headFromCap({ location: "top", attachOffset: 0 });
        const clear = await headFromCap({ location: "top", attachOffset: OFFSET });
        const besideTouching = await headFromCap({ location: "right", attachOffset: 0 });
        const besideClear = await headFromCap({ location: "right", attachOffset: OFFSET });

        assert.closeTo(clear.y - touching.y, OFFSET, SAME_PLACE, "the offset lifts a caption on top");
        assert.closeTo(clear.x, touching.x, SAME_PLACE, "and does not move it across");
        assert.closeTo(
            besideClear.x - besideTouching.x,
            OFFSET,
            SAME_PLACE,
            "the offset pushes a caption on the right",
        );
        assert.closeTo(besideClear.y, besideTouching.y, SAME_PLACE, "and does not move it up or down");
    });
});
