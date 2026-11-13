/**
 * Position-based regression tests for arrowhead placement
 *
 * Each graph is drawn by the element's own frame loop -- `init()`, then `waitForStableFrame()` --
 * so these tests check the whole path that places an arrow: the layout's positions reaching the
 * node meshes, the update ordering and dirty flags that refresh an edge after its nodes move, and
 * the arrow placement itself (`EdgeMesh.calculateArrowPosition()`).
 *
 * Key constants:
 * - DEFAULT_NODE_SIZE = 1
 * - ICOSPHERE_RADIUS_MULTIPLIER = 0.75 (node radius = 0.75)
 * - For "normal" arrows (positionOffset=0), the arrow tip is exactly at the node surface
 */
import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { asData, edgeBetween, styleEveryEdge, styleEveryNode } from "../helpers/testSetup";

// Constants matching mesh calculations
const NODE_RADIUS = 0.75; // DEFAULT_NODE_SIZE * ICOSPHERE_RADIUS_MULTIPLIER
const POSITION_TOLERANCE = 0.1; // Allow some tolerance for floating point and ray intersection

interface Point {
    x: number;
    y: number;
    z: number;
}

type Nodes = Record<string, Point>;

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * Draw a graph with fixed node positions and "normal" arrow heads, and wait for the element's
 * frame loop to finish drawing it.
 * @param twoD - whether to draw in 2D
 * @param nodes - each node's position by id
 * @param edges - [source, target] pairs
 * @param nodeStyle - an optional style for every node
 * @returns the graph
 */
async function drawGraph(
    twoD: boolean,
    nodes: Nodes,
    edges: [string, string][],
    nodeStyle?: Parameters<typeof styleEveryNode>[1],
): Promise<Graph> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);

    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode(twoD ? "2d" : "3d");
    await styleEveryEdge(graph, { "edge.arrowHead": "normal" });
    if (nodeStyle) {
        await styleEveryNode(graph, nodeStyle);
    }

    // FixedLayout reads node.data.position.{x,y,z}
    await graph.setLayout("fixed", { dim: twoD ? 2 : 3 });
    for (const [id, position] of Object.entries(nodes)) {
        await graph.addNode(asData({ id, position }));
    }

    for (const [source, target] of edges) {
        await graph.addEdge(asData({ id: `${source}:${target}`, source, target }), {
            source: "source",
            target: "target",
        });
    }

    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    return graph;
}

/**
 * Assert that the arrow of the edge from `src` to `dst` sits on the destination node's surface,
 * and in 2D that it lies in the XY plane.
 * @param g - the drawn graph
 * @param nodes - each node's position by id
 * @param src - the source node id
 * @param dst - the destination node id
 * @param twoD - whether the graph is drawn in 2D
 */
function assertArrowAtSurface(g: Graph, nodes: Nodes, src: string, dst: string, twoD: boolean): void {
    const label = `${src} -> ${dst}`;
    const edge = edgeBetween(g, src, dst);
    assert(edge, `Edge ${label} should exist`);
    assert(edge.arrowCap, `Edge ${label} should have an arrow`);

    const srcPos = new Vector3(nodes[src].x, nodes[src].y, nodes[src].z);
    const dstPos = new Vector3(nodes[dst].x, nodes[dst].y, nodes[dst].z);
    // The arrow tip sits where the edge meets the destination's surface.
    const expected = dstPos.subtract(dstPos.subtract(srcPos).normalize().scale(NODE_RADIUS));
    const actual = edge.arrowCap.position;

    const fmt = (v: Vector3): string => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
    const distance = Vector3.Distance(expected, actual);
    assert(
        distance < POSITION_TOLERANCE,
        `Edge ${label}: arrow is ${distance.toFixed(4)} from expected. Expected ${fmt(expected)}, actual ${fmt(actual)}`,
    );

    if (twoD) {
        assert(Math.abs(actual.z) < 0.001, `Edge ${label}: arrow Z should be 0 in 2D, got ${actual.z.toFixed(6)}`);
    }
}

/**
 * Nodes on a plane, by id.
 * @param points - [id, x, y] triples
 * @returns the nodes at z = 0
 */
function flat(...points: [string, number, number][]): Nodes {
    return Object.fromEntries(points.map(([id, x, y]) => [id, { x, y, z: 0 }]));
}

/**
 * Nodes in space, by id.
 * @param points - [id, x, y, z] tuples
 * @returns the nodes
 */
function space(...points: [string, number, number, number][]): Nodes {
    return Object.fromEntries(points.map(([id, x, y, z]) => [id, { x, y, z }]));
}

interface Case {
    name: string;
    twoD: boolean;
    nodes: Nodes;
    edges: [string, string][];
}

const cases: Case[] = [
    // 2D
    { name: "2D horizontal edge (0 deg)", twoD: true, nodes: flat(["A", 0, 0], ["B", 3, 0]), edges: [["A", "B"]] },
    { name: "2D vertical edge (90 deg)", twoD: true, nodes: flat(["A", 0, 0], ["B", 0, 3]), edges: [["A", "B"]] },
    { name: "2D diagonal edge (45 deg)", twoD: true, nodes: flat(["A", 0, 0], ["B", 3, 3]), edges: [["A", "B"]] },
    {
        name: "2D reverse horizontal edge (180 deg)",
        twoD: true,
        nodes: flat(["A", 3, 0], ["B", 0, 0]),
        edges: [["A", "B"]],
    },
    {
        name: "2D downward diagonal edge (-45 deg)",
        twoD: true,
        nodes: flat(["A", 0, 3], ["B", 3, 0]),
        edges: [["A", "B"]],
    },
    {
        name: "2D pentagon",
        twoD: true,
        nodes: flat(["A", 0, 3], ["B", 2.85, 0.93], ["C", 1.76, -2.43], ["D", -1.76, -2.43], ["E", -2.85, 0.93]),
        edges: [
            ["A", "B"],
            ["B", "C"],
            ["C", "D"],
            ["D", "E"],
            ["E", "A"],
        ],
    },
    {
        name: "2D square with a diagonal",
        twoD: true,
        nodes: flat(["A", 0, 0], ["B", 3, 0], ["C", 0, 3], ["D", 3, 3]),
        edges: [
            ["A", "B"],
            ["A", "C"],
            ["A", "D"],
            ["B", "D"],
        ],
    },
    // 3D
    { name: "3D edge along X", twoD: false, nodes: space(["A", 0, 0, 0], ["B", 3, 0, 0]), edges: [["A", "B"]] },
    { name: "3D edge along Y", twoD: false, nodes: space(["A", 0, 0, 0], ["B", 0, 3, 0]), edges: [["A", "B"]] },
    { name: "3D edge along Z", twoD: false, nodes: space(["A", 0, 0, 0], ["B", 0, 0, 3]), edges: [["A", "B"]] },
    { name: "3D diagonal edge", twoD: false, nodes: space(["A", 0, 0, 0], ["B", 2, 2, 2]), edges: [["A", "B"]] },
    {
        name: "3D tetrahedron",
        twoD: false,
        nodes: space(["A", 1, 1, 1], ["B", 1, -1, -1], ["C", -1, 1, -1], ["D", -1, -1, 1]),
        edges: [
            ["A", "B"],
            ["A", "C"],
            ["A", "D"],
            ["B", "C"],
            ["B", "D"],
            ["C", "D"],
        ],
    },
    {
        name: "3D negative coordinates",
        twoD: false,
        nodes: space(["A", -2, -2, -2], ["B", 2, 2, 2], ["C", -2, 2, 0]),
        edges: [
            ["A", "B"],
            ["A", "C"],
            ["B", "C"],
        ],
    },
    {
        name: "3D cube",
        twoD: false,
        nodes: space(
            ["A", 0, 0, 0],
            ["B", 2, 0, 0],
            ["C", 2, 2, 0],
            ["D", 0, 2, 0],
            ["E", 0, 0, 2],
            ["F", 2, 0, 2],
            ["G", 2, 2, 2],
            ["H", 0, 2, 2],
        ),
        edges: [
            ["A", "B"],
            ["B", "C"],
            ["C", "D"],
            ["D", "A"],
            ["E", "F"],
            ["F", "G"],
            ["G", "H"],
            ["H", "E"],
            ["A", "E"],
            ["B", "F"],
            ["C", "G"],
            ["D", "H"],
        ],
    },
    // Edge cases: just over two node radii apart, and very far apart
    { name: "3D very short edge", twoD: false, nodes: space(["A", 0, 0, 0], ["B", 2, 0, 0]), edges: [["A", "B"]] },
    { name: "3D very long edge", twoD: false, nodes: space(["A", 0, 0, 0], ["B", 100, 0, 0]), edges: [["A", "B"]] },
];

describe("Arrowhead position", () => {
    test.each(cases)("$name - every arrow tip sits on its destination's surface", async ({ twoD, nodes, edges }) => {
        const g = await drawGraph(twoD, nodes, edges);
        for (const [src, dst] of edges) {
            assertArrowAtSurface(g, nodes, src, dst, twoD);
        }
    });

    test("an edge down a torus's axis stops at the torus, not at its bounding sphere", async () => {
        // The ray cast from centre to centre runs through the hole of both rings and hits
        // neither, so the arrow is placed from the centres (#2643). That used to trim by the
        // bounding sphere's radius -- the box's half-diagonal -- and stopped a full unit short.
        const g = await drawGraph(false, space(["A", 0, 0, 0], ["B", 0, 4, 0]), [["A", "B"]], {
            "node.shape": "torus",
        });

        const edge = edgeBetween(g, "A", "B");
        assert(edge?.arrowCap, "the edge draws an arrow head");
        const dst = g.getNode("B");
        assert(dst, "the destination node exists");
        assert.strictEqual(dst.shapeType, "torus", "the layer drew the node as a torus");
        const halfHeight = dst.mesh.getBoundingInfo().boundingBox.extendSize.y * dst.mesh.scaling.y;
        const tip = edge.arrowCap.position;

        assert.closeTo(tip.y, 4 - halfHeight, POSITION_TOLERANCE, "the arrow tip sits on the ring's plane face");
        assert.closeTo(tip.x, 0, POSITION_TOLERANCE);
        assert.closeTo(tip.z, 0, POSITION_TOLERANCE);
    });
});
