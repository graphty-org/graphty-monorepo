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

    it("draws an arc through its one bend on the circle through both centers (edge.bendCurve arc)", async () => {
        // yEd's arc edge: the bend is the apex, 2 above the middle of the 8 between the centers
        const route =
            (await drawn({ "edge.bends": "0.5,0.25", "edge.curvature": true, "edge.bendCurve": "arc" })) ?? [];
        assert.isAbove(route.length, 3);
        // that circle's center is (4, -3) and its radius 5; every drawn point is on it, the ends cut at the outlines
        // within the 0.011 a 7.5-degree piece's middle strays from the circle
        for (const [x, y] of route) {
            assert.closeTo(Math.hypot(x - 4, y + 3), 5, 0.011);
        }
        // and the arc reaches the apex
        assert.closeTo(Math.max(...route.map(([, y]) => y)), 2, 0.011);
    });
});

describe("a self-loop drawn through a closed ring of bends", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await graph.addEdges([{ src: "a", dst: "a" }]);
        await graph.setLayout("fixed", { dim: 3 });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * A ring of bends round a point above the node, from its bottom all the way round and back to it.
     * @param cy - The ring's center above the node's, in node half sizes.
     * @param r - Its radius, in node half sizes.
     * @returns The bends.
     */
    function ring(cy: number, r: number): string {
        const points: string[] = [];
        for (let k = 0; k <= 24; k++) {
            const a = -Math.PI / 2 + (2 * Math.PI * (k % 24)) / 24;
            points.push(`${(r * Math.cos(a)).toFixed(4)},${(cy + r * Math.sin(a)).toFixed(4)}`);
        }
        return points.join(" ");
    }

    /**
     * Paint the loop's bends and wait for it to be drawn.
     * @param bends - The bends.
     * @returns The points its line is drawn through.
     */
    async function drawn(bends: string): Promise<[number, number][]> {
        await graph.getSession().styles.add({
            name: "ring",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.bends": bends, "edge.arrowHead": "none" },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const [edge] = graph.getDataManager().edges.values();
        return edge.drawnCurve?.map((v): [number, number] => [v.x, v.y]) ?? [];
    }

    it("draws a ring that meets its node nowhere as the ring alone, as vis-network draws its circle", async () => {
        const [node] = graph.getDataManager().nodes.values();
        const half = node.drawnHalfExtents.y;
        // a ring three half sizes up, its bottom a half size clear of the node
        const points = await drawn(ring(3, 1.5));
        assert.lengthOf(points, 25, "the ring's points, closed, and no line out from the node");
        for (const [x, y] of points) {
            assert.isAbove(Math.hypot(x, y), 1.4 * half, "no point of the line is at the node");
        }
        assert.closeTo(points[0][0], points[24][0], 1e-6);
        assert.closeTo(points[0][1], points[24][1], 1e-6);
    });

    it("still runs a ring that crosses its node out of the node and back, cut at its outline", async () => {
        const [node] = graph.getDataManager().nodes.values();
        const half = node.drawnHalfExtents.y;
        const points = await drawn(ring(1.5, 1.5));
        // the ring's bottom lies inside the node: the line starts and ends on the node's outline
        assert.closeTo(Math.hypot(...points[0]), half, 0.05 * half);
        assert.closeTo(Math.hypot(...(points.at(-1) ?? [0, 0])), half, 0.05 * half);
    });
});
