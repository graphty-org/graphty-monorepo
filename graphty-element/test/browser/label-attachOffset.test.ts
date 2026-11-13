/**
 * @file How far a label stands off what it labels, read off real nodes and edges on a real graph.
 *
 * Each test asks for labels through a style layer, the way any consumer does, with a `location`
 * and an `attachOffset`, and then reads where the element actually put each label's plane: against
 * its node, the middle of its edge, or the arrow cap at the edge's tail. The graph is laid out again
 * before every reading, so it is the place the element puts the label on every frame it moves, not
 * only the one it was built with. The edge label at top and right and the head caption are measured
 * in `Edge.label.test.ts` and `Edge.arrowText.test.ts`; this file covers every other location.
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

/** The one edge whose labels are measured. */
const EDGES = [{ src: "alpha", dst: "omega" }];

/** The words every label draws. */
const WORDS = "HI";

/** How close two world positions must be to count as the same place, in world units. */
const SAME_PLACE = 1e-3;

/** A distance a label is asked to stand off, in world units. */
const OFFSET = 1.5;

/** Which way, across (x) and up (y), each location beside a node puts its label. */
const BESIDE: Record<string, { x: number; y: number }> = {
    top: { x: 0, y: 1 },
    bottom: { x: 0, y: -1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    "top-left": { x: -1, y: 1 },
    "top-right": { x: 1, y: 1 },
    "bottom-left": { x: -1, y: -1 },
    "bottom-right": { x: 1, y: -1 },
};

/** Which side of its node, across (x) and up (y), each location inside a node puts its label against. */
const INSIDE: Record<string, { x: number; y: number }> = {
    "inside-top": { x: 0, y: 1 },
    "inside-bottom": { x: 0, y: -1 },
    "inside-left": { x: -1, y: 0 },
    "inside-right": { x: 1, y: 0 },
    "inside-top-left": { x: -1, y: 1 },
    "inside-bottom-right": { x: 1, y: -1 },
};

/** A node size big enough that a label inside it has room to move in from its side. */
const ROOMY = 12;

describe("a label's attachOffset", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;
    let scale: number;
    /** The layer the test asked for on each target, so a later step can change it. */
    let layerIds: Partial<Record<"node" | "edge", string>>;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        session = graph.getSession();
        layerIds = {};
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
     * Ask for a style through a layer (or change the one already asked for), then lay the graph out
     * again so every label is placed as it is on every frame its owner moves.
     * @param target - Whether the layer styles nodes or edges.
     * @param set - The channels it writes.
     */
    async function styled(target: "node" | "edge", set: Record<string, unknown>): Promise<void> {
        const existing = layerIds[target];

        if (existing === undefined) {
            ({ id: layerIds[target] } = await session.styles.add({
                name: `${target} labels`,
                target,
                selector: { match: "everything" },
                set,
            }));
        } else {
            await session.styles.update(existing, { set });
        }

        await operationQueueOf(graph).waitForCompletion();
        // A new scale moves both nodes, so every label has to be placed again.
        scale += 1;
        await graph.setLayout("circular", { scale });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    }

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
     * Where a label's plane sits, in world space.
     * @param label - The label, or null/undefined when none was built.
     * @returns The position.
     */
    function placeOf(label: RichTextLabel | null | undefined): Vector3 {
        assert.exists(label, "a label was built");
        assert.exists(label.labelMesh, "and it has a plane in the scene");
        label.labelMesh.computeWorldMatrix(true);

        return label.labelMesh.getAbsolutePosition();
    }

    /**
     * Where node alpha's label sits against node alpha.
     * @param style - The label's placement.
     * @param size - The node's size.
     * @returns The label's position minus the node's.
     */
    async function nodeLabelFrom(style: LabelStyle, size = 1): Promise<Vector3> {
        await styled("node", { "node.label": WORDS, "node.labelStyle": style, "node.size": size });
        const node = graph.getNode("alpha");

        assert.exists(node, "the graph holds node alpha");

        return placeOf(node.label).subtract(node.mesh.getAbsolutePosition());
    }

    /**
     * Assert one reading sits a given distance from another, in a given direction.
     * @param moved - The reading with the offset.
     * @param still - The reading without it.
     * @param way - The direction, across (x) and up (y), each -1, 0 or 1.
     * @param distance - How far, in world units, along each axis the direction names.
     * @param what - What is being measured, for the message.
     */
    function movedBy(
        moved: Vector3,
        still: Vector3,
        way: { x: number; y: number },
        distance: number,
        what: string,
    ): void {
        const detail = `${what}: ${still.toString()} -> ${moved.toString()}`;

        assert.closeTo(moved.x - still.x, way.x * distance, SAME_PLACE, `across, ${detail}`);
        assert.closeTo(moved.y - still.y, way.y * distance, SAME_PLACE, `up, ${detail}`);
    }

    describe("on a node's label", () => {
        for (const [location, way] of Object.entries(BESIDE)) {
            it(`moves a label at ${location} out from the node by the offset`, async () => {
                const touching = await nodeLabelFrom({ location: location as LabelStyle["location"], attachOffset: 0 });
                const clear = await nodeLabelFrom({
                    location: location as LabelStyle["location"],
                    attachOffset: OFFSET,
                });

                movedBy(clear, touching, way, OFFSET, location);
            });
        }

        for (const [location, way] of Object.entries(INSIDE)) {
            it(`moves a label at ${location} in from the node's side by the offset`, async () => {
                const touching = await nodeLabelFrom(
                    { location: location as LabelStyle["location"], attachOffset: 0 },
                    ROOMY,
                );
                const clear = await nodeLabelFrom(
                    { location: location as LabelStyle["location"], attachOffset: OFFSET },
                    ROOMY,
                );

                movedBy(clear, touching, { x: -way.x, y: -way.y }, OFFSET, location);
            });
        }

        it("keeps a centered label on the node, whatever the offset", async () => {
            const touching = await nodeLabelFrom({ location: "center", attachOffset: 0 });
            const clear = await nodeLabelFrom({ location: "center", attachOffset: OFFSET });

            movedBy(clear, touching, { x: 0, y: 0 }, OFFSET, "center");
        });

        it("touches the node when its style sets no offset, the label style's documented default of 0", async () => {
            for (const location of ["top", "left"] as const) {
                const touching = await nodeLabelFrom({ location, attachOffset: 0 });
                const unset = await nodeLabelFrom({ location });

                movedBy(unset, touching, BESIDE[location], 0, `${location} with no offset`);
            }
        });
    });

    describe("on an edge's label", () => {
        for (const [location, way] of [
            ["bottom", { x: 0, y: -1 }],
            ["left", { x: -1, y: 0 }],
        ] as const) {
            it(`moves a label at ${location} out from the middle of the line by the offset`, async () => {
                const middle = async (attachOffset: number): Promise<Vector3> => {
                    await styled("edge", { "edge.label": WORDS, "edge.labelStyle": { location, attachOffset } });
                    const alpha = graph.getNode("alpha")?.mesh.getAbsolutePosition();
                    const omega = graph.getNode("omega")?.mesh.getAbsolutePosition();

                    assert.exists(alpha);
                    assert.exists(omega);

                    return placeOf(edgeObject().label).subtract(Vector3.Center(alpha, omega));
                };
                const touching = await middle(0);
                const clear = await middle(OFFSET);

                movedBy(clear, touching, way, OFFSET, location);
            });
        }
    });

    describe("on the words at an arrow's tail", () => {
        for (const [location, way] of [
            ["top", { x: 0, y: 1 }],
            ["bottom", { x: 0, y: -1 }],
            ["left", { x: -1, y: 0 }],
            ["right", { x: 1, y: 0 }],
        ] as const) {
            it(`moves a caption at ${location} out from its cap by the offset`, async () => {
                const fromCap = async (attachOffset: number): Promise<Vector3> => {
                    await styled("edge", {
                        "edge.arrowTail": "normal",
                        "edge.arrowTailText": WORDS,
                        "edge.arrowTailTextStyle": { location, attachOffset },
                    });
                    const edge = edgeObject();

                    assert.isNotNull(edge.arrowTailCap, "the edge draws an arrow cap at its tail");

                    return placeOf(edge.arrowTailText).subtract(edge.arrowTailCap.position);
                };
                const touching = await fromCap(0);
                const clear = await fromCap(OFFSET);

                movedBy(clear, touching, way, OFFSET, location);
            });
        }
    });
});
