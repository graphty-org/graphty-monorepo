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

    it("measures the ring against the node's size, not the fill an inside border shrinks", async () => {
        // Gephi's loop, sized from its node's size, was drawn smaller by the node's inside border (gexf specimens)
        const [node] = graph.getDataManager().nodes.values();
        await graph.getSession().styles.add({
            name: "flat",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "ellipse" },
        });
        await drawn(ring(3, 1.5));
        // the node's size: what its flat ellipse draws without a border
        const half = node.drawnHalfExtents.y;
        await graph.getSession().styles.add({
            name: "border",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.shape": "ellipse",
                "node.borderWidth": 0.2,
                "node.borderPosition": "inside",
                "node.borderColor": "#000000",
            },
        });
        const points = await drawn(ring(3, 1.5));
        assert.isBelow(node.drawnHalfExtents.y, 0.9 * half, "the inside border shrinks the fill");
        // the ring's top is 4.5 half sizes of the node's size up, not 4.5 of its shrunk fill
        assert.closeTo(Math.max(...points.map(([, y]) => y)), 4.5 * half, 0.02 * half);
    });
});

describe("patterned lines drawn along their route (issue #3102)", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Add nodes and edges, paint every edge and wait for the drawing.
     * @param nodes - The nodes.
     * @param edges - The edges.
     * @param set - The channels to write.
     * @returns Where the first edge's pattern elements are drawn.
     */
    async function elements(
        nodes: typeof NODES,
        edges: { src: string; dst: string }[],
        set: Record<string, unknown>,
    ): Promise<[number, number][]> {
        await graph.addNodes(nodes);
        await graph.addEdges(edges);
        await graph.setLayout("fixed", { dim: 3 });
        await graph.getSession().styles.add({ name: "route", target: "edge", selector: { match: "everything" }, set });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        const [edge] = graph.getDataManager().edges.values();
        return edge.drawnPattern.map((e): [number, number] => [e.position.x, e.position.y]);
    }

    for (const style of ["dash-dot", "forward-slash", "zigzag"]) {
        it(`lays a ${style} line's elements through its bends, round the corner, not straight across`, async () => {
            const drawn = await elements(NODES, [{ src: "a", dst: "b" }], { "edge.style": style, "edge.bends": ROUTE });
            assert.isAbove(drawn.length, 2);
            // the route runs four below the nodes; the straight line between them is y = 0
            assert.isTrue(
                drawn.some(([x, y]) => x > 2 && x < 6 && Math.abs(y + 4) < 1e-3),
                "elements on the bottom leg",
            );
            assert.isTrue(
                drawn.some(([x, y]) => Math.abs(x) < 1e-3 && y < -1),
                "elements on the leg down from a",
            );
        });
    }

    it("draws a curved dash-dot line as its elements along the curve, not as a solid line", async () => {
        const drawn = await elements(NODES, [{ src: "a", dst: "b" }], {
            "edge.style": "dash-dot",
            "edge.curvature": true,
        });
        assert.isAbove(drawn.length, 2, "drawn as pattern elements");
        assert.isAbove(Math.max(...drawn.map(([, y]) => Math.abs(y))), 0.2, "bowed off the straight line");
    });

    it("draws a patterned self-loop round its teardrop, out of its node and back", async () => {
        const one = [{ id: "a", position: { x: 0, y: 0, z: 0 } }];
        const drawn = await elements(one, [{ src: "a", dst: "a" }], { "edge.style": "forward-slash" });
        assert.isAbove(drawn.length, 2);
        const [node] = graph.getDataManager().nodes.values();
        const half = Math.max(node.drawnHalfExtents.x, node.drawnHalfExtents.y);
        assert.isAbove(Math.max(...drawn.map(([x, y]) => Math.hypot(x, y))), 1.5 * half, "the loop reaches out");
    });
});
