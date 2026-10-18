/**
 * @file An edge with `edge.bends` is drawn through its bends: straight segments from the source
 * node's surface, through each bend, to the target node's surface, the arrow head along the last
 * segment -- and rounded at the corners when it is also curved. Without bends the edge is one straight segment, as
 * before.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Two nodes eight units apart on the x axis. */
const NODES = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: 8, y: 0, z: 0 } },
];

/** A right-angle route: down four from the source, across, up to the target (y up). */
const ROUTE = "0,-0.5 1,-0.5";

describe("edges drawn through bends", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("fixed", { dim: 3 });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Paint the edge and wait for it to be drawn.
     * @param set - The channels to write.
     * @returns The points its line is drawn through, or null for one straight segment.
     */
    async function drawn(set: Record<string, unknown>): Promise<[number, number][] | null> {
        await graph.getSession().styles.add({ name: "route", target: "edge", selector: { match: "everything" }, set });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const [edge] = graph.getDataManager().edges.values();
        return edge.drawnCurve?.map((v): [number, number] => [v.x, v.y]) ?? null;
    }

    it("draws one straight segment without bends", async () => {
        assert.isNull(await drawn({ "edge.width": 1 }));
    });

    it("draws straight segments through the bends, leaving and meeting the nodes along them", async () => {
        const points = await drawn({ "edge.bends": ROUTE });
        assert.isNotNull(points);
        const route = points ?? [];
        // start, the two bends, end: three segments
        assert.lengthOf(route, 4);
        const [start, b1, b2, end] = route;
        assert.closeTo(b1[0], 0, 1e-6);
        assert.closeTo(b1[1], -4, 1e-6);
        assert.closeTo(b2[0], 8, 1e-6);
        assert.closeTo(b2[1], -4, 1e-6);
        // the line leaves the source straight down, below its center, and reaches the target from below
        assert.closeTo(start[0], 0, 1e-6);
        assert.isBelow(start[1], 0);
        assert.isAbove(start[1], -4);
        assert.closeTo(end[0], 8, 1e-6);
        assert.isBelow(end[1], 0);
        // the arrow head points up the last segment, into the target
        const [edge] = graph.getDataManager().edges.values();
        const cap = edge.arrowCap;
        assert.isNotNull(cap);
        assert.closeTo(cap?.position.x ?? Number.NaN, 8, 1e-6);
    });

    it("rounds the corners when the edge is also curved", async () => {
        const route = (await drawn({ "edge.bends": ROUTE, "edge.curvature": true })) ?? [];
        // each of the two corners becomes a run of points, none of which is the corner itself
        assert.isAbove(route.length, 4);
        assert.isFalse(route.some(([x, y]) => Math.hypot(x, y + 4) < 1e-6));
    });
});
